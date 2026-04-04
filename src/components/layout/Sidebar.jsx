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
        
        {Api.can('SALE_WRITE') && (
          <NavLink to="/pos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">🖥️</span>
            <span>نقطة البيع (POS)</span>
          </NavLink>
        )}

        <NavLink to="/products" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <span className="nav-icon">▨</span>
          <span>المنتجات</span>
        </NavLink>

        <NavLink to="/categories" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <span className="nav-icon">▤</span>
          <span>الفئات</span>
        </NavLink>

        {Api.can('SUPPLIER_READ') && (
          <NavLink to="/suppliers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">▧</span>
            <span>الموردين</span>
          </NavLink>
        )}

        {Api.can('CUSTOMER_READ') && (
          <NavLink to="/customers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">👥</span>
            <span>العملاء</span>
          </NavLink>
        )}
        
        {Api.can('PURCHASE_READ') && (
          <NavLink to="/purchases" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">🛒</span>
            <span>المشتريات</span>
          </NavLink>
        )}

        {Api.can('SALE_READ') && (
          <>
            <NavLink to="/sales" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
              <span className="nav-icon">🧾</span>
              <span>فواتير المبيعات</span>
            </NavLink>
            <NavLink to="/returns" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
              <span className="nav-icon">🔄</span>
              <span>مرتجع المبيعات</span>
            </NavLink>
          </>
        )}

        {Api.can('STOCK_READ') && (
          <NavLink to="/stock-receipts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">📦</span>
            <span>استلام المخزون</span>
          </NavLink>
        )}

        {Api.can('TREASURY_READ') && (
          <NavLink to="/treasury" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">💰</span>
            <span>الخزنة</span>
          </NavLink>
        )}

        {(Api.can('USER_READ') || Api.can('ROLE_READ') || Api.can('AUDIT_READ')) && (
          <>
            <div className="nav-section-title">الإدارة</div>
            {Api.can('USER_READ') && (
              <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon">👤</span>
                <span>المستخدمين</span>
              </NavLink>
            )}
            {Api.can('ROLE_READ') && (
              <NavLink to="/roles" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon">🔑</span>
                <span>الأدوار</span>
              </NavLink>
            )}
            {Api.can('AUDIT_READ') && (
              <NavLink to="/audit" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon">▣</span>
                <span>سجل المراجعة</span>
              </NavLink>
            )}
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
