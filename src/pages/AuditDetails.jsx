import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';

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
      try {
        const data = await Api.getAuditLog(id);
        setLog(data);
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    };

    if (id && !log) {
      loadLog();
    } else {
      setLoading(false);
    }
  }, [id, log, toast]);

  if (loading) {
    return (
      <div className="page-section">
        <div style={{ padding: '40px', textAlign: 'center' }}>جاري التحميل...</div>
      </div>
    );
  }

  if (!log) {
    return (
      <div className="page-section empty-state">
        <div className="empty-icon">📂</div>
        <h4>لم يتم العثور على السجل</h4>
        <button className="btn btn-primary" onClick={() => navigate('/audit')}>العودة للسجلات</button>
      </div>
    );
  }

  const actionIcons = {
    CREATE: '🟢',
    UPDATE: '🔵',
    DELETE: '🔴',
    LOGIN: '🟡',
  };

  return (
    <div className="page-section">
      <div className="toolbar" style={{ marginBottom: '20px' }}>
        <button className="btn btn-ghost" onClick={() => navigate('/audit')}>← العودة للسجلات</button>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>
            {actionIcons[log.action] || '⚪'} تفاصيل عملية {log.action}
          </h3>
          <span className={`badge ${log.action === 'CREATE' ? 'badge-success' : log.action === 'DELETE' ? 'badge-danger' : log.action === 'UPDATE' ? 'badge-info' : 'badge-warning'}`}>
            {log.action}
          </span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>المستخدم</label>
                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{log.username || '—'}</div>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>الوقت والتاريخ</label>
                <div style={{ fontSize: '1.1rem' }}>
                  {new Date(log.timestamp || log.createdAt).toLocaleDateString('ar')} - {new Date(log.timestamp || log.createdAt).toLocaleTimeString('ar')}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>عنوان IP</label>
                <div style={{ fontSize: '1rem', fontFamily: 'monospace' }}>{log.ipAddress || '—'}</div>
              </div>
            </div>

            <div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>المورد / الشاشة</label>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--metro-blue)' }}>{log.resource || '—'}</div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>رقم المورد (ID)</label>
                <div style={{ fontSize: '1.1rem' }}>#{log.resourceId || '—'}</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>التفاصيل الكاملة</label>
            <div style={{ 
              background: '#000', 
              padding: '15px', 
              borderRadius: '4px', 
              fontFamily: 'monospace', 
              fontSize: '0.9rem', 
              color: '#0f0', 
              whiteSpace: 'pre-wrap', 
              wordBreak: 'break-all',
              border: '1px solid #333' 
            }}>
              {log.details || 'لا توجد تفاصيل إضافية'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditDetails;
