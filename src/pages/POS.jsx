import React, { useState, useEffect, useRef, useCallback } from 'react';
import Api, { API_BASE } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import ThermalReceipt from '../components/common/ThermalReceipt';

const WS_URL = API_BASE.replace('/api/v1', '') + '/ws';
const PAGE_SIZE = 20;

/* ─── Helper: Image Resolver ─── */
const getProductImage = (product) => {
  if (product.imageUrls && product.imageUrls.length > 0) {
    const url = product.imageUrls[0];
    if (url.startsWith('http')) return url;
    const filename = url.split('/').pop();
    return `${API_BASE}/products/images/${filename}`;
  }
  return null;
};

/* ─── Product Card Component ─── */
const ProductCard = ({ product, onAdd }) => {
  const imgSrc = getProductImage(product);
  const outOfStock = product.stock <= 0;
  return (
    <div className={`pos-product-card${outOfStock ? ' out-of-stock' : ''}`} onClick={() => !outOfStock && onAdd(product)}>
      <div className="pos-product-img-wrap">
        {imgSrc ? <img src={imgSrc} alt={product.name} className="pos-product-img" /> : <div className="pos-product-img-placeholder">📦</div>}
        {outOfStock && <div className="pos-out-badge">نفذ</div>}
      </div>
      <div className="pos-product-info">
        <div className="pos-product-name">{product.name}</div>
        <div className="pos-product-price">{Number(product.salePrice).toFixed(2)} <span>ج.م</span></div>
      </div>
    </div>
  );
};

const POS = () => {
  const [connected, setConnected] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);
  const { toast } = useGlobalUI();
  const searchInputRef = useRef(null);
  const stompClientRef = useRef(null);

  /* ─── Product browser state ─── */
  const [browseProducts, setBrowseProducts] = useState([]);
  const [browsePage, setBrowsePage] = useState(0);
  const [browseTotalPages, setBrowseTotalPages] = useState(1);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseSearch, setBrowseSearch] = useState('');
  const [searchProducts, setSearchProducts] = useState([]);
  const observerTarget = useRef(null);

  useEffect(() => {
    Promise.all([loadCustomers(), loadBrowsePage(0, '', false)]).finally(() => setLoading(false));
  }, []);

  const loadCustomers = async () => {
    try {
      const cData = await Api.getCustomers(0, 100);
      setCustomers(cData.items || cData.content || []);
    } catch (e) { }
  };

  const loadBrowsePage = useCallback(async (page, search, append = false) => {
    setBrowseLoading(true);
    try {
      const data = await Api.getProductsPaged(page, PAGE_SIZE, search);
      setBrowseProducts(prev => append ? [...prev, ...data.items] : data.items);
      setBrowseTotalPages(data.totalPages);
      setBrowsePage(page);
    } catch (e) { toast('فشل تحميل المنتجات', 'error'); }
    finally { setBrowseLoading(false); }
  }, [toast]);

  const handleBrowseSearch = (val) => {
    setBrowseSearch(val);
    loadBrowsePage(0, val, false);
  };

  useEffect(() => {
    if (!showBrowser) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !browseLoading && browsePage < browseTotalPages - 1) {
        loadBrowsePage(browsePage + 1, browseSearch, true);
      }
    }, { threshold: 1.0 });
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [showBrowser, browseLoading, browsePage, browseTotalPages, browseSearch, loadBrowsePage]);

  const handleSearchChange = async (value) => {
    setSearchQuery(value);
    if (!value) { setSearchProducts([]); return; }
    try {
      const data = await Api.getProductsPaged(0, 50, value);
      setSearchProducts(data.items);
    } catch { setSearchProducts([]); }
  };

  const addToCart = useCallback((product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        if (existing.qty + 1 > product.stock) { toast('تجاوزت المخزن', 'warning'); return prev; }
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      if (product.stock <= 0) { toast('نفذ المخزن', 'warning'); return prev; }
      return [...prev, { id: product.id, name: product.name, price: product.salePrice, qty: 1, stock: product.stock, unitName: product.unitName }];
    });
    setSearchQuery(''); setSearchProducts([]);
    if (searchInputRef.current) searchInputRef.current.focus();
  }, [toast]);

  const updateQty = (id, newQty) => {
    setCart(prev => {
      const item = prev.find(i => i.id === id);
      if (newQty > item.stock) { toast('تجاوزت المتاح', 'warning'); return prev; }
      if (newQty <= 0) return prev.filter(i => i.id !== id);
      return prev.map(i => i.id === id ? { ...i, qty: newQty } : i);
    });
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowBrowser(false);
      if (e.key === 'F2') setShowBrowser(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  /* ─── WebSocket Sync ─── */
  useEffect(() => {
    const token = localStorage.getItem('pos_access_token');
    if (!token) return;
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true);
        client.subscribe('/user/queue/pos-updates', (msg) => addToCart(JSON.parse(msg.body)));
      },
      onDisconnect: () => setConnected(false)
    });
    client.activate();
    stompClientRef.current = client;
    return () => client.deactivate();
  }, [addToCart]);

  const subtotal = cart.reduce((s, i) => s + (i.price * i.qty), 0);
  const total = subtotal - discount;
  const change = paidAmount - total;

  useEffect(() => { setPaidAmount(cart.length > 0 ? total : 0); }, [total, cart.length]);

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const resp = await Api.createSale({ customerId: selectedCustomerId || null, discount, paidAmount, items: cart.map(i => ({ productId: i.id, quantity: i.qty, unitPrice: i.price })) });
      const invoiceData = resp.data || resp;
      setLastInvoice(invoiceData);

      toast('تمت العملية بنجاح', 'success');

      // Automatic Print Trigger
      setTimeout(() => {
        window.print();
        // Clear last invoice after a while to avoid accidental reprints if user refreshes
        setTimeout(() => setLastInvoice(null), 5000);
      }, 500);

      // Send refresh signal to customer
      if (stompClientRef.current?.connected) {
        stompClientRef.current.publish({
          destination: '/app/order-complete',
          body: JSON.stringify({ status: 'COMPLETED', invoiceId: invoiceData.id, ts: Date.now() })
        });
      }

      setCart([]); setDiscount(0); setPaidAmount(0);
    } catch (e) {
      console.error("Checkout Error:", e);
      toast('فشلت العملية', 'error');
    }
    finally { setCheckoutLoading(false); }
  };

  if (loading) return <Loader message="جاري التحميل..." />;

  return (
    <div className="pos-container no-sidebar-layout" style={{ position: 'relative' }}>
      {checkoutLoading && <div className="loader-overlay"><Loader message="جاري الحفظ..." /></div>}

      <div className="pos-main">
        {/* Header Controls */}
        <div className="card" style={{ marginBottom: '16px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>🧾 فاتورة المبيعات</h2>
            <div className={`sync-badge ${connected ? 'active' : ''}`}>{connected ? 'متصل بالعميل' : 'غير متصل'}</div>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              console.log("Opening Browser...");
              setShowBrowser(true);
            }}
            style={{ padding: '12px 40px', fontWeight: 900, fontSize: '1rem', background: 'var(--metro-blue)', color: '#fff', border: 'none', cursor: 'pointer', zIndex: 10 }}
          >
            🛍️ فتح قائمة المنتجات (F2)
          </button>
        </div>

        {/* Quick Search */}
        <div className="card" style={{ marginBottom: '16px', padding: '12px' }}>
          <div className="search-input" style={{ maxWidth: '100%' }}>
            <span className="search-icon">🔍</span>
            <input ref={searchInputRef} type="text" className="form-control" placeholder="بحث سريع لإضافة منتج..." value={searchQuery} onChange={e => handleSearchChange(e.target.value)} />
            {searchProducts.length > 0 && (
              <div className="search-results-dropdown card">
                {searchProducts.map(p => (
                  <div key={p.id} className="search-result-item" onClick={() => addToCart(p)}>
                    <span>{p.name}</span>
                    <span style={{ fontWeight: 700 }}>{p.salePrice.toFixed(2)} ج.م</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Invoice Table */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="card-header">
            <h3>🛒 محتويات الفاتورة ({cart.length})</h3>
            <button className="btn btn-danger btn-sm" onClick={() => setCart([])}>تفريغ</button>
          </div>
          <div className="table-wrapper" style={{ flex: 1 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th style={{ textAlign: 'center' }}>السعر</th>
                  <th style={{ textAlign: 'center' }}>الكمية</th>
                  <th style={{ textAlign: 'center' }}>الإجمالي</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '100px', color: '#444' }}>
                    <div style={{ fontSize: '4rem' }}>📑</div>
                    <h3>لا توجد أصناف في الفاتورة</h3>
                    <p>ابدأ بإضافة منتجات من القائمة أو عبر البحث</p>
                  </td></tr>
                ) : cart.map(item => (
                  <tr key={item.id}>
                    <td><div style={{ fontWeight: 600 }}>{item.name}</div><div style={{ fontSize: '0.8rem', color: '#777' }}>{item.unitName}</div></td>
                    <td style={{ textAlign: 'center' }}>{item.price.toFixed(2)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="qty-control" style={{ display: 'inline-flex', border: '1px solid #333', background: '#000', borderRadius: '4px' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => updateQty(item.id, item.qty - 1)}>-</button>
                        <input type="number" value={item.qty} onChange={e => updateQty(item.id, parseFloat(e.target.value) || 0)} style={{ width: '40px', border: 'none', background: 'transparent', textAlign: 'center', color: '#fff' }} />
                        <button className="btn btn-ghost btn-sm" onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--metro-blue)' }}>{(item.price * item.qty).toFixed(2)}</td>
                    <td style={{ textAlign: 'center' }}><button className="btn btn-ghost btn-sm" onClick={() => removeFromCart(item.id)} style={{ color: 'var(--metro-red)' }}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="pos-sidebar">
        <div className="card pos-panel" style={{ height: '100%', padding: '20px' }}>
          <div className="form-group mb-4">
            <label>العميل</label>
            <select className="form-control" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
              <option value="">عميل نقدي (Cash)</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="pos-summary card mb-4" style={{ padding: '15px' }}>
            <div className="d-flex justify-content-between mb-2"><span>الفرعي</span><span>{subtotal.toFixed(2)}</span></div>
            <div className="d-flex justify-content-between align-items-center">
              <span>الخصم</span>
              <input type="number" className="form-control" style={{ width: '80px' }} value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <div className="total-display mb-4">
            <label>الإجمالي النهائي</label>
            <div className="total-amount" style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--metro-blue)' }}>{total.toFixed(2)} <small style={{ fontSize: '0.8rem' }}>ج.م</small></div>
          </div>

          <div className="card mb-4" style={{ padding: '15px', background: '#111' }}>
            <label>المدفوع</label>
            <div className="d-flex gap-2">
              <input type="number" className="form-control" value={paidAmount} onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)} style={{ fontSize: '1.5rem', fontWeight: 700 }} />
              <button className="btn btn-ghost" onClick={() => setPaidAmount(total)}>كل</button>
            </div>
            <div className="d-flex justify-content-between mt-3">
              <span style={{ color: '#777' }}>الباقي</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: change >= 0 ? 'var(--metro-green)' : 'var(--metro-red)' }}>{change.toFixed(2)}</span>
            </div>
          </div>

          <button className="btn btn-primary btn-block btn-lg" onClick={handleCheckout} disabled={checkoutLoading || cart.length === 0} style={{ padding: '15px' }}>إتمام العملية</button>
        </div>
      </div>

      {/* Browser Modal - MOVED TO THE BOTTOM FOR Z-INDEX SAFETY */}
      {showBrowser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ width: '95%', maxWidth: '1200px', height: '90vh', display: 'flex', flexDirection: 'column', border: '2px solid #333' }}>
            <div className="card-header" style={{ padding: '20px', background: '#1a1a1a' }}>
              <h3 style={{ margin: 0 }}>🛍️ قائمة المنتجات</h3>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <input type="text" className="form-control" placeholder="بحث..." value={browseSearch} onChange={e => handleBrowseSearch(e.target.value)} style={{ width: '300px' }} autoFocus />
                <button className="btn btn-danger" onClick={() => setShowBrowser(false)} style={{ padding: '10px 20px' }}>إغلاق ✕</button>
              </div>
            </div>
            <div className="card-body" style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#000' }}>
              <div className="pos-product-grid" style={{ maxHeight: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '15px' }}>
                {browseProducts.map(p => (
                  <div key={p.id} className="pos-product-card" onClick={() => { addToCart(p); console.log("Added from modal"); }}>
                    <div className="pos-product-img-wrap" style={{ paddingTop: '80%', position: 'relative' }}>
                      {getProductImage(p) ? <img src={getProductImage(p)} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', fontSize: '2rem' }}>📦</div>}
                    </div>
                    <div style={{ padding: '10px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', height: '40px', overflow: 'hidden' }}>{p.name}</div>
                      <div style={{ color: 'var(--metro-blue)', fontWeight: 700, fontSize: '1.1rem', marginTop: '5px' }}>{p.salePrice.toFixed(2)} ج.م</div>
                    </div>
                  </div>
                ))}
                <div ref={observerTarget} style={{ height: '20px', gridColumn: '1 / -1' }}></div>
              </div>
              {browseLoading && <div style={{ color: '#fff', textAlign: 'center', padding: '20px' }}>جاري تحميل المزيد...</div>}
            </div>
          </div>
        </div>
      )}

      {/* Hidden Thermal Receipt for Printing */}
      {lastInvoice && (
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
          <ThermalReceipt invoice={lastInvoice} />
        </div>
      )}

      <style>{`
        .pos-container { display: flex; gap: 15px; height: calc(100vh - 120px); padding: 5px; }
        .pos-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .pos-sidebar { width: 350px; }
        .sync-badge { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; background: rgba(239,68,68,0.1); color: #ef4444; }
        .sync-badge.active { background: rgba(16,185,129,0.1); color: #10b981; }
        .pos-product-grid { display: grid; gap: 15px; }
        .pos-product-card { background: #1a1a1a; border: 1px solid #333; border-radius: 8px; cursor: pointer; transition: 0.2s; overflow: hidden; }
        .pos-product-card:hover { border-color: var(--metro-blue); transform: translateY(-3px); }
        .loader-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; align-items: center; justify-content: center; }
      `}</style>
    </div>
  );
};

export default POS;
