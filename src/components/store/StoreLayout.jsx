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

const STORE_NAME = 'Seggel Ecommerce';

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
          <div className="ec-topbar-right" style={{ flex: 1, overflow: 'hidden' }}>
            <div className="ec-topbar-ticker desktop-only" style={{ whiteSpace: 'nowrap' }}>
              <span>سعر واحد للكاش و التقسيط • سعر واحد للكاش و التقسيط • سعر واحد للكاش و التقسيط • ضمان حتي عامين من الوكيل • ضمان حتي عامين من الوكيل • توصيل سريع وأمن مع ارامكس • توصيل سريع وأمن مع ارامكس • نقاط مشتريات مجانية • نقاط مشتريات مجانية</span>
            </div>
          </div>
          <div className="ec-topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span className="ec-topbar-text" style={{ fontWeight: 'bold' }}>
              <i className="fas fa-phone-alt" style={{ marginLeft: '5px', color: '#1e3a8a', transform: 'scaleX(-1)' }}></i> 
              <span style={{ direction: 'ltr', display: 'inline-block' }}>{storeInfo?.phone1 || '15254'}</span>
            </span>
            <span className="ec-sep"></span>
            
            <a href={`https://wa.me/${storeInfo?.whatsappNumber}`} className="ec-topbar-link" style={{ fontWeight: 'bold' }} target="_blank" rel="noopener noreferrer">
              <i className="fab fa-whatsapp" style={{ color: '#25D366', marginLeft: '5px', fontSize: '1.1rem' }}></i>
              دعم من خلال الواتساب
            </a>
            <span className="ec-sep"></span>
            
            <a href="#" className="ec-topbar-link" style={{ fontWeight: 'bold' }}>أماكن الفروع</a>
            <span className="ec-sep">|</span>

            <div className="ec-lang-selector" style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <img src="https://flagcdn.com/w20/eg.png" alt="Egypt" style={{ width: '20px', height: '14px', borderRadius: '2px' }} />
              <span style={{ fontSize: '0.9rem' }}>العربية</span>
              <i className="fas fa-chevron-down" style={{ fontSize: '0.7rem' }}></i>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MAIN HEADER (Dubai Phone Style) ─── */}
      {!hideHeader && (
        <header className="ec-header-dubai">
          <div className="ec-header-dubai-inner">
            {/* Logo (Right) */}
            <div className="ec-header-logo-dubai">
              <Link to="/store">
                {storeInfo?.logoUrl ? (
                  <img src={StoreApi.getImageUrl(storeInfo.logoUrl)} alt={storeInfo.name} />
                ) : (
                  <span className="ec-logo-text-fallback">{storeInfo?.name || STORE_NAME}</span>
                )}
              </Link>
            </div>

            {/* Search (Center) */}
            <form ref={searchRef} className="ec-search-container-dubai" onSubmit={handleSearch}>
              <div className="ec-search-input-wrapper-dubai">
                <input
                  type="text"
                  className="ec-search-input-dubai"
                  placeholder="بحث المنتجات ...."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => { if(search.trim().length >= 2) setShowSuggestions(true); }}
                />
                <button type="submit" className="ec-search-submit-btn-dubai">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </button>
              </div>

              {/* Autocomplete Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="ec-search-suggestions-dropdown" style={{ top: '50px' }}>
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

            {/* Actions (Left) */}
            <div className="ec-header-actions-dubai">
              {/* Login Button (Renders to the right, closer to search bar in RTL) */}
              <button className="ec-action-btn-dubai" onClick={() => navigate(storeCustomer ? '/store/account' : '#')} onClickCapture={(e) => { if(!storeCustomer) { e.preventDefault(); setLoginModalOpen(true); } }}>
                <span className="ec-btn-icon-dubai"><i className="fas fa-user"></i></span>
                <div className="ec-action-text-dubai">
                  {storeCustomer ? (
                    <>حسابي<br/><strong>{storeCustomer.name.split(' ')[0]}</strong></>
                  ) : (
                    <>تسجيل<br/>الدخول</>
                  )}
                </div>
                {storeCustomer && offersCount > 0 && <span className="ec-badge-dubai">{offersCount}</span>}
              </button>

              {/* Cart Button (Renders to the left, closer to screen edge in RTL) */}
              <button className="ec-action-btn-dubai" onClick={() => setCartOpen(true)}>
                <span className="ec-btn-icon-dubai"><i className="fas fa-shopping-cart"></i></span>
                <div className="ec-action-text-dubai">
                  عربة التسوق <strong>({cartCount})</strong>
                </div>
              </button>
            </div>
          </div>
          {/* CATEGORY NAVBAR */}
          <div className="ec-navbar-dubai">
            <div className="ec-navbar-inner-dubai">
               <ul className="ec-nav-links-dubai">
                  {categories && categories.length > 0 ? (
                    categories.filter(cat => !cat.parentId).slice(0, 8).map(cat => {
                      const hasChildren = categories.some(child => child.parentId === cat.id);
                      return (
                        <li key={cat.id}>
                           <Link to={`/store/category/${cat.id}`}>
                             {cat.name} 
                             {hasChildren && <i className="fas fa-chevron-down" style={{fontSize: '0.6rem', marginRight: '5px'}}></i>}
                           </Link>
                        </li>
                      );
                    })
                  ) : (
                    <>
                      <li><Link to="/store">موبايلات و تابلت <i className="fas fa-chevron-down" style={{fontSize: '0.6rem', marginRight: '5px'}}></i></Link></li>
                      <li><Link to="/store">لاب توب و طابعات <i className="fas fa-chevron-down" style={{fontSize: '0.6rem', marginRight: '5px'}}></i></Link></li>
                      <li><Link to="/store">شاشات و اجهزة عرض <i className="fas fa-chevron-down" style={{fontSize: '0.6rem', marginRight: '5px'}}></i></Link></li>
                      <li><Link to="/store">العاب <i className="fas fa-chevron-down" style={{fontSize: '0.6rem', marginRight: '5px'}}></i></Link></li>
                      <li><Link to="/store">اكسسوارات <i className="fas fa-chevron-down" style={{fontSize: '0.6rem', marginRight: '5px'}}></i></Link></li>
                      <li><Link to="/store">منتجات المنزل <i className="fas fa-chevron-down" style={{fontSize: '0.6rem', marginRight: '5px'}}></i></Link></li>
                      <li><Link to="/store">الماركات <i className="fas fa-chevron-down" style={{fontSize: '0.6rem', marginRight: '5px'}}></i></Link></li>
                    </>
                  )}
               </ul>
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
