import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Api, { API_BASE } from '../../services/api';
import logoSidebarLight from '../../assets/img/logo-sidebar-light.png';
import logoSidebarDark from '../../assets/img/logo-sidebar-dark.png';
import { useTheme } from '../common/ThemeContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const [user, setUser] = useState(Api._getUser() || { name: 'Admin', role: 'مدير النظام' });
  const [config, setConfig] = useState(null);
  const [logoError, setLogoError] = useState(false);
  const location = useLocation();

  const isProductsPageActive = location.pathname.startsWith('/products');
  const [productsMenuOpen, setProductsMenuOpen] = useState(isProductsPageActive);

  const isAttendancePageActive = location.pathname.startsWith('/attendance') || location.pathname.startsWith('/settings/attendance');
  const [attendanceMenuOpen, setAttendanceMenuOpen] = useState(isAttendancePageActive);

  // Sync menu open state when location changes
  useEffect(() => {
    if (location.pathname.startsWith('/products')) {
      setProductsMenuOpen(true);
    }
    if (location.pathname.startsWith('/attendance') || location.pathname.startsWith('/settings/attendance')) {
      setAttendanceMenuOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleStorage = () => setUser(Api._getUser() || { name: 'Admin', role: 'مدير النظام' });
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Reset logo error when config or theme changes
  useEffect(() => {
    setLogoError(false);
  }, [config, theme]);

  // Load logo from global config
  useEffect(() => {
    Api.getGlobalConfig().then(cfg => {
      if (cfg) {
        setConfig(cfg);
      }
    }).catch(() => { });
  }, []);

  const currentLogo = React.useMemo(() => {
    const localDefault = theme === 'dark' ? logoSidebarDark : logoSidebarLight;
    if (logoError || !config) return localDefault;
    const logoToUse = theme === 'dark'
      ? (config.logoSidebarDarkUrl || config.logoUrl)
      : (config.logoSidebarLightUrl || config.logoUrl);
    return logoToUse ? Api.getImageUrl(logoToUse) : localDefault;
  }, [config, theme, logoError]);

  // Sync page icon with favicon from configuration or fallback
  useEffect(() => {
    if (config) {
      const faviconToUse = config.logoFaviconUrl || config.logoUrl;
      if (faviconToUse) {
        const link = document.querySelector("link[rel~='icon']");
        if (link) link.href = Api.getImageUrl(faviconToUse);
      }
    }
  }, [config]);

  const avatarUrl = user?.profilePicture
    ? `${API_BASE}/products/images/${user.profilePicture}`
    : null;
  const isAdmin = (user?.roles || []).some(r => r.includes('ADMIN'));

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`} id="sidebar">
      <div className="sidebar-header">
        <button className="sidebar-close-btn" onClick={onClose}>✕</button>
        <NavLink to="/dashboard" className="logo-mark" style={{ margin: '0 auto', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }} onClick={onClose}>
          <img
            src={currentLogo}
            alt="Logo"
            style={{ width: '80px', height: '32px', objectFit: 'contain' }}
            onError={() => setLogoError(true)}
          />
        </NavLink>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">العمليات الأساسية</div>

        {/* 1. إعدادات المتجر */}
        {isAdmin && (
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">⚙️</span>
            <span>إعدادات المتجر</span>
          </NavLink>
        )}

        {/* 2. إدارة الفروع */}
        {Api.can('BRANCH_READ') && (
          <NavLink to="/branches" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">🏢</span>
            <span>إدارة الفروع</span>
          </NavLink>
        )}

        {/* 3. إدارة المخازن */}
        {Api.can('WAREHOUSE_READ') && (
          <NavLink to="/warehouses" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">📦</span>
            <span>إدارة المخازن</span>
          </NavLink>
        )}

        {/* 4. المستخدمين */}
        {Api.can('USER_READ') && (
          <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">👤</span>
            <span>المستخدمين</span>
          </NavLink>
        )}

        {/* 5. الفئات */}
        {Api.can('PRODUCT_READ') && (
          <NavLink to="/categories" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">▤</span>
            <span>الفئات</span>
          </NavLink>
        )}

        {/* 6. المنتجات */}
        {Api.can('PRODUCT_READ') && (
          <div className="nav-dropdown-wrapper" style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              className={`nav-item ${isProductsPageActive ? 'active' : ''}`}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', paddingRight: '16px' }}
              onClick={() => setProductsMenuOpen(!productsMenuOpen)}
            >
              <NavLink
                to="/products"
                end
                className="nav-item-link"
                style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, color: 'inherit', textDecoration: 'none', padding: '11px 0' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setProductsMenuOpen(true);
                  onClose();
                }}
              >
                <span className="nav-icon">▨</span>
                <span>المنتجات</span>
              </NavLink>
              <span
                style={{
                  fontSize: '0.8rem',
                  transition: 'transform 0.2s',
                  transform: productsMenuOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                  padding: '4px 10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setProductsMenuOpen(!productsMenuOpen);
                }}
              >
                ◀
              </span>
            </div>

            {productsMenuOpen && (
              <div
                className="nav-sub-items"
                style={{
                  background: 'rgba(0, 0, 0, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  paddingRight: '15px'
                }}
              >
                <NavLink
                  to="/products"
                  end
                  className={`nav-item sub-item ${location.pathname === '/products' ? 'active' : ''}`}
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  onClick={onClose}
                >
                  <span className="nav-icon" style={{ fontSize: '0.9rem' }}>•</span>
                  <span>كل المنتجات</span>
                </NavLink>
                <NavLink
                  to="/products/add"
                  className={`nav-item sub-item ${location.pathname === '/products/add' ? 'active' : ''}`}
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  onClick={onClose}
                >
                  <span className="nav-icon" style={{ fontSize: '0.9rem' }}>•</span>
                  <span>إضافة منتج</span>
                </NavLink>
                <NavLink
                  to="/products/analytics"
                  className={`nav-item sub-item ${location.pathname === '/products/analytics' ? 'active' : ''}`}
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  onClick={onClose}
                >
                  <span className="nav-icon" style={{ fontSize: '0.9rem' }}>•</span>
                  <span>الإحصائيات</span>
                </NavLink>
                <NavLink
                  to="/products/deleted"
                  className={`nav-item sub-item ${location.pathname === '/products/deleted' ? 'active' : ''}`}
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  onClick={onClose}
                >
                  <span className="nav-icon" style={{ fontSize: '0.9rem' }}>•</span>
                  <span>المنتجات المحذوفة</span>
                </NavLink>
              </div>
            )}
          </div>
        )}

        {/* 7. العملاء */}
        {Api.can('CUSTOMER_READ') && (
          <NavLink to="/customers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">👥</span>
            <span>العملاء</span>
          </NavLink>
        )}

        {/* 8. الموردين */}
        {Api.can('SUPPLIER_READ') && (
          <NavLink to="/suppliers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">▧</span>
            <span>الموردين</span>
          </NavLink>
        )}

        {/* 9. المشتريات */}
        {Api.can('PURCHASE_READ') && (
          <NavLink to="/purchases" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">🛒</span>
            <span>المشتريات</span>
          </NavLink>
        )}

        {/* 10. فواتير المبيعات */}
        {Api.can('SALE_READ') && (
          <NavLink to="/sales" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">🧾</span>
            <span>فواتير المبيعات</span>
          </NavLink>
        )}

        {/* 11. مرتجع المبيعات */}
        {Api.can('SALE_READ') && (
          <NavLink to="/returns" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">🔄</span>
            <span>مرتجع المبيعات</span>
          </NavLink>
        )}

        {/* 12. المصروفات */}
        {Api.can('EXPENSE_READ') && (
          <NavLink to="/expenses" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">💸</span>
            <span>المصروفات</span>
          </NavLink>
        )}

        {/* 13. سجل الشيكات */}
        {Api.can('TREASURY_READ') && (
          <NavLink to="/checks" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">📑</span>
            <span>سجل الشيكات</span>
          </NavLink>
        )}

        {/* ────────────────── بقية العمليات والطلبات ────────────────── */}
        <div className="nav-section-title">المبيعات المباشرة والتشغيل</div>

        {/* نقطة البيع (POS) */}
        {Api.can('SALE_WRITE') && (
          <NavLink to="/pos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">🖥️</span>
            <span>نقطة البيع (POS)</span>
          </NavLink>
        )}

        {/* الطلبات الإلكترونية */}
        {Api.can('SALE_READ') && (
          <NavLink to="/online-orders" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">🌐</span>
            <span>الطلبات الإلكترونية</span>
          </NavLink>
        )}

        {/* استلام المخزون */}
        {Api.can('STOCK_READ') && (
          <NavLink to="/stock-receipts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">📦</span>
            <span>استلام المخزون</span>
          </NavLink>
        )}

        {/* تفاعل العملاء */}
        {Api.can('PRODUCT_READ') && (
          <NavLink to="/products/interactions" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">📊</span>
            <span>تفاعل العملاء</span>
          </NavLink>
        )}

        {/* التوالف والهوالك */}
        {Api.can('DAMAGED_GOODS_MANAGE') && (
          <NavLink to="/damaged" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">🗑️</span>
            <span>التوالف والهوالك</span>
          </NavLink>
        )}

        {/* ────────────────── الحسابات والتقارير المتقدمة ────────────────── */}
        {(Api.can('TREASURY_READ') || Api.can('FIXED_ASSET_READ') || Api.can('PAYROLL_READ')) && (
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

        {/* ────────────────── الموظفين والموارد البشرية ────────────────── */}
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
              <div className="nav-dropdown-wrapper" style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  className={`nav-item ${isAttendancePageActive ? 'active' : ''}`}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', paddingRight: '16px' }}
                  onClick={() => setAttendanceMenuOpen(!attendanceMenuOpen)}
                >
                  <NavLink
                    to="/attendance"
                    end
                    className="nav-item-link"
                    style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, color: 'inherit', textDecoration: 'none', padding: '11px 0' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setAttendanceMenuOpen(true);
                      onClose();
                    }}
                  >
                    <span className="nav-icon">📅</span>
                    <span>الحضور والانصراف</span>
                  </NavLink>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      transition: 'transform 0.2s',
                      transform: attendanceMenuOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                      padding: '4px 10px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'var(--text-muted)'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setAttendanceMenuOpen(!attendanceMenuOpen);
                    }}
                  >
                    ◀
                  </span>
                </div>

                {attendanceMenuOpen && (
                  <div
                    className="nav-sub-items"
                    style={{
                      background: 'rgba(0, 0, 0, 0.2)',
                      display: 'flex',
                      flexDirection: 'column',
                      paddingRight: '15px'
                    }}
                  >
                    <NavLink
                      to="/attendance"
                      end
                      className={`nav-item sub-item ${location.pathname === '/attendance' ? 'active' : ''}`}
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                      onClick={onClose}
                    >
                      <span className="nav-icon" style={{ fontSize: '0.9rem' }}>•</span>
                      <span>الحضور اليومي</span>
                    </NavLink>

                    <NavLink
                      to="/attendance/scan"
                      className={`nav-item sub-item ${location.pathname === '/attendance/scan' ? 'active' : ''}`}
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                      onClick={onClose}
                    >
                      <span className="nav-icon" style={{ fontSize: '0.9rem' }}>•</span>
                      <span>شاشة مسح الموظف</span>
                    </NavLink>

                    {Api.can('ATTENDANCE_GEO_ALERT') && (
                      <NavLink
                        to="/attendance/violations-log"
                        className={`nav-item sub-item ${location.pathname === '/attendance/violations-log' ? 'active' : ''}`}
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                        onClick={onClose}
                      >
                        <span className="nav-icon" style={{ fontSize: '0.9rem' }}>•</span>
                        <span>سجل المخالفات</span>
                      </NavLink>
                    )}

                    {isAdmin && (
                      <NavLink
                        to="/settings/attendance"
                        className={`nav-item sub-item ${location.pathname === '/settings/attendance' ? 'active' : ''}`}
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                        onClick={onClose}
                      >
                        <span className="nav-icon" style={{ fontSize: '0.9rem' }}>•</span>
                        <span>إعدادات الأمان</span>
                      </NavLink>
                    )}
                  </div>
                )}
              </div>
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
            {isAdmin && (
              <NavLink to="/campaigns" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon">📣</span>
                <span>الحملات الترويجية</span>
              </NavLink>
            )}
          </>
        )}

        {/* ────────────────── سجلات المراقبة والتحكم ────────────────── */}
        {(Api.can('ROLE_READ') || Api.can('AUDIT_READ')) && (
          <>
            <div className="nav-section-title">المراقبة وسجلات النظام</div>
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
            {Api.can('PRODUCT_READ') && (
              <NavLink to="/inventory/report" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon">📋</span>
                <span>الجرد التفصيلي</span>
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
        {/* ────────────────── الدعم الفني ────────────────── */}
        <div className="nav-section-title">الدعم الفني</div>
        <NavLink to="/tickets" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <span className="nav-icon">🛠️</span>
          <span>تذاكر الدعم الفني</span>
        </NavLink>

        {/* ────────────────── Super Admin ────────────────── */}
        {Api.isSuperAdmin && Api.isSuperAdmin() && (
          <>
            <div className="nav-section-title">🔑 Super Admin</div>
            <NavLink to="/super-admin/subscriptions" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
              <span className="nav-icon">💳</span>
              <span>إدارة الاشتراكات</span>
            </NavLink>
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
