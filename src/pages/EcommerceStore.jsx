import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { SERVER_URL } from '../services/api';
import StoreApi, { PAGE_SIZE } from '../services/storeApi';
import { useStore } from '../context/StoreContext';
import StoreLayout from '../components/store/StoreLayout';
import ProductCard from '../components/store/ProductCard';

const CategoryRow = ({ category, addToCart, onSeeAll, currency }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    StoreApi.getProducts(0, 12, '', category.id)
      .then(res => setProducts(res.items || []))
      .finally(() => setLoading(false));
  }, [category.id]);

  const scroll = (dir) => {
    if (scrollRef.current) {
      const amt = 500;
      scrollRef.current.scrollBy({ left: dir === 'left' ? -amt : amt, behavior: 'smooth' });
    }
  };

  if (!loading && products.length === 0) return null;

  return (
    <div className="ec-category-row-section ec-animate-in">
      <div className="ec-category-row-header">
        <h3>{category.name}</h3>
        <button onClick={() => onSeeAll(category.id)} className="ec-see-all-btn">
          عرض الكل <i className="fas fa-arrow-left" style={{ marginRight: '5px', fontSize: '0.8rem' }}></i>
        </button>
      </div>

      <div className="ec-row-carousel-container">
        <button className="ec-row-nav-btn prev" onClick={() => scroll('right')}><i className="fas fa-chevron-right"></i></button>
        <div className="ec-row-carousel-scroll" ref={scrollRef}>
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="ec-row-product-item">
                <div className="ec-skeleton" style={{ height: '300px', borderRadius: '20px' }} />
              </div>
            ))
          ) : (
            products.map(p => (
              <div key={p.id} className="ec-row-product-item">
                <ProductCard product={p} onAddToCart={addToCart} />
              </div>
            ))
          )}
        </div>
        <button className="ec-row-nav-btn next" onClick={() => scroll('left')}><i className="fas fa-chevron-left"></i></button>
      </div>
    </div>
  );
};

const EcommerceStore = () => {
  const { addToCart, storeInfo } = useStore();
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

  const currency = storeInfo?.currency || 'جنيه';

  // Payment return from Stripe
  const paymentStatus = queryParams.get('payment');
  const paymentOrderNumber = queryParams.get('order');
  const [showPaymentBanner, setShowPaymentBanner] = useState(!!paymentStatus);

  useEffect(() => {
    if (paymentStatus) {
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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    StoreApi.getCategories().then(setCategories).catch(() => { });
    StoreApi.getHeroSections()
      .then(data => {
        if (Array.isArray(data)) setHeroSections(data);
        else setHeroSections([]);
      })
      .catch(() => setHeroSections([]));
  }, []);

  useEffect(() => {
    if (heroSections.length > 1) {
      const interval = setInterval(() => {
        setActiveHeroIdx(prev => (prev + 1) % heroSections.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [heroSections]);

  const loadProducts = useCallback(async (p, append = false) => {
    if (!selectedCat && !debouncedSearch) return; // Don't load main grid if showing sections

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

  useEffect(() => {
    if (!selectedCat && !debouncedSearch) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loading && !loadingMore && page < totalPages - 1) {
        loadProducts(page + 1, true);
      }
    }, { threshold: 0.5 });
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [loading, loadingMore, page, totalPages, loadProducts, selectedCat, debouncedSearch]);

  const isMainHome = !selectedCat && !debouncedSearch;

  return (
    <StoreLayout>
      {showPaymentBanner && paymentStatus && (
        <div className={`ec-payment-banner ${paymentStatus}`}>
          {paymentStatus === 'success' ? (
            <span><i className="fas fa-check-circle" style={{ marginLeft: '8px' }}></i> تم الدفع بنجاح! طلبك رقم <strong>{paymentOrderNumber}</strong> قيد المراجعة.</span>
          ) : (
            <span><i className="fas fa-times-circle" style={{ marginLeft: '8px' }}></i> تم إلغاء عملية الدفع للطلب <strong>{paymentOrderNumber}</strong>. يمكنك المحاولة مرة أخرى.</span>
          )}
          <button className="ec-payment-banner-close" onClick={() => { setShowPaymentBanner(false); window.history.replaceState({}, '', '/store'); }}><i className="fas fa-times"></i></button>
        </div>
      )}

      {!selectedCat && !debouncedSearch && (
        <>
          {heroSections && heroSections.length > 0 && (
            <section className="ec-hero-modern">
              <div className="ec-hero-slider">
                {heroSections.map((hero, idx) => {
                  const SlideContent = (
                    <div
                      className={`ec-hero-slide ${idx === activeHeroIdx ? 'active' : ''}`}
                      style={{ backgroundImage: `url(${StoreApi.getImageUrl(hero.imageUrl)})` }}
                    >
                      <div className="ec-hero-overlay">
                        <div className="ec-hero-content">
                          <h1>{hero.title}</h1>
                          <p>{hero.subtitle}</p>
                        </div>
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
                <span className="ec-arrow-icon"><i className="fas fa-chevron-right"></i></span>
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
                        <span className="ec-cat-fallback"><i className="fas fa-folder"></i></span>
                      )}
                    </div>
                    <span className="ec-cat-name-premium">{cat.name}</span>
                  </button>
                ))}
              </div>
              <button className="ec-cat-arrow next" onClick={() => scrollCategories('left')}>
                <span className="ec-arrow-icon"><i className="fas fa-chevron-left"></i></span>
              </button>
            </div>
          </section>
        </>
      )}

      <section className="ec-products-section">
        {isMainHome ? (
          <div className="ec-home-sections">
            {categories.slice(0, 6).map(cat => (
              <CategoryRow 
                key={cat.id} 
                category={cat} 
                addToCart={addToCart} 
                onSeeAll={setSelectedCat}
                currency={currency}
              />
            ))}
          </div>
        ) : (
          <>
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
                <span style={{ fontSize: '3rem', color: '#e2e8f0' }}><i className="fas fa-box-open"></i></span>
                <p>لا توجد منتجات</p>
              </div>
            ) : (
              <div className="ec-products-carousel-outer">
                <button className="ec-carousel-nav prev" onClick={() => scrollProds('right')}><i className="fas fa-chevron-right"></i></button>
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
                <button className="ec-carousel-nav next" onClick={() => scrollProds('left')}><i className="fas fa-chevron-left"></i></button>
              </div>
            )}
          </>
        )}
      </section>
    </StoreLayout>
  );
};

export default EcommerceStore;
