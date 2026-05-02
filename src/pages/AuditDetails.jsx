import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import '../styles/pages/AuditPremium.css';

const AuditDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useGlobalUI();
  const [log, setLog] = useState(location.state?.log || null);
  const [loading, setLoading] = useState(!location.state?.log);

  useEffect(() => {
    const loadLog = async () => {
      setLoading(true);
      try { const data = await Api.getAuditLog(id); setLog(data); }
      catch (err) { toast(err.message, 'error'); }
      finally { setLoading(false); }
    };
    if (id && !log) loadLog();
    else setLoading(false);
  }, [id, log, toast]);

  if (loading) return <Loader message="جاري تحميل تفاصيل السجل..." />;
  if (!log) return (
    <div className="audit-container">
      <div style={{ padding: '100px', textAlign: 'center' }}>
        <i className="fas fa-folder-open" style={{ fontSize: '4rem', opacity: 0.1, marginBottom: '24px' }}></i>
        <h2>لم يتم العثور على السجل</h2>
        <button className="aud-btn-premium aud-btn-blue" onClick={() => navigate('/audit')} style={{ marginTop: '20px' }}>العودة للسجلات</button>
      </div>
    </div>
  );

  const actionIcons = {
    CREATE: { emoji: 'fa-plus-circle', class: 'badge-green' },
    UPDATE: { emoji: 'fa-edit', class: 'badge-amber' },
    DELETE: { emoji: 'fa-trash-alt', class: 'badge-red' },
    LOGIN: { emoji: 'fa-sign-in-alt', class: 'badge-blue' },
  };

  return (
    <div className="audit-container">
      <div className="aud-header-row">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="aud-breadcrumbs">
            <Link to="/dashboard">الرئيسية</Link> / <Link to="/audit">السجلات</Link> / <span>التفاصيل</span>
          </div>
          <h1>تفاصيل العملية #{log.id}</h1>
        </div>
        <div className="aud-header-actions">
          <button className="aud-btn-premium aud-btn-outline" onClick={() => navigate('/audit')}>
            <i className="fas fa-arrow-right"></i> العودة
          </button>
        </div>
      </div>

      <div className="aud-table-card" style={{ padding: '32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '32px' }}>
          <div className="aud-detail-item">
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--aud-text-secondary)', marginBottom: '8px', fontWeight: 600 }}>المستخدم المسؤول</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
               <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--aud-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 900 }}>{(log.username || 'U').charAt(0).toUpperCase()}</div>
               <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{log.username || '—'}</div>
            </div>
          </div>

          <div className="aud-detail-item">
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--aud-text-secondary)', marginBottom: '8px', fontWeight: 600 }}>نوع الإجراء</label>
            <span className={`aud-type-badge ${actionIcons[log.action]?.class || 'badge-blue'}`} style={{ fontSize: '1rem', padding: '8px 16px' }}>
              <i className={`fas ${actionIcons[log.action]?.emoji || 'fa-info-circle'}`} style={{ marginRight: '8px' }}></i>
              {log.action}
            </span>
          </div>

          <div className="aud-detail-item">
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--aud-text-secondary)', marginBottom: '8px', fontWeight: 600 }}>المورد المستهدف</label>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--aud-accent-blue)' }}>{log.resource || '—'} {log.resourceId && <code style={{ fontSize: '0.9rem', color: 'var(--aud-text-secondary)' }}>#{log.resourceId}</code>}</div>
          </div>

          <div className="aud-detail-item">
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--aud-text-secondary)', marginBottom: '8px', fontWeight: 600 }}>التوقيت وعنوان IP</label>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>{new Date(log.timestamp || log.createdAt).toLocaleString('ar')}</div>
            <code style={{ fontSize: '0.8rem', opacity: 0.7 }}>{log.ipAddress || '0.0.0.0'}</code>
          </div>
        </div>

        <div style={{ marginTop: '40px', paddingTop: '32px', borderTop: '1px solid var(--aud-border)' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--aud-text-secondary)', marginBottom: '16px', fontWeight: 600 }}>بيانات العملية (Raw Details)</label>
          <div style={{ 
            background: 'var(--aud-bg)', 
            padding: '24px', 
            borderRadius: '16px', 
            fontFamily: 'monospace', 
            fontSize: '0.95rem', 
            color: 'var(--aud-accent-green)', 
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-all',
            border: '1px solid var(--aud-border)',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {log.details || 'لا توجد تفاصيل إضافية مسجلة لهذه العملية.'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditDetails;
