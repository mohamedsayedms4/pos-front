import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Api from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState(localStorage.getItem('pos_tenant_slug') || '');
  const [businessName, setBusinessName] = useState('');
  const [isAutoTenant, setIsAutoTenant] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [suggestedTenants, setSuggestedTenants] = useState([]);
  const navigate = useNavigate();

  // 1. Detect by Subdomain on Mount
  React.useEffect(() => {
    const detectBySubdomain = async () => {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      if (parts.length >= 3 && parts[0] !== 'www' && hostname.includes('digitalrace.net')) {
        const slug = parts[0];
        setTenantSlug(slug);
        setIsAutoTenant(true);
        await resolveAndSetTenant(slug);
      }
    };
    detectBySubdomain();
  }, []);

  // 2. Detect by Email (when user finishes typing)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (email && email.includes('@') && email.includes('.') && !isAutoTenant) {
        findTenantByEmail(email);
      }
    }, 1000); // 1 second debounce
    return () => clearTimeout(timer);
  }, [email]);

  const findTenantByEmail = async (emailAddr) => {
    setIsResolving(true);
    try {
      const res = await fetch(`https://posapi.digitalrace.net/api/public/tenants/find-by-email/${emailAddr}`);
      if (res.ok) {
        const tenants = await res.json();
        if (tenants.length === 1) {
          setTenantSlug(tenants[0].slug);
          setBusinessName(tenants[0].name);
          console.log(`[Email Match] Found Tenant: ${tenants[0].name}`);
        } else if (tenants.length > 1) {
          setSuggestedTenants(tenants);
        }
        return tenants;
      }
      return [];
    } catch (e) {
      console.error('Failed to find tenant by email', e);
      return [];
    } finally {
      setIsResolving(false);
    }
  };

  const resolveAndSetTenant = async (slug) => {
    setIsResolving(true);
    try {
      const resolveRes = await fetch(`https://posapi.digitalrace.net/api/public/tenants/resolve/${slug}`);
      if (resolveRes.ok) {
        const data = await resolveRes.json();
        setBusinessName(data.name);
        localStorage.setItem('pos_tenant_slug', slug);
        return data.id;
      } else {
        throw new Error('المؤسسة غير موجودة');
      }
    } catch (e) {
      console.error(e);
      if (isAutoTenant) setError('عذراً، هذا الرابط غير مسجل في نظامنا.');
      return null;
    } finally {
      setIsResolving(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setLoading(true);

    try {
      let currentSlug = tenantSlug;

      // 1. If slug is missing, try one last time to find it by email
      if (!currentSlug) {
        const tenants = await findTenantByEmail(email);
        if (tenants && tenants.length === 1) {
          currentSlug = tenants[0].slug;
          setTenantSlug(currentSlug);
        } else if (tenants && tenants.length > 1) {
          setError('هذا البريد مرتبط بأكثر من شركة، يرجى اختيار الشركة أولاً');
          setLoading(false);
          return;
        } else {
          setError('عذراً، هذا البريد غير مسجل في أي مؤسسة');
          setLoading(false);
          return;
        }
      }

      // 2. Resolve Slug to ID
      const resolvedId = await resolveAndSetTenant(currentSlug);
      if (!resolvedId) {
        setError('تعذر التحقق من هوية المؤسسة.');
        setLoading(false);
        return;
      }

      // 3. Perform Login
      await Api.login(email, password, resolvedId);
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
          <h1>{businessName ? businessName : 'نظام نقاط البيع'}</h1>
          <p>{businessName ? 'أهلاً بك مرة أخرى' : 'قم بتسجيل الدخول للمتابعة'}</p>
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

          {suggestedTenants.length > 1 && (
            <div className="form-group" style={{ animation: 'fadeIn 0.3s' }}>
              <label>يرجى اختيار الشركة</label>
              <select
                className="form-control"
                required
                value={tenantSlug}
                onChange={(e) => {
                  const t = suggestedTenants.find(st => st.slug === e.target.value);
                  if (t) {
                    setTenantSlug(t.slug);
                    setBusinessName(t.name);
                  }
                }}
              >
                <option value="">-- اختر الشركة التي تود الدخول إليها --</option>
                {suggestedTenants.map(t => (
                  <option key={t.slug} value={t.slug}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {businessName && suggestedTenants.length === 0 && (
            <div style={{ marginBottom: '15px', padding: '8px 12px', background: 'rgba(0, 123, 255, 0.1)', borderLeft: '3px solid var(--metro-blue)', color: 'var(--metro-blue)', fontSize: '0.8rem', fontWeight: 'bold' }}>
              ✓ تسجيل الدخول إلى: {businessName}
            </div>
          )}

          {error && (
            <div style={{ marginBottom: '14px', padding: '10px 14px', background: 'var(--metro-red)', color: 'white', fontSize: '0.8125rem', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={loading || isResolving}>
            {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #222' }}>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '8px' }}>
            ليس لديك حساب؟ <a href="/register" style={{ color: 'var(--metro-blue)', fontWeight: '600', textDecoration: 'none' }}>إنشاء شركة جديدة</a>
          </p>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.6875rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            POS System React v1.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
