import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Api from '../services/api';
import logoLandingLight from '../assets/img/logo-landing-light.png';
import logoLandingDark from '../assets/img/logo-landing-dark.png';
import { useTheme } from '../components/common/ThemeContext';
import systemImg from '../assets/img/landing-page/system.png';

import '../styles/pages/SeggleLanding.css';
import imgDashboard from '../assets/img/seggle/dashboard.png';
import imgPos from '../assets/img/seggle/pos.png';
import imgSales from '../assets/img/seggle/sales.png';
import imgReports from '../assets/img/seggle/reports.png';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);


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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  
  useEffect(() => {
    let ctx = gsap.context(() => {
        const isDesktop = window.matchMedia("(min-width: 769px)").matches;
        
        let showcaseTrigger = null;

        if (isDesktop) {
            gsap.fromTo(".mockup-frame", 
                { rotateX: 10, scale: 0.95, y: 20 },
                { 
                    scrollTrigger: {
                        trigger: ".hero-section.light-mode",
                        start: "top top",
                        end: "bottom center",
                        scrub: 1
                    },
                    rotateX: 0,
                    scale: 1,
                    y: -20,
                    boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
                    ease: "none"
                }
            );

            gsap.utils.toArray('.section-header h2, .section-header p, .feature-card, .bento-item').forEach(el => {
                gsap.from(el, {
                    scrollTrigger: {
                        trigger: el,
                        start: "top 85%"
                    },
                    y: 40,
                    opacity: 0,
                    duration: 1,
                    ease: "power3.out"
                });
            });

            // --- Sticky Scroll Tabs Logic ---
            window.isClickScrolling = false;
            window.currentActiveTab = 'dashboard';

            showcaseTrigger = ScrollTrigger.create({
                trigger: ".system-showcase",
                start: "top top", 
                end: "+=2500",    
                pin: true,
                onUpdate: (self) => {
                    if (window.isClickScrolling) return;

                    const progress = self.progress;
                    let activeIndex = 0;
                    
                    if (progress > 0.25 && progress <= 0.5) activeIndex = 1;
                    else if (progress > 0.5 && progress <= 0.75) activeIndex = 2;
                    else if (progress > 0.75) activeIndex = 3;
                    
                    const tabs = ['dashboard', 'pos', 'sales', 'reports'];
                    const newTab = tabs[activeIndex];
                    
                    if (window.currentActiveTab !== newTab) {
                        window.currentActiveTab = newTab;
                        setActiveTab(newTab);
                    }
                }
            });

            // Click Handlers for Tabs
            const tabNames = ['dashboard', 'pos', 'sales', 'reports'];
            tabNames.forEach((tab, index) => {
                const btn = document.getElementById(`btn-tab-${tab}`);
                if (btn) {
                    btn.addEventListener('click', () => {
                        if (!showcaseTrigger) return;
                        
                        const start = showcaseTrigger.start;
                        const end = showcaseTrigger.end;
                        const totalScroll = end - start;
                        
                        const targetProgress = 0.12 + index * 0.25;
                        const targetScroll = start + totalScroll * targetProgress;
                        
                        window.isClickScrolling = true;
                        window.currentActiveTab = tab;
                        setActiveTab(tab);
                        
                        window.scrollTo({
                            top: targetScroll,
                            behavior: 'smooth'
                        });
                        
                        setTimeout(() => {
                            window.isClickScrolling = false;
                        }, 800);
                    });
                }
            });

            setTimeout(() => {
                ScrollTrigger.sort();
                ScrollTrigger.refresh();
            }, 100);
        } else {
             // Mobile click handlers without scrolling pin
             const tabNames = ['dashboard', 'pos', 'sales', 'reports'];
             tabNames.forEach((tab) => {
                 const btn = document.getElementById(`btn-tab-${tab}`);
                 if (btn) {
                     btn.addEventListener('click', () => {
                         setActiveTab(tab);
                     });
                 }
             });
        }

        // --- Ring Cursor & 3D Tilt Logic ---
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

        document.addEventListener('mousemove', handleMouseMove);

        let animFrame;
        const render = () => {
            ringX += (mouseX - ringX) * 0.15;
            ringY += (mouseY - ringY) * 0.15;
            
            if (cursorRing) {
                cursorRing.style.left = ringX + 'px';
                cursorRing.style.top = ringY + 'px';
            }
            
            animFrame = window.requestAnimationFrame(render);
        };
        animFrame = window.requestAnimationFrame(render);

        // Hover states
        const hoverElements = document.querySelectorAll('a, button, .feature-card, .pricing-card, .tab-btn');
        const addHover = () => cursorRing && cursorRing.classList.add('hovering');
        const rmHover = () => cursorRing && cursorRing.classList.remove('hovering');
        
        hoverElements.forEach(el => {
            el.addEventListener('mouseenter', addHover);
            el.addEventListener('mouseleave', rmHover);
        });

        // Image Parallax
        const handleParallax = (e) => {
            const images = document.querySelectorAll(".tab-img");
            if (!images.length) return;
            const mx = e.clientX / window.innerWidth - 0.5;
            const my = e.clientY / window.innerHeight - 0.5;
            images.forEach(img => {
                const rotateX = my * -10; 
                const rotateY = mx * 10;
                img.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
                img.style.transition = "transform 0.1s ease-out";
            });
        };
        document.addEventListener("mousemove", handleParallax);

        // Extreme WOW Features (Glow Tracker, Tilt)
        const cards = document.querySelectorAll('.feature-card, .pricing-card, .bento-item');
        cards.forEach(card => {
            const handleCardMove = e => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                card.style.setProperty('--mouse-x', `${x}px`);
                card.style.setProperty('--mouse-y', `${y}px`);
                
                const intensity = card.classList.contains('pricing-card') ? 5 : 10;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = ((y - centerY) / centerY) * -intensity; 
                const rotateY = ((x - centerX) / centerX) * intensity;
                
                card.style.transform = `perspective(1500px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
                card.style.transition = "none";
            };
            const handleCardLeave = () => {
                card.style.transform = `perspective(1500px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
                card.style.transition = "transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)";
            };
            card.addEventListener('mousemove', handleCardMove);
            card.addEventListener('mouseleave', handleCardLeave);
        });

        // Magnetic Buttons
        const magButtons = document.querySelectorAll('.btn-primary, .btn-success');
        magButtons.forEach(btn => {
            const handleMagMove = e => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                
                btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
                btn.style.transition = "transform 0.1s ease-out";
            };
            const handleMagLeave = () => {
                btn.style.transform = `translate(0px, 0px)`;
                btn.style.transition = "transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)";
            };
            btn.addEventListener('mousemove', handleMagMove);
            btn.addEventListener('mouseleave', handleMagLeave);
        });
        
    });

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const user = Api._getUser();
    const token = Api._getToken();
    if (user && token) {
      setIsLoggedIn(true);
      navigate('/dashboard');
    }
  }, [navigate]);

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
      a: "نوفر لك تطبيق ديسكتوب (Desktop App) متخصص يمكنك تحميله مجاناً، والذي يضمن لك استمرارية العمل وإصدار الفواتير حتى في حالة انقطاع الإنترنت، ويقوم بالمزامنة التلقائية فور عودة الاتصال."
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
      benefits: ["تطبيق ديسكتوب للعمل بدون إنترنت", "إصدار وتعديل فوري للفاتورة", "تعليق المبيعات واستكمالها لاحقاً", "إرسال الفواتير للعملاء عبر WhatsApp"]
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

      {/* Hero Section (Seggle Style) */}
      <section className="hero-section light-mode">
          {/* Center Glow and Grid */}
          <div className="hero-center-glow"></div>
          <div className="hero-grid-bg"></div>

          <div className="container hero-content centered">
              <div className="hero-badge glossy"><i className="fa-solid fa-rocket" style={{ marginLeft: '8px' }}></i>النظام الأول للتحول الرقمي الموثوق</div>
              <h1 className="hero-title">الوضوح التام لأعمالك... <br/><span className="gradient-text">في شاشة واحدة.</span></h1>
              <p className="hero-subtitle">لا تكتفِ بإدارة أعمالك بل قُدها نحو المستقبل. Seggle يجمع المبيعات، المخزون، والمحاسبة في تجربة سحابية فاخرة تزيل التعقيد وتمنحك وقتاً للنمو.</p>
              <div className="hero-actions centered">
                  <button className="btn-success pulse-btn" onClick={() => navigate('/register')}>بدء الاستخدام مجانا</button>
                  <button className="btn-glass" onClick={() => document.getElementById('story')?.scrollIntoView({behavior: 'smooth'})}>شاهد كيف يعمل <span className="icon"><i className="fa-solid fa-arrow-down"></i></span></button>
              </div>

              {/* 3D Perspective Dashboard Preview */}
              <div className="hero-dashboard-preview perspective-wrapper large">
                  {/* Floating UI Icons */}
                  <div className="floating-icon icon-1"><i className="fa-solid fa-chart-line"></i></div>
                  <div className="floating-icon icon-2"><i className="fa-solid fa-shield-halved"></i></div>
                  <div className="floating-icon icon-3"><i className="fa-solid fa-circle-check"></i></div>
                  
                  <div className="mockup-frame tilt-effect">
                      <img src={imgDashboard} alt="Seggle ERP Dashboard" className="screenshot-img" />
                  </div>
              </div>
          </div>
      </section>

      {/* Social Proof Section */}
      <section className="social-proof">
          <div className="container">
              <p>يثق بنا أكثر من <span className="highlight">10,000+</span> نشاط تجاري للنمو بأعمالهم</p>
              <div className="logos-ticker">
                  <div className="ticker-track">
                      <div className="brand">شركة الأفق</div>
                      <div className="brand">مطاعم ليالي</div>
                      <div className="brand">مخابز القمح</div>
                      <div className="brand">مؤسسة التوريد</div>
                      <div className="brand">مجموعة السعد</div>
                      <div className="brand">شركة الأفق</div>
                      <div className="brand">مطاعم ليالي</div>
                      <div className="brand">مخابز القمح</div>
                      <div className="brand">مؤسسة التوريد</div>
                      <div className="brand">مجموعة السعد</div>
                  </div>
              </div>
          </div>
      </section>

      {/* Features Section (From Mockup) */}
      <section className="features-section" style={{ padding: '100px 0', background: 'var(--bg-light)' }}>
          <div className="container">
              <div className="section-header" style={{ marginBottom: '60px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--primary-color)', fontWeight: 'bold', marginBottom: '12px', fontSize: '1.1rem', letterSpacing: '1px' }}>التميز الهندسي</p>
                  <h2 className="h2_mob" style={{ color: 'var(--secondary-color)', fontSize: '2.8rem', maxWidth: '800px', margin: '0 auto', lineHeight: '1.4' }}>مصمم بأدق التفاصيل لتتحكم في كل زاوية من أعمالك، بكل أناقة.</h2>
              </div>
              
              <div className="features-grid bento-layout">
                  {/* 1. المبيعات (Wide) */}
                  <div className="feature-card wide" style={{ textAlign: 'right' }}>
                      <span className="feature_icon"><i className="fa-solid fa-bolt text-success" style={{ fontSize: '1.5rem', marginBottom: '15px' }}></i></span>
                      <h4 style={{ marginBottom: '10px', color: 'var(--text-dark)' }}>مبيعات لا تتوقف</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: '1.6' }}>تجربة كاشير فائقة السرعة تواكب أوقات الذروة، مع إمكانية العمل بدون إنترنت للحفاظ على انسيابية المبيعات.</p>
                  </div>
                  
                  {/* 2. المخزون (Tall) */}
                  <div className="feature-card tall" style={{ textAlign: 'right' }}>
                      <span className="feature_icon"><i className="fa-solid fa-boxes-stacked text-success" style={{ fontSize: '1.5rem', marginBottom: '15px' }}></i></span>
                      <h4 style={{ marginBottom: '10px', color: 'var(--text-dark)' }}>مخزون يتحدث إليك</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: '1.6' }}>تنبيهات استباقية ونظرة عميقة لحركة بضائعك عبر المستودعات، لضمان عدم نفاد أي صنف هام.</p>
                  </div>
                  
                  {/* 3. الحسابات */}
                  <div className="feature-card" style={{ textAlign: 'right' }}>
                      <span className="feature_icon"><i className="fa-solid fa-chart-pie text-success" style={{ fontSize: '1.5rem', marginBottom: '15px' }}></i></span>
                      <h4 style={{ marginBottom: '10px', color: 'var(--text-dark)' }}>محاسبة بلا عناء</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: '1.6' }}>تقارير مالية دقيقة وإقرارات ضريبية بضغطة زر واحدة.</p>
                  </div>
                  
                  {/* 4. المهام */}
                  <div className="feature-card" style={{ textAlign: 'right' }}>
                      <span className="feature_icon"><i className="fa-solid fa-users-gear text-success" style={{ fontSize: '1.5rem', marginBottom: '15px' }}></i></span>
                      <h4 style={{ marginBottom: '10px', color: 'var(--text-dark)' }}>تكامل فريقك</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: '1.6' }}>صلاحيات دقيقة وتتبع لمهام الموظفين وإنجازاتهم بدقة.</p>
                  </div>
                  
                  {/* 5. علاقات العملاء (Wide) */}
                  <div className="feature-card wide" style={{ textAlign: 'right' }}>
                      <span className="feature_icon"><i className="fa-solid fa-heart text-success" style={{ fontSize: '1.5rem', marginBottom: '15px' }}></i></span>
                      <h4 style={{ marginBottom: '10px', color: 'var(--text-dark)' }}>ولاء يصنع الفارق</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: '1.6' }}>افهم سلوك عملائك واصنع لهم عروضاً مخصصة تزيد من ارتباطهم بعلامتك التجارية وترفع مبيعاتك.</p>
                  </div>
              </div>
          </div>
      </section>

      {/* Custom Banner (From Mockup) */}
      <section className="custom-banner" style={{ padding: '60px 0', background: 'var(--bg-white)' }}>
          <div className="container ">
              <div className="mob_banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#EEF2FF', padding: '40px', borderRadius: '16px' }}>
                  <div className="banner-text" style={{ textAlign: 'right' }}>
                      <h2 style={{ color: '#1E3A8A', fontSize: '2.2rem', fontWeight: 800, marginBottom: '10px' }}>مصمم ليتأقلم مع قطاعك.. وليس العكس.</h2>
                      <p style={{ color: '#475569', fontSize: '1.15rem', margin: 0, lineHeight: 1.5 }}>نظام مرن يغير جلده ليطابق طريقتك في العمل، مهما كان مجال أعمالك.</p>
                  </div>
                  <button className="btn-primary" onClick={() => navigate('/register')}>شاهد مجالك</button>
              </div>
          </div>
      </section>

      {/* Interactive System Showcase Section */}
      <section className="system-showcase" id="story">
          <div className="container">
              {/* Tab Buttons at the very top */}
              <div className="tabs-navigation horizontal">
                  <button className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} id="btn-tab-dashboard">لوحة التحكم</button>
                  <button className={`tab-btn ${activeTab === 'pos' ? 'active' : ''}`} id="btn-tab-pos">نقطة البيع (POS)</button>
                  <button className={`tab-btn ${activeTab === 'sales' ? 'active' : ''}`} id="btn-tab-sales">المخزون والمبيعات</button>
                  <button className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`} id="btn-tab-reports">التقارير المالية</button>
              </div>

              <div className="showcase-content-wrapper">
                  {/* Dashboard Content */}
                  <div className={`tab-content ${activeTab === 'dashboard' ? 'active' : ''}`} id="tab-dashboard">
                      <div className="split-layout">
                          <div className="text-side">
                              <h3>نظرة شاملة ومفصلة على أعمالك</h3>
                              <p>شاشة رئيسية تجمع أهم مؤشرات الأداء، لتتمكن من مراقبة صحة عملك التجاري في ثوانٍ ومتابعة الإيرادات لحظة بلحظة.</p>
                              <ul className="feature-checks">
                                  <li><i className="fa-solid fa-check text-success"></i> عرض الإيرادات والمصروفات بصرياً.</li>
                                  <li><i className="fa-solid fa-check text-success"></i> متابعة أداء الموظفين والفروع.</li>
                                  <li><i className="fa-solid fa-check text-success"></i> واجهة قابلة للتخصيص الكامل.</li>
                                  <li><i className="fa-solid fa-check text-success"></i> تصدير البيانات بنقرة واحدة.</li>
                              </ul>
                              <button className="btn-primary" onClick={() => navigate('/register')}>ابدأ استخدامك</button>
                          </div>
                          <div className="image-side">
                              <div className="visual-frame">
                                  <img src={imgDashboard} alt="Dashboard Screen" className="tab-img" />
                              </div>
                              <button className="btn-text skip-btn" onClick={() => document.getElementById('industries').scrollIntoView({behavior: 'smooth'})}>
                                  تخطي هذا القسم <i className="fa-solid fa-arrow-down"></i>
                              </button>
                          </div>
                      </div>
                  </div>

                  {/* POS Content */}
                  <div className={`tab-content ${activeTab === 'pos' ? 'active' : ''}`} id="tab-pos">
                      <div className="split-layout">
                          <div className="text-side">
                              <h3>أسرع كاشير سحابي لعمليات البيع اليومية</h3>
                              <p>أدر مبيعاتك بسرعة فائقة، واجهة كاشير سهلة الاستخدام لا تحتاج لأي تدريب معقد وتدعم كافة أجهزة الباركود والطباعة.</p>
                              <ul className="feature-checks">
                                  <li><i className="fa-solid fa-check text-success"></i> واجهة بيع سريعة وسهلة.</li>
                                  <li><i className="fa-solid fa-check text-success"></i> دعم الدفع المتعدد (نقدي، بطاقة، آجل).</li>
                                  <li><i className="fa-solid fa-check text-success"></i> العمل بدون إنترنت (Offline).</li>
                                  <li><i className="fa-solid fa-check text-success"></i> إدارة الورديات والجرد اليومي.</li>
                              </ul>
                              <button className="btn-primary" onClick={() => navigate('/register')}>ابدأ استخدامك</button>
                          </div>
                          <div className="image-side">
                              <div className="visual-frame">
                                  <img src={imgPos} alt="POS Screen" className="tab-img" />
                              </div>
                              <button className="btn-text skip-btn" onClick={() => document.getElementById('industries').scrollIntoView({behavior: 'smooth'})}>
                                  تخطي هذا القسم <i className="fa-solid fa-arrow-down"></i>
                              </button>
                          </div>
                      </div>
                  </div>

                  {/* Sales Content */}
                  <div className={`tab-content ${activeTab === 'sales' ? 'active' : ''}`} id="tab-sales">
                      <div className="split-layout">
                          <div className="text-side">
                              <h3>إدارة مخزون ومبيعات لحظية فائقة الدقة</h3>
                              <p>راقب حركات المخزون بدقة تامة، انقل البضائع، وراجع فواتير المبيعات بكل وضوح لضمان عدم نفاد أي صنف.</p>
                              <ul className="feature-checks">
                                  <li><i className="fa-solid fa-check text-success"></i> تنبيهات النواقص التلقائية.</li>
                                  <li><i className="fa-solid fa-check text-success"></i> جرد مستمر بدون إغلاق الفرع.</li>
                                  <li><i className="fa-solid fa-check text-success"></i> ربط الفروع والمستودعات.</li>
                                  <li><i className="fa-solid fa-check text-success"></i> تتبع تواريخ الصلاحية والباتش.</li>
                              </ul>
                              <button className="btn-primary" onClick={() => navigate('/register')}>ابدأ استخدامك</button>
                          </div>
                          <div className="image-side">
                              <div className="visual-frame">
                                  <img src={imgSales} alt="Sales Screen" className="tab-img" />
                              </div>
                              <button className="btn-text skip-btn" onClick={() => document.getElementById('industries').scrollIntoView({behavior: 'smooth'})}>
                                  تخطي هذا القسم <i className="fa-solid fa-arrow-down"></i>
                              </button>
                          </div>
                      </div>
                  </div>

                  {/* Reports Content */}
                  <div className={`tab-content ${activeTab === 'reports' ? 'active' : ''}`} id="tab-reports">
                      <div className="split-layout">
                          <div className="text-side">
                              <h3>قرارات مبنية على أرقام دقيقة وتقارير شاملة</h3>
                              <p>تقارير مالية شاملة جاهزة للمحاسب بنقرة واحدة لنوجه أعمالك نحو النمو المستدام وزيادة الأرباح بشكل فعال.</p>
                              <ul className="feature-checks">
                                  <li><i className="fa-solid fa-check text-success"></i> تقارير أرباح وخسائر لحظية.</li>
                                  <li><i className="fa-solid fa-check text-success"></i> إقرارات ضريبية جاهزة للاعتماد.</li>
                                  <li><i className="fa-solid fa-check text-success"></i> تحليل المبيعات والأصناف الراكدة.</li>
                                  <li><i className="fa-solid fa-check text-success"></i> ميزانية عمومية دقيقة.</li>
                              </ul>
                              <button className="btn-primary" onClick={() => navigate('/register')}>ابدأ استخدامك</button>
                          </div>
                          <div className="image-side">
                              <div className="visual-frame">
                                  <img src={imgReports} alt="Reports Screen" className="tab-img" />
                              </div>
                              <button className="btn-text skip-btn" onClick={() => document.getElementById('industries').scrollIntoView({behavior: 'smooth'})}>
                                  تخطي هذا القسم <i className="fa-solid fa-arrow-down"></i>
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* Industries Section */}
      <section className="industries-section light-mode" id="industries">
          <div className="container">
              <div className="section-header">
                  <h2>مصمم خصيصاً ليتكيف مع نشاطك</h2>
                  <p>مهما كان مجالك، لدينا الأدوات التقنية التي تضمن لك التشغيل بسلاسة.</p>
              </div>
              <div className="bento-grid">
                  <div className="bento-item wide">
                      <div className="bento-content">
                          <h3>المقاهي والمطاعم <i className="fa-solid fa-mug-hot" style={{ color: 'var(--primary-color)' }}></i></h3>
                          <p>إدارة الطاولات بدقة، الوصفات والمكونات، شاشات المطبخ (KDS) المباشرة، وتطبيقات التوصيل لتقليل أوقات الانتظار.</p>
                      </div>
                  </div>
                  <div className="bento-item">
                      <div className="bento-content">
                          <h3>تجارة التجزئة <i className="fa-solid fa-store" style={{ color: 'var(--primary-color)' }}></i></h3>
                          <p>نقاط بيع سريعة تدعم الباركود، وإدارة عروض وخصومات مرنة لجذب العملاء.</p>
                      </div>
                  </div>
                  <div className="bento-item">
                      <div className="bento-content">
                          <h3>الخدمات اللوجستية <i className="fa-solid fa-truck" style={{ color: 'var(--primary-color)' }}></i></h3>
                          <p>تتبع مباشر للأسطول وإدارة الشحنات وفواتير النقل لتنظيم عملياتك.</p>
                      </div>
                  </div>
                  <div className="bento-item wide">
                      <div className="bento-content">
                          <h3>الشركات والمكاتب <i className="fa-solid fa-building" style={{ color: 'var(--primary-color)' }}></i></h3>
                          <p>نظام موارد بشرية متكامل، محاسبة متقدمة مع مراكز التكلفة، ودورة مستندية كاملة ومرنة تناسب حجم أعمالك.</p>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing-section light-mode" id="pricing">
          <div className="container">
              <div className="section-header">
                  <h2>استثمر في نمو أعمالك</h2>
                  <p>خطط أسعار واضحة ومرنة، بدون أي تكاليف خفية. ابدأ اليوم ورقي باقتك لاحقاً.</p>
              </div>

              <div className="pricing-toggle">
                  <span className={!isYearly ? 'active' : ''}>دفع شهري</span>
                  <label className="switch">
                      <input type="checkbox" checked={isYearly} onChange={(e) => setIsYearly(e.target.checked)} />
                      <span className="slider"></span>
                  </label>
                  <span className={isYearly ? 'active' : ''}>دفع سنوي <span className="save-badge">وفر 20%</span></span>
              </div>



                  {/* الباقة المتقدمة */}
                  <div className="pricing-card popular" style={{ maxWidth: '450px', margin: '0 auto' }}>
                      <div className="popular-badge">الأكثر اختياراً</div>
                      <h3>الباقة المتقدمة</h3>
                      <div className="price-box">
                          <span className="price-amount">{isYearly ? '340' : '399'}</span>
                          <span className="price-currency">ج.م</span>
                          <span className="price-period">/ شهر</span>
                      </div>
                      {isYearly && (
                          <div className="annual-total" style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '-5px', marginBottom: '15px', fontWeight: '500' }}>
                              يُدفع سنوياً: <span style={{ color: 'var(--primary-color)', fontWeight: '700' }}>4080</span> ج.م
                          </div>
                      )}
                      <ul className="features-list">
                          <li>عدد لا محدود من نقاط البيع</li>
                          <li>عدد لا محدود من المستخدمين</li>
                          <li>إدارة فروع متعددة</li>
                          <li>دعم فني عبر الهاتف 24/7</li>
                      </ul>
                      <button className="btn-primary" onClick={() => navigate('/register')}>اشترك واضمن نموك</button>
                  </div>

          
          </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section" style={{ padding: '80px 0', background: 'var(--bg-light)' }} id="faq">
          <div className="container">
              <div className="section-header" style={{ textAlign: 'center', marginBottom: '50px' }}>
                  <h2 style={{ color: 'var(--text-dark)', fontSize: '2.2rem', marginBottom: '10px' }}>لديك أسئلة؟ نحن نوفر لك الإجابات</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>جمعنا لك الإجابات لأكثر الأسئلة شيوعاً لتبدأ استخدام النظام وأنت مطمئن.</p>
              </div>
              <div className="faq-accordion" style={{ maxWidth: '800px', margin: '0 auto' }}>
                  {faqData.map((faq, index) => (
                  <div className="faq-item" style={{ borderBottom: '1px solid var(--border-light)', padding: '20px 0' }} key={index}>
                      <div className="faq-question" onClick={() => toggleFaq(index)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: 'var(--primary-color)', fontWeight: 'bold', fontSize: '1.15rem', transition: 'color 0.3s' }}>
                          {faq.q}
                          <div style={{ background: openFaq === index ? 'var(--primary-color)' : '#f1f5f9', color: openFaq === index ? '#fff' : 'var(--primary-color)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
                            <i className={`fa-solid ${openFaq === index ? 'fa-minus' : 'fa-plus'}`}></i>
                          </div>
                      </div>
                      <div className="faq-answer-panel" style={{ 
                        maxHeight: openFaq === index ? '300px' : '0', 
                        overflow: 'hidden', 
                        transition: 'max-height 0.4s ease-in-out',
                        opacity: openFaq === index ? 1 : 0,
                      }}>
                          <p style={{ marginTop: '15px', color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: '1.7' }}>{faq.a}</p>
                      </div>
                  </div>
                  ))}
              </div>
          </div>
      </section>

      {/* Dark Footer CTA */}
      <section className="dark-cta" style={{ backgroundColor: 'var(--secondary-color)', padding: '80px 0', textAlign: 'center', color: 'white' }}>
          <div className="container">
              <h2 style={{ fontSize: '2.5rem', marginBottom: '20px', color: 'white' }}>ابدأ الآن في تنظيم وإدارة أعمالك بكفاءة متناهية</h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.2rem', marginBottom: '40px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
                  انضم لآلاف الشركات التي تثق بنظامنا وارفع إنتاجيتك من اليوم الأول.
              </p>
              <button className="btn-success" onClick={() => navigate('/register')}>ابدأ استخدامك مجاناً</button>
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
            <p>
              واتساب:{' '}
              <a href={`https://wa.me/${(config?.supportPhone || '201281018810').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', direction: 'ltr', display: 'inline-block' }}>
                {config?.supportPhone || '+201281018810'}
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

      {/* Custom Cursor */}
      <div className="cursor-dot"></div>
      <div className="cursor-ring"></div>
    </div>
  );
};

export default LandingPage;
