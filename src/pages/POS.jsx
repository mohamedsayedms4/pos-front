import React, { useState, useEffect, useRef, useCallback } from 'react';
import Api, { API_BASE } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import ThermalReceipt from '../components/common/ThermalReceipt';
import { useBranch } from '../context/BranchContext';
import beepSound from '../assets/sound/freesound_community-store-scanner-beep-90395.mp3';
import OpenSessionModal from '../components/pos/OpenSessionModal';
import CloseSessionModal from '../components/pos/CloseSessionModal';
import CashMovementModal from '../components/pos/CashMovementModal';

const WS_URL = API_BASE.replace('/api/v1', '') + '/ws';
const PAGE_SIZE = 24;

const getProductImage = (product) => {
  if (!product) return null;
  const url = product.imageUrl || (product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : null);
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) {
    const serverUrl = API_BASE.replace('/api/v1', '');
    return `${serverUrl}${url}`;
  }
  const filename = url.split('/').pop();
  return `${API_BASE}/products/images/${filename}`;
};

const POS = () => {
  const { selectedBranchId: globalBranchId, branches: contextBranches } = useBranch();
  const [connected, setConnected] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const customerDropdownRef = useRef(null);
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);

  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  const { toast, confirm } = useGlobalUI();
  const searchInputRef = useRef(null);
  const stompClientRef = useRef(null);
  const beepRef = useRef(new Audio(beepSound));

  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  const [browseProducts, setBrowseProducts] = useState([]);
  const [browsePage, setBrowsePage] = useState(0);
  const [browseTotalPages, setBrowseTotalPages] = useState(1);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseSearch, setBrowseSearch] = useState('');
  const observerTarget = useRef(null);

  const [activeSession, setActiveSession] = useState(null);
  const [showOpenSession, setShowOpenSession] = useState(false);
  const [showCloseSession, setShowCloseSession] = useState(false);
  const [showCashMovement, setShowCashMovement] = useState(false);

  const [printPreview, setPrintPreview] = useState(
    localStorage.getItem('pos_print_preview') !== 'false'
  );

  useEffect(() => {
    localStorage.setItem('pos_print_preview', printPreview);
  }, [printPreview]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedCustomerName = customers.find(c => c.id == selectedCustomerId)?.name || '';

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    (c.phone && c.phone.includes(customerSearchQuery))
  );

  // Initialize
  // Initialize
  useEffect(() => {
    const user = Api._getUser();
    
    const initData = async () => {
      if (globalBranchId) {
        setSelectedBranchId(globalBranchId);
      } else if (user && user.branchId) {
        setSelectedBranchId(user.branchId);
      }
      
      let initialBranches = [];
      if (contextBranches && contextBranches.length > 0) {
        initialBranches = contextBranches;
        setBranches(contextBranches);
      }

      // If no branch is selected yet, and we have branches, auto-select the first one
      if (!globalBranchId && (!user || !user.branchId) && initialBranches.length > 0) {
        setSelectedBranchId(initialBranches[0].id);
      }

      // Check current session
      try {
        const sessionRes = await Api.getCurrentSession();
        if (sessionRes && sessionRes.id) {
          setActiveSession(sessionRes);
        } else {
          setShowOpenSession(true);
        }
      } catch (err) {
        console.warn('Could not load session', err);
      }
    };

    initData();
    loadCategories();
    loadCustomers().finally(() => setLoading(false));
  }, [globalBranchId, contextBranches]);

  const loadCategories = async () => {
    try {
      const data = await Api.getCategories();
      const items = data?.content || data || [];
      setCategories(items);
    } catch (e) {
      console.warn("Failed to load categories", e);
      setCategories([]);
    }
  };



  const searchCustomersBackend = async (searchQuery) => {
    try {
      const cData = await Api.getCustomers(0, 50, searchQuery, selectedBranchId);
      const items = cData.items || cData.content || [];
      setCustomers(items);
    } catch (e) {
      console.warn("Error searching customers...", e);
      setCustomers([]);
    }
  };

  const loadCustomers = async () => {
    await searchCustomersBackend('');
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchCustomersBackend(customerSearchQuery);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [customerSearchQuery, selectedBranchId]);

  const loadBrowsePage = useCallback(async (page, search, append = false, branchId = selectedBranchId, categoryId = selectedCategoryId) => {
    if (!branchId && !search && !categoryId) {
      if (!append) setBrowseProducts([]);
      return;
    }
    setBrowseLoading(true);

    try {
      const data = await Api.getProductsPaged(page, PAGE_SIZE, search, 'id,desc', branchId, categoryId);
      const items = data.items || data.content || [];
      setBrowseProducts(prev => append ? [...prev, ...items] : items);
      setBrowseTotalPages(data.totalPages || 1);
      setBrowsePage(page);
    } catch (e) {
      console.warn("Network error");
      if (!append) setBrowseProducts([]);
    } finally {
      setBrowseLoading(false);
    }
  }, [selectedBranchId, selectedCategoryId]);

  // Handle branch or category change -> load products
  useEffect(() => {
    if (selectedBranchId) {
      loadBrowsePage(0, browseSearch, false, selectedBranchId, selectedCategoryId);
    } else {
      setBrowseProducts([]);
    }
  }, [selectedBranchId, selectedCategoryId]);

  const handleBrowseSearch = (val) => {
    if (typeof val === 'string') {
      val = val.replace(/؛ٌ\]\-/g, '').replace(/\]C1/g, '').replace(/\]ؤ1/g, '');
    }
    setBrowseSearch(val);
    loadBrowsePage(0, val, false, selectedBranchId, selectedCategoryId);
  };

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !browseLoading && browsePage < browseTotalPages - 1) {
        loadBrowsePage(browsePage + 1, browseSearch, true, selectedBranchId, selectedCategoryId);
      }
    }, { threshold: 1.0 });
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [browseLoading, browsePage, browseTotalPages, browseSearch, loadBrowsePage, selectedBranchId, selectedCategoryId]);

  // Barcode / Auto-search effect (Simulated via debounced search for barcode readers)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!browseSearch || browseSearch.length < 3) return;
      // If exact barcode match, auto-add
      const exactMatch = browseProducts.find(p => p.productCode === browseSearch || p.barcode === browseSearch || p.name === browseSearch || String(p.id) === browseSearch);
      if (exactMatch) {
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
        // 🔊 Beep
        beepRef.current.currentTime = 0;
        beepRef.current.play().catch(() => {});
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      if (product.stock <= 0) {
        setTimeout(() => toast('نفذ المخزون', 'warning'), 10);
        return prev;
      }
      // 🔊 Beep
      beepRef.current.currentTime = 0;
      beepRef.current.play().catch(() => {});
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

  const handleCheckoutRef = useRef();

  const handleCheckout = async (forceDirectPrint = false) => {
    if (!selectedBranchId) {
      toast('يرجى اختيار الفرع أولاً', 'warning');
      return;
    }

    const executeCheckout = async () => {
      setCheckoutLoading(true);
      const saleData = {
        customerId: selectedCustomerId || null,
        discount,
        paidAmount,
        branchId: selectedBranchId,
        items: cart.map(i => ({ productId: i.id, quantity: i.qty, unitPrice: i.price }))
      };

      try {
        if (!navigator.onLine) throw new Error('OFFLINE');

        const resp = await Api.createSale(saleData);
        const invoiceData = resp.data || resp;
        setLastInvoice(invoiceData);

        toast('تم الدفع بنجاح', 'success');

        localStorage.setItem('print_preview_invoice', JSON.stringify(invoiceData));
        setTimeout(() => {
          if (forceDirectPrint || !printPreview) {
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '-10000px';
            iframe.style.bottom = '-10000px';
            iframe.style.width = '800px';
            iframe.style.height = '1000px';
            iframe.style.border = 'none';
            iframe.src = `/print-receipt/${invoiceData.id}?iframe=true`;
            document.body.appendChild(iframe);
            // Clean up the iframe after a reasonable time
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            }, 15000);
          } else {
            window.open(`/print-receipt/${invoiceData.id}`, '_blank');
          }
          setTimeout(() => setLastInvoice(null), 5000);
        }, 500);

        if (stompClientRef.current?.connected) {
          stompClientRef.current.publish({
            destination: '/app/order-complete',
            body: JSON.stringify({ status: 'COMPLETED', invoiceId: invoiceData.id, ts: Date.now() })
          });
        }

        setCart([]); setDiscount(0); setPaidAmount(0);
        loadBrowsePage(0, browseSearch, false, selectedBranchId, selectedCategoryId);
      } catch (e) {
        console.error("Checkout Error:", e);
        toast(e.message || 'فشلت عملية الدفع', 'error');
      } finally {
        setCheckoutLoading(false);
      }
    };

    executeCheckout();
  };

  handleCheckoutRef.current = handleCheckout;

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isCtrlB = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b';
      const isEnter = e.key === 'Enter';

      if (isCtrlB || isEnter) {
        // Do not trigger checkout if Enter is pressed inside search inputs (e.g., barcode scanner or customer search)
        if (isEnter && (
          (searchInputRef.current && e.target === searchInputRef.current) ||
          (typeof e.target.className === 'string' && e.target.className.includes('dropdown-search-input'))
        )) {
          return;
        }

        e.preventDefault();
        // Prevent checkout if cart is empty or loading
        if (cart.length > 0 && !checkoutLoading) {
          if (handleCheckoutRef.current) {
            handleCheckoutRef.current(isCtrlB); // Ctrl+B forces print, Enter acts like the normal button
          }
        } else if (cart.length === 0 && isCtrlB) {
          toast('السلة فارغة!', 'warning');
        } else if (cart.length === 0 && isEnter) {
          // Optional: we might not want to show a toast every time Enter is pressed randomly if cart is empty
          // toast('السلة فارغة!', 'warning');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart.length, checkoutLoading, toast]);

  if (loading) return <Loader message="جاري تجهيز الكاشير..." />;

  return (
    <>
      {showOpenSession && <OpenSessionModal onOpenSuccess={() => { setShowOpenSession(false); Api.getCurrentSession().then(setActiveSession).catch(()=>{}); }} />}
      {showCloseSession && <CloseSessionModal onCloseSuccess={() => { setShowCloseSession(false); setActiveSession(null); setShowOpenSession(true); }} onCancel={() => setShowCloseSession(false)} />}
      {showCashMovement && <CashMovementModal onClose={() => setShowCashMovement(false)} />}

      <div className="pos-premium-container">
      {checkoutLoading && <div className="loader-overlay"><Loader message="جاري إتمام الدفع..." /></div>}

      {/* LEFT: PRODUCTS BROWSER */}
      <div className="pos-products-pane">
        <div className="pos-header-glass">
          <div className="pos-search-wrapper">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="ابحث بالاسم أو امسح الباركود..."
              value={browseSearch}
              onChange={e => handleBrowseSearch(e.target.value)}
              autoFocus
            />
            <span className="search-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
          </div>
          <div className={`sync-indicator ${connected ? 'active' : ''}`}>
            {connected ? '🟢 متصل' : '🔴 غير متصل'}
          </div>
        </div>

        <div className="pos-categories-bar">
          <button 
            className={`category-pill ${selectedCategoryId === '' ? 'active' : ''}`}
            onClick={() => setSelectedCategoryId('')}
          >
            📁 الكل
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`category-pill ${selectedCategoryId == cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategoryId(cat.id)}
            >
              {cat.name}
            </button>
          ))}
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
                    <div className="pos-item-price">{(Number(p.salePrice) || 0).toFixed(2)} ج.م</div>
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
          <div style={{display:'flex', gap:'5px', flexWrap:'wrap', alignItems:'center'}}>
            <button onClick={() => setShowCashMovement(true)} style={{padding:'4px 10px', fontSize:'0.75rem', background:'var(--metro-blue)', color:'white', borderRadius:'6px', border:'none', cursor:'pointer'}}>حركة نقدية</button>
            <button onClick={() => setShowCloseSession(true)} style={{padding:'4px 10px', fontSize:'0.75rem', background:'#ef4444', color:'white', borderRadius:'6px', border:'none', cursor:'pointer'}}>تقفيل الوردية</button>
          </div>
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

          {/* Searchable Customer Dropdown */}
          <div className="searchable-select-container" ref={customerDropdownRef}>
            <div 
              className="pos-select-display form-control pos-select" 
              onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
            >
              <span>{selectedCustomerName || 'عميل نقدي (كاش)'}</span>
              <span className="dropdown-arrow">▼</span>
            </div>
            
            {isCustomerDropdownOpen && (
              <div className="pos-select-dropdown">
                <div className="dropdown-search-wrapper">
                  <input 
                    type="text" 
                    className="dropdown-search-input" 
                    placeholder="ابحث باسم العميل أو رقم الهاتف..." 
                    value={customerSearchQuery}
                    onChange={e => setCustomerSearchQuery(e.target.value)}
                    autoFocus 
                  />
                </div>
                <div className="dropdown-options-list">
                  <div 
                    className={`dropdown-option ${!selectedCustomerId ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedCustomerId('');
                      setIsCustomerDropdownOpen(false);
                      setCustomerSearchQuery('');
                    }}
                  >
                    عميل نقدي (كاش)
                  </div>
                  {filteredCustomers.map(c => (
                    <div 
                      key={c.id} 
                      className={`dropdown-option ${selectedCustomerId == c.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setIsCustomerDropdownOpen(false);
                        setCustomerSearchQuery('');
                      }}
                    >
                      <span className="option-name">{c.name}</span>
                      {c.phone && <span className="option-phone">{c.phone}</span>}
                    </div>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <div className="dropdown-no-results">لا يوجد نتائج</div>
                  )}
                </div>
              </div>
            )}
          </div>
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
                  <div className="item-price">{(Number(item.price) || 0).toFixed(2)} ج.م</div>
                </div>
                <div className="item-actions">
                  <div className="qty-spinner">
                    <button onClick={() => updateQty(item.id, item.qty - 1)}>-</button>
                    <input type="number" value={item.qty} onChange={e => updateQty(item.id, parseFloat(e.target.value) || 0)} />
                    <button onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
                  </div>
                  <div className="item-total">{(Number(item.price * item.qty) || 0).toFixed(2)}</div>
                  <button className="remove-btn" onClick={() => removeFromCart(item.id)}>✕</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="cart-summary-box">
          <div className="summary-row">
            <span>الإجمالي الفرعي</span>
            <span>{(Number(subtotal) || 0).toFixed(2)} ج.م</span>
          </div>
          <div className="summary-row highlight">
            <span>الخصم</span>
            <div className="discount-input">
              <input type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div className="summary-total">
            <span>المطلوب</span>
            <span className="amount">{(Number(total) || 0).toFixed(2)} <small>ج.م</small></span>
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
            <span className={`change-amount ${change < 0 ? 'negative' : ''}`}>{(Number(change) || 0).toFixed(2)}</span>
          </div>
          
          <div className="print-options" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <input 
              type="checkbox" 
              id="printPreviewToggle" 
              checked={printPreview} 
              onChange={e => setPrintPreview(e.target.checked)} 
              style={{ cursor: 'pointer', accentColor: 'var(--metro-blue)' }}
            />
            <label htmlFor="printPreviewToggle" style={{ fontSize: '0.85rem', color: 'var(--text-dim)', cursor: 'pointer' }}>
              معاينة الفاتورة قبل الطباعة
            </label>
          </div>
          
          <button 
            className="checkout-btn" 
            onClick={() => handleCheckout(false)} 
            disabled={checkoutLoading || cart.length === 0}
            title="إتمام الدفع (Ctrl+B للطباعة الفورية)"
          >
            💳 إتمام الدفع {printPreview ? 'والمعاينة' : 'والطباعة المباشرة'}
          </button>
        </div>
      </div>

      <style>{`
        /* Premium POS Layout */
        .pos-premium-container {
          display: grid;
          grid-template-columns: 1fr 390px;
          gap: 16px;
          height: calc(100vh - 145px);
          padding: 0;
          background: var(--bg-black);
          font-family: 'Cairo', 'Inter', sans-serif;
          overflow: hidden;
          box-sizing: border-box;
        }

        .print-only-wrapper {
          position: absolute;
          top: -9999px;
          left: -9999px;
          opacity: 0;
        }

        @media print {
          .print-only-wrapper {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            opacity: 1 !important;
            visibility: visible !important;
            z-index: 999999 !important;
            display: block !important;
          }
        }

        /* Loaders */
        .loader-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Left Pane: Products */
        .pos-products-pane {
          display: flex;
          flex-direction: column;
          gap: 0;
          overflow: hidden;
          background: var(--bg-elevated);
          border-radius: 12px;
          border: 1px solid var(--border-subtle);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
        }

        .pos-header-glass {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 18px;
          background: rgba(255, 255, 255, 0.005);
          border-bottom: 1px solid var(--border-subtle);
          backdrop-filter: blur(10px);
        }

        .pos-categories-bar {
          display: flex;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.002);
          border-bottom: 1px solid var(--border-subtle);
          overflow-x: auto;
          white-space: nowrap;
          scrollbar-width: none;
        }
        .pos-categories-bar::-webkit-scrollbar {
          display: none;
        }
        .category-pill {
          background: var(--bg-tile);
          border: 1px solid var(--border-subtle);
          color: var(--text-light);
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .category-pill:hover {
          background: rgba(0, 120, 215, 0.08);
          border-color: var(--metro-blue);
          color: var(--text-white);
        }
        .category-pill.active {
          background: var(--metro-blue);
          color: #fff !important;
          border-color: var(--metro-blue);
          box-shadow: 0 4px 10px rgba(0, 120, 215, 0.2);
        }

        .pos-search-wrapper {
          position: relative;
          width: 50%;
          min-width: 280px;
        }

        .pos-search-wrapper .search-icon {
          position: absolute;
          left: 14px;
          right: auto;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          font-size: 1.1rem;
          pointer-events: none;
          transition: color 0.25s ease;
        }

        .pos-search-wrapper input {
          width: 100%;
          padding: 10px 14px 10px 42px;
          border-radius: 30px;
          background: var(--bg-input);
          border: 1px solid var(--border-input);
          color: var(--text-white);
          font-size: 0.9rem;
          font-family: inherit;
          transition: all 0.25s ease;
        }

        .pos-search-wrapper input:focus + .search-icon,
        .pos-search-wrapper input:focus ~ .search-icon {
          color: var(--metro-blue);
        }

        .pos-search-wrapper input:focus {
          outline: none;
          background: var(--bg-input);
          border-color: var(--metro-blue);
          box-shadow: 0 0 0 3px rgba(0, 120, 215, 0.12);
        }

        .sync-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 700;
          background: rgba(239, 68, 68, 0.06);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.12);
          transition: all 0.3s ease;
        }

        .sync-indicator.active {
          background: rgba(16, 185, 129, 0.06);
          color: #10b981;
          border-color: rgba(16, 185, 129, 0.12);
        }

        .pending-badge {
          margin-right: 4px;
          background: #f59e0b;
          color: #fff;
          padding: 1px 6px;
          border-radius: 10px;
          font-size: 0.7rem;
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
          padding: 16px;
        }

        /* Premium Scrollbars */
        .pos-grid-container::-webkit-scrollbar, 
        .cart-items-list::-webkit-scrollbar {
          width: 5px;
        }
        .pos-grid-container::-webkit-scrollbar-track, 
        .cart-items-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .pos-grid-container::-webkit-scrollbar-thumb, 
        .cart-items-list::-webkit-scrollbar-thumb {
          background: var(--border-input);
          border-radius: 10px;
        }
        .pos-grid-container::-webkit-scrollbar-thumb:hover, 
        .cart-items-list::-webkit-scrollbar-thumb:hover {
          background: var(--border-hover);
        }

        .pos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 12px;
        }

        .pos-item-card {
          background: var(--bg-tile);
          border: 1px solid var(--border-subtle);
          border-radius: 10px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.01);
        }

        .pos-item-card:hover {
          transform: translateY(-3px);
          border-color: var(--metro-blue);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
        }

        .pos-item-card:active {
          transform: translateY(-1px);
        }

        .pos-item-card.out-stock {
          opacity: 0.45;
          filter: grayscale(1);
          cursor: not-allowed;
          transform: none !important;
          box-shadow: none !important;
        }

        .pos-item-image {
          position: relative;
          padding-top: 80%;
          background: var(--bg-input);
          overflow: hidden;
        }

        .pos-item-image img {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .pos-item-card:hover .pos-item-image img {
          transform: scale(1.04);
        }

        .placeholder-icon {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.2rem;
          color: var(--text-dim);
          opacity: 0.5;
        }

        .stock-badge {
          position: absolute;
          top: 6px;
          right: 6px;
          background: rgba(0, 0, 0, 0.6);
          color: #fff;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 700;
          backdrop-filter: blur(4px);
        }

        .pos-item-details {
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .pos-item-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-white);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .pos-item-price {
          color: var(--metro-blue);
          font-weight: 800;
          font-size: 1.05rem;
        }

        /* Right Pane: Cart */
        .pos-cart-pane {
          background: var(--bg-elevated);
          border-radius: 12px;
          border: 1px solid var(--border-subtle);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .cart-header {
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.005);
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .cart-header h3 { 
          margin: 0; 
          font-size: 1.05rem; 
          font-weight: 700;
          color: var(--text-white);
        }

        .items-count { 
          background: var(--metro-blue); 
          color: #fff; 
          padding: 2px 8px; 
          border-radius: 15px; 
          font-size: 0.75rem; 
          font-weight: 700; 
        }

        .cart-controls {
          padding: 10px 14px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          border-bottom: 1px solid var(--border-subtle);
          background: rgba(255, 255, 255, 0.002);
        }

        .pos-select {
          background: var(--bg-input);
          border: 1px solid var(--border-input);
          border-radius: 6px;
          padding: 8px 10px;
          color: var(--text-white);
          font-size: 0.85rem;
          font-family: inherit;
          transition: all 0.25s ease;
          width: 100%;
        }

        .pos-select:focus {
          border-color: var(--metro-blue);
          outline: none;
        }

        .pos-select option {
          background: var(--bg-elevated);
          color: var(--text-white);
        }

        .searchable-select-container {
          position: relative;
          width: 100%;
        }

        .pos-select-display {
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          user-select: none;
        }

        .dropdown-arrow {
          font-size: 0.65rem;
          opacity: 0.7;
          margin-left: 2px;
        }

        .pos-select-dropdown {
          position: absolute;
          top: 105%;
          left: 0;
          right: 0;
          background: var(--bg-elevated);
          border: 1px solid var(--border-input);
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
          z-index: 9999;
          display: flex;
          flex-direction: column;
          max-height: 250px;
        }

        .dropdown-search-wrapper {
          padding: 8px;
          border-bottom: 1px solid var(--border-subtle);
          background: rgba(0, 0, 0, 0.2);
        }

        .dropdown-search-input {
          width: 100%;
          background: var(--bg-input);
          border: 1px solid var(--border-input);
          border-radius: 4px;
          padding: 6px 8px;
          color: var(--text-white);
          font-size: 0.85rem;
          font-family: inherit;
        }

        .dropdown-search-input:focus {
          border-color: var(--metro-blue);
          outline: none;
        }

        .dropdown-options-list {
          flex: 1;
          overflow-y: auto;
          padding: 4px 0;
        }

        .dropdown-option {
          padding: 8px 12px;
          cursor: pointer;
          font-size: 0.85rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.2s ease;
          color: var(--text-white);
          gap: 8px;
        }

        .dropdown-option:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .dropdown-option.selected {
          background: var(--metro-blue);
          color: #fff;
        }

        .option-name {
          flex: 1;
          text-align: right;
        }

        .option-phone {
          font-size: 0.75rem;
          opacity: 0.6;
        }

        .dropdown-no-results {
          padding: 12px;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.85rem;
        }

        .cart-items-list {
          flex: 1;
          overflow-y: auto;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .empty-cart-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          text-align: center;
          gap: 4px;
        }

        .empty-cart-state .icon { 
          font-size: 3rem; 
          opacity: 0.35;
        }
        
        .empty-cart-state p {
          font-weight: 600;
          margin: 0;
          font-size: 0.9rem;
        }
        
        .empty-cart-state small {
          font-size: 0.75rem;
          opacity: 0.6;
        }

        .cart-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 10px 12px;
          background: var(--bg-tile);
          border-radius: 8px;
          border: 1px solid var(--border-subtle);
          transition: all 0.2s ease;
        }

        .cart-item:hover {
          border-color: var(--border-hover);
        }

        .cart-item .item-info {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
        }

        .item-title { 
          font-weight: 600; 
          font-size: 0.9rem; 
          color: var(--text-white);
          line-height: 1.3;
        }

        .item-price { 
          color: var(--text-muted); 
          font-size: 0.8rem; 
          white-space: nowrap;
        }

        .cart-item .item-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .qty-spinner {
          display: flex;
          background: var(--bg-input);
          border: 1px solid var(--border-input);
          border-radius: 6px;
          overflow: hidden;
          align-items: center;
        }

        .qty-spinner button {
          background: var(--bg-tile);
          border: none;
          color: var(--text-white);
          width: 28px;
          height: 28px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1rem;
          transition: background 0.2s;
        }

        .qty-spinner button:hover { 
          background: var(--bg-hover-tile); 
        }

        .qty-spinner input {
          width: 32px;
          height: 28px;
          text-align: center;
          background: transparent;
          border: none;
          color: var(--text-white);
          font-weight: 700;
          font-size: 0.85rem;
          font-family: inherit;
        }

        /* Disable spinner input arrows */
        .qty-spinner input::-webkit-outer-spin-button,
        .qty-spinner input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .item-total { 
          font-weight: 800; 
          color: var(--metro-blue); 
          font-size: 0.95rem;
        }

        .remove-btn { 
          background: transparent; 
          border: none; 
          color: var(--metro-red); 
          cursor: pointer; 
          padding: 4px; 
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .remove-btn:hover { 
          background: rgba(232, 17, 35, 0.08); 
        }

        .cart-summary-box {
          padding: 10px 14px;
          background: var(--bg-input);
          border-top: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: var(--text-light);
          font-size: 0.85rem;
        }

        .summary-row.highlight { 
          color: var(--text-white); 
          font-weight: 600;
        }

        .discount-input input {
          width: 70px;
          background: var(--bg-tile);
          border: 1px solid var(--border-input);
          color: var(--metro-orange);
          padding: 4px 6px;
          border-radius: 4px;
          text-align: center;
          font-weight: 700;
          font-size: 0.85rem;
          font-family: inherit;
        }

        .discount-input input:focus {
          outline: none;
          border-color: var(--metro-orange);
        }

        .summary-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 4px;
          padding-top: 8px;
          border-top: 1px dashed var(--border-input);
        }

        .summary-total span:first-child { 
          font-size: 1rem; 
          font-weight: 700; 
          color: var(--text-white);
        }

        .summary-total .amount { 
          font-size: 1.8rem; 
          font-weight: 800; 
          color: var(--metro-blue); 
        }

        .summary-total .amount small {
          font-size: 0.85rem;
          font-weight: 600;
        }

        .payment-box {
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.002);
          border-top: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .payment-input-group {
          position: relative;
        }

        .payment-input-group label { 
          display: block; 
          font-size: 0.8rem; 
          color: var(--text-muted); 
          margin-bottom: 4px; 
          font-weight: 600;
        }

        .payment-input-group input {
          width: 100%;
          background: var(--bg-input);
          border: 1px solid var(--border-input);
          padding: 8px 12px;
          border-radius: 6px;
          color: var(--text-white);
          font-size: 1.4rem;
          font-weight: 800;
          font-family: inherit;
          text-align: right;
          padding-left: 70px; /* Space for the absolute button */
          transition: all 0.25s ease;
        }

        .payment-input-group input:focus {
          outline: none;
          border-color: var(--metro-blue);
          box-shadow: 0 0 0 3px rgba(0, 120, 215, 0.1);
        }

        .exact-btn {
          position: absolute;
          left: 6px;
          bottom: 5px;
          background: rgba(0, 120, 215, 0.1);
          border: 1px solid rgba(0, 120, 215, 0.15);
          color: var(--metro-blue);
          padding: 4px 10px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 700;
          font-family: inherit;
          transition: all 0.2s;
        }

        .exact-btn:hover { 
          background: var(--metro-blue); 
          color: #fff;
          border-color: var(--metro-blue);
        }

        .change-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: var(--bg-input);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
        }

        .change-row span:first-child {
          color: var(--text-light);
          font-weight: 600;
          font-size: 0.8rem;
        }

        .change-amount { 
          font-size: 1.15rem; 
          font-weight: 800; 
          color: var(--metro-green); 
        }

        .change-amount.negative { 
          color: var(--metro-red); 
        }

        .checkout-btn {
          width: 100%;
          background: linear-gradient(135deg, var(--metro-blue), var(--metro-dark-blue));
          color: #fff;
          border: none;
          padding: 10px 14px;
          font-size: 1rem;
          font-weight: 800;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 3px 10px rgba(0, 120, 215, 0.15);
          font-family: inherit;
        }

        .checkout-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 15px rgba(0, 120, 215, 0.25);
          filter: brightness(1.05);
        }

        .checkout-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .checkout-btn:disabled {
          background: var(--border-input);
          color: var(--text-dim);
          box-shadow: none;
          cursor: not-allowed;
          opacity: 0.6;
        }

        /* Responsive Layout */
        @media (max-width: 1100px) {
          .pos-premium-container {
            grid-template-columns: 1fr 320px;
            gap: 10px;
            padding: 0;
          }
        }
        @media (max-width: 768px) {
          .pos-premium-container {
            grid-template-columns: 1fr;
            height: auto;
            overflow-y: auto;
          }
          .pos-products-pane {
            height: 55vh;
          }
        }
      `}</style>
    </div>
    </>
  );
};

export default POS;
