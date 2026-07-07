import React from 'react';
import { useStore } from '../../context/StoreContext';

const CartDrawer = ({ isOpen, onClose, cart, onUpdate, onRemove, onCheckout }) => {
  const { storeInfo } = useStore();
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const CURRENCY = storeInfo?.currency || 'جنيه';
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <>
      <div className={`ec-drawer-overlay ${isOpen ? 'active' : ''}`} onClick={onClose} style={{ zIndex: 1000 }} />
      <div className={`ec-drawer ${isOpen ? 'open' : ''}`} style={{ width: '400px', maxWidth: '100%', zIndex: 1001, background: '#f2f4f8' }}>
        <div className="ec-drawer-header" style={{ background: '#fff', borderBottom: '1px solid #ddd', padding: '15px 20px', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 500, margin: 0, color: '#0F1111' }}>عربة التسوق</h3>
            <span style={{ fontSize: '1rem', color: '#007185' }}>({cartCount} عناصر)</span>
          </div>
          <button className="ec-drawer-close" onClick={onClose} style={{ color: '#0F1111', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="ec-drawer-body" style={{ padding: '20px' }}>
          {cart.length === 0 ? (
            <div className="ec-empty-cart" style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="ec-empty-icon" style={{ marginBottom: '20px' }}>
                <i className="fas fa-shopping-cart" style={{ fontSize: '4rem', color: '#ddd' }}></i>
              </div>
              <h2 style={{ fontSize: '1.2rem', color: '#0F1111', marginBottom: '10px' }}>عربة التسوق الخاصة بك فارغة</h2>
              <button className="amz-btn-yellow" onClick={onClose} style={{ marginTop: '10px', display: 'inline-block', width: 'auto', padding: '8px 20px' }}>متابعة التسوق</button>
            </div>
          ) : (
            <div className="ec-cart-items-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {cart.map(item => (
                <div key={item.id} className="ec-cart-item" style={{ background: '#fff', padding: '15px', borderRadius: 'var(--amz-radius)', display: 'flex', gap: '15px', border: '1px solid #ddd' }}>
                  <div className="ec-cart-item-img" style={{ width: '80px', height: '80px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.image ? <img src={item.image} alt={item.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <span><i className="fas fa-box" style={{ color: '#ccc', fontSize: '2rem' }}></i></span>}
                  </div>
                  <div className="ec-cart-item-info" style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '0.9rem', color: '#0F1111', margin: '0 0 5px 0', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.name}</h4>
                    <div style={{ fontSize: '1.1rem', color: '#B12704', fontWeight: 'bold', marginBottom: '10px' }}>{Number(item.price).toLocaleString()} {CURRENCY}</div>
                    
                    <div className="ec-cart-item-controls" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div className="ec-cart-item-qty" style={{ display: 'flex', alignItems: 'center', background: '#F0F2F2', border: '1px solid #D5D9D9', borderRadius: '7px', overflow: 'hidden', boxShadow: '0 2px 5px rgba(15,17,17,.15)' }}>
                        <button onClick={() => onUpdate(item.id, item.qty - 1)} style={{ background: 'none', border: 'none', padding: '5px 10px', cursor: item.qty <= 1 ? 'not-allowed' : 'pointer', color: item.qty <= 1 ? '#ccc' : '#0F1111' }} disabled={item.qty <= 1}>
                          <i className="fas fa-minus" style={{ fontSize: '0.7rem' }}></i>
                        </button>
                        <span style={{ padding: '0 10px', fontSize: '0.9rem', fontWeight: 500, background: '#fff', borderLeft: '1px solid #D5D9D9', borderRight: '1px solid #D5D9D9', height: '100%', display: 'flex', alignItems: 'center' }}>{item.qty}</span>
                        <button onClick={() => onUpdate(item.id, item.qty + 1)} style={{ background: 'none', border: 'none', padding: '5px 10px', cursor: 'pointer' }}>
                          <i className="fas fa-plus" style={{ fontSize: '0.7rem' }}></i>
                        </button>
                      </div>
                      <span style={{ color: '#ddd' }}>|</span>
                      <button className="ec-cart-item-remove-text" onClick={() => onRemove(item.id)} style={{ background: 'none', border: 'none', color: '#007185', fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}>حذف</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="ec-drawer-footer" style={{ background: '#fff', padding: '20px', borderTop: '1px solid #ddd' }}>
            <div className="ec-cart-total" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <span style={{ fontSize: '1.2rem', color: '#0F1111' }}>المجموع الفرعي ({cartCount} عناصر):</span>
              <strong style={{ fontSize: '1.3rem', color: '#B12704' }}>{total.toLocaleString()} {CURRENCY}</strong>
            </div>
            <button className="amz-btn-yellow" onClick={onCheckout} style={{ width: '100%', padding: '12px', fontSize: '1rem' }}>
              المتابعة لإتمام الشراء
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
