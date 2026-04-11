import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SERVER_URL } from '../services/api';
import StoreApi from '../services/storeApi';
import { useStore } from '../context/StoreContext';
import StoreLayout from '../components/store/StoreLayout';
import ProductCard from '../components/store/ProductCard';

const StoreProductDetail = () => {
  const { id } = useParams();
  const { addToCart, storeInfo } = useStore();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mainImage, setMainImage] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const p = await StoreApi.getProduct(id);
        setProduct(p);
        if (p.imageUrls?.length > 0) setMainImage(StoreApi.getImageUrl(p.imageUrls[0]));
        
        // Load related products from same category
        if (p.categoryId) {
          const rel = await StoreApi.getProducts(0, 10, '', p.categoryId);
          setRelated(rel.items.filter(i => i.id !== p.id));
        }
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    };
    load();
    window.scrollTo(0, 0);
  }, [id]);

  if (loading) return (
    <StoreLayout>
      <div className="ec-loading" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="ec-spinner" />
        <p>جاري تحميل تفاصيل المنتج...</p>
      </div>
    </StoreLayout>
  );

  if (error || !product) return (
    <StoreLayout>
      <div className="ec-empty" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <span style={{ fontSize: '4rem' }}>⚠️</span>
        <h3>عذراً، المنتج غير موجود</h3>
        <Link to="/store" className="ec-btn ec-btn-primary" style={{ marginTop: '20px', textDecoration: 'none' }}>العودة للمتجر</Link>
      </div>
    </StoreLayout>
  );

  return (
    <StoreLayout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Breadcrumbs */}
        <nav style={{ marginBottom: '30px', fontSize: '.85rem', color: '#888' }}>
          <Link to="/store" style={{ color: '#888', textDecoration: 'none' }}>المتجر</Link>
          <span style={{ margin: '0 10px' }}>/</span>
          <Link to={`/store/category/${product.categoryId}`} style={{ color: '#888', textDecoration: 'none' }}>{product.categoryName}</Link>
          <span style={{ margin: '0 10px' }}>/</span>
          <span style={{ color: '#333', fontWeight: 'bold' }}>{product.name}</span>
        </nav>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '50px', alignItems: 'start' }}>
          {/* Gallery */}
          <div className="ec-product-detail-gallery">
            <div style={{ 
              width: '100%', aspectRatio: '1/1', background: '#fff', 
              borderRadius: '20px', border: '1px solid #eee', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', padding: '20px', marginBottom: '20px'
            }}>
              {mainImage ? <img src={mainImage} alt={product.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <span>📦</span>}
            </div>
            {product.imageUrls?.length > 1 && (
              <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
                {product.imageUrls.map((url, i) => {
                  const fullUrl = StoreApi.getImageUrl(url);
                  return (
                    <div 
                      key={i} 
                      onClick={() => setMainImage(fullUrl)}
                      style={{ 
                        width: '80px', height: '80px', borderRadius: '10px', 
                        border: `2px solid ${mainImage === fullUrl ? '#00a651' : '#eee'}`,
                        cursor: 'pointer', overflow: 'hidden', flexShrink: 0, padding: '5px', background: '#fff'
                      }}
                    >
                      <img src={fullUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="ec-product-detail-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              {product.categoryImageUrl && (
                <img src={`${SERVER_URL}${product.categoryImageUrl}`} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
              )}
              <span style={{ color: '#00a651', fontWeight: 'bold', fontSize: '.9rem' }}>{product.categoryName}</span>
            </div>
            
            <h1 style={{ fontSize: '2.4rem', fontWeight: '900', color: '#1a1a2e', marginBottom: '20px', lineHeight: '1.2' }}>{product.name}</h1>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '25px' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: '900', color: '#00a651' }}>{Number(product.salePrice).toLocaleString()}</span>
              <span style={{ fontSize: '1.2rem', color: '#888' }}>{storeInfo?.currency || 'جنيه'}</span>
            </div>

            <div style={{ 
              padding: '20px', background: product.inStock ? '#f0fff4' : '#fff5f5', 
              borderRadius: '12px', marginBottom: '30px', border: `1px solid ${product.inStock ? '#c6f6d5' : '#feb2b2'}` 
            }}>
              <strong style={{ color: product.inStock ? '#2f855a' : '#c53030' }}>
                {product.inStock ? '✅ متوفر في المخزن - جاهز للشحن' : '❌ عذراً، المنتج غير متوفر حالياً'}
              </strong>
            </div>

            <p style={{ fontSize: '1.05rem', color: '#555', lineHeight: '1.8', marginBottom: '40px', whiteSpace: 'pre-wrap' }}>
              {product.description || 'لا يوجد وصف متاح لهذا المنتج حالياً.'}
            </p>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <button 
                className="ec-btn ec-btn-primary" 
                style={{ flex: 1, padding: '18px', fontSize: '1.1rem' }}
                onClick={() => addToCart(product)}
                disabled={!product.inStock}
              >
                أضف إلى سلة التسوق 🛒
              </button>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div style={{ marginTop: '80px' }}>
            <div className="ec-section-header">
              <div className="ec-section-line" />
              <h2>منتجات قد تعجبك</h2>
              <div className="ec-section-line" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
              {related.map(p => (
                <ProductCard key={p.id} product={p} onAddToCart={addToCart} />
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 992px) {
          .ec-product-detail-info { margin-top: 30px; }
          div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </StoreLayout>
  );
};

export default StoreProductDetail;
