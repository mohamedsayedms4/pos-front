import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Api from '../services/api';
import Loader from '../components/common/Loader';
import { useBranch } from '../context/BranchContext';
import { useGlobalUI } from '../components/common/GlobalUI';
import ModalContainer from '../components/common/ModalContainer';
import SalesAnalytics from './SalesAnalytics';
import Purchases from './Purchases';
import Returns from './Returns';
import ProfitLoss from './ProfitLoss';
import Customers from './Customers';
import Expenses from './Expenses';
import OnboardingDashboard from './OnboardingDashboard';
import '../styles/pages/StoreInactivePremium.css';
import { Joyride, STATUS } from 'react-joyride';

const AutoStartBeacon = () => {
    const beaconRef = React.useRef(null);
    React.useEffect(() => {
        if (beaconRef.current && beaconRef.current.parentElement) {
            beaconRef.current.parentElement.click();
        }
    }, []);
    return <span ref={beaconRef} style={{ display: 'none' }} />;
};

const PACKAGES = [
  { name: 'باقة 1 شهر', months: 1, price: 399 },
  { name: 'باقة سنة كاملة', months: 12, price: 3999 }
];

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { selectedBranchId: globalBranchId } = useBranch();
  const [user, setUser] = useState(Api._getUser());
  const [tenantInfo, setTenantInfo] = useState(null);
  const [copied, setCopied] = useState(false);
  const [counts, setCounts] = useState({
    branches: 0,
    sales: 0,
    purchases: 0,
    customers: 0,
    suppliers: 0,
    products: 0,
    expenses: 0,
    receipts: 0
  });

  const { toast } = useGlobalUI ? useGlobalUI() : { toast: console.log };
  const [showModal, setShowModal] = useState(false);
  const [latestApp, setLatestApp] = useState(null);
  const [showDesktopBanner, setShowDesktopBanner] = useState(!localStorage.getItem('pos_hide_desktop_banner'));
  const [selectedPackage, setSelectedPackage] = useState(PACKAGES[0]);
  const [paymentMethod, setPaymentMethod] = useState('VODAFONE_CASH');
  const [senderDetail, setSenderDetail] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [globalConfig, setGlobalConfig] = useState(null);
  const [onboardingStatus, setOnboardingStatus] = useState(null);
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    if (onboardingStatus?.completed && !localStorage.getItem('tour_dashboard_v3')) {
      setTimeout(() => {
        setRunTour(true);
        localStorage.setItem('tour_dashboard_v3', 'true');
      }, 1500);
    }
  }, [onboardingStatus]);

  const handleJoyrideCallback = (data) => {
    const { status, type } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
    
    if (finishedStatuses.includes(status) || type === 'tour:end') {
        setRunTour(false);
        localStorage.setItem('tour_dashboard_v3', 'true');
    }
  };

  const tourSteps = [
    {
      target: '.tour-dashboard-store',
      content: 'من هنا يمكنك نسخ رابط المتجر الخاص بك لمشاركته مع عملائك أو موظفيك بسهولة.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-dashboard-pos',
      content: 'هذا هو اختصارك السريع للدخول إلى شاشة الكاشير (نقطة البيع) للبدء في إصدار الفواتير.',
      placement: 'bottom',
    },
    {
      target: '.tour-dashboard-tabs',
      content: 'تتيح لك هذه التبويبات التنقل بين الإحصائيات المختلفة (مبيعات، مشتريات، أرباح، وغيرها) لمتابعة أداء عملك.',
      placement: 'bottom',
    },
    {
      target: '.tour-dashboard-shortcuts',
      content: 'هنا تجد اختصارات سريعة لجميع أقسام النظام المهمة للوصول إليها بنقرة واحدة.',
      placement: 'top',
    }
  ];

  const loadRequests = async () => {
    try {
      const requests = await Api.getMySubscriptionRequests();
      setMyRequests(requests);
      const pending = requests.find(r => r.status === 'PENDING');
      setPendingRequest(pending || null);
    } catch (err) {
      console.error('Failed to load subscription requests', err);
    }
  };

  const loadOnboardingStatus = async () => {
    try {
      const res = await Api.get('/onboarding/status');
      setOnboardingStatus(res.data);
      localStorage.setItem('onboardingStatus', JSON.stringify(res.data));
    } catch (err) {
      console.error('Failed to load onboarding status:', err);
      // Fallback so it doesn't block the dashboard from loading
      const cached = localStorage.getItem('onboardingStatus');
      if (cached) {
        try {
          setOnboardingStatus(JSON.parse(cached));
        } catch(e) {
          setOnboardingStatus({ completed: true });
        }
      } else {
        setOnboardingStatus({ completed: true }); // Default to completed if there's an error and no cache
      }
    }
  };

  useEffect(() => {
    Api.getCurrentTenantDetails()
      .then(res => {
        if (res) setTenantInfo(res);
      })
      .catch(err => console.error('Error fetching tenant details:', err));
      
    Api.getLatestDesktopApp().then(setLatestApp).catch(() => {});
    Api.getGlobalConfig().then(setGlobalConfig).catch(() => {});

    loadRequests();
    loadOnboardingStatus();
  }, []);

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const loadCounts = async () => {
      if (!isOnline) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [
          branchCount,
          saleCount,
          purchaseCount,
          customerCount,
          supplierCount,
          productCount,
          expenseCount,
          debtCount
        ] = await Promise.all([
          Api.getBranchesCount().catch(() => 0),
          Api.getSalesCount(globalBranchId).catch(() => 0),
          Api.getPurchasesCount(globalBranchId).catch(() => 0),
          Api.getCustomersCount(globalBranchId).catch(() => 0),
          Api.getSuppliersCount(globalBranchId).catch(() => 0),
          Api.getProductsCount(globalBranchId).catch(() => 0),
          Api.getExpensesCount(globalBranchId).catch(() => 0),
          Api.getDebtsCount(globalBranchId).catch(() => 0)
        ]);

        setCounts({
          branches: branchCount || 0,
          sales: saleCount || 0,
          purchases: purchaseCount || 0,
          customers: customerCount || 0,
          suppliers: supplierCount || 0,
          products: productCount || 0,
          expenses: expenseCount || 0,
          receipts: debtCount || 0
        });
      } catch (err) {
        console.error('Error loading dashboard counts:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCounts();
  }, [globalBranchId]);

  const getBaseDomain = () => {
    if (window.location.hostname === 'localhost') return 'seggelerp.com';
    const parts = window.location.hostname.split('.');
    if (parts.length >= 3 && parts[0] !== 'www') {
      return parts.slice(1).join('.') + (window.location.port ? ':' + window.location.port : '');
    }
    return window.location.host;
  };

  const storeUrl = tenantInfo
    ? `https://${tenantInfo.slug}.${getBaseDomain()}/login`
    : '';

  const handleCopyLink = () => {
    if (!storeUrl) return;
    navigator.clipboard.writeText(storeUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => console.error('Failed to copy text: ', err));
  };

  const handleManageSubscription = () => {
    if (pendingRequest) {
      toast('لديك طلب تجديد قيد المراجعة حالياً بالفعل. يرجى الانتظار لحين مراجعته وتفعيله. ⏳', 'warning');
    } else {
      setShowModal(true);
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
      
      // Reset form
      setSenderDetail('');
      setReceiptFile(null);
      
      navigate('/subscription-success');
    } catch (err) {
      toast(err.message || 'فشل في إرسال طلب التجديد', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateArabic = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const isExpired = tenantInfo?.subscriptionExpiry 
    ? new Date(tenantInfo.subscriptionExpiry) < new Date() 
    : false;

  if (loading || onboardingStatus === null) {
    return <Loader message="جاري التحميل..." />;
  }

  if (onboardingStatus && !onboardingStatus.completed) {
    return <OnboardingDashboard status={onboardingStatus} reloadStatus={loadOnboardingStatus} />;
  }

  return (
    <div className="page-section">
      {runTour && (
        <Joyride
            steps={tourSteps}
            run={runTour}
            beaconComponent={AutoStartBeacon}
            continuous={true}
            showProgress={true}
            showSkipButton={true}
            disableOverlayClose={true}
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    primaryColor: '#6A00FF',
                    backgroundColor: 'var(--bg-card, #ffffff)',
                    textColor: 'var(--text-main, #333333)',
                    arrowColor: 'var(--bg-card, #ffffff)',
                    zIndex: 9999999,
                },
                tooltipContainer: { textAlign: 'right' },
                buttonNext: { outline: 'none', fontFamily: 'Cairo, sans-serif', padding: '6px 16px', borderRadius: '6px' },
                buttonBack: { marginLeft: 15, marginRight: 0, outline: 'none', fontFamily: 'Cairo, sans-serif', color: 'var(--text-muted, #666)' }
            }}
            locale={{ back: 'السابق', close: 'إغلاق', last: 'إنهاء', next: 'التالي', skip: 'تخطي' }}
        />
      )}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes drift {
          0% {
            transform: translate(0, 0) rotate(0deg);
          }
          50% {
            transform: translate(8%, 8%) rotate(180deg);
          }
          100% {
            transform: translate(0, 0) rotate(360deg);
          }
        }

        .subscription-banner-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(-45deg, var(--metro-indigo, #6A00FF), var(--metro-purple, #881798), #b624a9, var(--metro-indigo, #6A00FF));
          background-size: 400% 400%;
          animation: gradientShift 15s ease infinite;
          border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.05));
          padding: 24px 30px;
          margin-bottom: 30px;
          color: #ffffff;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }

        .subscription-banner-card::before {
          content: "";
          position: absolute;
          top: -40%;
          left: -40%;
          width: 140%;
          height: 140%;
          background: radial-gradient(circle at 30% 30%, rgba(255, 0, 128, 0.35) 0%, rgba(106, 0, 255, 0) 60%);
          animation: drift 20s alternate infinite ease-in-out;
          z-index: 1;
          pointer-events: none;
        }

        .subscription-banner-card::after {
          content: "";
          position: absolute;
          bottom: -40%;
          right: -40%;
          width: 140%;
          height: 140%;
          background: radial-gradient(circle at 70% 70%, rgba(0, 242, 254, 0.25) 0%, rgba(136, 23, 152, 0) 60%);
          animation: drift 25s alternate-reverse infinite ease-in-out;
          z-index: 1;
          pointer-events: none;
        }

        [data-theme='light'] .subscription-banner-card {
          background: linear-gradient(-45deg, #4f46e5, #7c3aed, #ec4899, #4f46e5);
          background-size: 400% 400%;
          animation: gradientShift 15s ease infinite;
          border-color: #e2e8f0;
        }

        .sub-banner-right {
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-align: right;
          z-index: 2;
        }

        .sub-banner-greeting {
          font-family: 'Cairo', sans-serif;
          font-size: 1.8rem;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        .sub-banner-plan {
          font-family: 'Cairo', sans-serif;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .plan-badge {
          background: rgba(255, 255, 255, 0.2);
          padding: 2px 10px;
          font-size: 0.9rem;
          font-weight: 600;
          border-radius: 0;
          border: 1px solid rgba(255, 255, 255, 0.4);
        }

        .sub-banner-dates {
          font-family: 'Cairo', sans-serif;
          font-size: 0.95rem;
          color: rgba(255, 255, 255, 0.85);
          display: flex;
          gap: 15px;
          align-items: center;
          flex-wrap: wrap;
          margin-top: 4px;
        }

        .date-highlight {
          color: #ffffff;
          font-weight: 700;
        }

        .date-separator {
          color: rgba(255, 255, 255, 0.4);
          margin: 0 4px;
        }

        .sub-banner-left {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: flex-end;
          z-index: 2;
        }

        .store-link-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 320px;
          max-width: 100%;
        }

        .store-link-label {
          font-family: 'Cairo', sans-serif;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.9);
          text-align: right;
        }

        .store-link-input-wrapper {
          display: flex;
          border: 1px solid rgba(255, 255, 255, 0.4);
          background: rgba(0, 0, 0, 0.2);
        }

        .store-link-input {
          flex: 1;
          background: transparent;
          border: none;
          padding: 8px 12px;
          color: #ffffff;
          font-family: monospace;
          font-size: 0.9rem;
          outline: none;
          text-align: left;
          direction: ltr;
        }

        .store-link-copy-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-right: 1px solid rgba(255, 255, 255, 0.4);
          color: #ffffff;
          padding: 0 15px;
          font-family: 'Cairo', sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .store-link-copy-btn:hover {
          background: rgba(255, 255, 255, 0.35);
        }

        .manage-sub-btn {
          background: #ffffff;
          color: #6A00FF;
          border: none;
          padding: 10px 20px;
          font-family: 'Cairo', sans-serif;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          width: fit-content;
        }

        [data-theme='light'] .manage-sub-btn {
          color: #4f46e5;
        }

        .manage-sub-btn:hover {
          background: rgba(255, 255, 255, 0.9);
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
        }

        .manage-sub-btn:active {
          transform: translateY(0);
        }

        /* ─── Dashboard Tabs styles ─── */
        .dashboard-tabs-container {
          margin-bottom: 24px;
          overflow-x: auto;
          scrollbar-width: none; /* Firefox */
        }
        
        .dashboard-tabs-container::-webkit-scrollbar {
          display: none; /* Safari & Chrome */
        }
        
        .dashboard-tabs {
          display: flex;
          gap: 12px;
          background: var(--bg-tile);
          border: 1px solid var(--border-subtle);
          padding: 8px 12px;
          border-radius: 40px;
          width: max-content;
          min-width: 100%;
          direction: rtl;
        }
        
        .tab-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 30px;
          text-decoration: none;
          color: var(--text-light);
          font-family: 'Cairo', sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        .tab-item:hover {
          color: var(--text-white);
          background: var(--bg-hover-tile);
        }
        
        .tab-item.active {
          background: rgba(106, 0, 255, 0.15);
          color: #a855f7;
          border: 1px solid rgba(106, 0, 255, 0.3);
        }
        
        [data-theme='light'] .tab-item.active {
          background: rgba(79, 70, 229, 0.1);
          color: #4f46e5;
          border-color: rgba(79, 70, 229, 0.2);
        }
        
        .tab-icon {
          font-size: 1.1rem;
          display: flex;
          align-items: center;
        }
        
        /* ─── Shortcut Grid styles ─── */
        .shortcut-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          direction: rtl;
          margin-bottom: 30px;
        }
        
        .shortcut-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--bg-tile);
          border: 1px solid var(--border-subtle);
          border-radius: 14px;
          padding: 20px 24px;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        
        .shortcut-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px -3px rgba(0, 0, 0, 0.1);
          border-color: var(--border-hover);
        }
        
        [data-theme='dark'] .shortcut-card:hover {
          box-shadow: 0 10px 20px -3px rgba(0, 0, 0, 0.4);
        }
        
        .shortcut-card-content {
          display: flex;
          flex-direction: column;
          gap: 6px;
          text-align: right;
        }
        
        .shortcut-title {
          font-family: 'Cairo', sans-serif;
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text-white);
        }
        
        .shortcut-subtitle {
          font-family: 'Cairo', sans-serif;
          font-size: 0.9rem;
          color: var(--text-muted);
          font-weight: 600;
        }
        
        .shortcut-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.4rem;
        }
        
        /* Brand Colors for Icons */
        .bg-blue-light {
          background: rgba(37, 99, 235, 0.1);
          color: #2563eb;
        }
        .bg-gold-light {
          background: rgba(245, 158, 11, 0.15);
          color: #d97706;
        }
        .bg-rose-light {
          background: rgba(225, 29, 72, 0.1);
          color: #e11d48;
        }
        .bg-purple-light {
          background: rgba(139, 92, 246, 0.1);
          color: #8b5cf6;
        }
        .bg-teal-light {
          background: rgba(13, 148, 136, 0.1);
          color: #0d9488;
        }
        .bg-violet-light {
          background: rgba(168, 85, 247, 0.1);
          color: #a855f7;
        }
        .bg-green-light {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        @media (max-width: 992px) {
          .subscription-banner-card {
            flex-direction: column;
            gap: 20px;
            align-items: stretch;
            padding: 20px;
          }
          
          .sub-banner-left {
            align-items: stretch;
          }
          
          .store-link-section {
            width: 100%;
          }
          
          .manage-sub-btn {
            width: 100%;
            text-align: center;
          }
          
          .shortcut-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (max-width: 576px) {
          .shortcut-grid {
            grid-template-columns: 1fr;
          }
        }
        
        /* POS Quick Start Banner */
        .pos-shortcut-banner {
          display: flex;
          justify-content: space-between;
          align-items: stretch;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          margin-bottom: 30px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
          direction: rtl;
        }

        [data-theme='dark'] .pos-shortcut-banner {
          background: #1e293b;
          border-color: #334155;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .pos-banner-right {
          flex: 1;
          padding: 30px 40px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          text-align: right;
          justify-content: center;
          z-index: 2;
        }

        .pos-banner-title-small {
          font-family: 'Cairo', sans-serif;
          font-size: 1.4rem;
          font-weight: 700;
          color: #475569;
          margin: 0;
        }

        [data-theme='dark'] .pos-banner-title-small {
          color: #94a3b8;
        }

        .pos-banner-title-large {
          font-family: 'Cairo', sans-serif;
          font-size: 2.2rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          line-height: 1.2;
        }

        [data-theme='dark'] .pos-banner-title-large {
          color: #f8fafc;
        }

        .pos-banner-desc {
          font-family: 'Cairo', sans-serif;
          font-size: 0.95rem;
          color: #64748b;
          margin: 12px 0 0 0;
          max-width: 600px;
          line-height: 1.6;
        }

        [data-theme='dark'] .pos-banner-desc {
          color: #94a3b8;
        }

        .pos-banner-left {
          width: 30%;
          min-width: 220px;
          background: #eef2ff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          border-right: 1px solid #e2e8f0;
          z-index: 2;
        }

        [data-theme='dark'] .pos-banner-left {
          background: #0f172a;
          border-right: 1px solid #334155;
        }

        .pos-banner-btn {
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 14px 32px;
          font-family: 'Cairo', sans-serif;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
        }

        .pos-banner-btn:hover {
          background: #1d4ed8;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.5);
        }

        .pos-banner-btn:active {
          transform: translateY(0);
        }

        @media (max-width: 768px) {
          .pos-shortcut-banner {
            flex-direction: column;
            align-items: stretch;
          }
          .pos-banner-left {
            width: 100%;
            border-right: none;
            border-top: 1px solid #e2e8f0;
            padding: 30px 20px;
          }
          [data-theme='dark'] .pos-banner-left {
            border-top: 1px solid #334155;
          }
          .pos-banner-right {
            padding: 24px 20px;
            text-align: center;
            align-items: center;
          }
          .pos-banner-title-large {
            font-size: 1.8rem;
          }
          .pos-banner-title-small {
            font-size: 1.2rem;
          }
          .pos-banner-desc {
            text-align: center;
          }
        }
      `}} />

      {/* Subscription Banner */}
      {tenantInfo && isOnline && (
        <div className="subscription-banner-card">
          <div className="sub-banner-right">
            <div className="sub-banner-greeting">
              أهلاً بك {user?.name || 'المستخدم'}، مرحباً بعودتك
            </div>
            <div className="sub-banner-plan">
              <span className="plan-label">الباقة الحالية :</span>
              <span 
                className="plan-badge" 
                style={tenantInfo?.packageName ? { 
                  background: 'rgba(255, 215, 0, 0.25)', 
                  borderColor: 'rgba(255, 215, 0, 0.6)', 
                  color: '#ffd700',
                  fontWeight: '700'
                } : {}}
              >
                {tenantInfo?.packageName 
                  ? `👑 ${tenantInfo.packageName} (نشطة)` 
                  : (isExpired ? '❌ المجانية (منتهية)' : '🎁 الفترة التجريبية (نشطة)')
                }
              </span>
            </div>
            <div className="sub-banner-dates">
              <span>تاريخ الإشتراك: <strong className="date-highlight">{formatDateArabic(tenantInfo?.subscriptionStartDate || user?.createdAt)}</strong></span>
              <span className="date-separator">|</span>
              <span>تاريخ الإنتهاء: <strong className="date-highlight">{formatDateArabic(tenantInfo?.subscriptionExpiry)}</strong></span>
            </div>
            {pendingRequest && (
              <div style={{
                marginTop: '12px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '6px 12px',
                fontSize: '0.9rem',
                color: '#fbbf24',
                fontFamily: 'Cairo, sans-serif',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                width: 'fit-content'
              }}>
                ⏳ طلب التجديد لـ ({pendingRequest.packageName}) قيد المراجعة حالياً.
              </div>
            )}
          </div>
          <div className="sub-banner-left">
            <div className="store-link-section tour-dashboard-store">
              <label className="store-link-label">رابط تسجيل دخول الموظفين / المتجر</label>
              <div className="store-link-input-wrapper">
                <input 
                  type="text" 
                  readOnly 
                  value={storeUrl} 
                  className="store-link-input"
                  onClick={(e) => e.target.select()}
                />
                <button 
                  onClick={handleCopyLink} 
                  className="store-link-copy-btn"
                >
                  {copied ? '✓ تم النسخ' : 'نسخ الرابط'}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="manage-sub-btn" onClick={handleManageSubscription}>
                إدارة إشتراكك ⚡
              </button>
              <button 
                className="manage-sub-btn" 
                onClick={() => navigate('/subscription-history')}
                style={{ opacity: 0.9, display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <i className="fas fa-history"></i> سجل الاشتراكات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POS Quick Start Banner */}
      <div className="pos-shortcut-banner tour-dashboard-pos" style={{ marginBottom: '20px' }}>
        <div className="pos-banner-right">
          <div className="pos-banner-title-small">شاشة الكاشير</div>
          <h2 className="pos-banner-title-large">مخصصة للبيع السريع</h2>
          <p className="pos-banner-desc">اكتشف حلول نقاط البيع المصممة خصيصاً لنجاحك. ابدأ البيع الآن مع نظام يفهم طبيعة عملك.</p>
        </div>
        <div className="pos-banner-left">
          <button className="pos-banner-btn" onClick={() => navigate('/pos')}>
            ابدأ البيع
          </button>
        </div>
      </div>

      {/* Desktop App Banner */}
      {latestApp && showDesktopBanner && (
        <div className="pos-shortcut-banner" style={{ position: 'relative', marginBottom: '20px' }}>
          <button 
            onClick={() => {
              setShowDesktopBanner(false);
              localStorage.setItem('pos_hide_desktop_banner', 'true');
            }} 
            style={{ position: 'absolute', top: '15px', left: '15px', background: '#ef4444', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', zIndex: 10 }}
            onMouseOver={(e) => e.currentTarget.style.background = '#dc2626'}
            onMouseOut={(e) => e.currentTarget.style.background = '#ef4444'}
            title="إخفاء"
          >
            <i className="fas fa-times"></i>
          </button>
          <div className="pos-banner-right" style={{ paddingRight: '20px' }}>
            <div className="pos-banner-title-small">تطبيق سطح المكتب</div>
            <h2 className="pos-banner-title-large">نظام الكاشير (أوفلاين)</h2>
            <p className="pos-banner-desc">استمتع بتجربة أسرع للبيع بدون إنترنت من خلال تطبيق الديسكتوب الخاص بنا.</p>
            <p className="pos-banner-desc" style={{ fontSize: '0.85rem', color: '#10b981', marginTop: '4px' }}>✨ متوفر الآن للتحميل: إصدار {latestApp.version}</p>
          </div>
          <div className="pos-banner-left" style={{ paddingLeft: '40px' }}>
            <a href={latestApp.downloadUrl} className="pos-banner-btn" style={{ background: '#10b981', textDecoration: 'none', textAlign: 'center' }} download>
              تحميل للديسكتوب <i className="fas fa-download" style={{ marginRight: '8px' }}></i>
            </a>
          </div>
        </div>
      )}

      {isOnline && (
        <>
          {/* Tab Navigation */}
          <div className="dashboard-tabs-container tour-dashboard-tabs">
        <div className="dashboard-tabs">
          <div className={`tab-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')} style={{cursor: 'pointer'}}>
            <span className="tab-icon">🖥️</span>
            <span className="tab-text">نظرة عامة</span>
          </div>
          <div className={`tab-item ${activeTab === 'sales-analytics' ? 'active' : ''}`} onClick={() => setActiveTab('sales-analytics')} style={{cursor: 'pointer'}}>
            <span className="tab-icon">📊</span>
            <span className="tab-text">إحصائيات المبيعات</span>
          </div>
          <div className={`tab-item ${activeTab === 'purchases' ? 'active' : ''}`} onClick={() => setActiveTab('purchases')} style={{cursor: 'pointer'}}>
            <span className="tab-icon">🛒</span>
            <span className="tab-text">إحصائيات المشتريات</span>
          </div>
          <div className={`tab-item ${activeTab === 'returns' ? 'active' : ''}`} onClick={() => setActiveTab('returns')} style={{cursor: 'pointer'}}>
            <span className="tab-icon">🔄</span>
            <span className="tab-text">إحصائيات المرتجعات</span>
          </div>
          <div className={`tab-item ${activeTab === 'profit-loss' ? 'active' : ''}`} onClick={() => setActiveTab('profit-loss')} style={{cursor: 'pointer'}}>
            <span className="tab-icon">💵</span>
            <span className="tab-text">إحصائيات أرباح المبيعات</span>
          </div>
          <div className={`tab-item ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveTab('customers')} style={{cursor: 'pointer'}}>
            <span className="tab-icon">👥</span>
            <span className="tab-text">إحصائيات الموردين والعملاء</span>
          </div>
          <div className={`tab-item ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')} style={{cursor: 'pointer'}}>
            <span className="tab-icon">💸</span>
            <span className="tab-text">إحصائيات المصروفات</span>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {/* Tab Content */}
      {activeTab === 'sales-analytics' && (
        <div className="analytics-tab-content" style={{ marginTop: '20px' }}>
          <SalesAnalytics />
        </div>
      )}
      {activeTab === 'purchases' && (
        <div className="analytics-tab-content" style={{ marginTop: '20px' }}>
          <Purchases />
        </div>
      )}
      {activeTab === 'returns' && (
        <div className="analytics-tab-content" style={{ marginTop: '20px' }}>
          <Returns />
        </div>
      )}
      {activeTab === 'profit-loss' && (
        <div className="analytics-tab-content" style={{ marginTop: '20px' }}>
          <ProfitLoss />
        </div>
      )}
      {activeTab === 'customers' && (
        <div className="analytics-tab-content" style={{ marginTop: '20px' }}>
          <Customers />
        </div>
      )}
      {activeTab === 'expenses' && (
        <div className="analytics-tab-content" style={{ marginTop: '20px' }}>
          <Expenses />
        </div>
      )}

      {activeTab === 'overview' && (
      <div className="shortcut-grid tour-dashboard-shortcuts">
        {/* Branches */}
        {Api.can('BRANCH_READ') && (
          <div className="shortcut-card" onClick={() => navigate('/branches')}>
            <div className="shortcut-card-content">
              <span className="shortcut-title">الفروع</span>
              <span className="shortcut-subtitle">{counts.branches}+ فرع</span>
            </div>
            <div className="shortcut-icon-wrapper bg-purple-light">
              <span className="shortcut-icon text-purple">🏢</span>
            </div>
          </div>
        )}

        {/* Sales */}
        {Api.can('SALE_READ') && (
          <div className="shortcut-card" onClick={() => navigate('/sales')}>
            <div className="shortcut-card-content">
              <span className="shortcut-title">المبيعات</span>
              <span className="shortcut-subtitle">{counts.sales} فاتورة</span>
            </div>
            <div className="shortcut-icon-wrapper bg-blue-light">
              <span className="shortcut-icon text-blue">📈</span>
            </div>
          </div>
        )}

        {/* Purchases */}
        {Api.can('PURCHASE_READ') && (
          <div className="shortcut-card" onClick={() => navigate('/purchases')}>
            <div className="shortcut-card-content">
              <span className="shortcut-title">المشتريات</span>
              <span className="shortcut-subtitle">{counts.purchases} فاتورة</span>
            </div>
            <div className="shortcut-icon-wrapper bg-gold-light">
              <span className="shortcut-icon text-gold">🛒</span>
            </div>
          </div>
        )}

        {/* Customers */}
        {Api.can('CUSTOMER_READ') && (
          <div className="shortcut-card" onClick={() => navigate('/customers')}>
            <div className="shortcut-card-content">
              <span className="shortcut-title">العملاء</span>
              <span className="shortcut-subtitle">{counts.customers}+ عميل</span>
            </div>
            <div className="shortcut-icon-wrapper bg-purple-light">
              <span className="shortcut-icon text-purple">👥</span>
            </div>
          </div>
        )}

        {/* Suppliers */}
        {Api.can('SUPPLIER_READ') && (
          <div className="shortcut-card" onClick={() => navigate('/suppliers')}>
            <div className="shortcut-card-content">
              <span className="shortcut-title">الموردين</span>
              <span className="shortcut-subtitle">{counts.suppliers}+ مورد</span>
            </div>
            <div className="shortcut-icon-wrapper bg-blue-light">
              <span className="shortcut-icon text-blue">📦</span>
            </div>
          </div>
        )}

        {/* Products */}
        {Api.can('PRODUCT_READ') && (
          <div className="shortcut-card" onClick={() => navigate('/products')}>
            <div className="shortcut-card-content">
              <span className="shortcut-title">الاصناف</span>
              <span className="shortcut-subtitle">{counts.products}+ صنف</span>
            </div>
            <div className="shortcut-icon-wrapper bg-violet-light">
              <span className="shortcut-icon text-violet">▨</span>
            </div>
          </div>
        )}

        {/* Payment Vouchers (Expenses) */}
        {Api.can('EXPENSE_READ') && (
          <div className="shortcut-card" onClick={() => navigate('/expenses')}>
            <div className="shortcut-card-content">
              <span className="shortcut-title">سندات الصرف</span>
              <span className="shortcut-subtitle">{counts.expenses} سند</span>
            </div>
            <div className="shortcut-icon-wrapper bg-green-light">
              <span className="shortcut-icon text-green">📄</span>
            </div>
          </div>
        )}

        {/* Receipt Vouchers (Debts) */}
        {Api.can('TREASURY_READ') && (
          <div className="shortcut-card" onClick={() => navigate('/debts')}>
            <div className="shortcut-card-content">
              <span className="shortcut-title">سند القبض</span>
              <span className="shortcut-subtitle">{counts.receipts} سند</span>
            </div>
            <div className="shortcut-icon-wrapper bg-green-light">
              <span className="shortcut-icon text-green">💵</span>
            </div>
          </div>
        )}
      </div>
      )}
        </>
      )}

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

export default Dashboard;
