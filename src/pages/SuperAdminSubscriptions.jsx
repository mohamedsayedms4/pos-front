import React, { useState, useEffect, useMemo } from 'react';
import Api, { SERVER_URL } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import '../styles/pages/SuperAdminSubscriptionsPremium.css';

const AVATAR_COLORS = [
  'linear-gradient(135deg, #6366f1, #4f46e5)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #ef4444, #dc2626)',
  'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  'linear-gradient(135deg, #06b6d4, #0891b2)',
  'linear-gradient(135deg, #ec4899, #db2777)',
  'linear-gradient(135deg, #14b8a6, #0d9488)',
];

const getAvatarColor = (id) => AVATAR_COLORS[(id || 0) % AVATAR_COLORS.length];

const getTenantStatus = (tenant) => {
  if (!tenant.active) return 'disabled';
  if (!tenant.subscriptionExpiry) return 'expired';
  const now = new Date();
  const expiry = new Date(tenant.subscriptionExpiry);
  if (expiry < now) return 'expired';
  return 'active';
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'active': return '● نشط';
    case 'expired': return '● منتهي';
    case 'disabled': return '● معطل';
    default: return '—';
  }
};

const getStatusClass = (status) => {
  switch (status) {
    case 'active': return 'sa-sub-badge-active';
    case 'expired': return 'sa-sub-badge-expired';
    case 'disabled': return 'sa-sub-badge-disabled';
    default: return '';
  }
};

const getRequestStatusLabel = (status) => {
  switch (status) {
    case 'PENDING': return '● قيد المراجعة';
    case 'APPROVED': return '● مقبول';
    case 'REJECTED': return '● مرفوض';
    default: return status || '—';
  }
};

const getRequestStatusClass = (status) => {
  switch (status) {
    case 'PENDING': return 'sa-sub-badge-expired'; // Amber/warning
    case 'APPROVED': return 'sa-sub-badge-active';  // Green/active
    case 'REJECTED': return 'sa-sub-badge-disabled'; // Red/danger
    default: return '';
  }
};

const getRemainingDays = (expiryDate) => {
  if (!expiryDate) return null;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  return diff;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

const REJECT_PRESETS = [
  'إيصال التحويل غير واضح أو مقطوع.',
  'لم يصلنا التحويل البنكي حتى الآن، يرجى مراجعة مزود الخدمة الخاص بك.',
  'المبلغ المحول لا يطابق قيمة الباقة المختارة.',
  'الرقم المحول منه غير صحيح أو لا يمكن التحقق منه.'
];

const SuperAdminSubscriptions = () => {
  const navigate = useNavigate();
  const { toast, confirm } = useGlobalUI();

  // Navigation / Tab state
  const [activeTab, setActiveTab] = useState('tenants'); // 'tenants' or 'requests'

  // Data state
  const [tenants, setTenants] = useState([]);
  const [stats, setStats] = useState({ totalTenants: 0, activeTenants: 0, inactiveTenants: 0 });
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Settings state
  const [settings, setSettings] = useState({
    softwareName: '',
    supportPhone: '',
    facebookUrl: '',
    linkedInUrl: '',
    youtubeUrl: '',
    facebookPixelId: '',
    logoUrl: '',
    logoSidebarLightUrl: '',
    logoSidebarDarkUrl: '',
    logoFooterLightUrl: '',
    logoFooterDarkUrl: '',
    logoLoginLightUrl: '',
    logoLoginDarkUrl: '',
    logoLandingLightUrl: '',
    logoLandingDarkUrl: '',
    logoFaviconUrl: '',
    vodafoneCashNumber: '',
    instapayAddress: ''
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [logoPreview, setLogoPreview] = useState('');
  const [logoSidebarLightPreview, setLogoSidebarLightPreview] = useState('');
  const [logoSidebarDarkPreview, setLogoSidebarDarkPreview] = useState('');
  const [logoFooterLightPreview, setLogoFooterLightPreview] = useState('');
  const [logoFooterDarkPreview, setLogoFooterDarkPreview] = useState('');
  const [logoLoginLightPreview, setLogoLoginLightPreview] = useState('');
  const [logoLoginDarkPreview, setLogoLoginDarkPreview] = useState('');
  const [logoLandingLightPreview, setLogoLandingLightPreview] = useState('');
  const [logoLandingDarkPreview, setLogoLandingDarkPreview] = useState('');
  const [logoFaviconPreview, setLogoFaviconPreview] = useState('');

  // Tenants Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Requests Filter state
  const [requestSearch, setRequestSearch] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState('PENDING');

  // Extend Modal state
  const [extendModal, setExtendModal] = useState({ open: false, tenant: null });
  const [extendType, setExtendType] = useState('months');
  const [extendAmount, setExtendAmount] = useState('');
  const [extending, setExtending] = useState(false);

  // Reject Modal state
  const [rejectModal, setRejectModal] = useState({ open: false, requestId: null, tenantName: '', reason: '' });
  const [rejecting, setRejecting] = useState(false);

  // Lightbox state
  const [lightbox, setLightbox] = useState({ open: false, imgUrl: '', tenantName: '' });

  // Auth guard
  useEffect(() => {
    if (!Api.isSuperAdmin()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tenantsData, statsData, requestsData, configData] = await Promise.all([
        Api.getSuperAdminTenants(),
        Api.getSuperAdminStats(),
        Api.getSuperAdminSubscriptionRequests(),
        Api.getGlobalConfig().catch(err => {
          console.error("Failed to load global config:", err);
          return null;
        })
      ]);
      setTenants(tenantsData);
      setStats(statsData);
      setRequests(requestsData);
      if (configData) {
        setSettings({
          softwareName: configData.softwareName || '',
          supportPhone: configData.supportPhone || '',
          facebookUrl: configData.facebookUrl || '',
          linkedInUrl: configData.linkedInUrl || '',
          youtubeUrl: configData.youtubeUrl || '',
          facebookPixelId: configData.facebookPixelId || '',
          logoUrl: configData.logoUrl || '',
          logoSidebarLightUrl: configData.logoSidebarLightUrl || '',
          logoSidebarDarkUrl: configData.logoSidebarDarkUrl || '',
          logoFooterLightUrl: configData.logoFooterLightUrl || '',
          logoFooterDarkUrl: configData.logoFooterDarkUrl || '',
          logoLoginLightUrl: configData.logoLoginLightUrl || '',
          logoLoginDarkUrl: configData.logoLoginDarkUrl || '',
          logoLandingLightUrl: configData.logoLandingLightUrl || '',
          logoLandingDarkUrl: configData.logoLandingDarkUrl || '',
          logoFaviconUrl: configData.logoFaviconUrl || '',
          vodafoneCashNumber: configData.vodafoneCashNumber || '',
          instapayAddress: configData.instapayAddress || ''
        });
        setLogoPreview(configData.logoUrl || '');
        setLogoSidebarLightPreview(configData.logoSidebarLightUrl || '');
        setLogoSidebarDarkPreview(configData.logoSidebarDarkUrl || '');
        setLogoFooterLightPreview(configData.logoFooterLightUrl || '');
        setLogoFooterDarkPreview(configData.logoFooterDarkUrl || '');
        setLogoLoginLightPreview(configData.logoLoginLightUrl || '');
        setLogoLoginDarkPreview(configData.logoLoginDarkUrl || '');
        setLogoLandingLightPreview(configData.logoLandingLightUrl || '');
        setLogoLandingDarkPreview(configData.logoLandingDarkUrl || '');
        setLogoFaviconPreview(configData.logoFaviconUrl || '');
      }
    } catch (err) {
      toast(err.message || 'فشل في تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filtered tenants
  const filteredTenants = useMemo(() => {
    let result = tenants;

    // Search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          (t.name || '').toLowerCase().includes(term) ||
          (t.slug || '').toLowerCase().includes(term) ||
          (t.contactEmail || '').toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter((t) => getTenantStatus(t) === filterStatus);
    }

    return result;
  }, [tenants, searchTerm, filterStatus]);

  // Filtered subscription requests
  const filteredRequests = useMemo(() => {
    let result = requests;

    // Search
    if (requestSearch.trim()) {
      const term = requestSearch.toLowerCase();
      result = result.filter(
        (r) =>
          (r.tenantName || '').toLowerCase().includes(term) ||
          (r.senderDetail || '').toLowerCase().includes(term) ||
          (r.packageName || '').toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (requestStatusFilter !== 'ALL') {
      result = result.filter((r) => r.status === requestStatusFilter);
    }

    return result;
  }, [requests, requestSearch, requestStatusFilter]);

  // Counts
  const expiredCount = useMemo(() => tenants.filter(t => getTenantStatus(t) === 'expired').length, [tenants]);
  const pendingRequestsCount = useMemo(() => requests.filter(r => r.status === 'PENDING').length, [requests]);

  // Impersonate tenant
  const handleImpersonate = async (tenant) => {
    try {
      const data = await Api.impersonateTenant(tenant.id);
      // Backup current tokens directly using the original localStorage keys, 
      // but Api uses obfuscation, so let's rely on Api getters:
      const backup = {
        access: Api._getToken(),
        refresh: Api._getRefreshToken(),
        tenantId: Api._getTenantId(),
        user: Api._getUser()
      };
      localStorage.setItem('super_admin_backup', JSON.stringify(backup));
      
      Api._setTokens(data.accessToken, data.refreshToken);
      Api._setUser(data.user);
      Api._setTenantId(tenant.id);
      
      toast(`تم تسجيل الدخول بنجاح كمدير لمتجر "${tenant.name}"`, 'success');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (err) {
      toast(err.message || 'فشل في الدخول كمدير', 'error');
    }
  };

  // Toggle status
  const handleToggleStatus = (tenant) => {
    const newStatus = !tenant.active;
    const action = newStatus ? 'تفعيل' : 'تعطيل';
    confirm(
      `هل أنت متأكد من ${action} "${tenant.name}"؟`,
      async () => {
        try {
          await Api.toggleTenantStatus(tenant.id, newStatus);
          toast(`تم ${action} "${tenant.name}" بنجاح ✅`, 'success');
          loadData();
        } catch (err) {
          toast(err.message || `فشل في ${action} المستأجر`, 'error');
        }
      }
    );
  };

  // Open extend modal
  const openExtendModal = (tenant) => {
    setExtendModal({ open: true, tenant });
    setExtendType('months');
    setExtendAmount('');
  };

  const closeExtendModal = () => {
    setExtendModal({ open: false, tenant: null });
    setExtendAmount('');
    setExtending(false);
  };

  // Extend subscription
  const handleExtendSubscription = async () => {
    const amount = parseInt(extendAmount);
    if (!amount || amount <= 0) {
      toast('يرجى إدخال قيمة صحيحة', 'error');
      return;
    }

    setExtending(true);
    try {
      const params = extendType === 'months' ? { months: amount } : { days: amount };
      await Api.extendTenantSubscription(extendModal.tenant.id, params);
      toast(
        `تم تمديد اشتراك "${extendModal.tenant.name}" بنجاح — ${amount} ${extendType === 'months' ? 'شهر' : 'يوم'} ✅`,
        'success'
      );
      closeExtendModal();
      loadData();
    } catch (err) {
      toast(err.message || 'فشل في تمديد الاشتراك', 'error');
    } finally {
      setExtending(false);
    }
  };

  // Approve subscription request
  const handleApproveRequest = (request) => {
    confirm(
      `هل أنت متأكد من قبول طلب تجديد "${request.tenantName}" لباقة (${request.packageName}) بمبلغ ${request.amount} ج.م؟`,
      async () => {
        try {
          await Api.approveSubscriptionRequest(request.id);
          toast(`تم قبول طلب التجديد وتفعيل متجر "${request.tenantName}" بنجاح ✅`, 'success');
          loadData();
        } catch (err) {
          toast(err.message || 'فشل في تفعيل الاشتراك المعين', 'error');
        }
      }
    );
  };

  // Submit reject request
  const handleRejectRequestSubmit = async (e) => {
    e.preventDefault();
    if (!rejectModal.reason.trim()) {
      toast('يرجى تحديد أو كتابة سبب الرفض', 'error');
      return;
    }

    setRejecting(true);
    try {
      await Api.rejectSubscriptionRequest(rejectModal.requestId, rejectModal.reason);
      toast(`تم رفض طلب تجديد "${rejectModal.tenantName}" وإرسال التنبيه للمتجر ❌`, 'success');
      setRejectModal({ open: false, requestId: null, tenantName: '', reason: '' });
      loadData();
    } catch (err) {
      toast(err.message || 'فشل في رفض الطلب', 'error');
    } finally {
      setRejecting(false);
    }
  };

  // Handle logo file selection
  const handleLogoChange = (e, fieldName, setPreview) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
      setSettings(prev => ({ ...prev, [fieldName]: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  // Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await Api.updateGlobalConfig(settings);
      toast('تم حفظ إعدادات النظام والفوتر بنجاح ✅', 'success');
      loadData();
    } catch (err) {
      toast(err.message || 'فشل في حفظ إعدادات النظام', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  if (!Api.isSuperAdmin()) return null;

  return (
    <>
      <div className="sa-sub-container">
        {/* Breadcrumbs */}
        <div className="sa-sub-breadcrumbs">
          <a href="/dashboard">الرئيسية</a>
          <span>/</span>
          <span>إدارة الاشتراكات</span>
        </div>

        {/* Header */}
        <div className="sa-sub-header-row">
          <h1>🔑 إدارة الاشتراكات ونظام الدفع اليدوي</h1>
        </div>

        {/* Stats Grid */}
        <div className="sa-sub-stats-grid">
          <div className="sa-sub-stat-card">
            <div className="sa-sub-stat-info">
              <h4>إجمالي المستأجرين</h4>
              <div className="sa-sub-stat-value">{stats.totalTenants || 0}</div>
            </div>
            <div className="sa-sub-stat-icon sa-sub-icon-blue">🏢</div>
          </div>
          <div className="sa-sub-stat-card">
            <div className="sa-sub-stat-info">
              <h4>الاشتراكات النشطة</h4>
              <div className="sa-sub-stat-value" style={{ color: 'var(--sa-sub-accent-green)' }}>
                {stats.activeTenants || 0}
              </div>
            </div>
            <div className="sa-sub-stat-icon sa-sub-icon-green">✅</div>
          </div>
          <div className="sa-sub-stat-card">
            <div className="sa-sub-stat-info">
              <h4>طلبات التجديد المعلقة</h4>
              <div className="sa-sub-stat-value" style={{ color: 'var(--sa-sub-accent-amber)' }}>
                {pendingRequestsCount}
              </div>
            </div>
            <div className="sa-sub-stat-icon sa-sub-icon-amber">⏳</div>
          </div>
          <div className="sa-sub-stat-card">
            <div className="sa-sub-stat-info">
              <h4>المعطلة / المنتهية</h4>
              <div className="sa-sub-stat-value" style={{ color: 'var(--sa-sub-accent-red)' }}>
                {stats.inactiveTenants || 0}
              </div>
            </div>
            <div className="sa-sub-stat-icon sa-sub-icon-red">⛔</div>
          </div>
        </div>

        {/* Custom Tabs Navigation */}
        <div className="sa-sub-tabs-row" style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid var(--sa-sub-border)', paddingBottom: '10px' }}>
          <button 
            className={`sa-sub-tab-item ${activeTab === 'tenants' ? 'active' : ''}`}
            onClick={() => setActiveTab('tenants')}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'tenants' ? 'var(--sa-sub-accent-blue)' : 'var(--sa-sub-card-bg)',
              color: activeTab === 'tenants' ? '#fff' : 'var(--sa-sub-text-secondary)',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: activeTab === 'tenants' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
              transition: 'all 0.2s',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            🏢 إدارة المتاجر ({tenants.length})
          </button>
          <button 
            className={`sa-sub-tab-item ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'requests' ? 'var(--sa-sub-accent-blue)' : 'var(--sa-sub-card-bg)',
              color: activeTab === 'requests' ? '#fff' : 'var(--sa-sub-text-secondary)',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: activeTab === 'requests' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
              transition: 'all 0.2s',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            📥 طلبات تجديد الدفع اليدوي
            {pendingRequestsCount > 0 && (
              <span style={{
                background: '#ef4444',
                color: '#fff',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 'bold'
              }}>
                {pendingRequestsCount}
              </span>
            )}
          </button>
          <button 
            className={`sa-sub-tab-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'settings' ? 'var(--sa-sub-accent-blue)' : 'var(--sa-sub-card-bg)',
              color: activeTab === 'settings' ? '#fff' : 'var(--sa-sub-text-secondary)',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: activeTab === 'settings' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
              transition: 'all 0.2s',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ⚙️ إعدادات النظام العامة
          </button>
        </div>

        {activeTab === 'tenants' ? (
          <>
            {/* Tenants Toolbar */}
            <div className="sa-sub-toolbar-card">
              <div className="sa-sub-toolbar-left">
                <div className="sa-sub-filter-group">
                  <button
                    className={`sa-sub-filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('all')}
                  >
                    الكل ({tenants.length})
                  </button>
                  <button
                    className={`sa-sub-filter-btn ${filterStatus === 'active' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('active')}
                  >
                    نشط
                  </button>
                  <button
                    className={`sa-sub-filter-btn ${filterStatus === 'expired' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('expired')}
                  >
                    منتهي ({expiredCount})
                  </button>
                  <button
                    className={`sa-sub-filter-btn ${filterStatus === 'disabled' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('disabled')}
                  >
                    معطل
                  </button>
                </div>
              </div>
              <div className="sa-sub-toolbar-right">
                <div className="sa-sub-search-box">
                  <input
                    className="sa-sub-input"
                    type="text"
                    placeholder="ابحث بالاسم، السلاق، أو البريد..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <span className="sa-sub-search-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
                </div>
                <div className="sa-sub-results-count">
                  النتائج: <span>{filteredTenants.length}</span>
                </div>
              </div>
            </div>

            {/* Tenants Table */}
            <div className="sa-sub-table-card">
              {loading ? (
                <Loader />
              ) : filteredTenants.length === 0 ? (
                <div className="sa-sub-empty-state">
                  <div className="sa-sub-empty-icon">📋</div>
                  <h3>لا يوجد مستأجرين</h3>
                  <p>لا توجد نتائج مطابقة لبحثك</p>
                </div>
              ) : (
                <div className="sa-sub-table-container">
                  <table className="sa-sub-table">
                     <thead>
                       <tr>
                         <th>#</th>
                         <th>المستأجر</th>
                         <th>البريد الإلكتروني</th>
                         <th>الهاتف</th>
                         <th>تاريخ الاشتراك</th>
                         <th>الحالة</th>
                         <th>انتهاء الاشتراك</th>
                         <th>الإجراءات</th>
                       </tr>
                     </thead>
                     <tbody>
                       {filteredTenants.map((tenant, index) => {
                         const status = getTenantStatus(tenant);
                         const remaining = getRemainingDays(tenant.subscriptionExpiry);
                         return (
                           <tr key={tenant.id}>
                             <td style={{ fontWeight: 600, color: 'var(--sa-sub-text-secondary)' }}>
                               {index + 1}
                             </td>
                             <td>
                               <div className="sa-sub-tenant-cell">
                                 <div
                                   className="sa-sub-tenant-avatar"
                                   style={{ background: getAvatarColor(tenant.id) }}
                                 >
                                   {(tenant.name || '?').charAt(0)}
                                 </div>
                                 <div className="sa-sub-tenant-info">
                                   <div className="sa-sub-tenant-name">{tenant.name}</div>
                                   <div className="sa-sub-tenant-slug">{tenant.slug}</div>
                                 </div>
                               </div>
                             </td>
                             <td style={{ direction: 'ltr', textAlign: 'right' }}>
                               {tenant.contactEmail || '—'}
                             </td>
                             <td style={{ direction: 'ltr', textAlign: 'right' }}>
                               {tenant.phone || '—'}
                             </td>
                             <td>
                               <span style={{ color: 'var(--sa-sub-text-secondary)' }}>
                                 {formatDate(tenant.createdAt)}
                               </span>
                             </td>
                             <td>
                               <span className={`sa-sub-status-badge ${getStatusClass(status)}`}>
                                 {getStatusLabel(status)}
                               </span>
                             </td>
                             <td>
                               <div className="sa-sub-expiry-cell">
                                 <span className="sa-sub-expiry-date">
                                   {formatDate(tenant.subscriptionExpiry)}
                                 </span>
                                 {remaining !== null && (
                                   <span
                                     className={`sa-sub-expiry-remaining ${
                                       remaining > 30
                                         ? 'sa-sub-remaining-ok'
                                         : remaining > 7
                                         ? 'sa-sub-remaining-warning'
                                         : 'sa-sub-remaining-danger'
                                     }`}
                                   >
                                     {remaining > 0
                                       ? `باقي ${remaining} يوم`
                                       : `منتهي منذ ${Math.abs(remaining)} يوم`}
                                   </span>
                                 )}
                               </div>
                             </td>
                             <td>
                               <div className="sa-sub-actions">
                                 <button
                                   className="sa-sub-action-btn"
                                   style={{ background: 'var(--sa-sub-accent-blue)', color: '#fff', fontSize: '1rem' }}
                                   title="دخول كمدير"
                                   onClick={() => handleImpersonate(tenant)}
                                 >
                                   🔑
                                 </button>
                                 <button
                                   className="sa-sub-action-btn sa-sub-btn-extend"
                                   title="تمديد الاشتراك"
                                   onClick={() => openExtendModal(tenant)}
                                 >
                                   📅
                                 </button>
                                 {tenant.active ? (
                                   <button
                                     className="sa-sub-action-btn sa-sub-btn-deactivate"
                                     title="تعطيل المستأجر"
                                     onClick={() => handleToggleStatus(tenant)}
                                   >
                                     ⛔
                                   </button>
                                 ) : (
                                   <button
                                     className="sa-sub-action-btn sa-sub-btn-activate"
                                     title="تفعيل المستأجر"
                                     onClick={() => handleToggleStatus(tenant)}
                                   >
                                     ✅
                                   </button>
                                 )}
                               </div>
                             </td>
                           </tr>
                         );
                       })}
                     </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : activeTab === 'requests' ? (
          <>
            {/* Requests Toolbar */}
            <div className="sa-sub-toolbar-card">
              <div className="sa-sub-toolbar-left">
                <div className="sa-sub-filter-group">
                  <button
                    className={`sa-sub-filter-btn ${requestStatusFilter === 'ALL' ? 'active' : ''}`}
                    onClick={() => setRequestStatusFilter('ALL')}
                  >
                    الكل ({requests.length})
                  </button>
                  <button
                    className={`sa-sub-filter-btn ${requestStatusFilter === 'PENDING' ? 'active' : ''}`}
                    onClick={() => setRequestStatusFilter('PENDING')}
                  >
                    قيد الانتظار ({pendingRequestsCount})
                  </button>
                  <button
                    className={`sa-sub-filter-btn ${requestStatusFilter === 'APPROVED' ? 'active' : ''}`}
                    onClick={() => setRequestStatusFilter('APPROVED')}
                  >
                    المقبولة
                  </button>
                  <button
                    className={`sa-sub-filter-btn ${requestStatusFilter === 'REJECTED' ? 'active' : ''}`}
                    onClick={() => setRequestStatusFilter('REJECTED')}
                  >
                    المرفوضة
                  </button>
                </div>
              </div>
              <div className="sa-sub-toolbar-right">
                <div className="sa-sub-search-box">
                  <input
                    className="sa-sub-input"
                    type="text"
                    placeholder="ابحث باسم المتجر أو رقم المرسل..."
                    value={requestSearch}
                    onChange={(e) => setRequestSearch(e.target.value)}
                  />
                  <span className="sa-sub-search-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
                </div>
                <div className="sa-sub-results-count">
                  النتائج: <span>{filteredRequests.length}</span>
                </div>
              </div>
            </div>

            {/* Requests Table */}
            <div className="sa-sub-table-card">
              {loading ? (
                <Loader />
              ) : filteredRequests.length === 0 ? (
                <div className="sa-sub-empty-state">
                  <div className="sa-sub-empty-icon">📥</div>
                  <h3>لا توجد طلبات تجديد</h3>
                  <p>لا توجد طلبات مطابقة للفلتر المحدد</p>
                </div>
              ) : (
                <div className="sa-sub-table-container">
                  <table className="sa-sub-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>المتجر</th>
                        <th>الباقة المطلوبة</th>
                        <th>المبلغ</th>
                        <th>طريقة التحويل</th>
                        <th>بيانات المرسل</th>
                        <th>تاريخ الطلب</th>
                        <th>صورة الإيصال</th>
                        <th>الحالة</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequests.map((req, index) => (
                        <tr key={req.id}>
                          <td style={{ fontWeight: 600, color: 'var(--sa-sub-text-secondary)' }}>
                            {index + 1}
                          </td>
                          <td>
                            <div className="sa-sub-tenant-cell">
                              <div
                                className="sa-sub-tenant-avatar"
                                style={{ background: getAvatarColor(req.tenantId) }}
                              >
                                {(req.tenantName || '?').charAt(0)}
                              </div>
                              <div className="sa-sub-tenant-info">
                                <div className="sa-sub-tenant-name">{req.tenantName}</div>
                                <div className="sa-sub-tenant-slug">معرف: #{req.tenantId}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontWeight: 700 }}>
                            {req.packageName}
                          </td>
                          <td style={{ color: 'var(--sa-sub-accent-blue)', fontWeight: 800 }}>
                            {req.amount} ج.م
                          </td>
                          <td>
                            <span 
                              className={`sa-sub-status-badge`} 
                              style={{ 
                                background: req.paymentMethod === 'VODAFONE_CASH' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(99, 102, 241, 0.12)', 
                                color: req.paymentMethod === 'VODAFONE_CASH' ? '#ef4444' : '#6366f1',
                                border: '1px solid rgba(0, 0, 0, 0.05)'
                              }}
                            >
                              {req.paymentMethod === 'VODAFONE_CASH' ? '🔴 فودافون كاش' : '⚡ انستا باي'}
                            </span>
                          </td>
                          <td style={{ direction: 'ltr', textAlign: 'right', fontWeight: '600' }}>
                            {req.senderDetail}
                          </td>
                          <td>
                            {formatDateTime(req.createdAt)}
                          </td>
                          <td>
                            <div 
                              className="sa-sub-receipt-preview-wrapper"
                              style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                cursor: 'zoom-in',
                                border: '1px solid var(--sa-sub-border)',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#eee'
                              }}
                              onClick={() => setLightbox({ 
                                open: true, 
                                imgUrl: `${SERVER_URL}/api/v1/products/images/${req.receiptImgUrl}`, 
                                tenantName: req.tenantName 
                              })}
                            >
                              <img 
                                src={`${SERVER_URL}/api/v1/products/images/${req.receiptImgUrl}`} 
                                alt="إيصال" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                              />
                              <div style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0, bottom: 0,
                                background: 'rgba(0,0,0,0.4)',
                                opacity: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                fontSize: '0.8rem',
                                transition: 'opacity 0.2s',
                              }}
                              className="sa-sub-receipt-overlay"
                              >
                                🔍
                              </div>
                            </div>
                          </td>
                          <td style={{ position: 'relative' }}>
                            <span className={`sa-sub-status-badge ${getRequestStatusClass(req.status)}`}>
                              {getRequestStatusLabel(req.status)}
                            </span>
                            {req.status === 'REJECTED' && req.rejectReason && (
                              <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', maxWidth: '150px' }}>
                                السبب: {req.rejectReason}
                              </div>
                            )}
                          </td>
                          <td>
                            {req.status === 'PENDING' ? (
                              <div className="sa-sub-actions">
                                <button
                                  className="sa-sub-action-btn sa-sub-btn-activate"
                                  title="موافقة وتفعيل الاشتراك"
                                  onClick={() => handleApproveRequest(req)}
                                >
                                  ✅
                                </button>
                                <button
                                  className="sa-sub-action-btn sa-sub-btn-deactivate"
                                  title="رفض الطلب"
                                  onClick={() => setRejectModal({ open: true, requestId: req.id, tenantName: req.tenantName, reason: '' })}
                                >
                                  ❌
                                </button>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--sa-sub-text-secondary)', fontSize: '0.85rem' }}>
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="sa-sub-table-card" style={{ padding: '30px', border: '1px solid var(--sa-sub-border)', borderRadius: '16px', boxShadow: 'var(--sa-sub-shadow)' }}>
            <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--sa-sub-border)', paddingBottom: '16px' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                ⚙️ إعدادات النظام وشريط المعلومات السفلي (الفوتر)
              </h3>
              <p style={{ color: 'var(--sa-sub-text-secondary)', fontSize: '0.95rem', marginTop: '6px' }}>
                تتيح لك هذه اللوحة تعديل البيانات المعروضة في شريط المعلومات السفلي (الفوتر) لجميع المستخدمين في النظام بشكل مباشر وتلقائي.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

              {/* Logo Uploads Grid with Light / Dark Mode support */}
              <div className="sa-sub-form-group" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '850', marginBottom: '4px', fontSize: '1.1rem' }}>
                  🖼️ إدارة شعارات النظام المتعددة (الوضع الداكن / الفاتح):
                </label>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                  
                  {/* 1. Sidebar Logo Card */}
                  <div style={{ background: 'var(--sa-sub-bg)', padding: '20px', borderRadius: '14px', border: '1px solid var(--sa-sub-border)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--sa-sub-border)', paddingBottom: '8px' }}>
                      <strong style={{ fontSize: '0.95rem' }}>📱 القائمة الجانبية (Sidebar)</strong>
                      <span style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 'bold' }}>32 × 32 px - Icon فقط</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {/* Light Mode */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--sa-sub-text-secondary)' }}>الوضع الفاتح</span>
                        <div style={{ width: '100%', height: '50px', borderRadius: '6px', border: '1px solid var(--sa-sub-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', overflow: 'hidden' }}>
                          {logoSidebarLightPreview
                            ? <img src={logoSidebarLightPreview} alt="Sidebar Light" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                            : <span style={{ fontSize: '1rem', opacity: 0.2 }}>🖼️</span>
                          }
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <label htmlFor="logo-sidebar-light-input" style={{ padding: '4px 8px', background: '#6366f1', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>رفع</label>
                          <input id="logo-sidebar-light-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleLogoChange(e, 'logoSidebarLightUrl', setLogoSidebarLightPreview)} />
                          {logoSidebarLightPreview && <button type="button" onClick={() => { setLogoSidebarLightPreview(''); setSettings(prev => ({ ...prev, logoSidebarLightUrl: '' })); }} style={{ padding: '4px 8px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>حذف</button>}
                        </div>
                      </div>
                      {/* Dark Mode */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--sa-sub-text-secondary)' }}>الوضع الداكن</span>
                        <div style={{ width: '100%', height: '50px', borderRadius: '6px', border: '1px solid var(--sa-sub-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', overflow: 'hidden' }}>
                          {logoSidebarDarkPreview
                            ? <img src={logoSidebarDarkPreview} alt="Sidebar Dark" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                            : <span style={{ fontSize: '1rem', opacity: 0.2 }}>🖼️</span>
                          }
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <label htmlFor="logo-sidebar-dark-input" style={{ padding: '4px 8px', background: '#6366f1', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>رفع</label>
                          <input id="logo-sidebar-dark-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleLogoChange(e, 'logoSidebarDarkUrl', setLogoSidebarDarkPreview)} />
                          {logoSidebarDarkPreview && <button type="button" onClick={() => { setLogoSidebarDarkPreview(''); setSettings(prev => ({ ...prev, logoSidebarDarkUrl: '' })); }} style={{ padding: '4px 8px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>حذف</button>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Footer Logo Card */}
                  <div style={{ background: 'var(--sa-sub-bg)', padding: '20px', borderRadius: '14px', border: '1px solid var(--sa-sub-border)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--sa-sub-border)', paddingBottom: '8px' }}>
                      <strong style={{ fontSize: '0.95rem' }}>👣 شريط الفوتر (Footer)</strong>
                      <span style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 'bold' }}>32 × 32 px - Icon فقط</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {/* Light Mode */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--sa-sub-text-secondary)' }}>الوضع الفاتح</span>
                        <div style={{ width: '100%', height: '50px', borderRadius: '6px', border: '1px solid var(--sa-sub-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', overflow: 'hidden' }}>
                          {logoFooterLightPreview
                            ? <img src={logoFooterLightPreview} alt="Footer Light" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                            : <span style={{ fontSize: '1rem', opacity: 0.2 }}>🖼️</span>
                          }
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <label htmlFor="logo-footer-light-input" style={{ padding: '4px 8px', background: '#6366f1', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>رفع</label>
                          <input id="logo-footer-light-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleLogoChange(e, 'logoFooterLightUrl', setLogoFooterLightPreview)} />
                          {logoFooterLightPreview && <button type="button" onClick={() => { setLogoFooterLightPreview(''); setSettings(prev => ({ ...prev, logoFooterLightUrl: '' })); }} style={{ padding: '4px 8px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>حذف</button>}
                        </div>
                      </div>
                      {/* Dark Mode */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--sa-sub-text-secondary)' }}>الوضع الداكن</span>
                        <div style={{ width: '100%', height: '50px', borderRadius: '6px', border: '1px solid var(--sa-sub-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', overflow: 'hidden' }}>
                          {logoFooterDarkPreview
                            ? <img src={logoFooterDarkPreview} alt="Footer Dark" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                            : <span style={{ fontSize: '1rem', opacity: 0.2 }}>🖼️</span>
                          }
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <label htmlFor="logo-footer-dark-input" style={{ padding: '4px 8px', background: '#6366f1', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>رفع</label>
                          <input id="logo-footer-dark-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleLogoChange(e, 'logoFooterDarkUrl', setLogoFooterDarkPreview)} />
                          {logoFooterDarkPreview && <button type="button" onClick={() => { setLogoFooterDarkPreview(''); setSettings(prev => ({ ...prev, logoFooterDarkUrl: '' })); }} style={{ padding: '4px 8px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>حذف</button>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Login Page Logo Card */}
                  <div style={{ background: 'var(--sa-sub-bg)', padding: '20px', borderRadius: '14px', border: '1px solid var(--sa-sub-border)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--sa-sub-border)', paddingBottom: '8px' }}>
                      <strong style={{ fontSize: '0.95rem' }}>🔑 تسجيل الدخول (Login Page)</strong>
                      <span style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 'bold' }}>64 × 64 px - أيقونة أو لوجو</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {/* Light Mode */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--sa-sub-text-secondary)' }}>الوضع الفاتح</span>
                        <div style={{ width: '100%', height: '50px', borderRadius: '6px', border: '1px solid var(--sa-sub-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', overflow: 'hidden' }}>
                          {logoLoginLightPreview
                            ? <img src={logoLoginLightPreview} alt="Login Light" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                            : <span style={{ fontSize: '1rem', opacity: 0.2 }}>🖼️</span>
                          }
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <label htmlFor="logo-login-light-input" style={{ padding: '4px 8px', background: '#6366f1', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>رفع</label>
                          <input id="logo-login-light-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleLogoChange(e, 'logoLoginLightUrl', setLogoLoginLightPreview)} />
                          {logoLoginLightPreview && <button type="button" onClick={() => { setLogoLoginLightPreview(''); setSettings(prev => ({ ...prev, logoLoginLightUrl: '' })); }} style={{ padding: '4px 8px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>حذف</button>}
                        </div>
                      </div>
                      {/* Dark Mode */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--sa-sub-text-secondary)' }}>الوضع الداكن</span>
                        <div style={{ width: '100%', height: '50px', borderRadius: '6px', border: '1px solid var(--sa-sub-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', overflow: 'hidden' }}>
                          {logoLoginDarkPreview
                            ? <img src={logoLoginDarkPreview} alt="Login Dark" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                            : <span style={{ fontSize: '1rem', opacity: 0.2 }}>🖼️</span>
                          }
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <label htmlFor="logo-login-dark-input" style={{ padding: '4px 8px', background: '#6366f1', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>رفع</label>
                          <input id="logo-login-dark-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleLogoChange(e, 'logoLoginDarkUrl', setLogoLoginDarkPreview)} />
                          {logoLoginDarkPreview && <button type="button" onClick={() => { setLogoLoginDarkPreview(''); setSettings(prev => ({ ...prev, logoLoginDarkUrl: '' })); }} style={{ padding: '4px 8px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>حذف</button>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. Landing Page Header Logo Card */}
                  <div style={{ background: 'var(--sa-sub-bg)', padding: '20px', borderRadius: '14px', border: '1px solid var(--sa-sub-border)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--sa-sub-border)', paddingBottom: '8px' }}>
                      <strong style={{ fontSize: '0.95rem' }}>🌐 صفحة الهبوط (Landing Page)</strong>
                      <span style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 'bold' }}>44 × 44 px - أيقونة ونص</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {/* Light Mode */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--sa-sub-text-secondary)' }}>الوضع الفاتح</span>
                        <div style={{ width: '100%', height: '50px', borderRadius: '6px', border: '1px solid var(--sa-sub-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', overflow: 'hidden' }}>
                          {logoLandingLightPreview
                            ? <img src={logoLandingLightPreview} alt="Landing Light" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                            : <span style={{ fontSize: '1rem', opacity: 0.2 }}>🖼️</span>
                          }
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <label htmlFor="logo-landing-light-input" style={{ padding: '4px 8px', background: '#6366f1', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>رفع</label>
                          <input id="logo-landing-light-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleLogoChange(e, 'logoLandingLightUrl', setLogoLandingLightPreview)} />
                          {logoLandingLightPreview && <button type="button" onClick={() => { setLogoLandingLightPreview(''); setSettings(prev => ({ ...prev, logoLandingLightUrl: '' })); }} style={{ padding: '4px 8px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>حذف</button>}
                        </div>
                      </div>
                      {/* Dark Mode */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--sa-sub-text-secondary)' }}>الوضع الداكن</span>
                        <div style={{ width: '100%', height: '50px', borderRadius: '6px', border: '1px solid var(--sa-sub-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', overflow: 'hidden' }}>
                          {logoLandingDarkPreview
                            ? <img src={logoLandingDarkPreview} alt="Landing Dark" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                            : <span style={{ fontSize: '1rem', opacity: 0.2 }}>🖼️</span>
                          }
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <label htmlFor="logo-landing-dark-input" style={{ padding: '4px 8px', background: '#6366f1', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>رفع</label>
                          <input id="logo-landing-dark-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleLogoChange(e, 'logoLandingDarkUrl', setLogoLandingDarkPreview)} />
                          {logoLandingDarkPreview && <button type="button" onClick={() => { setLogoLandingDarkPreview(''); setSettings(prev => ({ ...prev, logoLandingDarkUrl: '' })); }} style={{ padding: '4px 8px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>حذف</button>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5. Favicon Card */}
                  <div style={{ background: 'var(--sa-sub-bg)', padding: '20px', borderRadius: '14px', border: '1px solid var(--sa-sub-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--sa-sub-border)', paddingBottom: '8px' }}>
                      <strong style={{ fontSize: '0.95rem' }}>🎯 أيقونة المتصفح (Favicon)</strong>
                      <span style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 'bold' }}>16x16 / 32x32 px</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '5px' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '8px', border: '2px dashed var(--sa-sub-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', overflow: 'hidden', flexShrink: 0 }}>
                        {logoFaviconPreview
                          ? <img src={logoFaviconPreview} alt="Favicon Logo" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                          : <span style={{ fontSize: '1.2rem', opacity: 0.3 }}>🎯</span>
                        }
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--sa-sub-text-secondary)' }}>أيقونة تبويب المتصفح</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <label htmlFor="logo-favicon-input" style={{ display: 'inline-block', padding: '6px 12px', background: '#6366f1', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>رفع</label>
                          <input id="logo-favicon-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleLogoChange(e, 'logoFaviconUrl', setLogoFaviconPreview)} />
                          {logoFaviconPreview && <button type="button" onClick={() => { setLogoFaviconPreview(''); setSettings(prev => ({ ...prev, logoFaviconUrl: '' })); }} style={{ padding: '6px 12px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>حذف</button>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 6. Default Fallback Card */}
                  <div style={{ background: 'var(--sa-sub-bg)', padding: '20px', borderRadius: '14px', border: '1px solid var(--sa-sub-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--sa-sub-border)', paddingBottom: '8px' }}>
                      <strong style={{ fontSize: '0.95rem' }}>🖼️ الشعار الاحتياطي العام (Fallback)</strong>
                      <span style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 'bold' }}>شعار افتراضي شامل</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '5px' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '8px', border: '2px dashed var(--sa-sub-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', overflow: 'hidden', flexShrink: 0 }}>
                        {logoPreview
                          ? <img src={logoPreview} alt="Default Logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                          : <span style={{ fontSize: '1.2rem', opacity: 0.3 }}>🖼️</span>
                        }
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--sa-sub-text-secondary)' }}>يستخدم لتعويض أي حقل تركه فارغاً</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <label htmlFor="logo-default-input" style={{ display: 'inline-block', padding: '6px 12px', background: '#6366f1', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>رفع</label>
                          <input id="logo-default-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleLogoChange(e, 'logoUrl', setLogoPreview)} />
                          {logoPreview && <button type="button" onClick={() => { setLogoPreview(''); setSettings(prev => ({ ...prev, logoUrl: '' })); }} style={{ padding: '6px 12px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>حذف</button>}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              <div className="sa-sub-form-group" style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', marginBottom: '8px' }}>
                  🏢 اسم البرنامج / العلامة التجارية:
                </label>
                <input
                  type="text"
                  className="sa-sub-form-input"
                  placeholder="مثال: نظام سجل"
                  value={settings.softwareName}
                  onChange={(e) => setSettings({ ...settings, softwareName: e.target.value })}
                  required
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid var(--sa-sub-border)', background: 'var(--sa-sub-bg)', color: 'var(--sa-sub-text-primary)' }}
                />
              </div>

              <div className="sa-sub-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', marginBottom: '8px' }}>
                  📞 رقم الدعم الفني للواتساب / الاتصال:
                </label>
                <input
                  type="text"
                  className="sa-sub-form-input"
                  placeholder="مثال: +201281018810"
                  value={settings.supportPhone}
                  onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                  required
                  style={{ width: '100%', direction: 'ltr', textAlign: 'right', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid var(--sa-sub-border)', background: 'var(--sa-sub-bg)', color: 'var(--sa-sub-text-primary)' }}
                />
              </div>

              <div className="sa-sub-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', marginBottom: '8px' }}>
                  🔵 رابط صفحة فيسبوك (Facebook URL):
                </label>
                <input
                  type="url"
                  className="sa-sub-form-input"
                  placeholder="مثال: https://facebook.com/yourpage"
                  value={settings.facebookUrl}
                  onChange={(e) => setSettings({ ...settings, facebookUrl: e.target.value })}
                  style={{ width: '100%', direction: 'ltr', textAlign: 'right', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid var(--sa-sub-border)', background: 'var(--sa-sub-bg)', color: 'var(--sa-sub-text-primary)' }}
                />
              </div>

              <div className="sa-sub-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', marginBottom: '8px' }}>
                  🔗 رابط لينكد إن (LinkedIn URL):
                </label>
                <input
                  type="url"
                  className="sa-sub-form-input"
                  placeholder="مثال: https://linkedin.com/company/yourcompany"
                  value={settings.linkedInUrl}
                  onChange={(e) => setSettings({ ...settings, linkedInUrl: e.target.value })}
                  style={{ width: '100%', direction: 'ltr', textAlign: 'right', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid var(--sa-sub-border)', background: 'var(--sa-sub-bg)', color: 'var(--sa-sub-text-primary)' }}
                />
              </div>

              <div className="sa-sub-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', marginBottom: '8px' }}>
                  🔴 رابط قناة يوتيوب (YouTube URL):
                </label>
                <input
                  type="url"
                  className="sa-sub-form-input"
                  placeholder="مثال: https://youtube.com/c/yourchannel"
                  value={settings.youtubeUrl}
                  onChange={(e) => setSettings({ ...settings, youtubeUrl: e.target.value })}
                  style={{ width: '100%', direction: 'ltr', textAlign: 'right', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid var(--sa-sub-border)', background: 'var(--sa-sub-bg)', color: 'var(--sa-sub-text-primary)' }}
                />
              </div>

              {/* ─── Payment Methods ─────────────────────────────────────── */}
              <div className="sa-sub-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', marginBottom: '8px' }}>
                  💳 رقم فودافون كاش للدفع:
                </label>
                <input
                  type="text"
                  className="sa-sub-form-input"
                  placeholder="مثال: 01012345678"
                  value={settings.vodafoneCashNumber}
                  onChange={(e) => setSettings({ ...settings, vodafoneCashNumber: e.target.value })}
                  style={{ width: '100%', direction: 'ltr', textAlign: 'right', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid var(--sa-sub-border)', background: 'var(--sa-sub-bg)', color: 'var(--sa-sub-text-primary)' }}
                />
              </div>

              <div className="sa-sub-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', marginBottom: '8px' }}>
                  ⚡ عنوان إنستا باي (Instapay Address):
                </label>
                <input
                  type="text"
                  className="sa-sub-form-input"
                  placeholder="مثال: pos@instapay"
                  value={settings.instapayAddress}
                  onChange={(e) => setSettings({ ...settings, instapayAddress: e.target.value })}
                  style={{ width: '100%', direction: 'ltr', textAlign: 'right', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid var(--sa-sub-border)', background: 'var(--sa-sub-bg)', color: 'var(--sa-sub-text-primary)' }}
                />
              </div>

              {/* ─── Facebook Pixel ID ─────────────────────────────────────── */}
              <div className="sa-sub-form-group" style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', marginBottom: '8px' }}>
                  📊 Facebook Pixel ID (معرّف بيكسل فيسبوك للإعلانات):
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="sa-sub-form-input"
                    placeholder="مثال: 1234567890123456"
                    value={settings.facebookPixelId}
                    onChange={(e) => setSettings({ ...settings, facebookPixelId: e.target.value.trim() })}
                    style={{
                      width: '100%',
                      direction: 'ltr',
                      textAlign: 'left',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: settings.facebookPixelId ? '1.5px solid #1877f2' : '1.5px solid var(--sa-sub-border)',
                      background: 'var(--sa-sub-bg)',
                      color: 'var(--sa-sub-text-primary)',
                      fontFamily: 'monospace',
                      fontSize: '1rem',
                      letterSpacing: '1px'
                    }}
                  />
                  {settings.facebookPixelId && (
                    <span style={{
                      position: 'absolute',
                      left: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '0.75rem',
                      color: '#1877f2',
                      fontWeight: 'bold',
                      pointerEvents: 'none'
                    }}>✓ Pixel ID محدد</span>
                  )}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--sa-sub-text-secondary)', marginTop: '6px', lineHeight: '1.5' }}>
                  🔍 ستجد الـ Pixel ID في: <strong>Meta Business Suite → Events Manager → اختار البيكسل → Settings</strong>
                  <br />بعد الحفظ، سيُفعَّل البيكسل تلقائياً في Landing Page وصفحة التسجيل.
                </p>
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-start', marginTop: '16px' }}>
                <button
                  type="submit"
                  className="sa-sub-btn-primary"
                  disabled={savingSettings}
                  style={{
                    padding: '12px 30px',
                    fontSize: '1rem',
                    borderRadius: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, var(--sa-sub-accent-blue), #4f46e5)',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    border: 'none',
                    color: '#fff',
                    fontFamily: 'inherit'
                  }}
                >
                  {savingSettings && <span className="sa-sub-spinner"></span>}
                  {savingSettings ? 'جاري حفظ الإعدادات...' : '💾 حفظ الإعدادات'}
                </button>
              </div>

            </form>
          </div>
        )}
      </div>

      {/* Extend Subscription Modal */}
      {extendModal.open && extendModal.tenant && (
        <ModalContainer>
          <div className="sa-sub-modal-overlay" onClick={closeExtendModal}>
            <div className="sa-sub-modal" onClick={(e) => e.stopPropagation()}>
              <div className="sa-sub-modal-header">
                <h3>📅 تمديد الاشتراك</h3>
                <button className="sa-sub-modal-close" onClick={closeExtendModal}>
                  ✕
                </button>
              </div>
              <div className="sa-sub-modal-body">
                {/* Tenant Info Card */}
                <div className="sa-sub-modal-tenant-info">
                  <div
                    className="sa-sub-modal-tenant-avatar"
                    style={{ background: getAvatarColor(extendModal.tenant.id) }}
                  >
                    {(extendModal.tenant.name || '?').charAt(0)}
                  </div>
                  <div className="sa-sub-modal-tenant-details">
                    <h4>{extendModal.tenant.name}</h4>
                    <p>
                      ينتهي في: {formatDate(extendModal.tenant.subscriptionExpiry)}
                    </p>
                  </div>
                </div>

                {/* Type Toggle */}
                <div className="sa-sub-extend-type-group">
                  <button
                    className={`sa-sub-extend-type-btn ${extendType === 'months' ? 'active' : ''}`}
                    onClick={() => { setExtendType('months'); setExtendAmount(''); }}
                  >
                    بالأشهر
                  </button>
                  <button
                    className={`sa-sub-extend-type-btn ${extendType === 'days' ? 'active' : ''}`}
                    onClick={() => { setExtendType('days'); setExtendAmount(''); }}
                  >
                    بالأيام
                  </button>
                </div>

                {/* Amount Input */}
                <div className="sa-sub-form-group">
                  <label>
                    {extendType === 'months' ? 'عدد الأشهر' : 'عدد الأيام'}
                  </label>
                  <input
                    className="sa-sub-form-input"
                    type="number"
                    min="1"
                    placeholder={extendType === 'months' ? 'مثال: 3' : 'مثال: 30'}
                    value={extendAmount}
                    onChange={(e) => setExtendAmount(e.target.value)}
                    autoFocus
                  />

                  {/* Quick Amount Buttons */}
                  <div className="sa-sub-quick-amounts">
                    {extendType === 'months'
                      ? [1, 3, 6, 12].map((m) => (
                          <button
                            key={m}
                            className={`sa-sub-quick-btn ${extendAmount === String(m) ? 'active' : ''}`}
                            onClick={() => setExtendAmount(String(m))}
                          >
                            {m} {m === 1 ? 'شهر' : m < 11 ? 'أشهر' : 'شهر'}
                          </button>
                        ))
                      : [7, 14, 30, 90].map((d) => (
                          <button
                            key={d}
                            className={`sa-sub-quick-btn ${extendAmount === String(d) ? 'active' : ''}`}
                            onClick={() => setExtendAmount(String(d))}
                          >
                            {d} يوم
                          </button>
                        ))}
                  </div>
                </div>
              </div>
              <div className="sa-sub-modal-footer">
                <button className="sa-sub-btn-ghost" onClick={closeExtendModal}>
                  إلغاء
                </button>
                <button
                  className="sa-sub-btn-primary"
                  onClick={handleExtendSubscription}
                  disabled={extending || !extendAmount}
                >
                  {extending && <span className="sa-sub-spinner"></span>}
                  {extending ? 'جاري التمديد...' : 'تأكيد التمديد'}
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {/* Reject Subscription Request Modal */}
      {rejectModal.open && (
        <ModalContainer>
          <div className="sa-sub-modal-overlay" onClick={() => setRejectModal({ open: false, requestId: null, tenantName: '', reason: '' })}>
            <div className="sa-sub-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
              <div className="sa-sub-modal-header" style={{ borderBottom: '1px solid var(--sa-sub-border)', background: 'linear-gradient(to bottom, rgba(239, 68, 68, 0.05), transparent)' }}>
                <h3 style={{ color: '#ef4444' }}>❌ رفض طلب تجديد الاشتراك</h3>
                <button className="sa-sub-modal-close" onClick={() => setRejectModal({ open: false, requestId: null, tenantName: '', reason: '' })}>
                  ✕
                </button>
              </div>
              <form onSubmit={handleRejectRequestSubmit}>
                <div className="sa-sub-modal-body">
                  <p style={{ margin: '0 0 16px', fontSize: '0.95rem', color: 'var(--sa-sub-text-secondary)' }}>
                    أنت تقوم برفض طلب تجديد الاشتراك الخاص بمتجر: <strong style={{ color: 'var(--sa-sub-text-primary)' }}>{rejectModal.tenantName}</strong>. 
                    يرجى توضيح سبب الرفض ليظهر للمستأجر بشكل فوري.
                  </p>

                  {/* Preset Buttons */}
                  <div className="sa-sub-form-group" style={{ marginBottom: '16px' }}>
                    <label style={{ fontWeight: '700', fontSize: '0.85rem', marginBottom: '8px', display: 'block' }}>
                      أسباب رفض جاهزة للتحديد السريع:
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {REJECT_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setRejectModal(prev => ({ ...prev, reason: preset }))}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: '1.5px dashed var(--sa-sub-border)',
                            background: rejectModal.reason === preset ? 'rgba(239, 68, 68, 0.05)' : 'var(--sa-sub-bg)',
                            color: rejectModal.reason === preset ? '#ef4444' : 'var(--sa-sub-text-primary)',
                            borderColor: rejectModal.reason === preset ? '#ef4444' : 'var(--sa-sub-border)',
                            textAlign: 'right',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            fontFamily: 'inherit'
                          }}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Textarea reason */}
                  <div className="sa-sub-form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: '700', fontSize: '0.85rem', marginBottom: '8px', display: 'block' }}>
                      سبب الرفض المخصص:
                    </label>
                    <textarea
                      required
                      placeholder="اكتب سبب الرفض هنا بالتفصيل للعميل..."
                      value={rejectModal.reason}
                      onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                      style={{
                        width: '100%',
                        height: '90px',
                        borderRadius: '10px',
                        border: '1.5px solid var(--sa-sub-border)',
                        background: 'var(--sa-sub-bg)',
                        color: 'var(--sa-sub-text-primary)',
                        padding: '10px 12px',
                        fontFamily: 'inherit',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        resize: 'none',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        textAlign: 'right'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#ef4444'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--sa-sub-border)'}
                    />
                  </div>
                </div>
                <div className="sa-sub-modal-footer">
                  <button 
                    type="button" 
                    className="sa-sub-btn-ghost" 
                    onClick={() => setRejectModal({ open: false, requestId: null, tenantName: '', reason: '' })}
                    disabled={rejecting}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="sa-sub-btn-primary"
                    style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)' }}
                    disabled={rejecting}
                  >
                    {rejecting && <span className="sa-sub-spinner"></span>}
                    {rejecting ? 'جاري الرفض...' : 'تأكيد رفض الطلب'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalContainer>
      )}

      {/* Lightbox / Zoom Image Modal */}
      {lightbox.open && (
        <ModalContainer>
          <div 
            className="sa-sub-modal-overlay" 
            onClick={() => setLightbox({ open: false, imgUrl: '', tenantName: '' })}
            style={{ background: 'rgba(15, 23, 42, 0.9)', zIndex: 3000 }}
          >
            <div 
              className="sa-sub-modal" 
              onClick={(e) => e.stopPropagation()} 
              style={{ 
                maxWidth: '650px', 
                border: 'none',
                background: 'var(--sa-sub-card-bg)',
                borderRadius: '16px',
                overflow: 'hidden'
              }}
            >
              <div className="sa-sub-modal-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--sa-sub-border)' }}>
                <h3 style={{ fontSize: '1.1rem' }}>🖼️ إيصال تحويل الدفع لمتجر: {lightbox.tenantName}</h3>
                <button className="sa-sub-modal-close" onClick={() => setLightbox({ open: false, imgUrl: '', tenantName: '' })}>
                  ✕
                </button>
              </div>
              <div 
                className="sa-sub-modal-body" 
                style={{ 
                  padding: 0,
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  background: '#111', 
                  maxHeight: '70vh', 
                  overflow: 'hidden' 
                }}
              >
                <img 
                  src={lightbox.imgUrl} 
                  alt="إيصال التجديد المحول" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '70vh', 
                    objectFit: 'contain',
                    transition: 'transform 0.3s ease'
                  }} 
                />
              </div>
              <div className="sa-sub-modal-footer" style={{ padding: '12px 24px', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--sa-sub-text-secondary)', fontWeight: '600' }}>
                  انقر خارج النافذة للإغلاق
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <a 
                    href={lightbox.imgUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="sa-sub-btn-ghost" 
                    style={{ textDecoration: 'none', padding: '8px 16px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    📥 فتح بالحجم الكامل
                  </a>
                  <button 
                    className="sa-sub-btn-ghost" 
                    onClick={() => setLightbox({ open: false, imgUrl: '', tenantName: '' })}
                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </>
  );
};

export default SuperAdminSubscriptions;
