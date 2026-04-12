import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { SERVER_URL } from '../services/api';
import StoreApi, { PAGE_SIZE } from '../services/storeApi';
import { useStore } from '../context/StoreContext';
import StoreLayout from '../components/store/StoreLayout';
import ProductCard from '../components/store/ProductCard';

const EcommerceStore = () => {
  const { addToCart } = useStore();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialSearch = queryParams.get('search') || '';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [heroSections, setHeroSections] = useState([]);
  const [activeHeroIdx, setActiveHeroIdx] = useState(0);

  // Payment return from Stripe
  const paymentStatus = queryParams.get('payment');
  const paymentOrderNumber = queryParams.get('order');
  const [showPaymentBanner, setShowPaymentBanner] = useState(!!paymentStatus);

  useEffect(() => {
    if (paymentStatus) {
      // Auto-hide banner after 8 seconds and clean URL
      const timer = setTimeout(() => {
        setShowPaymentBanner(false);
        window.history.replaceState({}, '', '/store');
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [paymentStatus]);

  const observerRef = useRef(null);
  const prodScrollRef = useRef(null);
  const catScrollRef = useRef(null);

  const scrollProds = (dir) => {
    if (prodScrollRef.current) {
      const amt = 500;
      prodScrollRef.current.scrollBy({ left: dir === 'left' ? -amt : amt, behavior: 'smooth' });
    }
  };

  const scrollCategories = (dir) => {
    if (catScrollRef.current) {
      const amt = 300;
      catScrollRef.current.scrollBy({ left: dir === 'left' ? -amt : amt, behavior: 'smooth' });
    }
  };

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Handle search from URL
  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    StoreApi.getCategories().then(setCategories).catch(() => {});
    StoreApi.getHeroSections()
      .then(data => {
        if (Array.isArray(data)) setHeroSections(data);
        else setHeroSections([]);
      })
      .catch(() => setHeroSections([]));
  }, []);

  // Hero Slider Auto-play
  useEffect(() => {
    if (heroSections.length > 1) {
      const interval = setInterval(() => {
        setActiveHeroIdx(prev => (prev + 1) % heroSections.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [heroSections]);

  // Load products
  const loadProducts = useCallback(async (p, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const res = await StoreApi.getProducts(p, PAGE_SIZE, debouncedSearch, selectedCat);
      setProducts(prev => append ? [...prev, ...(res.items || [])] : (res.items || []));
      setTotalPages(res.totalPages || 1);
      setPage(res.currentPage || p);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [debouncedSearch, selectedCat]);

  useEffect(() => { loadProducts(0, false); }, [loadProducts]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loading && !loadingMore && page < totalPages - 1) {
        loadProducts(page + 1, true);
      }
    }, { threshold: 0.5 });
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [loading, loadingMore, page, totalPages, loadProducts]);

  return (
    <StoreLayout>
      {/* ─── PAYMENT RETURN BANNER ─── */}
      {showPaymentBanner && paymentStatus && (
        <div className={`ec-payment-banner ${paymentStatus}`}>
          {paymentStatus === 'success' ? (
            <span>✅ تم الدفع بنجاح! طلبك رقم <strong>{paymentOrderNumber}</strong> قيد المراجعة.</span>
          ) : (
            <span>❌ تم إلغاء عملية الدفع للطلب <strong>{paymentOrderNumber}</strong>. يمكنك المحاولة مرة أخرى.</span>
          )}
          <button className="ec-payment-banner-close" onClick={() => { setShowPaymentBanner(false); window.history.replaceState({}, '', '/store'); }}>✕</button>
        </div>
      )}

      {/* ─── HERO & CATEGORY BAR ─── */}
      {!selectedCat && !debouncedSearch && (
        <>
      {/* ─── HERO SECTION (Slider) ─── */}
      {!selectedCat && !debouncedSearch && heroSections && heroSections.length > 0 && (
        <section className="ec-hero-modern">
          <div className="ec-hero-slider">
            {heroSections.map((hero, idx) => {
              const SlideContent = (
                <div 
                  className={`ec-hero-slide ${idx === activeHeroIdx ? 'active' : ''}`}
                  style={{ backgroundImage: `url(${StoreApi.getImageUrl(hero.imageUrl)})` }}
                >
                  <div className="ec-hero-overlay">
                    {/* Text and button removed at user request */}
                  </div>
                </div>
              );

              return hero.linkUrl ? (
                <Link key={hero.id} to={hero.linkUrl} style={{ display: 'block', height: '100%' }}>
                  {SlideContent}
                </Link>
              ) : (
                <div key={hero.id} style={{ height: '100%' }}>
                  {SlideContent}
                </div>
              );
            })}
          </div>
        </section>
      )}

          <section className="ec-cat-icons-section">
            <h2 className="ec-section-title-premium">تسوق بالفئة</h2>
            <div className="ec-cat-icons-wrapper">
              <button className="ec-cat-arrow prev" onClick={() => scrollCategories('right')}>
                <span className="ec-arrow-icon">›</span>
              </button>
              
              <div className="ec-cat-icons-scroll" ref={catScrollRef}>
                {categories.map(cat => (
                  <button 
                    key={cat.id} 
                    className={`ec-cat-icon-item ${selectedCat === cat.id ? 'active' : ''}`}
                    onClick={() => setSelectedCat(cat.id)}
                  >
                    <div className="ec-cat-icon-circle-premium">
                      {cat.imageUrl ? (
                        <img src={`${SERVER_URL}${cat.imageUrl}`} alt={cat.name} />
                      ) : (
                        <span className="ec-cat-fallback">📁</span>
                      )}
                    </div>
                    <span className="ec-cat-name-premium">{cat.name}</span>
                  </button>
                ))}
              </div>

              <button className="ec-cat-arrow next" onClick={() => scrollCategories('left')}>
                <span className="ec-arrow-icon">‹</span>
              </button>
            </div>
          </section>
        </>
      )}



      {/* ─── PRODUCTS SECTION ─── */}
      <section className="ec-products-section">
        {selectedCat && categories.find(c => c.id === selectedCat)?.imageUrl && (
          <div className="ec-category-banner">
            <img src={`${SERVER_URL}${categories.find(c => c.id === selectedCat).imageUrl}`} alt="" />
            <div className="ec-category-banner-overlay">
              <h2>{categories.find(c => c.id === selectedCat).name}</h2>
            </div>
          </div>
        )}
        
        <div className="ec-section-header">
          <div className="ec-section-line" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {selectedCat && categories.find(c => c.id === selectedCat)?.imageUrl && (
              <img src={`${SERVER_URL}${categories.find(c => c.id === selectedCat).imageUrl}`} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
            )}
            <h2>{selectedCat ? categories.find(c => c.id === selectedCat)?.name || 'المنتجات' : debouncedSearch ? `نتائج البحث عن: ${debouncedSearch}` : 'جميع المنتجات'}</h2>
          </div>
          <div className="ec-section-line" />
        </div>

        {loading ? (
          <div className="ec-loading">
            <div className="ec-spinner" />
            <p>جاري تحميل المنتجات...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="ec-empty">
            <span style={{ fontSize: '3rem' }}>📦</span>
            <p>لا توجد منتجات</p>
          </div>
        ) : (
          <div className="ec-products-carousel-outer">
            <button className="ec-carousel-nav prev" onClick={() => scrollProds('right')}><span>›</span></button>
            <div className="ec-products-carousel-scroll" ref={prodScrollRef}>
              {products.map(p => (
                <div key={p.id} className="ec-product-carousel-item">
                  <ProductCard product={p} onAddToCart={addToCart} />
                </div>
              ))}
              <div ref={observerRef} className="ec-observer-item">
                {loadingMore && <div className="ec-spinner small" />}
              </div>
            </div>
            <button className="ec-carousel-nav next" onClick={() => scrollProds('left')}><span>‹</span></button>
          </div>
        )}
      </section>
    </StoreLayout>
  );
};

export default EcommerceStore;
