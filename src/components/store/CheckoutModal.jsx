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

  const handleNextToPayment = () => {
    if (!form.customerName || !form.customerPhone || !form.customerAddress) {
      return setError('يرجى ملء جميع الحقول المطلوبة');
    }
    setError('');
    setStep(2);
  };

  const handleNextToReview = () => {
    setError('');
    setStep(3);
  };

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
        onSuccess?.(); // تفريغ السلة فوراً هنا قبل التوجيه
        window.location.href = orderData.stripeCheckoutUrl;
        return;
      }

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
      <div className="ec-modal-premium">
        <div className="ec-modal-header-premium">
          <h3>
            {step === 4 ? 'تم إرسال طلبك' : 'إتمام الطلب'}
          </h3>
          <button className="ec-modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        {step < 4 && (
          <div className="ec-checkout-stepper">
            <div className={`ec-step-item ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>
              <div className="ec-step-dot">
                {step > 1 ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                ) : 1}
              </div>
              <span>البيانات</span>
            </div>
            <div className="ec-step-line" />
            <div className={`ec-step-item ${step >= 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}`}>
              <div className="ec-step-dot">
                {step > 2 ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                ) : 2}
              </div>
              <span>الدفع</span>
            </div>
            <div className="ec-step-line" />
            <div className={`ec-step-item ${step >= 3 ? 'active' : ''}`}>
              <div className="ec-step-dot">3</div>
              <span>المراجعة</span>
            </div>
          </div>
        )}

        <div className="ec-modal-body">
          {step === 1 && (
            <div className="ec-checkout-section ec-animate-in">
              {storeCustomer && (
                <div className="ec-user-welcome-badge">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  <span>مرحباً <strong>{storeCustomer.name.split(' ')[0]}</strong>، سنستخدم بياناتك المسجلة.</span>
                </div>
              )}
              <div className="ec-form-row">
                <div className="ec-form-group">
                  <label>الاسم الكامل *</label>
                  <div className="ec-input-with-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    <input value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} placeholder="مثال: أحمد محمد" />
                  </div>
                </div>
              </div>
              <div className="ec-form-row">
                <div className="ec-form-group">
                  <label>رقم الهاتف *</label>
                  <div className="ec-input-with-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    <input value={form.customerPhone} onChange={e => setForm({...form, customerPhone: e.target.value})} placeholder="01xxxxxxxxx" />
                  </div>
                </div>
              </div>
              <div className="ec-form-row">
                <div className="ec-form-group">
                  <label>العنوان بالتفصيل *</label>
                  <div className="ec-input-with-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    <textarea value={form.customerAddress} onChange={e => setForm({...form, customerAddress: e.target.value})} placeholder="المدينة، الشارع، المبنى..." rows={2} />
                  </div>
                </div>
              </div>
              <div className="ec-form-row">
                <div className="ec-form-group">
                  <label>ملاحظات إضافية</label>
                  <div className="ec-input-with-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="أي تعليمات خاصة للتوصيل..." rows={1} />
                  </div>
                </div>
              </div>
              {error && <div className="ec-checkout-error">{error}</div>}
            </div>
          )}

          {step === 2 && (
            <div className="ec-checkout-section ec-animate-in">
              <div className="ec-payment-header">
                <h4>اختر طريقة الدفع</h4>
                <p>دفع آمن وسريع لضمان وصول طلبك</p>
              </div>

              <div className="ec-modern-payment-grid">
                <button
                  className={`ec-payment-card ${paymentMethod === 'COD' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('COD')}
                >
                  <div className="ec-payment-check">
                    <div className="ec-check-inner" />
                  </div>
                  <div className="ec-payment-icon-box">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                  </div>
                  <div className="ec-payment-texts">
                    <strong>الدفع عند الاستلام</strong>
                    <span>ادفع نقداً عند باب منزلك</span>
                  </div>
                </button>

                <button
                  className={`ec-payment-card ${paymentMethod === 'ONLINE' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('ONLINE')}
                >
                  <div className="ec-payment-check">
                    <div className="ec-check-inner" />
                  </div>
                  <div className="ec-payment-icon-box">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                  </div>
                  <div className="ec-payment-texts">
                    <strong>الدفع بالبطاقة</strong>
                    <span>فيزا وماستركارد - دفع آمن</span>
                  </div>
                  {paymentMethod === 'ONLINE' && (
                    <span className="ec-card-secure-tag">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    </span>
                  )}
                </button>
              </div>

              {paymentMethod === 'ONLINE' && (
                <div className="ec-payment-trust-card">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  <div>
                    <strong>دفع مشفر وآمن</strong>
                    <p>سيتم توجيهك لبوابة الدفع (Stripe) لإتمام العملية بشكل آمن.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="ec-checkout-section ec-animate-in">
              <div className="ec-review-summary-grid">
                <div className="ec-review-group">
                  <h5>بيانات التوصيل</h5>
                  <div className="ec-review-detail">
                    <p><span>الاسم:</span> {form.customerName}</p>
                    <p><span>الهاتف:</span> {form.customerPhone}</p>
                    <p><span>العنوان:</span> {form.customerAddress}</p>
                  </div>
                </div>
                
                <div className="ec-review-group">
                  <h5>طريقة الدفع</h5>
                  <div className="ec-review-detail">
                    <p>{paymentMethod === 'ONLINE' ? 'الدفع بالبطاقة (Stripe)' : 'الدفع نقداً عند الاستلام'}</p>
                  </div>
                </div>

                <div className="ec-review-group">
                  <h5>ملخص المنتجات</h5>
                  <div className="ec-review-items">
                    {cart.map(i => (
                      <div key={i.id} className="ec-review-item-row">
                        <img 
                          src={i.image || (i.imageUrls && i.imageUrls[0]) || '/placeholder.png'} 
                          alt={i.name} 
                          className="ec-review-item-img" 
                          onError={(e) => { e.target.src = '/placeholder.png'; }}
                        />
                        <div className="ec-review-item-info">
                          <span className="ec-review-item-name">{i.name}</span>
                          <span className="ec-review-item-qty">الكمية: {i.qty}</span>
                        </div>
                        <strong className="ec-review-item-price">{(i.price * i.qty).toLocaleString()} {currency}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="ec-review-total-premium">
                    <span>الإجمالي النهائي</span>
                    <strong>{total.toLocaleString()} {currency}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && orderResult && (
            <div className="ec-order-done-premium ec-animate-in">
              <div className="ec-success-ring">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h2>شكراً لطلبك!</h2>
              <p>لقد استلمنا طلبك بنجاح. نقوم حالياً بمراجعته وسنقوم بالتواصل معك قريباً لتأكيد التوصيل.</p>
              
              <div className="ec-done-order-id">
                <span>رقم الطلب الخاص بك</span>
                <strong>{orderResult.orderNumber}</strong>
              </div>

              <div className="ec-done-tip">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                <span>يمكنك تتبع حالة الطلب من القائمة الرئيسية لاحقاً.</span>
              </div>
            </div>
          )}
        </div>

        <div className="ec-modal-footer-premium">
          {step === 1 && (
            <button className="ec-btn-black-premium w-full" onClick={handleNextToPayment}>
              المتابعة لطريقة الدفع
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"></path></svg>
            </button>
          )}
          {step === 2 && (
            <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
              <button className="ec-btn-ghost-premium" onClick={() => setStep(1)}>رجوع</button>
              <button className="ec-btn-black-premium flex-1" onClick={handleNextToReview}>
                المتابعة للمراجعة
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"></path></svg>
              </button>
            </div>
          )}
          {step === 3 && (
            <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
              <button className="ec-btn-ghost-premium" onClick={() => setStep(2)} disabled={loading}>رجوع</button>
              <button className="ec-btn-black-premium flex-1" onClick={handleSubmit} disabled={loading}>
                {loading ? 'جاري الإرسال...' : (paymentMethod === 'ONLINE' ? 'المتابعة للدفع أونلاين' : 'تأكيد وشراء الآن')}
              </button>
            </div>
          )}
          {step === 4 && <button className="ec-btn-black-premium w-full" onClick={onClose}>العودة للمتجر</button>}
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
