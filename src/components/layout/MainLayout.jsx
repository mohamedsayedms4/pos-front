import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import AlwaysOnDisplay from '../common/AlwaysOnDisplay';
import ChatService from '../../services/ChatService';
import { useGlobalUI } from '../common/GlobalUI';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const idleTimer = useRef(null);
  const { showToast } = useGlobalUI();
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
    '/online-orders': 'طلبات المتجر'
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
    idleTimer.current = setTimeout(() => {
      setIsIdle(true);
    }, 30000); // 30 seconds
  };

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
      if (wakeEvents.includes(e.type)) {
        setIsIdle(false);
      }
      resetIdleTimer();
    };
    
    wakeEvents.forEach(event => window.addEventListener(event, handleInteraction));
    ambientEvents.forEach(event => window.addEventListener(event, handleInteraction));

    resetIdleTimer();

    return () => {
      unsubscribe();
      wakeEvents.forEach(event => window.removeEventListener(event, handleInteraction));
      ambientEvents.forEach(event => window.removeEventListener(event, handleInteraction));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-content">
        <Topbar 
          onMenuToggle={toggleSidebar} 
          prevInfo={location.pathname !== '/dashboard' ? prevRouteRef.current : null} 
        />
        <div className="page-content">
          <Outlet />
        </div>
      </main>
      {isIdle && <AlwaysOnDisplay />}
    </div>
  );
};

export default MainLayout;
