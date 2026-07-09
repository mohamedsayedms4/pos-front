import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Api from '../services/api';
import logoLoginLight from '../assets/img/logo-login-light.png';
import logoLoginDark from '../assets/img/logo-login-dark.png';
import { useTheme } from '../components/common/ThemeContext';

const ForgotPassword = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const currentLogo = React.useMemo(() => {
    return theme === 'dark' ? logoLoginDark : logoLoginLight;
  }, [theme]);

  const handleSend = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!identifier.trim()) {
      setError('يرجى إدخال البريد الإلكتروني أو رقم الهاتف');
      return;
    }

    setLoading(true);
    try {
      const isEmail = identifier.includes('@');
      const method = isEmail ? 'EMAIL' : 'SMS';
      await Api.forgotPassword(identifier.trim(), method, isEmail ? '' : identifier.trim());
      // Show success message instead of navigating
      setSuccess(isEmail ? 'email' : 'whatsapp');
    } catch (err) {
      setError(err.message || 'فشل إرسال الرابط. تأكد من صحة البيانات المدخلة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-logo">
          <Link to="/" style={{ display: 'inline-block' }}>
            {currentLogo ? (
              <img
                src={currentLogo}
                alt="Logo"
                style={{ width: '64px', height: '64px', objectFit: 'contain', marginBottom: '16px' }}
              />
            ) : (
              <div className="logo-icon">◆</div>
            )}
          </Link>
          <h1>نسيت كلمة المرور</h1>
          <p>أدخل بريدك الإلكتروني لإرسال رابط التعيين</p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ color: 'var(--metro-green)', fontSize: '1.1rem', marginBottom: '15px' }}>
              ✅ تم إرسال رابط إعادة تعيين كلمة المرور بنجاح إلى بريدك الإلكتروني.
            </div>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
              الرجاء التحقق من رسائلك والنقر على الرابط لتغيير كلمة المرور.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSend} autoComplete="off">
            <div className="form-group">
              <label htmlFor="identifierInput">البريد الإلكتروني</label>
              <input
                className="form-control"
                id="identifierInput"
                type="email"
                placeholder="أدخل بريدك الإلكتروني"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                dir="ltr"
              />
            </div>

            {error && (
              <div style={{ marginBottom: '14px', padding: '10px 14px', background: 'var(--metro-red)', color: 'white', fontSize: '0.8125rem', textAlign: 'center' }}>
                {error}
              </div>
            )}

            <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={loading}>
              {loading ? 'جاري الإرسال...' : 'إرسال رابط التعيين'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #222' }}>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '8px' }}>
            <Link to="/login" style={{ color: 'var(--metro-blue)', fontWeight: '600', textDecoration: 'none' }}>العودة لتسجيل الدخول</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
