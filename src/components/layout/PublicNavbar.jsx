import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Api from '../../services/api';
import logoLandingLight from '../../assets/img/logo-landing-light.png';
import logoLandingDark from '../../assets/img/logo-landing-dark.png';
import { useTheme } from '../common/ThemeContext';
import './PublicNavbar.css';

const Icons = {
  Menu: (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  Close: (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Lock: (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
};

const PublicNavbar = () => {
  const { theme } = useTheme();
  const location = useLocation();
  const [config, setConfig] = useState(null);
  const [logoError, setLogoError] = useState(false);
  const [softwareName, setSoftwareName] = useState('سجل');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const isHome = location.pathname === '/';

  useEffect(() => {
    const user = Api._getUser();
    const token = Api._getToken();
    if (user && token) setIsLoggedIn(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    Api.getGlobalConfig()
      .then((cfg) => {
        if (cfg) {
          setConfig(cfg);
          if (cfg.softwareName) setSoftwareName(cfg.softwareName);
        }
      })
      .catch(console.error);
  }, []);

  const currentLogo = React.useMemo(() => {
    const localDefault = theme === 'dark' ? logoLandingDark : logoLandingLight;
    if (logoError || !config) return localDefault;
    const logoToUse = theme === 'dark'
      ? (config.logoLandingDarkUrl || config.logoUrl)
      : (config.logoLandingLightUrl || config.logoUrl);
    return logoToUse ? Api.getImageUrl(logoToUse) : localDefault;
  }, [config, theme, logoError]);

  return (
    <header className={`landing-header ${scrolled ? 'header-scrolled' : ''}`}>
      <div className="container header-container">
        <Link to="/" className="logo-section">
          <img src={currentLogo} alt={softwareName} className="brand-logo-img" onError={() => setLogoError(true)} />
          <span className="brand-logo-text">{softwareName}</span>
        </Link>

        {mobileMenuOpen && <div className="mobile-menu-backdrop" onClick={() => setMobileMenuOpen(false)} />}

        <nav className={`desktop-nav ${mobileMenuOpen ? 'mobile-nav-active' : ''}`}>
          <div className="mobile-menu-header">
            <Link to="/" className="logo-section">
              <img src={currentLogo} alt={softwareName} className="brand-logo-img" onError={() => setLogoError(true)} />
              <span className="brand-logo-text">{softwareName}</span>
            </Link>
            <button className="close-mobile-menu" onClick={() => setMobileMenuOpen(false)}>
              <Icons.Close />
            </button>
          </div>

          <a href={isHome ? "#features" : "/#features"} onClick={() => setMobileMenuOpen(false)}>البرامج والحلول</a>
          <a href={isHome ? "#demo" : "/#demo"} onClick={() => setMobileMenuOpen(false)}>مجالات العمل</a>
          <a href={isHome ? "#pricing" : "/#pricing"} onClick={() => setMobileMenuOpen(false)}>الأسعار</a>
          <a href={isHome ? "#faq" : "/#faq"} onClick={() => setMobileMenuOpen(false)}>الأسئلة الشائعة</a>
          <Link to="/blog" onClick={() => setMobileMenuOpen(false)}>المدونة</Link>
          
          <div className="mobile-cta-group">
            <Link to={isLoggedIn ? "/dashboard" : "/login"} className="btn-nav-login">
              <Icons.Lock style={{ width: '16px', height: '16px' }} />
              <span>تسجيل الدخول</span>
            </Link>
            <Link to="/register" className="btn-nav-register">ابدأ الاستخدام مجاناً</Link>
          </div>
        </nav>

        <div className="header-cta-group">
          <Link to={isLoggedIn ? "/dashboard" : "/login"} className="btn-nav-login">
            <Icons.Lock style={{ width: '16px', height: '16px' }} />
            <span>تسجيل الدخول</span>
          </Link>
          <div className="btn-register-container">
            <Link to="/register" className="btn-nav-register">ابدأ الاستخدام مجاناً</Link>
          </div>
        </div>

        <button className="mobile-menu-trigger" onClick={() => setMobileMenuOpen(true)}>
          <Icons.Menu />
        </button>
      </div>
    </header>
  );
};

export default PublicNavbar;
