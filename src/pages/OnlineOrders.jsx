import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Api, { API_BASE } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import '../styles/pages/OnlineOrdersPremium.css';

const StatusIcon = ({ type }) => {
  switch (type) {
    case 'PENDING': return <i className="fas fa-clock"></i>;
    case 'CONFIRMED': return <i className="fas fa-check-circle"></i>;
    case 'PREPARING': return <i className="fas fa-box-open"></i>;
    case 'READY': return <i className="fas fa-box"></i>;
    case 'DELIVERED': return <i className="fas fa-truck-loading"></i>;
    case 'CANCELLED': return <i className="fas fa-ban"></i>;
    case 'RETURNED': return <i className="fas fa-reply"></i>;
    default: return <i className="fas fa-circle"></i>;
  }
};

const statusConfig = {
  AWAITING_PAYMENT: { label: 'انتظار الدفع', color: '#6366f1', badgeClass: 'badge-blue' },
  PENDING: { label: 'في الانتظار', color: '#f59e0b', badgeClass: 'badge-amber' },
  CONFIRMED: { label: 'مؤكد', color: '#3b82f6', badgeClass: 'badge-blue' },
  PREPARING: { label: 'جاري التجهيز', color: '#8b5cf6', badgeClass: 'badge-blue' },
  READY: { label: 'جاهز', color: '#10b981', badgeClass: 'badge-green' },
  DELIVERED: { label: 'تم التسليم', color: '#059669', badgeClass: 'badge-green' },
  CANCELLED: { label: 'ملغي', color: '#ef4444', badgeClass: 'badge-danger' },
  RETURNED: { label: 'مرتجع', color: '#f97316', badgeClass: 'badge-amber' },
};

const nextStatusMap = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'PREPARING',
  PREPARING: 'READY',
  READY: 'DELIVERED',
};

const OnlineOrders = () => {
  const { toast } = useGlobalUI();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const isAdmin = Api.isAdminOrBranchManager();
  
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);

  const [returnReason, setReturnReason] = useState('');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnTarget, setReturnTarget] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const branchQuery = selectedBranchId ? `&branchId=${selectedBranchId}` : '';
      const res = await Api._request(`/online-orders?page=${page}&size=20${activeTab !== 'ALL' ? `&status=${activeTab}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}${branchQuery}`);
      const data = res.data;
      setOrders(data.items || []);
      setTotalPages(data.totalPages || 1);
    } catch (e) { toast(e.response?.data?.message || e.message, 'error'); }
    finally { setLoading(false); }
  }, [page, activeTab, search, toast, selectedBranchId]);

  const loadStats = useCallback(async () => {
    try {
      const branchQuery = selectedBranchId ? `?branchId=${selectedBranchId}` : '';
      const res = await Api._request(`/online-orders/stats${branchQuery}`);
      setStats(res.data || {});
    } catch (e) { console.error(e); }
  }, [selectedBranchId]);

  useEffect(() => {
    if (isAdmin && branches.length === 0) {
      Api.getBranches().then(setBranches).catch(() => {});
    }
  }, [isAdmin, branches.length]);

  useEffect(() => { loadOrders(); }, [loadOrders]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await Api._request(`/online-orders/${orderId}/status?status=${newStatus}`, { method: 'PUT' });
      toast('تم تحديث حالة الطلب بنجاح', 'success');
      loadOrders();
      loadStats();
      if (selectedOrderDetails && selectedOrderDetails.id === orderId) {
        const res = await Api._request(`/online-orders/${orderId}`);
        setSelectedOrderDetails(res.data);
      }
    } catch (e) { toast(e.response?.data?.message || e.message, 'error'); }
  };

  const openCancelModal = (id) => { 
    setCancelTarget(id); 
    setCancelReason('');
    setShowCancelModal(true); 
  };

  const handleCancel = async (e) => {
    e.preventDefault();
    if (!cancelTarget || !cancelReason.trim()) {
        toast('برجاء كتابة سبب الإلغاء', 'error');
        return;
    }
    try {
      await Api._request(`/online-orders/${cancelTarget}/cancel?reason=${encodeURIComponent(cancelReason)}`, { method: 'PUT' });
      toast('تم إلغاء الطلب بنجاح', 'success');
      setShowCancelModal(false);
      setCancelTarget(null);
      loadOrders();
      loadStats();
      if (selectedOrderDetails && selectedOrderDetails.id === cancelTarget) {
        const res = await Api._request(`/online-orders/${cancelTarget}`);
        setSelectedOrderDetails(res.data);
      }
    } catch (e) { toast(e.response?.data?.message || e.message, 'error'); }
  };

  const openReturnModal = (id) => { 
    setReturnTarget(id); 
    setReturnReason('');
    setShowReturnModal(true); 
  };

  const handleReturn = async (e) => {
    e.preventDefault();
    if (!returnTarget || !returnReason.trim()) {
        toast('برجاء كتابة سبب الإرجاع', 'error');
        return;
    }
    try {
      await Api._request(`/online-orders/${returnTarget}/return?reason=${encodeURIComponent(returnReason)}`, { method: 'PUT' });
      toast('تم إرجاع الطلب واسترداد الأموال بنجاح', 'success');
      setShowReturnModal(false);
      setReturnTarget(null);
      loadOrders();
      loadStats();
      if (selectedOrderDetails && selectedOrderDetails.id === returnTarget) {
        const res = await Api._request(`/online-orders/${returnTarget}`);
        setSelectedOrderDetails(res.data);
      }
    } catch (e) { toast(e.response?.data?.message || e.message, 'error'); }
  };

  const toggleOrderDetails = async (order) => {
    if (selectedOrderDetails && selectedOrderDetails.id === order.id) {
        setSelectedOrderDetails(null);
    } else {
        try {
            const res = await Api._request(`/online-orders/${order.id}`);
            setSelectedOrderDetails(res.data);
        } catch (e) {
            toast('حدث خطأ أثناء جلب تفاصيل الطلب', 'error');
        }
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_BASE}/products/images/${url.split('/').pop()}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
  };

  // Custom components (matching Categories)
  const CustomSelect = ({ options, value, onChange, icon }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(o => o.value === value) || options[0];

    return (
      <div className="ord-custom-select-container">
        <div className={`ord-custom-select-header ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
          <i className={`fas ${icon} icon-start`}></i>
          <span className="selected-text">{selectedOption.label}</span>
          <i className={`fas fa-chevron-down icon-end ${isOpen ? 'rotate' : ''}`}></i>
        </div>
        {isOpen && (
          <>
            <div className="ord-custom-select-overlay" onClick={() => setIsOpen(false)}></div>
            <div className="ord-custom-select-dropdown">
              {options.map(opt => (
                <div 
                  key={opt.value} 
                  className={`ord-custom-select-item ${opt.value === value ? 'active' : ''}`}
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                >
                  {opt.label}
                  {opt.value === value && <i className="fas fa-check"></i>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };


  return (
    <div className="online-orders-container">
      {/* 1. Breadcrumbs & Header */}
      <div className="ord-header-row">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="ord-breadcrumbs">
                  <Link to="/dashboard">الرئيسية</Link> / <span>الطلبات أونلاين</span>
              </div>
              <h1>الطلبات الإلكترونية</h1>
          </div>
          <div className="ord-header-actions">
              <button className="ord-btn-premium ord-btn-blue" onClick={() => window.open('/store', '_blank')}>
                  <i className="fas fa-external-link-alt"></i> <span style={{ marginRight: '8px' }}>زيارة المتجر</span>
              </button>
          </div>
      </div>

      {/* 2. KPI Stats Grid */}
      <div className="ord-stats-grid">
          <div className="ord-stat-card" onClick={() => { setActiveTab('ALL'); setPage(0); }} style={{cursor: 'pointer'}}>
              <div className="ord-stat-info">
                  <h4>إجمالي المبيعات</h4>
                  <div className="ord-stat-value">{stats.total || 0} <span style={{fontSize: '0.8rem'}}>طلب</span></div>
              </div>
              <div className="ord-stat-visual">
                  <div className="ord-stat-icon icon-purple">
                      <i className="fas fa-shopping-cart"></i>
                  </div>
              </div>
          </div>

          <div className="ord-stat-card" onClick={() => { setActiveTab('PENDING'); setPage(0); }} style={{cursor: 'pointer'}}>
              <div className="ord-stat-info">
                  <h4>الأرباح المتوقعة</h4>
                  <div className="ord-stat-value">4,500 <span style={{fontSize: '0.8rem'}}>ج.م</span></div>
              </div>
              <div className="ord-stat-visual">
                  <div className="ord-stat-icon icon-amber">
                      <i className="fas fa-chart-line"></i>
                  </div>
              </div>
          </div>

          <div className="ord-stat-card" onClick={() => { setActiveTab('READY'); setPage(0); }} style={{cursor: 'pointer'}}>
              <div className="ord-stat-info">
                  <h4>قيمة المخزون</h4>
                  <div className="ord-stat-value">13,500 <span style={{fontSize: '0.8rem'}}>ج.م</span></div>
              </div>
              <div className="ord-stat-visual">
                  <div className="ord-stat-icon icon-green">
                      <i className="fas fa-money-bill-wave"></i>
                  </div>
              </div>
          </div>

          <div className="ord-stat-card" style={{cursor: 'pointer'}}>
              <div className="ord-stat-info">
                  <h4>إجمالي المنتجات</h4>
                  <div className="ord-stat-value">2</div>
              </div>
              <div className="ord-stat-visual">
                  <div className="ord-stat-icon icon-blue">
                      <i className="fas fa-box"></i>
                  </div>
              </div>
          </div>
      </div>

      {/* 3. Toolbar Card */}
      <div className="ord-toolbar-card">
          <div className="ord-toolbar-left">
              <CustomSelect 
                icon="fa-filter"
                value={activeTab}
                onChange={(val) => { setActiveTab(val); setPage(0); }}
                options={[
                  { value: 'ALL', label: 'كل الحالات' },
                  { value: 'AWAITING_PAYMENT', label: 'انتظار الدفع' },
                  { value: 'PENDING', label: 'في الانتظار' },
                  { value: 'READY', label: 'جاهز / تم التسليم' },
                  { value: 'CANCELLED', label: 'ملغي' },
                  { value: 'RETURNED', label: 'مرتجع' }
                ]}
              />
              {isAdmin && (
                <CustomSelect 
                    icon="fa-store"
                    value={selectedBranchId}
                    onChange={(val) => { setSelectedBranchId(val); setPage(0); }}
                    options={[
                        { value: '', label: 'جميع الفروع' },
                        ...branches.map(b => ({ value: b.id.toString(), label: b.name }))
                    ]}
                />
              )}
          </div>

          <div className="ord-toolbar-right">
              <div className="ord-search-box">
                  <i className="fas fa-search"></i>
                  <input 
                    type="text" 
                    placeholder="ابحث برقم الطلب أو العميل..." 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                  />
              </div>
          </div>
      </div>

      {/* 4. Table Card */}
      <div className="ord-table-card">
          <div className="ord-table-container">
              {loading && orders.length === 0 ? (
                  <div style={{ padding: '40px' }}><Loader message="جاري التحميل..." /></div>
              ) : orders.length === 0 ? (
                  <div style={{ padding: '60px', textAlign: 'center', color: 'var(--ord-text-secondary)' }}>
                      <i className="fas fa-box-open" style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}></i>
                      <h3>لا توجد طلبات في هذا القسم</h3>
                  </div>
              ) : (
                  <table className="ord-table">
                      <thead>
                          <tr>
                              <th>رقم الطلب</th>
                              <th>العميل</th>
                              <th>المبلغ</th>
                              <th className="hide-mobile">طريقة الدفع</th>
                              <th className="hide-tablet">التاريخ</th>
                              <th>الحالة</th>
                              <th>الإجراءات</th>
                          </tr>
                      </thead>
                      <tbody>
                          {orders.map((order) => (
                              <React.Fragment key={order.id}>
                                  <tr className={selectedOrderDetails?.id === order.id ? 'ord-row-active' : ''}>
                                      <td>
                                          <div style={{ fontWeight: 800, color: 'var(--ord-accent-blue)' }}>{order.orderNumber}</div>
                                          <div style={{ fontSize: '0.7rem', color: 'var(--ord-text-secondary)' }}>{order.itemCount} صنف</div>
                                      </td>
                                      <td>
                                          <div style={{ fontWeight: 700 }}>{order.customerName}</div>
                                          <div style={{ fontSize: '0.75rem', color: 'var(--ord-text-secondary)' }}>{order.customerPhone}</div>
                                      </td>
                                      <td style={{ fontWeight: 800 }}>{Number(order.totalAmount).toLocaleString()} <small>ج.م</small></td>
                                      <td className="hide-mobile">
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                                  {order.paymentMethod === 'ONLINE' ? '💳 دفع إلكتروني' : '💵 عند الاستلام'}
                                              </span>
                                              {order.paymentMethod === 'ONLINE' && (
                                                  <span className={`ord-type-badge ${order.paymentStatus === 'PAID' ? 'badge-green' : 'badge-amber'}`} style={{fontSize: '0.65rem', padding: '2px 8px'}}>
                                                      {order.paymentStatus === 'PAID' ? 'تم الدفع' : 'في انتظار الدفع'}
                                                  </span>
                                              )}
                                          </div>
                                      </td>
                                      <td className="hide-tablet">{formatDate(order.orderDate)}</td>
                                      <td>
                                          <span className={`ord-type-badge ${statusConfig[order.status]?.badgeClass}`}>
                                              <StatusIcon type={order.status} /> {statusConfig[order.status]?.label}
                                          </span>
                                      </td>
                                      <td>
                                          <div className="ord-actions">
                                              <button className={`ord-action-btn ${selectedOrderDetails?.id === order.id ? 'active' : ''}`} onClick={() => toggleOrderDetails(order)} title="التفاصيل">
                                                  <i className={`fas ${selectedOrderDetails?.id === order.id ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                              </button>
                                          </div>
                                      </td>
                                  </tr>
                                  
                                  {selectedOrderDetails?.id === order.id && (
                                      <tr>
                                          <td colSpan="7" style={{ padding: '0', background: 'var(--ord-bg)' }}>
                                              <div style={{ padding: '24px', animation: 'fadeIn 0.3s ease' }}>
                                                  {/* Quick Actions */}
                                                  <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                                                      {nextStatusMap[selectedOrderDetails.status] && (
                                                          <button className="ord-btn-primary" onClick={() => handleStatusUpdate(selectedOrderDetails.id, nextStatusMap[selectedOrderDetails.status])}>
                                                              ترقية لـ: {statusConfig[nextStatusMap[selectedOrderDetails.status]].label}
                                                          </button>
                                                      )}
                                                      {selectedOrderDetails.status !== 'CANCELLED' && selectedOrderDetails.status !== 'DELIVERED' && selectedOrderDetails.status !== 'RETURNED' && (
                                                          <button className="ord-btn-ghost" style={{borderColor: '#ef4444', color: '#ef4444'}} onClick={() => openCancelModal(selectedOrderDetails.id)}>إلغاء الطلب</button>
                                                      )}
                                                      {selectedOrderDetails.status === 'DELIVERED' && (
                                                          <button className="ord-btn-ghost" style={{borderColor: '#f97316', color: '#f97316'}} onClick={() => openReturnModal(selectedOrderDetails.id)}>إرجاع الطلب</button>
                                                      )}
                                                  </div>

                                                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
                                                      {/* Items */}
                                                      <div style={{ background: 'var(--ord-card-bg)', borderRadius: '20px', border: '1px solid var(--ord-border)', padding: '20px' }}>
                                                          <h4 style={{ marginBottom: '16px' }}><i className="fas fa-box" style={{ color: 'var(--ord-accent-blue)' }}></i> محتويات الطلب</h4>
                                                          <table className="ord-table" style={{ fontSize: '0.9rem' }}>
                                                              <thead>
                                                                  <tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>
                                                              </thead>
                                                              <tbody>
                                                                  {selectedOrderDetails.items?.map(item => (
                                                                      <tr key={item.id}>
                                                                          <td style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                              {item.imageUrl && <img src={getImageUrl(item.imageUrl)} alt={item.productName} style={{width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover'}} />}
                                                                              {item.productName}
                                                                          </td>
                                                                          <td>{item.quantity}</td>
                                                                          <td>{Number(item.unitPrice).toLocaleString()}</td>
                                                                          <td style={{ fontWeight: 800 }}>{Number(item.totalPrice).toLocaleString()}</td>
                                                                      </tr>
                                                                  ))}
                                                              </tbody>
                                                          </table>
                                                      </div>

                                                      {/* Timeline */}
                                                      <div style={{ background: 'var(--ord-card-bg)', borderRadius: '20px', border: '1px solid var(--ord-border)', padding: '20px' }}>
                                                          <h4 style={{ marginBottom: '16px' }}><i className="fas fa-history" style={{ color: 'var(--ord-accent-amber)' }}></i> سجل التتبع</h4>
                                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                              {selectedOrderDetails.history?.map((hist, i) => (
                                                                  <div key={hist.id || i} style={{ display: 'flex', gap: '12px' }}>
                                                                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--ord-bg)', display: 'flex', alignItems: 'center', justifyItems: 'center', border: `1px solid ${statusConfig[hist.status]?.color}` }}>
                                                                          <StatusIcon type={hist.status} />
                                                                      </div>
                                                                      <div>
                                                                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: statusConfig[hist.status]?.color }}>{statusConfig[hist.status]?.label}</div>
                                                                          <div style={{ fontSize: '0.75rem', color: 'var(--ord-text-secondary)' }}>{formatDate(hist.changedAt)}</div>
                                                                          <div style={{ fontSize: '0.75rem' }}>👤 بواسطة: {hist.changedBy}</div>
                                                                          {hist.reason && <div style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'var(--ord-bg)', borderRadius: '4px', marginTop: '4px' }}>السبب: {hist.reason}</div>}
                                                                      </div>
                                                                  </div>
                                                              ))}
                                                          </div>
                                                      </div>
                                                  </div>
                                              </div>
                                          </td>
                                      </tr>
                                  )}
                              </React.Fragment>
                          ))}
                      </tbody>
                  </table>
              )}
          </div>

          <div className="ord-pagination">
              <div className="ord-pagination-info">
                  عرض {(page * 20) + 1} إلى {Math.min((page + 1) * 20, (page + 1) * orders.length)} من {totalPages * 20} نتيجة (تقريبي)
              </div>
              <div className="ord-pagination-btns">
                  <button className="ord-page-btn" disabled={page === 0} onClick={() => setPage(prev => prev - 1)}>السابق</button>
                  <button className="ord-page-btn active">{page + 1}</button>
                  <button className="ord-page-btn" disabled={page >= totalPages - 1} onClick={() => setPage(prev => prev + 1)}>التالي</button>
              </div>
          </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <ModalContainer>
          <div className="ord-modal-overlay" onClick={(e) => { if (e.target.classList.contains('ord-modal-overlay')) setShowCancelModal(false); }}>
            <div className="ord-modal" style={{ maxWidth: '400px' }}>
              <div className="ord-modal-header">
                <h3>🚫 إلغاء الطلب</h3>
                <button className="ord-modal-close" onClick={() => setShowCancelModal(false)}>✕</button>
              </div>
              <form onSubmit={handleCancel}>
                <div className="ord-modal-body">
                  <div className="ord-form-group">
                    <label>سبب الإلغاء *</label>
                    <textarea className="ord-textarea" rows="3" required value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="اكتب سبب الإلغاء هنا..."></textarea>
                  </div>
                </div>
                <div className="ord-modal-footer">
                  <button type="button" className="ord-btn-ghost" onClick={() => setShowCancelModal(false)}>تراجع</button>
                  <button type="submit" className="ord-btn-primary" style={{ background: '#ef4444' }}>تأكيد الإلغاء</button>
                </div>
              </form>
            </div>
          </div>
        </ModalContainer>
      )}

      {/* Return Modal */}
      {showReturnModal && (
        <ModalContainer>
          <div className="ord-modal-overlay" onClick={(e) => { if (e.target.classList.contains('ord-modal-overlay')) setShowReturnModal(false); }}>
            <div className="ord-modal" style={{ maxWidth: '400px' }}>
              <div className="ord-modal-header">
                <h3>🔄 إرجاع الطلب</h3>
                <button className="ord-modal-close" onClick={() => setShowReturnModal(false)}>✕</button>
              </div>
              <form onSubmit={handleReturn}>
                <div className="ord-modal-body">
                  <div className="ord-form-group">
                    <label>سبب الإرجاع *</label>
                    <textarea className="ord-textarea" rows="3" required value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder="اكتب سبب الإرجاع هنا..."></textarea>
                  </div>
                </div>
                <div className="ord-modal-footer">
                  <button type="button" className="ord-btn-ghost" onClick={() => setShowReturnModal(false)}>تراجع</button>
                  <button type="submit" className="ord-btn-primary" style={{ background: '#f97316' }}>تأكيد المرتجع</button>
                </div>
              </form>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default OnlineOrders;
