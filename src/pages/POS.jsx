import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import Api, { API_BASE } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';

const POS = () => {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const { toast } = useGlobalUI();
  const searchInputRef = useRef(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const pData = await Api.getProducts(0, 1000);
      setProducts(pData || []);

      const cData = await Api.getCustomers(0, 100);
      setCustomers(cData.items || cData.content || []);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.qty + 1 > product.stock) {
        toast('الكمية المطلوبة تتجاوز المتاح بالمخزن', 'warning');
        return;
      }
      setCart(cart.map(item =>
        item.id === product.id ? { ...item, qty: item.qty + 1 } : item
      ));
    } else {
      if (product.stock <= 0) {
        toast('المنتج نفذ من المخزن', 'warning');
        return;
      }
      setCart([...cart, {
        id: product.id,
        name: product.name,
        price: product.salePrice,
        qty: 1,
        stock: product.stock,
        unitName: product.unitName
      }]);
    }
    setSearchQuery('');
    searchInputRef.current.focus();
  };

  const updateQty = (id, newQty) => {
    const item = cart.find(i => i.id === id);
    if (newQty > item.stock) {
      toast('لا يمكن تجاوز الكمية المتاحة', 'warning');
      return;
    }
    if (newQty <= 0) {
      removeFromCart(id);
      return;
    }
    setCart(cart.map(i => i.id === id ? { ...i, qty: newQty } : i));
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const total = subtotal - discount;
  const change = paidAmount - total;

  useEffect(() => {
    if (cart.length > 0) {
      setPaidAmount(total);
    } else {
      setPaidAmount(0);
    }
  }, [total]);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast('السلة فارغة', 'warning');
      return;
    }

    setCheckoutLoading(true);
    try {
      const saleRequest = {
        customerId: selectedCustomerId || null,
        discount: discount,
        paidAmount: paidAmount,
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.qty,
          unitPrice: item.price
        }))
      };

      const res = await Api.createSale(saleRequest);
      toast('تمت عملية البيع بنجاح', 'success');
      const curUser = Api._getUser();

      setLastSale({
        ...res,
        items: cart.map(item => ({ ...item })),
        customerName: selectedCustomerId ? customers.find(c => c.id == selectedCustomerId)?.name : 'عميل نقدي',
        userName: curUser?.name || curUser?.username || 'المسؤول',
        userId: curUser?.id || '0',
        subtotal,
        discount,
        total,
        change,
        paidAmount
      });
      setShowReceipt(true);

      setCart([]);
      setDiscount(0);
      setPaidAmount(0);
      setSelectedCustomerId('');
      loadInitialData();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const filteredProducts = searchQuery.length > 0
    ? products.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.productCode?.includes(searchQuery)
    )
    : [];

  if (loading) {
    return <Loader message="جاري تهيئة نظام المبيعات..." />;
  }

  return (
    <div className="pos-container no-sidebar-layout">
      {checkoutLoading && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader message="جاري إتمام العملية وحفظ الفاتورة..." />
        </div>
      )}
      <div className="pos-main">
        <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
          <div className="search-input" style={{ maxWidth: '100%' }}>
            <span className="search-icon">🔍</span>
            <input
              ref={searchInputRef}
              type="text"
              className="form-control"
              placeholder="بحث عن منتج بالاسم أو الباركود..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontSize: '1.2rem', padding: '12px 40px' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredProducts.length === 1) {
                  addToCart(filteredProducts[0]);
                }
              }}
            />
            {filteredProducts.length > 0 && (
              <div className="search-results-dropdown card" style={{ top: '60px', zIndex: 1000 }}>
                {filteredProducts.map(p => (
                  <div key={p.id} className="search-result-item" onClick={() => addToCart(p)} style={{ borderBottom: '1px solid #222' }}>
                    <div className="item-main">
                      <strong style={{ color: 'var(--text-white)' }}>{p.name}</strong>
                      <span className="stock-label" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>المخزن: {p.stock} {p.unitName}</span>
                    </div>
                    <div className="item-price" style={{ fontWeight: 700, color: 'var(--metro-blue)' }}>{p.salePrice.toFixed(2)} ج.م</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card pos-cart" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="card-header">
            <h3>🛒 سلة المشتريات ({cart.length})</h3>
            <button className="btn btn-danger btn-sm" onClick={() => setCart([])}>مسح السلة</button>
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
                  <tr><td colSpan="5" className="empty-state" style={{ padding: '80px' }}>
                    <div className="empty-icon">🛒</div>
                    <h4>السلة فارغة</h4>
                    <p>ابدأ بإضافة المنتجات للمتابعة</p>
                  </td></tr>
                ) : cart.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-white)' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.unitName}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>{item.price.toFixed(2)}</td>
                    <td style={{ textAlign: 'center', width: '150px' }}>
                      <div className="qty-control" style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #333', background: '#000' }}>
                        <button className="btn btn-ghost btn-sm" style={{ border: 'none', padding: '5px 10px' }} onClick={() => updateQty(item.id, item.qty - 1)}>-</button>
                        <input
                          type="number"
                          className="form-control"
                          value={item.qty}
                          style={{ width: '50px', background: 'transparent', border: 'none', textAlign: 'center', padding: '0' }}
                          onChange={(e) => updateQty(item.id, parseFloat(e.target.value) || 0)}
                        />
                        <button className="btn btn-ghost btn-sm" style={{ border: 'none', padding: '5px 10px' }} onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-white)' }}>{(item.price * item.qty).toFixed(2)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--metro-red)', border: 'none' }} onClick={() => removeFromCart(item.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="pos-sidebar">
        <div className="card pos-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px' }}>
            <div className="form-group mb-4">
              <label>العميل (اختياري)</label>
              <select
                className="form-control"
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
              >
                <option value="">عميل نقدي (Cash)</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                ))}
              </select>
            </div>

            <div className="pos-summary" style={{ background: '#0d0d0d', padding: '16px', border: '1px solid #222', marginBottom: '20px' }}>
              <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>الإجمالي الفرعي</span>
                <span style={{ fontWeight: 600 }}>{subtotal.toFixed(2)} ج.م</span>
              </div>
              <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #222', paddingTop: '12px', marginTop: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>الخصم</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    className="form-control"
                    style={{ width: '80px', padding: '4px 8px', textAlign: 'center' }}
                    value={discount}
                    onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                  />
                  <span style={{ fontSize: '0.8rem' }}>ج.م</span>
                </div>
              </div>
            </div>

            <div className="total-display" style={{ textAlign: 'left', marginBottom: '24px' }}>
              <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>الإجمالي النهائي</label>
              <div style={{ fontSize: '3rem', fontWeight: 200, color: 'var(--metro-blue)', lineHeight: 1 }}>
                {total.toFixed(2)} <span style={{ fontSize: '1rem' }}>ج.م</span>
              </div>
            </div>

            <div className="pos-payment card" style={{ padding: '16px', background: '#111', border: '1px solid #222' }}>
              <div className="form-group mb-3">
                <label>المبلغ المدفوع</label>
                <div className="d-flex align-items-center gap-2">
                  <input
                    type="number"
                    className="form-control"
                    style={{ fontSize: '1.5rem', fontWeight: 700, textAlign: 'left', border: '1px solid #444' }}
                    value={paidAmount}
                    onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                  <button className="btn btn-ghost" style={{ padding: '0 12px', height: '48px' }} onClick={() => setPaidAmount(total)}>كل المبلغ</button>
                </div>
              </div>
              <div className="change-display" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '10px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>الباقي للعميل:</label>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: change >= 0 ? 'var(--metro-green)' : 'var(--metro-red)' }}>
                  {change.toFixed(2)} ج.م
                </span>
              </div>
            </div>

            <button
              className="btn btn-primary btn-block btn-lg mt-auto"
              style={{ padding: '24px', fontSize: '1.1rem', fontWeight: 700, marginTop: '20px' }}
              disabled={checkoutLoading || cart.length === 0}
              onClick={handleCheckout}
            >
              {checkoutLoading ? 'جاري الحفظ...' : '🖥️ إتمام العملية (Check Out)'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .pos-container { display: flex; gap: 20px; height: calc(100vh - 120px); padding: 5px; }
        .pos-main { flex: 1; display: flex; flex-direction: column; gap: 20px; overflow: hidden; }
        .pos-sidebar { width: 400px; }
        .search-results-dropdown { position: absolute; top: 100%; left: 0; right: 0; z-index: 1000; overflow-y: auto; background: #121212; border: 1px solid #333; }
        .search-result-item { padding: 12px 20px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; }
        .search-result-item:hover { background: #1a1a1a; }
        .receipt-barcode { height: 45px; width: auto; max-width: 100%; display: block; margin: 4px auto; filter: contrast(150%) brightness(90%); }
      `}</style>

      {/* ─── Receipt View Modal ─── */}
      {showReceipt && lastSale && ReactDOM.createPortal(
        <div className="modal-overlay active no-print" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setShowReceipt(false); }}>
          <div className="modal" style={{ width: '400px' }}>
            <div className="modal-header">
              <h2>إيصال المبيعات</h2>
              <button onClick={() => setShowReceipt(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ background: '#f0f2f5', padding: '20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '15px', color: '#1a1a1a' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>معاينة الفاتورة (80mm)</div>
                <p style={{ margin: '5px 0' }}>تم حفظ العملية بنجاح برقم {lastSale.invoiceNumber || lastSale.id}</p>
                <div style={{
                  border: '1px solid #ccc',
                  background: '#fff',
                  padding: '12px',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
                  marginTop: '15px',
                  width: '300px',
                  margin: '15px auto',
                  textAlign: 'right',
                  fontSize: '10px',
                  lineHeight: '1.4',
                  color: '#000',
                  fontFamily: 'Segoe UI, Tahoma, sans-serif'
                }}>
                  <div style={{ textAlign: 'center', borderBottom: '1px solid #000', paddingBottom: '5px', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '14px' }}>مهلهل جروب</strong><br />
                    <span>فرع السنترال</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #000', padding: '2px 0', fontWeight: 'bold' }}>
                    <span style={{ flex: 1, textAlign: 'right' }}>القيمة</span>
                    <span style={{ flex: 1, textAlign: 'center' }}>السعر</span>
                    <span style={{ flex: 1, textAlign: 'center' }}>كمية</span>
                    <span style={{ flex: 1.5, textAlign: 'left' }}>الصنف</span>
                  </div>

                  {lastSale.items.map((item, idx) => (
                    <div key={idx} style={{ borderBottom: '1px dashed #eee', padding: '4px 0' }}>
                      <div style={{ fontWeight: 'bold', display: 'block' }}>{item.name}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{(item.qty * (item.price || item.unitPrice)).toFixed(2)}</span>
                        <span>{(item.price || item.unitPrice).toFixed(2)}</span>
                        <span>{item.qty}</span>
                        <span>{products.find(p => p.id === item.id)?.productCode || ''}</span>
                      </div>
                    </div>
                  ))}

                  <div style={{ borderTop: '1px solid #000', marginTop: '8px', paddingTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{lastSale.items.reduce((sum, i) => sum + i.qty, 0)}</span>
                      <span>عدد القطع:</span>
                    </div>
                    {lastSale.discount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'red' }}>
                        <span>-{(lastSale.discount || 0).toFixed(2)}</span>
                        <span>خصم:</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px', margin: '4px 0' }}>
                      <span>{(lastSale.total || 0).toFixed(2)}</span>
                      <span>الإجمالي:</span>
                    </div>
                  </div>

                  <div style={{ marginTop: '8px', borderTop: '1px dashed #ccc', paddingTop: '5px' }}>
                    <div>الكاشير: {lastSale.userName}</div>
                    <div>العميل: {lastSale.customerName}</div>
                  </div>

                  <div style={{ marginTop: '5px', fontSize: '8px', color: '#666' }}>
                    Date: {new Date(lastSale.invoiceDate || lastSale.date).toLocaleString('en-GB')}
                  </div>

                  <div style={{ textAlign: 'center', marginTop: '10px' }}>
                    <img
                      src={`${API_BASE.replace('v1', 'public')}/barcode/${lastSale.invoiceNumber || lastSale.id}`}
                      alt="Preview Barcode"
                      className="receipt-barcode"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowReceipt(false)}>إغلاق</button>
              <button className="btn btn-primary" onClick={() => window.print()}>🖨️ طباعة الإيصال</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── Printable Content (Hidden in Normal UI) ─── */}
      {showReceipt && lastSale && (
        <div className="receipt-wrapper" dir="rtl">
          <div className="receipt-header">
            <h2>مهلهل جروب</h2>
            <p>فرع السنترال</p>
          </div>

          <div className="receipt-table-header" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #000', padding: '2px 0', fontWeight: 'bold', fontSize: '10px' }}>
            <span style={{ flex: 1, textAlign: 'right' }}>القيمة</span>
            <span style={{ flex: 1, textAlign: 'center' }}>السعر</span>
            <span style={{ flex: 1, textAlign: 'center' }}>الكمية</span>
            <span style={{ flex: 1.5, textAlign: 'left' }}>الصنف</span>
          </div>

          <div className="receipt-items">
            {lastSale.items.map((item, idx) => (
              <div key={idx} className="receipt-item-row">
                <span className="receipt-item-name">{item.name}</span>
                <div className="receipt-item-details">
                  <span>{(item.qty * (item.price || item.unitPrice)).toFixed(2)}</span>
                  <span>{(item.price || item.unitPrice).toFixed(2)}</span>
                  <span>{item.qty}</span>
                  <span>{products.find(p => p.id === item.id)?.productCode || ''}</span>
                </div>
                {item.discount > 0 && <div style={{ fontSize: '9px', textAlign: 'right' }}>خصم: -{item.discount.toFixed(2)}</div>}
              </div>
            ))}
          </div>

          <div className="receipt-divider"></div>

          <div className="receipt-totals">
            <div>
              <span>{lastSale.items.reduce((sum, i) => sum + i.qty, 0)}</span>
              <span>عدد القطع:</span>
            </div>
            <div style={{ fontSize: '1.2rem' }}>
              <span>{(lastSale.total || 0).toFixed(2)}</span>
              <span>الإجمالي:</span>
            </div>
            <div>
              <span>{(lastSale.paidAmount || 0).toFixed(2)}</span>
              <span>نقدي:</span>
            </div>
            <div className="receipt-divider" style={{ borderStyle: 'dashed' }}></div>
            <div>
              <span>{(lastSale.change || 0).toFixed(2)}</span>
              <span>الباقي:</span>
            </div>
          </div>

          <div style={{ marginTop: '4mm', fontSize: '10px' }}>
            <p>الكاشير: {lastSale.userName}</p>
            <p>رقم العميل: {lastSale.customerId || '—'}</p>
            <p>اسم العميل: {lastSale.customerName || 'عام'}</p>
          </div>

          <div className="receipt-meta-info">
            <span>Store: 3</span>
            <span>PoS: 2</span>
            <span>User: {lastSale.userId || '—'}</span>
            <span>Trans: {lastSale.id || '—'}</span>
            <span style={{ gridColumn: 'span 2', textAlign: 'left' }}>Date: {new Date(lastSale.invoiceDate || lastSale.date).toLocaleString('en-GB').replace(',', '')}</span>
          </div>

          <div className="receipt-policy" style={{ textAlign: 'center' }}>
            <strong>لخدمة التوصيل</strong><br />
            الخط الساخن: 19284<br />
            واتساب الفيوم: 01022129912<br />
            واتساب بني سويف: 01001246897<br />
            <div style={{ marginTop: '2mm', fontSize: '8px' }}>
              مرتجع الأغذية الطازجة خلال 24 ساعة<br />
              أو الاسترجاع خلال 14 يوم من تاريخ الشراء<br />
              السلعة خلال 30 يوم بموجب فاتورة البيع<br />
              للتواصل مع جهاز حماية المستهلك 19588
            </div>
          </div>

          <div className="receipt-footer">
            <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '2px' }}>تفاصيل الفاتورة: {lastSale.invoiceNumber || lastSale.id}</div>
            <img
              className="receipt-barcode"
              src={`${API_BASE.replace('v1', 'public')}/barcode/${lastSale.invoiceNumber || lastSale.id}`}
              alt="Transaction Barcode"
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default POS;
