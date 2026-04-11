import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import Api, { API_BASE } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';

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
    return new Date(dateStr).toLocaleString('ar-EG');
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
    <div className="page-section">
      <div className="debt-page-header">
        <div className="header-title">
          <h1 style={{ fontWeight: 200, letterSpacing: '1px' }}>الطلبات الإلكترونية</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            إدارة الطلبات، المتابعة، وسجل الحالات
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => window.open('/store', '_blank')}>
            🛒 عرض المتجر أونلاين
          </button>
        </div>
      </div>

      <div className="debt-stats-grid mb-3">
        <div className="stat-card blue">
          <div className="stat-value">{stats.total || 0}</div>
          <div className="stat-label">إجمالي الطلبات</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-value">{stats.pending || 0}</div>
          <div className="stat-label">في الانتظار</div>
        </div>
        <div className="stat-card emerald">
          <div className="stat-value">{(stats.ready || 0) + (stats.delivered || 0)}</div>
          <div className="stat-label">مكتمل / جاهز للتسليم</div>
        </div>
        <div className="stat-card red">
          <div className="stat-value">{stats.cancelled || 0}</div>
          <div className="stat-label">ألغيت</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-elevated)', borderRight: '4px solid #f97316' }}>
          <div className="stat-value" style={{ color: '#f97316' }}>{stats.returned || 0}</div>
          <div className="stat-label">مرتجعات</div>
        </div>
      </div>

      <div className="debt-tabs-container mb-3">
        {['ALL', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED', 'RETURNED'].map(tab => {
             const labels = {
                 ALL: 'الكل',
                 PENDING: 'في الانتظار',
                 CONFIRMED: 'مؤكد',
                 PREPARING: 'جاري التجهيز',
                 READY: 'جاهز',
                 DELIVERED: 'تم التسليم',
                 CANCELLED: 'ملغي',
                 RETURNED: 'مرتجع'
             };
             return (
                 <button 
                  key={tab}
                  className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => { setActiveTab(tab); setPage(0); }}
                >
                    {labels[tab]}
                </button>
             );
        })}
      </div>

      <div className="toolbar card mb-3" style={{ padding: '15px' }}>
        <div className="debt-toolbar">
          <div className="search-input" style={{ flex: 2 }}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="بحث برقم الطلب، العميل أو الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>الطلب</th>
                <th>العميل</th>
                <th>المبلغ الإجمالي</th>
                <th>تاريخ الطلب</th>
                <th>الحالة</th>
                <th style={{ textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6"><Loader message="جاري جلب الطلبات..." /></td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan="6" className="text-center" style={{ padding: '50px', color: 'var(--text-dim)' }}>لا توجد طلبات مطابقة</td></tr>
              ) : orders.map((order, idx) => (
                <React.Fragment key={order.id}>
                  <tr style={{ animationDelay: `${idx * 0.05}s`, background: 'rgba(255,255,255,0.02)' }}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{order.orderNumber}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{order.itemCount} صنف</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{order.customerName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{order.customerPhone}</div>
                    </td>
                    <td style={{ fontWeight: 700 }}>{Number(order.totalAmount).toFixed(2)} ج.م</td>
                    <td>{formatDate(order.orderDate)}</td>
                    <td>
                      <span className={`badge ${statusConfig[order.status]?.badgeClass || 'badge-primary'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        {statusConfig[order.status]?.icon} {statusConfig[order.status]?.label}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => toggleOrderDetails(order)}>
                        {selectedOrderDetails?.id === order.id ? 'إغلاق التفاصيل ▲' : 'التفاصيل والحالات ▼'}
                      </button>
                    </td>
                  </tr>
                  
                  {selectedOrderDetails?.id === order.id && (
                    <tr>
                      <td colSpan="6" style={{ padding: '0', background: 'rgba(0,0,0,0.15)' }}>
                        <div style={{ padding: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                            {/* Order Action Buttons */}
                            <div style={{ width: '100%', marginBottom: '15px', display: 'flex', gap: '10px' }}>
                                {nextStatusMap[selectedOrderDetails.status] && (
                                  <button className="btn btn-emerald" onClick={() => handleStatusUpdate(selectedOrderDetails.id, nextStatusMap[selectedOrderDetails.status])}>
                                    ترقية الحالة لـ: {statusConfig[nextStatusMap[selectedOrderDetails.status]].label}
                                  </button>
                                )}
                                {selectedOrderDetails.status !== 'CANCELLED' && selectedOrderDetails.status !== 'DELIVERED' && selectedOrderDetails.status !== 'RETURNED' && (
                                  <button className="btn btn-danger" onClick={() => openCancelModal(selectedOrderDetails.id)}>إلغاء الطلب</button>
                                )}
                                {selectedOrderDetails.status === 'DELIVERED' && (
                                  <button className="btn" style={{ background: '#f97316', color: 'white' }} onClick={() => openReturnModal(selectedOrderDetails.id)}>إرجاع ومسح الطلب</button>
                                )}
                                <button className="btn btn-secondary" onClick={() => printReceipt(selectedOrderDetails)} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  🖨️ طباعة الفاتورة (80mm)
                                </button>
                                {(selectedOrderDetails.status === 'CANCELLED' || selectedOrderDetails.status === 'RETURNED') && (
                                    <div style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '0.9rem' }}>
                                        الطلب مغلق (لا يمكن تغيير حالته)
                                        {selectedOrderDetails.cancelReason && ` — سبب: ${selectedOrderDetails.cancelReason}`}
                                    </div>
                                )}
                            </div>

                            {/* Items Table */}
                            <div style={{ flex: 2, minWidth: '300px' }}>
                                <h4 style={{ marginBottom: '10px', fontSize: '1.1rem' }}>📦 محتويات الطلب</h4>
                                <table className="data-table small">
                                    <thead>
                                        <tr>
                                            <th>المنتج</th>
                                            <th>الكمية</th>
                                            <th>السعر</th>
                                            <th>الإجمالي</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedOrderDetails.items?.map(item => (
                                            <tr key={item.id}>
                                                <td style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    {item.imageUrl && (
                                                        <img src={getImageUrl(item.imageUrl)} alt={item.productName} style={{ width: '30px', height: '30px', borderRadius: '4px', objectFit: 'cover' }} />
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

                            {/* Status History Timeline */}
                            <div style={{ flex: 1, minWidth: '300px' }}>
                                <h4 style={{ marginBottom: '10px', fontSize: '1.1rem' }}>📅 سجل الحالات</h4>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                                    {(!selectedOrderDetails.history || selectedOrderDetails.history.length === 0) ? (
                                        <div style={{ color: 'var(--text-muted)' }}>لا توجد سجلات للحالة</div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                            {selectedOrderDetails.history.map((hist, i) => (
                                                <div key={hist.id || i} style={{ display: 'flex', gap: '10px', position: 'relative' }}>
                                                    {i !== selectedOrderDetails.history.length - 1 && (
                                                        <div style={{ position: 'absolute', right: '15px', top: '30px', bottom: '-15px', width: '2px', background: 'var(--border-subtle)' }}></div>
                                                    )}
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', zIndex: 1, border: '2px solid rgba(255,255,255,0.1)' }}>
                                                        {statusConfig[hist.status]?.icon || '•'}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 700, color: statusConfig[hist.status]?.color || 'white' }}>
                                                            {statusConfig[hist.status]?.label || hist.status}
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                            {formatDate(hist.changedAt)}
                                                        </div>
                                                        <div style={{ fontSize: '0.85rem', marginTop: '4px', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                                                            👤 بواسطة: <strong style={{ color: '#6ee7b7' }}>{hist.changedBy}</strong>
                                                        </div>
                                                        {hist.reason && (
                                                            <div style={{ fontSize: '0.85rem', color: '#fca5a5', marginTop: '4px' }}>
                                                                السبب: {hist.reason}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
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
      </div>

      {/* Cancel Modal */}
      {ReactDOM.createPortal(
        <div className={`modal-overlay ${showCancelModal ? 'active' : ''}`}>
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>إلغاء الطلب</h3>
              <button className="modal-close" onClick={() => setShowCancelModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCancel}>
                <div className="modal-body">
                <div className="form-group">
                    <label>سبب الإلغاء</label>
                    <textarea 
                      className="form-control" 
                      placeholder="اكتب سبب الإلغاء هنا..."
                      required
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                    ></textarea>
                </div>
                </div>
                <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCancelModal(false)}>تراجع</button>
                <button type="submit" className="btn btn-danger">تأكيد الإلغاء</button>
                </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Return Modal */}
      {ReactDOM.createPortal(
        <div className={`modal-overlay ${showReturnModal ? 'active' : ''}`}>
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>إرجاع الطلب المكتمل</h3>
              <button className="modal-close" onClick={() => setShowReturnModal(false)}>✕</button>
            </div>
            <form onSubmit={handleReturn}>
                <div className="modal-body">
                <div className="form-group">
                    <label>سبب الإرجاع</label>
                    <textarea 
                      className="form-control" 
                      placeholder="اكتب سبب إرجاع الطلب بعد التسليم..."
                      required
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                    ></textarea>
                </div>
                </div>
                <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowReturnModal(false)}>تراجع</button>
                <button type="submit" className="btn" style={{ background: '#f97316', color: 'white' }}>تأكيد المرتجع المالي</button>
                </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default OnlineOrders;
