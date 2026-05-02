import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import logo from '../assets/img/logo.png';

// Simple SVG Icons to replace MUI
const Icons = {
  Business: (props) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="10" width="20" height="12" rx="2" /><path d="M6 10V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6" /></svg>,
  Email: (props) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /><rect width="20" height="14" x="2" y="5" rx="2" /></svg>,
  Phone: (props) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
  Language: (props) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" x2="22" y1="12" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
  Lock: (props) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  CheckCircle: (props) => <svg {...props} width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
  ArrowForward: (props) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
  RocketLaunch: (props) => <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-5c1.62-2.2 5-3 5-3" /><path d="M12 15v5s3.03-.55 5-2c2.2-1.62 3-5 3-5" /></svg>
};

const TenantRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
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
      await axios.post('https://posapi.digitalrace.net/api/public/tenants/register', formData);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      alert(err.response?.data || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="register-success-container">
        <Icons.CheckCircle />
        <h1>تهانينا! تم إنشاء حسابك بنجاح</h1>
        <p>جاري تحويلك لصفحة تسجيل الدخول...</p>
      </div>
    );
  }

  return (
    <div className="tenant-register-page">
      <div className="register-left">
        <div className="register-card">
          <div className="register-header">
            <img src={logo} alt="Logo" className="register-logo" />
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
              {loading ? 'جاري الإنشاء...' : 'ابدأ الاستخدام مجاناً الآن'}
              {!loading && <Icons.ArrowForward className="btn-icon" />}
            </button>

            <div className="form-footer">
              بتمجيلك، فإنك توافق على <Link to="/terms">الشروط والأحكام</Link>
              <p>هل لديك حساب بالفعل؟ <Link to="/login">تسجيل الدخول</Link></p>
            </div>
          </form>
        </div>
      </div>

      <div className="register-right">
        <div className="marketing-content">
          <div className="marketing-badge">
            <Icons.RocketLaunch className="badge-icon" />
            <span>نظام نقاط البيع المتكامل</span>
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
          background: #f8fafc;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          direction: rtl;
        }

        .register-left {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .register-card {
          background: white;
          width: 100%;
          max-width: 500px;
          padding: 2.5rem;
          border-radius: 20px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.05);
        }

        .register-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .register-logo {
          height: 50px;
          margin-bottom: 1rem;
        }

        .register-header h2 {
          color: #1e293b;
          margin-bottom: 0.5rem;
          font-size: 1.8rem;
        }

        .register-header p {
          color: #64748b;
        }

        .register-form .input-group {
          margin-bottom: 1.2rem;
        }

        .register-form label {
          display: block;
          margin-bottom: 0.5rem;
          color: #334155;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-with-icon .icon {
          position: absolute;
          right: 12px;
          color: #94a3b8;
          width: 20px;
          height: 20px;
          pointer-events: none;
        }

        .input-with-icon input {
          width: 100%;
          padding: 12px 42px 12px 12px;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-size: 1rem;
          transition: all 0.3s;
          outline: none;
        }

        .input-with-icon input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }

        .slug-input .slug-suffix {
          position: absolute;
          left: 12px;
          color: #94a3b8;
          font-weight: 500;
        }

        .btn-register {
          width: 100%;
          background: #22c55e;
          color: white;
          border: none;
          padding: 14px;
          border-radius: 10px;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          margin-top: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: background 0.3s;
        }

        .btn-register:hover {
          background: #16a34a;
        }

        .form-footer {
          margin-top: 1.5rem;
          text-align: center;
          color: #64748b;
          font-size: 0.9rem;
        }

        .form-footer a {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 600;
        }

        .register-right {
          flex: 1;
          background: #1e293b;
          background-image: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          color: white;
        }

        @media (max-width: 900px) {
          .register-right { display: none; }
        }

        .marketing-content {
          max-width: 500px;
        }

        .marketing-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          padding: 8px 16px;
          border-radius: 50px;
          margin-bottom: 2rem;
          font-weight: 600;
        }

        .marketing-content h1 {
          font-size: 2.8rem;
          line-height: 1.2;
          margin-bottom: 2.5rem;
        }

        .feature-list {
          list-style: none;
          padding: 0;
        }

        .feature-list li {
          display: flex;
          gap: 15px;
          margin-bottom: 1.5rem;
          font-size: 1.1rem;
          align-items: flex-start;
        }

        .feature-list .dot {
          width: 8px;
          height: 8px;
          background: #3b82f6;
          border-radius: 50%;
          margin-top: 8px;
        }

        .register-success-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          text-align: center;
          background: white;
          direction: rtl;
        }

        .register-success-container h1 {
          margin-top: 1.5rem;
          color: #1e293b;
        }
      `}</style>
    </div>
  );
};

export default TenantRegister;
