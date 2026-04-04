import React, { useState, useEffect, useRef } from 'react';
import Api from '../services/api';
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
  const [loading, setLoading] = useState(true); // Default to true for initial load
  const [checkoutLoading, setCheckoutLoading] = useState(false);
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

  // Sync paidAmount with total automatically for easier cash sales
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

      await Api.createSale(saleRequest);
      toast('تمت عملية البيع بنجاح', 'success');
      setCart([]);
      setDiscount(0);
      setPaidAmount(0);
      setSelectedCustomerId('');
      loadInitialData(); // Refresh stock
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
        {/* Search Header */}
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

        {/* Cart Table */}
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
        .search-result-item .item-main { display: flex; flex-direction: column; }
        
        .qty-control button:hover { background: #1a1a1a; color: white; }
        
        /* Hide arrows from numeric inputs */
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>
    </div>
  );
};

export default POS;
