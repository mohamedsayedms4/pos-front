import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SERVER_URL } from '../services/api';
import StoreApi from '../services/storeApi';
import { useStore } from '../context/StoreContext';
import StoreLayout from '../components/store/StoreLayout';
import ProductCard from '../components/store/ProductCard';

const StoreProductDetail = () => {
  const { id } = useParams();
  const { addToCart, storeInfo, setCheckoutOpen } = useStore();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mainImage, setMainImage] = useState(null);
  const relatedScrollRef = useRef(null);

  const handleBuyNow = () => {
    addToCart(product);
    setCheckoutOpen(true);
  };

  const scrollRelated = (dir) => {
    if (relatedScrollRef.current) {
      const amt = 500;
      relatedScrollRef.current.scrollBy({ left: dir === 'left' ? -amt : amt, behavior: 'smooth' });
    }
  };

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
      <div className="ec-detail-container">
        {/* Breadcrumbs - Desktop Only */}
        <nav className="ec-breadcrumb hide-mobile" style={{ marginBottom: '30px', fontSize: '.85rem', color: '#888' }}>
          <Link to="/store" style={{ color: '#888', textDecoration: 'none' }}>المتجر</Link>
          <span style={{ margin: '0 10px' }}>/</span>
          <Link to={`/store/category/${product.categoryId}`} style={{ color: '#888', textDecoration: 'none' }}>{product.categoryName}</Link>
          <span style={{ margin: '0 10px' }}>/</span>
          <span style={{ color: '#333', fontWeight: 'bold' }}>{product.name}</span>
        </nav>

        <div className="ec-detail-grid">
          {/* Gallery */}
          <div className="ec-detail-gallery">
            <div className="ec-detail-main-img-wrapper">
              {mainImage ? <img src={mainImage} alt={product.name} /> : <span style={{fontSize: '3rem'}}>📦</span>}
            </div>
            {product.imageUrls?.length > 1 && (
              <div className="ec-detail-thumbnails">
                {product.imageUrls.map((url, i) => {
                  const fullUrl = StoreApi.getImageUrl(url);
                  const isActive = mainImage === fullUrl;
                  return (
                    <div 
                      key={i} 
                      onClick={() => setMainImage(fullUrl)}
                      className={`ec-detail-thumb ${isActive ? 'active' : ''}`}
                    >
                      <img src={fullUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="ec-detail-info">
            <div className="ec-detail-category">
              {product.categoryImageUrl && (
                <img src={`${SERVER_URL}${product.categoryImageUrl}`} alt="" style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} />
              )}
              <span>{product.categoryName}</span>
            </div>
            
            <h1 className="ec-detail-title">{product.name}</h1>
            
            <div className="ec-detail-price-wrapper">
              <span className="ec-detail-price">{Number(product.salePrice).toLocaleString()}</span>
              <span className="ec-detail-currency">{storeInfo?.currency || 'جنيه'}</span>
            </div>

            <div className={`ec-detail-stock-badge ${product.inStock ? 'ec-detail-stock-in' : 'ec-detail-stock-out'}`}>
              <strong>
                {product.inStock ? '✅ متوفر - جاهز للشحن' : '❌ عذراً، غير متوفر حالياً'}
              </strong>
            </div>

            <p className="ec-detail-description">
              {product.description || 'لا يوجد وصف متاح لهذا المنتج حالياً.'}
            </p>

            <div className="ec-detail-actions">
              <button 
                className="ec-btn-buy-now" 
                onClick={handleBuyNow}
                disabled={!product.inStock}
              >
                اشتري الآن
              </button>
              <button 
                className="ec-btn-add-to-cart" 
                onClick={() => addToCart(product)}
                disabled={!product.inStock}
              >
                أضف للسلة
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
            <div className="ec-products-carousel-outer">
              <button className="ec-carousel-nav prev" onClick={() => scrollRelated('right')}><span>›</span></button>
              <div className="ec-products-carousel-scroll" ref={relatedScrollRef}>
                {related.map(p => (
                  <div key={p.id} className="ec-product-carousel-item">
                    <ProductCard product={p} onAddToCart={addToCart} />
                  </div>
                ))}
              </div>
              <button className="ec-carousel-nav next" onClick={() => scrollRelated('left')}><span>‹</span></button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
        }
      `}</style>
    </StoreLayout>
  );
};

export default StoreProductDetail;
