import React, { useState } from 'react';
import StoreApi from '../../services/storeApi';
import { useStore } from '../../context/StoreContext';

const CheckoutModal = ({ isOpen, onClose, cart, onSuccess }) => {
  const { storeInfo } = useStore();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ customerName: '', customerPhone: '', customerAddress: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderResult, setOrderResult] = useState(null);

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const handleNext = () => {
    if (!form.customerName || !form.customerPhone || !form.customerAddress) {
      return setError('يرجى ملء جميع الحقول المطلوبة');
    }
    setError('');
    setStep(2);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        ...form,
        items: cart.map(i => ({ productId: i.id, quantity: i.qty }))
      };
      const res = await StoreApi.placeOrder(payload);
      setOrderResult(res.data);
      setStep(3);
      onSuccess?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ec-modal-overlay">
      <div className="ec-modal">
        <div className="ec-modal-header">
          <h3>{step === 3 ? '✅ تم الطلب بنجاح' : 'إتمام الطلب'}</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="ec-modal-body">
          {step === 1 && (
            <>
              <div className="ec-form-group">
                <label>الاسم الكامل *</label>
                <input value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} placeholder="مثال: أحمد محمد" />
              </div>
              <div className="ec-form-group">
                <label>رقم الهاتف *</label>
                <input value={form.customerPhone} onChange={e => setForm({...form, customerPhone: e.target.value})} placeholder="01xxxxxxxxx" />
              </div>
              <div className="ec-form-group">
                <label>العنوان بالتفصيل *</label>
                <textarea value={form.customerAddress} onChange={e => setForm({...form, customerAddress: e.target.value})} placeholder="المدينة، الشارع، المبنى..." rows={2} />
              </div>
              <div className="ec-form-group">
                <label>ملاحظات إضافية</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="أي تعليمات خاصة للتوصيل..." rows={2} />
              </div>
              {error && <div className="ec-error">{error}</div>}
            </>
          )}

          {step === 2 && (
            <div className="ec-order-review">
              <div className="ec-review-customer">
                <p><strong>الاسم:</strong> {form.customerName}</p>
                <p><strong>الهاتف:</strong> {form.customerPhone}</p>
                <p><strong>العنوان:</strong> {form.customerAddress}</p>
              </div>
              <div className="ec-review-items">
                <h4>ملخص المنتجات:</h4>
                {cart.map(i => (
                  <div key={i.id} className="ec-review-item">
                    <span>{i.name} (x{i.qty})</span>
                    <span>{(i.price * i.qty).toLocaleString()} {storeInfo?.currency || 'جنيه'}</span>
                  </div>
                ))}
              </div>
              <div className="ec-review-total">
                <span>الإجمالي النهائي:</span>
                <strong>{total.toLocaleString()} {storeInfo?.currency || 'جنيه'}</strong>
              </div>
              {error && <div className="ec-error">{error}</div>}
            </div>
          )}

          {step === 3 && orderResult && (
            <div className="ec-order-success">
              <div className="ec-success-icon">🎉</div>
              <h2>شكراً لك! تم استلام طلبك</h2>
              <div className="ec-order-number">
                <span>رقم الطلب الخاص بك:</span>
                <strong>{orderResult.orderNumber}</strong>
              </div>
              <p>سيقوم فريقنا بالتواصل معك قريباً لتأكيد الطلب.</p>
            </div>
          )}
        </div>
        <div className="ec-modal-footer">
          {step === 1 && <button className="ec-btn ec-btn-primary" style={{ width: '100%' }} onClick={handleNext}>المتابعة للمراجعة</button>}
          {step === 2 && (
            <>
              <button className="ec-btn ec-btn-ghost" onClick={() => setStep(1)} disabled={loading}>رجوع</button>
              <button className="ec-btn ec-btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={loading}>
                {loading ? 'جاري الإرسال...' : 'تأكيد وشراء'}
              </button>
            </>
          )}
          {step === 3 && <button className="ec-btn ec-btn-primary" style={{ width: '100%' }} onClick={onClose}>إغلاق</button>}
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
