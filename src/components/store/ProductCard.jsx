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

  return (
    <div className="ec-product-card">
      <button 
        className={`ec-wishlist-btn ${isFav ? 'active' : ''}`}
        onClick={() => toggleWishlist(product.id)}
        title={isFav ? "إزالة من المفضلة" : "إضافة للمفضلة"}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.72-8.72 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      </button>

      <Link to={`/store/product/${product.id}`} className="ec-product-img">
        {img ? <img src={img} alt={product.name} loading="lazy" /> : <div className="ec-placeholder">📦</div>}
        {!product.inStock && (
          <span className="ec-badge ec-badge-out">غير متوفر</span>
        )}
      </Link>

      <div className="ec-product-info">
        <Link to={`/store/product/${product.id}`} className="ec-product-name">{product.name}</Link>
        <div className="ec-product-price">
          <span className="ec-price-current">{Number(product.salePrice).toLocaleString()}</span>
          <span className="ec-price-currency">{storeInfo?.currency || 'جنيه'}</span>
        </div>
      </div>

      <button
        className="ec-add-cart-btn"
        onClick={() => onAddToCart(product)}
        disabled={!product.inStock}
      >
        {product.inStock ? 'اشتري الآن' : 'غير متوفر'}
      </button>
    </div>
  );
};

export default ProductCard;
