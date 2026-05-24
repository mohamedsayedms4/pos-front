import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Api, { SERVER_URL } from '../services/api';
import logo2 from '../assets/img/logo2.png';

// Simple SVG Icons to replace MUI
const Icons = {
  Business: (props) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="10" width="20" height="12" rx="2" /><path d="M6 10V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6" /></svg>,
  Email: (props) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /><rect width="20" height="14" x="2" y="5" rx="2" /></svg>,
  Phone: (props) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
  Language: (props) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" x2="22" y1="12" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
  Lock: (props) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  CheckCircle: (props) => <svg {...props} width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--metro-teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
  ArrowForward: (props) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
  RocketLaunch: (props) => <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-5c1.62-2.2 5-3 5-3" /><path d="M12 15v5s3.03-.55 5-2c2.2-1.62 3-5 3-5" /></svg>
};

const TenantRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    slug: '',
    adminEmail: '',
    adminName: '',
    password: '',
    phone: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSlugChange = (e) => {
    // Keep slug alphanumeric and hyphens
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setFormData({ ...formData, slug: val });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      // 1. Register the new tenant
      await axios.post(`${serverUrl}/api/public/tenants/register`, formData);

      // 2. Resolve tenant ID from slug
      const resolveRes = await fetch(`${serverUrl}/api/public/tenants/resolve/${encodeURIComponent(formData.slug)}`);
      if (!resolveRes.ok) throw new Error('تعذر التحقق من بيانات الشركة بعد التسجيل');
      const tenantData = await resolveRes.json();

      // 3. Auto-login — no need to ask the user to log in again
      await Api.login(formData.adminEmail, formData.password, tenantData.id);

      // 4. Go straight to the dashboard
      navigate('/dashboard');
    } catch (err) {
      alert(err.response?.data || err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="tenant-register-page">
      <div className="register-left">
        <div className="register-card">
          <div className="register-header">
            <Link to="/" style={{ display: 'inline-block' }}>
              <img src={logo2} alt="Logo" className="register-logo" />
            </Link>
            <h2>إنشاء حساب جديد</h2>
            <p>ابدأ رحلتك في إدارة أعمالك باحترافية</p>
          </div>

          <form className="register-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label>الاسم التجاري *</label>
              <div className="input-with-icon">
                <Icons.Business className="icon" />
                <input
                  type="text"
                  name="businessName"
                  placeholder="مثال: صيدلية الأمل"
                  required
                  value={formData.businessName}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="input-group">
              <label>البريد الإلكتروني *</label>
              <div className="input-with-icon">
                <Icons.Email className="icon" />
                <input
                  type="email"
                  name="adminEmail"
                  placeholder="name@company.com"
                  required
                  value={formData.adminEmail}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="input-group">
              <label>رقم الجوال *</label>
              <div className="input-with-icon">
                <Icons.Phone className="icon" />
                <input
                  type="tel"
                  name="phone"
                  placeholder="01xxxxxxxxx"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="input-group">
              <label>رابط صفحة الدخول *</label>
              <div className="input-with-icon slug-input">
                <Icons.Language className="icon" />
                <input
                  type="text"
                  name="slug"
                  placeholder="my-business"
                  required
                  value={formData.slug}
                  onChange={handleSlugChange}
                />
                <span className="slug-suffix">.pos.com</span>
              </div>
              <small>هذا الرابط ستستخدمه أنت وموظفوك للدخول للنظام</small>
            </div>

            <div className="input-group">
              <label>كلمة السر *</label>
              <div className="input-with-icon">
                <Icons.Lock className="icon" />
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            <button type="submit" className="btn-register" disabled={loading}>
              {loading ? 'جاري إنشاء الحساب وتسجيل الدخول...' : 'ابدأ الاستخدام مجاناً الآن'}
              {!loading && <Icons.ArrowForward className="btn-icon" />}
            </button>

            <div className="form-footer">
              بتسجيلك، فإنك توافق على <Link to="/terms">الشروط والأحكام</Link>
              <p style={{ marginTop: '8px' }}>هل لديك حساب بالفعل؟ <Link to="/login">تسجيل الدخول</Link></p>
            </div>
          </form>
        </div>
      </div>

      <div className="register-right">
        <div className="marketing-content">
          <div className="marketing-badge">
            <Icons.RocketLaunch className="badge-icon" />
            <span>بسيط ERP المتكامل</span>
          </div>
          <h1>كل ما تحتاجه لإدارة أعمالك في برنامج واحد!</h1>
          <ul className="feature-list">
            <li>
              <div className="dot" />
              <div>
                <strong>المبيعات ونقاط البيع:</strong> واجهة بيع سريعة وسهلة.
              </div>
            </li>
            <li>
              <div className="dot" />
              <div>
                <strong>المخازن والمنتجات:</strong> إدارة دقيقة للمخزون والتنبيهات.
              </div>
            </li>
            <li>
              <div className="dot" />
              <div>
                <strong>الحسابات العامة:</strong> تقارير مالية وضرائب تلقائية.
              </div>
            </li>
            <li>
              <div className="dot" />
              <div>
                <strong>إدارة العملاء:</strong> برامج ولاء وقاعدة بيانات متكاملة.
              </div>
            </li>
          </ul>
        </div>
      </div>

      <style>{`
        .tenant-register-page {
          display: flex;
          min-height: 100vh;
          background: var(--bg-black);
          color: var(--text-white);
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          direction: rtl;
        }

        .register-left {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: var(--bg-black);
        }

        .register-card {
          background: var(--bg-dark);
          width: 100%;
          max-width: 500px;
          padding: 3rem;
          border-radius: 12px;
          border: 1px solid var(--border-subtle);
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          backdrop-filter: blur(20px);
          animation: metroSlideUp 0.5s cubic-bezier(0.1, 0.8, 0.2, 1) both;
        }

        @keyframes metroSlideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .register-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .register-logo {
          height: 60px;
          object-fit: contain;
          margin-bottom: 1.25rem;
        }

        .register-header h2 {
          color: var(--text-white);
          margin-bottom: 0.5rem;
          font-size: 1.9rem;
          font-weight: 700;
        }

        .register-header p {
          color: var(--text-muted);
          font-size: 0.95rem;
        }

        .register-form .input-group {
          margin-bottom: 1.5rem;
        }

        .register-form label {
          display: block;
          margin-bottom: 0.6rem;
          color: var(--text-muted);
          font-weight: 600;
          font-size: 0.85rem;
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-with-icon .icon {
          position: absolute;
          right: 14px;
          color: var(--text-dim);
          width: 18px;
          height: 18px;
          pointer-events: none;
        }

        .input-with-icon input {
          width: 100%;
          padding: 14px 46px 14px 14px;
          background: var(--bg-input);
          border: 1px solid var(--border-input);
          border-radius: 6px;
          color: var(--text-white);
          font-size: 0.95rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
        }

        .input-with-icon input:focus {
          border-color: var(--metro-blue);
          background: var(--bg-dark);
          box-shadow: 0 0 0 3px rgba(0, 120, 215, 0.15);
        }

        .slug-input .slug-suffix {
          position: absolute;
          left: 14px;
          color: var(--text-dim);
          font-weight: 600;
          font-size: 0.95rem;
          direction: ltr;
        }

        .slug-input input {
          padding-left: 80px;
        }

        .register-form small {
          display: block;
          margin-top: 0.5rem;
          color: var(--text-dim);
          font-size: 0.75rem;
        }

        .btn-register {
          width: 100%;
          background: var(--metro-blue);
          color: white;
          border: none;
          padding: 14px;
          border-radius: 6px;
          font-size: 1.05rem;
          font-weight: 700;
          cursor: pointer;
          margin-top: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px rgba(0, 120, 215, 0.2);
        }

        .btn-register:hover:not(:disabled) {
          background: var(--metro-dark-blue);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 120, 215, 0.35);
        }

        .btn-register:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-register:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .form-footer {
          margin-top: 2rem;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.85rem;
          line-height: 1.6;
        }

        .form-footer a {
          color: var(--metro-blue);
          text-decoration: none;
          font-weight: 600;
        }

        .form-footer a:hover {
          text-decoration: underline;
        }

        .register-right {
          flex: 1;
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #020617 100%);
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          color: #ffffff !important;
        }

        .register-right::before,
        .register-right::after {
          content: '';
          position: absolute;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.25;
          pointer-events: none;
        }
        .register-right::before {
          background: var(--metro-blue);
          top: 10%;
          right: 10%;
          animation: floatOrb1 15s infinite alternate;
        }
        .register-right::after {
          background: var(--metro-purple);
          bottom: 10%;
          left: 10%;
          animation: floatOrb2 15s infinite alternate;
        }

        @keyframes floatOrb1 {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(50px, 50px) scale(1.2); }
        }
        @keyframes floatOrb2 {
          0% { transform: translate(0, 0) scale(1.2); }
          100% { transform: translate(-50px, -50px) scale(1); }
        }

        @media (max-width: 1024px) {
          .register-right { display: none; }
        }

        .marketing-content {
          max-width: 500px;
          z-index: 10;
          color: #ffffff !important;
        }

        .marketing-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(0, 120, 215, 0.15);
          border: 1px solid rgba(0, 120, 215, 0.3);
          color: #60a5fa !important;
          padding: 8px 18px;
          border-radius: 50px;
          margin-bottom: 2rem;
          font-weight: 600;
          font-size: 0.9rem;
          backdrop-filter: blur(5px);
        }

        .marketing-content h1 {
          font-size: 2.6rem;
          line-height: 1.3;
          margin-bottom: 2.5rem;
          font-weight: 700;
          color: #ffffff !important;
          letter-spacing: -0.5px;
        }

        .feature-list {
          list-style: none;
          padding: 0;
        }

        .feature-list li {
          display: flex;
          gap: 15px;
          margin-bottom: 1.8rem;
          font-size: 1.1rem;
          align-items: flex-start;
          color: #e2e8f0 !important;
        }

        .feature-list li strong {
          color: #ffffff !important;
        }

        .feature-list .dot {
          width: 10px;
          height: 10px;
          background: var(--metro-blue);
          box-shadow: 0 0 10px var(--metro-blue);
          border-radius: 50%;
          margin-top: 8px;
          flex-shrink: 0;
        }

        .register-success-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          text-align: center;
          background: var(--bg-black);
          color: var(--text-white);
          padding: 2rem;
          direction: rtl;
        }

        .register-success-container h1 {
          margin-top: 1.8rem;
          color: var(--text-white);
          font-weight: 700;
          font-size: 2rem;
        }

        .register-success-container p {
          color: var(--text-muted);
          font-size: 1.1rem;
          margin-top: 0.75rem;
        }
      `}</style>
    </div>
  );
};

export default TenantRegister;
