import React, { useState, useEffect, useMemo } from 'react';
import Api, { SERVER_URL } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import StatTile from '../components/common/StatTile';
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
  if (tenant.deleted) return 'deleted';
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
    case 'deleted': return '● محذوف';
    default: return '—';
  }
};

const getStatusClass = (status) => {
  switch (status) {
    case 'active': return 'sa-sub-badge-active';
    case 'expired': return 'sa-sub-badge-expired';
    case 'disabled': return 'sa-sub-badge-disabled';
    case 'deleted': return 'sa-sub-badge-disabled';
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

  // Tenants Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Pagination State
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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

  // Delete Modal state
  const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, tenant: null, password: '', mode: 'soft' });
  const [isDeleting, setIsDeleting] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!Api.isSuperAdmin()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  // Load data
  const loadInitialData = async () => {
    try {
      const [statsData, requestsData] = await Promise.all([
        Api.getSuperAdminStats(),
        Api.getSuperAdminSubscriptionRequests()
      ]);
      setStats(statsData);
      setRequests(requestsData);
    } catch (err) {
      toast(err.message || 'فشل في تحميل البيانات', 'error');
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadData = async (pageNumber = page, size = pageSize, searchQuery = debouncedSearch, status = filterStatus) => {
    setLoading(true);
    try {
      const res = await Api.getSuperAdminTenantsPaged(pageNumber, size, searchQuery, status);
      setTenants(res.items || []);
      setTotalPages(res.totalPages || 1);
      setTotalElements(res.totalElements || 0);
    } catch (err) {
      toast(err.message || 'فشل في تحميل قائمة المتاجر', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Reset page to 0 when filters change
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, filterStatus]);

  // Load tenants when page, page size, or filters change
  useEffect(() => {
    if (Api.isSuperAdmin()) {
      loadData(page, pageSize, debouncedSearch, filterStatus);
    }
  }, [page, pageSize, debouncedSearch, filterStatus]);

  const handleExport = async () => {
    try {
      toast('جاري تجهيز ملف الإكسيل...', 'info');
      await Api.downloadSuperAdminTenantsExport();
      toast('تم التصدير بنجاح ✅', 'success');
    } catch (err) {
      toast(err.message || 'فشل التصدير', 'error');
    }
  };

  // Request Pagination State
  const [requestsPage, setRequestsPage] = useState(0);
  const [requestsPageSize, setRequestsPageSize] = useState(10);
  const [requestsTotalPages, setRequestsTotalPages] = useState(1);
  const [requestsTotalElements, setRequestsTotalElements] = useState(0);
  const [debouncedRequestSearch, setDebouncedRequestSearch] = useState('');

  // Debounce requests search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedRequestSearch(requestSearch);
    }, 500);
    return () => clearTimeout(timer);
  }, [requestSearch]);

  const loadRequestsData = async (pageNumber = requestsPage, size = requestsPageSize, searchQuery = debouncedRequestSearch, status = requestStatusFilter) => {
    setLoading(true);
    try {
      const res = await Api.getSuperAdminSubscriptionRequestsPaged(pageNumber, size, searchQuery, status);
      setRequests(res.data?.items || res.items || []);
      setRequestsTotalPages(res.data?.totalPages || res.totalPages || 1);
      setRequestsTotalElements(res.data?.totalElements || res.totalElements || 0);
    } catch (err) {
      toast(err.message || 'فشل في تحميل الطلبات', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setRequestsPage(0);
  }, [debouncedRequestSearch, requestStatusFilter]);

  useEffect(() => {
    if (Api.isSuperAdmin() && activeTab === 'requests') {
      loadRequestsData(requestsPage, requestsPageSize, debouncedRequestSearch, requestStatusFilter);
    }
  }, [requestsPage, requestsPageSize, debouncedRequestSearch, requestStatusFilter, activeTab]);

  // Counts
  const pendingRequestsCount = stats.pendingRequestsCount || 0;

  // Impersonate tenant
  const handleImpersonate = async (tenant) => {
    try {
      const data = await Api.impersonateTenant(tenant.id);
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

  // Delete Tenant
  const handleDeleteSubmit = async (e) => {
    e.preventDefault();
    setIsDeleting(true);
    try {
      await Api.deleteSuperAdminTenant(deleteModalState.tenant.id, deleteModalState.password, deleteModalState.mode);
      toast('تم حذف المتجر بنجاح', 'success');
      setDeleteModalState({ isOpen: false, tenant: null, password: '', mode: 'soft' });
      loadData();
    } catch (err) {
      toast(err.message || 'فشل في عملية الحذف', 'error');
    } finally {
      setIsDeleting(false);
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

  // Communication Log methods
  const openCommModal = (tenant) => {
    navigate(`/super-admin/tenants/${tenant.id}/communications`, { state: { tenant } });
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
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          <StatTile
            id="tenant_total"
            label="إجمالي المستأجرين"
            value={stats.totalTenants || 0}
            icon="🏢"
            defaults={{ color: 'blue', size: 'tile-wd-sm', order: 1 }}
          />
          <StatTile
            id="tenant_active"
            label="الاشتراكات النشطة"
            value={stats.activeTenants || 0}
            icon="✅"
            defaults={{ color: 'emerald', size: 'tile-wd-sm', order: 2 }}
          />
          <StatTile
            id="tenant_pending"
            label="طلبات التجديد المعلقة"
            value={pendingRequestsCount}
            icon="⏳"
            defaults={{ color: 'amber', size: 'tile-wd-sm', order: 3 }}
          />
          <StatTile
            id="tenant_inactive"
            label="المعطلة / المنتهية"
            value={stats.inactiveTenants || 0}
            icon="⛔"
            defaults={{ color: 'rose', size: 'tile-wd-sm', order: 4 }}
          />
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
        </div>

        {activeTab === 'tenants' ? (
          <>
            <div className="card">
              <div className="card-header">
                <h3>🏢 إدارة المتاجر</h3>
                <div className="toolbar">
                  <div className="search-input">
                    <input
                      type="text"
                      placeholder="ابحث بالاسم، السلاق، أو البريد..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <span className="search-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
                  </div>

                  <select
                    className="form-control"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ width: '180px', height: '40px', padding: '0 10px' }}
                  >
                    <option value="all">كل المتاجر</option>
                    <option value="active">نشط</option>
                    <option value="expired">منتهي</option>
                    <option value="disabled">معطل</option>
                    <option value="deleted">المحذوفة</option>
                  </select>
                  
                  <div className="toolbar-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginRight: 'auto' }}>
                    <button className="btn btn-outline-secondary" onClick={handleExport} style={{ height: '40px' }}>
                      تصدير إكسيل
                    </button>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '0 15px', background: 'var(--bg-hover)', borderRadius: '8px', height: '40px', display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
                      النتائج: <span style={{ marginLeft: '5px', color: 'var(--text-primary)' }}>{totalElements}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tenants Table */}
              <div className="card-body no-padding">
              <div className="table-wrapper">
                {loading ? (
                  <Loader message="جاري تحميل المتاجر..." />
                ) : tenants.length === 0 ? (
                  <div className="sa-sub-empty-state">
                    <div className="sa-sub-empty-icon">📋</div>
                    <h3>لا يوجد مستأجرين</h3>
                    <p>لا توجد نتائج مطابقة لبحثك</p>
                  </div>
                ) : (
                  <table className="data-table" style={{ minWidth: '1000px' }}>
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
                       {tenants.map((tenant, index) => {
                         const status = getTenantStatus(tenant);
                         const remaining = getRemainingDays(tenant.subscriptionExpiry);
                         return (
                           <tr key={tenant.id}>
                             <td style={{ color: 'var(--text-muted)' }}>
                               {page * pageSize + index + 1}
                             </td>
                             <td>
                               <div 
                                 style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                                 onClick={() => openCommModal(tenant)} 
                                 title="اضغط لعرض أو إضافة سجل تواصل"
                               >
                                 <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: getAvatarColor(tenant.id), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                   {(tenant.name || '?').charAt(0)}
                                 </div>
                                 <div style={{ display: 'flex', flexDirection: 'column' }}>
                                   <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{tenant.name}</span>
                                   <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{tenant.slug}</span>
                                 </div>
                               </div>
                             </td>
                             <td style={{ direction: 'ltr', textAlign: 'right' }}>
                               {tenant.contactEmail || '—'}
                             </td>
                             <td style={{ direction: 'ltr', textAlign: 'right' }}>
                               {tenant.phone || '—'}
                             </td>
                             <td style={{ color: 'var(--text-secondary)' }}>
                               {formatDate(tenant.createdAt)}
                             </td>
                             <td>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                                 <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: status === 'active' ? 'var(--metro-green)' : status === 'expired' ? 'var(--metro-orange)' : 'var(--metro-red)' }}></div>
                                 <span>{getStatusLabel(status).replace('● ', '')}</span>
                               </div>
                             </td>
                             <td>
                               <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                 <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                   {formatDate(tenant.subscriptionExpiry)}
                                 </span>
                                 {remaining !== null && (
                                   <span
                                     style={{
                                       fontSize: '0.8rem',
                                       color: remaining > 30 ? 'var(--metro-green)' : remaining > 7 ? 'var(--metro-orange)' : 'var(--metro-red)',
                                       fontWeight: 'bold'
                                     }}
                                   >
                                     {remaining > 0 ? `باقي ${remaining} يوم` : `منتهي منذ ${Math.abs(remaining)} يوم`}
                                   </span>
                                 )}
                               </div>
                             </td>
                             <td>
                               <div className="table-actions" style={{ display: 'flex', gap: '8px' }}>
                                 <button
                                   className="btn btn-icon btn-ghost"
                                   title="دخول كمدير"
                                   onClick={() => handleImpersonate(tenant)}
                                 >
                                   🔑
                                 </button>
                                 <button
                                   className="btn btn-icon btn-ghost"
                                   title="تمديد الاشتراك"
                                   onClick={() => openExtendModal(tenant)}
                                 >
                                   📅
                                 </button>
                                 {tenant.active ? (
                                   <button
                                     className="btn btn-icon btn-ghost"
                                     title="تعطيل المستأجر"
                                     onClick={() => handleToggleStatus(tenant)}
                                   >
                                     ⛔
                                   </button>
                                 ) : (
                                     <button
                                       className="btn btn-icon btn-ghost"
                                       title="تفعيل المستأجر"
                                       onClick={() => handleToggleStatus(tenant)}
                                     >
                                       ✅
                                     </button>
                                   )}
                                   <button
                                     className="btn btn-icon btn-ghost"
                                     title="حذف المستأجر"
                                     onClick={() => setDeleteModalState({ isOpen: true, tenant, password: '', mode: 'soft' })}
                                   >
                                     🗑️
                                   </button>
                                 </div>
                               </td>
                           </tr>
                         );
                       })}
                     </tbody>
                  </table>
                )}
              </div>

              {!loading && tenants.length > 0 && (
                <div className="pagination" style={{ borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', flexWrap: 'wrap', gap: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      عرض {tenants.length} من إجمالي {totalElements}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>عدد الصفوف:</span>
                      <select
                        className="form-control"
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setPage(0);
                        }}
                        style={{ width: '70px', height: '34px', padding: '0 5px', fontSize: '0.85rem', borderRadius: '0' }}
                      >
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <button
                      disabled={page === 0}
                      onClick={() => setPage(page - 1)}
                      style={{ padding: '8px 12px', border: '1px solid var(--border-subtle)', background: page === 0 ? 'var(--bg-hover)' : '#fff', color: page === 0 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page === 0 ? 'not-allowed' : 'pointer', borderRadius: '4px' }}
                    >
                      السابق
                    </button>
                    
                    {[...Array(totalPages)].map((_, i) => {
                      const maxVisible = 5;
                      let start = Math.max(0, page - Math.floor(maxVisible / 2));
                      let end = Math.min(totalPages - 1, start + maxVisible - 1);
                      if (end - start + 1 < maxVisible) {
                        start = Math.max(0, end - maxVisible + 1);
                      }
                      
                      if (i >= start && i <= end) {
                        return (
                          <button
                            key={i}
                            onClick={() => setPage(i)}
                            style={{ 
                              padding: '8px 12px', 
                              border: '1px solid var(--border-subtle)', 
                              background: page === i ? 'var(--metro-blue)' : '#fff', 
                              color: page === i ? '#fff' : 'var(--text-primary)', 
                              cursor: 'pointer', 
                              borderRadius: '4px',
                              fontWeight: page === i ? 'bold' : 'normal'
                            }}
                          >
                            {i + 1}
                          </button>
                        );
                      }
                      return null;
                    })}
                    
                    <button
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage(page + 1)}
                      style={{ padding: '8px 12px', border: '1px solid var(--border-subtle)', background: page >= totalPages - 1 ? 'var(--bg-hover)' : '#fff', color: page >= totalPages - 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', borderRadius: '4px' }}
                    >
                      التالي
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          </>
        ) : (
          <>
            <div className="card">
              <div className="card-header">
                <h3>📥 طلبات تجديد الدفع اليدوي</h3>
                <div className="toolbar">
                  <div className="search-input">
                    <input
                      type="text"
                      placeholder="ابحث باسم المتجر أو رقم المرسل..."
                      value={requestSearch}
                      onChange={(e) => setRequestSearch(e.target.value)}
                    />
                    <span className="search-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
                  </div>

                  <select
                    className="form-control"
                    value={requestStatusFilter}
                    onChange={(e) => setRequestStatusFilter(e.target.value)}
                    style={{ width: '180px', height: '40px', padding: '0 10px' }}
                  >
                    <option value="ALL">الكل ({requests.length})</option>
                    <option value="PENDING">قيد الانتظار ({pendingRequestsCount})</option>
                    <option value="APPROVED">المقبولة</option>
                    <option value="REJECTED">المرفوضة</option>
                  </select>
                  
                  <div className="toolbar-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginRight: 'auto' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '0 15px', background: 'var(--bg-hover)', borderRadius: '8px', height: '40px', display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
                      النتائج: <span style={{ marginLeft: '5px', color: 'var(--text-primary)' }}>{requestsTotalElements}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Requests Table */}
              <div className="card-body no-padding">
              {loading ? (
                <Loader />
              ) : requests.length === 0 ? (
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
                      {requests.map((req, index) => (
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
              {/* Pagination Controls for Requests */}
              {requestsTotalPages > 1 && (
                <div className="pagination-container" style={{ padding: '15px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="pagination-info" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    عرض {requestsPage * requestsPageSize + 1} إلى {Math.min((requestsPage + 1) * requestsPageSize, requestsTotalElements)} من أصل {requestsTotalElements} طلب
                  </div>
                  <div className="pagination-buttons" style={{ display: 'flex', gap: '5px' }}>
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => setRequestsPage(Math.max(0, requestsPage - 1))}
                      disabled={requestsPage === 0}
                      style={{ padding: '5px 12px' }}
                    >
                      السابق
                    </button>
                    
                    {[...Array(requestsTotalPages)].map((_, i) => (
                      <button
                        key={i}
                        className={`btn ${requestsPage === i ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => setRequestsPage(i)}
                        style={{ padding: '5px 12px' }}
                      >
                        {i + 1}
                      </button>
                    ))}

                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => setRequestsPage(Math.min(requestsTotalPages - 1, requestsPage + 1))}
                      disabled={requestsPage === requestsTotalPages - 1}
                      style={{ padding: '5px 12px' }}
                    >
                      التالي
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          </>
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

      {/* Delete Tenant Modal */}
      {deleteModalState.isOpen && (
        <ModalContainer>
          <div className="sa-sub-modal-overlay" onClick={() => setDeleteModalState({ isOpen: false, tenant: null, password: '', mode: 'soft' })}>
            <div className="sa-sub-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
              <div className="sa-sub-modal-header">
                <h3>🗑️ حذف المتجر: {deleteModalState.tenant?.name}</h3>
                <button className="sa-sub-modal-close" onClick={() => setDeleteModalState({ isOpen: false, tenant: null, password: '', mode: 'soft' })}>✕</button>
              </div>
              <div className="sa-sub-modal-body">
                <form onSubmit={handleDeleteSubmit}>
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>نوع الحذف:</label>
                      <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                              <input 
                                  type="radio" 
                                  name="deleteMode" 
                                  value="soft" 
                                  checked={deleteModalState.mode === 'soft'} 
                                  onChange={(e) => setDeleteModalState({...deleteModalState, mode: e.target.value})} 
                              />
                              أرشفة (Soft Delete)
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                              <input 
                                  type="radio" 
                                  name="deleteMode" 
                                  value="hard" 
                                  checked={deleteModalState.mode === 'hard'} 
                                  onChange={(e) => setDeleteModalState({...deleteModalState, mode: e.target.value})} 
                              />
                              حذف نهائي (Hard Delete)
                          </label>
                      </div>
                      {deleteModalState.mode === 'hard' && (
                          <div style={{ color: '#dc2626', background: '#fee2e2', padding: '10px', borderRadius: '8px', marginTop: '15px', fontSize: '0.9rem' }}>
                              ⚠️ تحذير: هذا الخيار سيقوم بحذف جميع البيانات المتعلقة بالمتجر نهائياً ولا يمكن التراجع عنه.
                          </div>
                      )}
                  </div>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>كلمة المرور الخاصة بك لتأكيد العملية:</label>
                      <input 
                          type="password" 
                          className="sa-sub-input" 
                          required 
                          value={deleteModalState.password} 
                          onChange={(e) => setDeleteModalState({...deleteModalState, password: e.target.value})} 
                          placeholder="أدخل كلمة المرور"
                          style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                      <button type="button" className="sa-sub-btn-ghost" onClick={() => setDeleteModalState({ isOpen: false, tenant: null, password: '', mode: 'soft' })} disabled={isDeleting}>إلغاء</button>
                      <button type="submit" className="sa-sub-btn-primary" style={{ background: '#dc2626' }} disabled={isDeleting}>
                          {isDeleting ? 'جاري الحذف...' : 'تأكيد الحذف'}
                      </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

    </>
  );
};

export default SuperAdminSubscriptions;
