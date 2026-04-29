import React, { useState } from 'react';
import StoreApi from '../../services/storeApi';
import { useStore } from '../../context/StoreContext';
import { useStoreAuth } from '../../context/StoreAuthContext';
import * as fbPixel from '../../services/fbPixel';

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
    if (isOpen && cart.length > 0) {
      fbPixel.trackInitiateCheckout(cart, cart.reduce((s, i) => s + i.price * i.qty, 0));
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
        items: cart.map(i => ({ productId: i.id, quantity: i.qty, appliedOfferId: i.appliedOfferId }))
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
      fbPixel.trackPurchase(orderData, total);
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
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        {step < 4 && (
          <div className="ec-checkout-stepper">
            <div className={`ec-step-item ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>
              <div className="ec-step-dot">
                {step > 1 ? (
                  <i className="fas fa-check" style={{ fontSize: '0.8rem', color: '#fff' }}></i>
                ) : 1}
              </div>
              <span>البيانات</span>
            </div>
            <div className="ec-step-line" />
            <div className={`ec-step-item ${step >= 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}`}>
              <div className="ec-step-dot">
                {step > 2 ? (
                  <i className="fas fa-check" style={{ fontSize: '0.8rem', color: '#fff' }}></i>
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
                  <i className="fas fa-user-circle" style={{ marginLeft: '8px' }}></i>
                  <span>مرحباً <strong>{storeCustomer.name.split(' ')[0]}</strong>، سنستخدم بياناتك المسجلة.</span>
                </div>
              )}
              <div className="ec-form-row">
                <div className="ec-form-group">
                  <label>الاسم الكامل *</label>
                  <div className="ec-input-with-icon">
                    <i className="fas fa-user"></i>
                    <input value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} placeholder="مثال: أحمد محمد" />
                  </div>
                </div>
              </div>
              <div className="ec-form-row">
                <div className="ec-form-group">
                  <label>رقم الهاتف *</label>
                  <div className="ec-input-with-icon">
                    <i className="fas fa-phone-alt"></i>
                    <input value={form.customerPhone} onChange={e => setForm({...form, customerPhone: e.target.value})} placeholder="01xxxxxxxxx" />
                  </div>
                </div>
              </div>
              <div className="ec-form-row">
                <div className="ec-form-group">
                  <label>العنوان بالتفصيل *</label>
                  <div className="ec-input-with-icon">
                    <i className="fas fa-map-marker-alt"></i>
                    <textarea value={form.customerAddress} onChange={e => setForm({...form, customerAddress: e.target.value})} placeholder="المدينة، الشارع، المبنى..." rows={2} />
                  </div>
                </div>
              </div>
              <div className="ec-form-row">
                <div className="ec-form-group">
                  <label>ملاحظات إضافية</label>
                  <div className="ec-input-with-icon">
                    <i className="fas fa-edit"></i>
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
                    <i className="fas fa-money-bill-wave"></i>
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
                    <i className="fas fa-credit-card"></i>
                  </div>
                  <div className="ec-payment-texts">
                    <strong>الدفع بالبطاقة</strong>
                    <span>فيزا وماستركارد - دفع آمن</span>
                  </div>
                  {paymentMethod === 'ONLINE' && (
                    <span className="ec-card-secure-tag">
                      <i className="fas fa-lock"></i>
                    </span>
                  )}
                </button>
              </div>

              {paymentMethod === 'ONLINE' && (
                <div className="ec-payment-trust-card">
                  <i className="fas fa-shield-alt"></i>
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
                <i className="fas fa-check"></i>
              </div>
              <h2>شكراً لطلبك!</h2>
              <p>لقد استلمنا طلبك بنجاح. نقوم حالياً بمراجعته وسنقوم بالتواصل معك قريباً لتأكيد التوصيل.</p>
              
              <div className="ec-done-order-id">
                <span>رقم الطلب الخاص بك</span>
                <strong>{orderResult.orderNumber}</strong>
              </div>

              <div className="ec-done-tip">
                <i className="fas fa-info-circle"></i>
                <span>يمكنك تتبع حالة الطلب من القائمة الرئيسية لاحقاً.</span>
              </div>
            </div>
          )}
        </div>

        <div className="ec-modal-footer-premium">
          {step === 1 && (
            <button className="ec-btn-black-premium w-full" onClick={handleNextToPayment}>
              المتابعة لطريقة الدفع
              <i className="fas fa-arrow-left" style={{ marginRight: '8px' }}></i>
            </button>
          )}
          {step === 2 && (
            <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
              <button className="ec-btn-ghost-premium" onClick={() => setStep(1)}>رجوع</button>
              <button className="ec-btn-black-premium flex-1" onClick={handleNextToReview}>
                المتابعة للمراجعة
                <i className="fas fa-arrow-left" style={{ marginRight: '8px' }}></i>
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
