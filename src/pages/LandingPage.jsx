import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Api from '../services/api';
import logoLandingLight from '../assets/img/logo-landing-light.png';
import logoLandingDark from '../assets/img/logo-landing-dark.png';
import { useTheme } from '../components/common/ThemeContext';
import systemImg from '../assets/img/landing-page/system.png';
import { initPixel, trackPageView, trackLead as fbTrackLead } from '../services/fbPixel';

// SVG Icons for elegant UI look to avoid external library loading issues
const Icons = {
  Speed: (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  Store: (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Chart: (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  Shield: (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Branch: (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v0a3 3 0 0 1 3-3z" />
      <path d="M18 15h0a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v0a3 3 0 0 1 3-3z" />
      <line x1="9" y1="9" x2="9" y2="15" />
    </svg>
  ),
  Users: (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  ArrowRight: (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  Check: (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
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
  Lock: (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Globe: (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  BookOpen: (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  Package: (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 9.4 7.55 4.24a1.79 1.79 0 0 0-1.8 0L2.3 6a1.8 1.8 0 0 0-1 1.6v6.22a1.8 1.8 0 0 0 1 1.6L5.75 17a1.79 1.79 0 0 0 1.8 0L11 14.84a1.8 1.8 0 0 0 1-1.6V7a1.8 1.8 0 0 0-1-1.6L7.5 3" />
      <path d="M12 22V12" />
      <path d="m12 12 8.71-5.04M12 12 3.29 6.96" />
    </svg>
  ),
  Briefcase: (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  Settings: (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  LeftArrow: (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="20" y1="12" x2="4" y2="12" />
      <polyline points="10 18 4 12 10 6" />
    </svg>
  ),
};

const LandingPage = () => {
  const { theme } = useTheme();
  const [config, setConfig] = useState(null);
  const [logoError, setLogoError] = useState(false);
  const [softwareName, setSoftwareName] = useState('سجل');
  const [isYearly, setIsYearly] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pos');
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const user = Api._getUser();
    const token = Api._getToken();
    if (user && token) {
      setIsLoggedIn(true);
    }
  }, []);

  // Monitor scroll for header background
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch Global Configuration (Dynamic logo & app name)
  useEffect(() => {
    Api.getGlobalConfig()
      .then((cfg) => {
        if (cfg) {
          setConfig(cfg);
          const faviconToUse = cfg.logoFaviconUrl || cfg.logoUrl;
          if (faviconToUse) {
            const link = document.querySelector("link[rel~='icon']");
            if (link) link.href = Api.getImageUrl(faviconToUse);
          }
          if (cfg.softwareName) setSoftwareName(cfg.softwareName);

          // ── Facebook Pixel: تهيئة البيكسل من الإعدادات العامة ─────────────
          if (cfg.facebookPixelId) {
            initPixel(cfg.facebookPixelId);
            trackPageView();
          }
        }
      })
      .catch((err) => console.error('Error loading global config:', err));
  }, []);

  // Reset logo error flag when config or theme updates
  useEffect(() => {
    setLogoError(false);
  }, [config, theme]);

  const currentLogo = React.useMemo(() => {
    const localDefault = theme === 'dark' ? logoLandingDark : logoLandingLight;
    if (logoError || !config) return localDefault;
    const logoToUse = theme === 'dark'
      ? (config.logoLandingDarkUrl || config.logoUrl)
      : (config.logoLandingLightUrl || config.logoUrl);
    return logoToUse ? Api.getImageUrl(logoToUse) : localDefault;
  }, [config, theme, logoError]);

  // Initialize scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.animate-on-scroll').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqData = [
    {
      q: "هل يتطلب سجل شراء أجهزة كاشير مخصصة؟",
      a: "بالتأكيد لا! سجل هو نظام سحابي متطور يعمل مباشرة عبر متصفح الإنترنت من أي جهاز تملكه حالياً، سواء كان كمبيوتر، تابلت (iPad أو Android)، أو حتى هاتف محمول. نوفر لك مرونة تشغيل كاملة دون تكاليف إضافية."
    },
    {
      q: "هل النظام معتمد ويدعم الفاتورة الإلكترونية في بلدي؟",
      a: "نعم، يدعم سجل متطلبات الفاتورة الإلكترونية بشكل كامل ويتوافق تماماً مع التشريعات الضريبية المعتمدة وهيئات الزكاة والجمارك والضرائب في مختلف الدول العربية بشكل تلقائي وآمن."
    },
    {
      q: "ماذا لو انقطع الاتصال بالإنترنت مؤقتاً أثناء عمليات البيع؟",
      a: "لا داعي للقلق على الإطلاق! واجهة كاشير البيع الذكية تدعم ميزة العمل دون اتصال (Offline Mode) بالكامل. يمكنك مواصلة بيع منتجاتك وإصدار الفواتير، ويقوم النظام بمزامنة كافة العمليات تلقائياً فور عودة الاتصال."
    },
    {
      q: "هل يمكنني إدارة أكثر من فرع ومخزن ومتابعتها من مكان واحد؟",
      a: "بكل تأكيد. يمنحك سجل لوحة تحكم موحدة تتيح لك مراقبة مخزون كافة الفروع والتحويل بين المستودعات لحظة بلحظة، مع تخصيص صلاحيات محددة لكل موظف وعزل تقارير مبيعات كل فرع لضمان الدقة والسرية."
    }
  ];

  const features = {
    pos: {
      title: "أسرع كاشير سحابي لعمليات البيع اليومية",
      description: "واجهة بيع تفاعلية فائقة السرعة مصممة للعمل مع قارئ الباركود، الشاشات اللمسية، وتدعم خيارات الدفع المختلفة (نقدي، شبكة، مديونية، تقسيط). تم اختبارها لمعالجة آلاف الفواتير يومياً دون أي بطء.",
      benefits: ["دعم العمل دون اتصال بالإنترنت", "إصدار وتعديل فوري للفاتورة", "تعليق المبيعات واستكمالها لاحقاً", "إرسال الفواتير للعملاء عبر WhatsApp"]
    },
    inventory: {
      title: "إدارة مخازن متطورة مع تنبيهات النواقص",
      description: "راقب تحركات بضائعك وعمليات الجرد بدقة كاملة. يمنحك النظام تنبيهات ذكية وفورية للمنتجات التي شارفت على النفاد لتقوم بإنشاء طلبات شراء مؤتمتة للموردين قبل انقطاع البضاعة.",
      benefits: ["جرد المخزون بالباركود والهاتف", "إدارة تواريخ الصلاحية والتحذيرات", "سجل كامل وتفصيلي لتحركات الأصناف", "تحويلات بضائع فورية وآمنة بين الفروع"]
    },
    finance: {
      title: "نظام حسابات عامة وقيود يومية مؤتمتة",
      description: "كل مبيعة أو عملية شراء تنعكس تلقائياً في شجرتك المحاسبية! يدعم سجل القيود المحاسبية الآلية، إدارة الحسابات البنكية، الخزائن المالية، وتسجيل الديون والتحصيلات بشكل احترافي.",
      benefits: ["تقارير أرباح وخسائر وميزان مراجعة فوري", "تنظيم فواتير المشتريات ومستحقات الموردين", "مراقبة وإدارة مصروفات المؤسسة", "دعم كامل للضرائب والتقارير المعتمدة"]
    },
    store: {
      title: "متجر إلكتروني مدمج متزامن بالكامل",
      description: "أنشئ متجرك الإلكتروني الخاص فوراً واعرض منتجاتك لعملائك للطلب المباشر أونلاين. يتم مزامنة الطلبات، المخزون، والأسعار تلقائياً وبشكل كامل بين متجرك الإلكتروني ونقاط البيع الفعلية الخاصة بك.",
      benefits: ["رابط خاص وعلامة تجارية مستقلة لمتجرك", "استقبال طلبات العملاء وتوجيهها للمطبخ/المخزن", "عروض وخصومات حصرية لعملاء الأونلاين", "مزامنة كميات المخزون فورياً وتلقائياً"]
    }
  };

  return (
    <div className="landing-layout">
      {/* Pristine Light Header */}
      <header className={`landing-header ${scrolled ? 'header-scrolled' : ''}`}>
        <div className="container header-container">
          {/* Logo Brand area */}
          <div className="logo-section">
            <img 
              src={currentLogo} 
              alt={softwareName} 
              className="brand-logo-img" 
              onError={() => setLogoError(true)}
            />
            <span className="brand-logo-text">{softwareName}</span>
          </div>

          {mobileMenuOpen && (
            <div className="mobile-menu-backdrop" onClick={() => setMobileMenuOpen(false)} />
          )}

          {/* Navigation links */}
          <nav className={`desktop-nav ${mobileMenuOpen ? 'mobile-nav-active' : ''}`}>
            <div className="mobile-menu-header">
              <div className="logo-section">
                <img 
                  src={currentLogo} 
                  alt={softwareName} 
                  className="brand-logo-img" 
                  onError={() => setLogoError(true)}
                />
                <span className="brand-logo-text">{softwareName}</span>
              </div>
              <button className="close-mobile-menu" onClick={() => setMobileMenuOpen(false)}>
                <Icons.Close />
              </button>
            </div>

            <a href="#features" onClick={() => setMobileMenuOpen(false)}>البرامج والحلول</a>
            <a href="#demo" onClick={() => setMobileMenuOpen(false)}>مجالات العمل</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>الأسعار</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)}>الأسئلة الشائعة</a>
            <Link to="/blog" onClick={() => setMobileMenuOpen(false)}>المدونة</Link>
            
            <div className="mobile-cta-group">
              <Link to={isLoggedIn ? "/dashboard" : "/login"} className="btn-nav-login">
                <Icons.Lock style={{ width: '16px', height: '16px' }} />
                <span>تسجيل الدخول</span>
              </Link>
              <Link to="/register" className="btn-nav-register">ابدأ الاستخدام مجاناً</Link>
            </div>
          </nav>

          {/* Header Action Buttons */}
          <div className="header-cta-group">
            <Link to={isLoggedIn ? "/dashboard" : "/login"} className="btn-nav-login">
              <Icons.Lock style={{ width: '16px', height: '16px' }} />
              <span>تسجيل الدخول</span>
            </Link>
            <div className="btn-register-container">
              <Link to="/register" className="btn-nav-register" onClick={() => fbTrackLead()}>ابدأ الاستخدام مجاناً</Link>
            </div>
            
          </div>

          <button className="mobile-menu-trigger" onClick={() => setMobileMenuOpen(true)}>
            <Icons.Menu />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        {/* Stock Chart Background SVG */}
        <div className="hero-stock-bg">
          <svg preserveAspectRatio="none" viewBox="0 0 1000 400" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="greenLine" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="redLine" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.9" />
              </linearGradient>
              <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Grid Lines */}
            <g stroke="#334155" strokeWidth="1" strokeOpacity="0.6">
              <line x1="0" y1="50" x2="1000" y2="50" />
              <line x1="0" y1="100" x2="1000" y2="100" />
              <line x1="0" y1="150" x2="1000" y2="150" />
              <line x1="0" y1="200" x2="1000" y2="200" />
              <line x1="0" y1="250" x2="1000" y2="250" />
              <line x1="0" y1="300" x2="1000" y2="300" />
              <line x1="0" y1="350" x2="1000" y2="350" />
              
              <line x1="100" y1="0" x2="100" y2="400" />
              <line x1="200" y1="0" x2="200" y2="400" />
              <line x1="300" y1="0" x2="300" y2="400" />
              <line x1="400" y1="0" x2="400" y2="400" />
              <line x1="500" y1="0" x2="500" y2="400" />
              <line x1="600" y1="0" x2="600" y2="400" />
              <line x1="700" y1="0" x2="700" y2="400" />
              <line x1="800" y1="0" x2="800" y2="400" />
              <line x1="900" y1="0" x2="900" y2="400" />
            </g>

            {/* Values */}
            <g fill="#475569" fontSize="12" fontFamily="monospace" fontWeight="bold">
              <text x="940" y="45">71.542K</text>
              <text x="940" y="95">35.201K</text>
              <text x="940" y="145">28.405K</text>
              <text x="940" y="195">18.795K</text>
              <text x="940" y="245">14.302K</text>
              <text x="940" y="295">6.977K</text>
              <text x="940" y="345">2.047K</text>
            </g>

            {/* Red Line (Downwards trend) */}
            <g className="animated-stock-line-down">
              <path 
                d="M0,320 L100,290 L200,340 L300,280 L400,310 L500,250 L600,290 L700,240 L800,320 L900,370 L1000,390" 
                fill="none" 
                stroke="url(#redLine)" 
                strokeWidth="4" 
                filter="url(#glowRed)" 
              />
              <path 
                d="M0,320 L100,290 L200,340 L300,280 L400,310 L500,250 L600,290 L700,240 L800,320 L900,370 L1000,390" 
                fill="none" 
                stroke="#ef4444" 
                strokeWidth="2" 
              />
            </g>

            {/* Green Line (Upwards trend) */}
            <g className="animated-stock-line-up">
              <path 
                d="M0,280 L100,240 L200,270 L300,180 L400,160 L500,200 L600,120 L700,70 L800,100 L900,30 L1000,20" 
                fill="none" 
                stroke="url(#greenLine)" 
                strokeWidth="5" 
                filter="url(#glowGreen)" 
              />
              <path 
                d="M0,280 L100,240 L200,270 L300,180 L400,160 L500,200 L600,120 L700,70 L800,100 L900,30 L1000,20" 
                fill="none" 
                stroke="#4ade80" 
                strokeWidth="2" 
              />
            </g>
          </svg>
        </div>
        <div className="container hero-container">
          <h1 className="hero-title animate-on-scroll fade-up">نظام ERP متكامل لإدارة أعمالك</h1>
          
          <p className="hero-desc animate-on-scroll fade-up delay-100">
            {softwareName} هو شريكك الرقمي الأمثل لإدارة جميع جوانب أعمالك. برنامج سحابي آمن بهوية عربية أصيلة وواجهة عصرية تدعم العربية والإنجليزية، يضمن سلامة بياناتك ويرافقك أينما كنت. أصدر الفواتير الإلكترونية المعتمدة وأدر مبيعاتك، مخزونك، عملائك، موظفيك، حساباتك، ودورة عملك من مكان واحد، مع حلول إدارة شاملة وقابلة للتخصيص لأكثر من 50 نشاطاً تجارياً.
          </p>

          <div className="hero-cta-area animate-on-scroll fade-up delay-200">
            <Link to="/register" className="btn-hero-green" onClick={() => fbTrackLead()}>
              ابدأ الاستخدام مجاناً
            </Link>
            
            <div className="sub-features-row">
              <div className="sub-feature-item">
                <span className="sparkle-icon">✳</span>
                <span>تجربة مجانية</span>
              </div>

              <div className="sub-feature-item">
                <span className="sparkle-icon">✳</span>
                <span>جاهز للعمل فوراً</span>
              </div>
              <div className="sub-feature-item">
                <span className="sparkle-icon">✳</span>
                <span>شامل لجميع التطبيقات</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="hero-system-image-wrapper animate-on-scroll fade-up">
        <div className="system-mockup-frame">
          <div className="system-mockup-topbar">
            <span className="mockup-dot red"></span>
            <span className="mockup-dot yellow"></span>
            <span className="mockup-dot green"></span>
          </div>
          <div className="system-mockup-body">
            <img src={systemImg} alt="واجهة النظام" className="hero-system-image" />
          </div>
        </div>
      </div>

      {/* Modules Features Grid Section (Daftra Style) */}
      <section id="features" className="modules-grid-section">
        <div className="container">
          <div className="daftra-section-heading animate-on-scroll fade-up">
            <p className="daftra-section-tag">برامج وحلول</p>
            <h2>تحكم بالكامل في عملك،<br />مهما توسّعت، ومهما تغيّرت احتياجاتك.</h2>
          </div>
          <div className="daftra-modules-grid">
            {/* 1. المبيعات */}
            <div className="daftra-module-item animate-on-scroll fade-up">
              <div className="daftra-module-header">
                <h3 className="daftra-module-title">المبيعات</h3>
                <span className="daftra-module-icon purple-theme">
                  <Icons.Store />
                </span>
              </div>
              <p className="daftra-module-desc">
                الفاتورة الإلكترونية والضريبية، نقاط البيع، الفواتير وعروض الأسعار، الأقساط، العروض والمبيعات المستهدفة والعمولات.
              </p>
            </div>

            {/* 2. المحاسبة العامة */}
            <div className="daftra-module-item animate-on-scroll fade-up delay-100">
              <div className="daftra-module-header">
                <h3 className="daftra-module-title">المحاسبة العامة</h3>
                <span className="daftra-module-icon green-theme">
                  <Icons.BookOpen />
                </span>
              </div>
              <p className="daftra-module-desc">
                دليل الحسابات، دفتر الأستاذ، قيود اليومية، المصروفات، مراكز التكلفة، إدارة الأصول، دورة الشيكات، التقارير المالية.
              </p>
            </div>

            {/* 3. المخزون */}
            <div className="daftra-module-item animate-on-scroll fade-up delay-200">
              <div className="daftra-module-header">
                <h3 className="daftra-module-title">المخزون</h3>
                <span className="daftra-module-icon rose-theme">
                  <Icons.Package />
                </span>
              </div>
              <p className="daftra-module-desc">
                المنتجات والخدمات، تتبع المخزون، الجرد، المشتريات، المستودعات، الأذون المخزنية، الموردين، قوائم الأسعار، دورة المشتريات.
              </p>
            </div>

            {/* 4. الموارد البشرية */}
            <div className="daftra-module-item animate-on-scroll fade-up">
              <div className="daftra-module-header">
                <h3 className="daftra-module-title">الموارد البشرية</h3>
                <span className="daftra-module-icon amber-theme">
                  <Icons.Users />
                </span>
              </div>
              <p className="daftra-module-desc">
                شؤون الموظفين، الحضور والانصراف، المرتبات، العقود، الهيكل التنظيمي، الإجازات، الطلبات، السلف.
              </p>
            </div>

            {/* 5. علاقات العملاء */}
            <div className="daftra-module-item animate-on-scroll fade-up delay-100">
              <div className="daftra-module-header">
                <h3 className="daftra-module-title">علاقات العملاء</h3>
                <span className="daftra-module-icon cyan-theme">
                  <Icons.Briefcase />
                </span>
              </div>
              <p className="daftra-module-desc">
                متابعة العملاء، المواعيد، نقاط الولاء، العضويات والاشتراكات، النقاط والأرصدة، حضور العملاء، التأمينات.
              </p>
            </div>

            {/* 6. إدارة العمليات */}
            <div className="daftra-module-item animate-on-scroll fade-up delay-200">
              <div className="daftra-module-header">
                <h3 className="daftra-module-title">إدارة العمليات</h3>
                <span className="daftra-module-icon blue-theme">
                  <Icons.Settings />
                </span>
              </div>
              <p className="daftra-module-desc">
                أوامر الشغل وإدارة المشاريع، دورات العمل، تتبع الوقت، إدارة الوحدات والإيجارات، عقود الإيجار، الحجوزات، إدارة التصنيع.
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* Business Fields Banner Section */}
      <section className="fields-banner-section">
        <div className="container">
          <div className="fields-banner-card animate-on-scroll fade-up">
            <div className="fields-banner-bg-shape"></div>
            <div className="fields-banner-inner">
              <div className="fields-banner-top">
                <div className="fields-banner-text">
                  <h2 className="fields-banner-title">مخصص<br />لأكثر من 10 مجالاً</h2>
                  <p className="fields-banner-desc">اكتشف حلول سجل المصممة خصيصاً لنجاحك. ابدأ مع نظام يفهم طبيعة عملك.</p>
                </div>
                <a href="/register" className="fields-banner-btn">سجل الآن</a>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Interactive Tabs Showcase (Daftra Style Showcase) */}
      <section className="interactive-showcase-section">
        <div className="container">
          <div className="showcase-card animate-on-scroll fade-up">
            <div className="tabs-header">
              <button className={activeTab === 'pos' ? 'active-tab' : ''} onClick={() => setActiveTab('pos')}>
                كاشير المبيعات
              </button>
              <button className={activeTab === 'inventory' ? 'active-tab' : ''} onClick={() => setActiveTab('inventory')}>
                المخازن والفروع
              </button>
              <button className={activeTab === 'finance' ? 'active-tab' : ''} onClick={() => setActiveTab('finance')}>
                الحسابات والتقارير
              </button>
              <button className={activeTab === 'store' ? 'active-tab' : ''} onClick={() => setActiveTab('store')}>
                المتجر الإلكتروني
              </button>
            </div>

            <div className="showcase-content">
              <div className="showcase-text">
                <h3>{features[activeTab].title}</h3>
                <p>{features[activeTab].description}</p>
                <ul className="showcase-checklist">
                  {features[activeTab].benefits.map((b, i) => (
                    <li key={i}>
                      <span className="check-bullet"><Icons.Check /></span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/register" className="btn-showcase-cta">ابدأ الآن مجاناً</Link>
              </div>

              <div className="showcase-visual">
                <div className="mockup-window">
                  <div className="mockup-header">
                    <span className="mockup-dot red"></span>
                    <span className="mockup-dot yellow"></span>
                    <span className="mockup-dot green"></span>
                    <span className="mockup-url">http://localhost:5173/dashboard</span>
                  </div>
                  <div className="mockup-body">
                    {activeTab === 'pos' && (
                      <div className="pos-mockup-view">
                        <div className="pos-item-grid">
                          <div className="pos-item-tile">
                            <span className="emoji">☕</span>
                            <span className="title">قهوة إسبريسو ممتازة</span>
                            <span className="price">45.00 ج.م</span>
                          </div>
                          <div className="pos-item-tile">
                            <span className="emoji">🍰</span>
                            <span className="title">كعكة الشوكولاتة</span>
                            <span className="price">90.00 ج.م</span>
                          </div>
                        </div>
                        <div className="invoice-summary-box">
                          <div className="sum-row"><span>الإجمالي الفرعي:</span><span>135.00 ج.م</span></div>
                          <div className="sum-row"><span>الضريبة (14%):</span><span>18.90 ج.م</span></div>
                          <div className="sum-row grand-total"><span>الإجمالي الكلي:</span><span>153.90 ج.م</span></div>
                          <button className="btn-invoice-confirm">إصدار الفاتورة المعتمدة ✓</button>
                        </div>
                      </div>
                    )}
                    {activeTab === 'inventory' && (
                      <div className="inventory-mockup-view">
                        <div className="stock-indicator-item alert-danger">
                          <div className="indicator-desc">
                            <span>فرع المعادي - جهاز آيفون 15</span>
                            <span className="badge">1 حبات (مستوى متدني!)</span>
                          </div>
                          <div className="progress-bg"><div className="progress-fill" style={{ width: '12%' }}></div></div>
                        </div>
                        <div className="stock-indicator-item alert-success">
                          <div className="indicator-desc">
                            <span>مخزن التجمع - جهاز آيفون 15</span>
                            <span className="badge">85 حبة (مستقر)</span>
                          </div>
                          <div className="progress-bg"><div className="progress-fill" style={{ width: '85%' }}></div></div>
                        </div>
                        <button className="btn-transfer-mock">طلب تحويل مخزني سريع 🔄</button>
                      </div>
                    )}
                    {activeTab === 'finance' && (
                      <div className="finance-mockup-view">
                        <div className="finance-metric-card positive">
                          <span className="metric-title">صافي ربح الشهر الحالي</span>
                          <span className="metric-val">+154,820 ج.م</span>
                          <span className="metric-trend">📈 زيادة بمعدل 12% عن الشهر الماضي</span>
                        </div>
                        <div className="finance-metric-card negative">
                          <span className="metric-title">مديونيات الموردين المستحقة</span>
                          <span className="metric-val">-34,500 ج.م</span>
                          <span className="metric-trend">⚠️ فواتير مستحقة الدفع خلال 3 أيام</span>
                        </div>
                      </div>
                    )}
                    {activeTab === 'store' && (
                      <div className="store-mockup-view">
                        <div className="store-banner-demo">
                          <h4>خصم 20% على الطلبات من المتجر الإلكتروني 🎉</h4>
                          <p>اطلب منتجاتك الآن واستلم فوراً من أقرب فرع لك.</p>
                        </div>
                        <div className="store-status">
                          <span className="status-dot animate-pulse"></span>
                          <span>المتجر نشط ومتزامن بالكامل مع نقاط البيع والخزينة</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing-section">
        <div className="container">
          <div className="section-header-centered animate-on-scroll fade-up">
            <h2>خطط أسعار مرنة تتناسب مع حجم نشاطك</h2>
            <p>اختر الخطة المناسبة لأعمالك الآن. جميع الخطط تتضمن أماناً فائقاً ودعماً فنياً متكاملاً.</p>
            
            <div className="pricing-toggle-container">
              <span className={!isYearly ? 'active' : ''}>شهرياً</span>
              <button className={`pricing-toggle-switch ${isYearly ? 'active' : ''}`} onClick={() => setIsYearly(!isYearly)}>
                <span className="switch-dot"></span>
              </button>
              <span className={isYearly ? 'active' : ''}>سنوياً (وفر 20% 🎁)</span>
            </div>
          </div>

          <div className="pricing-grid">
            <div className="pricing-card animate-on-scroll fade-up">
              <h3>الباقة الفردية</h3>
              <p className="pricing-card-desc">مثالية للمتاجر الصغيرة والمستقلة لبدء تنظيم أعمالها السريعة.</p>
              <div className="price-box">
                <span className="price-num">{isYearly ? "199" : "249"}</span>
                <span className="price-curr">ج.م / شهرياً</span>
              </div>
              <ul className="pricing-features-list">
                <li><Icons.Check className="feat-check" /> <span>نقطة بيع واحدة (كاشير واحد)</span></li>
                <li><Icons.Check className="feat-check" /> <span>مخزن واحد متكامل</span></li>
                <li><Icons.Check className="feat-check" /> <span>دعم كامل للفواتير والباركود</span></li>
                <li><Icons.Check className="feat-check" /> <span>التقارير والمبيعات اليومية</span></li>
              </ul>
              <Link to="/register" className="btn-pricing-secondary">ابدأ مجاناً الآن</Link>
            </div>

            <div className="pricing-card active-card animate-on-scroll fade-up delay-100">
              <div className="popular-badge">الأكثر اختياراً</div>
              <h3>الباقة الاحترافية</h3>
              <p className="pricing-card-desc">الحل الأمثل للشركات المتوسعة وإدارة الفروع المتعددة والمخازن المشتركة.</p>
              <div className="price-box">
                <span className="price-num">{isYearly ? "399" : "499"}</span>
                <span className="price-curr">ج.م / شهرياً</span>
              </div>
              <ul className="pricing-features-list">
                <li><Icons.Check className="feat-check" /> <span>حتى 3 فروع / نقاط بيع متعددة</span></li>
                <li><Icons.Check className="feat-check" /> <span>مزامنة المخازن والتحويل الفوري</span></li>
                <li><Icons.Check className="feat-check" /> <span>التقارير المالية المتقدمة والمصروفات</span></li>
                <li><Icons.Check className="feat-check" /> <span>إدارة الموارد البشرية والرواتب والشفتات</span></li>
                <li><Icons.Check className="feat-check" /> <span>متجر إلكتروني متكامل مدمج ونشط</span></li>
              </ul>
              <Link to="/register" className="btn-pricing-primary">ابدأ تجربتك الاحترافية</Link>
            </div>

            <div className="pricing-card animate-on-scroll fade-up delay-200">
              <h3>باقة المؤسسات</h3>
              <p className="pricing-card-desc">للمؤسسات والشركات الكبرى التي تبحث عن أقصى عزل وتفصيل مخصص بالكامل.</p>
              <div className="price-box">
                <span className="price-num">{isYearly ? "799" : "999"}</span>
                <span className="price-curr">ج.م / شهرياً</span>
              </div>
              <ul className="pricing-features-list">
                <li><Icons.Check className="feat-check" /> <span>عدد فروع ونقاط بيع غير محدود</span></li>
                <li><Icons.Check className="feat-check" /> <span>قاعدة بيانات مخصصة فائقة السرعة</span></li>
                <li><Icons.Check className="feat-check" /> <span>واجهات ربط مخصصة (Custom API)</span></li>
                <li><Icons.Check className="feat-check" /> <span>مدير حساب مخصص ودعم فني طارئ 24/7</span></li>
              </ul>
              <Link to="/register" className="btn-pricing-secondary">تواصل معنا الآن</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq-section">
        <div className="container">
          <div className="section-header-centered animate-on-scroll fade-up">
            <h2>لديك أسئلة؟ نحن نوفر لك كل الإجابات</h2>
            <p>تصفح الأسئلة الشائعة حول نظام {softwareName} وكيف يمكن أن يساعدك في تنمية أعمالك.</p>
          </div>

          <div className="faq-grid animate-on-scroll fade-up">
            {faqData.map((faq, index) => (
              <div className={`faq-card-item ${openFaq === index ? 'faq-active' : ''}`} key={index}>
                <button className="faq-question-trigger" onClick={() => toggleFaq(index)}>
                  <span>{faq.q}</span>
                  <span className="faq-indicator-icon">{openFaq === index ? '−' : '+'}</span>
                </button>
                <div className="faq-answer-panel">
                  <p>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner (Clean & High Contrast) */}
      <section className="cta-bottom-banner">
        <div className="container banner-inner">
          <h2>ابدأ الآن في تنظيم وإدارة أعمالك بكفاءة متناهية</h2>
          <p>انضم لآلاف الشركات الناجحة التي تعتمد على أنظمتنا السحابية الذكية لتبسيط دورتها المستندية يومياً.</p>
          <Link to="/register" className="btn-banner-register" onClick={() => fbTrackLead()}>ابدأ استخدام النظام مجاناً الآن</Link>
        </div>
      </section>

      {/* Footer styled perfectly */}
      <footer className="landing-footer">
        <div className="container footer-grid">
          <div className="footer-brand-info">
            <div className="footer-brand-title">
              <img 
                src={currentLogo} 
                alt={softwareName} 
                onError={() => setLogoError(true)}
              />
              <span>{softwareName}</span>
            </div>
            <p>النظام السحابي المتكامل المعتمد لإدارة المبيعات، الفواتير الإلكترونية، المخازن، الحسابات العامة، شؤون الموظفين، والمتجر الإلكتروني في شاشة موحدة.</p>
          </div>

          <div className="footer-links-col">
            <h4>روابط سريعة</h4>
            <a href="#features">البرامج والحلول</a>
            <a href="#pricing">باقات الاشتراك</a>
            <a href="#faq">الأسئلة الشائعة</a>
            <Link to="/blog">المدونة والمقالات</Link>
          </div>

          <div className="footer-links-col">
            <h4>الصفحات القانونية</h4>
            <Link to="/terms">شروط الاستخدام</Link>
            <Link to="/privacy">سياسة الخصوصية</Link>
          </div>

          <div className="footer-links-col">
            <h4>تواصل معنا</h4>
            <p>الدعم الفني: support@seggelerp.com</p>
            <p>
              واتساب:{' '}
              <a href="https://wa.me/201281018810" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>
                +201281018810
              </a>
            </p>
          </div>
        </div>
        <div className="footer-copyright-bar">
          <p>جميع الحقوق محفوظة لدى Remotly © {new Date().getFullYear()}</p>
        </div>
      </footer>

      {/* Custom Styles replicating Daftra's exact premium light look */}
      <style>{`
        .landing-layout {
          background-color: #ffffff;
          color: #1e293b;
          font-family: 'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          direction: rtl;
          text-align: right;
          line-height: 1.6;
          overflow-x: hidden;
          padding-top: 80px;
        }

        .container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        /* ─── Header styles ─── */
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

        .mobile-menu-header {
          display: none;
        }

        .mobile-menu-backdrop {
          display: none;
        }

        .mobile-cta-group {
          display: none;
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

        .btn-register-caption {
          font-size: 0.72rem;
          color: #64748b;
          font-weight: 500;
        }

        .icon-utility-btn {
          background: none;
          border: 1px solid #e2e8f0;
          color: #475569;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .icon-utility-btn:hover {
          border-color: #cbd5e1;
          background-color: #f8fafc;
          color: #0f172a;
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

        /* ─── Hero Section ─── */
        .hero-section {
          padding: 80px 0 60px 0;
          background: radial-gradient(circle at top right, rgba(37, 99, 235, 0.03) 0%, rgba(255, 255, 255, 1) 70%);
          position: relative;
          min-height: calc(100vh - 80px);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        /* Stock Chart SVG Background */
        .hero-stock-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0.12;
          pointer-events: none;
          z-index: 1;
        }

        .hero-stock-bg svg {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .animated-stock-line-up {
          animation: floatUpLine 6s ease-in-out infinite alternate;
        }

        .animated-stock-line-down {
          animation: floatDownLine 8s ease-in-out infinite alternate;
        }

        @keyframes floatUpLine {
          0% { transform: translateY(0); }
          100% { transform: translateY(-30px); }
        }

        @keyframes floatDownLine {
          0% { transform: translateY(0); }
          100% { transform: translateY(20px); }
        }

        .hero-container {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .hero-title {
          font-size: 4.8rem;
          font-weight: 900;
          color: #0f172a;
          margin-bottom: 24px;
          letter-spacing: -1.5px;
          line-height: 1.2;
        }

        .hero-desc {
          font-size: 1.6rem;
          color: #475569;
          max-width: 1050px;
          margin: 0 auto 50px auto;
          line-height: 1.8;
          font-weight: 500;
        }

        .hero-cta-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          width: 100%;
        }

        .btn-hero-green {
          background-color: #28a745;
          color: #ffffff;
          padding: 22px 64px;
          font-size: 1.6rem;
          font-weight: 800;
          border-radius: 8px;
          text-decoration: none;
          transition: background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 10px 25px rgba(40, 167, 69, 0.25);
        }

        .btn-hero-green:hover {
          background-color: #218838;
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(40, 167, 69, 0.35);
        }

        .sub-features-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 24px;
          margin-top: 10px;
        }

        .sub-feature-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.2rem;
          color: #475569;
          font-weight: 700;
        }

        .sparkle-icon {
          color: #2563eb;
          font-size: 1.4rem;
        }

        /* ─── System Image Mockup ─── */
        .hero-system-image-wrapper {
          position: relative;
          z-index: 10;
          display: flex;
          justify-content: center;
          margin-top: 0;
          padding: 80px 24px 80px 24px;
          background: linear-gradient(to bottom, #ffffff, #f8fafc);
        }

        .system-mockup-frame {
          width: 100%;
          max-width: 1050px;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.12), 0 8px 24px rgba(0, 0, 0, 0.06);
          border: 1px solid #e2e8f0;
          background-color: #ffffff;
          transform: scale(0.95);
          transition: transform 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .hero-system-image-wrapper.is-visible .system-mockup-frame {
          transform: scale(1);
        }

        .system-mockup-topbar {
          background-color: #f1f5f9;
          border-bottom: 1px solid #e2e8f0;
          padding: 12px 18px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .system-mockup-body {
          background-color: #ffffff;
          line-height: 0;
        }

        .hero-system-image {
          width: 100%;
          height: auto;
          display: block;
        }

        /* Animations */
        .animate-on-scroll {
          opacity: 0;
          visibility: hidden;
          transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, visibility;
        }
        
        .animate-on-scroll.is-visible {
          opacity: 1;
          visibility: visible;
        }

        .fade-up {
          transform: translateY(40px);
        }
        
        .fade-up.is-visible {
          transform: translateY(0);
        }
        
        .delay-100 { transition-delay: 100ms; }
        .delay-200 { transition-delay: 200ms; }
        .delay-300 { transition-delay: 300ms; }

        /* ─── Modules Grid ─── */
        .modules-grid-section {
          padding: 100px 0;
          background-color: #f8fafc;
          border-top: 1px solid #e2e8f0;
        }

        .section-header-centered {
          text-align: center;
          max-width: 750px;
          margin: 0 auto 60px auto;
        }

        .section-header-centered h2 {
          font-size: 2.2rem;
          font-weight: 850;
          color: #0f172a;
          margin-bottom: 16px;
        }

        .section-header-centered p {
          font-size: 1.1rem;
          color: #64748b;
          line-height: 1.6;
        }

        /* Daftra Section Heading */
        .daftra-section-heading {
          text-align: right;
          direction: rtl;
          margin-bottom: 60px;
        }

        .daftra-section-tag {
          font-size: 0.85rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin: 0 0 16px 0;
        }

        .daftra-section-heading h2 {
          font-size: 2.5rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.4;
          margin: 0;
        }

        /* Daftra style modules grid */
        .daftra-modules-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 60px 48px;
          margin-top: 60px;
        }

        .daftra-module-item {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: right;
        }

        .daftra-module-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
          direction: rtl;
          width: 100%;
        }

        .daftra-module-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          flex-shrink: 0;
        }
        .daftra-module-icon svg {
          width: 28px;
          height: 28px;
        }

        .daftra-module-icon.purple-theme { color: #8b5cf6; }
        .daftra-module-icon.green-theme { color: #10b981; }
        .daftra-module-icon.rose-theme { color: #f43f5e; }
        .daftra-module-icon.amber-theme { color: #f59e0b; }
        .daftra-module-icon.cyan-theme { color: #06b6d4; }
        .daftra-module-icon.blue-theme { color: #3b82f6; }

        .daftra-module-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .daftra-module-desc {
          font-size: 0.92rem;
          color: #64748b;
          line-height: 1.8;
          margin: 0;
          font-weight: 400;
          direction: rtl;
          text-align: right;
        }

        @media (max-width: 991px) {
          .daftra-modules-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 40px 30px;
          }
        }

        @media (max-width: 600px) {
          .daftra-modules-grid {
            grid-template-columns: 1fr;
            gap: 32px 0;
          }
        }

        /* ─── Business Fields Banner Section ─── */
        .fields-banner-section {
          padding: 80px 0;
          background-color: #ffffff;
        }

        .fields-banner-card {
          position: relative;
          background: linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 40%, #f5f3ff 100%);
          border-radius: 24px;
          overflow: hidden;
          padding: 64px 60px;
          direction: rtl;
        }

        .fields-banner-bg-shape {
          position: absolute;
          left: -80px;
          top: 50%;
          transform: translateY(-50%);
          width: 420px;
          height: 420px;
          background: radial-gradient(circle, rgba(37,99,235,0.10) 0%, rgba(139,92,246,0.08) 60%, transparent 100%);
          border-radius: 50%;
          pointer-events: none;
        }

        .fields-banner-inner {
          position: relative;
          z-index: 2;
        }

        .fields-banner-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0;
          gap: 32px;
        }

        .fields-banner-text {
          flex: 1;
        }

        .fields-banner-title {
          font-size: 2.8rem;
          font-weight: 900;
          color: #0f172a;
          line-height: 1.25;
          margin: 0 0 16px 0;
        }

        .fields-banner-desc {
          font-size: 1rem;
          color: #64748b;
          margin: 0;
          line-height: 1.7;
          max-width: 480px;
        }

        .fields-banner-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #2563eb;
          color: #ffffff;
          font-size: 1.05rem;
          font-weight: 700;
          padding: 16px 40px;
          border-radius: 12px;
          text-decoration: none;
          white-space: nowrap;
          transition: all 0.25s ease;
          box-shadow: 0 4px 20px rgba(37,99,235,0.30);
          flex-shrink: 0;
        }

        .fields-banner-btn:hover {
          background: #1d4ed8;
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(37,99,235,0.40);
        }

        .fields-tags-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          direction: rtl;
        }

        .fields-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          color: #334155;
          font-size: 0.95rem;
          font-weight: 600;
          padding: 10px 20px;
          border-radius: 100px;
          cursor: pointer;
          transition: all 0.22s ease;
          user-select: none;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }

        .fields-tag:hover {
          background: #2563eb;
          color: #ffffff;
          border-color: #2563eb;
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(37,99,235,0.22);
        }

        @media (max-width: 768px) {
          .fields-banner-card {
            padding: 40px 28px;
          }
          .fields-banner-top {
            flex-direction: column;
            align-items: flex-start;
            gap: 24px;
          }
          .fields-banner-title {
            font-size: 2rem;
          }
          .fields-banner-btn {
            width: 100%;
            justify-content: center;
          }
        }
        /* ─── Showcase Section ─── */
        .interactive-showcase-section {
          padding: 100px 0;
          background-color: #f8fafc;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
        }

        .showcase-card {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.04);
        }

        .tabs-header {
          display: flex;
          justify-content: center;
          gap: 10px;
          border-bottom: 2px solid #f1f5f9;
          padding-bottom: 16px;
          margin-bottom: 40px;
          flex-wrap: wrap;
        }

        .tabs-header button {
          background: none;
          border: none;
          padding: 10px 24px;
          font-size: 1.05rem;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .tabs-header button:hover {
          color: #0f172a;
          background-color: #f1f5f9;
        }

        .tabs-header button.active-tab {
          color: #ffffff;
          background-color: #2563eb;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
        }

        .showcase-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 50px;
          align-items: center;
        }

        .showcase-text {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: right;
        }

        .showcase-text h3 {
          font-size: 1.8rem;
          font-weight: 850;
          color: #0f172a;
          margin-bottom: 16px;
        }

        .showcase-text p {
          font-size: 1.05rem;
          color: #475569;
          margin-bottom: 24px;
          line-height: 1.7;
        }

        .showcase-checklist {
          list-style: none;
          padding: 0;
          margin: 0 0 32px 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .showcase-checklist li {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 0.95rem;
          color: #334155;
          font-weight: 600;
        }

        .check-bullet {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background-color: rgba(40, 167, 69, 0.1);
          color: #28a745;
          font-size: 0.7rem;
        }

        .btn-showcase-cta {
          background-color: #2563eb;
          color: #ffffff;
          padding: 12px 32px;
          font-weight: 700;
          font-size: 1rem;
          border-radius: 6px;
          text-decoration: none;
          transition: background-color 0.2s ease;
        }

        .btn-showcase-cta:hover {
          background-color: #1d4ed8;
        }

        /* Showcase Visual Mockup Window */
        .mockup-window {
          background-color: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.06);
          overflow: hidden;
          min-height: 320px;
          display: flex;
          flex-direction: column;
        }

        .mockup-window .mockup-header {
          background-color: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .mockup-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
        }

        .mockup-dot.red { background-color: #ef4444; }
        .mockup-dot.yellow { background-color: #f59e0b; }
        .mockup-dot.green { background-color: #10b981; }

        .mockup-url {
          font-size: 0.75rem;
          color: #94a3b8;
          margin-right: 16px;
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          padding: 2px 16px;
          border-radius: 4px;
          direction: ltr;
        }

        .mockup-body {
          padding: 24px;
          flex-grow: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #ffffff;
        }

        /* Custom Inner Showcase Views */
        .pos-mockup-view {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .pos-item-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .pos-item-tile {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .pos-item-tile .emoji {
          font-size: 1.8rem;
          margin-bottom: 6px;
        }

        .pos-item-tile .title {
          font-size: 0.85rem;
          font-weight: 700;
          color: #334155;
          margin-bottom: 4px;
        }

        .pos-item-tile .price {
          font-size: 0.85rem;
          color: #2563eb;
          font-weight: 800;
        }

        .invoice-summary-box {
          border-top: 1px dashed #cbd5e1;
          padding-top: 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .sum-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          color: #64748b;
        }

        .sum-row.grand-total {
          font-size: 1rem;
          font-weight: 800;
          color: #0f172a;
          border-top: 1px solid #f1f5f9;
          padding-top: 6px;
        }

        .btn-invoice-confirm {
          background-color: #28a745;
          color: #ffffff;
          border: none;
          padding: 8px;
          border-radius: 4px;
          font-size: 0.85rem;
          font-weight: 700;
          margin-top: 4px;
          cursor: default;
        }

        .inventory-mockup-view {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .stock-indicator-item {
          padding: 12px;
          border-radius: 8px;
          border: 1px solid;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .stock-indicator-item.alert-danger {
          background-color: rgba(239, 68, 68, 0.04);
          border-color: rgba(239, 68, 68, 0.15);
        }

        .stock-indicator-item.alert-success {
          background-color: rgba(16, 185, 129, 0.04);
          border-color: rgba(16, 185, 129, 0.15);
        }

        .indicator-desc {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          font-weight: 700;
        }

        .alert-danger .badge { color: #ef4444; }
        .alert-success .badge { color: #10b981; }

        .progress-bg {
          height: 6px;
          background-color: #e2e8f0;
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
        }

        .alert-danger .progress-fill { background-color: #ef4444; }
        .alert-success .progress-fill { background-color: #10b981; }

        .finance-mockup-view {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .finance-metric-card {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .finance-metric-card.positive {
          border-right: 4px solid #10b981;
        }

        .finance-metric-card.negative {
          border-right: 4px solid #f59e0b;
        }

        .metric-title {
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 600;
        }

        .metric-val {
          font-size: 1.3rem;
          font-weight: 850;
          color: #0f172a;
        }

        .metric-trend {
          font-size: 0.72rem;
          color: #94a3b8;
        }

        .store-mockup-view {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .store-banner-demo {
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
          border: 1px solid #cbd5e1;
          padding: 16px;
          border-radius: 8px;
          text-align: center;
          width: 100%;
        }

        .store-banner-demo h4 {
          font-size: 0.95rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 4px;
        }

        .store-banner-demo p {
          font-size: 0.78rem;
          color: #64748b;
          margin: 0;
        }

        .store-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          color: #10b981;
          font-weight: 700;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          background-color: #10b981;
          border-radius: 50%;
        }

        /* ─── Pricing Section ─── */
        .pricing-section {
          padding: 100px 0;
          background-color: #ffffff;
          border-top: none;
          border-bottom: none;
        }

        .pricing-toggle-container {
          display: inline-flex;
          align-items: center;
          gap: 16px;
          margin-top: 24px;
          background-color: #f1f5f9;
          padding: 6px 16px;
          border-radius: 50px;
        }

        .pricing-toggle-container span {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 700;
          transition: color 0.2s ease;
        }

        .pricing-toggle-container span.active {
          color: #0f172a;
        }

        .pricing-toggle-switch {
          width: 52px;
          height: 28px;
          background-color: #cbd5e1;
          border: none;
          border-radius: 50px;
          position: relative;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }

        .pricing-toggle-switch.active {
          background-color: #2563eb;
        }

        .switch-dot {
          width: 20px;
          height: 20px;
          background-color: #ffffff;
          border-radius: 50%;
          position: absolute;
          top: 4px;
          right: 4px;
          transition: transform 0.3s ease;
        }

        .pricing-toggle-switch.active .switch-dot {
          transform: translateX(-24px);
        }

        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
          margin-top: 50px;
          align-items: stretch;
        }

        .pricing-card {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 40px 30px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: right;
          position: relative;
          transition: all 0.3s ease;
        }

        .pricing-card:hover {
          transform: translateY(-5px);
          border-color: #cbd5e1;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.03);
        }

        .pricing-card.active-card {
          border: 2px solid #2563eb;
          box-shadow: 0 15px 35px rgba(37, 99, 235, 0.08);
        }

        .pricing-card.active-card::before {
          content: "";
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          height: 5px;
          background-color: #2563eb;
          border-top-left-radius: 16px;
          border-top-right-radius: 16px;
        }

        .popular-badge {
          position: absolute;
          top: 15px;
          left: 15px;
          background-color: #2563eb;
          color: #ffffff;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 4px;
        }

        .pricing-card h3 {
          font-size: 1.4rem;
          font-weight: 850;
          color: #0f172a;
          margin-bottom: 8px;
        }

        .pricing-card-desc {
          font-size: 0.85rem;
          color: #64748b;
          margin-bottom: 24px;
          line-height: 1.5;
        }

        .price-box {
          display: flex;
          align-items: baseline;
          gap: 6px;
          margin-bottom: 30px;
        }

        .price-num {
          font-size: 2.8rem;
          font-weight: 900;
          color: #0f172a;
          line-height: 1;
        }

        .price-curr {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 700;
        }

        .pricing-features-list {
          list-style: none;
          padding: 0;
          margin: 0 0 35px 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
          width: 100%;
          flex-grow: 1;
        }

        .pricing-features-list li {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.9rem;
          color: #334155;
          font-weight: 600;
        }

        .feat-check {
          color: #2563eb;
          flex-shrink: 0;
          width: 16px;
          height: 16px;
        }

        .btn-pricing-secondary {
          width: 100%;
          background-color: #f1f5f9;
          color: #0f172a;
          text-align: center;
          padding: 12px;
          border-radius: 6px;
          font-weight: 700;
          text-decoration: none;
          font-size: 0.95rem;
          transition: background-color 0.2s ease;
        }

        .btn-pricing-secondary:hover {
          background-color: #e2e8f0;
        }

        .btn-pricing-primary {
          width: 100%;
          background-color: #2563eb;
          color: #ffffff;
          text-align: center;
          padding: 12px;
          border-radius: 6px;
          font-weight: 700;
          text-decoration: none;
          font-size: 0.95rem;
          transition: background-color 0.2s ease;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
        }

        .btn-pricing-primary:hover {
          background-color: #1d4ed8;
        }

        /* ─── FAQ Section ─── */
        .faq-section {
          padding: 100px 0;
          background-color: #f8fafc;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
        }

        .faq-grid {
          max-width: 800px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .faq-card-item {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          transition: border-color 0.2s ease;
        }

        .faq-card-item:hover {
          border-color: #cbd5e1;
        }

        .faq-question-trigger {
          width: 100%;
          background: none;
          border: none;
          padding: 20px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 1.1rem;
          font-weight: 750;
          color: #0f172a;
          cursor: pointer;
          text-align: right;
          font-family: inherit;
          gap: 16px;
        }

        .faq-indicator-icon {
          font-size: 1.3rem;
          color: #2563eb;
          font-weight: bold;
        }

        .faq-answer-panel {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s cubic-bezier(0, 1, 0, 1);
          background-color: #ffffff;
        }

        .faq-answer-panel p {
          padding: 0 24px 20px 24px;
          color: #475569;
          font-size: 0.98rem;
          line-height: 1.7;
          margin: 0;
        }

        .faq-active .faq-answer-panel {
          max-height: 300px;
          transition: max-height 0.3s cubic-bezier(1, 0, 1, 0);
        }

        /* ─── Bottom CTA Banner ─── */
        .cta-bottom-banner {
          padding: 80px 0;
          background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%);
          color: #ffffff;
          text-align: center;
        }

        .banner-inner h2 {
          font-size: 2.4rem;
          font-weight: 850;
          margin-bottom: 16px;
        }

        .banner-inner p {
          font-size: 1.15rem;
          color: #93c5fd;
          max-width: 800px;
          margin: 0 auto 35px auto;
          line-height: 1.7;
        }

        .btn-banner-register {
          display: inline-block;
          background-color: #28a745;
          color: #ffffff;
          padding: 16px 40px;
          font-weight: 800;
          font-size: 1.15rem;
          border-radius: 6px;
          text-decoration: none;
          transition: background-color 0.2s ease, transform 0.2s ease;
          box-shadow: 0 8px 20px rgba(40, 167, 69, 0.25);
        }

        .btn-banner-register:hover {
          background-color: #218838;
          transform: translateY(-2px);
        }

        /* ─── Footer Section ─── */
        .landing-footer {
          background-color: #ffffff;
          border-top: 1px solid #e2e8f0;
          padding: 70px 0 0 0;
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

        /* ─── Responsive Styles ─── */
        @media (max-width: 1024px) {
          .modules-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .pricing-grid {
            grid-template-columns: 1fr;
            max-width: 500px;
            margin-left: auto;
            margin-right: auto;
          }
          .footer-grid {
            grid-template-columns: 1.5fr 1fr;
          }
        }

        @media (max-width: 768px) {
          .landing-layout {
            padding-top: 75px;
          }
          .landing-header {
            height: 75px;
          }
          .brand-logo-text {
            font-size: 1.25rem;
          }
          .header-cta-group {
            display: none;
          }
          .mobile-menu-trigger {
            display: block;
          }

          /* Modern Animated Drawer for Mobile */
          .desktop-nav {
            display: flex;
            flex-direction: column;
            position: fixed;
            top: 0;
            right: -320px; /* Offscreen initially */
            bottom: 0;
            width: 300px;
            height: 100vh;
            background-color: #ffffff;
            box-shadow: -10px 0 30px rgba(15, 23, 42, 0.1);
            z-index: 1002;
            padding: 24px;
            gap: 12px;
            align-items: flex-start;
            transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.3s;
            box-sizing: border-box;
            visibility: hidden;
          }

          .desktop-nav.mobile-nav-active {
            right: 0;
            visibility: visible;
          }

          .mobile-menu-backdrop {
            display: block;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(15, 23, 42, 0.4);
            backdrop-filter: blur(4px);
            z-index: 1001;
            animation: fadeIn 0.25s ease-out;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .mobile-menu-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding-bottom: 16px;
            border-bottom: 1px solid #f1f5f9;
            margin-bottom: 16px;
          }

          .mobile-menu-header .logo-section {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .mobile-menu-header .brand-logo-img {
            height: 36px;
            width: 36px;
            object-fit: contain;
          }

          .mobile-menu-header .brand-logo-text {
            font-size: 1.2rem;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.5px;
          }

          .close-mobile-menu {
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f1f5f9;
            border: none;
            color: #0f172a;
            cursor: pointer;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            transition: all 0.2s ease;
          }

          .close-mobile-menu:hover {
            background-color: #e2e8f0;
          }

          .close-mobile-menu svg {
            width: 20px;
            height: 20px;
          }

          .desktop-nav a {
            display: flex;
            align-items: center;
            width: 100%;
            padding: 12px 16px;
            color: #334155;
            font-size: 1.05rem;
            font-weight: 600;
            border-radius: 8px;
            transition: all 0.2s ease;
            box-sizing: border-box;
            text-align: right;
            text-decoration: none;
          }

          .desktop-nav a:hover {
            background-color: #f8fafc;
            color: #2563eb;
            padding-right: 20px;
          }

          .mobile-cta-group {
            display: flex;
            flex-direction: column;
            gap: 12px;
            width: 100%;
            margin-top: auto; /* Push to the bottom */
            padding-top: 20px;
            border-top: 1px solid #f1f5f9;
          }

          .mobile-cta-group .btn-nav-login {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 48px;
            background-color: #f1f5f9;
            color: #0f172a;
            font-weight: 700;
            font-size: 1rem;
            border-radius: 8px;
            border: none;
            transition: background-color 0.2s ease;
            box-sizing: border-box;
            text-decoration: none;
          }

          .mobile-cta-group .btn-nav-login:hover {
            background-color: #e2e8f0;
          }

          .mobile-cta-group .btn-nav-register {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 48px;
            background-color: #2563eb;
            color: #ffffff;
            font-weight: 700;
            font-size: 1rem;
            border-radius: 8px;
            text-decoration: none;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
            transition: all 0.2s ease;
            box-sizing: border-box;
          }

          .mobile-cta-group .btn-nav-register:hover {
            background-color: #1d4ed8;
          }

          .hero-title {
            font-size: 2.2rem;
          }
          .hero-desc {
            font-size: 1.05rem;
          }
          .btn-hero-green {
            font-size: 1.15rem;
            padding: 14px 32px;
          }
          .modules-grid {
            grid-template-columns: 1fr;
          }
          .showcase-card {
            padding: 24px;
          }
          .showcase-content {
            grid-template-columns: 1fr;
            gap: 30px;
          }
          .footer-grid {
            grid-template-columns: 1fr;
            gap: 30px;
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
