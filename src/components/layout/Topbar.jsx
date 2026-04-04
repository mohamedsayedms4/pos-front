import React from 'react';
import { useNavigate } from 'react-router-dom';
import Api from '../../services/api';

const Topbar = ({ onMenuToggle }) => {
  const navigate = useNavigate();

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
        <button className="topbar-btn" title="الإشعارات" onClick={() => navigate('/notifications')}>
          ◈
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
