import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';

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

const SuperAdminTenantCommunications = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useGlobalUI();

  // In case we navigated with state containing tenant name
  const [tenantName, setTenantName] = useState(location.state?.tenant?.name || 'المتجر');

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ contactMethod: 'PHONE', notes: '', clientStatus: 'INTERESTED', nextFollowUpDate: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!Api.isSuperAdmin()) {
      navigate('/dashboard', { replace: true });
      return;
    }
    loadLogs();
  }, [id, navigate]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await Api.getTenantCommunications(id);
      setLogs(data);
    } catch (err) {
      toast('فشل في جلب سجل التواصل', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.notes.trim()) {
      toast('يرجى إدخال الملاحظات', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const newLog = await Api.addTenantCommunication(id, form);
      setLogs([newLog, ...logs]);
      setForm({ contactMethod: 'PHONE', notes: '', clientStatus: 'INTERESTED', nextFollowUpDate: '' });
      toast('تمت إضافة سجل التواصل بنجاح ✅', 'success');
    } catch (err) {
      toast('فشل في إضافة سجل التواصل', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-section">
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 20px' }}>
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/super-admin/subscriptions')} 
            style={{ padding: '8px 12px', fontSize: '1.2rem' }}
          >
            <i className="fa-solid fa-arrow-right"></i>
          </button>
          <h3 style={{ margin: 0 }}>📞 سجل تواصل المتجر: {tenantName}</h3>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
        <div className="card">
          <div className="card-header">
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>إضافة سجل جديد</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>طريقة التواصل</label>
                  <select 
                    className="form-control" 
                    value={form.contactMethod} 
                    onChange={e => setForm({...form, contactMethod: e.target.value})}
                  >
                    <option value="PHONE">مكالمة هاتفية</option>
                    <option value="WHATSAPP">واتساب</option>
                    <option value="EMAIL">بريد إلكتروني</option>
                    <option value="OTHER">أخرى</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>حالة العميل</label>
                  <select 
                    className="form-control" 
                    value={form.clientStatus} 
                    onChange={e => setForm({...form, clientStatus: e.target.value})}
                  >
                    <option value="INTERESTED">مهتم</option>
                    <option value="NOT_INTERESTED">غير مهتم</option>
                    <option value="PENDING">قيد التفكير / مؤجل</option>
                    <option value="NO_ANSWER">لم يرد</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>تاريخ المتابعة القادمة (اختياري)</label>
                  <input 
                    type="datetime-local" 
                    className="form-control" 
                    value={form.nextFollowUpDate} 
                    onChange={e => setForm({...form, nextFollowUpDate: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>الملاحظات / رد العميل</label>
                <textarea 
                  className="form-control" 
                  rows="3" 
                  placeholder="أدخل ملخص المكالمة أو طلب العميل بشكل تفصيلي..."
                  value={form.notes}
                  onChange={e => setForm({...form, notes: e.target.value})}
                  style={{ resize: 'vertical' }}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ padding: '10px 24px' }}>
                  {submitting ? 'جاري الحفظ...' : 'إضافة السجل'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>السجل التاريخي للمتابعات</h3>
          </div>
          <div className="card-body no-padding">
            {loading ? (
              <Loader message="جاري التحميل..." />
            ) : logs.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px' }}>
                <div className="empty-icon" style={{ fontSize: '3rem', marginBottom: '10px' }}>📝</div>
                <h4>لا توجد سجلات</h4>
                <p>لم يتم تسجيل أي تواصل مسبق مع هذا العميل.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>طريقة التواصل</th>
                      <th>حالة العميل</th>
                      <th>الملاحظات</th>
                      <th>تاريخ المتابعة</th>
                      <th>مسجل بواسطة</th>
                      <th>تاريخ التسجيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, idx) => (
                      <tr key={log.id || idx}>
                        <td>
                          <span className="badge badge-primary">{log.contactMethod}</span>
                        </td>
                        <td>
                          <span className={`badge ${log.clientStatus === 'INTERESTED' ? 'badge-success' : log.clientStatus === 'NOT_INTERESTED' ? 'badge-danger' : 'badge-warning'}`}>
                            {log.clientStatus}
                          </span>
                        </td>
                        <td style={{ maxWidth: '300px', whiteSpace: 'pre-wrap' }}>{log.notes}</td>
                        <td>{log.nextFollowUpDate ? formatDateTime(log.nextFollowUpDate) : '—'}</td>
                        <td>{log.adminName}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{formatDateTime(log.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminTenantCommunications;
