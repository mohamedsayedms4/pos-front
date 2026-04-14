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

  const platformName = storeInfo?.name || STORE_NAME;

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
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
                    </a>
                  )}
                  {storeInfo?.instagramUrl && (
                    <a href={storeInfo.instagramUrl} target="_blank" rel="noopener noreferrer" className="ec-social-icon ig" title="إنستجرام">
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.332 3.608 1.308.975.975 1.245 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.063 1.366-.333 2.633-1.308 3.608-.975.975-2.242 1.245-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.063-2.633-.333-3.608-1.308-.975-.975-1.245-2.242-1.308-3.608-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.062-1.366.332-2.633 1.308-3.608.975-.975 2.242-1.245 3.608-1.308 1.266-.058 1.646-.07 4.85-.07zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.28.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                    </a>
                  )}
                  {storeInfo?.tiktokUrl && (
                    <a href={storeInfo.tiktokUrl} target="_blank" rel="noopener noreferrer" className="ec-social-icon tt" title="تيك توك">
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.032 2.623-.02 3.935-.002.08 3.477 2.067 5.753 5.435 6.32v3.918c-2.427-.01-4.14-.73-5.362-2.31 0 1.933.012 3.865-.002 5.798-.052 5.093-4.185 8.336-9.117 8.256-4.93-.08-8.665-4.155-8.31-9.19.344-4.885 4.01-7.85 8.712-7.848.33 0 .66.033.987.098V9.11c-1.464-.326-3.085-.148-4.12 1.083-1.035 1.23-1.04 3.104-.263 4.417.777 1.313 2.378 1.983 3.86 1.637 1.482-.345 2.162-1.644 2.24-3.136.035-2.607.012-10.158.012-10.158z"/></svg>
                    </a>
                  )}
                  {storeInfo?.whatsappNumber && (
                    <a href={`https://wa.me/${storeInfo.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="ec-social-icon wa" title="واتساب">
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c0-5.445 4.446-9.891 9.891-9.891 2.638 0 5.12 1.026 6.99 2.898a9.825 9.825 0 012.893 6.994c0 5.446-4.446 9.892-9.891 9.892m12.428-12.788C24.473 5.372 21.045 1.944 16.795.019c-4.25-1.925-9.156-1.925-13.406 0C-1.386 1.944-4.814 5.372-5.739 9.622c.925 4.251 4.353 7.679 8.604 9.604 4.25 1.925 9.156 1.925 13.406 0 6.255-2.834 11.236-9.96 11.229-12.914"/></svg>
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
                    <span className="ec-contact-icon">📍</span>
                    <span className="ec-contact-text">{storeInfo?.address || 'القاهرة، مصر'}</span>
                  </div>
                  <div className="ec-contact-item">
                    <span className="ec-contact-icon">📞</span>
                    <span className="ec-contact-text">{storeInfo?.phone1 || '15254'}</span>
                  </div>
                  {storeInfo?.email && (
                    <div className="ec-contact-item">
                      <span className="ec-contact-icon">📧</span>
                      <span className="ec-contact-text">{storeInfo.email}</span>
                    </div>
                  )}
                  <div className="ec-contact-item">
                    <span className="ec-contact-icon">⏰</span>
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
