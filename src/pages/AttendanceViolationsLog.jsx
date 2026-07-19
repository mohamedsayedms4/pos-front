import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../services/useNotifications';
import Loader from '../components/common/Loader';

const AttendanceViolationsLog = () => {
  const { notifications, loading } = useNotifications();
  const navigate = useNavigate();

  // تصفية المخالفات فقط
  const violations = useMemo(() => {
    return notifications.filter(n => n.type === 'GEO_VIOLATION' || n.type === 'SECURITY_VIOLATION');
  }, [notifications]);

  return (
    <div className="page-section anim-fade-in" style={{ direction: 'rtl', maxWidth: '1000px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.5rem', boxShadow: '0 8px 24px rgba(239,68,68,0.35)'
        }}><i className="fa-solid fa-siren-on"></i></div>
        <div>
          <h1 className="page-title" style={{ margin: 0, fontSize: '1.6rem' }}>سجل محاولات التلاعب</h1>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-dim)' }}>
            محاولات تسجيل الحضور من خارج النطاق الجغرافي أو شبكة واي فاي غير مصرح بها
          </p>
        </div>
      </div>

      <div className="card" style={{ borderRadius: '20px', background: 'var(--bg-dark)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>سجل المخالفات</h3>
        </div>

        <div style={{ padding: '24px' }}>
          {loading ? (
             <Loader />
          ) : violations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px', opacity: 0.5 }}><i className="fa-solid fa-shield-halved"></i>️</div>
              <h4 style={{ margin: '0 0 8px' }}>لا توجد مخالفات مسجلة</h4>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>النظام يعمل بشكل آمن والموظفون يلتزمون بالنطاق الجغرافي.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {violations.map(v => (
                <div key={v.id} style={{
                  padding: '16px', borderRadius: '12px', background: 'var(--bg-elevated)',
                  border: `1px solid ${v.type === 'GEO_VIOLATION' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  gap: '16px', flexWrap: 'wrap'
                }}>
                  
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: '250px' }}>
                    <div style={{ fontSize: '1.6rem', marginTop: '-4px' }}>
                      {v.type === 'GEO_VIOLATION' ? '' : ''}
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 6px', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                        {v.title || (v.type === 'GEO_VIOLATION' ? 'مخالفة نطاق جغرافي' : 'مخالفة شبكة IP')}
                      </h4>
                      <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: '1.5' }}>
                        {v.message}
                      </p>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <i className="fa-solid fa-clock"></i> {v.timestamp ? new Date(v.timestamp).toLocaleString('ar') : 'تاريخ غير معروف'}
                      </span>
                    </div>
                  </div>

                  {v.actionUrl && (
                    <button 
                      className="btn btn-primary" 
                      onClick={() => navigate(v.actionUrl)}
                      style={{ height: '38px', padding: '0 16px', borderRadius: '8px', fontSize: '0.85rem' }}
                    >
                      <i className="fa-solid fa-map"></i>️ عرض الموقع على الخريطة
                    </button>
                  )}

                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceViolationsLog;
