import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';

const Notifications = () => {
  const { toast } = useGlobalUI();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const notifs = await Api.getNotifications();
      setData(notifs);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMarkRead = async (id, index) => {
    const notif = data[index];
    if (notif.read) return;

    try {
      await Api.markNotificationRead(id);
      const newData = [...data];
      newData[index].read = true;
      setData(newData);
    } catch (err) {
      // Background fail
    }
  };

  return (
    <div className="page-section">
      <div className="card">
        <div className="card-header">
          <h3>🔔 الإشعارات</h3>
          <button className="btn btn-ghost btn-sm" onClick={loadData}>🔄 تحديث</button>
        </div>
        <div className="card-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>جاري التحميل...</div>
          ) : data.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔔</div>
              <h4>لا توجد إشعارات</h4>
              <p>أنت على اطلاع بكل شيء!</p>
            </div>
          ) : (
            <div>
              {data.map((n, i) => (
                <div 
                  key={n.id} 
                  className="notification-item" 
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '16px', borderRadius: 'var(--radius-md)',
                    marginBottom: '10px', transition: 'all var(--transition-fast)', cursor: 'pointer',
                    background: n.read ? 'transparent' : 'rgba(59,130,246,0.05)',
                    border: `1px solid ${n.read ? 'var(--border-subtle)' : 'rgba(59,130,246,0.15)'}`
                  }} 
                  onClick={() => handleMarkRead(n.id, i)}
                >
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', marginTop: '6px', flexShrink: 0, background: n.read ? 'var(--bg-hover)' : 'var(--accent-primary)' }}></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: n.read ? 400 : 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{n.message || 'إشعار'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{n.timestamp ? new Date(n.timestamp).toLocaleString('ar') : ''}</div>
                  </div>
                  {!n.read && <span className="badge badge-info" style={{ flexShrink: 0 }}>جديد</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
