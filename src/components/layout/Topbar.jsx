import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Api, { API_BASE } from '../../services/api';
import { useNotifications } from '../../services/useNotifications';
import { useGlobalUI } from '../common/GlobalUI';
import { useTheme } from '../common/ThemeContext';
import ChatService from '../../services/ChatService';
import msgIcon from '../../assets/img/msg.png';
import { useTileCustomizer } from '../../context/TileContext';

const Topbar = ({ onMenuToggle, prevInfo }) => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { showToast } = useGlobalUI ? useGlobalUI() : { showToast: () => {} };
  const { unreadCount: notifUnreadCount, connected } = useNotifications({
    onNewNotification: (notif) => {
      showToast(notif.message, notif.type === 'WARNING' || notif.type === 'SECURITY' ? 'error' : 'success');
    }
  });

  const [user, setUser] = useState(Api._getUser());
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Initial fetch and real-time subscription for messages
  useEffect(() => {
    ChatService.connect();
    
    // Initial count
    ChatService.getTotalUnreadCount().then(setUnreadMessages).catch(() => {});

    // Listen for new messages
    const unsubMsg = ChatService.onMessage((msg) => {
      const isSelf = msg.senderId === Api._getUser()?.id;
      // If NOT self and NOT on Messages page, refetch count for reliability
      if (!isSelf && window.location.pathname !== '/messages') {
        ChatService.getTotalUnreadCount().then(setUnreadMessages);
      }
    });

    // Listen for manual count update triggers (e.g. from Messages page)
    const unsubCount = ChatService.onCountUpdate(() => {
      ChatService.getTotalUnreadCount().then(setUnreadMessages);
    });

    return () => {
      unsubMsg();
      unsubCount();
    };
  }, []);

  // Reset count if we navigate to messages
  useEffect(() => {
    if (window.location.pathname === '/messages') {
      setUnreadMessages(0);
    }
  }, [window.location.pathname]);

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

  const { isEditMode, setIsEditMode } = useTileCustomizer ? useTileCustomizer() : { isEditMode: false, setIsEditMode: () => {} };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="menu-toggle" onClick={onMenuToggle}>☰</button>
        {prevInfo && prevInfo.path && (
          <button 
            className="btn-back-global" 
            onClick={() => navigate(-1)}
            title={`العودة لـ ${prevInfo.label}`}
          >
            ← عودة لـ {prevInfo.label}
          </button>
        )}
        <h2 className="page-title">نظام نقاط البيع</h2>
      </div>
      <div className="topbar-right">
        <button
          className={`topbar-btn customize-btn ${isEditMode ? 'active pulse' : ''}`}
          title="تخصيص الواجهة"
          onClick={() => setIsEditMode(!isEditMode)}
        >
          🎨
        </button>

        <button
          className="topbar-btn msg-btn"
          title="الرسائل"
          onClick={() => navigate('/messages')}
          style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <img src={msgIcon} alt="Messages" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
          {unreadMessages > 0 && (
            <span className="notif-badge" style={{ left: 'auto', right: '-2px', top: '-2px' }}>
              {unreadMessages > 99 ? '99+' : unreadMessages}
            </span>
          )}
        </button>
        <button
          className="topbar-btn notif-btn"
          title="الإشعارات"
          onClick={() => navigate('/notifications')}
          style={{ position: 'relative' }}
        >
          🔔
          {notifUnreadCount > 0 && (
            <span className="notif-badge">
              {notifUnreadCount > 99 ? '99+' : notifUnreadCount}
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
        <button className="btn-logout" onClick={handleLogout} title="تسجيل الخروج">
          <span>⏻</span>
          <span className="logout-text">خروج</span>
        </button>
      </div>
    </header>
  );
};

export default Topbar;
