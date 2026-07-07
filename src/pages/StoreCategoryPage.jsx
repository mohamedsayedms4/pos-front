import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SERVER_URL } from '../services/api';
import StoreApi, { PAGE_SIZE } from '../services/storeApi';
import { useStore } from '../context/StoreContext';
import StoreLayout from '../components/store/StoreLayout';
import ProductCard from '../components/store/ProductCard';

const StoreCategoryPage = () => {
  const { id } = useParams();
  const { addToCart, categories } = useStore();

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
      <div style={{ maxWidth: '1500px', margin: '0 auto', padding: '20px', display: 'flex', gap: '20px' }}>
        
        {/* Sidebar */}
        <aside style={{ width: '220px', flexShrink: 0 }} className="desktop-only">
          <div style={{ padding: '0 10px', position: 'sticky', top: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '10px' }}>الأقسام</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>
                <Link to="/store" style={{ color: '#0F1111', textDecoration: 'none', fontSize: '0.9rem' }}>
                  <i className="fas fa-chevron-right" style={{ fontSize: '0.7rem', marginLeft: '5px' }}></i>
                  جميع الأقسام
                </Link>
              </li>
              {categories && categories.filter(c => !c.parentId).map(c => (
                <li key={c.id}>
                  <Link 
                    to={`/store/category/${c.id}`} 
                    style={{ 
                      color: String(c.id) === String(id) ? '#e47911' : '#0F1111', 
                      fontWeight: String(c.id) === String(id) ? 'bold' : 'normal',
                      textDecoration: 'none', 
                      fontSize: '0.9rem' 
                    }}
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Main Content */}
        <div style={{ flex: 1 }}>
          {/* Breadcrumb */}
          <nav style={{ marginBottom: '10px', fontSize: '0.85rem', color: '#565959' }}>
            <Link to="/store" style={{ color: '#565959', textDecoration: 'none' }}>المتجر</Link>
            <span style={{ margin: '0 10px' }}>/</span>
            <span style={{ color: '#0F1111', fontWeight: 'bold' }}>{category?.name || 'القسم'}</span>
          </nav>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 500, margin: '10px 0 20px 0' }}>{category?.name}</h2>

          {/* Banner */}
          {category?.imageUrl && (
            <div style={{ height: '240px', marginBottom: '20px', borderRadius: 'var(--amz-radius)', overflow: 'hidden', position: 'relative' }}>
              <img src={StoreApi.getImageUrl(category.imageUrl)} alt={category.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}

          {products.length === 0 ? (
            <div className="ec-empty" style={{ minHeight: '30vh' }}>
              <span style={{ fontSize: '3rem', color: '#e2e8f0' }}><i className="fas fa-box-open"></i></span>
              <p>لا توجد منتجات في هذا القسم حالياً</p>
              <Link to="/store" className="amz-btn-yellow" style={{ marginTop: '20px', display: 'inline-block', textDecoration: 'none' }}>تصفح منتجات أخرى</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
              {products.map(p => (
                <ProductCard key={p.id} product={p} onAddToCart={addToCart} />
              ))}
            </div>
          )}

          <div ref={observerRef} style={{ height: 60, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {loadingMore && <div className="ec-spinner small" />}
          </div>
        </div>
      </div>
    </StoreLayout>
  );
};

export default StoreCategoryPage;
