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
        if (Array.isArray(data)) {
          setHeroSections(data);
          setCurrentIndex(1);
        }
        else setHeroSections([]);
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
          {heroSections && heroSections.length > 0 && (() => {
            const hasMultiple = heroSections.length > 1;
            const slides = hasMultiple
              ? [heroSections[heroSections.length - 1], ...heroSections, heroSections[0]]
              : heroSections;
            const activeDotIdx = hasMultiple ? (currentIndex - 1 + heroSections.length) % heroSections.length : 0;

            return (
              <section className="ec-hero-dubai">
                <div 
                  className="ec-hero-slider-dubai"
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
                      direction: 'ltr'
                    }}
                  >
                    {slides.map((hero, idx) => {
                      const SlideContent = (
                        <div
                          className="ec-hero-slide-dubai"
                          style={{ backgroundImage: `url(${StoreApi.getImageUrl(hero.imageUrl)})` }}
                        >
                          <div className="ec-hero-overlay-dubai" style={{ direction: 'rtl' }}>
                            <div className="ec-hero-content-dubai">
                              {hero.title && <h1>{hero.title}</h1>}
                              {hero.subtitle && <p>{hero.subtitle}</p>}
                            </div>
                          </div>
                        </div>
                      );

                      const key = `${hero.id}-${idx}`;

                      return hero.linkUrl ? (
                        <Link 
                          key={key} 
                          to={hero.linkUrl} 
                          style={{ display: 'block', height: '100%' }}
                          draggable="false"
                          onClick={(e) => {
                            if (hasDraggedRef.current) {
                              e.preventDefault();
                            }
                          }}
                        >
                          {SlideContent}
                        </Link>
                      ) : (
                        <div key={key} style={{ height: '100%' }}>
                          {SlideContent}
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Dots */}
                  {hasMultiple && (
                    <div className="ec-slider-dots-dubai">
                      {heroSections.map((_, idx) => (
                        <button
                          key={idx}
                          className={`ec-slider-dot ${idx === activeDotIdx ? 'active' : ''}`}
                          onClick={(e) => { e.stopPropagation(); setDisableTransition(false); setCurrentIndex(idx + 1); }}
                          aria-label={`Go to slide ${idx + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            );
          })()}

          {/* Category Icons Section */}
          {categories && categories.length > 0 && (
            <section className="ec-cat-icons-section" style={{ padding: '0 28px', marginTop: '20px' }}>
              <div className="ec-category-section-title" style={{ textAlign: 'right', marginBottom: '15px' }}>
                <h2 style={{ fontSize: '1.45rem', fontWeight: '800', color: '#000', margin: 0 }}>تسوق بالفئة</h2>
              </div>
              <div className="ec-cat-icons-wrapper">
                <div className="ec-cat-icons-scroll" ref={catScrollRef}>
                  {categories.filter(cat => !cat.parentId).map(cat => (
                    <button 
                      key={cat.id} 
                      className="ec-cat-icon-item"
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
              </div>
            </section>
          )}
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
