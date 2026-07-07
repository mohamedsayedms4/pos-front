import React from 'react';
import { Link } from 'react-router-dom';
import StoreApi from '../../services/storeApi';
import { useStore } from '../../context/StoreContext';

const ProductCard = ({ product, onAddToCart }) => {
  const { storeInfo, toggleWishlist, isWishlisted } = useStore();
  const img = (product.imageUrls && product.imageUrls.length > 0)
    ? StoreApi.getImageUrl(product.imageUrls[0])
    : (product.image ? StoreApi.getImageUrl(product.image) : (product.imageUrl ? StoreApi.getImageUrl(product.imageUrl) : null));

  const isFav = isWishlisted(product.id);
  const currency = storeInfo?.currency || 'جنيه';

  return (
    <div className="amz-product-card" style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 'var(--amz-radius)', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '10px', height: '100%', position: 'relative' }}>
      
      <button 
        onClick={() => toggleWishlist(product.id)}
        style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.9)', border: '1px solid #ccc', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, color: isFav ? '#B12704' : '#555' }}
        title={isFav ? "إزالة من المفضلة" : "إضافة للمفضلة"}
      >
        <i className={`${isFav ? 'fas' : 'far'} fa-heart`}></i>
      </button>

      <Link to={`/store/product/${product.id}`} style={{ height: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9f9f9', marginBottom: '15px' }}>
        {img ? (
          <img src={img} alt={product.name} loading="lazy" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }} />
        ) : (
          <i className="fas fa-box" style={{ fontSize: '3rem', color: '#ccc' }}></i>
        )}
      </Link>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Link to={`/store/product/${product.id}`} style={{ color: '#0F1111', fontSize: '1rem', textDecoration: 'none', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3, marginBottom: '8px' }}>
          {product.name}
        </Link>
        
        <div style={{ fontSize: '1.5rem', color: '#B12704', fontWeight: 500, marginBottom: '5px' }}>
          <span style={{ fontSize: '0.8rem', position: 'relative', top: '-0.4em' }}>{currency}</span>
          {Number(product.salePrice).toLocaleString()}
        </div>

        {product.inStock ? (
          <div style={{ color: '#007185', fontSize: '0.85rem', marginBottom: '10px' }}>
            توصيل مجاني
          </div>
        ) : (
          <div style={{ color: '#B12704', fontSize: '0.85rem', marginBottom: '10px' }}>
            غير متوفر حالياً
          </div>
        )}

        <div style={{ marginTop: 'auto' }}>
          <button 
            className="amz-btn-yellow"
            onClick={() => onAddToCart(product)}
            disabled={!product.inStock}
            style={{ padding: '6px 10px', fontSize: '0.85rem' }}
          >
            {product.inStock ? 'إضافة إلى عربة التسوق' : 'نفذت الكمية'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
