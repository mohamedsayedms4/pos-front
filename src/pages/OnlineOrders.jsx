import React, { useState, useEffect, useCallback } from 'react';
import Api, { API_BASE } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import StatTile from '../components/common/StatTile';

const StatusIcon = ({ type }) => {
  switch (type) {
    case 'PENDING': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
    case 'CONFIRMED': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
    case 'PREPARING': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;
    case 'READY': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>;
    case 'DELIVERED': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
    case 'CANCELLED': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>;
    case 'RETURNED': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;
    default: return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle></svg>;
  }
};

const statusConfig = {
  AWAITING_PAYMENT: { label: 'انتظار الدفع', color: '#6366f1', icon: <StatusIcon type="PENDING" />, badgeClass: 'badge-primary' },
  PENDING: { label: 'في الانتظار', color: '#f59e0b', icon: <StatusIcon type="PENDING" />, badgeClass: 'badge-warning' },
  CONFIRMED: { label: 'مؤكد', color: '#3b82f6', icon: <StatusIcon type="CONFIRMED" />, badgeClass: 'badge-info' },
  PREPARING: { label: 'جاري التجهيز', color: '#8b5cf6', icon: <StatusIcon type="PREPARING" />, badgeClass: 'badge-primary' },
  READY: { label: 'جاهز', color: '#10b981', icon: <StatusIcon type="READY" />, badgeClass: 'badge-success' },
  DELIVERED: { label: 'تم التسليم', color: '#059669', icon: <StatusIcon type="DELIVERED" />, badgeClass: 'badge-success' },
  CANCELLED: { label: 'ملغي', color: '#ef4444', icon: <StatusIcon type="CANCELLED" />, badgeClass: 'badge-danger' },
  RETURNED: { label: 'مرتجع', color: '#f97316', icon: <StatusIcon type="RETURNED" />, badgeClass: 'badge-warning' },
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
  
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);

  const [returnReason, setReturnReason] = useState('');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnTarget, setReturnTarget] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Api._request(`/online-orders?page=${page}&size=20${activeTab !== 'ALL' ? `&status=${activeTab}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`);
      const data = res.data;
      setOrders(data.items || []);
      setTotalPages(data.totalPages || 1);
    } catch (e) { toast(e.response?.data?.message || e.message, 'error'); }
    finally { setLoading(false); }
  }, [page, activeTab, search, toast]);

  const loadStats = useCallback(async () => {
    try {
      const res = await Api._request('/online-orders/stats');
      setStats(res.data || {});
    } catch (e) { console.error(e); }
  }, []);

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

  const printReceipt = (order) => {
    const content = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
          @page { margin: 0; size: auto; }
          body { 
            font-family: 'Cairo', sans-serif; 
            margin: 0; padding: 10px; width: 80mm; 
            background: #fff; color: #000; 
            font-size: 13px; line-height: 1.4;
          }
          .text-center { text-align: center; }
          .mb-1 { margin-bottom: 5px; }
          .mb-2 { margin-bottom: 15px; }
          .bold { font-weight: 700; }
          .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; }
          th, td { text-align: right; padding: 3px 0; vertical-align: top; }
          th { border-bottom: 1px solid #000; font-size: 11px; }
          .total-row { border-top: 1px solid #000; padding-top: 5px; font-size: 15px; }
        </style>
      </head>
      <body>
        <div class="text-center mb-2">
          <h2 class="mb-1" style="margin-top:0">فاتورة طلب أونلاين</h2>
          <div>رقم الطلب: ${order.orderNumber}</div>
          <div>التاريخ: ${formatDate(order.orderDate)}</div>
        </div>
        
        <div class="mb-2">
          <div><span class="bold">العميل:</span> ${order.customerName}</div>
          <div><span class="bold">الهاتف:</span> ${order.customerPhone}</div>
          ${order.deliveryAddress ? `<div><span class="bold">العنوان:</span> ${order.deliveryAddress}</div>` : ''}
        </div>

        <div class="divider"></div>

        <table>
          <thead>
            <tr>
              <th>الصنف</th>
              <th class="text-center">الكمية</th>
              <th class="text-center">السعر</th>
              <th style="text-align: left;">إجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${(order.items || []).map(item => `
              <tr>
                <td style="padding-left:5px">${item.productName}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-center">${Number(item.unitPrice).toFixed(2)}</td>
                <td style="text-align: left;">${Number(item.totalPrice).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="divider"></div>
        
        <div style="display: flex; justify-content: space-between;" class="bold total-row">
          <span>الإجمالي المطلوب:</span>
          <span>${Number(order.totalAmount).toFixed(2)} ج.م</span>
        </div>
        
        <div class="text-center" style="margin-top:20px; font-size: 11px;">
          <div>شكراً لتسوقكم معنا!</div>
        </div>
      </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.id = '__receipt_print_frame';
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(content);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => iframe.remove(), 2000);
    }, 500);
  };

  return (
    <>
      <div className="page-section">
        
        {/* Stats Dashboard */}
        <div className="stats-grid mb-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
          <StatTile 
            id="ord_total"
            label="إجمالي الطلبات"
            value={stats.total || 0}
            icon="📦"
            className={activeTab === 'ALL' ? 'active-card' : ''}
            onClick={() => { setActiveTab('ALL'); setPage(0); }}
            defaults={{ color: 'blue', size: 'tile-sq-sm', order: 1 }}
          />
          <StatTile 
            id="ord_awaiting"
            label="انتظار الدفع"
            value={stats.awaitingPayment || 0}
            icon="💳"
            className={activeTab === 'AWAITING_PAYMENT' ? 'active-card' : ''}
            onClick={() => { setActiveTab('AWAITING_PAYMENT'); setPage(0); }}
            defaults={{ color: 'blue', size: 'tile-sq-sm', order: 2 }}
          />
          <StatTile 
            id="ord_pending"
            label="في الانتظار"
            value={stats.pending || 0}
            icon="🕒"
            className={activeTab === 'PENDING' ? 'active-card' : ''}
            onClick={() => { setActiveTab('PENDING'); setPage(0); }}
            defaults={{ color: 'amber', size: 'tile-sq-sm', order: 3 }}
          />
          <StatTile 
            id="ord_ready"
            label="جاهز / تم التسليم"
            value={(stats.ready || 0) + (stats.delivered || 0)}
            icon="✅"
            className={activeTab === 'READY' ? 'active-card' : ''}
            onClick={() => { setActiveTab('READY'); setPage(0); }}
            defaults={{ color: 'emerald', size: 'tile-sq-sm', order: 4 }}
          />
          <StatTile 
            id="ord_cancelled"
            label="ملغي"
            value={stats.cancelled || 0}
            icon="🚫"
            className={activeTab === 'CANCELLED' ? 'active-card' : ''}
            onClick={() => { setActiveTab('CANCELLED'); setPage(0); }}
            defaults={{ color: 'crimson', size: 'tile-sq-sm', order: 5 }}
          />
          <StatTile 
            id="ord_returned"
            label="مرتجع"
            value={stats.returned || 0}
            icon="🔄"
            className={activeTab === 'RETURNED' ? 'active-card' : ''}
            onClick={() => { setActiveTab('RETURNED'); setPage(0); }}
            defaults={{ color: 'blue', size: 'tile-sq-sm', order: 6 }}
          />
        </div>


        <div className="card">
          <div className="card-header">
            <h3>📦 الطلبات الإلكترونية</h3>
            <div className="toolbar">
              <div className="search-input">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="بحث سريع..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select 
                className="form-control" 
                value={activeTab} 
                onChange={(e) => { setActiveTab(e.target.value); setPage(0); }}
                style={{ width: '220px', height: '40px', padding: '0 10px' }}
              >
                <option value="ALL">📦 الكل (الكل في واحد)</option>
                <option value="AWAITING_PAYMENT">💳 انتظار الدفع</option>
                <option value="PENDING">🕒 في الانتظار</option>
                <option value="READY">✅ جاهز / تم التسليم</option>
                <option value="CANCELLED">🚫 ملغي</option>
                <option value="RETURNED">🔄 مرتجع</option>
              </select>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-primary" onClick={() => window.open('/store', '_blank')}>
                  🛒 المتجر أونلاين
                </button>
              </div>
            </div>
          </div>

          <div className="card-body no-padding">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>رقم الطلب</th>
                    <th>العميل</th>
                    <th className="hide-tablet">المبلغ</th>
                    <th className="hide-mobile">طريقة الدفع</th>
                    <th className="hide-tablet">التاريخ</th>
                    <th>الحالة</th>
                    <th style={{ textAlign: 'center' }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && orders.length === 0 ? (
                    <tr><td colSpan="7"><Loader message="جاري التحميل..." /></td></tr>
                  ) : orders.length === 0 ? (
                    <tr><td colSpan="7" className="text-center" style={{ padding: '80px', color: 'var(--text-dim)' }}>لا توجد طلبات في هذا القسم</td></tr>
                  ) : orders.map((order) => (
                    <React.Fragment key={order.id}>
                      <tr className={selectedOrderDetails?.id === order.id ? 'active-row' : ''}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-white)' }}>{order.orderNumber}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{order.itemCount} صنف</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{order.customerName}</div>
                          <div className="hide-mobile" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{order.customerPhone}</div>
                        </td>
                        <td className="hide-tablet" style={{ fontWeight: 700 }}>{Number(order.totalAmount).toFixed(2)} ج.م</td>
                        <td className="hide-mobile">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '0.7rem' }}>
                              {order.paymentMethod === 'ONLINE' ? '💳 دفع إلكتروني' : '💵 عند الاستلام'}
                            </span>
                            {order.paymentMethod === 'ONLINE' && (
                              <span style={{ 
                                fontSize: '0.7rem', 
                                color: order.paymentStatus === 'PAID' ? 'var(--metro-green)' : 'var(--metro-orange)',
                                fontWeight: 800
                              }}>
                                {order.paymentStatus === 'PAID' ? '• تم الدفع' : '• انتظار'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="hide-tablet" style={{ fontSize: '0.8rem' }}>{formatDate(order.orderDate)}</td>
                        <td>
                          <span className={`badge ${statusConfig[order.status]?.badgeClass}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            {statusConfig[order.status]?.icon} {statusConfig[order.status]?.label}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className={`btn btn-sm ${selectedOrderDetails?.id === order.id ? 'btn-primary' : 'btn-ghost'}`} 
                            onClick={() => toggleOrderDetails(order)}
                          >
                            {selectedOrderDetails?.id === order.id ? 'إخفاء ▲' : 'التفاصيل ▼'}
                          </button>
                        </td>
                      </tr>
                      
                      {selectedOrderDetails?.id === order.id && (
                        <tr className="order-details-expanded">
                          <td colSpan="7">
                            <div className="expanded-content">
                                {/* Actions Bar */}
                                <div className="detail-actions-bar">
                                    {nextStatusMap[selectedOrderDetails.status] && (
                                      <button className="btn btn-emerald" onClick={() => handleStatusUpdate(selectedOrderDetails.id, nextStatusMap[selectedOrderDetails.status])}>
                                        ترقية لـ: {statusConfig[nextStatusMap[selectedOrderDetails.status]].label}
                                      </button>
                                    )}
                                    {selectedOrderDetails.status !== 'CANCELLED' && selectedOrderDetails.status !== 'DELIVERED' && selectedOrderDetails.status !== 'RETURNED' && (
                                      <button className="btn btn-danger" onClick={() => openCancelModal(selectedOrderDetails.id)}>إلغاء الطلب</button>
                                    )}
                                    {selectedOrderDetails.status === 'DELIVERED' && (
                                      <button className="btn btn-orange" onClick={() => openReturnModal(selectedOrderDetails.id)}>إرجاع المنتج</button>
                                    )}
                                    <button className="btn btn-ghost" onClick={() => printReceipt(selectedOrderDetails)}>
                                      🖨️ طباعة الفاتورة
                                    </button>
                                </div>

                                <div className="detail-grid">
                                    {/* Items Table */}
                                    <div className="detail-table-card">
                                        <h4>📦 محتويات الطلب</h4>
                                        <div className="mini-table-wrapper">
                                            <table className="mini-data-table">
                                                <thead>
                                                    <tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>
                                                </thead>
                                                <tbody>
                                                    {selectedOrderDetails.items?.map(item => (
                                                        <tr key={item.id}>
                                                            <td style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                {item.imageUrl && (
                                                                    <img src={getImageUrl(item.imageUrl)} alt={item.productName} className="prod-thumb" />
                                                                )}
                                                                {item.productName}
                                                            </td>
                                                            <td>{item.quantity}</td>
                                                            <td>{Number(item.unitPrice).toFixed(2)}</td>
                                                            <td style={{ fontWeight: 700 }}>{Number(item.totalPrice).toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Timeline */}
                                    <div className="detail-timeline-card">
                                        <h4>📅 سجل التتبع</h4>
                                        <div className="timeline">
                                            {selectedOrderDetails.history?.map((hist, i) => (
                                                <div key={hist.id || i} className="timeline-item">
                                                    <div className="timeline-icon" style={{ borderColor: statusConfig[hist.status]?.color }}>
                                                        {statusConfig[hist.status]?.icon}
                                                    </div>
                                                    <div className="timeline-info">
                                                        <div className="status-name" style={{ color: statusConfig[hist.status]?.color }}>{statusConfig[hist.status]?.label}</div>
                                                        <div className="status-time">{formatDate(hist.changedAt)}</div>
                                                        <div className="status-user">👤 بواسطة: {hist.changedBy}</div>
                                                        {hist.reason && <div className="status-reason">السبب: {hist.reason}</div>}
                                                    </div>
                                                </div>
                                            ))}
                                            {(!selectedOrderDetails.history || selectedOrderDetails.history.length === 0) && (
                                                <div className="empty-timeline">لا توجد سجلات</div>
                                            )}
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
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage(prev => prev - 1)}>السابق</button>
                <button className="active">{page + 1}</button>
                <button className="btn btn-ghost btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(prev => prev + 1)}>التالي</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setShowCancelModal(false); }}>
            <div className="modal" style={{ maxWidth: '400px' }}>
              <div className="modal-header">
                <h3>🚫 إلغاء الطلب</h3>
                <button className="modal-close" onClick={() => setShowCancelModal(false)}>✕</button>
              </div>
              <form onSubmit={handleCancel}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>سبب الإلغاء *</label>
                    <textarea className="form-control" rows="3" required value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowCancelModal(false)}>تراجع</button>
                  <button type="submit" className="btn btn-danger">تأكيد الإلغاء</button>
                </div>
              </form>
            </div>
          </div>
        </ModalContainer>
      )}

      {showReturnModal && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setShowReturnModal(false); }}>
            <div className="modal" style={{ maxWidth: '400px' }}>
              <div className="modal-header">
                <h3>🔄 إرجاع الطلب</h3>
                <button className="modal-close" onClick={() => setShowReturnModal(false)}>✕</button>
              </div>
              <form onSubmit={handleReturn}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>سبب الإرجاع *</label>
                    <textarea className="form-control" rows="3" required value={returnReason} onChange={(e) => setReturnReason(e.target.value)}></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowReturnModal(false)}>تراجع</button>
                  <button type="submit" className="btn btn-orange" style={{ background: '#f97316', color: 'white' }}>تأكيد المرتجع</button>
                </div>
              </form>
            </div>
          </div>
        </ModalContainer>
      )}

    </>
  );
};

export default OnlineOrders;
