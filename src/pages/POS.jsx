import React, { useState, useEffect, useRef, useCallback } from 'react';
import Api, { API_BASE } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import ThermalReceipt from '../components/common/ThermalReceipt';
import { useBranch } from '../context/BranchContext';
import { db, saveOfflineSale } from '../services/db';
import SyncService from '../services/SyncService';

const WS_URL = API_BASE.replace('/api/v1', '') + '/ws';
const PAGE_SIZE = 24;

const getProductImage = (product) => {
  if (product.imageUrls && product.imageUrls.length > 0) {
    const url = product.imageUrls[0];
    if (url.startsWith('http')) return url;
    const filename = url.split('/').pop();
    return `${API_BASE}/products/images/${filename}`;
  }
  return null;
};

const POS = () => {
  const { selectedBranchId: globalBranchId, branches: contextBranches } = useBranch();
  const [connected, setConnected] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);

  const [branches, setBranches] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');

  const { toast, confirm } = useGlobalUI();
  const searchInputRef = useRef(null);
  const stompClientRef = useRef(null);

  const [browseProducts, setBrowseProducts] = useState([]);
  const [browsePage, setBrowsePage] = useState(0);
  const [browseTotalPages, setBrowseTotalPages] = useState(1);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseSearch, setBrowseSearch] = useState('');
  const [pendingSalesCount, setPendingSalesCount] = useState(0);
  const observerTarget = useRef(null);

  // Initialize
  useEffect(() => {
    const user = Api._getUser();
    if (globalBranchId) {
      setSelectedBranchId(globalBranchId);
    } else if (user && user.branchId) {
      setSelectedBranchId(user.branchId);
    }
    if (contextBranches && contextBranches.length > 0) {
      setBranches(contextBranches);
    } else {
      // Try local branches
      db.branches.toArray().then(data => {
        if (data.length > 0) setBranches(data);
      });
    }
    
    // Init Sync Service
    SyncService.initAutoSync();
    if (navigator.onLine) {
      SyncService.pullDataFromServer(globalBranchId);
    }
    
    // Check pending count
    const updatePendingCount = async () => {
      const count = await db.offlineSales.where('status').equals('pending').count();
      setPendingSalesCount(count);
    };
    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000);

    loadCustomers().finally(() => setLoading(false));
    return () => clearInterval(interval);
  }, [globalBranchId, contextBranches]);

  const loadWarehouses = async (branchId) => {
    try {
      let data = [];
      if (navigator.onLine) {
        data = await Api.getWarehousesByBranch(branchId);
      } else {
        data = await db.warehouses.where('branchId').equals(Number(branchId)).toArray();
      }
      setWarehouses(data);
      if (data.length > 0) setSelectedWarehouseId(data[0].id);
    } catch (e) {
      console.error("Failed to load warehouses", e);
      // Fallback
      const local = await db.warehouses.where('branchId').equals(Number(branchId)).toArray();
      setWarehouses(local);
    }
  };

  const loadCustomers = async () => {
    try {
      const cData = await Api.getCustomers(0, 100, '', selectedBranchId);
      const items = cData.items || cData.content || [];
      setCustomers(items);
    } catch (e) {
      console.warn("Falling back to local customers...");
      const localCustomers = await db.customers.toArray();
      setCustomers(localCustomers);
    }
  };

  const loadBrowsePage = useCallback(async (page, search, append = false, warehouseId = selectedWarehouseId) => {
    if (!warehouseId && !search) {
      if (!append) setBrowseProducts([]);
      return;
    }
    setBrowseLoading(true);
    
    const fetchLocal = async () => {
      const lowerSearch = search?.toLowerCase() || '';
      let localItems = [];
      if (lowerSearch) {
        localItems = await db.products
          .filter(p => 
            p.name.toLowerCase().includes(lowerSearch) || 
            (p.barcode && p.barcode.includes(search))
          )
          .offset(page * PAGE_SIZE)
          .limit(PAGE_SIZE)
          .toArray();
      } else {
        localItems = await db.products.offset(page * PAGE_SIZE).limit(PAGE_SIZE).toArray();
      }
      setBrowseProducts(prev => append ? [...prev, ...localItems] : localItems);
      setBrowseTotalPages(1);
      setBrowsePage(page);
    };

    try {
      const data = await Api.getWarehouseProducts(warehouseId, page, PAGE_SIZE, search, 'id,desc');
      setBrowseProducts(prev => append ? [...prev, ...data.items] : data.items);
      setBrowseTotalPages(data.totalPages);
      setBrowsePage(page);
    } catch (e) {
      console.warn("Network error, loading products from local DB...");
      await fetchLocal();
      if (navigator.onLine) {
        toast('السيرفر غير متاح حالياً.. يتم العرض من الذاكرة المحلية', 'info');
      }
    } finally {
      setBrowseLoading(false);
    }
  }, [toast, selectedWarehouseId]);

  // Handle warehouse loading
  useEffect(() => {
    if (selectedBranchId) {
      loadWarehouses(selectedBranchId);
    } else {
      setWarehouses([]);
      setSelectedWarehouseId('');
    }
  }, [selectedBranchId]);

  // Handle warehouse change -> load products
  useEffect(() => {
    if (selectedWarehouseId) {
      loadBrowsePage(0, browseSearch, false, selectedWarehouseId);
    } else {
      setBrowseProducts([]);
    }
  }, [selectedWarehouseId]);

  const handleBrowseSearch = (val) => {
    setBrowseSearch(val);
    loadBrowsePage(0, val, false);
  };

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !browseLoading && browsePage < browseTotalPages - 1) {
        loadBrowsePage(browsePage + 1, browseSearch, true);
      }
    }, { threshold: 1.0 });
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [browseLoading, browsePage, browseTotalPages, browseSearch, loadBrowsePage]);

  // Barcode / Auto-search effect (Simulated via debounced search for barcode readers)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!browseSearch || browseSearch.length < 3) return;
      // If exact barcode match, auto-add
      const exactMatch = browseProducts.find(p => p.barcode === browseSearch || p.name === browseSearch);
      if (exactMatch && browseProducts.length === 1) {
        addToCart(exactMatch);
        setBrowseSearch('');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [browseSearch, browseProducts]);

  const addToCart = useCallback((product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        if (existing.qty + 1 > product.stock) {
          setTimeout(() => toast('تجاوزت الرصيد المتاح', 'warning'), 10);
          return prev;
        }
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      if (product.stock <= 0) {
        setTimeout(() => toast('نفذ المخزون', 'warning'), 10);
        return prev;
      }
      return [...prev, { id: product.id, name: product.name, price: product.salePrice, qty: 1, stock: product.stock, unitName: product.unitName }];
    });
    if (searchInputRef.current) searchInputRef.current.focus();
  }, [toast]);

  const updateQty = (id, newQty) => {
    setCart(prev => {
      const item = prev.find(i => i.id === id);
      if (newQty > item.stock) {
        setTimeout(() => toast('تجاوزت المتاح', 'warning'), 10);
        return prev;
      }
      if (newQty <= 0) return prev.filter(i => i.id !== id);
      return prev.map(i => i.id === id ? { ...i, qty: newQty } : i);
    });
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));

  // WebSocket Sync
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

  useEffect(() => {
    setPaidAmount(cart.length > 0 ? total : 0);
  }, [total, cart.length]);

  const handleCheckout = async () => {
    if (!selectedBranchId || !selectedWarehouseId) {
      toast('يرجى اختيار الفرع والمخزن أولاً', 'warning');
      return;
    }

    confirm('تأكيد إتمام الطلب وطباعة الفاتورة؟', async () => {
      setCheckoutLoading(true);
      const saleData = {
        customerId: selectedCustomerId || null,
        discount,
        paidAmount,
        branchId: selectedBranchId,
        warehouseId: selectedWarehouseId,
        items: cart.map(i => ({ productId: i.id, quantity: i.qty, unitPrice: i.price }))
      };

      try {
        if (!navigator.onLine) throw new Error('OFFLINE');

        const resp = await Api.createSale(saleData);
        const invoiceData = resp.data || resp;
        setLastInvoice(invoiceData);

        toast('تمت العملية بنجاح', 'success');

        setTimeout(() => {
          window.print();
          setTimeout(() => setLastInvoice(null), 5000);
        }, 500);

        if (stompClientRef.current?.connected) {
          stompClientRef.current.publish({
            destination: '/app/order-complete',
            body: JSON.stringify({ status: 'COMPLETED', invoiceId: invoiceData.id, ts: Date.now() })
          });
        }

        setCart([]); setDiscount(0); setPaidAmount(0);
        loadBrowsePage(0, browseSearch, false);
      } catch (e) {
        if (e.message === 'OFFLINE' || e.message.includes('الاتصال')) {
          // Save Offline
          try {
            const offlineId = await saveOfflineSale(saleData);
            
            // Create a fake invoice object for printing
            const fakeInvoice = {
              id: `OFF-${offlineId}-${Date.now()}`,
              customerName: customers.find(c => c.id == selectedCustomerId)?.name || 'عميل نقدي',
              totalAmount: total,
              paidAmount: paidAmount,
              discount: discount,
              items: cart.map(i => ({ productName: i.name, quantity: i.qty, unitPrice: i.price, totalPrice: i.qty * i.price })),
              createdAt: new Date().toISOString(),
              branchName: branches.find(b => b.id == selectedBranchId)?.name || '',
              warehouseName: warehouses.find(w => w.id == selectedWarehouseId)?.name || ''
            };
            
            setLastInvoice(fakeInvoice);
            toast('تم حفظ الفاتورة محلياً (أوفلاين)', 'info');
            
            setTimeout(() => {
              window.print();
              setTimeout(() => setLastInvoice(null), 5000);
            }, 500);

            setCart([]); setDiscount(0); setPaidAmount(0);
          } catch (err) {
            toast('فشل الحفظ المحلي أيضاً!', 'error');
          }
        } else {
          console.error("Checkout Error:", e);
          toast(e.message || 'فشلت عملية الدفع', 'error');
        }
      } finally {
        setCheckoutLoading(false);
      }
    });
  };

  if (loading) return <Loader message="جاري تجهيز الكاشير..." />;

  return (
    <div className="pos-premium-container">
      {checkoutLoading && <div className="loader-overlay"><Loader message="جاري إتمام الدفع..." /></div>}

      {/* LEFT: PRODUCTS BROWSER */}
      <div className="pos-products-pane">
        <div className="pos-header-glass">
          <div className="pos-search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="ابحث بالاسم أو امسح الباركود..."
              value={browseSearch}
              onChange={e => handleBrowseSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className={`sync-indicator ${connected ? 'active' : ''}`}>
            {connected ? '🟢 متصل' : '🔴 أوفلاين'}
            {pendingSalesCount > 0 && <span className="pending-badge">({pendingSalesCount} معلقة)</span>}
          </div>
        </div>

        <div className="pos-grid-container">
          <div className="pos-grid">
            {browseProducts.map(p => {
              const outOfStock = p.stock <= 0;
              const imgSrc = getProductImage(p);
              return (
                <div key={p.id} className={`pos-item-card ${outOfStock ? 'out-stock' : ''}`} onClick={() => !outOfStock && addToCart(p)}>
                  <div className="pos-item-image">
                    {imgSrc ? <img src={imgSrc} alt={p.name} /> : <div className="placeholder-icon">📦</div>}
                    <div className="stock-badge">{outOfStock ? 'نفذ' : `${p.stock} متوفر`}</div>
                  </div>
                  <div className="pos-item-details">
                    <div className="pos-item-name" title={p.name}>{p.name}</div>
                    <div className="pos-item-price">{p.salePrice.toFixed(2)} ج.م</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div ref={observerTarget} style={{ height: '20px', width: '100%' }}></div>
          {browseLoading && <div style={{ textAlign: 'center', padding: '10px', color: 'var(--text-dim)' }}>جاري التحميل...</div>}
        </div>
      </div>

      {/* RIGHT: CART & CHECKOUT */}
      <div className="pos-cart-pane">
        <div className="cart-header">
          <h3>🛒 الطلب الحالي</h3>
          <span className="items-count">{cart.length} أصناف</span>
        </div>

        <div className="cart-controls">
          <select
            className="form-control pos-select"
            value={selectedBranchId}
            onChange={e => setSelectedBranchId(e.target.value)}
            disabled={!Api.can('ROLE_ADMIN')}
          >
            <option value="">-- الفرع --</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select className="form-control pos-select" value={selectedWarehouseId} onChange={e => setSelectedWarehouseId(e.target.value)}>
            <option value="">-- المخزن --</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <select className="form-control pos-select" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
            <option value="">عميل نقدي (كاش)</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="cart-items-list">
          {cart.length === 0 ? (
            <div className="empty-cart-state">
              <span className="icon">🛒</span>
              <p>السلة فارغة</p>
              <small>قم بإضافة منتجات من القائمة</small>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="cart-item">
                <div className="item-info">
                  <div className="item-title">{item.name}</div>
                  <div className="item-price">{item.price.toFixed(2)} ج.م</div>
                </div>
                <div className="item-actions">
                  <div className="qty-spinner">
                    <button onClick={() => updateQty(item.id, item.qty - 1)}>-</button>
                    <input type="number" value={item.qty} onChange={e => updateQty(item.id, parseFloat(e.target.value) || 0)} />
                    <button onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
                  </div>
                  <div className="item-total">{(item.price * item.qty).toFixed(2)}</div>
                  <button className="remove-btn" onClick={() => removeFromCart(item.id)}>✕</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="cart-summary-box">
          <div className="summary-row">
            <span>الإجمالي الفرعي</span>
            <span>{subtotal.toFixed(2)} ج.م</span>
          </div>
          <div className="summary-row highlight">
            <span>الخصم</span>
            <div className="discount-input">
              <input type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div className="summary-total">
            <span>المطلوب</span>
            <span className="amount">{total.toFixed(2)} <small>ج.م</small></span>
          </div>
        </div>

        <div className="payment-box">
          <div className="payment-input-group">
            <label>المبلغ المدفوع</label>
            <input type="number" value={paidAmount} onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)} />
            <button className="exact-btn" onClick={() => setPaidAmount(total)}>الضبط</button>
          </div>
          <div className="change-row">
            <span>الباقي للعميل</span>
            <span className={`change-amount ${change < 0 ? 'negative' : ''}`}>{change.toFixed(2)}</span>
          </div>
          
          <button 
            className="checkout-btn" 
            onClick={handleCheckout} 
            disabled={checkoutLoading || cart.length === 0}
          >
            💳 إتمام الدفع والطباعة
          </button>
        </div>
      </div>

      {lastInvoice && (
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
          <ThermalReceipt invoice={lastInvoice} />
        </div>
      )}

      <style>{`
        /* Premium POS Layout */
        .pos-premium-container {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 20px;
          height: calc(100vh - 80px);
          padding: 10px;
          background: var(--bg-body);
          font-family: 'Cairo', 'Inter', sans-serif;
          overflow: hidden;
        }

        /* Loaders */
        .loader-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(5px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Left Pane: Products */
        .pos-products-pane {
          display: flex;
          flex-direction: column;
          gap: 15px;
          overflow: hidden;
          background: var(--bg-card);
          border-radius: 16px;
          border: 1px solid var(--border-color);
          box-shadow: 0 8px 30px rgba(0,0,0,0.2);
        }

        .pos-header-glass {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 25px;
          background: rgba(255,255,255,0.03);
          border-bottom: 1px solid var(--border-color);
          backdrop-filter: blur(10px);
        }

        .pos-search-wrapper {
          position: relative;
          width: 50%;
          min-width: 300px;
        }

        .pos-search-wrapper .search-icon {
          position: absolute;
          right: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-dim);
          font-size: 1.1rem;
        }

        .pos-search-wrapper input {
          width: 100%;
          padding: 12px 15px 12px 40px;
          border-radius: 30px;
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff;
          font-size: 1rem;
          transition: 0.3s all;
        }

        .pos-search-wrapper input:focus {
          outline: none;
          background: rgba(0,0,0,0.4);
          border-color: var(--metro-blue);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }

        .sync-indicator {
          padding: 6px 15px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .sync-indicator.active {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border-color: rgba(16, 185, 129, 0.2);
        }

        .pending-badge {
          margin-right: 8px;
          background: #f59e0b;
          color: #fff;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: bold;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        .pos-grid-container {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        /* Hide Scrollbar but keep functionality */
        .pos-grid-container::-webkit-scrollbar, .cart-items-list::-webkit-scrollbar {
          width: 8px;
        }
        .pos-grid-container::-webkit-scrollbar-track, .cart-items-list::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.1);
          border-radius: 10px;
          margin: 10px 0;
        }
        .pos-grid-container::-webkit-scrollbar-thumb, .cart-items-list::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.15);
          border-radius: 10px;
        }
        .pos-grid-container::-webkit-scrollbar-thumb:hover, .cart-items-list::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.3);
        }

        .pos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 15px;
        }

        .pos-item-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
        }

        .pos-item-card:hover {
          transform: translateY(-4px);
          border-color: var(--metro-blue);
          box-shadow: 0 10px 20px rgba(0,0,0,0.3);
          background: rgba(255,255,255,0.05);
        }

        .pos-item-card:active {
          transform: translateY(0);
        }

        .pos-item-card.out-stock {
          opacity: 0.5;
          filter: grayscale(1);
          cursor: not-allowed;
        }

        .pos-item-image {
          position: relative;
          padding-top: 80%;
          background: #111;
        }

        .pos-item-image img {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .placeholder-icon {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          color: rgba(255,255,255,0.2);
        }

        .stock-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0,0,0,0.7);
          color: #fff;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          backdrop-filter: blur(4px);
        }

        .pos-item-details {
          padding: 12px;
        }

        .pos-item-name {
          font-size: 0.9rem;
          font-weight: 600;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 6px;
        }

        .pos-item-price {
          color: var(--metro-blue);
          font-weight: 800;
          font-size: 1.1rem;
        }

        /* Right Pane: Cart */
        .pos-cart-pane {
          background: var(--bg-card);
          border-radius: 16px;
          border: 1px solid var(--border-color);
          box-shadow: 0 8px 30px rgba(0,0,0,0.2);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .cart-header {
          padding: 20px;
          background: rgba(255,255,255,0.02);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .cart-header h3 { margin: 0; font-size: 1.2rem; }
        .items-count { background: var(--metro-blue); color: #fff; padding: 2px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; }

        .cart-controls {
          padding: 15px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .pos-select {
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 8px 12px;
          color: #fff;
          font-size: 0.9rem;
        }

        .cart-items-list {
          flex: 1;
          overflow-y: auto;
          padding: 15px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .empty-cart-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-dim);
          opacity: 0.5;
        }
        .empty-cart-state .icon { font-size: 4rem; margin-bottom: 10px; }

        .cart-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
          background: rgba(255,255,255,0.03);
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.02);
        }

        .cart-item .item-info {
          display: flex;
          justify-content: space-between;
        }
        .item-title { font-weight: 600; font-size: 0.95rem; }
        .item-price { color: var(--text-dim); font-size: 0.85rem; }

        .cart-item .item-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .qty-spinner {
          display: flex;
          background: rgba(0,0,0,0.5);
          border-radius: 6px;
          overflow: hidden;
        }
        .qty-spinner button {
          background: transparent;
          border: none;
          color: #fff;
          padding: 4px 10px;
          cursor: pointer;
        }
        .qty-spinner button:hover { background: rgba(255,255,255,0.1); }
        .qty-spinner input {
          width: 40px;
          text-align: center;
          background: transparent;
          border: none;
          color: #fff;
          font-weight: 600;
          border-left: 1px solid rgba(255,255,255,0.1);
          border-right: 1px solid rgba(255,255,255,0.1);
        }

        .item-total { font-weight: 800; color: var(--metro-blue); }
        .remove-btn { background: transparent; border: none; color: var(--metro-red); cursor: pointer; padding: 4px; border-radius: 4px; }
        .remove-btn:hover { background: rgba(239,68,68,0.1); }

        .cart-summary-box {
          padding: 15px;
          background: rgba(0,0,0,0.2);
          border-top: 1px solid var(--border-color);
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          color: var(--text-dim);
          font-size: 0.95rem;
        }

        .summary-row.highlight { color: #fff; }

        .discount-input input {
          width: 70px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: var(--metro-orange);
          padding: 4px 8px;
          border-radius: 4px;
          text-align: center;
          font-weight: 600;
        }

        .summary-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px dashed rgba(255,255,255,0.1);
        }

        .summary-total span:first-child { font-size: 1.2rem; font-weight: 700; }
        .summary-total .amount { font-size: 2rem; font-weight: 800; color: var(--metro-blue); }

        .payment-box {
          padding: 15px;
          background: rgba(255,255,255,0.02);
        }

        .payment-input-group {
          position: relative;
          margin-bottom: 10px;
        }
        .payment-input-group label { display: block; font-size: 0.85rem; color: var(--text-dim); margin-bottom: 5px; }
        .payment-input-group input {
          width: 100%;
          background: #000;
          border: 1px solid var(--border-color);
          padding: 12px;
          border-radius: 8px;
          color: #fff;
          font-size: 1.5rem;
          font-weight: 800;
        }
        .exact-btn {
          position: absolute;
          left: 8px;
          bottom: 8px;
          background: rgba(255,255,255,0.1);
          border: none;
          color: #fff;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
        }
        .exact-btn:hover { background: var(--metro-blue); }

        .change-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding: 10px;
          background: rgba(0,0,0,0.3);
          border-radius: 8px;
        }
        .change-amount { font-size: 1.2rem; font-weight: 800; color: var(--metro-green); }
        .change-amount.negative { color: var(--metro-red); }

        .checkout-btn {
          width: 100%;
          background: linear-gradient(135deg, var(--metro-blue), #2563eb);
          color: #fff;
          border: none;
          padding: 15px;
          font-size: 1.2rem;
          font-weight: 800;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 15px rgba(59,130,246,0.3);
        }
        .checkout-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59,130,246,0.5);
        }
        .checkout-btn:disabled {
          background: #333;
          color: #777;
          box-shadow: none;
          cursor: not-allowed;
        }

        /* Responsive Layout */
        @media (max-width: 1024px) {
          .pos-premium-container {
            grid-template-columns: 1fr 300px;
          }
        }
        @media (max-width: 768px) {
          .pos-premium-container {
            grid-template-columns: 1fr;
            height: auto;
          }
          .pos-products-pane {
            height: 60vh;
          }
        }
      `}</style>
    </div>
  );
};

export default POS;
