import React from 'react';
import { useStore } from '../../context/StoreContext';

const CartDrawer = ({ isOpen, onClose, cart, onUpdate, onRemove, onCheckout }) => {
  const { storeInfo } = useStore();
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const CURRENCY = storeInfo?.currency || 'جنيه';

  return (
    <>
      <div className={`ec-drawer-overlay ${isOpen ? 'active' : ''}`} onClick={onClose} />
      <div className={`ec-drawer ${isOpen ? 'open' : ''}`}>
        <div className="ec-drawer-header">
          <h3>🛒 سلة التسوق</h3>
          <button className="ec-drawer-close" onClick={onClose}>✕</button>
        </div>
        <div className="ec-drawer-body">
          {cart.length === 0 ? (
            <div className="ec-empty-cart">
              <div style={{ fontSize: '3rem' }}>🛒</div>
              <p>السلة فارغة</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="ec-cart-item">
                <div className="ec-cart-item-img">
                  {item.image ? <img src={item.image} alt={item.name} /> : <span>📦</span>}
                </div>
                <div className="ec-cart-item-info">
                  <h4>{item.name}</h4>
                  <p className="ec-cart-item-price">{Number(item.price).toLocaleString()} {CURRENCY}</p>
                </div>
                <div className="ec-cart-item-qty">
                  <button onClick={() => onUpdate(item.id, item.qty - 1)}>−</button>
                  <span>{item.qty}</span>
                  <button onClick={() => onUpdate(item.id, item.qty + 1)}>+</button>
                </div>
                <button className="ec-cart-item-remove" onClick={() => onRemove(item.id)}>🗑</button>
              </div>
            ))
          )}
        </div>
        {cart.length > 0 && (
          <div className="ec-drawer-footer">
            <div className="ec-cart-total">
              <span>الإجمالي:</span>
              <strong>{total.toLocaleString()} {CURRENCY}</strong>
            </div>
            <button className="ec-checkout-btn" onClick={onCheckout}>
              <span>إتمام الطلب</span>
              <span style={{ fontSize: '1.2rem' }}>🛍️</span>
            </button>
            <div className="ec-secure-badge">
              <span>🔒</span>
              <span>دفع آمن 100%</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
