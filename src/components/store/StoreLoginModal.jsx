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
    <div className="ec-modal-overlay">
      <div className="ec-modal" style={{ maxWidth: '400px' }}>
        <div className="ec-modal-header">
          <h3>
            {tab === 'login' ? '🔑 تسجيل الدخول' : '✨ إنشاء حساب جديد'}
          </h3>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="ec-modal-body">
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
            <button
              onClick={() => { setTab('login'); setError(''); }}
              style={{
                flex: 1, padding: '10px', background: 'none', border: 'none', cursor: 'pointer',
                fontWeight: tab === 'login' ? 'bold' : 'normal',
                color: tab === 'login' ? 'var(--ec-primary)' : '#64748b',
                borderBottom: tab === 'login' ? '2px solid var(--ec-primary)' : 'none'
              }}>
              تسجيل الدخول
            </button>
            <button
              onClick={() => { setTab('register'); setError(''); }}
              style={{
                flex: 1, padding: '10px', background: 'none', border: 'none', cursor: 'pointer',
                fontWeight: tab === 'register' ? 'bold' : 'normal',
                color: tab === 'register' ? 'var(--ec-primary)' : '#64748b',
                borderBottom: tab === 'register' ? '2px solid var(--ec-primary)' : 'none'
              }}>
              حساب جديد
            </button>
          </div>

          <form onSubmit={handleSubmit} className="ec-animate-in">
            {tab === 'register' && (
              <div className="ec-form-group">
                <label>الاسم الكامل *</label>
                <div className="ec-form-input-wrapper">
                  <span className="ec-form-icon">👤</span>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: أحمد محمد" />
                </div>
              </div>
            )}

            <div className="ec-form-group">
              <label>رقم الهاتف *</label>
              <div className="ec-form-input-wrapper">
                <span className="ec-form-icon">📱</span>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="01xxxxxxxxx" />
              </div>
            </div>

            <div className="ec-form-group">
              <label>كلمة المرور *</label>
              <div className="ec-form-input-wrapper">
                <span className="ec-form-icon">🔒</span>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" />
              </div>
            </div>

            {tab === 'register' && (
              <div className="ec-form-group">
                <label>العنوان (اختياري)</label>
                <div className="ec-form-input-wrapper">
                  <span className="ec-form-icon">📍</span>
                  <input value={address} onChange={e => setAddress(e.target.value)} placeholder="المدينة، الحي، الشارع" />
                </div>
              </div>
            )}

            {error && <div className="ec-error" style={{ marginBottom: '15px' }}>{error}</div>}

            <button type="submit" className="ec-btn ec-btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
              {loading ? 'جاري التحميل...' : (tab === 'login' ? 'دخول' : 'تسجيل')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StoreLoginModal;
