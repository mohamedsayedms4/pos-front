import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
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
  Arrow: (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  Check: (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
};

const WelcomePage = () => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { theme } = useTheme();

  const [config,       setConfig]       = useState(null);
  const [logoError,    setLogoError]    = useState(false);
  const [softwareName, setSoftwareName] = useState('سجل');
  const [scrolled,     setScrolled]     = useState(false);
  const [copied,       setCopied]       = useState(false);

  const [businessName, setBusinessName] = useState(
    location.state?.businessName || 
    localStorage.getItem('welcome_business_name') || 
    'مؤسستك'
  );
  const [adminEmail, setAdminEmail] = useState(
    location.state?.adminEmail || 
    localStorage.getItem('welcome_admin_email') || 
    ''
  );
  const [slug, setSlug] = useState(
    location.state?.slug || 
    localStorage.getItem('welcome_slug') || 
    ''
  );

  const currentHost     = window.location.host;
  const isLocalhost     = currentHost.includes('localhost');
  const protocol        = window.location.protocol;
  const tenantLoginUrl  = slug
    ? (isLocalhost
        ? `${protocol}//${slug}.localhost:${currentHost.split(':')[1] || '5173'}/login`
        : `${protocol}//${slug}.${currentHost.replace(/^www\./, '')}/login`)
    : `${protocol}//${currentHost}/login`;

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

    // If state is empty, load fallback values dynamically
    const user = Api._getUser();
    if (!adminEmail && user && user.email) {
      setAdminEmail(user.email);
    }

    if (businessName === 'مؤسستك' || !slug) {
      Api.getCurrentTenantDetails()
        .then((tenant) => {
          if (tenant) {
            if (tenant.name) {
              setBusinessName(tenant.name);
              localStorage.setItem('welcome_business_name', tenant.name);
            }
            if (tenant.slug) {
              setSlug(tenant.slug);
              localStorage.setItem('welcome_slug', tenant.slug);
            }
          }
        })
        .catch((err) => {
          console.error("Error loading fallback tenant details:", err);
        });
    }

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setLogoError(false); }, [config, theme]);

  // Handle cursor and card tilt interactions
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
    const hoverElements = document.querySelectorAll('a, button, .welcome-card, .copy-box-wrapper');
    const addHover = () => cursorRing && cursorRing.classList.add('hovering');
    const rmHover = () => cursorRing && cursorRing.classList.remove('hovering');
    
    hoverElements.forEach(el => {
      el.addEventListener('mouseenter', addHover);
      el.addEventListener('mouseleave', rmHover);
    });

    // 3D Card tilt effect
    const card = document.querySelector('.welcome-card');
    let handleCardMove;
    let handleCardLeave;
    if (card) {
      handleCardMove = (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -6; // Smooth 3D tilt
        const rotateY = ((x - centerX) / centerX) * 6;
        
        card.style.transform = `perspective(1500px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        card.style.transition = "none";
      };
      handleCardLeave = () => {
        card.style.transform = `perspective(1500px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        card.style.transition = "transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)";
      };
      card.addEventListener('mousemove', handleCardMove);
      card.addEventListener('mouseleave', handleCardLeave);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animFrame);
      hoverElements.forEach(el => {
        el.removeEventListener('mouseenter', addHover);
        el.removeEventListener('mouseleave', rmHover);
      });
      if (card) {
        card.removeEventListener('mousemove', handleCardMove);
        card.removeEventListener('mouseleave', handleCardLeave);
      }
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(tenantLoginUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

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
        <div className="container" style={{ maxWidth: '680px' }}>

          {/* Welcome Header */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div className="hero-badge glossy" style={{ marginBottom: '24px', padding: '10px 22px', fontSize: '0.9rem' }}>
              تم تفعيل اشتراكك وإعداد نظامك بنجاح!
            </div>
            
            <h1 className="gradient-text" style={{
              fontSize: '3.2rem',
              fontWeight: '900',
              color: 'var(--secondary-color)',
              lineHeight: 1.15,
              marginBottom: '16px',
            }}>
              مرحباً بك في عائلة Seggel
            </h1>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '540px', margin: '0 auto', lineHeight: '1.6' }}>
              لقد جهّزنا لك منصتك المحاسبية والإدارية بالكامل. ألقِ نظرة على بيانات حسابك والخطوة التالية للبدء.
            </p>
          </div>

          {/* Account Info Card (3D Tilt feature-card style) */}
          <div className="feature-card welcome-card" style={{
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(20px)',
            webkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            borderRadius: 'var(--border-radius-md)',
            padding: '36px',
            marginBottom: '32px',
            boxShadow: '0 30px 60px rgba(0,0,0,0.03), inset 0 1px 1px rgba(255, 255, 255, 0.7)',
            textAlign: 'right',
            transition: 'box-shadow 0.3s ease',
          }}>
            <h3 style={{
              fontWeight: '800',
              fontSize: '1.2rem',
              color: 'var(--secondary-color)',
              marginBottom: '24px',
              borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
              paddingBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>تفاصيل الحساب الأساسية</span>
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: '500' }}>اسم المنشأة التجاري</span>
                <span style={{ color: 'var(--primary-color)', fontWeight: '800', fontSize: '1.2rem' }}>{businessName}</span>
              </div>
              
              <div style={{ height: '1px', background: 'rgba(0,0,0,0.05)' }}></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: '500' }}>البريد الإلكتروني للإدارة</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', fontSize: '1.05rem', fontFamily: 'monospace' }}>{adminEmail}</span>
              </div>

              {slug && (
                <>
                  <div style={{ height: '1px', background: 'rgba(0,0,0,0.05)' }}></div>
                  <div style={{ marginTop: '6px' }}>
                    <p style={{ color: 'var(--text-dark)', fontSize: '1rem', fontWeight: '700', marginBottom: '12px' }}>
                      رابط الدخول الخاص بموظفي منشأتك:
                    </p>
                    
                    <div className="copy-box-wrapper" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: 'rgba(0, 0, 0, 0.02)',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      borderRadius: 'var(--border-radius-sm)',
                      padding: '12px 16px',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)',
                      transition: 'border-color 0.3s ease'
                    }}>
                      <span style={{
                        flex: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.95rem',
                        color: 'var(--text-dark)',
                        wordBreak: 'break-all',
                        direction: 'ltr',
                        textAlign: 'left',
                        fontWeight: '600'
                      }}>
                        {tenantLoginUrl}
                      </span>
                      <button
                        onClick={handleCopy}
                        style={{
                          background: copied ? '#10b981' : 'var(--primary-color)',
                          color: '#fff',
                          border: 'none',
                          padding: '10px 20px',
                          borderRadius: '8px',
                          fontSize: '0.95rem',
                          fontWeight: '700',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: copied ? '0 4px 12px rgba(16, 185, 129, 0.2)' : '0 4px 12px rgba(54, 126, 244, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'none'
                        }}
                      >
                        {copied ? (
                          <>
                            <Icons.Check style={{ width: '16px', height: '16px' }} />
                            <span>تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <span>نسخ</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '10px', lineHeight: '1.5' }}>
                      <strong>تنبيه هام:</strong> هذا الرابط مخصص لك ولموظفيك للوصول المباشر إلى واجهة النظام ونقاط البيع. ننصحك بحفظه في مفضلة المتصفح لمراجعته سريعاً.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* CTA Button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <button
              className="btn-success pulse-btn"
              style={{
                width: '100%',
                fontSize: '1.25rem',
                padding: '18px 36px',
                borderRadius: 'var(--border-radius-sm)',
                boxShadow: '0 8px 25px rgba(54, 126, 244, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: 'none'
              }}
              onClick={() => navigate('/dashboard')}
            >
              <span>الانتقال إلى لوحة التحكم والسيستم</span>
            </button>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              تستطيع إضافة الفروع، المخازن، وتجهيز المنتجات وبدء البيع فوراً من الداخل.
            </p>
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
          جميع الحقوق محفوظة لدى {softwareName} <i className="fa-regular fa-copyright"></i> {new Date().getFullYear()}
        </p>
      </footer>

      {/* Custom interactive cursor support */}
      <div className="cursor-dot"></div>
      <div className="cursor-ring"></div>
    </div>
  );
};

export default WelcomePage;
