import React from 'react';
import { Link } from 'react-router-dom';
import StoreApi from '../../services/storeApi';
import { useStore } from '../../context/StoreContext';

const ProductCard = ({ product }) => {
  const { storeInfo, toggleWishlist, isWishlisted } = useStore();
  const img = (product.imageUrls && product.imageUrls.length > 0)
    ? StoreApi.getImageUrl(product.imageUrls[0])
    : (product.image ? StoreApi.getImageUrl(product.image) : (product.imageUrl ? StoreApi.getImageUrl(product.imageUrl) : null));

  const isFav = isWishlisted(product.id);
  const currency = storeInfo?.currency || 'ج.م';
  const installmentPrice = Math.round(product.salePrice / 24);

  return (
    <div className="ec-product-card">
      <button 
        className={`ec-wishlist-btn ${isFav ? 'active' : ''}`}
        onClick={() => toggleWishlist(product.id)}
        title={isFav ? "إزالة من المفضلة" : "إضافة للمفضلة"}
      >
        <i className={`${isFav ? 'fas' : 'far'} fa-heart`}></i>
      </button>

      <Link to={`/store/product/${product.id}`} className="ec-product-img">
        {img ? <img src={img} alt={product.name} loading="lazy" /> : <div className="ec-placeholder"><i className="fas fa-box"></i></div>}
        {!product.inStock && (
          <span className="ec-badge ec-badge-out">غير متوفر</span>
        )}
      </Link>

      <div className="ec-product-info">
        <Link to={`/store/product/${product.id}`} className="ec-product-name">{product.name}</Link>
        
        <div className="ec-product-price">
          <span className="ec-price-current">{Number(product.salePrice).toLocaleString()}</span>
          <span className="ec-price-currency">{currency}</span>
        </div>

        {product.inStock && (
          <div className="ec-product-installment">
            <span className="ec-installment-icon">
              <i className="far fa-calendar-alt"></i>
            </span>
            <span>{Number(installmentPrice).toLocaleString()} {currency} / شهرياً</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
