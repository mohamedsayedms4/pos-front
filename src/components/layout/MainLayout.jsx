import React, { useState, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
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
        <Topbar onMenuToggle={toggleSidebar} />
        <div className="page-content">
          <Outlet />
        </div>
      </main>
      {isIdle && <AlwaysOnDisplay />}
    </div>
  );
};

export default MainLayout;
