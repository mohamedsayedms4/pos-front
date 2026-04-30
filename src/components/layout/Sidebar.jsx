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

        {Api.can('PRODUCT_READ') && (
          <>
            <NavLink to="/products" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
              <span className="nav-icon">▨</span>
              <span>المنتجات</span>
            </NavLink>
            <NavLink to="/products/interactions" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
              <span className="nav-icon">📊</span>
              <span>تفاعل العملاء</span>
            </NavLink>
            <NavLink to="/categories" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
              <span className="nav-icon">▤</span>
              <span>الفئات</span>
            </NavLink>
          </>
        )}

        {Api.can('DAMAGED_GOODS_MANAGE') && (
          <NavLink to="/damaged" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">🗑️</span>
            <span>التوالف والهوالك</span>
          </NavLink>
        )}

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
            <NavLink to="/online-orders" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
              <span className="nav-icon">🌐</span>
              <span>الطلبات الإلكترونية</span>
            </NavLink>
          </>
        )}

        {Api.can('STOCK_READ') && (
          <NavLink to="/stock-receipts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">📦</span>
            <span>استلام المخزون</span>
          </NavLink>
        )}

        {(Api.can('TREASURY_READ') || Api.can('EXPENSE_READ') || Api.can('FIXED_ASSET_READ') || Api.can('PAYROLL_READ')) && (
          <>
            <div className="nav-section-title">الحسابات والتقارير</div>
            {Api.can('TREASURY_READ') && (
              <>
                <NavLink to="/treasury" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                  <span className="nav-icon">💰</span>
                  <span>خزنة الفرع</span>
                </NavLink>
                {isAdmin && (
                  <NavLink to="/treasury-management" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                    <span className="nav-icon">🏛️</span>
                    <span>إدارة الخزائن المركزية</span>
                  </NavLink>
                )}
              </>
            )}
            {Api.can('EXPENSE_READ') && (
              <NavLink to="/expenses" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon">💸</span>
                <span>المصروفات</span>
              </NavLink>
            )}
            {Api.can('FIXED_ASSET_READ') && (
              <NavLink to="/fixed-assets" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon">🏗️</span>
                <span>الأصول الثابتة</span>
              </NavLink>
            )}
            {Api.can('TREASURY_READ') && (
              <>
                <NavLink to="/profit-loss" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                  <span className="nav-icon">📈</span>
                  <span>الأرباح والخسائر</span>
                </NavLink>
                <NavLink to="/trial-balance" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                  <span className="nav-icon">⚖️</span>
                  <span>ميزان المراجعة (GL)</span>
                </NavLink>
                <NavLink to="/financial-accounts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                  <span className="nav-icon">🏦</span>
                  <span>إدارة البنوك والحسابات</span>
                </NavLink>
                <NavLink to="/financial-analytics" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                  <span className="nav-icon">📊</span>
                  <span>التحليل المالي الموحد</span>
                </NavLink>
                <NavLink to="/checks" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                  <span className="nav-icon">📑</span>
                  <span>سجل الشيكات</span>
                </NavLink>
                <NavLink to="/partners" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                  <span className="nav-icon">🤝</span>
                  <span>الشركاء</span>
                </NavLink>
                <NavLink to="/debts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                  <span className="nav-icon">📊</span>
                  <span>إدارة الآجل والأقساط</span>
                </NavLink>
                <NavLink to="/facebook-ads" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                  <span className="nav-icon">🔵</span>
                  <span>تقارير إعلانات فيسبوك</span>
                </NavLink>
                <NavLink to="/installments-calendar" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                  <span className="nav-icon">📅</span>
                  <span>تقويم الأقساط</span>
                </NavLink>
              </>
            )}
            {Api.can('PAYROLL_READ') && (
              <NavLink to="/payroll" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon">💸</span>
                <span>مسير الرواتب</span>
              </NavLink>
            )}
          </>
        )}

        {(Api.can('USER_READ') || Api.can('ROLE_READ') || Api.can('AUDIT_READ') || Api.can('BRANCH_READ') || Api.can('WAREHOUSE_READ')) && (
          <>
            <div className="nav-section-title">الإدارة</div>
            {Api.can('USER_READ') && (
              <>
                <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                  <span className="nav-icon">👤</span>
                  <span>المستخدمين</span>
                </NavLink>
              </>
            )}
            
            {(Api.can('EMPLOYEE_READ') || Api.can('ATTENDANCE_READ') || Api.can('LEAVE_READ') || Api.can('SHIFT_MANAGE')) && (
              <>
                <div className="nav-section-title">الموظفين والموارد البشرية</div>
                {Api.can('EMPLOYEE_READ') && (
                  <NavLink to="/employees" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                    <span className="nav-icon">👥</span>
                    <span>قائمة الموظفين</span>
                  </NavLink>
                )}
                {Api.can('ATTENDANCE_READ') && (
                  <NavLink to="/attendance" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                    <span className="nav-icon">📅</span>
                    <span>الحضور والانصراف اليومي</span>
                  </NavLink>
                )}
                {Api.can('LEAVE_READ') && (
                  <NavLink to="/leave-requests" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                    <span className="nav-icon">🏖️</span>
                    <span>إدارة الإجازات</span>
                  </NavLink>
                )}
                {isAdmin && (
                  <NavLink to="/leave-types" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                    <span className="nav-icon">⚙️</span>
                    <span>إعدادات الإجازات</span>
                  </NavLink>
                )}
                {Api.can('USER_READ') && (
                  <NavLink to="/custody" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                    <span className="nav-icon">🛡️</span>
                    <span>العهد الشخصية</span>
                  </NavLink>
                )}
                {Api.can('SHIFT_MANAGE') && (
                  <NavLink to="/shifts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                    <span className="nav-icon">🕒</span>
                    <span>إدارة الورديات</span>
                  </NavLink>
                )}
                <NavLink to="/messages" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                  <span className="nav-icon">💬</span>
                  <span>الرسائل</span>
                </NavLink>
              </>
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
            {Api.can('BRANCH_READ') && (
              <NavLink to="/branches" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon">🏢</span>
                <span>إدارة الفروع</span>
              </NavLink>
            )}
            {Api.can('WAREHOUSE_READ') && (
              <NavLink to="/warehouses" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon">📦</span>
                <span>إدارة المخازن</span>
              </NavLink>
            )}
            {Api.can('PRODUCT_READ') && (
              <NavLink to="/inventory/report" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon">📋</span>
                <span>الجرد التفصيلي</span>
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon">⚙️</span>
                <span>إعدادات المتجر</span>
              </NavLink>
            )}
            {Api.can('AUDIT_READ') && (
              <NavLink to="/offline-audit" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon">🔍</span>
                <span>فحص البيانات المحلية</span>
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
