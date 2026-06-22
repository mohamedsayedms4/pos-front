import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import Api from '../services/api';
import logoLandingLight from '../assets/img/logo-landing-light.png';

const Icons = {
  Lock: (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
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
  Check: (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
};

const RegisterSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(7);
  const [copied, setCopied] = useState(false);
  const [logoUrl, setLogoUrl] = useState(logoLandingLight);
  const [softwareName, setSoftwareName] = useState('سجل');
  const [whatsappNumber, setWhatsappNumber] = useState('+201281018810');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Dynamic config loading (logo & name)
  useEffect(() => {
    Api.getGlobalConfig()
      .then((cfg) => {
        if (cfg) {
          if (cfg.logoUrl) setLogoUrl(Api.getImageUrl(cfg.logoUrl));
          if (cfg.softwareName) setSoftwareName(cfg.softwareName);
          if (cfg.supportPhone) setWhatsappNumber(cfg.supportPhone);
        }
      })
      .catch((err) => console.error('Error loading global config:', err));

    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Extract navigation state
  const businessName = location.state?.businessName || 'مؤسستك الجديدة';
  const slug = location.state?.slug || '';
  const adminEmail = location.state?.adminEmail || '';

  // Determine login URL
  const currentHost = window.location.host;
  const isLocalhost = currentHost.includes('localhost');
  const protocol = window.location.protocol;
  
  const tenantLoginUrl = slug 
    ? (isLocalhost 
        ? `${protocol}//${slug}.localhost:${currentHost.split(':')[1] || '5173'}/login`
        : `${protocol}//${slug}.${currentHost.replace(/^www\./, '')}/login`)
    : `${protocol}//${currentHost}/login`;

  const autoLoggedIn = location.state?.autoLoggedIn || false;

  useEffect(() => {
    if (countdown <= 0) {
      navigate(autoLoggedIn ? '/dashboard' : '/login');
      return;
    }
    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, navigate, autoLoggedIn]);

  const handleCopy = () => {
    navigator.clipboard.writeText(tenantLoginUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (countdown / 7) * circumference;

  return (
    <div className="landing-layout success-layout-wrapper">
      {/* Dynamic Brand Frosted Header */}
      <header className={`landing-header ${scrolled ? 'header-scrolled' : ''}`}>
        <div className="container header-container">
          <div className="logo-section">
            <img 
              src={logoUrl} 
              alt={softwareName} 
              className="brand-logo-img" 
              onError={() => {
                if (logoUrl !== logoLandingLight) {
                  setLogoUrl(logoLandingLight);
                }
              }}
            />
            <span className="brand-logo-text">{softwareName}</span>
          </div>

          <nav className={`desktop-nav ${mobileMenuOpen ? 'mobile-nav-active' : ''}`}>
            {mobileMenuOpen && (
              <button className="close-mobile-menu" onClick={() => setMobileMenuOpen(false)}>
                <Icons.Close />
              </button>
            )}
            <a href="/#features" onClick={() => setMobileMenuOpen(false)}>البرامج والحلول</a>
            <a href="/#demo" onClick={() => setMobileMenuOpen(false)}>مجالات العمل</a>
            <a href="/#pricing" onClick={() => setMobileMenuOpen(false)}>الأسعار</a>
            <a href="/#faq" onClick={() => setMobileMenuOpen(false)}>الأسئلة الشائعة</a>
          </nav>

          <div className="header-cta-group">
            <Link to="/login" className="btn-nav-login">
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

      {/* Main Success Container */}
      <main className="success-main-content">
        <div className="container content-inner-flex">
          <div className="success-premium-card">
            
            {/* Visual Header */}
            <div className="success-badge-badge">
              <div className="badge-ring-glow"></div>
              <div className="badge-core">
                <Icons.Check style={{ width: '32px', height: '32px' }} />
              </div>
            </div>

            <h1 className="success-heading">تهانينا! تم إنشاء حسابك بنجاح</h1>
            <p className="success-lead">لقد أعددنا لك نظام سجل وأصبح جاهزاً للعمل الآن لمساعدة عملك على التوسع 🚀</p>

            {/* Details Panel */}
            <div className="details-panel-box">
              <div className="panel-row">
                <span className="row-title">المؤسسة المسجلة:</span>
                <span className="row-content highlight-company">{businessName}</span>
              </div>
              
              <div className="panel-row">
                <span className="row-title">البريد الإلكتروني للإدارة:</span>
                <span className="row-content">{adminEmail || 'غير متوفر'}</span>
              </div>

              {slug && (
                <div className="panel-row full-width-row">
                  <span className="row-title">رابط الدخول المباشر المخصص لك وللموظفين:</span>
                  <div className="copy-link-wrapper">
                    <span className="link-text-val" dir="ltr">{tenantLoginUrl}</span>
                    <button className={`copy-action-btn ${copied ? 'copied-done' : ''}`} onClick={handleCopy}>
                      {copied ? '✓ تم النسخ!' : 'نسخ الرابط'}
                    </button>
                  </div>
                  <p className="hint-label-text">💡 يرجى حفظ هذا الرابط وتقديمه لفريق العمل الخاص بك للوصول المباشر لنظام الكاشير والمحاسبة.</p>
                </div>
              )}
            </div>

            {/* Redirect block matching style */}
            <div className="onboarding-countdown-block" style={autoLoggedIn ? { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' } : {}}>
              <div className="onboarding-countdown-visual">
                <svg width="70" height="70" className="countdown-ring-svg">
                  <circle className="circle-bg-track" cx="35" cy="35" r={radius} strokeWidth="3" style={autoLoggedIn ? { stroke: '#f0fdf4' } : {}} />
                  <circle className="circle-bar-progress" cx="35" cy="35" r={radius} strokeWidth="4"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    transform="rotate(-90 35 35)"
                    style={autoLoggedIn ? { stroke: '#16a34a' } : {}}
                  />
                </svg>
                <div className="countdown-number-centered" style={autoLoggedIn ? { color: '#15803d' } : {}}>{countdown}</div>
              </div>
              <div className="onboarding-countdown-info">
                <h3 style={autoLoggedIn ? { color: '#16a34a' } : {}}>
                  {autoLoggedIn ? 'تم تسجيل دخولك بنجاح! جاري تحويلك للوحة التحكم...' : 'جاري تحويلك تلقائياً لصفحة تسجيل الدخول...'}
                </h3>
                <p style={autoLoggedIn ? { color: '#15803d' } : {}}>
                  {autoLoggedIn ? 'تهانينا، تم تفعيل الجلسة تلقائياً وسنأخذك فوراً إلى الواجهة الرئيسية.' : 'قم بكتابة بريدك الإلكتروني والرقم السري للدخول إلى لوحة التحكم.'}
                </p>
              </div>
            </div>

            {/* Action Group */}
            <div className="action-button-group">
              <button className="primary-onboarding-btn" style={autoLoggedIn ? { backgroundColor: '#28a745', boxShadow: '0 4px 15px rgba(40, 167, 69, 0.2)' } : {}} onClick={() => navigate(autoLoggedIn ? '/dashboard' : '/login')}>
                <span>{autoLoggedIn ? 'الانتقال إلى لوحة التحكم فوراً' : 'تسجيل الدخول فوراً'}</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" transform="rotate(180)">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>

          </div>
        </div>
      </main>

      {/* Dynamic Brand Website Footer */}
      <footer className="landing-footer">
        <div className="container footer-grid">
          <div className="footer-brand-info">
            <div className="footer-brand-title">
              <img 
                src={logoUrl} 
                alt={softwareName} 
                onError={() => {
                  if (logoUrl !== logoLandingLight) {
                    setLogoUrl(logoLandingLight);
                  }
                }}
              />
              <span>{softwareName}</span>
            </div>
            <p>النظام السحابي المتكامل المعتمد لإدارة المبيعات، الفواتير الإلكترونية، المخازن، الحسابات العامة، شؤون الموظفين، والمتجر الإلكتروني في شاشة موحدة.</p>
          </div>

          <div className="footer-links-col">
            <h4>روابط سريعة</h4>
            <a href="/#features">البرامج والحلول</a>
            <a href="/#pricing">باقات الاشتراك</a>
            <a href="/#faq">الأسئلة الشائعة</a>
          </div>

          <div className="footer-links-col">
            <h4>الصفحات القانونية</h4>
            <Link to="/terms">شروط الاستخدام</Link>
            <Link to="/privacy">سياسة الخصوصية</Link>
          </div>

          <div className="footer-links-col">
            <h4>تواصل معنا</h4>
            <p>
              واتساب:{' '}
              <a href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', direction: 'ltr', display: 'inline-block' }}>
                {whatsappNumber}
              </a>
            </p>
          </div>
        </div>
        <div className="footer-copyright-bar">
          <p>جميع الحقوق محفوظة لدى Remotly © {new Date().getFullYear()}</p>
        </div>
      </footer>

      {/* Custom Styles matching LandingPage & site design precisely */}
      <style>{`
        .success-layout-wrapper {
          background-color: #f8fafc;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          font-family: 'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          direction: rtl;
          text-align: right;
          line-height: 1.6;
        }

        .success-main-content {
          flex: 1;
          padding: 130px 0 80px 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .content-inner-flex {
          display: flex;
          justify-content: center;
          width: 100%;
        }

        /* Success Premium Onboarding Card */
        .success-premium-card {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02);
          width: 100%;
          max-width: 680px;
          padding: 50px 45px;
          text-align: center;
          position: relative;
        }

        /* Top Check Badge Style */
        .success-badge-badge {
          position: relative;
          width: 80px;
          height: 80px;
          margin: 0 auto 30px auto;
        }

        .badge-ring-glow {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: rgba(40, 167, 69, 0.15);
          animation: pulseGreenGlow 2s infinite ease-in-out;
        }

        .badge-core {
          position: relative;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          box-shadow: 0 8px 20px rgba(40, 167, 69, 0.3);
        }

        @keyframes pulseGreenGlow {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.18); opacity: 0.9; }
        }

        .success-heading {
          font-size: 2.1rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 12px;
          letter-spacing: -0.5px;
        }

        .success-lead {
          font-size: 1.05rem;
          color: #475569;
          margin-bottom: 40px;
          line-height: 1.7;
          font-weight: 500;
        }

        /* Onboarding Details Panel Box */
        .details-panel-box {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 35px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          text-align: right;
        }

        .panel-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .panel-row.full-width-row {
          grid-column: span 2;
          border-top: 1px dashed #cbd5e1;
          padding-top: 18px;
          margin-top: 5px;
        }

        .row-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: #64748b;
        }

        .row-content {
          font-size: 1.1rem;
          font-weight: 700;
          color: #0f172a;
        }

        .row-content.highlight-company {
          color: #2563eb;
        }

        /* Link Box Copier */
        .copy-link-wrapper {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 8px 12px;
          margin-top: 5px;
          gap: 15px;
        }

        .link-text-val {
          font-family: 'Consolas', monospace;
          color: #1e293b;
          font-size: 0.92rem;
          word-break: break-all;
          user-select: all;
          text-align: left;
          flex: 1;
          font-weight: 600;
        }

        .copy-action-btn {
          background-color: #2563eb;
          color: #ffffff;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: background-color 0.2s ease, transform 0.15s ease;
          white-space: nowrap;
        }

        .copy-action-btn:hover {
          background-color: #1d4ed8;
          transform: scale(1.02);
        }

        .copy-action-btn.copied-done {
          background-color: #28a745;
        }

        .hint-label-text {
          font-size: 0.78rem;
          color: #64748b;
          margin-top: 6px;
          margin-bottom: 0;
          line-height: 1.5;
          font-weight: 500;
        }

        /* Countdown circular visual */
        .onboarding-countdown-block {
          background-color: #fffbeb;
          border: 1px solid #fef3c7;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 20px;
          text-align: right;
          margin-bottom: 40px;
        }

        .onboarding-countdown-visual {
          position: relative;
          width: 70px;
          height: 70px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .countdown-ring-svg {
          width: 70px;
          height: 70px;
        }

        .circle-bg-track {
          fill: none;
          stroke: #fef3c7;
        }

        .circle-bar-progress {
          fill: none;
          stroke: #d97706;
          stroke-linecap: round;
          transition: stroke-dashoffset 1s linear;
        }

        .countdown-number-centered {
          position: absolute;
          font-size: 1.4rem;
          font-weight: 800;
          color: #b45309;
          font-family: monospace;
        }

        .onboarding-countdown-info h3 {
          font-size: 1rem;
          font-weight: 800;
          color: #92400e;
          margin: 0 0 4px 0;
        }

        .onboarding-countdown-info p {
          font-size: 0.85rem;
          color: #b45309;
          margin: 0;
          line-height: 1.5;
          font-weight: 500;
        }

        /* Onboarding button actions */
        .action-button-group {
          display: flex;
          justify-content: center;
        }

        .primary-onboarding-btn {
          background-color: #2563eb;
          color: #ffffff;
          border: none;
          width: 100%;
          padding: 16px;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          box-shadow: 0 4px 15px rgba(37, 99, 235, 0.2);
          transition: all 0.2s ease;
        }

        .primary-onboarding-btn:hover {
          background-color: #1d4ed8;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.3);
        }

        /* ─── Shared Base layout styles copy from LandingPage ─── */
        .container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .landing-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 85px;
          background-color: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-bottom: 1px solid #f1f5f9;
          z-index: 999;
          display: flex;
          align-items: center;
          transition: all 0.3s ease;
        }

        .landing-header.header-scrolled {
          height: 75px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
          border-bottom-color: #e2e8f0;
        }

        .header-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }

        .brand-logo-img {
          height: 44px;
          width: 44px;
          object-fit: contain;
        }

        .brand-logo-text {
          font-size: 1.4rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.5px;
        }

        .desktop-nav {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .desktop-nav a {
          color: #475569;
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .desktop-nav a:hover {
          color: #2563eb;
        }

        .header-cta-group {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .btn-nav-login {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #0f172a;
          font-weight: 700;
          font-size: 0.95rem;
          text-decoration: none;
          padding: 8px 16px;
          border-radius: 8px;
          transition: background-color 0.2s ease;
        }

        .btn-nav-login:hover {
          background-color: #f1f5f9;
        }

        .btn-register-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .btn-nav-register {
          background-color: #2563eb;
          color: #ffffff;
          padding: 10px 24px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.95rem;
          text-decoration: none;
          text-align: center;
          transition: background-color 0.2s ease, transform 0.2s ease;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
        }

        .btn-nav-register:hover {
          background-color: #1d4ed8;
          transform: translateY(-1px);
        }

        .mobile-menu-trigger {
          display: none;
          background: none;
          border: none;
          color: #0f172a;
          cursor: pointer;
          padding: 6px;
        }

        .mobile-menu-trigger svg {
          width: 28px;
          height: 28px;
        }

        .close-mobile-menu {
          background: none;
          border: none;
          color: #475569;
          cursor: pointer;
          position: absolute;
          top: 24px;
          left: 24px;
        }
        .close-mobile-menu svg {
          width: 28px;
          height: 28px;
        }

        /* Footer Section */
        .landing-footer {
          background-color: #ffffff;
          border-top: 1px solid #e2e8f0;
          padding: 70px 0 0 0;
          text-align: right;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 1.4fr 0.8fr 0.8fr 1fr;
          gap: 40px;
          padding-bottom: 50px;
        }

        .footer-brand-info {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .footer-brand-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .footer-brand-title img {
          height: 40px;
          object-fit: contain;
        }

        .footer-brand-title span {
          font-size: 1.3rem;
          font-weight: 850;
          color: #0f172a;
        }

        .footer-brand-info p {
          font-size: 0.9rem;
          color: #475569;
          line-height: 1.6;
        }

        .footer-links-col {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .footer-links-col h4 {
          font-size: 1rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 4px;
        }

        .footer-links-col a {
          color: #475569;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 600;
          transition: color 0.2s ease;
        }

        .footer-links-col a:hover {
          color: #2563eb;
        }

        .footer-links-col p {
          font-size: 0.9rem;
          color: #475569;
          margin: 0;
        }

        .footer-copyright-bar {
          border-top: 1px solid #f1f5f9;
          padding: 24px 0;
          text-align: center;
        }

        .footer-copyright-bar p {
          font-size: 0.85rem;
          color: #64748b;
          font-weight: 700;
          margin: 0;
        }

        /* Responsive Styles */
        @media (max-width: 1024px) {
          .footer-grid {
            grid-template-columns: 1.5fr 1fr;
          }
        }

        @media (max-width: 768px) {
          .success-premium-card {
            padding: 35px 20px;
          }
          .success-heading {
            font-size: 1.7rem;
          }
          .details-panel-box {
            grid-template-columns: 1fr;
          }
          .panel-row.full-width-row {
            grid-column: span 1;
          }
          .copy-link-wrapper {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }
          .copy-action-btn {
            width: 100%;
          }
          .onboarding-countdown-block {
            flex-direction: column;
            text-align: center;
          }
          
          .landing-layout {
            padding-top: 75px;
          }
          .landing-header {
            height: 75px;
          }
          .brand-logo-text {
            font-size: 1.25rem;
          }
          .desktop-nav {
            display: none;
          }
          .header-cta-group {
            display: none;
          }
          .mobile-menu-trigger {
            display: block;
          }

          /* Mobile Nav Panel drawer */
          .desktop-nav.mobile-nav-active {
            display: flex;
            flex-direction: column;
            position: fixed;
            top: 0;
            right: 0;
            left: 0;
            bottom: 0;
            background-color: #ffffff;
            padding: 100px 30px;
            z-index: 9999;
            gap: 25px;
            text-align: center;
          }
          .desktop-nav.mobile-nav-active a {
            font-size: 1.3rem;
          }
        }
      `}</style>
    </div>
  );
};

export default RegisterSuccess;
