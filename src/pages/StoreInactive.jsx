import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import ModalContainer from '../components/common/ModalContainer';
import '../styles/pages/StoreInactivePremium.css';

const PACKAGES = [
  { name: 'باقة 1 شهر', months: 1, price: 399 },
  { name: 'باقة سنة كاملة', months: 12, price: 3999 }
];

const StoreInactive = () => {
  const navigate = useNavigate();
  const { toast } = useGlobalUI ? useGlobalUI() : { toast: console.log };
  
  // Status check states
  const [loading, setLoading] = useState(false);
  const [reasonCode, setReasonCode] = useState('SHOP_DISABLED');
  const [reasonMsg, setReasonMsg] = useState('عذراً، هذا المتجر غير نشط حالياً. يرجى التواصل مع الإدارة.');
  
  // Subscription requests states
  const [myRequests, setMyRequests] = useState([]);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [lastRejectedRequest, setLastRejectedRequest] = useState(null);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [globalConfig, setGlobalConfig] = useState(null);

  // Form modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(PACKAGES[0]);
  const [paymentMethod, setPaymentMethod] = useState('VODAFONE_CASH'); // VODAFONE_CASH or INSTAPAY
  const [senderDetail, setSenderDetail] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Read stored reasons from localStorage if available
    const storedCode = localStorage.getItem('inactive_reason_code');
    const storedMsg = localStorage.getItem('inactive_reason_msg');
    
    if (storedCode) setReasonCode(storedCode);
    if (storedMsg) setReasonMsg(storedMsg);
    
    // Redirect Super Admin
    if (Api.isSuperAdmin()) {
      window.location.href = '/super-admin/subscriptions';
      return;
    }

    Api.getGlobalConfig().then(setGlobalConfig).catch(console.error);
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoadingRequests(true);
    try {
      const requests = await Api.getMySubscriptionRequests();
      setMyRequests(requests);
      
      // Find any PENDING request
      const pending = requests.find(r => r.status === 'PENDING');
      setPendingRequest(pending || null);

      // Find last REJECTED request
      const rejected = requests.find(r => r.status === 'REJECTED');
      setLastRejectedRequest(rejected || null);
    } catch (err) {
      console.error('Failed to load my subscription requests', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleRefreshStatus = async () => {
    setLoading(true);
    try {
      const tenantInfo = await Api.getCurrentTenantDetails();
      
      const now = new Date();
      const isExpired = tenantInfo.subscriptionExpiry 
        ? new Date(tenantInfo.subscriptionExpiry) < now 
        : true;
      
      if (tenantInfo.active && !isExpired) {
        toast('تم تفعيل حساب متجرك بنجاح! يتم توجيهك الآن... 🎉', 'success');
        
        localStorage.removeItem('inactive_reason_code');
        localStorage.removeItem('inactive_reason_msg');
        
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        if (!tenantInfo.active) {
          setReasonCode('SHOP_DISABLED');
          setReasonMsg('عذراً، هذا المتجر غير نشط حالياً. يرجى التواصل مع الإدارة.');
        } else if (isExpired) {
          setReasonCode('SUBSCRIPTION_EXPIRED');
          setReasonMsg('انتهت صلاحية الاشتراك. يرجى التجديد للمتابعة.');
        }
        
        toast('حالة المتجر لم تتغير بعد. يرجى التواصل مع الإدارة أو إرسال إثبات دفع التجديد.', 'warning');
        loadRequests(); // Refresh request list in case admin processed a request
      }
    } catch (err) {
      toast(err.message || 'خطأ في التحقق من حالة الاشتراك', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handleSubmitSubscription = async (e) => {
    e.preventDefault();
    if (!senderDetail.trim()) {
      toast('يرجى كتابة رقم الهاتف المحول منه أو اسم حساب InstaPay', 'error');
      return;
    }
    if (!receiptFile) {
      toast('يرجى إرفاق صورة إيصال التحويل (Screenshot)', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await Api.submitSubscriptionRequest({
        packageName: selectedPackage.name,
        durationMonths: selectedPackage.months,
        amount: selectedPackage.price,
        paymentMethod,
        senderDetail,
        receiptFile
      });

      toast('تم إرسال طلب التجديد بنجاح! جاري مراجعته من قبل الإدارة. 🎉', 'success');
      setShowModal(false);
      
      // Reset form fields
      setSenderDetail('');
      setReceiptFile(null);
      
      navigate('/subscription-success');
    } catch (err) {
      toast(err.message || 'فشل في إرسال طلب التجديد', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await Api.logout();
    } catch (err) {
      Api._clearTokens();
      window.location.href = '/login';
    }
  };

  const isExpired = reasonCode === 'SUBSCRIPTION_EXPIRED';
  const stateClass = isExpired ? 'si-state-expired' : 'si-state-disabled';

  return (
    <div className={`si-wrapper ${stateClass}`}>
      <div className="si-card">
        {/* Pulsing Status Icon */}
        <div className="si-icon-container">
          <div className="si-icon-pulse"></div>
          <div className="si-icon-bg"></div>
          <div className="si-icon-main">{isExpired ? '📅' : '⛔'}</div>
        </div>

        {/* Status Badge */}
        <span className="si-badge">
          {isExpired ? 'اشتراك منتهي الصلاحية' : 'المتجر غير نشط حالياً'}
        </span>

        {/* Title */}
        <h1 className="si-title">
          {isExpired ? 'انتهت فترة صلاحية الاشتراك' : 'تنبيه: حساب المتجر غير نشط'}
        </h1>

        {/* Description Message */}
        <p className="si-desc">{reasonMsg}</p>

        {/* Dynamic Subscription Status Notice */}
        {pendingRequest ? (
          <div className="si-status-notice si-notice-pending">
            <span className="si-notice-icon">⏳</span>
            <div className="si-notice-text">
              <h4>طلب التجديد قيد المراجعة</h4>
              <p>
                تم إرسال إثبات الدفع لـ <strong>{pendingRequest.packageName}</strong> ({pendingRequest.amount} ج) عبر <strong>{pendingRequest.paymentMethod === 'VODAFONE_CASH' ? 'فودافون كاش' : 'انستا باي'}</strong>. جاري مراجعة التحويل حالياً وتفعيل حسابك.
              </p>
            </div>
          </div>
        ) : lastRejectedRequest ? (
          <div className="si-status-notice si-notice-rejected">
            <span className="si-notice-icon">❌</span>
            <div className="si-notice-text">
              <h4>تم رفض طلب التجديد الأخير</h4>
              <p>
                السبب: <strong style={{ color: '#ef4444' }}>{lastRejectedRequest.rejectReason}</strong>
              </p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                يرجى تعديل البيانات وإعادة تقديم الطلب بإيصال صحيح.
              </p>
            </div>
          </div>
        ) : null}

        {/* Actions Group */}
        <div className="si-actions">
          {pendingRequest ? (
            <button 
              className="si-btn si-btn-primary" 
              onClick={handleRefreshStatus} 
              disabled={loading}
            >
              {loading ? <span className="si-spinner"></span> : '🔄'}
              {loading ? 'جاري التحقق...' : 'تحديث والتحقق من التفعيل الآن'}
            </button>
          ) : (
            <button 
              className="si-btn si-btn-primary" 
              onClick={() => setShowModal(true)} 
              disabled={loadingRequests}
            >
              💳 طلب تجديد الاشتراك وتفعيل المتجر
            </button>
          )}

          {!pendingRequest && (
            <button 
              className="si-btn si-btn-ghost" 
              onClick={handleRefreshStatus}
              disabled={loading}
              style={{ marginBottom: '0.5rem' }}
            >
              {loading ? <span className="si-spinner"></span> : '🔄'}
              التحقق من التفعيل المباشر
            </button>
          )}
          
          <button 
            className="si-btn si-btn-ghost" 
            onClick={handleLogout}
            disabled={loading}
          >
            🚪 تسجيل الخروج من الحساب
          </button>
        </div>

        {/* Support & Contact Footer */}
        <div className="si-support-info">
          <p>للمساعدة الفنية الفورية وتسهيل التفعيل:</p>
          <div className="si-support-links">
            {globalConfig?.supportPhone && (
              <a href={`tel:${globalConfig.supportPhone}`} className="si-support-link">📞 اتصل بنا</a>
            )}
            <a 
              href={`https://wa.me/${(globalConfig?.supportPhone || '201000000000').replace(/\D/g, '')}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="si-support-link"
            >
              💬 واتساب الدعم
            </a>
          </div>
        </div>
      </div>

      {/* Manual Subscription Form Modal */}
      {showModal && (
        <ModalContainer>
          <div className="sa-sub-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="sa-sub-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', borderRadius: '20px' }}>
              <div className="sa-sub-modal-header" style={{ paddingBottom: '1.25rem' }}>
                <h3>💳 طلب تجديد الاشتراك وتفعيل المتجر</h3>
                <button className="sa-sub-modal-close" onClick={() => setShowModal(false)}>
                  ✕
                </button>
              </div>
              <form onSubmit={handleSubmitSubscription}>
                <div className="sa-sub-modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', padding: '1.5rem' }}>
                  
                  {/* Instructions Card */}
                  <div className="si-instructions-card">
                    <h4>📱 تعليمات التحويل والدفع:</h4>
                    <ul>
                      <li>فودافون كاش: <strong>{globalConfig?.vodafoneCashNumber || '01012345678'}</strong></li>
                      <li>انستا باي: <strong>{globalConfig?.instapayAddress || 'pos@instapay'}</strong></li>
                      <li style={{ color: '#ef4444', fontWeight: 'bold' }}>يرجى أخذ لقطة شاشة للتحويل (Screenshot) لرفعها كإثبات.</li>
                    </ul>
                  </div>

                  {/* 1. Package Select */}
                  <div className="sa-sub-form-group" style={{ marginBottom: '1.25rem' }}>
                    <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>اختر باقة الاشتراك المناسبة:</label>
                    <div className="si-package-grid">
                      {PACKAGES.map((pkg) => (
                        <div 
                          key={pkg.months} 
                          className={`si-package-card ${selectedPackage.months === pkg.months ? 'active' : ''}`}
                          onClick={() => setSelectedPackage(pkg)}
                        >
                          <div className="si-pkg-name">{pkg.name}</div>
                          <div className="si-pkg-price">{pkg.price} ج.م</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 2. Payment Method Select */}
                  <div className="sa-sub-form-group" style={{ marginBottom: '1.25rem' }}>
                    <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>طريقة الدفع المستخدمة:</label>
                    <div className="sa-sub-extend-type-group" style={{ margin: 0 }}>
                      <button
                        type="button"
                        className={`sa-sub-extend-type-btn ${paymentMethod === 'VODAFONE_CASH' ? 'active' : ''}`}
                        onClick={() => setPaymentMethod('VODAFONE_CASH')}
                        style={{ width: '50%' }}
                      >
                        🔴 فودافون كاش
                      </button>
                      <button
                        type="button"
                        className={`sa-sub-extend-type-btn ${paymentMethod === 'INSTAPAY' ? 'active' : ''}`}
                        onClick={() => setPaymentMethod('INSTAPAY')}
                        style={{ width: '50%' }}
                      >
                        ⚡ انستا باي
                      </button>
                    </div>
                  </div>

                  {/* 3. Sender Phone/Username */}
                  <div className="sa-sub-form-group" style={{ marginBottom: '1.25rem' }}>
                    <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>
                      {paymentMethod === 'VODAFONE_CASH' 
                        ? 'رقم الهاتف الذي قمت بالتحويل منه:' 
                        : 'معرف انستا باي أو الاسم المحول منه:'}
                    </label>
                    <input
                      className="sa-sub-form-input"
                      type="text"
                      required
                      placeholder={paymentMethod === 'VODAFONE_CASH' ? 'مثال: 010XXXXXXXX' : 'مثال: name@instapay'}
                      value={senderDetail}
                      onChange={(e) => setSenderDetail(e.target.value)}
                    />
                  </div>

                  {/* 4. Screenshot Upload */}
                  <div className="sa-sub-form-group" style={{ marginBottom: '0.5rem' }}>
                    <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>صورة إيصال التحويل (Screenshot):</label>
                    <input
                      type="file"
                      required
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                      id="si-file-input"
                    />
                    <label htmlFor="si-file-input" className="si-file-label">
                      <span className="si-file-icon">📸</span>
                      <span className="si-file-text">
                        {receiptFile ? receiptFile.name : 'اختر صورة الإيصال أو اسحبها هنا'}
                      </span>
                    </label>
                  </div>

                </div>
                <div className="sa-sub-modal-footer" style={{ padding: '1.25rem 1.5rem' }}>
                  <button 
                    type="button" 
                    className="sa-sub-btn-ghost" 
                    onClick={() => setShowModal(false)}
                    disabled={submitting}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="sa-sub-btn-primary"
                    disabled={submitting}
                  >
                    {submitting && <span className="sa-sub-spinner"></span>}
                    {submitting ? 'جاري إرسال الطلب...' : 'إرسال طلب التفعيل'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default StoreInactive;
