import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Api from '../services/api';
import logo2 from '../assets/img/logo2.png';

const TermsOfUseCorp = () => {
  const [logoUrl, setLogoUrl] = useState(logo2);
  const [softwareName, setSoftwareName] = useState('بسيط ERP');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Monitor scroll for header background
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Fetch global config for logo and name
    Api.getGlobalConfig()
      .then((cfg) => {
        if (cfg) {
          if (cfg.logoUrl) setLogoUrl(cfg.logoUrl);
          if (cfg.softwareName) setSoftwareName(cfg.softwareName);
        }
      })
      .catch((err) => console.error('Error loading global config:', err));
  }, []);

  const lastUpdated = '23 مايو 2026';

  return (
    <div className="legal-layout">
      {/* Pristine Light Header */}
      <header className={`landing-header ${scrolled ? 'header-scrolled' : ''}`}>
        <div className="container header-container">
          <Link to="/" className="logo-section">
            <img src={logoUrl} alt={softwareName} className="brand-logo-img" />
            <span className="brand-logo-text">{softwareName}</span>
          </Link>
          <div className="header-cta-group">
            <Link to="/" className="btn-back-home">العودة للرئيسية ←</Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="legal-main">
        <div className="container">
          <div className="legal-card">
            <header className="legal-card-header">
              <span className="badge">الصفحات القانونية</span>
              <h1>شروط وأحكام الاستخدام</h1>
              <p className="last-updated">آخر تحديث: {lastUpdated}</p>
            </header>

            <div className="legal-content" dir="rtl">
              <p className="intro-text">
                مرحباً بكم في منصة <strong>{softwareName}</strong>. يرجى قراءة شروط الاستخدام هذه بعناية قبل البدء في استخدام المنصة أو تسجيل حساب جديد. استخدامك للمنصة أو اشتراكك في أي من باقاتنا يعني موافقتك الكاملة والملزمة على كافة البنود الواردة أدناه.
              </p>

              <section className="legal-section">
                <h2>1. قبول شروط الخدمة</h2>
                <p>
                  من خلال إنشاء حساب أو استخدام منصة {softwareName} (سواء كصاحب عمل، مدير نظام، أو كاشير)، فإنك تقر بأنك قد قرأت هذه الشروط وفهمتها ووافقت على الالتزام بها بالكامل وبموجب القوانين واللوائح المعمول بها. إذا كنت لا توافق على هذه الشروط، يرجى عدم التسجيل أو استخدام المنصة.
                </p>
              </section>

              <section className="legal-section">
                <h2>2. وصف الخدمة</h2>
                <p>
                  منصة {softwareName} هي نظام تخطيط موارد المؤسسات (ERP) سحابي متكامل يعمل بنظام البرمجيات كخدمة (SaaS). يقدم النظام حلولاً لإدارة نقاط البيع (POS)، المخازن والمستودعات، الحسابات المالية والقيود اليومية، شؤون الموظفين والمرتبات، وتكامل المتجر الإلكتروني. ونوفر الترخيص السحابي للمستخدمين وفقاً للباقات والاشتراكات المتاحة.
                </p>
              </section>

              <section className="legal-section">
                <h2>3. إنشاء الحساب وأمان البيانات</h2>
                <ul>
                  <li>يتعهد العميل بتقديم معلومات صحيحة ودقيقة وكاملة أثناء عملية التسجيل (اسم المؤسسة، البريد الإلكتروني، رقم الجوال).</li>
                  <li>العميل هو المسؤول الأول والوحيد عن الحفاظ على سرية بيانات تسجيل الدخول وكلمة المرور الخاصة بحسابه، وعن كافة الأنشطة التي تتم بموجب حسابه.</li>
                  <li>يتعهد العميل بإبلاغ الدعم الفني للمنصة فوراً بأي استخدام غير مصرح به أو اختراق أمني لحسابه.</li>
                </ul>
              </section>

              <section className="legal-section">
                <h2>4. الاستخدام المقبول والامتثال للقوانين</h2>
                <p>
                  يلتزم العميل باستخدام المنصة للأغراض التجارية المشروعة فقط ووفقاً للأنظمة والتشريعات المحلية. يلتزم العميل بشكل خاص بما يلي:
                </p>
                <ul>
                  <li>الامتثال لمتطلبات الفاتورة الإلكترونية واللوائح الضريبية والزكوية المعمول بها في بلده (مثل هيئة الضرائب والجمارك).</li>
                  <li>عدم استخدام النظام لترويج أو بيع منتجات أو بضائع غير قانونية أو منتهكة للحقوق الملكية الفكرية.</li>
                  <li>عدم محاولة إلحاق الضرر بالبنية التحتية السحابية للمنصة أو إبطاء أدائها بأي شكل من الأشكال.</li>
                </ul>
              </section>

              <section className="legal-section">
                <h2>5. الاشتراكات، الفوترة، والتجديد</h2>
                <ul>
                  <li>يتم احتساب رسوم الخدمة بناءً على الباقة المختارة (باقة فردية، احترافية، أو باقة المؤسسات) ووفقاً لدورة الفوترة (شهرياً أو سنوياً).</li>
                  <li>يتم تجديد الاشتراكات تلقائياً في نهاية كل فترة محاسبية ما لم يقم العميل بإلغاء التجديد التلقائي أو إلغاء الحساب من لوحة التحكم قبل موعد الاستحقاق بـ 24 ساعة على الأقل.</li>
                  <li>جميع الأسعار والرسوم معلنة على الموقع الرسمي بالجنيه المصري (ج.م) أو العملات المحددة، وقد تخضع للتحديث مع إشعار العملاء مسبقاً.</li>
                </ul>
              </section>

              <section className="legal-section">
                <h2>6. سياسة الاسترجاع وإلغاء الاشتراك</h2>
                <p>
                  نظراً لطبيعة الخدمات السحابية الرقمية الجاهزة فورياً للاستخدام، فإن رسوم الاشتراكات غير قابلة للاسترداد بعد تفعيل الباقة وبدء فترة الاستخدام الفعلي. في حال الرغبة في التوقف، يمكن للعميل إلغاء الاشتراك في أي وقت وسيظل حسابه نشطاً حتى نهاية الفترة المدفوعة دون تجديد للفترات التالية.
                </p>
              </section>

              <section className="legal-section">
                <h2>7. الملكية الفكرية</h2>
                <p>
                  إن كافة الأكواد المصدرية، وتصميمات الواجهات، والشعارات، والرسومات، والعلامات التجارية الخاصة بـ {softwareName} هي ملكية فكرية حصرية للمنصة ومحمية بموجب قوانين حماية الملكية الفكرية الدولية والمحلية. يمنع منعاً باتاً نسخ، تعديل، أو إعادة توزيع أي جزء من أجزاء المنصة دون إذن كتابي صريح من إدارة المنصة.
                </p>
              </section>

              <section className="legal-section">
                <h2>8. حدود المسؤولية وإخلاء الطرف</h2>
                <ul>
                  <li>يتم تقديم خدمات {softwareName} "كما هي" دون أي ضمانات صريحة أو ضمنية بالتشغيل المستمر دون انقطاع لأسباب تقنية خارجة عن إرادتنا أو ترتبط بانقطاع شبكات الإنترنت لدى العميل.</li>
                  <li>لا نتحمل أي مسؤولية عن خسائر الأرباح، المبيعات، أو فقدان البيانات الناتج عن سوء إدارة العميل لحسابه، أو إعطاء صلاحيات خاطئة لموظفيه داخل النظام.</li>
                  <li>يتعهد العميل بعمل نسخ احتياطي دوري لبياناته المالية والتشغيلية عبر أدوات التصدير المتاحة بالنظام لضمان حماية بياناته الشخصية.</li>
                </ul>
              </section>

              <section className="legal-section">
                <h2>9. التعديلات على شروط الاستخدام</h2>
                <p>
                  نحتفظ بالحق الكامل في تعديل أو تحديث شروط الاستخدام هذه في أي وقت. وسيتم نشر الشروط المحدثة على هذه الصفحة مع تعديل تاريخ "آخر تحديث". استمرارك في استخدام النظام بعد نشر التعديلات يعد قبولاً صريحاً لها.
                </p>
              </section>

              <section className="legal-section">
                <h2>10. التواصل معنا</h2>
                <p>
                  إذا كان لديك أي استفسار أو شكوى بخصوص شروط وأحكام الاستخدام، يرجى عدم التردد في التواصل مع فريق الدعم القانوني والفني مباشرة:
                </p>
                <div className="contact-card-grid">
                  <a href="mailto:support@digitalrace.net" className="contact-card">
                    <span className="icon">✉</span>
                    <span className="title">الدعم الفني والبريد</span>
                    <span className="value">support@digitalrace.net</span>
                  </a>
                  <a href="https://wa.me/201281018810" target="_blank" rel="noopener noreferrer" className="contact-card">
                    <span className="icon" style={{ color: '#25D366' }}>💬</span>
                    <span className="title">واتساب الدعم المباشر</span>
                    <span className="value">201281018810+</span>
                  </a>
                </div>
              </section>
            </div>

          </div>
        </div>
      </main>

      {/* Footer styled perfectly */}
      <footer className="landing-footer">
        <div className="container footer-grid">
          <div className="footer-brand-info">
            <div className="footer-brand-title">
              <img src={logoUrl} alt={softwareName} />
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
            <p>الدعم الفني: support@digitalrace.net</p>
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

      {/* Styled perfectly inside self-contained blocks */}
      <style>{`
        .legal-layout {
          background-color: #f8fafc;
          min-height: 100vh;
          font-family: 'Cairo', sans-serif;
          direction: rtl;
          text-align: right;
          color: #1e293b;
          padding-top: 100px;
          padding-bottom: 60px;
        }

        .container {
          width: 100%;
          max-width: 1000px;
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
        }

        .btn-back-home {
          background-color: #2563eb;
          color: #ffffff;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.9rem;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .btn-back-home:hover {
          background-color: #1d4ed8;
          transform: translateY(-1px);
        }

        /* ─── Legal Card ─── */
        .legal-main {
          margin-top: 30px;
        }

        .legal-card {
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
          border: 1px solid #f1f5f9;
          padding: 50px 48px;
        }

        .legal-card-header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 30px;
        }

        .legal-card-header .badge {
          background-color: rgba(37, 99, 235, 0.08);
          color: #2563eb;
          padding: 6px 16px;
          border-radius: 50px;
          font-size: 0.85rem;
          font-weight: 700;
          display: inline-block;
          margin-bottom: 12px;
        }

        .legal-card-header h1 {
          font-size: 2.2rem;
          font-weight: 850;
          color: #0f172a;
          margin: 0 0 10px 0;
        }

        .legal-card-header .last-updated {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 600;
          margin: 0;
        }

        /* ─── Legal Content ─── */
        .legal-content .intro-text {
          font-size: 1.1rem;
          line-height: 1.8;
          color: #334155;
          margin-bottom: 40px;
        }

        .legal-section {
          margin-bottom: 35px;
        }

        .legal-section h2 {
          font-size: 1.35rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 16px;
          border-right: 4px solid #2563eb;
          padding-right: 12px;
        }

        .legal-section p {
          font-size: 1rem;
          line-height: 1.8;
          color: #475569;
          margin-bottom: 14px;
        }

        .legal-section ul {
          padding-right: 20px;
          margin-bottom: 14px;
        }

        .legal-section li {
          font-size: 1rem;
          line-height: 1.8;
          color: #475569;
          margin-bottom: 8px;
          position: relative;
        }

        /* ─── Contact Cards ─── */
        .contact-card-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-top: 24px;
        }

        .contact-card {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .contact-card:hover {
          border-color: #2563eb;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.05);
        }

        .contact-card .icon {
          font-size: 2rem;
          margin-bottom: 8px;
        }

        .contact-card .title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #64748b;
          margin-bottom: 4px;
        }

        .contact-card .value {
          font-size: 1.05rem;
          font-weight: 800;
          color: #0f172a;
        }

        @media (max-width: 768px) {
          .legal-card {
            padding: 35px 24px;
          }
          .legal-card-header h1 {
            font-size: 1.8rem;
          }
          .contact-card-grid {
            grid-template-columns: 1fr;
          }
        }

        /* ─── Footer Section ─── */
        .landing-footer {
          background-color: #ffffff;
          border-top: 1px solid #e2e8f0;
          padding: 70px 0 0 0;
          margin-top: 80px; /* Give it space from the card */
          width: 100%;
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

        @media (max-width: 1024px) {
          .footer-grid {
            grid-template-columns: 1.5fr 1fr;
          }
        }

        @media (max-width: 768px) {
          .footer-grid {
            grid-template-columns: 1fr;
            gap: 30px;
          }
        }
      `}</style>
    </div>
  );
};

export default TermsOfUseCorp;
