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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fas fa-shopping-basket" style={{ fontSize: '1.2rem', color: 'var(--ec-primary)' }}></i>
            <h3>سلة التسوق</h3>
          </div>
          <button className="ec-drawer-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="ec-drawer-body">
          {cart.length === 0 ? (
            <div className="ec-empty-cart">
              <div className="ec-empty-icon">
                <i className="fas fa-shopping-cart" style={{ fontSize: '3rem', opacity: 0.1 }}></i>
              </div>
              <p>سلتك فارغة حالياً</p>
            </div>
          ) : (
            <div className="ec-cart-items-list">
              {cart.map(item => (
                <div key={item.id} className="ec-cart-item">
                  <div className="ec-cart-item-img">
                    {item.image ? <img src={item.image} alt={item.name} /> : <span><i className="fas fa-box"></i></span>}
                  </div>
                  <div className="ec-cart-item-info">
                    <h4>{item.name}</h4>
                    <p className="ec-cart-item-price">{Number(item.price).toLocaleString()} {CURRENCY}</p>
                    
                    <div className="ec-cart-item-controls">
                      <div className="ec-cart-item-qty">
                        <button onClick={() => onUpdate(item.id, item.qty - 1)} disabled={item.qty <= 1}>
                          <i className="fas fa-minus"></i>
                        </button>
                        <span>{item.qty}</span>
                        <button onClick={() => onUpdate(item.id, item.qty + 1)}>
                          <i className="fas fa-plus"></i>
                        </button>
                      </div>
                      <button className="ec-cart-item-remove-text" onClick={() => onRemove(item.id)}>حذف</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="ec-drawer-footer">
            <div className="ec-cart-total">
              <span>الإجمالي العام:</span>
              <strong>{total.toLocaleString()} {CURRENCY}</strong>
            </div>
            <button className="ec-checkout-btn-premium" onClick={onCheckout}>
              <span>إتمام طلبك الآن</span>
              <i className="fas fa-arrow-left"></i>
            </button>
            <div className="ec-secure-badge-premium">
              <i className="fas fa-lock"></i>
              <span>تسوق آمن وتشفير كامل للبيانات</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
