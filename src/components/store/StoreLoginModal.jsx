import React, { useState } from 'react';
import { useStoreAuth } from '../../context/StoreAuthContext';

const StoreLoginModal = ({ isOpen, onClose }) => {
  const { storeLogin, storeRegister } = useStoreAuth();
  const [tab, setTab] = useState('login'); // 'login' or 'register'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (tab === 'login') {
        if (!phone || !password) throw new Error('يرجى إدخال رقم الهاتف وكلمة المرور');
        await storeLogin(phone, password);
      } else {
        if (!name || !phone || !password) throw new Error('الاسم ورقم الهاتف وكلمة المرور مطلوبة');
        await storeRegister({ name, phone, password, address });
      }
      onClose(); // Close on success
    } catch (err) {
      setError(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ec-modal-overlay" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="ec-modal" style={{ maxWidth: '440px', borderRadius: '24px', overflow: 'hidden', border: 'none', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        
        {/* Decorative Header */}
        <div style={{ 
          background: 'linear-gradient(135deg, #00a651 0%, #007137 100%)', 
          padding: '30px 30px', 
          textAlign: 'center',
          position: 'relative',
          color: '#fff',
          flexShrink: 0
        }}>
          <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
            <i className="fas fa-times"></i>
          </button>
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
            {tab === 'login' ? <i className="fas fa-lock"></i> : <i className="fas fa-user-plus"></i>}
          </div>
          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>{tab === 'login' ? 'مرحباً بعودتك' : 'انضم إلينا اليوم'}</h2>
          <p style={{ margin: '8px 0 0', opacity: 0.8, fontSize: '0.85rem' }}>
            {tab === 'login' ? 'سجل دخولك لمتابعة مشترياتك' : 'أنشئ حساباً جديداً لتجربة تسوق فريدة'}
          </p>
        </div>

        <div className="ec-modal-body custom-scroll" style={{ padding: '30px', overflowY: 'auto', flex: 1 }}>
          {/* Custom Tabs */}
          <div style={{ 
            display: 'flex', 
            background: '#f1f5f9', 
            padding: '4px', 
            borderRadius: '14px', 
            marginBottom: '25px',
            position: 'relative'
          }}>
            <button
              onClick={() => { setTab('login'); setError(''); }}
              style={{
                flex: 1, padding: '12px', border: 'none', cursor: 'pointer',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.95rem',
                transition: 'all 0.3s',
                backgroundColor: tab === 'login' ? '#fff' : 'transparent',
                color: tab === 'login' ? 'var(--ec-primary)' : '#64748b',
                boxShadow: tab === 'login' ? '0 4px 10px rgba(0,0,0,0.05)' : 'none'
              }}>
              <i className="fas fa-sign-in-alt" style={{ marginLeft: '8px' }}></i>
              تسجيل الدخول
            </button>
            <button
              onClick={() => { setTab('register'); setError(''); }}
              style={{
                flex: 1, padding: '12px', border: 'none', cursor: 'pointer',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.95rem',
                transition: 'all 0.3s',
                backgroundColor: tab === 'register' ? '#fff' : 'transparent',
                color: tab === 'register' ? 'var(--ec-primary)' : '#64748b',
                boxShadow: tab === 'register' ? '0 4px 10px rgba(0,0,0,0.05)' : 'none'
              }}>
              <i className="fas fa-user-plus" style={{ marginLeft: '8px' }}></i>
              حساب جديد
            </button>
          </div>

          <form onSubmit={handleSubmit} className="ec-animate-in">
            {tab === 'register' && (
              <div className="ec-form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px', display: 'block' }}>الاسم الكامل *</label>
                <div className="ec-form-input-wrapper" style={{ borderRadius: '16px', background: '#fff', border: '1.5px solid #e2e8f0' }}>
                  <span className="ec-form-icon" style={{ paddingRight: '15px', color: 'var(--ec-primary)' }}>
                    <i className="fas fa-user"></i>
                  </span>
                  <input 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="أدخل اسمك بالكامل" 
                    style={{ padding: '15px 10px' }}
                  />
                </div>
              </div>
            )}

            <div className="ec-form-group">
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px', display: 'block' }}>رقم الهاتف *</label>
              <div className="ec-form-input-wrapper" style={{ borderRadius: '16px', background: '#fff', border: '1.5px solid #e2e8f0' }}>
                <span className="ec-form-icon" style={{ paddingRight: '15px', color: 'var(--ec-primary)' }}>
                  <i className="fas fa-mobile-alt"></i>
                </span>
                <input 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  placeholder="01xxxxxxxxx" 
                  style={{ padding: '15px 10px' }}
                />
              </div>
            </div>

            <div className="ec-form-group">
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px', display: 'block' }}>كلمة المرور *</label>
              <div className="ec-form-input-wrapper" style={{ borderRadius: '16px', background: '#fff', border: '1.5px solid #e2e8f0' }}>
                <span className="ec-form-icon" style={{ paddingRight: '15px', color: 'var(--ec-primary)' }}>
                  <i className="fas fa-key"></i>
                </span>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                  style={{ padding: '15px 10px' }}
                />
              </div>
            </div>

            {tab === 'register' && (
              <div className="ec-form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px', display: 'block' }}>العنوان (اختياري)</label>
                <div className="ec-form-input-wrapper" style={{ borderRadius: '16px', background: '#fff', border: '1.5px solid #e2e8f0' }}>
                  <span className="ec-form-icon" style={{ paddingRight: '15px', color: 'var(--ec-primary)' }}>
                    <i className="fas fa-map-marker-alt"></i>
                  </span>
                  <input 
                    value={address} 
                    onChange={e => setAddress(e.target.value)} 
                    placeholder="المدينة، الحي، الشارع" 
                    style={{ padding: '15px 10px' }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="ec-error" style={{ 
                background: '#fff1f2', 
                color: '#e11d48', 
                padding: '12px', 
                borderRadius: '12px', 
                fontSize: '0.85rem', 
                marginBottom: '20px',
                border: '1px solid #ffe4e6',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <i className="fas fa-exclamation-circle"></i> {error}
              </div>
            )}

            <button 
              type="submit" 
              className="ec-btn-premium" 
              style={{ 
                width: '100%', 
                marginTop: '10px',
                padding: '16px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #00a651 0%, #007137 100%)',
                color: '#fff',
                border: 'none',
                fontWeight: 800,
                fontSize: '1.1rem',
                cursor: 'pointer',
                boxShadow: '0 10px 20px rgba(0, 166, 81, 0.2)',
                transition: 'all 0.3s'
              }} 
              disabled={loading}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              {loading ? <i className="fas fa-spinner fa-spin"></i> : (tab === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب جديد')}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.9rem', color: '#64748b' }}>
            {tab === 'login' ? (
              <p>ليس لديك حساب؟ <span onClick={() => setTab('register')} style={{ color: 'var(--ec-primary)', fontWeight: 700, cursor: 'pointer' }}>سجل الآن</span></p>
            ) : (
              <p>لديك حساب بالفعل؟ <span onClick={() => setTab('login')} style={{ color: 'var(--ec-primary)', fontWeight: 700, cursor: 'pointer' }}>سجل دخولك</span></p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreLoginModal;
