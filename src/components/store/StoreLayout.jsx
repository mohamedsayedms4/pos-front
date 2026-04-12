import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import StoreApi from '../../services/storeApi';
import CartDrawer from './CartDrawer';
import CheckoutModal from './CheckoutModal';
import StoreLoginModal from './StoreLoginModal';
import { useStoreAuth } from '../../context/StoreAuthContext';
import '../../styles/ecommerce.css';

const STORE_NAME = 'مهلهل جروب';

const StoreLayout = ({ children, hideHeader = false }) => {
  const {
    cart, updateQty, removeFromCart, clearCart,
    cartCount, cartTotal,
    cartOpen, setCartOpen,
    checkoutOpen, setCheckoutOpen,
    toast,
    storeInfo,
    categories,
    wishlist,
    toggleWishlist,
    isWishlisted
  } = useStore();

  const { storeCustomer, storeLogout } = useStoreAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [search, setSearch] = useState(new URLSearchParams(location.search).get('search') || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = React.useRef(null);
  const [trackOpen, setTrackOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [trackNum, setTrackNum] = useState('');
  const [trackResult, setTrackResult] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');

  React.useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    setSearch(queryParams.get('search') || '');
  }, [location.search]);

  React.useEffect(() => {
    if (!search || !search.trim() || search.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await StoreApi.getProducts(0, 5, search.trim());
        setSuggestions(res.items || res.content || res || []);
      } catch (e) {}
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setShowSuggestions(false);
    if (search.trim()) {
      navigate(`/store?search=${encodeURIComponent(search.trim())}`);
    } else {
      navigate('/store');
    }
  };

  const handleTrack = async () => {
    if (!trackNum.trim()) return;
    setTrackLoading(true); setTrackError('');
    try {
      const res = await StoreApi.trackOrder(trackNum.trim());
      setTrackResult(res);
    } catch (e) { setTrackError(e.message); }
    finally { setTrackLoading(false); }
  };

  return (
    <div className="ec-store">
      {/* ─── NEW TOP BAR (Dubai Phone Style) ─── */}
      <div className="ec-topbar-premium">
        <div className="ec-topbar-inner">
          <div className="ec-topbar-right">
            <div className="ec-topbar-ticker desktop-only">
              <span>• ضمان حتى عامين من الوكيل  • توصيل سريع وأمن  • سعر واحد للكاش والتقسيط  • نقاط مشتريات مجانية</span>
            </div>
            <span className="ec-sep desktop-only">|</span>
            <a href="#" className="ec-topbar-link">أماكن الفروع</a>
            <span className="ec-sep">|</span>
            <a href={`https://wa.me/${storeInfo?.whatsappNumber}`} className="ec-topbar-link">
              <span style={{ color: '#25D366' }}>🟢</span> دعم من خلال الواتساب
            </a>
            <span className="ec-sep">|</span>
            <span className="ec-topbar-text">📞 {storeInfo?.phone1 || '15254'}</span>
          </div>
          <div className="ec-topbar-left">
            <div className="ec-lang-selector">
              <span>العربية</span>
              <img src="https://flagcdn.com/w20/eg.png" alt="Egypt" style={{ width: '18px', height: '12px' }} />
              <span className="ec-chevron-down">⌄</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MAIN HEADER ─── */}
      {!hideHeader && (
        <header className="ec-header">
          <div className="ec-header-inner">
            {/* Logo (Right side) */}
            <div className="ec-header-right">
              <Link to="/store" className="ec-logo-premium">
                {storeInfo?.logoUrl ? (
                  <img src={StoreApi.getImageUrl(storeInfo.logoUrl)} alt={storeInfo.name} />
                ) : (
                  <span className="ec-logo-text-fallback">{storeInfo?.name || STORE_NAME}</span>
                )}
              </Link>
            </div>

            {/* Search (Center) */}
            <form ref={searchRef} className="ec-search-container-premium" style={{ position: 'relative' }} onSubmit={handleSearch}>
              <div className="ec-search-input-wrapper">
                <input
                  type="text"
                  className="ec-search-input"
                  placeholder="بحث عن المنتجات ..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => { if(search.trim().length >= 2) setShowSuggestions(true); }}
                />
                {search && (
                  <button
                    type="button"
                    className="ec-search-clear-btn"
                    onClick={() => { setSearch(''); navigate('/store'); }}
                    title="مسح البحث"
                  >
                    ✕
                  </button>
                )}
                <button type="submit" className="ec-search-submit-btn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </button>
              </div>

              {/* Autocomplete Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="ec-search-suggestions-dropdown">
                  {suggestions.map(p => (
                    <div 
                      key={p.id} 
                      className="ec-search-suggestion-item"
                      onClick={() => {
                        setShowSuggestions(false);
                        navigate(`/store/product/${p.id}`);
                      }}
                    >
                      <img 
                        src={(p.imageUrls && p.imageUrls.length > 0) 
                          ? StoreApi.getImageUrl(p.imageUrls[0]) 
                          : (p.image ? StoreApi.getImageUrl(p.image) 
                          : (p.imageUrl ? StoreApi.getImageUrl(p.imageUrl) 
                          : '/placeholder.png'))} 
                        alt={p.name} 
                      />
                      <div className="ec-search-suggestion-info">
                        <span className="ec-search-suggestion-name">{p.name}</span>
                        <span className="ec-search-suggestion-price">{Number(p.salePrice).toLocaleString()} {storeInfo?.currency || 'جنيه'}</span>
                      </div>
                    </div>
                  ))}
                  <div 
                    className="ec-search-suggestion-footer"
                    onClick={handleSearch}
                  >
                    عرض كل النتائج لـ "{search}"
                  </div>
                </div>
              )}
            </form>

            {/* Actions (Left side) */}
            <div className="ec-header-left">
              <button className="ec-cart-btn-premium" onClick={() => navigate('/store/wishlist')} style={{ background: 'transparent', border: '1px solid #e2e8f0', color: location.pathname === '/store/wishlist' ? '#2b3481' : '#64748b', padding: '10px 15px', borderRadius: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>{location.pathname === '/store/wishlist' ? '❤️' : '🤍'}</span>
                <span style={{ fontWeight: 700, marginLeft: '5px' }}>المفضلة ({wishlist?.length || 0})</span>
              </button>
              <button className="ec-cart-btn-premium" onClick={() => setCartOpen(true)}>
                <span className="ec-btn-icon">🛒</span>
                <span>عربة التسوق ({cartCount})</span>
              </button>
              {storeCustomer ? (
                <div className="ec-nav-dropdown-container" style={{ position: 'relative' }}>
                  <button className="ec-account-btn" onClick={() => navigate('/store/account')} style={{ gap: '5px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', color: 'var(--ec-primary)' }}>
                    <span className="ec-btn-icon">👤</span>
                    <span>{storeCustomer.name.split(' ')[0]}</span>
                  </button>
                </div>
              ) : (
                <button className="ec-account-btn" onClick={() => setLoginModalOpen(true)}>
                  <span className="ec-btn-icon">👤</span>
                  <span>تسجيل الدخول</span>
                </button>
              )}
            </div>
          </div>

        </header>
      )}

      {/* ─── MAIN CONTENT ─── */}
      <main className="ec-main">
        {children}
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="ec-footer">
        <div className="ec-footer-inner">
          <div className="ec-footer-brand">{storeInfo?.name || STORE_NAME}</div>
          {storeInfo?.aboutUs && <p style={{ fontSize: '.85rem', marginBottom: '15px', maxWidth: '600px', margin: '0 auto 15px' }}>{storeInfo.aboutUs}</p>}
          <p>© {new Date().getFullYear()} جميع الحقوق محفوظة</p>
          <p style={{ marginTop: '10px', opacity: .6 }}>توصيل سريع • جودة مضمونة • دعم فني</p>
          {storeInfo?.phone1 && <p style={{ marginTop: '10px', fontSize: '.8rem' }}>تواصل معنا: {storeInfo.phone1}</p>}
        </div>
      </footer>

      {/* ─── MOBILE BOTTOM NAV ( Dubai Phone Style ) ─── */}
      <div className="ec-mobile-nav">
        <Link to="/store" className={`ec-mobile-nav-item ${location.pathname === '/store' ? 'active' : ''}`}>
          <div className="ec-mobile-nav-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          </div>
          <span>الرئيسية</span>
        </Link>
        <button className="ec-mobile-nav-item" onClick={() => navigate('/store')}>
          <div className="ec-mobile-nav-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="14" rx="1"></rect><rect width="7" height="7" x="3" y="14" rx="1"></rect></svg>
          </div>
          <span>القائمة</span>
        </button>
        <a href={`https://wa.me/${storeInfo?.whatsappNumber}`} className="ec-mobile-nav-item whatsapp">
          <div className="ec-mobile-nav-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
          </div>
          <span>اسألنا</span>
        </a>
        <button className="ec-mobile-nav-item" onClick={() => setCartOpen(true)}>
          <div className="ec-mobile-nav-icon cart">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
            {cartCount > 0 && <span className="ec-mobile-cart-badge">{cartCount}</span>}
          </div>
          <span>عربة التسوق</span>
        </button>
        <button className={`ec-mobile-nav-item ${location.pathname === '/store/wishlist' ? 'active-blue' : ''}`} onClick={() => navigate('/store/wishlist')}>
          <div className="ec-mobile-nav-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill={location.pathname === '/store/wishlist' ? "#2b3481" : "none"} stroke={location.pathname === '/store/wishlist' ? "#2b3481" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.72-8.72 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            {wishlist?.length > 0 && <span className="ec-mobile-cart-badge" style={{ background: '#2b3481', borderColor: '#fff' }}>{wishlist.length}</span>}
          </div>
          <span>المفضلة</span>
        </button>
        {storeCustomer ? (
          <button className={`ec-mobile-nav-item ${location.pathname === '/store/account' ? 'active-blue' : ''}`} onClick={() => navigate('/store/account')}>
            <div className="ec-mobile-nav-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill={location.pathname === '/store/account' ? "#2b3481" : "none"} stroke={location.pathname === '/store/account' ? "#2b3481" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
            <span>حسابي</span>
          </button>
        ) : (
          <button className="ec-mobile-nav-item" onClick={() => setLoginModalOpen(true)}>
            <div className="ec-mobile-nav-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
            <span>دخول</span>
          </button>
        )}
      </div>

      {/* ─── OVERLAYS ─── */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        onUpdate={updateQty}
        onRemove={removeFromCart}
        onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }}
      />

      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cart={cart}
        onSuccess={clearCart}
      />

      {/* Track Order Modal */}
      {trackOpen && (
        <div className="ec-modal-overlay">
          <div className="ec-modal">
            <div className="ec-modal-header">
              <h3>📦 تتبع حالة طلبك</h3>
              <button onClick={() => { setTrackOpen(false); setTrackResult(null); setTrackNum(''); }}>✕</button>
            </div>
            <div className="ec-modal-body">
              <div className="ec-form-group">
                <label>أدخل رقم الطلب</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input value={trackNum} onChange={e => setTrackNum(e.target.value)} placeholder="مثال: ONL-20240315-001" style={{ flex: 1 }} />
                  <button className="ec-btn ec-btn-primary" onClick={handleTrack} disabled={trackLoading}>
                    {trackLoading ? '...' : 'تتبع'}
                  </button>
                </div>
              </div>
              {trackError && <div className="ec-error">{trackError}</div>}
              {trackResult && (
                <div className="ec-track-result">
                  <div className="ec-track-status" style={{
                    background: trackResult.status === 'CANCELLED' ? '#fff5f5' : '#e8f5e9',
                    borderColor: trackResult.status === 'CANCELLED' ? '#feb2b2' : '#c6f6d5',
                    color: trackResult.status === 'CANCELLED' ? '#c53030' : '#2f855a'
                  }}>
                    <span>الحالة الحالية:</span>
                    <strong>{trackResult.status}</strong>
                  </div>
                  <div className="ec-track-details">
                    <p><strong>التاريخ:</strong> {new Date(trackResult.orderDate).toLocaleDateString('ar-EG')}</p>
                    <p><strong>الإجمالي:</strong> {trackResult.totalAmount.toLocaleString()} جنيه</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="ec-toast">{toast}</div>}

      <StoreLoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </div>
  );
};

export default StoreLayout;
