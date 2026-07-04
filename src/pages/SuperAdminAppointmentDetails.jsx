import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Api from '../services/api';
import Loader from '../components/common/Loader';
import { useGlobalUI } from '../components/common/GlobalUI';
import moment from 'moment';

const SuperAdminAppointmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useGlobalUI();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointment();
  }, [id]);

  const fetchAppointment = async () => {
    try {
      setLoading(true);
      const data = await Api.getAppointmentById(id);
      setAppointment(data);
    } catch (err) {
      toast('فشل في جلب تفاصيل الموعد', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status) => {
    try {
      await Api.updateAppointmentStatus(id, status);
      toast('تم تحديث حالة الموعد بنجاح', 'success');
      fetchAppointment();
    } catch (err) {
      toast('فشل تحديث الحالة', 'error');
    }
  };

  if (loading) {
    return <div className="page-section" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}><Loader /></div>;
  }

  if (!appointment) {
    return (
      <div className="page-section">
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '20px' }}>لم يتم العثور على الموعد 😕</h2>
          <button onClick={() => navigate('/super-admin/calendar')} className="btn btn-primary">العودة للتقويم</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-section" dir="rtl">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
          <i className="fa-solid fa-calendar-check" style={{ color: 'var(--metro-blue)' }}></i> تفاصيل الموعد
        </h2>
        <button onClick={() => navigate('/super-admin/calendar')} className="btn btn-secondary">
          العودة للتقويم <i className="fa-solid fa-arrow-left" style={{ marginRight: '5px' }}></i>
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        
        {/* Main Details */}
        <div style={{ flex: '2 1 600px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div className="card-body" style={{ padding: '25px' }}>
              
              <div style={{ borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 5px 0' }}>{appointment.title}</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
                    تم الإنشاء بواسطة: {appointment.createdBy || 'غير معروف'} في {moment(appointment.createdAt).format('YYYY-MM-DD HH:mm')}
                  </p>
                </div>
                <span style={{
                  padding: '5px 15px',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  backgroundColor: appointment.status === 'COMPLETED' ? 'rgba(16, 124, 16, 0.1)' : appointment.status === 'CANCELED' ? 'rgba(232, 17, 35, 0.1)' : 'rgba(0, 120, 215, 0.1)',
                  color: appointment.status === 'COMPLETED' ? 'var(--metro-green)' : appointment.status === 'CANCELED' ? 'var(--metro-red)' : 'var(--metro-blue)'
                }}>
                  {appointment.status === 'SCHEDULED' ? 'معلق' : appointment.status === 'COMPLETED' ? 'مكتمل' : 'ملغى'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
                <div style={{ flex: 1, backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                  <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '5px' }}>تاريخ ووقت البداية</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{moment(appointment.startTime).format('LLLL')}</span>
                </div>
                <div style={{ flex: 1, backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                  <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '5px' }}>تاريخ ووقت النهاية</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{moment(appointment.endTime).format('LLLL')}</span>
                </div>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 10px 0' }}>نوع الموعد</h4>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 15px', backgroundColor: '#e2e8f0', borderRadius: '8px', fontWeight: 'bold', color: '#334155' }}>
                  {appointment.type === 'CALL' ? '📞 مكالمة هاتفية' : 
                   appointment.type === 'ONLINE_MEETING' ? '💻 اجتماع أونلاين' : 
                   '👥 اجتماع فريق'}
                </div>
              </div>

              <div>
                <h4 style={{ fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 10px 0' }}>الملاحظات والأجندة</h4>
                <div style={{ backgroundColor: '#fffbeb', padding: '15px', borderRadius: '8px', border: '1px solid #fef3c7', color: '#92400e', whiteSpace: 'pre-wrap', minHeight: '100px' }}>
                  {appointment.notes || <span style={{ opacity: 0.7, fontStyle: 'italic' }}>لا توجد ملاحظات...</span>}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Related Entities */}
          {(appointment.leadName || appointment.tenantName) && (
            <div className="card">
              <div className="card-body" style={{ padding: '20px' }}>
                <h4 style={{ fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 15px 0', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>مرتبط بـ</h4>
                
                {appointment.leadName && (
                  <div style={{ marginBottom: '15px' }}>
                    <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '5px' }}>عميل محتمل (Lead)</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0, 120, 215, 0.05)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0, 120, 215, 0.1)' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--metro-blue)' }}>{appointment.leadName}</span>
                      <a 
                        href={`/super-admin/leads/${appointment.leadId}/communications`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--metro-blue)', fontSize: '0.85rem', textDecoration: 'none' }}
                      >
                        فتح السجل
                      </a>
                    </div>
                  </div>
                )}

                {appointment.tenantName && (
                  <div>
                    <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '5px' }}>متجر (Tenant)</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0, 120, 215, 0.05)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0, 120, 215, 0.1)' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--metro-blue)' }}>{appointment.tenantName}</span>
                      <a 
                        href={`/super-admin/tenants/${appointment.tenantId}/communications`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--metro-blue)', fontSize: '0.85rem', textDecoration: 'none' }}
                      >
                        فتح السجل
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Assignees */}
          <div className="card">
            <div className="card-body" style={{ padding: '20px' }}>
              <h4 style={{ fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 15px 0', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>المسؤولين عن الموعد</h4>
              {appointment.assigneeNames && appointment.assigneeNames.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {appointment.assigneeNames.map((name, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(0, 120, 215, 0.1)', color: 'var(--metro-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        {name.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>لم يتم إسناد الموعد لأحد.</span>
              )}
            </div>
          </div>

          {/* Actions */}
          {appointment.status === 'SCHEDULED' && (
            <div className="card" style={{ backgroundColor: '#f8f9fa' }}>
              <div className="card-body" style={{ padding: '20px' }}>
                <h4 style={{ fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 15px 0' }}>إجراءات</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button 
                    onClick={() => updateStatus('COMPLETED')}
                    className="btn btn-success"
                    style={{ width: '100%', padding: '10px', fontWeight: 'bold', fontSize: '1rem', backgroundColor: 'var(--metro-green)', borderColor: 'var(--metro-green)', color: '#fff' }}
                  >
                    ✓ تحديد كمكتمل
                  </button>
                  <button 
                    onClick={() => updateStatus('CANCELED')}
                    className="btn btn-danger"
                    style={{ width: '100%', padding: '10px', fontWeight: 'bold', fontSize: '1rem', backgroundColor: 'var(--metro-red)', borderColor: 'var(--metro-red)', color: '#fff' }}
                  >
                    ✕ إلغاء الموعد
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SuperAdminAppointmentDetails;
