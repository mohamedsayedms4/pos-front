import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import StoreApi from '../../services/storeApi';
import CartDrawer from './CartDrawer';
import CheckoutModal from './CheckoutModal';
import StoreLoginModal from './StoreLoginModal';
import { useStoreAuth } from '../../context/StoreAuthContext';
import '../../styles/ecommerce.css';
import * as fbPixel from '../../services/fbPixel';

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
  const [offersCount, setOffersCount] = useState(0);

  const platformName = storeInfo?.name || STORE_NAME;

  // ── Facebook Pixel: init once when storeInfo is loaded ──
  React.useEffect(() => {
    if (storeInfo?.facebookPixelId) {
      fbPixel.initPixel(storeInfo.facebookPixelId);
    }
  }, [storeInfo?.facebookPixelId]);

  React.useEffect(() => {
    fbPixel.trackPageView();
  }, [location.pathname]);

  React.useEffect(() => {
    if (storeCustomer) {
      StoreApi.countMyOffers().then(res => setOffersCount(res.data || 0)).catch(e => console.error(e));
    } else {
      setOffersCount(0);
    }
  }, [storeCustomer]);

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
      fbPixel.trackSearch(search.trim());
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
            <a href={`https://wa.me/${storeInfo?.whatsappNumber}`} className="ec-topbar-link" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-whatsapp" style={{ color: '#25D366', marginLeft: '5px' }}></i>
              دعم الواتساب
            </a>
            <span className="ec-sep">|</span>
            <span className="ec-topbar-text"><i className="fas fa-phone-alt" style={{ marginLeft: '5px', fontSize: '0.7rem' }}></i> {storeInfo?.phone1 || '15254'}</span>
          </div>
          <div className="ec-topbar-left">
            <div className="ec-lang-selector">
              <span>العربية</span>
              <img src="https://flagcdn.com/w20/eg.png" alt="Egypt" style={{ width: '18px', height: '12px' }} />
              <i className="fas fa-chevron-down" style={{ fontSize: '0.7rem', marginRight: '5px' }}></i>
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
                    <i className="fas fa-times"></i>
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
              <button className="ec-cart-btn-premium" onClick={() => navigate('/store/wishlist')} style={{ background: 'transparent', border: '1px solid #e2e8f0', color: location.pathname === '/store/wishlist' ? '#2b3481' : '#64748b', padding: '6px 15px', borderRadius: '50px' }}>
                <span style={{ fontSize: '1rem' }}>{location.pathname === '/store/wishlist' ? <i className="fas fa-heart"></i> : <i className="far fa-heart"></i>}</span>
                <span style={{ fontWeight: 700, marginLeft: '5px' }}>المفضلة ({wishlist?.length || 0})</span>
              </button>
              <button className="ec-cart-btn-premium" onClick={() => setCartOpen(true)}>
                <span className="ec-btn-icon"><i className="fas fa-shopping-cart"></i></span>
                <span>عربة التسوق ({cartCount})</span>
              </button>
              {storeCustomer ? (
                <div className="ec-nav-dropdown-container" style={{ position: 'relative' }}>
                  <button className="ec-account-btn" onClick={() => navigate('/store/account')} style={{ gap: '5px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', color: 'var(--ec-primary)', position: 'relative' }}>
                    <span className="ec-btn-icon"><i className="fas fa-user-circle"></i></span>
                    <span>{storeCustomer.name.split(' ')[0]}</span>
                    {offersCount > 0 && (
                      <span style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#f59e0b', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', border: '2px solid #fff' }}>
                        {offersCount}
                      </span>
                    )}
                  </button>
                </div>
              ) : (
                <button className="ec-account-btn" onClick={() => setLoginModalOpen(true)}>
                  <span className="ec-btn-icon"><i className="fas fa-sign-in-alt"></i></span>
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

      {/* ─── PREMIUM FOOTER ─── */}
      <footer className="ec-footer-premium">
        <div className="ec-footer-top">
          <div className="ec-footer-container">
            <div className="ec-footer-grid">
              
              {/* Brand Column */}
              <div className="ec-footer-col brand">
                <Link to="/store" className="ec-footer-logo">
                  {storeInfo?.logoUrl ? (
                    <img src={StoreApi.getImageUrl(storeInfo.logoUrl)} alt={storeInfo.name} />
                  ) : (
                    <span className="ec-logo-text-fallback light">{storeInfo?.name || STORE_NAME}</span>
                  )}
                </Link>
                <p className="ec-footer-tagline">
                  {storeInfo?.aboutUs ? (
                    storeInfo.aboutUs.length > 150 ? storeInfo.aboutUs.substring(0, 150) + '...' : storeInfo.aboutUs
                  ) : 'وجهتك الأولى لتسوق أفضل المنتجات بأعلى جودة وأفضل الأسعار.'}
                </p>
                <div className="ec-footer-socials">
                  {storeInfo?.facebookUrl && (
                    <a href={storeInfo.facebookUrl} target="_blank" rel="noopener noreferrer" className="ec-social-icon fb" title="فيسبوك">
                      <i className="fab fa-facebook-f"></i>
                    </a>
                  )}
                  {storeInfo?.instagramUrl && (
                    <a href={storeInfo.instagramUrl} target="_blank" rel="noopener noreferrer" className="ec-social-icon ig" title="إنستجرام">
                      <i className="fab fa-instagram"></i>
                    </a>
                  )}
                  {storeInfo?.tiktokUrl && (
                    <a href={storeInfo.tiktokUrl} target="_blank" rel="noopener noreferrer" className="ec-social-icon tt" title="تيك توك">
                      <i className="fab fa-tiktok"></i>
                    </a>
                  )}
                  {storeInfo?.whatsappNumber && (
                    <a href={`https://wa.me/${storeInfo.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="ec-social-icon wa" title="واتساب">
                      <i className="fab fa-whatsapp"></i>
                    </a>
                  )}
                </div>
              </div>

              {/* Shopping Categories */}
              <div className="ec-footer-col">
                <h4 className="ec-footer-title">تسوق حسب الفئة</h4>
                <ul className="ec-footer-links">
                  {categories && categories.length > 0 ? (
                    categories.slice(0, 6).map(cat => (
                      <li key={cat.id}>
                        <Link to={`/store/category/${cat.id}`}>{cat.name}</Link>
                      </li>
                    ))
                  ) : (
                    <>
                      <li><Link to="/store">جميع المنتجات</Link></li>
                      <li><Link to="/store">وصل حديثاً</Link></li>
                      <li><Link to="/store">الأكثر مبيعاً</Link></li>
                    </>
                  )}
                </ul>
              </div>

              {/* Quick Links */}
              <div className="ec-footer-col">
                <h4 className="ec-footer-title">روابط هامة</h4>
                <ul className="ec-footer-links">
                  <li><Link to="/store/account">حسابي</Link></li>
                  <li><Link to="/store/wishlist">المفضلة</Link></li>
                  <li><Link to="/store/privacy-policy">سياسة الخصوصية</Link></li>
                  <li><Link to="/store/terms-of-use">شروط الاستخدام</Link></li>
                  <li><span style={{ cursor: 'pointer' }} onClick={() => setTrackOpen(true)}>تتبع طلبك</span></li>
                </ul>
              </div>

              {/* Contact Column */}
              <div className="ec-footer-col">
                <h4 className="ec-footer-title">تواصل معنا</h4>
                <div className="ec-footer-contact">
                  <div className="ec-contact-item">
                    <span className="ec-contact-icon"><i className="fas fa-map-marker-alt"></i></span>
                    <span className="ec-contact-text">{storeInfo?.address || 'القاهرة، مصر'}</span>
                  </div>
                  <div className="ec-contact-item">
                    <span className="ec-contact-icon"><i className="fas fa-phone-alt"></i></span>
                    <span className="ec-contact-text">{storeInfo?.phone1 || '15254'}</span>
                  </div>
                  {storeInfo?.email && (
                    <div className="ec-contact-item">
                      <span className="ec-contact-icon"><i className="fas fa-envelope"></i></span>
                      <span className="ec-contact-text">{storeInfo.email}</span>
                    </div>
                  )}
                  <div className="ec-contact-item">
                    <span className="ec-contact-icon"><i className="fas fa-clock"></i></span>
                    <span className="ec-contact-text">السبت - الخميس: 10ص - 10م</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="ec-footer-bottom">
          <div className="ec-footer-container">
            <div className="ec-footer-bottom-inner">
              <div className="ec-copyright">
                © {new Date().getFullYear()} {storeInfo?.name || STORE_NAME}. جميع الحقوق محفوظة.
              </div>
              <div className="ec-dev-credit">
                تم التطوير بواسطة <span style={{ color: 'var(--ec-primary)', fontWeight: 700 }}>{platformName}</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* ─── MOBILE BOTTOM NAV ( Dubai Phone Style ) ─── */}
      <div className="ec-mobile-nav">
        <Link to="/store" className={`ec-mobile-nav-item ${location.pathname === '/store' ? 'active' : ''}`}>
          <div className="ec-mobile-nav-icon">
            <i className="fas fa-home"></i>
          </div>
          <span>الرئيسية</span>
        </Link>
        <button className="ec-mobile-nav-item" onClick={() => navigate('/store')}>
          <div className="ec-mobile-nav-icon">
            <i className="fas fa-th-large"></i>
          </div>
          <span>القائمة</span>
        </button>
        <a href={`https://wa.me/${storeInfo?.whatsappNumber}`} className="ec-mobile-nav-item whatsapp" target="_blank" rel="noopener noreferrer">
          <div className="ec-mobile-nav-icon">
            <i className="fab fa-whatsapp"></i>
          </div>
          <span>اسألنا</span>
        </a>
        <button className="ec-mobile-nav-item" onClick={() => setCartOpen(true)}>
          <div className="ec-mobile-nav-icon cart">
            <i className="fas fa-shopping-bag"></i>
            {cartCount > 0 && <span className="ec-mobile-cart-badge">{cartCount}</span>}
          </div>
          <span>عربة التسوق</span>
        </button>
        <button className={`ec-mobile-nav-item ${location.pathname === '/store/wishlist' ? 'active-blue' : ''}`} onClick={() => navigate('/store/wishlist')}>
          <div className="ec-mobile-nav-icon">
            <i className={location.pathname === '/store/wishlist' ? 'fas fa-heart' : 'far fa-heart'}></i>
            {wishlist?.length > 0 && <span className="ec-mobile-cart-badge" style={{ background: '#2b3481', borderColor: '#fff' }}>{wishlist.length}</span>}
          </div>
          <span>المفضلة</span>
        </button>
        {storeCustomer ? (
          <button className={`ec-mobile-nav-item ${location.pathname === '/store/account' ? 'active-blue' : ''}`} onClick={() => navigate('/store/account')}>
            <div className="ec-mobile-nav-icon">
              <i className="fas fa-user"></i>
              {offersCount > 0 && <span className="ec-mobile-cart-badge" style={{ background: '#f59e0b', borderColor: '#fff' }}>{offersCount}</span>}
            </div>
            <span>حسابي</span>
          </button>
        ) : (
          <button className="ec-mobile-nav-item" onClick={() => setLoginModalOpen(true)}>
            <div className="ec-mobile-nav-icon">
              <i className="fas fa-sign-in-alt"></i>
            </div>
            <span>دخول</span>
          </button>
        )}
      </div>

      {/* ─── FLOATING WHATSAPP BUTTON ─── */}
      {storeInfo?.whatsappNumber && (
        <a 
          href={`https://wa.me/${storeInfo.whatsappNumber}`} 
          className="ec-whatsapp-float" 
          target="_blank" 
          rel="noopener noreferrer"
          title="تواصل معنا عبر واتساب"
        >
          <i className="fab fa-whatsapp"></i>
        </a>
      )}

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
              <h3><i className="fas fa-box" style={{ marginLeft: '10px' }}></i> تتبع حالة طلبك</h3>
              <button onClick={() => { setTrackOpen(false); setTrackResult(null); setTrackNum(''); }}><i className="fas fa-times"></i></button>
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
