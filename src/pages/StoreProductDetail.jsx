import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SERVER_URL } from '../services/api';
import StoreApi from '../services/storeApi';
import { useStore } from '../context/StoreContext';
import StoreLayout from '../components/store/StoreLayout';
import ProductCard from '../components/store/ProductCard';
import { useStoreAuth } from '../context/StoreAuthContext';
import * as fbPixel from '../services/fbPixel';

const StoreProductDetail = () => {
  const { id } = useParams();
  const { addToCart, storeInfo, setCheckoutOpen } = useStore();
  const { storeCustomer } = useStoreAuth();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [productOffers, setProductOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mainImage, setMainImage] = useState(null);
  const relatedScrollRef = useRef(null);

  const handleBuyNow = () => {
    addToCart(product);
    setCheckoutOpen(true);
  };

  const handleUseOffer = (offer) => {
    let newPrice = product.salePrice;
    if (offer.discountType === 'PERCENTAGE') {
        newPrice = product.salePrice - (product.salePrice * (offer.discountValue / 100));
    } else {
        newPrice = product.salePrice - offer.discountValue;
    }
    if (newPrice < 0) newPrice = 0;

    const discountedProduct = {
        ...product,
        originalPrice: product.salePrice,
        salePrice: newPrice,
        appliedOfferId: offer.id,
        appliedOfferLabel: offer.titleAr
    };

    setProduct(discountedProduct);
    alert('تم تفعيل العرض بنجاح! السعر الجديد يظهر الآن ويمكنك إضافته للسلة.');
    setProductOffers(prev => prev.filter(o => o.id !== offer.id));
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
        fbPixel.trackViewContent(p);

        // Load related products from same category
        if (p.categoryId) {
          const rel = await StoreApi.getProducts(0, 10, '', p.categoryId);
          setRelated(rel.items.filter(i => i.id !== p.id));
        }

        if (storeCustomer) {
            try {
                const offersRes = await StoreApi.getMyOffersForProduct(p.id);
                setProductOffers(offersRes.data || []);
            } catch(e) {
                console.error("Failed to fetch product offers", e);
            }
        }
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    };
    load();
    window.scrollTo(0, 0);
  }, [id, storeCustomer]);

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
        <span style={{ fontSize: '4rem', color: '#e2e8f0' }}><i className="fas fa-exclamation-triangle"></i></span>
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
              {mainImage ? <img src={mainImage} alt={product.name} /> : <span style={{ fontSize: '3rem', color: '#e2e8f0' }}><i className="fas fa-box"></i></span>}
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

            {productOffers.length > 0 && (
                <div style={{ background: '#fef3c7', border: '2px dashed #f59e0b', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '1.5rem', color: '#f59e0b' }}><i className="fas fa-gift"></i></span>
                        <h3 style={{ margin: 0, color: '#b45309' }}>عروض مخصصة لك!</h3>
                    </div>
                    {productOffers.map(offer => (
                        <div key={offer.id} style={{ background: 'white', padding: '10px', borderRadius: '6px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <strong style={{ color: '#d97706', display: 'block' }}>{offer.titleAr}</strong>
                                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{offer.messageAr}</span>
                                <div style={{ fontWeight: 'bold', marginTop: '5px' }}>
                                    خصم: {offer.discountType === 'PERCENTAGE' ? `${offer.discountValue}%` : `${offer.discountValue} ج.م`}
                                </div>
                            </div>
                            <button 
                                onClick={() => handleUseOffer(offer)}
                                className="ec-btn ec-btn-primary" 
                                style={{ padding: '8px 15px', fontSize: '0.9rem' }}
                            >
                                تطبيق العرض
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="ec-detail-price-wrapper">
              <span className="ec-detail-price">{Number(product.salePrice).toLocaleString()}</span>
              <span className="ec-detail-currency">{storeInfo?.currency || 'جنيه'}</span>
            </div>

            <div className={`ec-detail-stock-badge ${product.inStock ? 'ec-detail-stock-in' : 'ec-detail-stock-out'}`}>
              <strong>
                {product.inStock ? (
                  <>
                    <i className="fas fa-check-circle" style={{ marginLeft: '8px' }}></i>
                    متوفر - جاهز للشحن
                  </>
                ) : (
                  <>
                    <i className="fas fa-times-circle" style={{ marginLeft: '8px' }}></i>
                    عذراً، غير متوفر حالياً
                  </>
                )}
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
                <i className="fas fa-bolt" style={{ marginLeft: '8px' }}></i>
                اشتري الآن
              </button>
              <button
                className="ec-btn-add-to-cart"
                onClick={() => addToCart(product)}
                disabled={!product.inStock}
              >
                <i className="fas fa-shopping-cart" style={{ marginLeft: '8px' }}></i>
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
              <button className="ec-carousel-nav prev" onClick={() => scrollRelated('right')}><i className="fas fa-chevron-right"></i></button>
              <div className="ec-products-carousel-scroll" ref={relatedScrollRef}>
                {related.map(p => (
                  <div key={p.id} className="ec-product-carousel-item">
                    <ProductCard product={p} onAddToCart={addToCart} />
                  </div>
                ))}
              </div>
              <button className="ec-carousel-nav next" onClick={() => scrollRelated('left')}><i className="fas fa-chevron-left"></i></button>
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
