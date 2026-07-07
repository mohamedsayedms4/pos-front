import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import StoreApi, { PAGE_SIZE } from '../services/storeApi';
import { useStore } from '../context/StoreContext';
import StoreLayout from '../components/store/StoreLayout';
import ProductCard from '../components/store/ProductCard';

const CategoryRow = ({ category }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    StoreApi.getProducts(0, 12, '', category.id)
      .then(res => setProducts(res.items || []))
      .finally(() => setLoading(false));
  }, [category.id]);

  if (!loading && products.length === 0) return null;

  return (
    <div className="amz-scroller-section">
      <div className="amz-scroller-header">
        {category.name} <Link to={`/store/category/${category.id}`} style={{fontSize:'0.85rem', color: 'var(--amz-link)', textDecoration: 'none', marginRight: '10px'}}>تسوق الآن</Link>
      </div>

      <div className="amz-scroller-container" ref={scrollRef}>
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="amz-scroller-item">
              <div className="ec-skeleton" style={{ height: '200px', width: '200px', borderRadius: '0' }} />
            </div>
          ))
        ) : (
          products.map(p => (
            <Link key={p.id} to={`/store/product/${p.id}`} className="amz-scroller-item">
              <img 
                src={(p.imageUrls && p.imageUrls.length > 0) 
                  ? StoreApi.getImageUrl(p.imageUrls[0]) 
                  : (p.image ? StoreApi.getImageUrl(p.image) 
                  : (p.imageUrl ? StoreApi.getImageUrl(p.imageUrl) 
                  : '/placeholder.png'))} 
                alt={p.name} 
              />
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

const EcommerceStore = () => {
  // ─── Consume SHARED data from Context — do NOT re-fetch here ───────────
  const { addToCart, storeInfo, categories, categoriesLoaded } = useStore();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialSearch = queryParams.get('search') || '';

  const [products, setProducts] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [heroSections, setHeroSections] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(1);
  const [disableTransition, setDisableTransition] = useState(false);

  // Interactive Slider State
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const hasDraggedRef = useRef(false);

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

  // Sync search from URL when location changes (e.g., after navigating back)
  useEffect(() => {
    const searchFromUrl = new URLSearchParams(location.search).get('search') || '';
    setSearch(searchFromUrl);
    setDebouncedSearch(searchFromUrl);
  }, [location.search]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch hero sections once on mount
  useEffect(() => {
    StoreApi.getHeroSections()
      .then(data => {
        if (Array.isArray(data)) {
          setHeroSections(data);
          setCurrentIndex(1);
        } else {
          setHeroSections([]);
        }
      })
      .catch(() => setHeroSections([]));
  }, []);

  useEffect(() => {
    if (disableTransition) {
      const timer = setTimeout(() => {
        setDisableTransition(false);
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [disableTransition]);

  const nextSlide = useCallback(() => {
    if (heroSections.length <= 1) return;
    setDisableTransition(false);
    setCurrentIndex(prev => prev + 1);
  }, [heroSections.length]);

  const prevSlide = useCallback(() => {
    if (heroSections.length <= 1) return;
    setDisableTransition(false);
    setCurrentIndex(prev => prev - 1);
  }, [heroSections.length]);

  // Autoplay effect
  useEffect(() => {
    if (heroSections.length <= 1 || isDragging) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(interval);
  }, [heroSections.length, nextSlide, currentIndex, isDragging]);

  const handleDragStart = (e) => {
    setIsDragging(true);
    setDisableTransition(false);
    hasDraggedRef.current = false;
    const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    setStartX(clientX);
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    const diff = clientX - startX;
    setDragOffset(diff);
    if (Math.abs(diff) > 15) {
      hasDraggedRef.current = true;
    }
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const threshold = 100;
    if (dragOffset < -threshold) {
      nextSlide();
    } else if (dragOffset > threshold) {
      prevSlide();
    }
    setDragOffset(0);
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 50);
  };

  const handleTransitionEnd = () => {
    const N = heroSections.length;
    if (currentIndex === 0) {
      setDisableTransition(true);
      setCurrentIndex(N);
    } else if (currentIndex === N + 1) {
      setDisableTransition(true);
      setCurrentIndex(1);
    }
  };

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

  // Reset products when switching to "home" view
  useEffect(() => {
    if (!selectedCat && !debouncedSearch) {
      setProducts([]);
      setPage(0);
    }
  }, [selectedCat, debouncedSearch]);

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

      {!selectedCat && !debouncedSearch ? (
        <div className="amz-home-container">
          {heroSections && heroSections.length > 0 && (() => {
            const hasMultiple = heroSections.length > 1;
            const slides = hasMultiple
              ? [heroSections[heroSections.length - 1], ...heroSections, heroSections[0]]
              : heroSections;
            const activeDotIdx = hasMultiple ? (currentIndex - 1 + heroSections.length) % heroSections.length : 0;

            return (
              <section className="amz-hero-carousel">
                <div
                  className="ec-hero-slider-dubai amz-hero-slider"
                  onMouseDown={hasMultiple ? handleDragStart : undefined}
                  onMouseMove={hasMultiple ? handleDragMove : undefined}
                  onMouseUp={hasMultiple ? handleDragEnd : undefined}
                  onMouseLeave={hasMultiple ? handleDragEnd : undefined}
                  onTouchStart={hasMultiple ? handleDragStart : undefined}
                  onTouchMove={hasMultiple ? handleDragMove : undefined}
                  onTouchEnd={hasMultiple ? handleDragEnd : undefined}
                  style={{ cursor: hasMultiple ? (isDragging ? 'grabbing' : 'grab') : 'default', direction: 'ltr' }}
                >
                  <div
                    className="ec-hero-slider-track-dubai"
                    onTransitionEnd={hasMultiple ? handleTransitionEnd : undefined}
                    style={{
                      transform: `translateX(calc(-${(hasMultiple ? currentIndex : 0) * 100}% + ${dragOffset}px))`,
                      transition: (isDragging || disableTransition) ? 'none' : 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
                      direction: 'ltr', height: '100%'
                    }}
                  >
                    {slides.map((hero, idx) => {
                      const SlideContent = (
                        <img 
                          className="amz-hero-image"
                          src={StoreApi.getImageUrl(hero.imageUrl)}
                          alt={hero.title || 'hero'}
                          style={{height: '100%'}}
                        />
                      );
                      const key = `${hero.id}-${idx}`;
                      return hero.linkUrl ? (
                        <Link key={key} to={hero.linkUrl} style={{ display: 'block', height: '100%', width: '100%', flexShrink: 0 }} draggable="false" onClick={(e) => { if (hasDraggedRef.current) e.preventDefault(); }}>
                          {SlideContent}
                        </Link>
                      ) : (
                        <div key={key} style={{ height: '100%', width: '100%', flexShrink: 0 }}>
                          {SlideContent}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })()}

          {/* Cards Grid */}
          <div className="amz-cards-grid">
            {categoriesLoaded && categories.filter(c => !c.parentId).slice(0, 4).map(cat => (
              <div key={cat.id} className="amz-category-card">
                <h2>{cat.name}</h2>
                <Link to={`/store/category/${cat.id}`}>
                  {cat.imageUrl ? (
                    <img src={StoreApi.getImageUrl(cat.imageUrl)} alt={cat.name} className="amz-card-image" />
                  ) : (
                    <div className="amz-card-image" style={{backgroundColor: '#f3f3f3', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      <i className="fas fa-box" style={{fontSize: '4rem', color: '#ccc'}}></i>
                    </div>
                  )}
                </Link>
                <Link to={`/store/category/${cat.id}`} className="amz-card-link">تسوق الآن</Link>
              </div>
            ))}
          </div>

          {/* Scroller Rows */}
          {categoriesLoaded && categories.filter(c => !c.parentId).slice(0, 5).map(cat => (
            <CategoryRow key={cat.id} category={cat} />
          ))}
        </div>
      ) : (
        <section className="ec-products-section" style={{padding: '20px'}}>
          <div className="ec-section-header">
            <h2>{selectedCat ? categories.find(c => c.id === selectedCat)?.name : debouncedSearch ? `نتائج البحث عن: ${debouncedSearch}` : 'المنتجات'}</h2>
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
            <div className="ec-products-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px'}}>
              {products.map(p => (
                <ProductCard key={p.id} product={p} onAddToCart={addToCart} />
              ))}
              <div ref={observerRef} className="ec-observer-item" style={{gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', padding: '20px'}}>
                {loadingMore && <div className="ec-spinner small" />}
              </div>
            </div>
          )}
        </section>
      )}
    </StoreLayout>
  );
};

export default EcommerceStore;
