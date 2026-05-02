import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Api, { API_BASE } from '../../services/api';
import { useNotifications } from '../../services/useNotifications';
import { useGlobalUI } from '../common/GlobalUI';
import { useTheme } from '../common/ThemeContext';
import ChatService from '../../services/ChatService';
import { useTileCustomizer } from '../../context/TileContext';
import { useBranch } from '../../context/BranchContext';
import '../../styles/layout/TopbarPremium.css';

const Topbar = ({ onMenuToggle, prevInfo }) => {
  const { theme, toggleTheme } = useTheme();
  const { branches, selectedBranchId, selectBranch } = useBranch();
  const navigate = useNavigate();
  const { showToast } = useGlobalUI ? useGlobalUI() : { showToast: () => {} };
  const { unreadCount: notifUnreadCount, connected } = useNotifications({
    onNewNotification: (notif) => {
      showToast(notif.message, notif.type === 'WARNING' || notif.type === 'SECURITY' ? 'error' : 'success');
    }
  });

  const [user, setUser] = useState(Api._getUser());
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    ChatService.connect();
    ChatService.getTotalUnreadCount().then(setUnreadMessages).catch(() => {});

    const unsubMsg = ChatService.onMessage((msg) => {
      const isSelf = msg.senderId === Api._getUser()?.id;
      if (!isSelf && window.location.pathname !== '/messages') {
        ChatService.getTotalUnreadCount().then(setUnreadMessages);
      }
    });

    const unsubCount = ChatService.onCountUpdate(() => {
      ChatService.getTotalUnreadCount().then(setUnreadMessages);
    });

    return () => {
      unsubMsg();
      unsubCount();
    };
  }, []);

  useEffect(() => {
    // Sync with storage
    const handleStorage = () => setUser(Api._getUser());
    window.addEventListener('storage', handleStorage);

    // Refresh user data from server to ensure latest profile picture
    const refreshUser = async () => {
      const currentUser = Api._getUser();
      if (currentUser && currentUser.id) {
        try {
          const latest = await Api.getUser(currentUser.id);
          if (latest) {
            Api._setUser(latest);
            setUser(latest);
          }
        } catch (err) {
          console.error('Failed to refresh user data:', err);
        }
      }
    };
    refreshUser();

    // Fetch store name
    const fetchStore = async () => {
      try {
        const res = await fetch(`${API_BASE}/settings/info`, {
          headers: { 'Authorization': `Bearer ${Api._getToken()}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.data?.name) setStoreName(data.data.name);
        }
      } catch (e) {}
    };
    fetchStore();

    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const [storeName, setStoreName] = useState('POS System');

  const avatarUrl = user?.profilePicture
    ? `${API_BASE}/products/images/${user.profilePicture}`
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || user?.fullName || user?.username || 'User')}&background=6366f1&color=fff`;

  const isAdmin = (user?.roles || []).some(r => r.includes('ADMIN'));
  const { isEditMode, setIsEditMode } = useTileCustomizer ? useTileCustomizer() : { isEditMode: false, setIsEditMode: () => {} };

  return (
    <header className="topbar-premium">
      {/* LEFT SECTION (Desktop Only): Search */}
      <div className="tp-search-container">
        <div className="tp-search-wrapper" style={{ maxWidth: '400px' }}>
          <i className="fas fa-search tp-search-icon"></i>
          <input 
            type="text" 
            className="tp-search-input" 
            placeholder="ابحث هنا..." 
            style={{ textAlign: 'right', height: '45px' }}
          />
        </div>
      </div>

      {/* RIGHT GROUP: Hamburger + User + Actions */}
      <div className="tp-right-group">
        {/* Hamburger Menu - Now First in DOM = Rightmost in RTL */}
        <button className="tp-menu-btn" onClick={onMenuToggle}>
          <i className="fas fa-bars"></i>
        </button>

        {/* User Section - Desktop only */}
        <div className="tp-user-section tp-desktop-only" onClick={() => navigate('/settings')}>
          <div className="tp-user-text-wrapper" style={{ textAlign: 'right' }}>
             <div className="tp-user-name" style={{ fontSize: '1.1rem', fontWeight: '800' }}>{user?.name || user?.fullName || user?.username || 'مدير النظام'}</div>
             <div className="tp-user-role" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '-1px' }}>{user?.roles?.[0]?.replace('ROLE_', '') || 'مسؤول'}</div>
          </div>
          <div className="tp-avatar-wrapper" style={{ width: '48px', height: '48px' }}>
            <img src={avatarUrl} alt="User" className="tp-avatar" />
            {connected && <span className="tp-status-dot"></span>}
          </div>
        </div>

        {/* Actions Section - Middle */}
        <div className="tp-actions-section">
          {/* Notifications */}
          <button className="tp-action-btn" onClick={() => navigate('/notifications')} title="الإشعارات">
            <i className="far fa-bell"></i>
            {notifUnreadCount > 0 && <span className="tp-badge">{notifUnreadCount > 99 ? '99+' : notifUnreadCount}</span>}
          </button>

          {/* Messages */}
          <button className="tp-action-btn" onClick={() => navigate('/messages')} title="الرسائل">
            <i className="far fa-comment-dots"></i>
            {unreadMessages > 0 && (
              <span className="tp-badge">
                {unreadMessages > 99 ? '99+' : unreadMessages}
              </span>
            )}
          </button>

          {/* Theme Toggle */}
          <button className="tp-action-btn" onClick={toggleTheme} title="الوضع الليلي">
            <i className={`far fa-${theme === 'dark' ? 'sun' : 'moon'}`}></i>
          </button>

          {/* Search Button - Mobile only */}
          <button className="tp-action-btn tp-mobile-only" title="البحث">
            <i className="fas fa-search"></i>
          </button>

          {/* Branch Selector */}
          <div className="branch-mini-selector tp-desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
             <i className="fas fa-building" style={{ color: 'var(--text-white)', fontSize: '1rem' }}></i>
             <select 
                value={selectedBranchId || ''} 
                onChange={(e) => selectBranch(e.target.value ? parseInt(e.target.value) : null)}
                style={{ 
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-white)',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  paddingRight: '5px'
                }}
              >
                {isAdmin && <option value="">كل الفروع</option>}
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <i className="fas fa-chevron-down" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}></i>
          </div>
        </div>

        {/* Store Name - Now Last in DOM = Leftmost in RTL */}
        <div className="tp-store-name-mobile">
          {storeName}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
