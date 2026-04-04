import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Api from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await Api.login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'فشل تسجيل الدخول');
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon">◆</div>
          <h1>نظام نقاط البيع</h1>
          <p>قم بتسجيل الدخول للمتابعة</p>
        </div>

        <form onSubmit={handleLogin} autoComplete="on">
          <div className="form-group">
            <label htmlFor="emailInput">البريد الإلكتروني</label>
            <input 
              className="form-control" 
              id="emailInput" 
              type="email" 
              placeholder="admin@pos.com" 
              required 
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
            />
          </div>

          <div className="form-group">
            <label htmlFor="passwordInput">كلمة المرور</label>
            <input 
              className="form-control" 
              id="passwordInput" 
              type="password" 
              placeholder="••••••••" 
              required 
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              dir="ltr"
            />
          </div>

          {error && (
            <div style={{ marginBottom: '14px', padding: '10px 14px', background: 'var(--metro-red)', color: 'white', fontSize: '0.8125rem', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={loading}>
            {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #222' }}>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.6875rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            POS System React v1.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
