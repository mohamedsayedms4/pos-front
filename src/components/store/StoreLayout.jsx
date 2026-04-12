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
    categories
  } = useStore();

  const { storeCustomer, storeLogout } = useStoreAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [search, setSearch] = useState(new URLSearchParams(location.search).get('search') || '');
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

  const handleSearch = (e) => {
    e.preventDefault();
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
            <form className="ec-search-container-premium" onSubmit={handleSearch}>
              <div className="ec-search-input-wrapper">
                <input 
                  type="text" 
                  className="ec-search-input"
                  placeholder="بحث عن المنتجات ..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
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
                  🔍
                </button>
              </div>
            </form>

            {/* Actions (Left side) */}
            <div className="ec-header-left">
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
          <div className="ec-mobile-nav-icon">🏠</div>
          <span>الرئيسية</span>
        </Link>
        <button className="ec-mobile-nav-item" onClick={() => navigate('/store')}>
          <div className="ec-mobile-nav-icon">🛍️</div>
          <span>القائمة</span>
        </button>
        <a href={`https://wa.me/${storeInfo?.whatsappNumber}`} className="ec-mobile-nav-item whatsapp">
          <div className="ec-mobile-nav-icon">💬</div>
          <span>اسألنا</span>
        </a>
        <button className="ec-mobile-nav-item" onClick={() => setCartOpen(true)}>
          <div className="ec-mobile-nav-icon cart">
             🛒
             {cartCount > 0 && <span className="ec-mobile-cart-badge">{cartCount}</span>}
          </div>
          <span>عربة التسوق</span>
        </button>
        {storeCustomer ? (
          <button className="ec-mobile-nav-item" onClick={() => navigate('/store/account')}>
            <div className="ec-mobile-nav-icon">👤</div>
            <span>حسابي</span>
          </button>
        ) : (
          <button className="ec-mobile-nav-item" onClick={() => setLoginModalOpen(true)}>
            <div className="ec-mobile-nav-icon">👤</div>
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
