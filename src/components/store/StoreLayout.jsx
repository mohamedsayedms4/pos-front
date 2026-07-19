import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import StoreApi from '../../services/storeApi';
import CartDrawer from './CartDrawer';
import CheckoutModal from './CheckoutModal';
import StoreLoginModal from './StoreLoginModal';
import { useStoreAuth } from '../../context/StoreAuthContext';
import '../../styles/ecommerce.css';
import '../../pages/AmazonStore.css';
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

  React.useEffect(() => {
    document.body.classList.add('store-active');
    return () => document.body.classList.remove('store-active');
  }, []);

  return (
    <div className="ec-store">
      {/* ─── AMAZON STYLE HEADER ─── */}
      {!hideHeader && (
        <header className="amz-header">
          <div className="amz-header-top">
            <Link to="/store" className="amz-logo-link">
              <span className="amz-logo-text">{storeInfo?.name || STORE_NAME}</span>
              <span className="amz-logo-eg">.eg</span>
            </Link>
            
            <div className="amz-nav-location desktop-only">
              <i className="fas fa-map-marker-alt"></i>
              <div className="amz-nav-loc-text">
                <span className="amz-nav-loc-line1">التوصيل إلى</span>
                <span className="amz-nav-loc-line2">مصر</span>
              </div>
            </div>

            <form ref={searchRef} className="amz-search-bar" onSubmit={handleSearch}>
              <select className="amz-search-dropdown desktop-only">
                <option value="all">الكل</option>
                {categories && categories.slice(0, 5).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input
                type="text"
                className="amz-search-input"
                placeholder="البحث في المتجر"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
                onFocus={() => { if(search.trim().length >= 2) setShowSuggestions(true); }}
              />
              <button type="submit" className="amz-search-btn" aria-label="بحث">
                <i className="fas fa-search"></i>
              </button>
              
              {/* Autocomplete Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="ec-search-suggestions-dropdown" style={{ top: '45px', left: 0, width: '100%', borderRadius: 'var(--amz-radius)' }}>
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
                  <div className="ec-search-suggestion-footer" onClick={handleSearch}>
                    عرض كل النتائج لـ "{search}"
                  </div>
                </div>
              )}
            </form>

            <div className="amz-nav-actions">
               <div className="amz-nav-action-item desktop-only" onClick={() => navigate(storeCustomer ? '/store/account' : '#')} onClickCapture={(e) => { if(!storeCustomer) { e.preventDefault(); setLoginModalOpen(true); } }}>
                 <span className="amz-nav-line1">مرحباً{storeCustomer ? ` ${storeCustomer.name.split(' ')[0]}` : '، تسجيل الدخول'}</span>
                 <span className="amz-nav-line2">الحساب والقوائم <i className="fas fa-caret-down"></i></span>
               </div>
               <div className="amz-nav-action-item desktop-only" onClick={() => setTrackOpen(true)}>
                 <span className="amz-nav-line1">المرتجعات</span>
                 <span className="amz-nav-line2">والطلبات</span>
               </div>
               <div className="amz-cart-container" onClick={() => setCartOpen(true)}>
                 <div className="amz-cart-icon">
                   <i className="fas fa-shopping-cart" style={{fontSize: '2rem'}}></i>
                   <span className="amz-cart-count">{cartCount}</span>
                 </div>
                 <span className="amz-cart-text desktop-only">عربة التسوق</span>
               </div>
            </div>
          </div>

          <div className="amz-header-bottom">
            <Link to="/store" className="amz-subnav-item amz-menu-btn"><i className="fas fa-bars"></i> الكل</Link>
            <Link to="/store" className="amz-subnav-item">عروض اليوم</Link>
            <Link to="/store" className="amz-subnav-item">خدمة العملاء</Link>
            {storeCustomer && <Link to="/store/wishlist" className="amz-subnav-item">قوائمك</Link>}
            {categories && categories.slice(0, 5).map(cat => (
              <Link key={cat.id} to={`/store/category/${cat.id}`} className="amz-subnav-item">{cat.name}</Link>
            ))}
          </div>
        </header>
      )}


      {/* ─── MAIN CONTENT ─── */}
      <main className="ec-main">
        {children}
      </main>

      {/* ─── PREMIUM FOOTER ─── */}
      <footer className="ec-footer-premium" style={{background: 'var(--amz-navy-light)'}}>
        <div className="amz-footer-back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          العودة إلى الأعلى
        </div>
        <div className="amz-footer-main">
          <div className="amz-footer-col">
            <h3>تعرف علينا</h3>
            <Link to="/store">عن {storeInfo?.name || STORE_NAME}</Link>
            <Link to="/store">وظائف</Link>
            <Link to="/store">البيانات الصحفية</Link>
          </div>
          <div className="amz-footer-col">
            <h3>تسوق معنا</h3>
            <Link to="/store/account">حسابك</Link>
            <Link to="/store/account">طلباتك</Link>
            <Link to="/store/account">عناوينك</Link>
            <Link to="/store/wishlist">قوائمك</Link>
          </div>
          <div className="amz-footer-col">
            <h3>دعنا نساعدك</h3>
            <Link to="/store">سياسة الإرجاع</Link>
            <Link to="/store/privacy-policy">الخصوصية</Link>
            <Link to="/store/terms-of-use">شروط الاستخدام</Link>
            {storeInfo?.whatsappNumber && (
              <a href={`https://wa.me/${storeInfo.whatsappNumber}`} target="_blank" rel="noopener noreferrer">تواصل معنا عبر واتساب</a>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="ec-footer-bottom" style={{background: 'var(--amz-navy)', borderTop: '1px solid #333'}}>
          <div className="ec-footer-container">
            <div className="ec-footer-bottom-inner" style={{display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center'}}>
              <div className="ec-copyright">
                <i className="fa-regular fa-copyright"></i> {new Date().getFullYear()} {storeInfo?.name || STORE_NAME}. جميع الحقوق محفوظة.
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
