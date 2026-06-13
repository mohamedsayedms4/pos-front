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

  const isSettingsPageActive = location.pathname.startsWith('/settings') && !location.pathname.startsWith('/settings/attendance');
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(isSettingsPageActive);

  // Sync menu open state when location changes
  useEffect(() => {
    if (location.pathname.startsWith('/products')) {
      setProductsMenuOpen(true);
    }
    if (location.pathname.startsWith('/attendance') || location.pathname.startsWith('/settings/attendance')) {
      setAttendanceMenuOpen(true);
    }
    if (location.pathname.startsWith('/settings') && !location.pathname.startsWith('/settings/attendance')) {
      setSettingsMenuOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleStorage = () => setUser(Api._getUser() || { name: 'Admin', role: 'مدير النظام' });
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
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
        {isOnline && <div className="nav-section-title">العمليات الأساسية</div>}

        {/* 1. إعدادات المتجر */}
        {isAdmin && isOnline && (
          <div className="nav-dropdown-wrapper" style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              className={`nav-item ${isSettingsPageActive ? 'active' : ''}`}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', paddingRight: '16px' }}
              onClick={() => setSettingsMenuOpen(!settingsMenuOpen)}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, color: 'inherit', padding: '11px 0' }}
              >
                <span className="nav-icon">⚙️</span>
                <span>إعدادات المتجر</span>
              </div>
              <span
                style={{
                  fontSize: '0.8rem',
                  transition: 'transform 0.2s',
                  transform: settingsMenuOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                  padding: '4px 10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)'
                }}
              >
                ◀
              </span>
            </div>

            {settingsMenuOpen && (
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
                  to="/settings"
                  end
                  className={`nav-item sub-item ${location.pathname === '/settings' ? 'active' : ''}`}
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  onClick={onClose}
                >
                  <span className="nav-icon" style={{ fontSize: '0.9rem' }}>•</span>
                  <span>المتجر والهوية</span>
                </NavLink>
                {/*
                <NavLink
                  to="/settings/smtp"
                  className={`nav-item sub-item ${location.pathname === '/settings/smtp' ? 'active' : ''}`}
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  onClick={onClose}
                >
                  <span className="nav-icon" style={{ fontSize: '0.9rem' }}>•</span>
                  <span>خادم البريد SMTP</span>
                </NavLink>
                */}
                <NavLink
                  to="/settings/print"
                  className={`nav-item sub-item ${location.pathname === '/settings/print' ? 'active' : ''}`}
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  onClick={onClose}
                >
                  <span className="nav-icon" style={{ fontSize: '0.9rem' }}>•</span>
                  <span>الطباعة والقوالب</span>
                </NavLink>
                <NavLink
                  to="/settings/banner"
                  className={`nav-item sub-item ${location.pathname === '/settings/banner' ? 'active' : ''}`}
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  onClick={onClose}
                >
                  <span className="nav-icon" style={{ fontSize: '0.9rem' }}>•</span>
                  <span>الـ Banner الإعلاني</span>
                </NavLink>
              </div>
            )}
          </div>
        )}

        {/* 2. إدارة الفروع */}
        {Api.can('BRANCH_READ') && isOnline && (
          <NavLink to="/branches" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">🏢</span>
            <span>إدارة الفروع</span>
          </NavLink>
        )}

        {/* 3. إدارة المخازن */}
        {Api.can('WAREHOUSE_READ') && isOnline && (
          <NavLink to="/warehouses" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">📦</span>
            <span>إدارة المخازن</span>
          </NavLink>
        )}

        {/* 4. المستخدمين */}
        {Api.can('USER_READ') && isOnline && (
          <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">👤</span>
            <span>المستخدمين</span>
          </NavLink>
        )}

        {/* 5. الفئات */}
        {Api.can('PRODUCT_READ') && isOnline && (
          <NavLink to="/categories" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">▤</span>
            <span>الفئات</span>
          </NavLink>
        )}

        {/* 6. المنتجات */}
        {Api.can('PRODUCT_READ') && isOnline && (
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
        {Api.can('CUSTOMER_READ') && isOnline && (
          <NavLink to="/customers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">👥</span>
            <span>العملاء</span>
          </NavLink>
        )}

        {/* 8. الموردين */}
        {Api.can('SUPPLIER_READ') && isOnline && (
          <NavLink to="/suppliers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">▧</span>
            <span>الموردين</span>
          </NavLink>
        )}

        {/* 9. المشتريات */}
        {Api.can('PURCHASE_READ') && isOnline && (
          <NavLink to="/purchases" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">🛒</span>
            <span>المشتريات</span>
          </NavLink>
        )}

        {/* 10. فواتير المبيعات */}
        {Api.can('SALE_READ') && isOnline && (
          <NavLink to="/sales" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">🧾</span>
            <span>فواتير المبيعات</span>
          </NavLink>
        )}

        {/* 11. مرتجع المبيعات */}
        {Api.can('SALE_READ') && isOnline && (
          <NavLink to="/returns" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">🔄</span>
            <span>مرتجع المبيعات</span>
          </NavLink>
        )}

        {/* 12. المصروفات */}
        {Api.can('EXPENSE_READ') && isOnline && (
          <NavLink to="/expenses" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">💸</span>
            <span>المصروفات</span>
          </NavLink>
        )}

        {/* 13. سجل الشيكات
        {Api.can('TREASURY_READ') && (
          <NavLink to="/checks" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">📑</span>
            <span>سجل الشيكات</span>
          </NavLink>
        )}
        */}

        {/* ────────────────── بقية العمليات والطلبات ────────────────── */}
        <div className="nav-section-title">{isOnline ? 'المبيعات المباشرة والتشغيل' : 'نظام الكاشير (أوفلاين)'}</div>

        {/* نقطة البيع (POS) */}
        {Api.can('SALE_WRITE') && (
          <NavLink to="/pos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">🖥️</span>
            <span>نقطة البيع (POS)</span>
          </NavLink>
        )}

        {/* سجل الورديات */}
        {Api.can('SALE_READ') && (
          <NavLink to="/sessions" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">📅</span>
            <span>سجل الورديات</span>
          </NavLink>
        )}
        {/* استلام المخزون */}
        {Api.can('STOCK_READ') && isOnline && (
          <NavLink to="/stock-receipts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">📦</span>
            <span>استلام المخزون</span>
          </NavLink>
        )}

        {/* نقل البضاعة */}
        {Api.can('WAREHOUSE_READ') && isOnline && (
          <NavLink to="/stock-transfers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">🔀</span>
            <span>نقل البضاعة</span>
          </NavLink>
        )}

        {/* التوالف والهوالك */}
        {Api.can('DAMAGED_GOODS_MANAGE') && isOnline && (
          <NavLink to="/damaged" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon">🗑️</span>
            <span>التوالف والهوالك</span>
          </NavLink>
        )}

        {/* ────────────────── المتجر الإلكتروني ────────────────── */}
        {isOnline && (
          <>
            <div className="nav-section-title">المتجر الإلكتروني</div>
            
            <a 
              href="/store" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="nav-item"
              style={{ textDecoration: 'none' }}
              onClick={onClose}
            >
              <span className="nav-icon">🌐</span>
              <span>زيارة المتجر الإلكتروني</span>
            </a>

            {Api.can('SALE_READ') && (
              <NavLink to="/online-orders" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon">🛒</span>
                <span>الطلبات الإلكترونية</span>
              </NavLink>
            )}

            {Api.can('PRODUCT_READ') && (
              <NavLink to="/products/interactions" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon">📊</span>
                <span>تفاعل العملاء أونلاين</span>
              </NavLink>
            )}

            {Api.can('PRODUCT_READ') && (
              <NavLink to="/products/offers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon">🏷️</span>
                <span>عروض وخصومات العملاء</span>
              </NavLink>
            )}

            {isAdmin && (
              <NavLink to="/settings/banner" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon">🖼️</span>
                <span>الـ Banner الإعلاني</span>
              </NavLink>
            )}
          </>
        )}

        {/* ────────────────── الحسابات والتقارير المتقدمة ────────────────── */}
        {(Api.can('TREASURY_READ') || Api.can('FIXED_ASSET_READ') || Api.can('PAYROLL_READ') || Api.can('PROFIT_LOSS_READ') || isAdmin || Api.can('CUSTOMER_READ')) && isOnline && (
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
            {Api.can('PROFIT_LOSS_READ') && (
              <NavLink to="/profit-loss" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon">📈</span>
                <span>الأرباح والخسائر</span>
              </NavLink>
            )}
            {/*
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
            */}
            {Api.can('CUSTOMER_READ') && (
              <NavLink to="/debts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon">📊</span>
                <span>إدارة الآجل والأقساط</span>
              </NavLink>
            )}
            {/*
            {isAdmin && (
              <NavLink to="/facebook-ads" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon">🔵</span>
                <span>تقارير إعلانات فيسبوك</span>
              </NavLink>
            )}
            */}
            {Api.can('CUSTOMER_READ') && (
              <NavLink to="/installments-calendar" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon">📅</span>
                <span>تقويم الأقساط</span>
              </NavLink>
            )}
            {/*
            {Api.can('PAYROLL_READ') && (
              <NavLink to="/payroll" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon">💸</span>
                <span>مسير الرواتب</span>
              </NavLink>
            )}
            */}
          </>
        )}

        {/* ────────────────── الموظفين والموارد البشرية ────────────────── */}
        {/*
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
        */}

        <div className="nav-divider"></div>
        <NavLink to="/download-desktop-app" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <span className="nav-icon">💻</span>
          <span>تنزيل البرنامج</span>
        </NavLink>

        {/* ────────────────── سجلات المراقبة والتحكم ────────────────── */}
        {(Api.can('ROLE_READ') || Api.can('AUDIT_READ')) && isOnline && (
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
              <NavLink to="/inventory-checks" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon">📝</span>
                <span>عمليات الجرد والتسوية</span>
              </NavLink>
            )}
            {Api.can('PRODUCT_READ') && (
              <NavLink to="/inventory/report" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon">📋</span>
                <span>الجرد التفصيلي</span>
              </NavLink>
            )}
          </>
        )}
        {/* ────────────────── الدعم الفني ────────────────── */}
        {isOnline && (
          <>
            <div className="nav-section-title">الدعم الفني</div>
            <NavLink to="/tickets" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
              <span className="nav-icon">🛠️</span>
              <span>تذاكر الدعم الفني</span>
            </NavLink>
            {config?.supportPhone && (
              <a
                href={`https://wa.me/${config.supportPhone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="nav-item"
                style={{ textDecoration: 'none', color: '#25d366' }}
                title={`واتساب الدعم: ${config.supportPhone}`}
              >
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </span>
                <span>واتساب الدعم المباشر</span>
              </a>
            )}
          </>
        )}

        {/* ────────────────── Super Admin ────────────────── */}
        {Api.isSuperAdmin && Api.isSuperAdmin() && isOnline && (
          <>
            <div className="nav-section-title">🔑 Super Admin</div>
            <NavLink to="/super-admin/subscriptions" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
              <span className="nav-icon">💳</span>
              <span>إدارة الاشتراكات</span>
            </NavLink>
            <NavLink to="/super-admin/articles" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
              <span className="nav-icon">📰</span>
              <span>إدارة المقالات</span>
            </NavLink>
            <NavLink to="/super-admin/desktop-app" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
              <span className="nav-icon">💻</span>
              <span>برنامج الديسكتوب</span>
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
