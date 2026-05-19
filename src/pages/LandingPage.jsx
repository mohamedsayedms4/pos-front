import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/img/logo.png';

// SVG Icons to avoid external icon library issues
const Icons = {
  Speed: (props) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  Store: (props) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Chart: (props) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  Shield: (props) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Branch: (props) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3h12a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v0a3 3 0 0 1 3-3z"/><path d="M18 15h0a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v0a3 3 0 0 1 3-3z"/><line x1="9" y1="9" x2="9" y2="15"/></svg>,
  Users: (props) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  ArrowRight: (props) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  Check: (props) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  Menu: (props) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Close: (props) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
};

const LandingPage = () => {
  const [isYearly, setIsYearly] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pos');
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  // Monitor scroll for header background
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqData = [
    {
      q: "هل أحتاج إلى شراء أجهزة مخصصة لتشغيل ديجيتال ريس؟",
      a: "كلا! ديجيتال ريس هو نظام سحابي كامل يعمل على أي جهاز متصل بالإنترنت: أجهزة الكمبيوتر، الأجهزة اللوحية (iPad أو Android)، والهواتف الذكية. نوفر لك مرونة تامة لتشغيل النظام بما تملكه حالياً."
    },
    {
      q: "هل يدعم النظام الفاتورة الإلكترونية المعتمدة في بلدي؟",
      a: "نعم، ديجيتال ريس يدعم الفاتورة الإلكترونية والربط المباشر مع هيئات الزكاة والضرائب والجمارك في مختلف الدول العربية بشكل متوافق تماماً مع الأنظمة والتشريعات المحلية."
    },
    {
      q: "ماذا يحدث في حال انقطاع خدمة الإنترنت مؤقتاً؟",
      a: "لا تقلق أبداً! واجهة المبيعات السريعة تدعم ميزة العمل دون اتصال (Offline Mode) بشكل كامل. يتم حفظ المبيعات محلياً وإرسالها فوراً وتلقائياً بمجرد عودة الاتصال لضمان استمرار أعمالك دون أي انقطاع."
    },
    {
      q: "كيف يمكنني إدارة فروع متعددة ونقل المخزون بينها؟",
      a: "تطبيق ديجيتال ريس يدعم لوحة تحكم مركزية تتيح لك مراقبة مخزون كافة الفروع، إصدار طلبات تحويل البضائع بين المخازن، عزل تقارير المبيعات لكل فرع على حدة، وتحديد صلاحيات خاصة لموظفي كل فرع بنقرة زر واحدة."
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
      description: "كل مبيعة أو عملية شراء تنعكس تلقائياً في شجرتك المحاسبية! ديجيتال ريس يدعم القيود المحاسبية الآلية، إدارة الحسابات البنكية، الخزائن المالية، وتسجيل الديون والتحصيلات بشكل احترافي.",
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
      {/* Dynamic Ambient Blur Lights */}
      <div className="ambient-blur blur-violet"></div>
      <div className="ambient-blur blur-cyan"></div>
      <div className="ambient-blur blur-indigo"></div>

      {/* Glassmorphism Header */}
      <header className={`landing-header ${scrolled ? 'header-scrolled' : ''}`}>
        <div className="container header-container">
          <div className="logo-section">
            <img src={logo} alt="Digital Race" className="brand-logo-img" />
            <span className="brand-logo-text">ديجيتال ريس</span>
          </div>

          <nav className={`desktop-nav ${mobileMenuOpen ? 'mobile-nav-active' : ''}`}>
            {mobileMenuOpen && (
              <button className="close-mobile-menu" onClick={() => setMobileMenuOpen(false)}>
                <Icons.Close />
              </button>
            )}
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>المميزات</a>
            <a href="#demo" onClick={() => setMobileMenuOpen(false)}>جولة تفاعلية</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>باقات الاشتراك</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)}>الأسئلة الشائعة</a>
            
            {mobileMenuOpen && (
              <div className="mobile-cta-group">
                <Link to="/login" className="btn-nav-login">تسجيل الدخول</Link>
                <Link to="/register" className="btn-nav-register">ابدأ مجاناً</Link>
              </div>
            )}
          </nav>

          <div className="header-cta-group">
            <Link to="/login" className="btn-nav-login">تسجيل الدخول</Link>
            <Link to="/register" className="btn-nav-register-glow">ابدأ الآن مجاناً</Link>
          </div>

          <button className="mobile-menu-trigger" onClick={() => setMobileMenuOpen(true)}>
            <Icons.Menu />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="container hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="badge-pulse"></span>
              <span>بسيط ERP وإدارة الأعمال السحابي المتكامل</span>
            </div>
            <h1>
              سابق الزمن وأدر أعمالك بذكاء مع 
              <span className="gradient-text"> ديجيتال ريس</span>
            </h1>
            <p>
              النظام السحابي الأسرع والأكثر تكاملاً لتسيير عمليات نقاط البيع، المخازن المتعددة، الحسابات العامة، الموارد البشرية، والمتجر الإلكتروني المتزامن في شاشة واحدة بهوية تعكس تفوقك.
            </p>
            <div className="hero-cta-buttons">
              <Link to="/register" className="btn-hero-primary">
                <span>ابدأ تجربتك المجانية الآن</span>
                <Icons.ArrowRight className="icon-flip" />
              </Link>
              <a href="#demo" className="btn-hero-secondary">
                <span>شاهد النظام بالفيديو</span>
                <Icons.Speed />
              </a>
            </div>
            <div className="hero-stats">
              <div className="stat-item">
                <h3>+10,000</h3>
                <p>عملية يومية ناجحة</p>
              </div>
              <div className="stat-item-divider"></div>
              <div className="stat-item">
                <h3>99.9%</h3>
                <p>نسبة استقرار الخدمة</p>
              </div>
              <div className="stat-item-divider"></div>
              <div className="stat-item">
                <h3>100%</h3>
                <p>متوافق مع الضرائب واللوائح</p>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="visual-glow-border">
              <div className="dashboard-mockup">
                <div className="mockup-header">
                  <span className="dot dot-red"></span>
                  <span className="dot dot-yellow"></span>
                  <span className="dot dot-green"></span>
                  <div className="mockup-search">http://localhost:5173/dashboard</div>
                </div>
                <div className="mockup-content">
                  <div className="mockup-grid">
                    <div className="mockup-tile-wd-sm cobalt">
                      <div className="icon">▨</div>
                      <div className="val">2,480</div>
                      <div className="lbl">المخزن - إجمالي البضاعة</div>
                    </div>
                    <div className="mockup-tile-sq-md emerald">
                      <div className="icon">▤</div>
                      <div className="val">24</div>
                      <div className="lbl">الفئات</div>
                    </div>
                    <div className="mockup-tile-wd-sm amber">
                      <div className="icon">▧</div>
                      <div className="val">185</div>
                      <div className="lbl">الموردين النشطين</div>
                    </div>
                    <div className="mockup-tile-sq-sm rose">
                      <div className="icon">◉</div>
                      <div className="val">12</div>
                      <div className="lbl">فريقنا</div>
                    </div>
                  </div>
                  <div className="mockup-chart-container">
                    <div className="chart-header">📊 مؤشر أداء المبيعات والأرباح</div>
                    <div className="chart-body">
                      <svg viewBox="0 0 400 120" className="chart-svg">
                        <defs>
                          <linearGradient id="glow-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0078D7" stopOpacity="0.4"/>
                            <stop offset="100%" stopColor="#0078D7" stopOpacity="0"/>
                          </linearGradient>
                        </defs>
                        <path d="M 0 100 Q 50 40 100 80 T 200 30 T 300 60 T 400 10" fill="none" stroke="#0078D7" strokeWidth="4" />
                        <path d="M 0 100 Q 50 40 100 80 T 200 30 T 300 60 T 400 10 L 400 120 L 0 120 Z" fill="url(#glow-grad)" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid & Interactive Tabs */}
      <section id="features" className="features-section">
        <div className="container">
          <div className="section-header">
            <h2>إدارة ذكية شاملة تناسب طموح أعمالك</h2>
            <p>كل المميزات والأنظمة الفرعية التي تحتاجها لتسيير تجارتك وتوسيع نطاق أعمالك تم دمجها وبناؤها بتكامل استثنائي.</p>
          </div>

          <div className="interactive-tabs-container">
            <div className="tabs-nav">
              <button className={activeTab === 'pos' ? 'tab-active' : ''} onClick={() => setActiveTab('pos')}>
                <Icons.Speed className="tab-icon" />
                <span>كاشير المبيعات</span>
              </button>
              <button className={activeTab === 'inventory' ? 'tab-active' : ''} onClick={() => setActiveTab('inventory')}>
                <Icons.Branch className="tab-icon" />
                <span>المخازن والفروع</span>
              </button>
              <button className={activeTab === 'finance' ? 'tab-active' : ''} onClick={() => setActiveTab('finance')}>
                <Icons.Chart className="tab-icon" />
                <span>الحسابات والتقارير</span>
              </button>
              <button className={activeTab === 'store' ? 'tab-active' : ''} onClick={() => setActiveTab('store')}>
                <Icons.Store className="tab-icon" />
                <span>المتجر الإلكتروني</span>
              </button>
            </div>

            <div className="tab-content-panel">
              <div className="tab-content-text">
                <h3>{features[activeTab].title}</h3>
                <p>{features[activeTab].description}</p>
                <div className="tab-benefits-grid">
                  {features[activeTab].benefits.map((b, i) => (
                    <div className="benefit-item" key={i}>
                      <span className="benefit-icon"><Icons.Check /></span>
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="tab-content-visual">
                <div className="glass-feature-card">
                  {activeTab === 'pos' && (
                    <div className="pos-preview">
                      <div className="pos-item-grid">
                        <div className="pos-prod-card">
                          <div className="img-placeholder">☕</div>
                          <h4>قهوة إسبريسو متميزة</h4>
                          <span className="price">15.00 ج.م</span>
                        </div>
                        <div className="pos-prod-card">
                          <div className="img-placeholder">🍰</div>
                          <h4>كعكة الشوكولاتة</h4>
                          <span className="price">45.00 ج.م</span>
                        </div>
                      </div>
                      <div className="pos-receipt-summary">
                        <div className="row"><span>الإجمالي الفرعي</span><span>60.00 ج.م</span></div>
                        <div className="row"><span>الضريبة (14%)</span><span>8.40 ج.م</span></div>
                        <div className="row total"><span>الإجمالي الكلي</span><span>68.40 ج.م</span></div>
                        <button className="btn-pay-mock">إصدار الفاتورة الفوري 💳</button>
                      </div>
                    </div>
                  )}
                  {activeTab === 'inventory' && (
                    <div className="inventory-preview">
                      <div className="stock-level-bar danger">
                        <div className="bar-info"><span>آيفون 15 برو - فرع المهندسين</span><span className="stock">1 حبات (تحذير نقص المخزون!)</span></div>
                        <div className="progress"><div className="fill" style={{ width: '10%' }}></div></div>
                      </div>
                      <div className="stock-level-bar success">
                        <div className="bar-info"><span>آيفون 15 برو - مخزن التجمع</span><span className="stock">85 حبة (مستقر)</span></div>
                        <div className="progress"><div className="fill" style={{ width: '85%' }}></div></div>
                      </div>
                      <div className="transfer-action">
                        <button className="btn-transfer-mock">طلب نقل مخزني سريع 🔄</button>
                      </div>
                    </div>
                  )}
                  {activeTab === 'finance' && (
                    <div className="finance-preview">
                      <div className="profit-loss-card">
                        <span className="title">صافي ربح الشهر الحالي</span>
                        <span className="value positive">+154,820 ج.م</span>
                        <span className="trend">📈 زيادة بمعدل 12% عن الشهر الماضي</span>
                      </div>
                      <div className="profit-loss-card">
                        <span className="title">إجمالي المديونيات المستحقة</span>
                        <span className="value negative">-34,500 ج.م</span>
                        <span className="trend">⚠️ 3 فواتير موردين قاربت على موعد الاستحقاق</span>
                      </div>
                    </div>
                  )}
                  {activeTab === 'store' && (
                    <div className="store-preview">
                      <div className="store-header-mock">
                        <span className="dot"></span>
                        <span>متجري الإلكتروني النشط</span>
                      </div>
                      <div className="store-hero-banner">
                        <h5>خصم 20% على الطلبات أونلاين 🛍️</h5>
                        <p>اطلب الآن واستلم من أقرب فرع إليك فوراً.</p>
                      </div>
                      <span className="sync-badge">✓ متزامن ومزامن مع الخزينة والمخزن</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Speed & Analytics Section */}
      <section id="demo" className="speed-analytics-section">
        <div className="container grid-2">
          <div className="visual-mock">
            <div className="dashboard-stats-card animate-pulse-glow">
              <div className="card-inner">
                <div className="speed-indicator">
                  <svg viewBox="0 0 100 100" className="speed-gauge">
                    <circle cx="50" cy="50" r="40" stroke="#1f1f2e" strokeWidth="6" fill="none"/>
                    <circle cx="50" cy="50" r="40" stroke="var(--metro-blue)" strokeWidth="6" strokeDasharray="180 250" fill="none" className="gauge-fill"/>
                    <text x="50" y="55" textAnchor="middle" fill="#fff" fontWeight="bold" fontSize="14">أسرع 5x</text>
                  </svg>
                </div>
                <h3>استجابة فورية فائقة السرعة</h3>
                <p>قاعدة البيانات مبنية ومحسنة للعمل بأنظمة الفهارس العنقودية الفريدة لمشاهد الاستعلام، مما يمنحك استجابة فورية بنسبة 100% حتى مع وجود ملايين المعاملات في حسابك.</p>
              </div>
            </div>
          </div>
          <div className="text-content">
            <h2>تحليلات مبيعات تفصيلية وشاملة لكل الفروع</h2>
            <p>لا تتخذ قراراتك القادمة عشوائياً! ديجيتال ريس يوفر لك رسوم بيانية ومؤشرات أداء متقدمة تتيح لك مراقبة مبيعات الفروع المختلفة بدقة بالغة، ومقارنة أرباح كل فرع، وتتبع أداء الموظفين والكاشيرز لحظة بلحظة وبصورة تفاعلية بالكامل.</p>
            <div className="features-list-inline">
              <div className="feature-inline-item">
                <span className="icon"><Icons.Shield /></span>
                <div>
                  <h4>عزل البيانات وحمايتها</h4>
                  <p>تصفية وحصر مبيعات كل فرع بشكل مستقل وآمن لضمان سرية البيانات وصلاحيات الموظفين المحددة.</p>
                </div>
              </div>
              <div className="feature-inline-item">
                <span className="icon"><Icons.Users /></span>
                <div>
                  <h4>تحليل كفاءة فريقك</h4>
                  <p>مراقبة حجم المبيعات لكل كاشير، لمعرفة الكفاءة والسرعة وتقديم الحوافز التقديرية بدقة مطلقة.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing-section">
        <div className="container">
          <div className="section-header">
            <h2>خطط أسعار مرنة تتناسب مع حجم نشاطك</h2>
            <p>اختر الخطة المناسبة لأعمالك الآن. جميع الخطط تتضمن أماناً فائقاً ودعماً فنياً على مدار الساعة.</p>
            
            <div className="pricing-toggle-wrapper">
              <span className={!isYearly ? 'active-toggle-lbl' : ''}>شهرياً</span>
              <button className={`pricing-toggle-btn ${isYearly ? 'yearly-active' : ''}`} onClick={() => setIsYearly(!isYearly)}>
                <span className="toggle-switch"></span>
              </button>
              <span className={isYearly ? 'active-toggle-lbl' : ''}>سنوياً (وفر 20% 🎁)</span>
            </div>
          </div>

          <div className="pricing-grid">
            <div className="pricing-card">
              <h3>الباقة الفردية</h3>
              <p className="card-desc">مثالية للمتاجر الصغيرة والمستقلة لبدء تنظيم أعمالها السريعة.</p>
              <div className="price-value">
                <span className="num">{isYearly ? "199" : "249"}</span>
                <span className="currency">ج.م/شهرياً</span>
              </div>
              <ul className="card-features">
                <li><Icons.Check className="icon-check"/> <span>نقطة بيع واحدة (كاشير واحد)</span></li>
                <li><Icons.Check className="icon-check"/> <span>مخزن واحد متكامل</span></li>
                <li><Icons.Check className="icon-check"/> <span>دعم كامل للفواتير والباركود</span></li>
                <li><Icons.Check className="icon-check"/> <span>التقارير والمبيعات اليومية</span></li>
              </ul>
              <Link to="/register" className="btn-pricing-secondary">ابدأ مجاناً الآن</Link>
            </div>

            <div className="pricing-card active-card">
              <div className="popular-badge">الأكثر اختياراً</div>
              <h3>الباقة الاحترافية</h3>
              <p className="card-desc">الحل الأمثل للشركات المتوسعة وإدارة الفروع المتعددة والمخازن المشتركة.</p>
              <div className="price-value">
                <span className="num">{isYearly ? "399" : "499"}</span>
                <span className="currency">ج.م/شهرياً</span>
              </div>
              <ul className="card-features">
                <li><Icons.Check className="icon-check"/> <span>حتى 3 فروع / نقاط بيع متعددة</span></li>
                <li><Icons.Check className="icon-check"/> <span>مزامنة المخازن والتحويل الفوري</span></li>
                <li><Icons.Check className="icon-check"/> <span>التقارير المالية المتقدمة والمصروفات</span></li>
                <li><Icons.Check className="icon-check"/> <span>إدارة الموارد البشرية والرواتب والشفتات</span></li>
                <li><Icons.Check className="icon-check"/> <span>متجر إلكتروني متكامل مدمج ونشط</span></li>
              </ul>
              <Link to="/register" className="btn-pricing-primary">ابدأ تجربتك الاحترافية</Link>
            </div>

            <div className="pricing-card">
              <h3>باقة المؤسسات</h3>
              <p className="card-desc">للمؤسسات والشركات الكبرى التي تبحث عن أقصى عزل وتفصيل مخصص بالكامل.</p>
              <div className="price-value">
                <span className="num">{isYearly ? "799" : "999"}</span>
                <span className="currency">ج.م/شهرياً</span>
              </div>
              <ul className="card-features">
                <li><Icons.Check className="icon-check"/> <span>عدد فروع ونقاط بيع غير محدود</span></li>
                <li><Icons.Check className="icon-check"/> <span>قاعدة بيانات مخصصة فائقة السرعة</span></li>
                <li><Icons.Check className="icon-check"/> <span>واجهات ربط مخصصة (Custom API Integration)</span></li>
                <li><Icons.Check className="icon-check"/> <span>مدير حساب مخصص ودعم فني طارئ 24/7</span></li>
              </ul>
              <Link to="/register" className="btn-pricing-secondary">تواصل معنا الآن</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq-section">
        <div className="container">
          <div className="section-header">
            <h2>لديك أسئلة؟ نحن نوفر لك كل الإجابات</h2>
            <p>تصفح أكثر الأسئلة شيوعاً حول نظام ديجيتال ريس وكيف يمكن أن يساعدك في تنمية أعمالك.</p>
          </div>

          <div className="faq-grid">
            {faqData.map((faq, index) => (
              <div className={`faq-card ${openFaq === index ? 'faq-open' : ''}`} key={index}>
                <button className="faq-trigger" onClick={() => toggleFaq(index)}>
                  <span>{faq.q}</span>
                  <span className="faq-icon-indicator">+</span>
                </button>
                <div className="faq-answer">
                  <p>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="cta-banner-section">
        <div className="container banner-container animate-pulse-glow">
          <div className="banner-text">
            <h2>انضم لآلاف الشركات الناجحة مع ديجيتال ريس اليوم</h2>
            <p>لا تضيع وقتك في إدارة الأنظمة المبعثرة. ابدأ رحلتك الآن بنظام واحد، أسرع، وأقوى ينمو معك يوماً بعد يوم.</p>
          </div>
          <Link to="/register" className="btn-banner-action">
            <span>ابدأ الآن مجاناً</span>
            <Icons.ArrowRight className="icon-flip" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <div className="logo">
              <img src={logo} alt="Digital Race" />
              <span>ديجيتال ريس</span>
            </div>
            <p>أسرع نظام نقاط بيع وإدارة تجارة متكامل سحابياً. مصمم للنمو، مبني على جودة وتكامل لا مثيل لهما.</p>
          </div>
          
          <div className="footer-links">
            <h4>روابط سريعة</h4>
            <a href="#features">المميزات</a>
            <a href="#demo">جولة تفاعلية</a>
            <a href="#pricing">الباقات والأسعار</a>
          </div>

          <div className="footer-links">
            <h4>الصفحات القانونية</h4>
            <Link to="/terms">شروط الاستخدام</Link>
            <Link to="/privacy">سياسة الخصوصية</Link>
          </div>

          <div className="footer-links">
            <h4>تواصل معنا</h4>
            <p>البريد الإلكتروني: info@digitalrace.net</p>
            <p>الدعم الفني: support@digitalrace.net</p>
          </div>
        </div>
        <div className="footer-copyright">
          <p>© {new Date().getFullYear()} ديجيتال ريس (Digital Race). جميع الحقوق محفوظة.</p>
        </div>
      </footer>

      {/* Landing Page Styles */}
      <style>{`
        /* ─── Premium Landing Page Design System & Tokens ─── */
        .landing-layout {
          position: relative;
          background: #080810;
          color: #ffffff;
          font-family: 'Cairo', 'Inter', sans-serif;
          direction: rtl;
          overflow-x: hidden;
          line-height: 1.6;
        }

        .container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        /* Ambient glowing circles */
        .ambient-blur {
          position: absolute;
          border-radius: 50%;
          filter: blur(140px);
          opacity: 0.15;
          z-index: 0;
          pointer-events: none;
        }

        .blur-violet {
          width: 500px;
          height: 500px;
          background: #8b5cf6;
          top: -100px;
          right: -100px;
        }

        .blur-cyan {
          width: 400px;
          height: 400px;
          background: #06b6d4;
          top: 40%;
          left: -150px;
        }

        .blur-indigo {
          width: 600px;
          height: 600px;
          background: #4f46e5;
          bottom: 100px;
          right: -200px;
        }

        /* ─── Header Styling ─── */
        .landing-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 80px;
          z-index: 1000;
          display: flex;
          align-items: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .header-scrolled {
          background: rgba(8, 8, 16, 0.75);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          height: 70px;
        }

        .header-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-logo-img {
          height: 40px;
          object-fit: contain;
        }

        .brand-logo-text {
          font-size: 1.4rem;
          font-weight: 800;
          letter-spacing: -0.5px;
          background: linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .desktop-nav {
          display: flex;
          align-items: center;
          gap: 30px;
        }

        .desktop-nav a {
          color: #d1d5db;
          font-weight: 600;
          font-size: 0.95rem;
          transition: color 0.2s;
        }

        .desktop-nav a:hover {
          color: #60a5fa;
        }

        .header-cta-group {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .btn-nav-login {
          color: #ffffff;
          font-weight: 600;
          font-size: 0.95rem;
          padding: 8px 16px;
          transition: opacity 0.2s;
        }

        .btn-nav-login:hover {
          opacity: 0.8;
        }

        .btn-nav-register {
          background: #2563eb;
          color: white;
          padding: 10px 20px;
          border-radius: 50px;
          font-weight: 700;
          font-size: 0.95rem;
          transition: background 0.2s;
        }

        .btn-nav-register:hover {
          background: #1d4ed8;
        }

        .btn-nav-register-glow {
          background: #2563eb;
          color: white;
          padding: 10px 20px;
          border-radius: 50px;
          font-weight: 700;
          font-size: 0.95rem;
          transition: all 0.3s;
          box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);
        }

        .btn-nav-register-glow:hover {
          background: #1d4ed8;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.6);
        }

        .mobile-menu-trigger {
          display: none;
          background: transparent;
          border: none;
          color: white;
          width: 32px;
          height: 32px;
          cursor: pointer;
        }

        .close-mobile-menu {
          display: none;
        }

        /* ─── Hero Section ─── */
        .hero-section {
          padding-top: 160px;
          padding-bottom: 80px;
          position: relative;
          z-index: 10;
        }

        .hero-container {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 40px;
          align-items: center;
        }

        .hero-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .hero-badge {
          align-self: flex-start;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: rgba(37, 99, 235, 0.1);
          border: 1px solid rgba(37, 99, 235, 0.2);
          color: #60a5fa;
          padding: 6px 16px;
          border-radius: 50px;
          font-size: 0.85rem;
          font-weight: 700;
        }

        .badge-pulse {
          width: 8px;
          height: 8px;
          background: #60a5fa;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(0.9); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.5; }
          100% { transform: scale(0.9); opacity: 1; }
        }

        .hero-content h1 {
          font-size: 3.2rem;
          line-height: 1.25;
          font-weight: 800;
          letter-spacing: -1px;
          color: #ffffff;
        }

        .gradient-text {
          background: linear-gradient(135deg, #60a5fa 0%, #c084fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          display: inline-block;
        }

        .hero-content p {
          color: #9ca3af;
          font-size: 1.15rem;
          line-height: 1.7;
        }

        .hero-cta-buttons {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-top: 10px;
        }

        .btn-hero-primary {
          background: #2563eb;
          color: white;
          padding: 16px 28px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 1rem;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.3s;
          box-shadow: 0 4px 20px rgba(37, 99, 235, 0.3);
        }

        .btn-hero-primary:hover {
          background: #1d4ed8;
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(37, 99, 235, 0.5);
        }

        .icon-flip {
          transform: scaleX(-1);
          width: 20px;
          height: 20px;
        }

        .btn-hero-secondary {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: white;
          padding: 16px 28px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 1rem;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.2s;
        }

        .btn-hero-secondary:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .btn-hero-secondary svg {
          width: 20px;
          height: 20px;
          color: #9ca3af;
        }

        .hero-stats {
          display: flex;
          align-items: center;
          gap: 25px;
          margin-top: 30px;
        }

        .stat-item h3 {
          font-size: 1.8rem;
          font-weight: 800;
          color: #ffffff;
          background: linear-gradient(135deg, #ffffff 0%, #9ca3af 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .stat-item p {
          font-size: 0.85rem;
          color: #6b7280;
          margin: 0;
        }

        .stat-item-divider {
          width: 1px;
          height: 40px;
          background: rgba(255, 255, 255, 0.08);
        }

        /* ─── Hero Visual Mockup ─── */
        .hero-visual {
          position: relative;
        }

        .visual-glow-border {
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.3) 0%, rgba(192, 132, 252, 0.3) 100%);
          padding: 1px;
          border-radius: 16px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
        }

        .dashboard-mockup {
          background: #0b0b13;
          border-radius: 15px;
          overflow: hidden;
        }

        .mockup-header {
          background: #111122;
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .mockup-header .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .dot-red { background: #ef4444; }
        .dot-yellow { background: #f59e0b; }
        .dot-green { background: #10b981; }

        .mockup-search {
          margin-right: 15px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          padding: 2px 16px;
          font-size: 0.75rem;
          color: #6b7280;
          flex-grow: 1;
          max-width: 250px;
          direction: ltr;
        }

        .mockup-content {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .mockup-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .mockup-tile-wd-sm, .mockup-tile-sq-md, .mockup-tile-sq-sm {
          padding: 12px;
          border-radius: 8px;
          color: white;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 80px;
        }

        .mockup-tile-wd-sm.cobalt { background: linear-gradient(135deg, #0050ef 0%, #0078d7 100%); }
        .mockup-tile-sq-md.emerald { background: linear-gradient(135deg, #059669 0%, #10b981 100%); grid-column: span 1; }
        .mockup-tile-wd-sm.amber { background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%); grid-column: span 1; }
        .mockup-tile-sq-sm.rose { background: linear-gradient(135deg, #be123c 0%, #fb7185 100%); }

        .mockup-tile-wd-sm .icon, .mockup-tile-sq-md .icon, .mockup-tile-sq-sm .icon {
          font-size: 1.2rem;
          opacity: 0.8;
        }

        .mockup-tile-wd-sm .val, .mockup-tile-sq-md .val, .mockup-tile-sq-sm .val {
          font-size: 1.1rem;
          font-weight: 800;
        }

        .mockup-tile-wd-sm .lbl, .mockup-tile-sq-md .lbl, .mockup-tile-sq-sm .lbl {
          font-size: 0.65rem;
          opacity: 0.7;
        }

        .mockup-chart-container {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 8px;
          padding: 15px;
        }

        .chart-header {
          font-size: 0.8rem;
          font-weight: 700;
          color: #9ca3af;
          margin-bottom: 10px;
        }

        .chart-body {
          height: 80px;
        }

        .chart-svg {
          width: 100%;
          height: 100%;
        }

        /* ─── Section Header ─── */
        .section-header {
          text-align: center;
          max-width: 700px;
          margin: 0 auto 50px auto;
          display: flex;
          flex-direction: column;
          gap: 15px;
          position: relative;
          z-index: 10;
        }

        .section-header h2 {
          font-size: 2.2rem;
          font-weight: 800;
        }

        .section-header p {
          color: #9ca3af;
          font-size: 1.05rem;
        }

        /* ─── Features Section & Interactive Tabs ─── */
        .features-section {
          padding: 100px 0;
          background: #06060c;
          position: relative;
          z-index: 10;
        }

        .interactive-tabs-container {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 20px;
          padding: 30px;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
        }

        .tabs-nav {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 15px;
          margin-bottom: 30px;
        }

        .tabs-nav button {
          background: transparent;
          border: none;
          padding: 14px;
          color: #9ca3af;
          font-weight: 700;
          font-size: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          border-radius: 10px;
          transition: all 0.2s;
          font-family: inherit;
        }

        .tabs-nav button:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.03);
        }

        .tabs-nav button.tab-active {
          color: #ffffff;
          background: #2563eb;
          box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);
        }

        .tab-icon {
          width: 20px;
          height: 20px;
        }

        .tab-content-panel {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          align-items: center;
        }

        .tab-content-text {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .tab-content-text h3 {
          font-size: 1.8rem;
          font-weight: 800;
          color: #ffffff;
        }

        .tab-content-text p {
          color: #9ca3af;
          font-size: 1.05rem;
          line-height: 1.7;
        }

        .tab-benefits-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 10px;
        }

        .benefit-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.9rem;
          color: #e5e7eb;
        }

        .benefit-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border-radius: 50%;
          font-size: 0.7rem;
        }

        .tab-content-visual {
          position: relative;
        }

        .glass-feature-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 25px;
          min-height: 250px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        /* Feature Previews Mock */
        .pos-preview {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .pos-item-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .pos-prod-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 12px;
          border-radius: 8px;
          text-align: center;
        }

        .pos-prod-card .img-placeholder {
          font-size: 1.5rem;
          margin-bottom: 6px;
        }

        .pos-prod-card h4 {
          font-size: 0.85rem;
          margin-bottom: 4px;
        }

        .pos-prod-card .price {
          color: #60a5fa;
          font-size: 0.8rem;
          font-weight: 700;
        }

        .pos-receipt-summary {
          border-top: 1px dashed rgba(255, 255, 255, 0.08);
          padding-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .pos-receipt-summary .row {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: #9ca3af;
        }

        .pos-receipt-summary .row.total {
          font-size: 0.95rem;
          font-weight: 800;
          color: #ffffff;
        }

        .btn-pay-mock {
          width: 100%;
          background: #107c10;
          color: white;
          border: none;
          padding: 10px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: default;
          margin-top: 6px;
          text-align: center;
        }

        .stock-level-bar {
          margin-bottom: 12px;
          width: 100%;
        }

        .stock-level-bar .bar-info {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          margin-bottom: 6px;
        }

        .stock-level-bar.danger .stock { color: #ef4444; }
        .stock-level-bar.success .stock { color: #10b981; }

        .stock-level-bar .progress {
          height: 6px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          overflow: hidden;
        }

        .stock-level-bar .progress .fill {
          height: 100%;
          border-radius: 4px;
        }

        .stock-level-bar.danger .progress .fill { background: #ef4444; }
        .stock-level-bar.success .progress .fill { background: #10b981; }

        .btn-transfer-mock {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: default;
        }

        .profit-loss-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
        }

        .profit-loss-card .title { font-size: 0.8rem; color: #9ca3af; }
        .profit-loss-card .value { font-size: 1.4rem; font-weight: 800; }
        .profit-loss-card .value.positive { color: #10b981; }
        .profit-loss-card .value.negative { color: #f59e0b; }
        .profit-loss-card .trend { font-size: 0.75rem; color: #6b7280; }

        .store-preview {
          display: flex;
          flex-direction: column;
          gap: 15px;
          width: 100%;
        }

        .store-header-mock {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.85rem;
          font-weight: 700;
          color: #e5e7eb;
        }

        .store-header-mock .dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
        }

        .store-hero-banner {
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.2) 0%, rgba(192, 132, 252, 0.2) 100%);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 15px;
          border-radius: 8px;
        }

        .store-hero-banner h5 { font-size: 0.95rem; font-weight: 700; margin-bottom: 4px; }
        .store-hero-banner p { font-size: 0.75rem; color: #9ca3af; margin: 0; }

        .sync-badge {
          align-self: flex-start;
          font-size: 0.75rem;
          color: #10b981;
          background: rgba(16, 185, 129, 0.1);
          padding: 4px 10px;
          border-radius: 4px;
          font-weight: 700;
        }

        /* ─── Speed & Analytics Section ─── */
        .speed-analytics-section {
          padding: 100px 0;
          background: #080810;
          position: relative;
          z-index: 10;
        }

        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 50px;
          align-items: center;
        }

        .visual-mock {
          position: relative;
        }

        .dashboard-stats-card {
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.3) 0%, rgba(6, 182, 212, 0.3) 100%);
          padding: 1px;
          border-radius: 20px;
        }

        .animate-pulse-glow {
          box-shadow: 0 10px 30px rgba(37, 99, 235, 0.15);
          animation: pulseGlow 4s infinite ease-in-out;
        }

        @keyframes pulseGlow {
          0% { box-shadow: 0 10px 30px rgba(37, 99, 235, 0.15); }
          50% { box-shadow: 0 15px 45px rgba(37, 99, 235, 0.3); }
          100% { box-shadow: 0 10px 30px rgba(37, 99, 235, 0.15); }
        }

        .dashboard-stats-card .card-inner {
          background: #0d0d18;
          border-radius: 19px;
          padding: 30px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
        }

        .speed-indicator {
          width: 130px;
          height: 130px;
        }

        .speed-gauge {
          width: 100%;
          height: 100%;
        }

        .gauge-fill {
          animation: fillGauge 2s ease-in-out forwards;
        }

        @keyframes fillGauge {
          from { stroke-dasharray: 0 250; }
          to { stroke-dasharray: 180 250; }
        }

        .dashboard-stats-card h3 {
          font-size: 1.4rem;
          font-weight: 800;
        }

        .dashboard-stats-card p {
          color: #9ca3af;
          font-size: 0.95rem;
          line-height: 1.6;
        }

        .text-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .text-content h2 {
          font-size: 2.2rem;
          font-weight: 800;
          line-height: 1.3;
        }

        .text-content p {
          color: #9ca3af;
          font-size: 1.05rem;
          line-height: 1.7;
        }

        .features-list-inline {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-top: 10px;
        }

        .feature-inline-item {
          display: flex;
          gap: 20px;
          align-items: flex-start;
        }

        .feature-inline-item .icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          background: rgba(37, 99, 235, 0.1);
          border: 1px solid rgba(37, 99, 235, 0.2);
          color: #60a5fa;
          border-radius: 10px;
          flex-shrink: 0;
        }

        .feature-inline-item .icon svg {
          width: 20px;
          height: 20px;
        }

        .feature-inline-item h4 {
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .feature-inline-item p {
          color: #9ca3af;
          font-size: 0.9rem;
          margin: 0;
        }

        /* ─── Pricing Section ─── */
        .pricing-section {
          padding: 100px 0;
          background: #06060c;
          position: relative;
          z-index: 10;
        }

        .pricing-toggle-wrapper {
          display: inline-flex;
          align-items: center;
          gap: 15px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 8px 20px;
          border-radius: 50px;
          margin: 20px auto 0 auto;
        }

        .pricing-toggle-wrapper span {
          font-size: 0.9rem;
          color: #6b7280;
          font-weight: 700;
          transition: color 0.2s;
        }

        .pricing-toggle-wrapper span.active-toggle-lbl {
          color: #ffffff;
        }

        .pricing-toggle-btn {
          width: 50px;
          height: 26px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 50px;
          position: relative;
          cursor: pointer;
          transition: background 0.3s;
        }

        .pricing-toggle-btn.yearly-active {
          background: #2563eb;
        }

        .toggle-switch {
          position: absolute;
          top: 3px;
          right: 3px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: transform 0.3s;
        }

        .pricing-toggle-btn.yearly-active .toggle-switch {
          transform: translateX(-24px);
        }

        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 25px;
          align-items: stretch;
          margin-top: 50px;
        }

        .pricing-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 20px;
          padding: 35px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          position: relative;
          transition: all 0.3s;
        }

        .pricing-card:hover {
          transform: translateY(-5px);
          border-color: rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
        }

        .pricing-card.active-card {
          background: #0d0d1a;
          border: 1px solid rgba(37, 99, 235, 0.3);
          box-shadow: 0 10px 30px rgba(37, 99, 235, 0.1);
        }

        .pricing-card.active-card::before {
          content: '';
          position: absolute;
          top: -1px;
          left: -1px;
          right: -1px;
          height: 4px;
          background: linear-gradient(90deg, #2563eb, #c084fc);
          border-top-left-radius: 20px;
          border-top-right-radius: 20px;
        }

        .popular-badge {
          position: absolute;
          top: 15px;
          left: 20px;
          background: linear-gradient(135deg, #2563eb 0%, #c084fc 100%);
          color: white;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 4px;
        }

        .pricing-card h3 {
          font-size: 1.4rem;
          font-weight: 800;
          color: #ffffff;
        }

        .card-desc {
          color: #9ca3af;
          font-size: 0.85rem;
          line-height: 1.5;
        }

        .price-value {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }

        .price-value .num {
          font-size: 2.8rem;
          font-weight: 800;
          color: #ffffff;
        }

        .price-value .currency {
          font-size: 0.85rem;
          color: #6b7280;
          font-weight: 700;
        }

        .card-features {
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex-grow: 1;
        }

        .card-features li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 0.85rem;
          color: #d1d5db;
        }

        .icon-check {
          color: #10b981;
          width: 16px;
          height: 16px;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .btn-pricing-primary {
          background: #2563eb;
          color: white;
          padding: 14px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.95rem;
          text-align: center;
          transition: background 0.2s;
          box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
        }

        .btn-pricing-primary:hover {
          background: #1d4ed8;
        }

        .btn-pricing-secondary {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: white;
          padding: 14px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.95rem;
          text-align: center;
          transition: all 0.2s;
        }

        .btn-pricing-secondary:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
        }

        /* ─── FAQ Section ─── */
        .faq-section {
          padding: 100px 0;
          background: #080810;
          position: relative;
          z-index: 10;
        }

        .faq-grid {
          display: flex;
          flex-direction: column;
          gap: 15px;
          max-width: 800px;
          margin: 0 auto;
        }

        .faq-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .faq-card:hover {
          border-color: rgba(255, 255, 255, 0.08);
        }

        .faq-trigger {
          width: 100%;
          background: transparent;
          border: none;
          padding: 20px 25px;
          color: #ffffff;
          font-weight: 700;
          font-size: 1.05rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          text-align: right;
          font-family: inherit;
        }

        .faq-icon-indicator {
          font-size: 1.4rem;
          color: #6b7280;
          transition: transform 0.3s;
        }

        .faq-answer {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease-out, padding 0.3s;
          padding: 0 25px;
        }

        .faq-answer p {
          color: #9ca3af;
          font-size: 0.95rem;
          line-height: 1.6;
          padding-bottom: 20px;
        }

        /* FAQ Open State styling */
        .faq-open {
          background: rgba(255, 255, 255, 0.03);
          border-color: rgba(37, 99, 235, 0.2);
        }

        .faq-open .faq-icon-indicator {
          transform: rotate(45deg);
          color: #60a5fa;
        }

        .faq-open .faq-answer {
          max-height: 200px;
        }

        /* ─── Bottom CTA Banner ─── */
        .cta-banner-section {
          padding: 60px 0;
          background: #06060c;
          position: relative;
          z-index: 10;
        }

        .banner-container {
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.2) 0%, rgba(192, 132, 252, 0.2) 100%);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 24px;
          padding: 50px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
        }

        .banner-text {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .banner-text h2 {
          font-size: 2rem;
          font-weight: 800;
        }

        .banner-text p {
          color: #d1d5db;
          font-size: 1rem;
          max-width: 600px;
        }

        .btn-banner-action {
          background: white;
          color: #080810;
          padding: 16px 30px;
          border-radius: 12px;
          font-weight: 800;
          font-size: 1rem;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.3s;
          box-shadow: 0 4px 20px rgba(255, 255, 255, 0.1);
          flex-shrink: 0;
        }

        .btn-banner-action:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(255, 255, 255, 0.25);
        }

        .btn-banner-action svg {
          width: 20px;
          height: 20px;
        }

        /* ─── Footer Styling ─── */
        .landing-footer {
          background: #040408;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          padding: 70px 0 30px 0;
          position: relative;
          z-index: 10;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 1.5fr repeat(3, 1fr);
          gap: 40px;
          margin-bottom: 50px;
        }

        .footer-brand {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .footer-brand .logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .footer-brand .logo img {
          height: 36px;
        }

        .footer-brand .logo span {
          font-size: 1.3rem;
          font-weight: 800;
          color: white;
        }

        .footer-brand p {
          color: #6b7280;
          font-size: 0.85rem;
          line-height: 1.6;
        }

        .footer-links {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .footer-links h4 {
          font-size: 0.95rem;
          font-weight: 700;
          color: white;
        }

        .footer-links a, .footer-links p {
          color: #6b7280;
          font-size: 0.85rem;
          transition: color 0.2s;
        }

        .footer-links a:hover {
          color: #60a5fa;
        }

        .footer-copyright {
          text-align: center;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          padding-top: 30px;
        }

        .footer-copyright p {
          font-size: 0.8rem;
          color: #4b5563;
        }

        /* ─── Responsive Queries ─── */
        @media (max-width: 1024px) {
          .hero-container {
            grid-template-columns: 1fr;
            text-align: center;
          }

          .hero-badge {
            align-self: center;
          }

          .hero-cta-buttons {
            justify-content: center;
          }

          .hero-stats {
            justify-content: center;
          }

          .tabs-nav {
            grid-template-columns: repeat(2, 1fr);
          }

          .tab-content-panel {
            grid-template-columns: 1fr;
          }

          .grid-2 {
            grid-template-columns: 1fr;
            text-align: center;
          }

          .feature-inline-item {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .pricing-grid {
            grid-template-columns: 1fr;
            max-width: 500px;
            margin: 50px auto 0 auto;
          }

          .footer-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 768px) {
          .desktop-nav {
            display: none;
          }

          .header-cta-group {
            display: none;
          }

          .mobile-menu-trigger {
            display: block;
          }

          /* Active mobile menu drawer styling */
          .mobile-nav-active {
            display: flex !important;
            flex-direction: column;
            position: fixed;
            top: 0;
            right: 0;
            left: 0;
            bottom: 0;
            background: #080810;
            z-index: 2000;
            padding: 40px;
            gap: 25px;
            align-items: center;
            justify-content: center;
          }

          .close-mobile-menu {
            display: block;
            position: absolute;
            top: 20px;
            left: 20px;
            background: transparent;
            border: none;
            color: white;
            width: 32px;
            height: 32px;
          }

          .mobile-cta-group {
            display: flex;
            flex-direction: column;
            width: 100%;
            gap: 15px;
            margin-top: 20px;
            align-items: center;
          }

          .mobile-cta-group .btn-nav-login {
            padding: 12px;
            text-align: center;
            width: 100%;
          }

          .mobile-cta-group .btn-nav-register {
            padding: 12px;
            text-align: center;
            width: 100%;
          }

          .hero-content h1 {
            font-size: 2.2rem;
          }

          .banner-container {
            flex-direction: column;
            text-align: center;
            padding: 30px;
          }

          .footer-grid {
            grid-template-columns: 1fr;
            text-align: center;
          }

          .footer-brand .logo {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
