import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import AlwaysOnDisplay from '../common/AlwaysOnDisplay';
import { useEffect, useRef } from 'react';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const idleTimer = useRef(null);

  const resetIdleTimer = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      setIsIdle(true);
    }, 30000); // 30 seconds
  };

  useEffect(() => {
    const wakeEvents = ['mousedown', 'keydown'];
    const ambientEvents = ['mousemove', 'touchstart', 'scroll'];

    const handleInteraction = (e) => {
      // If it's a wake event, we definitely want to exit idle state
      if (wakeEvents.includes(e.type)) {
        setIsIdle(false);
      }
      
      // All events reset the timer to prevent GOING into idle
      resetIdleTimer();
    };
    
    wakeEvents.forEach(event => window.addEventListener(event, handleInteraction));
    ambientEvents.forEach(event => window.addEventListener(event, handleInteraction));

    resetIdleTimer(); // Initial start

    return () => {
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
