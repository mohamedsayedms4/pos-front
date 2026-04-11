import React from 'react';
import { Link } from 'react-router-dom';
import { SERVER_URL } from '../../services/api';
import StoreApi from '../../services/storeApi';
import { useStore } from '../../context/StoreContext';

const ProductCard = ({ product, onAddToCart }) => {
  const { storeInfo } = useStore();
  const img = product.imageUrls && product.imageUrls.length > 0
    ? StoreApi.getImageUrl(product.imageUrls[0]) : null;

  return (
    <div className="ec-product-card">
      <Link to={`/store/product/${product.id}`} className="ec-product-img">
        {img ? <img src={img} alt={product.name} loading="lazy" /> : <div className="ec-placeholder">📦</div>}
        {product.inStock ? (
          <span className="ec-badge ec-badge-stock">متوفر</span>
        ) : (
          <span className="ec-badge ec-badge-out">غير متوفر</span>
        )}
      </Link>
      <div className="ec-product-info">
        {product.categoryName && (
          <Link to={`/store/category/${product.categoryId}`} className="ec-product-brand" style={{ display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}>
            {product.categoryImageUrl && (
              <img src={`${SERVER_URL}${product.categoryImageUrl}`} alt="" style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }} />
            )}
            {product.categoryName}
          </Link>
        )}
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
        {product.inStock ? 'أضف لسلة التسوق' : 'غير متوفر'}
      </button>
    </div>
  );
};

export default ProductCard;
