import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import AlwaysOnDisplay from '../common/AlwaysOnDisplay';
import ChatService from '../../services/ChatService';
import { useGlobalUI } from '../common/GlobalUI';
import FooterInfoBar from './FooterInfoBar';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const idleTimer = useRef(null);
  const isIdleRef = useRef(false);
  const { toast: showToast } = useGlobalUI();
  const [isIdleConfigOpen, setIsIdleConfigOpen] = useState(false);
  const [tempIdleTime, setTempIdleTime] = useState('0.5');
  const [tempIdlePin, setTempIdlePin] = useState('');
  const [currentPinDisplay, setCurrentPinDisplay] = useState(localStorage.getItem('pos_idle_pin') || '');

  useEffect(() => {
    isIdleRef.current = isIdle;
    const currentStorage = localStorage.getItem('pos_idle_state');
    const targetStr = isIdle ? 'true' : 'false';
    if (currentStorage !== targetStr) {
      localStorage.setItem('pos_idle_state', targetStr);
    }
  }, [isIdle]);
  const location = useLocation();
  const prevRouteRef = useRef({ path: '', label: '' });
  const currentPathRef = useRef(location.pathname);

  const pathMap = {
    '/dashboard': 'الرئيسية',
    '/products': 'المنتجات',
    '/categories': 'الأقسام',
    '/suppliers': 'الموردين',
    '/customers': 'العملاء',
    '/purchases': 'المشتريات',
    '/sales': 'المبيعات',
    '/pos': 'نقطة البيع',
    '/returns': 'المرتجعات',
    '/users': 'المستخدمين',
    '/audit': 'سجل العمليات',
    '/roles': 'الأدوار',
    '/notifications': 'الإشعارات',
    '/treasury': 'الخزينة',
    '/debts': 'الديون',
    '/expenses': 'المصروفات',
    '/partners': 'الشركاء',
    '/settings': 'الإعدادات',
    '/messages': 'الرسائل',
    '/payroll': 'الرواتب',
    '/attendance': 'الحضور',
    '/shifts': 'الورديات',
    '/damaged': 'الهوالك',
    '/online-orders': 'طلبات المتجر',
    '/super-admin/subscriptions': 'إدارة الاشتراكات',
  };

  useEffect(() => {
    // Track previous route
    if (currentPathRef.current !== location.pathname) {
      const prevPath = currentPathRef.current;
      // Map base path for dynamic IDs (e.g. /products/89 -> /products)
      const basePath = '/' + prevPath.split('/')[1];
      prevRouteRef.current = {
        path: prevPath,
        label: pathMap[basePath] || pathMap[prevPath] || 'الصفحة السابقة'
      };
      currentPathRef.current = location.pathname;
    }
  }, [location.pathname]);

  const resetIdleTimer = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    const savedTime = localStorage.getItem('pos_idle_time');
    
    // Default to '0' (disabled) if not set in localStorage
    const effectiveTime = savedTime !== null ? savedTime : '0';
    if (effectiveTime === '0') return; // idle screen disabled
    
    const idleTimeoutMs = parseInt(effectiveTime, 10);
    idleTimer.current = setTimeout(() => {
      setIsIdle(true);
    }, idleTimeoutMs);
  };

  // Cross-tab synchronization: listen for localStorage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'pos_idle_state') {
        if (e.newValue === 'true') {
          setIsIdle(true);
        } else if (e.newValue === 'false') {
          setIsIdle(false);
          resetIdleTimer();
        }
      }
      // Sync PIN changes across tabs
      if (e.key === 'pos_idle_pin') {
        setCurrentPinDisplay(e.newValue || '');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    // Connect to WebSocket base connection
    ChatService.connect();

    // Subscribe to global messaging updates
    const unsubscribe = ChatService.onMessage((msg) => {
      // If message is from someone else and user is NOT on the messages page
      const isSelf = msg.senderId === JSON.parse(localStorage.getItem('pos_user'))?.id;
      if (!isSelf && window.location.pathname !== '/messages') {
        showToast(`💬 رسالة جديدة من ${msg.senderName}: ${msg.content.substring(0, 30)}${msg.content.length > 30 ? '...' : ''}`, 'info', () => {
          window.location.href = '/messages';
        });
      }
    });

    const wakeEvents = ['mousedown', 'keydown'];
    const ambientEvents = ['mousemove', 'touchstart', 'scroll'];

    const handleInteraction = (e) => {
      if (e.type === 'keydown' && e.key === 'F9') return; // Ignore F9 in generic wakeup
      // If PIN is set, do NOT allow generic interactions to dismiss the idle screen
      if (isIdleRef.current && localStorage.getItem('pos_idle_pin')) return;
      if (wakeEvents.includes(e.type)) {
        setIsIdle(false);
      }
      resetIdleTimer();
    };

    let lastF9Time = 0;
    const handleKeyDown = (e) => {
      if (e.key === 'F9') {
        e.preventDefault();

        // If we are currently idle and NO PIN is set, F9 press wakes up the screen
        if (isIdleRef.current) {
          if (!localStorage.getItem('pos_idle_pin')) {
            setIsIdle(false);
            resetIdleTimer();
          }
          // If PIN is set, F9 does nothing here — user must enter PIN on the lock screen
          return;
        }

        const now = Date.now();
        if (now - lastF9Time < 500) {
          console.log('[Idle] Double F9 detected! Launching idle screen immediately.');
          setIsIdle(true);
          lastF9Time = 0;
        } else {
          lastF9Time = now;
          setTimeout(() => {
            if (lastF9Time === now) {
              const savedTime = localStorage.getItem('pos_idle_time');
              const currentMin = savedTime !== null
                ? Math.round((parseInt(savedTime, 10)) / 60000 * 10) / 10
                : 0; // default 0 min (disabled)

              setTempIdleTime(savedTime === '0' || savedTime === null ? '0' : currentMin.toString());
              setTempIdlePin('');
              setIsIdleConfigOpen(true);
              lastF9Time = 0;
            }
          }, 300); // 300ms window
        }
      }
    };

    wakeEvents.forEach(event => window.addEventListener(event, handleInteraction));
    ambientEvents.forEach(event => window.addEventListener(event, handleInteraction));
    window.addEventListener('keydown', handleKeyDown);

    resetIdleTimer();

    return () => {
      unsubscribe();
      wakeEvents.forEach(event => window.removeEventListener(event, handleInteraction));
      ambientEvents.forEach(event => window.removeEventListener(event, handleInteraction));
      window.removeEventListener('keydown', handleKeyDown);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  const handleSaveIdleSettings = () => {
    const val = parseFloat(tempIdleTime);
    if (!isNaN(val) && val >= 0) {
      const ms = Math.round(val * 60000);
      localStorage.setItem('pos_idle_time', ms.toString());

      // Handle PIN
      if (tempIdlePin.trim().length > 0) {
        if (tempIdlePin.trim().length < 4) {
          showToast('رمز PIN يجب أن يكون 4 أرقام على الأقل!', 'error');
          return;
        }
        localStorage.setItem('pos_idle_pin', tempIdlePin.trim());
        setCurrentPinDisplay(tempIdlePin.trim());
      }

      let msg = val === 0 
        ? '🔴 تم تعطيل شاشة الانتظار التلقائية.' 
        : `🟢 تم ضبط وقت شاشة الانتظار على ${val} دقيقة.`;
      if (tempIdlePin.trim().length >= 4) {
        msg += ' 🔒 تم تفعيل قفل PIN.';
      }
      showToast(msg, 'success');
      resetIdleTimer();
      setIsIdleConfigOpen(false);
    } else {
      showToast('الرجاء إدخال رقم صحيح!', 'error');
    }
  };

  const handleRemovePin = () => {
    localStorage.removeItem('pos_idle_pin');
    setCurrentPinDisplay('');
    setTempIdlePin('');
    showToast('🔓 تم إزالة رمز PIN بنجاح.', 'success');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const [impersonationBackup, setImpersonationBackup] = useState(null);

  useEffect(() => {
    const backup = localStorage.getItem('super_admin_backup');
    if (backup) {
      try {
        setImpersonationBackup(JSON.parse(backup));
      } catch (e) {
        console.error('Invalid super_admin_backup');
      }
    }
  }, []);

  const handleReturnToSuperAdmin = () => {
    if (impersonationBackup) {
      if (impersonationBackup.access) localStorage.setItem('pos_access_token', impersonationBackup.access);
      if (impersonationBackup.refresh) localStorage.setItem('pos_refresh_token', impersonationBackup.refresh);
      if (impersonationBackup.tenantId) localStorage.setItem('pos_tenant_id', impersonationBackup.tenantId);
      if (impersonationBackup.user) localStorage.setItem('pos_user', impersonationBackup.user);
      
      localStorage.removeItem('super_admin_backup');
      window.location.href = '/super-admin/subscriptions';
    }
  };

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {impersonationBackup && (
          <div style={{
            background: 'var(--sa-sub-accent-blue, #4f46e5)',
            color: 'white',
            padding: '10px 20px',
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '15px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            zIndex: 1000,
            position: 'relative'
          }}>
            <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
              ⚠️ أنت الآن تتصفح كمدير للمتجر. أي تعديلات ستحفظ في هذا المتجر.
            </span>
            <button 
              onClick={handleReturnToSuperAdmin}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid white',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.2s'
              }}
            >
              العودة للسوبر أدمن
            </button>
          </div>
        )}
        <Topbar 
          onMenuToggle={toggleSidebar} 
          prevInfo={location.pathname !== '/dashboard' ? prevRouteRef.current : null} 
        />
        <div style={{ flex: '1 0 auto' }}>
          <div className="page-content">
            <Outlet />
          </div>
        </div>
        <FooterInfoBar />
      </main>
      {isIdle && <AlwaysOnDisplay />}
      
      {isIdleConfigOpen && (
        <div className="modal-overlay active" onClick={() => setIsIdleConfigOpen(false)}>
          <div className="modal" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                🛠️ إعدادات شاشة الانتظار (Screensaver)
              </h2>
              <button className="close-btn" onClick={() => setIsIdleConfigOpen(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem', marginBottom: '20px', lineHeight: '1.6' }}>
                تحكم في وقت خمول النظام بالدقائق قبل تفعيل شاشة الانتظار تلقائياً لتأمين الشاشة وحفظ الطاقة:
              </p>
              
              {/* Idle Time Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-light)', fontWeight: '600' }}>⏱️ وقت الانتظار (بالدقائق):</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={tempIdleTime}
                  onChange={(e) => setTempIdleTime(e.target.value)}
                  placeholder="مثال: 5 لتصبح خمس دقائق، أو 0 لتعطيلها"
                  className="form-control"
                  style={{
                    background: 'var(--bg-dark, #0c0d12)',
                    border: '1px solid var(--border-input, #2d3748)',
                    borderRadius: '4px',
                    padding: '12px 16px',
                    color: '#ffffff',
                    fontSize: '1rem',
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveIdleSettings();
                    } else if (e.key === 'Escape') {
                      setIsIdleConfigOpen(false);
                    }
                  }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                  * أدخل 0.5 لنصف دقيقة (30 ثانية)، أو 0 لإيقاف الشاشة التلقائية بالكامل.
                </span>
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid var(--border-input, #2d3748)', margin: '0 0 20px 0' }}></div>

              {/* PIN Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-light)', fontWeight: '600' }}>🔒 رمز PIN لقفل الشاشة:</label>
                
                {currentPinDisplay ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      flex: 1,
                      background: 'var(--bg-dark, #0c0d12)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      borderRadius: '4px',
                      padding: '12px 16px',
                      color: '#22c55e',
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      ✅ رمز PIN مفعّل ({currentPinDisplay.length} أرقام)
                    </div>
                    <button 
                      className="btn" 
                      onClick={handleRemovePin}
                      style={{
                        background: 'rgba(244, 63, 94, 0.1)',
                        color: '#f43f5e',
                        border: '1px solid rgba(244, 63, 94, 0.3)',
                        padding: '12px 16px',
                        fontSize: '0.85rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      🗑️ إزالة
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="password"
                      value={tempIdlePin}
                      onChange={(e) => {
                        // Only allow digits
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length <= 8) setTempIdlePin(val);
                      }}
                      placeholder="أدخل 4-8 أرقام لتفعيل القفل (اختياري)"
                      className="form-control"
                      style={{
                        background: 'var(--bg-dark, #0c0d12)',
                        border: '1px solid var(--border-input, #2d3748)',
                        borderRadius: '4px',
                        padding: '12px 16px',
                        color: '#ffffff',
                        fontSize: '1rem',
                        outline: 'none',
                        width: '100%',
                        boxSizing: 'border-box',
                        letterSpacing: '0.3em'
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveIdleSettings();
                        } else if (e.key === 'Escape') {
                          setIsIdleConfigOpen(false);
                        }
                      }}
                    />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                      * عند تفعيل PIN، ستحتاج لإدخاله لفتح الشاشة. يعمل على جميع التبويبات المفتوحة في نفس المتصفح.
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="modal-footer" style={{ gap: '12px' }}>
              <button className="btn btn-ghost" onClick={() => setIsIdleConfigOpen(false)}>إلغاء</button>
              <button className="btn btn-primary" onClick={handleSaveIdleSettings}>حفظ الإعدادات</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainLayout;

