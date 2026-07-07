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

        <div className="amz-pdp-container" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 400px) 1fr 300px', gap: '30px', padding: '20px', background: '#fff', margin: '0 auto', maxWidth: '1500px' }}>
          
          {/* Column 1: Gallery */}
          <div className="amz-pdp-gallery" style={{ display: 'flex', gap: '15px' }}>
            {product.imageUrls?.length > 1 && (
              <div className="amz-pdp-thumbnails" style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '50px' }}>
                {product.imageUrls.map((url, i) => {
                  const fullUrl = StoreApi.getImageUrl(url);
                  const isActive = mainImage === fullUrl;
                  return (
                    <div
                      key={i}
                      onMouseEnter={() => setMainImage(fullUrl)}
                      style={{ 
                        width: '50px', height: '50px', border: isActive ? '2px solid var(--amz-orange)' : '1px solid #ccc', 
                        borderRadius: 'var(--amz-radius)', cursor: 'pointer', overflow: 'hidden'
                      }}
                    >
                      <img src={fullUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  );
                })}
              </div>
            )}
            <div className="amz-pdp-main-image" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
              {mainImage ? <img src={mainImage} alt={product.name} style={{ width: '100%', maxHeight: '500px', objectFit: 'contain' }} /> : <span style={{ fontSize: '3rem', color: '#e2e8f0' }}><i className="fas fa-box"></i></span>}
            </div>
          </div>

          {/* Column 2: Details */}
          <div className="amz-pdp-details" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 500, margin: 0, lineHeight: 1.3 }}>{product.name}</h1>
            <div style={{ color: 'var(--amz-link)', fontSize: '0.9rem', cursor: 'pointer' }}>
              العلامة التجارية: {product.categoryName}
            </div>
            
            <hr style={{ borderTop: '1px solid #ddd', margin: '10px 0' }} />

            <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#565959' }}>السعر:</span>
                <span style={{ fontSize: '1.5rem', color: '#B12704', fontWeight: 500 }}>
                  <span style={{ fontSize: '0.8rem', position: 'relative', top: '-0.4em' }}>{storeInfo?.currency || 'جنيه'}</span>
                  {Number(product.salePrice).toLocaleString()}
                </span>
              </div>
              <span style={{ color: '#565959' }}>الأسعار تشمل ضريبة القيمة المضافة.</span>
            </div>

            <hr style={{ borderTop: '1px solid #ddd', margin: '10px 0' }} />

            {productOffers.length > 0 && (
                <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 'var(--amz-radius)', padding: '15px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <span style={{ color: '#f59e0b' }}><i className="fas fa-tag"></i></span>
                        <h3 style={{ margin: 0, color: '#b45309', fontSize: '1rem' }}>عروض مخصصة لك!</h3>
                    </div>
                    {productOffers.map(offer => (
                        <div key={offer.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                            <div>
                                <strong style={{ color: '#d97706', fontSize: '0.9rem' }}>{offer.titleAr}</strong>
                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{offer.messageAr}</div>
                            </div>
                            <button onClick={() => handleUseOffer(offer)} className="amz-btn-yellow" style={{ width: 'auto', padding: '5px 10px', fontSize: '0.8rem' }}>
                                تطبيق
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ marginTop: '10px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '10px' }}>عن هذه السلعة</h3>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.5, color: '#0F1111', whiteSpace: 'pre-line' }}>
                {product.description || 'لا يوجد وصف متاح لهذا المنتج حالياً.'}
              </p>
            </div>
          </div>

          {/* Column 3: Buy Box */}
          <div className="amz-pdp-buybox" style={{ border: '1px solid #D5D9D9', borderRadius: 'var(--amz-radius)', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px', height: 'fit-content' }}>
            <div style={{ fontSize: '1.5rem', color: '#B12704', fontWeight: 500 }}>
              <span style={{ fontSize: '0.8rem', position: 'relative', top: '-0.4em' }}>{storeInfo?.currency || 'جنيه'}</span>
              {Number(product.salePrice).toLocaleString()}
            </div>

            <div style={{ color: '#007185', fontSize: '0.9rem' }}>
              التوصيل مجاني
            </div>

            <div style={{ fontSize: '1.1rem', color: product.inStock ? '#007600' : '#B12704', fontWeight: 500 }}>
              {product.inStock ? 'متوفر' : 'غير متوفر'}
            </div>

            <div style={{ fontSize: '0.85rem', color: '#565959', display: 'flex', flexDirection: 'column', gap: '4px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                 <span>تشحن من</span>
                 <span>{storeInfo?.name || STORE_NAME}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                 <span>تباع من قبل</span>
                 <span>{storeInfo?.name || STORE_NAME}</span>
               </div>
            </div>

            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="amz-btn-yellow" onClick={() => addToCart(product)} disabled={!product.inStock}>
                إضافة إلى عربة التسوق
              </button>
              <button className="amz-btn-orange" onClick={handleBuyNow} disabled={!product.inStock}>
                اشتري الآن
              </button>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#007185', fontSize: '0.85rem', marginTop: '10px', cursor: 'pointer' }}>
              <i className="fas fa-lock" style={{ color: '#999' }}></i> معاملة آمنة
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
