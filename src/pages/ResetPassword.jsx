import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Api from '../services/api';
import logoLoginLight from '../assets/img/logo-login-light.png';
import logoLoginDark from '../assets/img/logo-login-dark.png';
import { useTheme } from '../components/common/ThemeContext';

const ResetPassword = () => {
  const { theme } = useTheme();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const tokenParam = searchParams.get('token');
  const methodParam = searchParams.get('method');
  
  const [token, setToken] = useState(tokenParam || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const currentLogo = React.useMemo(() => {
    return theme === 'dark' ? logoLoginDark : logoLoginLight;
  }, [theme]);

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('يرجى التأكد من الرابط أو إدخال رمز التحقق');
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      return;
    }

    if (password.length < 6) {
      setError('كلمة المرور يجب أن تتكون من 6 أحرف على الأقل');
      return;
    }

    setLoading(true);

    try {
      await Api.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.message || 'فشل إعادة تعيين كلمة المرور، يرجى التأكد من صحة الكود');
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
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="logo-icon">◆</div>
            )}
          </Link>
          <h1>إعادة تعيين كلمة المرور</h1>
          <p>يرجى إدخال كلمة المرور الجديدة الخاصة بك</p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(40, 167, 69, 0.1)', border: '1px solid #28a745', color: '#28a745', borderRadius: '4px' }}>
              تم إعادة تعيين كلمة المرور بنجاح! سيتم تحويلك إلى صفحة الدخول...
            </div>
          </div>
        ) : (
          <form onSubmit={handleReset} autoComplete="off">
            {!tokenParam && (
              <div className="form-group">
                <label htmlFor="tokenInput">رمز التحقق (Token)</label>
                <input
                  className="form-control"
                  id="tokenInput"
                  type="text"
                  placeholder="مثال: 123456"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  dir="ltr"
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="passwordInput">كلمة المرور الجديدة</label>
              <input
                className="form-control"
                id="passwordInput"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPasswordInput">تأكيد كلمة المرور</label>
              <input
                className="form-control"
                id="confirmPasswordInput"
                type="password"
                placeholder="••••••••"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                dir="ltr"
              />
            </div>

            {error && (
              <div style={{ marginBottom: '14px', padding: '10px 14px', background: 'var(--metro-red)', color: 'white', fontSize: '0.8125rem', textAlign: 'center' }}>
                {error}
              </div>
            )}

            <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={loading || (!token && !tokenParam)}>
              {loading ? 'جاري التعيين...' : 'إعادة تعيين'}
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

export default ResetPassword;
