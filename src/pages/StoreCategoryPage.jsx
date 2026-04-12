import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SERVER_URL } from '../services/api';
import StoreApi, { PAGE_SIZE } from '../services/storeApi';
import { useStore } from '../context/StoreContext';
import StoreLayout from '../components/store/StoreLayout';
import ProductCard from '../components/store/ProductCard';

const StoreCategoryPage = () => {
  const { id } = useParams();
  const { addToCart } = useStore();

  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const observerRef = useRef(null);

  const loadData = useCallback(async (p, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      if (!append) {
        // Find category info
        const cats = await StoreApi.getCategories();
        const current = cats.find(c => String(c.id) === String(id));
        setCategory(current);
      }

      const res = await StoreApi.getProducts(p, PAGE_SIZE, '', id);
      setProducts(prev => append ? [...prev, ...(res.items || [])] : (res.items || []));
      setTotalPages(res.totalPages || 1);
      setPage(res.currentPage || p);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [id]);

  useEffect(() => {
    loadData(0, false);
    window.scrollTo(0, 0);
  }, [loadData]);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loading && !loadingMore && page < totalPages - 1) {
        loadData(page + 1, true);
      }
    }, { threshold: 0.5 });
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [loading, loadingMore, page, totalPages, loadData]);

  if (loading && products.length === 0) return (
    <StoreLayout>
      <div className="ec-loading" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="ec-spinner" />
        <p>جاري تحميل منتجات القسم...</p>
      </div>
    </StoreLayout>
  );

  return (
    <StoreLayout>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '30px 20px' }}>
        {/* Breadcrumb */}
        <nav style={{ marginBottom: '30px', fontSize: '.85rem', color: '#888' }}>
          <Link to="/store" style={{ color: '#888', textDecoration: 'none' }}>المتجر</Link>
          <span style={{ margin: '0 10px' }}>/</span>
          <span style={{ color: '#333', fontWeight: 'bold' }}>{category?.name || 'القسم'}</span>
        </nav>

        {/* Banner */}
        {category?.imageUrl && (
          <div className="ec-category-banner" style={{ height: '240px' }}>
            <img src={`${SERVER_URL}${category.imageUrl}`} alt="" />
            <div className="ec-category-banner-overlay" style={{ padding: '40px' }}>
              <h2 style={{ fontSize: '3rem' }}>{category.name}</h2>
              {category.description && <p style={{ color: 'rgba(255,255,255,.8)', marginTop: '10px' }}>{category.description}</p>}
            </div>
          </div>
        )}

        <div className="ec-section-header" style={{ marginTop: '40px' }}>
          <div className="ec-section-line" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {category?.imageUrl && (
              <img src={`${SERVER_URL}${category.imageUrl}`} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
            )}
            <h2>تصفح منتجات {category?.name || 'القسم'}</h2>
          </div>
          <div className="ec-section-line" />
        </div>

        {products.length === 0 ? (
          <div className="ec-empty" style={{ minHeight: '30vh' }}>
            <span style={{ fontSize: '3rem' }}>📦</span>
            <p>لا توجد منتجات في هذا القسم حالياً</p>
            <Link to="/store" className="ec-btn ec-btn-ghost" style={{ marginTop: '20px', display: 'inline-block', textDecoration: 'none' }}>تصفح منتجات أخرى</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '25px' }}>
            {products.map(p => (
              <ProductCard key={p.id} product={p} onAddToCart={addToCart} />
            ))}
          </div>
        )}

        <div ref={observerRef} style={{ height: 60, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {loadingMore && <div className="ec-spinner small" />}
        </div>
      </div>
    </StoreLayout>
  );
};

export default StoreCategoryPage;
