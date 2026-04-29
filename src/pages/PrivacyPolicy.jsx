import React from 'react';
import StoreLayout from '../components/store/StoreLayout';
import { useStore } from '../context/StoreContext';
import '../styles/ecommerce.css';

const PrivacyPolicy = () => {
  const { storeInfo } = useStore();
  
  // Dynamic fields from StoreInfo
  const platformName = storeInfo?.name || 'المنصة';
  const whatsappNumber = storeInfo?.whatsappNumber || storeInfo?.phone1 || '';
  const email = storeInfo?.email || '';
  const websiteUrl = window.location.origin + '/store';
  const lastUpdated = '10 مايو 2025';

  return (
    <StoreLayout>
      <div className="ec-legal-page">
        <div className="ec-legal-container">
          <header className="ec-legal-header">
            <h1>سياسة الخصوصية</h1>
            <p className="ec-last-updated">آخر تحديث: {lastUpdated}</p>
          </header>

          <div className="ec-legal-content Arabic" dir="rtl">
            <section>
              <h2>مقدمة</h2>
              <p>
                في {platformName}، نحن ملتزمون بحماية خصوصيتك وسرية بياناتك. توضح هذه السياسة كيفية جمعنا واستخدامنا ومشاركتنا لمعلوماتك الشخصية عند استخدامك لمنصتنا أو التواصل معنا.
              </p>
              <p>باستخدامك لخدماتنا، فإنك توافق على الشروط الواردة في هذه السياسة.</p>
            </section>

            <section>
              <h2>1. البيانات التي نجمعها</h2>
              <ul>
                <li><strong>معلومات الحساب:</strong> الاسم، البريد الإلكتروني، رقم الهاتف، كلمة المرور المشفرة.</li>
                <li><strong>معلومات المتجر:</strong> اسم المتجر، المنتجات، الأسعار، بيانات المخزون.</li>
                <li><strong>معلومات الطلبات:</strong> تفاصيل الطلبات، بيانات الشحن، سجل المعاملات.</li>
                <li><strong>بيانات العملاء:</strong> معلومات عملاء المتاجر المسجلة على المنصة.</li>
                <li><strong>البيانات التقنية:</strong> عنوان IP، نوع الجهاز، المتصفح، نظام التشغيل.</li>
                <li><strong>بيانات الاستخدام:</strong> صفحات تم زيارتها، الميزات المستخدمة، مدة الجلسة.</li>
              </ul>
            </section>

            <section>
              <h2>2. كيفية استخدام البيانات</h2>
              <p>نستخدم بياناتك من أجل:</p>
              <ul>
                <li>تشغيل متجرك الإلكتروني وإدارة حسابك.</li>
                <li>معالجة الطلبات والمدفوعات.</li>
                <li>إرسال إشعارات وتحديثات تخص متجرك.</li>
                <li>تحسين أداء المنصة وتطويرها.</li>
                <li>توفير الدعم الفني عند الحاجة.</li>
                <li>الالتزام بالمتطلبات القانونية والتنظيمية.</li>
              </ul>
            </section>

            <section>
              <h2>3. مشاركة البيانات</h2>
              <p>قد نشارك بياناتك مع:</p>
              <ul>
                <li>بوابات الدفع لمعالجة المعاملات المالية.</li>
                <li>شركات الشحن والتوصيل لإتمام الطلبات.</li>
                <li>مزودي الخدمات التقنية مثل الاستضافة السحابية.</li>
                <li>الجهات القانونية عند الطلب الرسمي.</li>
              </ul>
              <div className="ec-legal-alert">
                <i className="fas fa-lock" style={{ marginLeft: '8px', color: 'var(--ec-primary)' }}></i> نؤكد أننا لا نبيع بياناتك أو بيانات عملائك لأي جهة لأغراض تسويقية.
              </div>
            </section>

            <section>
              <h2>4. ملفات تعريف الارتباط (Cookies)</h2>
              <p>نستخدم الكوكيز من أجل:</p>
              <ul>
                <li>الحفاظ على جلسة تسجيل الدخول.</li>
                <li>تذكُّر تفضيلاتك داخل المنصة.</li>
                <li>تحليل أداء المنصة وتحسين تجربة الاستخدام.</li>
              </ul>
              <p>يمكنك إدارة إعدادات الكوكيز من خلال متصفحك في أي وقت.</p>
            </section>

            <section>
              <h2>5. أمان البيانات</h2>
              <p>نطبق معايير أمان عالية تشمل:</p>
              <ul>
                <li>تشفير البيانات أثناء النقل باستخدام SSL/TLS.</li>
                <li>تشفير كلمات المرور وبيانات الدفع الحساسة.</li>
                <li>حماية الخوادم بجدران نارية وأنظمة مراقبة.</li>
                <li>تقييد الوصول على الفريق المصرح له فقط.</li>
                <li>نسخ احتياطي دوري للبيانات.</li>
              </ul>
            </section>

            <section>
              <h2>6. الاحتفاظ بالبيانات</h2>
              <p>نحتفظ ببياناتك طالما حسابك نشط على المنصة. عند إلغاء الاشتراك، يتم حذف بياناتك خلال 30 يوماً، إلا إذا كان الاحتفاظ بها مطلوباً قانونياً.</p>
            </section>

            <section>
              <h2>7. حقوقك</h2>
              <p>يحق لك في أي وقت:</p>
              <ul>
                <li>الاطلاع على بياناتك الشخصية المحفوظة لدينا.</li>
                <li>تعديل أو تصحيح بياناتك.</li>
                <li>طلب حذف حسابك وبياناتك بالكامل.</li>
                <li>تصدير بياناتك بصيغة قابلة للقراءة.</li>
                <li>الاعتراض على أي استخدام لبياناتك.</li>
              </ul>
            </section>

            <section>
              <h2>8. تحديثات السياسة</h2>
              <p>قد نقوم بتحديث هذه السياسة من وقت لآخر. سيتم إخطارك بأي تغييرات جوهرية عبر البريد الإلكتروني أو من خلال إشعار داخل المنصة.</p>
            </section>

            <section>
              <h2>9. تواصل معنا</h2>
              <div className="ec-contact-info">
                {email && <p><i className="fas fa-envelope" style={{ marginLeft: '8px' }}></i> <strong>البريد الإلكتروني:</strong> {email}</p>}
                {whatsappNumber && <p><i className="fab fa-whatsapp" style={{ marginLeft: '8px', color: '#25D366' }}></i> <strong>واتساب:</strong> {whatsappNumber}</p>}
                <p>🌐 <strong>الموقع الإلكتروني:</strong> <a href={websiteUrl} style={{ color: 'var(--ec-primary)', textDecoration: 'none', fontWeight: 'bold' }}>{websiteUrl}</a></p>
              </div>
            </section>
          </div>

          <footer className="ec-legal-footer-note" style={{ marginTop: '60px', paddingTop: '30px', borderTop: '1px solid #eee', textAlign: 'center', opacity: 0.8, fontSize: '0.95rem', fontWeight: '500' }}>
            جميع الحقوق محفوظة © 2025 – {platformName}
          </footer>
        </div>
      </div>
    </StoreLayout>
  );
};

export default PrivacyPolicy;
