import React from 'react';
import { useNotifications } from '../services/useNotifications';
import Loader from '../components/common/Loader';

const typeIcon = {
  INFO: '🔵',
  WARNING: '🟡',
  ERROR: '🔴',
  SUCCESS: '🟢',
};

const Notifications = () => {
  const { notifications, unreadCount, connected, loading, markRead, markAllRead, refresh } = useNotifications();

  return (
    <div className="page-section">
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3>🔔 الإشعارات</h3>
            {connected ? (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                fontSize: '0.72rem', background: 'rgba(34,197,94,0.12)',
                color: '#22c55e', borderRadius: '20px', padding: '2px 10px',
                border: '1px solid rgba(34,197,94,0.25)',
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                متصل بالوقت الفعلي
              </span>
            ) : (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                fontSize: '0.72rem', background: 'rgba(239,68,68,0.1)',
                color: '#ef4444', borderRadius: '20px', padding: '2px 10px',
                border: '1px solid rgba(239,68,68,0.25)',
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                غير متصل
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {unreadCount > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
                ✓ تحديد الكل كمقروء ({unreadCount})
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={refresh}>🔄 تحديث</button>
          </div>
        </div>
        <div className="card-body">
          {loading ? (
             <Loader message="جاري تحميل الإشعارات..." />
          ) : notifications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔔</div>
              <h4>لا توجد إشعارات</h4>
              <p>أنت على اطلاع بكل شيء!</p>
            </div>
          ) : (
            <div>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="notification-item"
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '14px',
                    padding: '16px', borderRadius: 'var(--radius-md)',
                    marginBottom: '10px', transition: 'all var(--transition-fast)',
                    cursor: n.read ? 'default' : 'pointer',
                    background: n.read ? 'transparent' : 'rgba(59,130,246,0.05)',
                    border: `1px solid ${n.read ? 'var(--border-subtle)' : 'rgba(59,130,246,0.15)'}`,
                  }}
                  onClick={() => markRead(n.id)}
                >
                  <div style={{ fontSize: '1.2rem', marginTop: '2px', flexShrink: 0 }}>
                    {typeIcon[n.type] || '🔵'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: n.read ? 400 : 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {n.message || 'إشعار'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {n.timestamp ? new Date(n.timestamp).toLocaleString('ar') : ''}
                    </div>
                  </div>
                  {!n.read && (
                    <span className="badge badge-info" style={{ flexShrink: 0 }}>جديد</span>
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

export default Notifications;
