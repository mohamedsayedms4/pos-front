import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Api from '../services/api';
import logoLandingLight from '../assets/img/logo-landing-light.png';
import logoLandingDark from '../assets/img/logo-landing-dark.png';
import { useTheme } from '../components/common/ThemeContext';

import '../styles/pages/SeggleLanding.css';

const Icons = {
  Lock: (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Check: (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
};

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [config,       setConfig]       = useState(null);
  const [logoError,    setLogoError]    = useState(false);
  const [softwareName, setSoftwareName] = useState('سجل');
  const [scrolled,     setScrolled]     = useState(false);

  const currentLogo = React.useMemo(() => {
    const localDefault = theme === 'dark' ? logoLandingDark : logoLandingLight;
    if (logoError || !config) return localDefault;
    const logoToUse = theme === 'dark'
      ? (config.logoLandingDarkUrl || config.logoUrl)
      : (config.logoLandingLightUrl || config.logoUrl);
    return logoToUse ? Api.getImageUrl(logoToUse) : localDefault;
  }, [config, theme, logoError]);

  useEffect(() => {
    Api.getGlobalConfig()
      .then((cfg) => {
        if (cfg) {
          setConfig(cfg);
          if (cfg.softwareName) setSoftwareName(cfg.softwareName);
        }
      })
      .catch(() => {});
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setLogoError(false); }, [config, theme]);

  // Handle cursor interactions
  useEffect(() => {
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorRing = document.querySelector('.cursor-ring');
    
    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;

    const handleMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      
      if (cursorDot) {
        cursorDot.style.left = mouseX + 'px';
        cursorDot.style.top = mouseY + 'px';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    let animFrame;
    const renderCursor = () => {
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;
      
      if (cursorRing) {
        cursorRing.style.left = ringX + 'px';
        cursorRing.style.top = ringY + 'px';
      }
      
      animFrame = window.requestAnimationFrame(renderCursor);
    };
    animFrame = window.requestAnimationFrame(renderCursor);

    // Hover states for links and buttons
    const hoverElements = document.querySelectorAll('a, button, .welcome-card');
    const addHover = () => cursorRing && cursorRing.classList.add('hovering');
    const rmHover = () => cursorRing && cursorRing.classList.remove('hovering');
    
    hoverElements.forEach(el => {
      el.addEventListener('mouseenter', addHover);
      el.addEventListener('mouseleave', rmHover);
    });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animFrame);
      hoverElements.forEach(el => {
        el.removeEventListener('mouseenter', addHover);
        el.removeEventListener('mouseleave', rmHover);
      });
    };
  }, []);

  return (
    <div className="landing-layout" style={{ background: 'var(--bg-light)', minHeight: '100vh', position: 'relative', overflow: 'hidden', direction: 'rtl' }}>
      
      {/* Background decorations matching the website brand */}
      <div className="hero-center-glow" style={{ top: '35%', opacity: 0.8 }}></div>
      <div className="hero-grid-bg" style={{ opacity: 0.4 }}></div>

      {/* ─── Header — same as LandingPage ─── */}
      <header className={`landing-header ${scrolled ? 'header-scrolled' : ''}`}>
        <div className="container header-container">
          <div className="logo-section">
            <img
              src={currentLogo}
              alt={softwareName}
              className="brand-logo-img"
              onError={() => setLogoError(true)}
            />
          </div>

          <nav className="desktop-nav">
            <Link to="/dashboard">لوحة التحكم</Link>
            <Link to="/blog">المدونة</Link>
          </nav>

          <div className="header-cta-group">
            <Link to="/dashboard" className="btn-nav-login">
              <Icons.Lock style={{ width: '16px', height: '16px' }} />
              <span>لوحة التحكم</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main style={{ paddingTop: '140px', paddingBottom: '100px', position: 'relative', zIndex: 2 }}>
        <div className="container" style={{ maxWidth: '600px' }}>

          <div className="feature-card welcome-card" style={{
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(20px)',
            webkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            borderRadius: 'var(--border-radius-md)',
            padding: '48px 40px',
            boxShadow: '0 30px 60px rgba(0,0,0,0.03), inset 0 1px 1px rgba(255, 255, 255, 0.7)',
            textAlign: 'center',
            transition: 'box-shadow 0.3s ease',
          }}>
            
            {/* Success Ring Badge */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 30px auto',
              boxShadow: '0 12px 30px rgba(16, 185, 129, 0.3)',
            }}>
              <Icons.Check style={{ width: '36px', height: '36px' }} />
            </div>

            <h1 className="gradient-text" style={{
              fontSize: '2.5rem',
              fontWeight: '900',
              color: 'var(--secondary-color)',
              lineHeight: 1.25,
              marginBottom: '16px',
            }}>
              شكراً لك!
            </h1>
            
            <h2 style={{
              fontSize: '1.4rem',
              fontWeight: '800',
              color: 'var(--secondary-color)',
              marginBottom: '16px',
            }}>
              سيتم مراجعة طلبك وتفعيل الاشتراك
            </h2>

            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '36px' }}>
              تم إرسال إثبات الدفع والتحويل بنجاح. سنقوم بمراجعة الطلب من قبل الإدارة والموافقة عليه في أسرع وقت لتستمر في استخدام نظامك بكامل صلاحياته.
            </p>

            <button
              className="btn-success pulse-btn"
              style={{
                width: '100%',
                fontSize: '1.15rem',
                padding: '16px 32px',
                borderRadius: 'var(--border-radius-sm)',
                boxShadow: '0 8px 25px rgba(54, 126, 244, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'none'
              }}
              onClick={() => navigate('/dashboard')}
            >
              الذهاب إلى لوحة التحكم للتحقق
            </button>
          </div>

        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer style={{
        borderTop: '1px solid rgba(0, 0, 0, 0.05)',
        padding: '30px 0',
        textAlign: 'center',
        background: 'transparent',
        position: 'relative',
        zIndex: 2
      }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>
          جميع الحقوق محفوظة لدى {softwareName} © {new Date().getFullYear()}
        </p>
      </footer>

      {/* Custom interactive cursor support */}
      <div className="cursor-dot"></div>
      <div className="cursor-ring"></div>
    </div>
  );
};

export default SubscriptionSuccess;
