import React, { useState } from 'react';
import StoreApi from '../../services/storeApi';
import { useStore } from '../../context/StoreContext';
import { useStoreAuth } from '../../context/StoreAuthContext';

const CheckoutModal = ({ isOpen, onClose, cart, onSuccess }) => {
  const { storeInfo } = useStore();
  const { storeCustomer } = useStoreAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ 
    customerName: storeCustomer?.name || '', 
    customerPhone: storeCustomer?.phone || '', 
    customerAddress: storeCustomer?.address || '', 
    notes: '' 
  });
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderResult, setOrderResult] = useState(null);

  // Initialize form when opened if customer is logged in
  React.useEffect(() => {
    if (isOpen && storeCustomer) {
      setForm(prev => ({
        ...prev,
        customerName: storeCustomer.name || prev.customerName,
        customerPhone: storeCustomer.phone || prev.customerPhone,
        customerAddress: storeCustomer.address || prev.customerAddress
      }));
    }
  }, [isOpen, storeCustomer]);

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  // Step 1 → Step 2: Validate customer info
  const handleNextToPayment = () => {
    if (!form.customerName || !form.customerPhone || !form.customerAddress) {
      return setError('يرجى ملء جميع الحقول المطلوبة');
    }
    setError('');
    setStep(2);
  };

  // Step 2 → Step 3: Proceed to review
  const handleNextToReview = () => {
    setError('');
    setStep(3);
  };

  // Step 3 → Submit
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        ...form,
        storeCustomerId: storeCustomer?.id,
        paymentMethod,
        items: cart.map(i => ({ productId: i.id, quantity: i.qty }))
      };
      const res = await StoreApi.placeOrder(payload);
      const orderData = res.data;

      if (paymentMethod === 'ONLINE' && orderData.stripeCheckoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = orderData.stripeCheckoutUrl;
        return;
      }

      // COD flow — show success
      setOrderResult(orderData);
      setStep(4);
      onSuccess?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currency = storeInfo?.currency || 'جنيه';

  return (
    <div className="ec-modal-overlay">
      <div className="ec-modal">
        <div className="ec-modal-header">
          <h3>{step === 4 ? '✅ تم الطلب بنجاح' : 'إتمام عملية الشراء'}</h3>
          <button onClick={onClose}>✕</button>
        </div>
        
        {/* Stepper */}
        {step < 4 && (
          <div className="ec-stepper">
            <div className={`ec-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
              <div className="ec-step-icon">{step > 1 ? '✓' : '1'}</div>
              <span className="ec-step-label">البيانات</span>
            </div>
            <div className={`ec-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
              <div className="ec-step-icon">{step > 2 ? '✓' : '2'}</div>
              <span className="ec-step-label">الدفع</span>
            </div>
            <div className={`ec-step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
              <div className="ec-step-icon">{step > 3 ? '✓' : '3'}</div>
              <span className="ec-step-label">المراجعة</span>
            </div>
            <div className={`ec-step ${step === 4 ? 'active' : ''}`}>
              <div className="ec-step-icon">4</div>
              <span className="ec-step-label">التأكيد</span>
            </div>
          </div>
        )}

        <div className="ec-modal-body">
          {/* ─── Step 1: Customer Info ─── */}
          {step === 1 && (
            <div className="ec-animate-in">
              {storeCustomer && (
                <div style={{ background: '#f0fdf4', color: '#166534', padding: '10px 15px', borderRadius: '8px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>🌟</span>
                  <span>مرحباً بك يا <strong>{storeCustomer.name.split(' ')[0]}</strong>، تم إحضار بياناتك المحفوظة.</span>
                </div>
              )}
              <div className="ec-form-group">
                <label>الاسم الكامل *</label>
                <div className="ec-form-input-wrapper">
                  <span className="ec-form-icon">👤</span>
                  <input value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} placeholder="مثال: أحمد محمد" />
                </div>
              </div>
              <div className="ec-form-group">
                <label>رقم الهاتف *</label>
                <div className="ec-form-input-wrapper">
                  <span className="ec-form-icon">📱</span>
                  <input value={form.customerPhone} onChange={e => setForm({...form, customerPhone: e.target.value})} placeholder="01xxxxxxxxx" />
                </div>
              </div>
              <div className="ec-form-group">
                <label>العنوان بالتفصيل *</label>
                <div className="ec-form-input-wrapper">
                  <span className="ec-form-icon">📍</span>
                  <textarea value={form.customerAddress} onChange={e => setForm({...form, customerAddress: e.target.value})} placeholder="المدينة، الشارع، المبنى..." rows={2} />
                </div>
              </div>
              <div className="ec-form-group">
                <label>ملاحظات إضافية</label>
                <div className="ec-form-input-wrapper">
                  <span className="ec-form-icon">📝</span>
                  <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="أي تعليمات خاصة للتوصيل..." rows={2} />
                </div>
              </div>
              {error && <div className="ec-error">{error}</div>}
            </div>
          )}

          {/* ─── Step 2: Payment Method ─── */}
          {step === 2 && (
            <div className="ec-animate-in">
              <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                <h4 style={{ color: '#1e293b', marginBottom: '5px' }}>اختر طريقة الدفع</h4>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>يمكنك الدفع نقداً عند الاستلام أو بالبطاقة أونلاين</p>
              </div>

              <div className="ec-payment-methods">
                {/* COD Option */}
                <button
                  className={`ec-payment-option ${paymentMethod === 'COD' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('COD')}
                >
                  <div className="ec-payment-radio">
                    <div className={`ec-radio-dot ${paymentMethod === 'COD' ? 'active' : ''}`} />
                  </div>
                  <div className="ec-payment-icon">💵</div>
                  <div className="ec-payment-info">
                    <strong>الدفع عند الاستلام</strong>
                    <span>ادفع نقداً عند وصول الطلب</span>
                  </div>
                </button>

                {/* Online Payment Option */}
                <button
                  className={`ec-payment-option ${paymentMethod === 'ONLINE' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('ONLINE')}
                >
                  <div className="ec-payment-radio">
                    <div className={`ec-radio-dot ${paymentMethod === 'ONLINE' ? 'active' : ''}`} />
                  </div>
                  <div className="ec-payment-icon">💳</div>
                  <div className="ec-payment-info">
                    <strong>الدفع بالبطاقة</strong>
                    <span>Visa / Mastercard — دفع آمن</span>
                  </div>
                  <div className="ec-payment-badge">
                    🔒 آمن
                  </div>
                </button>
              </div>

              {paymentMethod === 'ONLINE' && (
                <div className="ec-stripe-notice">
                  <span>🔐</span>
                  <div>
                    <strong>دفع آمن 100%</strong>
                    <p>سيتم توجيهك لصفحة دفع آمنة (Stripe) لإتمام عملية الشراء. لن نحتفظ ببيانات بطاقتك.</p>
                  </div>
                </div>
              )}

              {error && <div className="ec-error">{error}</div>}
            </div>
          )}

          {/* ─── Step 3: Review ─── */}
          {step === 3 && (
            <div className="ec-order-review ec-animate-in">
              <div className="ec-review-card">
                <h4>👤 بيانات التوصيل</h4>
                <div className="ec-review-row">
                  <span className="ec-review-label">الاسم:</span>
                  <span className="ec-review-value">{form.customerName}</span>
                </div>
                <div className="ec-review-row">
                  <span className="ec-review-label">الهاتف:</span>
                  <span className="ec-review-value">{form.customerPhone}</span>
                </div>
                <div className="ec-review-row">
                  <span className="ec-review-label">العنوان:</span>
                  <span className="ec-review-value">{form.customerAddress}</span>
                </div>
              </div>

              <div className="ec-review-card">
                <h4>💰 طريقة الدفع</h4>
                <div className="ec-review-row">
                  <span className="ec-review-label">الطريقة:</span>
                  <span className="ec-review-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {paymentMethod === 'ONLINE' ? (
                      <><span>💳</span> الدفع بالبطاقة (أونلاين)</>
                    ) : (
                      <><span>💵</span> الدفع عند الاستلام</>
                    )}
                  </span>
                </div>
              </div>

              <div className="ec-review-card">
                <h4>🛍️ ملخص المنتجات</h4>
                {cart.map(i => (
                  <div key={i.id} className="ec-review-row">
                    <span className="ec-review-label">{i.name} (x{i.qty})</span>
                    <span className="ec-review-value">{(i.price * i.qty).toLocaleString()} {currency}</span>
                  </div>
                ))}
                <div className="ec-review-row" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '2px solid #e2e8f0' }}>
                  <span className="ec-review-label" style={{ fontSize: '1.1rem', color: '#1e293b' }}>الإجمالي النهائي:</span>
                  <span className="ec-review-value" style={{ fontSize: '1.3rem', color: 'var(--ec-primary)' }}>{total.toLocaleString()} {currency}</span>
                </div>
              </div>
              {error && <div className="ec-error">{error}</div>}
            </div>
          )}

          {/* ─── Step 4: Success ─── */}
          {step === 4 && orderResult && (
            <div className="ec-order-success-premium ec-animate-in">
              <div className="ec-success-badge-large">🎉</div>
              <h2>شكراً لك! تم استلام طلبك بنجاح</h2>
              <p style={{ color: '#64748b', marginBottom: '10px' }}>سوف نقوم بمراجعة طلبك والتواصل معك قريباً.</p>
              
              <div className="ec-success-order-id">
                <span>رقم الطلب الخاص بك هو:</span>
                <strong>{orderResult.orderNumber}</strong>
              </div>

              <div style={{ marginTop: '20px', padding: '15px', background: '#e1f5fe', borderRadius: '12px', color: '#01579b', fontSize: '0.85rem' }}>
                💡 يمكنك استخدام رقم الطلب لتتبعه لاحقاً من قسم "تتبع الطلب".
              </div>
            </div>
          )}
        </div>

        {/* ─── Footer Buttons ─── */}
        <div className="ec-modal-footer">
          {step === 1 && (
            <button className="ec-btn ec-btn-primary" style={{ width: '100%' }} onClick={handleNextToPayment}>
              <span>المتابعة لطريقة الدفع</span>
              <span>←</span>
            </button>
          )}
          {step === 2 && (
            <>
              <button className="ec-btn ec-btn-ghost" onClick={() => setStep(1)}>
                <span>رجوع</span>
              </button>
              <button className="ec-btn ec-btn-primary" style={{ flex: 1 }} onClick={handleNextToReview}>
                <span>المتابعة للمراجعة</span>
                <span>←</span>
              </button>
            </>
          )}
          {step === 3 && (
            <>
              <button className="ec-btn ec-btn-ghost" onClick={() => setStep(2)} disabled={loading}>
                <span>رجوع</span>
              </button>
              <button className="ec-btn ec-btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={loading}>
                {loading ? 'جاري الإرسال...' : (
                  <>
                    <span>{paymentMethod === 'ONLINE' ? 'المتابعة للدفع 💳' : 'تأكيد وشراء الآن ✨'}</span>
                  </>
                )}
              </button>
            </>
          )}
          {step === 4 && <button className="ec-btn ec-btn-primary" style={{ width: '100%' }} onClick={onClose}>العودة للمتجر</button>}
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
