import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Api, { API_BASE } from '../../services/api';
import { useTheme } from '../common/ThemeContext';
import '../../styles/layout/SidebarPremium.css';

const Sidebar = ({ isOpen, onClose, collapsed, onToggleCollapse }) => {
  const [user, setUser] = useState(Api._getUser());
  const [storeName, setStoreName] = useState('POS System');
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    const handleStorage = () => setUser(Api._getUser());
    window.addEventListener('storage', handleStorage);
    const refreshUser = async () => {
      const current = Api._getUser();
      if (current?.id) {
        try {
          const latest = await Api.getUser(current.id);
          if (latest) { Api._setUser(latest); setUser(latest); }
        } catch (e) {}
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

  const avatarUrl = user?.profilePicture
    ? `${API_BASE}/products/images/${user.profilePicture}`
    : null;

  const isAdmin = (user?.roles || []).some(r => r.includes('ADMIN'));
  const isDark = theme === 'dark';

  const handleLogout = () => {
    Api.logout();
    navigate('/login');
  };

  const link = (to, icon, label) => (
    <NavLink to={to} className={({ isActive }) => `sp-link ${isActive ? 'active' : ''}`} onClick={onClose} title={collapsed ? label : undefined}>
      <i className={icon}></i>
      <span>{label}</span>
    </NavLink>
  );

  // Build class name
  const sidebarClass = [
    'sidebar-premium',
    !isOpen ? 'mobile-closed' : '',
    collapsed ? 'collapsed' : ''
  ].filter(Boolean).join(' ');

  return (
    <>
      {/* Mobile overlay backdrop */}
      <div className={`sp-overlay ${isOpen ? 'visible' : ''}`} onClick={onClose} />

      <aside className={sidebarClass} id="sidebar">
        {/* ── Header ── */}
        <div className="sp-header">
          <button className="sp-close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>

          {/* Store Name - visible on desktop */}
          <div className="sp-store-name">{storeName}</div>

          {/* User Profile - visible only on mobile */}
          <div className="sp-mobile-user">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="sp-avatar" />
            ) : (
              <div className="sp-avatar-fallback">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="sp-user-info">
              <div className="sp-user-name">{user?.name || user?.username || 'مدير النظام'}</div>
              <div className="sp-user-role">{user?.roles?.[0]?.replace('ROLE_', '') || 'ADMIN'}</div>
            </div>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="sp-nav">

          {link('/dashboard', 'fas fa-home', 'الرئيسية')}

          {Api.can('SALE_WRITE') && link('/pos', 'fas fa-laptop-code', 'نقطة البيع (POS)')}

          {Api.can('PRODUCT_READ') && (
            <>
              {link('/products', 'fas fa-boxes', 'المنتجات')}
              {link('/products/interactions', 'fas fa-chart-pie', 'تفاعل العملاء')}
              {link('/categories', 'fas fa-layer-group', 'الفئات')}
            </>
          )}

          {Api.can('DAMAGED_GOODS_MANAGE') && link('/damaged', 'fas fa-trash-alt', 'التوالف والهوالك')}

          {Api.can('SUPPLIER_READ') && link('/suppliers', 'fas fa-truck-loading', 'الموردين')}
          {Api.can('CUSTOMER_READ') && link('/customers', 'fas fa-users', 'العملاء')}
          {Api.can('PURCHASE_READ') && link('/purchases', 'fas fa-shopping-basket', 'المشتريات')}

          {Api.can('SALE_READ') && (
            <>
              {link('/sales', 'fas fa-file-invoice-dollar', 'فواتير المبيعات')}
              {link('/returns', 'fas fa-undo-alt', 'مرتجع المبيعات')}
              {link('/online-orders', 'fas fa-globe-americas', 'الطلبات الإلكترونية')}
            </>
          )}

          {Api.can('STOCK_READ') && link('/stock-receipts', 'fas fa-box-open', 'استلام المخزون')}

          {/* ── Accounts ── */}
          <div className="sp-section-title">الحسابات والتقارير</div>

          {Api.can('TREASURY_READ') && (
            <>
              {link('/treasury', 'fas fa-cash-register', 'خزنة الفرع')}
              {isAdmin && link('/treasury-management', 'fas fa-university', 'إدارة الخزائن المركزية')}
            </>
          )}
          {Api.can('EXPENSE_READ') && link('/expenses', 'fas fa-money-bill-wave', 'المصروفات')}
          {Api.can('FIXED_ASSET_READ') && link('/fixed-assets', 'fas fa-building', 'الأصول الثابتة')}
          {link('/profit-loss', 'fas fa-chart-line', 'الأرباح والخسائر')}
          {link('/trial-balance', 'fas fa-scale-balanced', 'ميزان المراجعة (GL)')}
          {link('/financial-accounts', 'fas fa-landmark', 'إدارة البنوك والحسابات')}
          {link('/financial-analytics', 'fas fa-chart-bar', 'التحليل المالي الموحد')}
          {link('/checks', 'fas fa-money-check', 'سجل الشيكات')}
          {link('/partners', 'fas fa-handshake', 'الشركاء')}
          {link('/debts', 'fas fa-hand-holding-usd', 'إدارة الآجل والأقساط')}
          {link('/installments-calendar', 'fas fa-calendar-alt', 'تقويم الأقساط')}
          {link('/facebook-ads', 'fab fa-facebook', 'تقارير إعلانات فيسبوك')}

          {Api.can('PAYROLL_READ') && link('/payroll', 'fas fa-file-signature', 'مسير الرواتب')}

          {/* ── HR ── */}
          <div className="sp-section-title">الموظفين والموارد البشرية</div>

          {Api.can('EMPLOYEE_READ') && link('/employees', 'fas fa-user-tie', 'قائمة الموظفين')}
          {Api.can('ATTENDANCE_READ') && link('/attendance', 'fas fa-clock', 'الحضور والانصراف اليومي')}
          {Api.can('LEAVE_READ') && link('/leave-requests', 'fas fa-calendar-times', 'إدارة الإجازات')}
          {isAdmin && link('/leave-types', 'fas fa-user-clock', 'إعدادات الإجازات')}
          {Api.can('USER_READ') && link('/custody', 'fas fa-shield-alt', 'العهد الشخصية')}
          {Api.can('SHIFT_MANAGE') && link('/shifts', 'fas fa-history', 'إدارة الورديات')}
          {link('/messages', 'fas fa-comments', 'الرسائل')}

          {/* ── Admin ── */}
          <div className="sp-section-title">الإدارة</div>

          {Api.can('USER_READ') && link('/users', 'fas fa-user-shield', 'المستخدمين')}
          {Api.can('ROLE_READ') && link('/roles', 'fas fa-key', 'الأدوار')}
          {Api.can('AUDIT_READ') && link('/audit', 'fas fa-list-alt', 'سجل المراجعة')}
          {Api.can('BRANCH_READ') && link('/branches', 'fas fa-store-alt', 'إدارة الفروع')}
          {Api.can('WAREHOUSE_READ') && link('/warehouses', 'fas fa-warehouse', 'إدارة المخازن')}
          {Api.can('PRODUCT_READ') && link('/inventory/report', 'fas fa-clipboard-list', 'الجرد التفصيلي')}
          {isAdmin && link('/settings', 'fas fa-cogs', 'إعدادات المتجر')}
          {Api.can('AUDIT_READ') && link('/offline-audit', 'fas fa-search-location', 'فحص البيانات المحلية')}

        </nav>

        {/* ── Toggle Collapse (Desktop only) ── */}
        <button className="sp-toggle-sidebar" onClick={onToggleCollapse}>
          <i className={`fas fa-chevron-${collapsed ? 'left' : 'right'}`}></i>
          <span>{collapsed ? 'فتح القائمة' : 'طي القائمة'}</span>
        </button>

        {/* ── Footer: Dark Mode + Logout (Mobile only) ── */}
        <div className="sp-footer">
          <div className="sp-dark-toggle">
            <div className="sp-dark-label">
              <i className="fas fa-moon"></i>
              <span>الوضع الداكن</span>
            </div>
            <label className="sp-toggle">
              <input type="checkbox" checked={isDark} onChange={toggleTheme} />
              <span className="sp-toggle-slider"></span>
            </label>
          </div>
          <button className="sp-logout-btn" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i>
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
