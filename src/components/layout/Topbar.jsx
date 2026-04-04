import React from 'react';
import { useNavigate } from 'react-router-dom';
import Api from '../../services/api';
import { useNotifications } from '../../services/useNotifications';

const Topbar = ({ onMenuToggle }) => {
  const navigate = useNavigate();
  const { unreadCount, connected } = useNotifications();

  const handleLogout = async () => {
    try {
      await Api.logout();
    } catch (e) {
      console.error(e);
    }
    navigate('/login');
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="menu-toggle" onClick={onMenuToggle}>☰</button>
        <h2 className="page-title">نظام نقاط البيع</h2>
      </div>
      <div className="topbar-right">
        <button
          className="topbar-btn notif-btn"
          title="الإشعارات"
          onClick={() => navigate('/notifications')}
          style={{ position: 'relative' }}
        >
          🔔
          {unreadCount > 0 && (
            <span className="notif-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          {connected && (
            <span
              title="متصل بالوقت الفعلي"
              style={{
                position: 'absolute',
                bottom: '2px',
                left: '2px',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#22c55e',
                border: '1px solid #166534',
              }}
            />
          )}
        </button>
        <button className="btn-logout" onClick={handleLogout}>
          <span>⏻</span>
          خروج
        </button>
      </div>
    </header>
  );
};

export default Topbar;
