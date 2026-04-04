import React from 'react';
import { NavLink } from 'react-router-dom';
import Api from '../../services/api';

const Sidebar = ({ isOpen, onClose }) => {
  const user = Api._getUser() || { name: 'Admin', role: 'مدير النظام' };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`} id="sidebar">
      <div className="sidebar-header">
        <button className="sidebar-close-btn" onClick={onClose}>✕</button>
        <div className="logo-mark" style={{ margin: '0 auto', fontSize: '24px' }}>◆</div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">الرئيسية</div>
        
        <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <span className="nav-icon">▦</span>
          <span>لوحة التحكم</span>
        </NavLink>

        <NavLink to="/products" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <span className="nav-icon">▨</span>
          <span>المنتجات</span>
        </NavLink>

        <NavLink to="/categories" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <span className="nav-icon">▤</span>
          <span>الفئات</span>
        </NavLink>

        <NavLink to="/suppliers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <span className="nav-icon">▧</span>
          <span>الموردين</span>
        </NavLink>
        
        <NavLink to="/purchases" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <span className="nav-icon">🛒</span>
          <span>المشتريات</span>
        </NavLink>

        {Api.can('view_users') && (
          <>
            <div className="nav-section-title">الإدارة</div>
            <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
              <span className="nav-icon">👤</span>
              <span>المستخدمين</span>
            </NavLink>
            <NavLink to="/roles" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
              <span className="nav-icon">🔑</span>
              <span>الأدوار</span>
            </NavLink>
            <NavLink to="/audit" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
              <span className="nav-icon">▣</span>
              <span>سجل المراجعة</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar">{user.name ? user.name.charAt(0).toUpperCase() : 'U'}</div>
          <div className="user-info">
            <div className="user-name">{user.name}</div>
            <div className="user-role">{user.role || (Api.can('ROLE_ADMIN') ? 'مدير النظام' : 'مستخدم')}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
