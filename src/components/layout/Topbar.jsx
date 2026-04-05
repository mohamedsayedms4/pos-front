import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Api, { API_BASE } from '../../services/api';
import { useNotifications } from '../../services/useNotifications';
import { useGlobalUI } from '../common/GlobalUI';
import { useTheme } from '../common/ThemeContext';

const Topbar = ({ onMenuToggle }) => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useGlobalUI ? useGlobalUI() : { toast: () => {} };
  const { unreadCount, connected } = useNotifications({
    onNewNotification: (notif) => {
      toast(notif.message, notif.type === 'WARNING' || notif.type === 'SECURITY' ? 'error' : 'success');
    }
  });

  const [user, setUser] = useState(Api._getUser());

  // Re-read user from localStorage whenever storage changes (e.g. after profile update)
  useEffect(() => {
    setUser(Api._getUser());
    const handleStorage = () => setUser(Api._getUser());
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleLogout = async () => {
    try {
      await Api.logout();
    } catch (e) {
      console.error(e);
    }
    navigate('/login');
  };

  const avatarUrl = user?.profilePicture
    ? `${API_BASE}/products/images/${user.profilePicture}`
    : null;

  const isAdmin = (user?.roles || []).some(r => r.includes('ADMIN'));

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
        <button
          className="topbar-btn theme-toggle-btn"
          title={theme === 'dark' ? 'الوضع المضيء' : 'الوضع الداكن'}
          onClick={toggleTheme}
          style={{ fontSize: '1.2rem' }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
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
