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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <h3>سلة التسوق</h3>
          </div>
          <button className="ec-drawer-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="ec-drawer-body">
          {cart.length === 0 ? (
            <div className="ec-empty-cart">
              <div className="ec-empty-icon">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
              </div>
              <p>سلتك فارغة حالياً</p>
            </div>
          ) : (
            <div className="ec-cart-items-list">
              {cart.map(item => (
                <div key={item.id} className="ec-cart-item">
                  <div className="ec-cart-item-img">
                    {item.image ? <img src={item.image} alt={item.name} /> : <span>📦</span>}
                  </div>
                  <div className="ec-cart-item-info">
                    <h4>{item.name}</h4>
                    <p className="ec-cart-item-price">{Number(item.price).toLocaleString()} {CURRENCY}</p>
                    
                    <div className="ec-cart-item-controls">
                      <div className="ec-cart-item-qty">
                        <button onClick={() => onUpdate(item.id, item.qty - 1)} disabled={item.qty <= 1}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                        <span>{item.qty}</span>
                        <button onClick={() => onUpdate(item.id, item.qty + 1)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"></path>
              </svg>
            </button>
            <div className="ec-secure-badge-premium">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <span>تسوق آمن وتشفير كامل للبيانات</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
