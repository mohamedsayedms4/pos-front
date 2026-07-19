import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Api from '../services/api';
import Loader from '../components/common/Loader';
import { useGlobalUI } from '../components/common/GlobalUI';
import '../styles/pages/StoreInactivePremium.css';

const SubscriptionHistory = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tenantInfo, setTenantInfo] = useState(null);
  const { toast } = useGlobalUI ? useGlobalUI() : { toast: console.log };
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqs, info] = await Promise.all([
        Api.getMySubscriptionRequests(),
        Api.getCurrentTenantDetails()
      ]);
      // Sort requests: newest first
      setRequests((reqs || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setTenantInfo(info);
    } catch (err) {
      toast('فشل في تحميل بيانات الاشتراكات', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'PENDING': return 'قيد المراجعة';
      case 'APPROVED': return 'تم القبول';
      case 'REJECTED': return 'مرفوض';
      default: return status || '—';
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'PENDING': return { background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' };
      case 'APPROVED': return { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' };
      case 'REJECTED': return { background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' };
      default: return { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
    }
  };

  const getPaymentMethodLabel = (method) => {
    if (method === 'VODAFONE_CASH') return 'فودافون كاش';
    if (method === 'INSTAPAY') return 'إنستا باي';
    return method;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) return <Loader message="جاري تحميل سجل الاشتراكات..." />;

  const totalPaid = requests
    .filter(r => r.status === 'APPROVED')
    .reduce((sum, r) => sum + (r.amount || 0), 0);
  
  const approvedCount = requests.filter(r => r.status === 'APPROVED').length;

  return (
    <div className="page-section" style={{ direction: 'rtl', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>
          <i className="fas fa-history" style={{ marginLeft: '10px', color: 'var(--color-primary)' }}></i>
          تفاصيل وسجل الاشتراكات
        </h2>
        <button 
          onClick={() => navigate('/dashboard')}
          style={{
            background: '#f8fafc',
            color: '#475569',
            border: '1px solid #e2e8f0',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontFamily: 'Cairo, sans-serif',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
          onMouseOver={e => { e.target.style.background = '#f1f5f9'; }}
          onMouseOut={e => { e.target.style.background = '#f8fafc'; }}
        >
          العودة للرئيسية <i className="fas fa-arrow-left" style={{ marginRight: '8px' }}></i>
        </button>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 'bold' }}>الباقة الحالية للمتجر</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
            {tenantInfo?.packageName || (tenantInfo?.active ? 'الفترة التجريبية' : 'لا يوجد باقة نشطة')}
          </div>
        </div>
        <div style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 'bold' }}>تاريخ الانتهاء</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: tenantInfo?.active ? '#10b981' : '#ef4444' }}>
            {tenantInfo?.subscriptionExpiry ? formatDate(tenantInfo.subscriptionExpiry).split(',')[0] : '—'}
          </div>
        </div>
        <div style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 'bold' }}>إجمالي التجديدات المقبولة</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#3b82f6' }}>
            {approvedCount} <span style={{ fontSize: '1rem' }}>مرة</span>
          </div>
        </div>
        <div style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 'bold' }}>إجمالي المبالغ المدفوعة</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#10b981' }}>
            {totalPaid.toLocaleString()} <span style={{ fontSize: '1rem' }}>ج.م</span>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div style={{ background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
          <h3 style={{ margin: 0, fontFamily: 'Cairo, sans-serif', fontSize: '1.2rem' }}>السجل التاريخي للطلبات ({requests.length})</h3>
        </div>
        
        {requests.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '15px', opacity: 0.5 }}><i className="fa-solid fa-mailbox"></i></div>
            لا توجد أي طلبات اشتراك سابقة حتى الآن.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                <tr>
                  <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)' }}>تاريخ الطلب</th>
                  <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)' }}>الباقة</th>
                  <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)' }}>المبلغ المدفوع</th>
                  <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)' }}>طريقة الدفع والتفاصيل</th>
                  <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)' }}>حالة الطلب</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <React.Fragment key={req.id}>
                    <tr style={{ transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover-tile)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                        {formatDate(req.createdAt)}
                      </td>
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', fontWeight: 'bold' }}>
                        {req.packageName}
                      </td>
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                        {req.amount} ج.م
                      </td>
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ color: 'var(--text-main)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                          {getPaymentMethodLabel(req.paymentMethod)}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px', fontFamily: 'monospace' }}>
                          {req.senderDetail}
                        </div>
                      </td>
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)' }}>
                        <span style={{ 
                          padding: '6px 12px', 
                          borderRadius: '20px', 
                          fontSize: '0.85rem', 
                          fontWeight: 'bold',
                          display: 'inline-block',
                          ...getStatusStyle(req.status)
                        }}>
                          {getStatusLabel(req.status)}
                        </span>
                      </td>
                    </tr>
                    {req.status === 'REJECTED' && req.rejectReason && (
                      <tr style={{ background: '#fff1f2' }}>
                        <td colSpan="5" style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <span style={{ color: '#e11d48' }}><i className="fa-solid fa-triangle-exclamation"></i></span>
                            <div>
                              <strong style={{ color: '#be123c', fontSize: '0.85rem', display: 'block', marginBottom: '2px' }}>سبب الرفض:</strong>
                              <span style={{ color: '#9f1239', fontSize: '0.9rem' }}>{req.rejectReason}</span>
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
        )}
      </div>
    </div>
  );
};

export default SubscriptionHistory;
