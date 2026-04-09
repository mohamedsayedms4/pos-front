import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import Api, { API_BASE } from '../../services/api';

const Sidebar = ({ isOpen, onClose }) => {
  const [user, setUser] = useState(Api._getUser() || { name: 'Admin', role: 'مدير النظام' });

  useEffect(() => {
    const handleStorage = () => setUser(Api._getUser() || { name: 'Admin', role: 'مدير النظام' });
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const avatarUrl = user?.profilePicture
    ? `${API_BASE}/products/images/${user.profilePicture}`
    : null;
  const isAdmin = (user?.roles || []).some(r => r.includes('ADMIN'));

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`} id="sidebar">
      <div className="sidebar-header">
        <button className="sidebar-close-btn" onClick={onClose}>✕</button>
        <NavLink to="/" className="logo-mark" style={{ margin: '0 auto', fontSize: '24px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
          ◆
        </NavLink>
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

        {(isAdmin || Api.can('DAMAGED_GOODS_MANAGE')) && (
          <NavLink to="/damaged" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">🗑️</span>
            <span>التوالف والهوالك</span>
          </NavLink>
        )}

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

        {Api.can('TREASURY_READ') && (
          <NavLink to="/debts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">📅</span>
            <span>إدارة الآجل والأقساط</span>
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
          <div className="user-avatar" style={{ padding: 0, overflow: 'hidden' }}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={user.name || 'Avatar'}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              style={{
                width: '100%', height: '100%', display: avatarUrl ? 'none' : 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: isAdmin ? 'var(--gradient-primary)' : 'var(--gradient-emerald)',
                borderRadius: 'inherit', fontWeight: 700,
              }}
            >
              {(user.name || 'U').charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="user-info">
            <div className="user-name">{user.name}</div>
            <div className="user-role">{user.role || (isAdmin ? 'مدير النظام' : 'مستخدم')}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
