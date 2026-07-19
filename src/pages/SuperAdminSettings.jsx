import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Api, { SERVER_URL } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import '../styles/pages/SuperAdminSubscriptionsPremium.css';

const SuperAdminSettings = () => {
  const navigate = useNavigate();
  const { toast } = useGlobalUI();

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    softwareName: '',
    supportPhone: '',
    facebookUrl: '',
    linkedInUrl: '',
    youtubeUrl: '',
    facebookPixelId: '',
    logoUrl: '',
    logoSidebarLightUrl: '',
    logoSidebarDarkUrl: '',
    logoFooterLightUrl: '',
    logoFooterDarkUrl: '',
    logoLoginLightUrl: '',
    logoLoginDarkUrl: '',
    logoLandingLightUrl: '',
    logoLandingDarkUrl: '',
    logoFaviconUrl: '',
    vodafoneCashNumber: '',
    instapayAddress: '',
    newTenantNotificationNumbers: ''
  });
  
  const [savingSettings, setSavingSettings] = useState(false);
  const [logoPreview, setLogoPreview] = useState('');
  const [logoSidebarLightPreview, setLogoSidebarLightPreview] = useState('');
  const [logoSidebarDarkPreview, setLogoSidebarDarkPreview] = useState('');
  const [logoFooterLightPreview, setLogoFooterLightPreview] = useState('');
  const [logoFooterDarkPreview, setLogoFooterDarkPreview] = useState('');
  const [logoLoginLightPreview, setLogoLoginLightPreview] = useState('');
  const [logoLoginDarkPreview, setLogoLoginDarkPreview] = useState('');
  const [logoLandingLightPreview, setLogoLandingLightPreview] = useState('');
  const [logoLandingDarkPreview, setLogoLandingDarkPreview] = useState('');
  const [logoFaviconPreview, setLogoFaviconPreview] = useState('');

  const loadSettings = async () => {
    try {
      setLoading(true);
      const configData = await Api.getGlobalConfig();
      if (configData) {
        setSettings({
          softwareName: configData.softwareName || '',
          supportPhone: configData.supportPhone || '',
          facebookUrl: configData.facebookUrl || '',
          linkedInUrl: configData.linkedInUrl || '',
          youtubeUrl: configData.youtubeUrl || '',
          facebookPixelId: configData.facebookPixelId || '',
          logoUrl: configData.logoUrl || '',
          logoSidebarLightUrl: configData.logoSidebarLightUrl || '',
          logoSidebarDarkUrl: configData.logoSidebarDarkUrl || '',
          logoFooterLightUrl: configData.logoFooterLightUrl || '',
          logoFooterDarkUrl: configData.logoFooterDarkUrl || '',
          logoLoginLightUrl: configData.logoLoginLightUrl || '',
          logoLoginDarkUrl: configData.logoLoginDarkUrl || '',
          logoLandingLightUrl: configData.logoLandingLightUrl || '',
          logoLandingDarkUrl: configData.logoLandingDarkUrl || '',
          logoFaviconUrl: configData.logoFaviconUrl || '',
          vodafoneCashNumber: configData.vodafoneCashNumber || '',
          instapayAddress: configData.instapayAddress || '',
          newTenantNotificationNumbers: configData.newTenantNotificationNumbers || ''
        });
        setLogoPreview(configData.logoUrl || '');
        setLogoSidebarLightPreview(configData.logoSidebarLightUrl || '');
        setLogoSidebarDarkPreview(configData.logoSidebarDarkUrl || '');
        setLogoFooterLightPreview(configData.logoFooterLightUrl || '');
        setLogoFooterDarkPreview(configData.logoFooterDarkUrl || '');
        setLogoLoginLightPreview(configData.logoLoginLightUrl || '');
        setLogoLoginDarkPreview(configData.logoLoginDarkUrl || '');
        setLogoLandingLightPreview(configData.logoLandingLightUrl || '');
        setLogoLandingDarkPreview(configData.logoLandingDarkUrl || '');
        setLogoFaviconPreview(configData.logoFaviconUrl || '');
      }
    } catch (err) {
      toast('فشل في تحميل الإعدادات', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleLogoChange = (e, fieldName, setPreview) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
      setSettings(prev => ({ ...prev, [fieldName]: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await Api.updateGlobalConfig(settings);
      toast('تم حفظ إعدادات النظام بنجاح ', 'success');
      loadSettings();
    } catch (err) {
      toast(err.message || 'فشل في حفظ إعدادات النظام', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  if (!Api.isSuperAdmin()) return null;

  if (loading) {
    return (
      <div className="page-section" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Loader />
      </div>
    );
  }

  return (
    <div className="page-section">
      <div className="card">
        <div className="card-header">
          <h3><i className="fa-solid fa-gear"></i> إعدادات النظام العامة وشريط المعلومات السفلي (الفوتر)</h3>
        </div>

        <div className="card-body" style={{ padding: '30px' }}>
          <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--sa-sub-border)', paddingBottom: '16px' }}>
            <p style={{ color: 'var(--sa-sub-text-secondary)', fontSize: '0.95rem', marginTop: '6px' }}>
              تتيح لك هذه اللوحة تعديل البيانات المعروضة في شريط المعلومات السفلي (الفوتر) لجميع المستخدمين في النظام بشكل مباشر وتلقائي.
            </p>
          </div>
          
          <form onSubmit={handleSaveSettings} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

              {/* Logo Uploads Grid with Light / Dark Mode support */}
              <div className="sa-sub-form-group" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '850', marginBottom: '4px', fontSize: '1.1rem' }}>
                  <i className="fa-solid fa-image"></i>️ إدارة شعارات النظام المتعددة (الوضع الداكن / الفاتح):
                </label>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                  
                  {/* 1. Sidebar Logo Card */}
                  <div style={{ background: 'var(--sa-sub-bg)', padding: '20px', borderRadius: '14px', border: '1px solid var(--sa-sub-border)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--sa-sub-border)', paddingBottom: '8px' }}>
                      <strong style={{ fontSize: '0.95rem' }}><i className="fa-solid fa-mobile-screen"></i> القائمة الجانبية (Sidebar)</strong>
                      <span style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 'bold' }}>32 × 32 px - Icon فقط</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {/* Light Mode */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--sa-sub-text-secondary)' }}>الوضع الفاتح</span>
                        <div style={{ width: '100%', height: '50px', borderRadius: '6px', border: '1px solid var(--sa-sub-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', overflow: 'hidden' }}>
                          {logoSidebarLightPreview
                            ? <img src={logoSidebarLightPreview} alt="Sidebar Light" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                            : <span style={{ fontSize: '1rem', opacity: 0.2 }}><i className="fa-solid fa-image"></i>️</span>
                          }
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <label htmlFor="logo-sidebar-light-input" style={{ padding: '4px 8px', background: '#6366f1', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>رفع</label>
                          <input id="logo-sidebar-light-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleLogoChange(e, 'logoSidebarLightUrl', setLogoSidebarLightPreview)} />
                          {logoSidebarLightPreview && <button type="button" onClick={() => { setLogoSidebarLightPreview(''); setSettings(prev => ({ ...prev, logoSidebarLightUrl: '' })); }} style={{ padding: '4px 8px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>حذف</button>}
                        </div>
                      </div>
                      {/* Dark Mode */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--sa-sub-text-secondary)' }}>الوضع الداكن</span>
                        <div style={{ width: '100%', height: '50px', borderRadius: '6px', border: '1px solid var(--sa-sub-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', overflow: 'hidden' }}>
                          {logoSidebarDarkPreview
                            ? <img src={logoSidebarDarkPreview} alt="Sidebar Dark" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                            : <span style={{ fontSize: '1rem', opacity: 0.2 }}><i className="fa-solid fa-image"></i>️</span>
                          }
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <label htmlFor="logo-sidebar-dark-input" style={{ padding: '4px 8px', background: '#6366f1', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>رفع</label>
                          <input id="logo-sidebar-dark-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleLogoChange(e, 'logoSidebarDarkUrl', setLogoSidebarDarkPreview)} />
                          {logoSidebarDarkPreview && <button type="button" onClick={() => { setLogoSidebarDarkPreview(''); setSettings(prev => ({ ...prev, logoSidebarDarkUrl: '' })); }} style={{ padding: '4px 8px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>حذف</button>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Footer Logo Card */}
                  <div style={{ background: 'var(--sa-sub-bg)', padding: '20px', borderRadius: '14px', border: '1px solid var(--sa-sub-border)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--sa-sub-border)', paddingBottom: '8px' }}>
                      <strong style={{ fontSize: '0.95rem' }}><i className="fa-solid fa-shoe-prints"></i> شريط الفوتر (Footer)</strong>
                      <span style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 'bold' }}>32 × 32 px - Icon فقط</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {/* Light Mode */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--sa-sub-text-secondary)' }}>الوضع الفاتح</span>
                        <div style={{ width: '100%', height: '50px', borderRadius: '6px', border: '1px solid var(--sa-sub-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', overflow: 'hidden' }}>
                          {logoFooterLightPreview
                            ? <img src={logoFooterLightPreview} alt="Footer Light" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                            : <span style={{ fontSize: '1rem', opacity: 0.2 }}><i className="fa-solid fa-image"></i>️</span>
                          }
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <label htmlFor="logo-footer-light-input" style={{ padding: '4px 8px', background: '#6366f1', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>رفع</label>
                          <input id="logo-footer-light-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleLogoChange(e, 'logoFooterLightUrl', setLogoFooterLightPreview)} />
                          {logoFooterLightPreview && <button type="button" onClick={() => { setLogoFooterLightPreview(''); setSettings(prev => ({ ...prev, logoFooterLightUrl: '' })); }} style={{ padding: '4px 8px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>حذف</button>}
                        </div>
                      </div>
                      {/* Dark Mode */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--sa-sub-text-secondary)' }}>الوضع الداكن</span>
                        <div style={{ width: '100%', height: '50px', borderRadius: '6px', border: '1px solid var(--sa-sub-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', overflow: 'hidden' }}>
                          {logoFooterDarkPreview
                            ? <img src={logoFooterDarkPreview} alt="Footer Dark" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                            : <span style={{ fontSize: '1rem', opacity: 0.2 }}><i className="fa-solid fa-image"></i>️</span>
                          }
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <label htmlFor="logo-footer-dark-input" style={{ padding: '4px 8px', background: '#6366f1', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>رفع</label>
                          <input id="logo-footer-dark-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleLogoChange(e, 'logoFooterDarkUrl', setLogoFooterDarkPreview)} />
                          {logoFooterDarkPreview && <button type="button" onClick={() => { setLogoFooterDarkPreview(''); setSettings(prev => ({ ...prev, logoFooterDarkUrl: '' })); }} style={{ padding: '4px 8px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>حذف</button>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Login Page Logo Card */}
                  <div style={{ background: 'var(--sa-sub-bg)', padding: '20px', borderRadius: '14px', border: '1px solid var(--sa-sub-border)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--sa-sub-border)', paddingBottom: '8px' }}>
                      <strong style={{ fontSize: '0.95rem' }}><i className="fa-solid fa-key"></i> تسجيل الدخول (Login Page)</strong>
                      <span style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 'bold' }}>64 × 64 px - أيقونة أو لوجو</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {/* Light Mode */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--sa-sub-text-secondary)' }}>الوضع الفاتح</span>
                        <div style={{ width: '100%', height: '50px', borderRadius: '6px', border: '1px solid var(--sa-sub-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', overflow: 'hidden' }}>
                          {logoLoginLightPreview
                            ? <img src={logoLoginLightPreview} alt="Login Light" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                            : <span style={{ fontSize: '1rem', opacity: 0.2 }}><i className="fa-solid fa-image"></i>️</span>
                          }
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <label htmlFor="logo-login-light-input" style={{ padding: '4px 8px', background: '#6366f1', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>رفع</label>
                          <input id="logo-login-light-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleLogoChange(e, 'logoLoginLightUrl', setLogoLoginLightPreview)} />
                          {logoLoginLightPreview && <button type="button" onClick={() => { setLogoLoginLightPreview(''); setSettings(prev => ({ ...prev, logoLoginLightUrl: '' })); }} style={{ padding: '4px 8px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>حذف</button>}
                        </div>
                      </div>
                      {/* Dark Mode */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--sa-sub-text-secondary)' }}>الوضع الداكن</span>
                        <div style={{ width: '100%', height: '50px', borderRadius: '6px', border: '1px solid var(--sa-sub-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', overflow: 'hidden' }}>
                          {logoLoginDarkPreview
                            ? <img src={logoLoginDarkPreview} alt="Login Dark" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                            : <span style={{ fontSize: '1rem', opacity: 0.2 }}><i className="fa-solid fa-image"></i>️</span>
                          }
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <label htmlFor="logo-login-dark-input" style={{ padding: '4px 8px', background: '#6366f1', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>رفع</label>
                          <input id="logo-login-dark-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleLogoChange(e, 'logoLoginDarkUrl', setLogoLoginDarkPreview)} />
                          {logoLoginDarkPreview && <button type="button" onClick={() => { setLogoLoginDarkPreview(''); setSettings(prev => ({ ...prev, logoLoginDarkUrl: '' })); }} style={{ padding: '4px 8px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>حذف</button>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. Landing Page Header Logo Card */}
                  <div style={{ background: 'var(--sa-sub-bg)', padding: '20px', borderRadius: '14px', border: '1px solid var(--sa-sub-border)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--sa-sub-border)', paddingBottom: '8px' }}>
                      <strong style={{ fontSize: '0.95rem' }}><i className="fa-solid fa-globe"></i> صفحة الهبوط (Landing Page)</strong>
                      <span style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 'bold' }}>44 × 44 px - أيقونة ونص</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {/* Light Mode */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--sa-sub-text-secondary)' }}>الوضع الفاتح</span>
                        <div style={{ width: '100%', height: '50px', borderRadius: '6px', border: '1px solid var(--sa-sub-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', overflow: 'hidden' }}>
                          {logoLandingLightPreview
                            ? <img src={logoLandingLightPreview} alt="Landing Light" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                            : <span style={{ fontSize: '1rem', opacity: 0.2 }}><i className="fa-solid fa-image"></i>️</span>
                          }
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <label htmlFor="logo-landing-light-input" style={{ padding: '4px 8px', background: '#6366f1', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>رفع</label>
                          <input id="logo-landing-light-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleLogoChange(e, 'logoLandingLightUrl', setLogoLandingLightPreview)} />
                          {logoLandingLightPreview && <button type="button" onClick={() => { setLogoLandingLightPreview(''); setSettings(prev => ({ ...prev, logoLandingLightUrl: '' })); }} style={{ padding: '4px 8px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>حذف</button>}
                        </div>
                      </div>
                      {/* Dark Mode */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--sa-sub-text-secondary)' }}>الوضع الداكن</span>
                        <div style={{ width: '100%', height: '50px', borderRadius: '6px', border: '1px solid var(--sa-sub-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', overflow: 'hidden' }}>
                          {logoLandingDarkPreview
                            ? <img src={logoLandingDarkPreview} alt="Landing Dark" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                            : <span style={{ fontSize: '1rem', opacity: 0.2 }}><i className="fa-solid fa-image"></i>️</span>
                          }
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <label htmlFor="logo-landing-dark-input" style={{ padding: '4px 8px', background: '#6366f1', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>رفع</label>
                          <input id="logo-landing-dark-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleLogoChange(e, 'logoLandingDarkUrl', setLogoLandingDarkPreview)} />
                          {logoLandingDarkPreview && <button type="button" onClick={() => { setLogoLandingDarkPreview(''); setSettings(prev => ({ ...prev, logoLandingDarkUrl: '' })); }} style={{ padding: '4px 8px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>حذف</button>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5. Favicon Card */}
                  <div style={{ background: 'var(--sa-sub-bg)', padding: '20px', borderRadius: '14px', border: '1px solid var(--sa-sub-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--sa-sub-border)', paddingBottom: '8px' }}>
                      <strong style={{ fontSize: '0.95rem' }}><i className="fa-solid fa-bullseye"></i> أيقونة المتصفح (Favicon)</strong>
                      <span style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 'bold' }}>16x16 / 32x32 px</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '5px' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '8px', border: '2px dashed var(--sa-sub-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', overflow: 'hidden', flexShrink: 0 }}>
                        {logoFaviconPreview
                          ? <img src={logoFaviconPreview} alt="Favicon Logo" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                          : <span style={{ fontSize: '1.2rem', opacity: 0.3 }}><i className="fa-solid fa-bullseye"></i></span>
                        }
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--sa-sub-text-secondary)' }}>أيقونة تبويب المتصفح</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <label htmlFor="logo-favicon-input" style={{ display: 'inline-block', padding: '6px 12px', background: '#6366f1', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>رفع</label>
                          <input id="logo-favicon-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleLogoChange(e, 'logoFaviconUrl', setLogoFaviconPreview)} />
                          {logoFaviconPreview && <button type="button" onClick={() => { setLogoFaviconPreview(''); setSettings(prev => ({ ...prev, logoFaviconUrl: '' })); }} style={{ padding: '6px 12px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>حذف</button>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 6. Default Fallback Card */}
                  <div style={{ background: 'var(--sa-sub-bg)', padding: '20px', borderRadius: '14px', border: '1px solid var(--sa-sub-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--sa-sub-border)', paddingBottom: '8px' }}>
                      <strong style={{ fontSize: '0.95rem' }}><i className="fa-solid fa-image"></i>️ الشعار الاحتياطي العام (Fallback)</strong>
                      <span style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 'bold' }}>شعار افتراضي شامل</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '5px' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '8px', border: '2px dashed var(--sa-sub-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', overflow: 'hidden', flexShrink: 0 }}>
                        {logoPreview
                          ? <img src={logoPreview} alt="Default Logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                          : <span style={{ fontSize: '1.2rem', opacity: 0.3 }}><i className="fa-solid fa-image"></i>️</span>
                        }
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--sa-sub-text-secondary)' }}>يستخدم لتعويض أي حقل تركه فارغاً</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <label htmlFor="logo-default-input" style={{ display: 'inline-block', padding: '6px 12px', background: '#6366f1', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>رفع</label>
                          <input id="logo-default-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleLogoChange(e, 'logoUrl', setLogoPreview)} />
                          {logoPreview && <button type="button" onClick={() => { setLogoPreview(''); setSettings(prev => ({ ...prev, logoUrl: '' })); }} style={{ padding: '6px 12px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>حذف</button>}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              <div className="sa-sub-form-group" style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', marginBottom: '8px' }}>
                  <i className="fa-solid fa-building"></i> اسم البرنامج / العلامة التجارية:
                </label>
                <input
                  type="text"
                  className="sa-sub-form-input"
                  placeholder="مثال: نظام سجل"
                  value={settings.softwareName}
                  onChange={(e) => setSettings({ ...settings, softwareName: e.target.value })}
                  required
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid var(--sa-sub-border)', background: 'var(--sa-sub-bg)', color: 'var(--sa-sub-text-primary)' }}
                />
              </div>

              <div className="sa-sub-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', marginBottom: '8px' }}>
                  <i className="fa-solid fa-phone"></i> رقم الدعم الفني للواتساب / الاتصال:
                </label>
                <input
                  type="text"
                  className="sa-sub-form-input"
                  placeholder="مثال: +201281018810"
                  value={settings.supportPhone}
                  onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                  required
                  style={{ width: '100%', direction: 'ltr', textAlign: 'right', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid var(--sa-sub-border)', background: 'var(--sa-sub-bg)', color: 'var(--sa-sub-text-primary)' }}
                />
              </div>

              <div className="sa-sub-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', marginBottom: '8px' }}>
                  <i className="fa-solid fa-circle" style={{color: "#3b82f6"}}></i> رابط صفحة فيسبوك (Facebook URL):
                </label>
                <input
                  type="url"
                  className="sa-sub-form-input"
                  placeholder="مثال: https://facebook.com/yourpage"
                  value={settings.facebookUrl}
                  onChange={(e) => setSettings({ ...settings, facebookUrl: e.target.value })}
                  style={{ width: '100%', direction: 'ltr', textAlign: 'right', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid var(--sa-sub-border)', background: 'var(--sa-sub-bg)', color: 'var(--sa-sub-text-primary)' }}
                />
              </div>

              <div className="sa-sub-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', marginBottom: '8px' }}>
                  <i className="fa-solid fa-link"></i> رابط لينكد إن (LinkedIn URL):
                </label>
                <input
                  type="url"
                  className="sa-sub-form-input"
                  placeholder="مثال: https://linkedin.com/company/yourcompany"
                  value={settings.linkedInUrl}
                  onChange={(e) => setSettings({ ...settings, linkedInUrl: e.target.value })}
                  style={{ width: '100%', direction: 'ltr', textAlign: 'right', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid var(--sa-sub-border)', background: 'var(--sa-sub-bg)', color: 'var(--sa-sub-text-primary)' }}
                />
              </div>

              <div className="sa-sub-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', marginBottom: '8px' }}>
                  <i className="fa-solid fa-circle" style={{color: "#ef4444"}}></i> رابط قناة يوتيوب (YouTube URL):
                </label>
                <input
                  type="url"
                  className="sa-sub-form-input"
                  placeholder="مثال: https://youtube.com/c/yourchannel"
                  value={settings.youtubeUrl}
                  onChange={(e) => setSettings({ ...settings, youtubeUrl: e.target.value })}
                  style={{ width: '100%', direction: 'ltr', textAlign: 'right', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid var(--sa-sub-border)', background: 'var(--sa-sub-bg)', color: 'var(--sa-sub-text-primary)' }}
                />
              </div>

              {/* ─── Payment Methods ─────────────────────────────────────── */}
              <div className="sa-sub-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', marginBottom: '8px' }}>
                  <i className="fa-solid fa-credit-card"></i> رقم فودافون كاش للدفع:
                </label>
                <input
                  type="text"
                  className="sa-sub-form-input"
                  placeholder="مثال: 01012345678"
                  value={settings.vodafoneCashNumber}
                  onChange={(e) => setSettings({ ...settings, vodafoneCashNumber: e.target.value })}
                  style={{ width: '100%', direction: 'ltr', textAlign: 'right', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid var(--sa-sub-border)', background: 'var(--sa-sub-bg)', color: 'var(--sa-sub-text-primary)' }}
                />
              </div>

              <div className="sa-sub-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', marginBottom: '8px' }}>
                  <i className="fa-solid fa-bolt"></i> عنوان إنستا باي (Instapay Address):
                </label>
                <input
                  type="text"
                  className="sa-sub-form-input"
                  placeholder="مثال: pos@instapay"
                  value={settings.instapayAddress}
                  onChange={(e) => setSettings({ ...settings, instapayAddress: e.target.value })}
                  style={{ width: '100%', direction: 'ltr', textAlign: 'right', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid var(--sa-sub-border)', background: 'var(--sa-sub-bg)', color: 'var(--sa-sub-text-primary)' }}
                />
              </div>

              {/* ─── Notifications ─────────────────────────────────────── */}
              <div className="sa-sub-form-group" style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', marginBottom: '8px' }}>
                  <i className="fa-solid fa-mobile-screen"></i> أرقام واتساب لإشعارات المشتركين الجدد (مفصولة بفاصلة):
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="sa-sub-form-input"
                    placeholder="مثال: +201012345678, +201112345678"
                    value={settings.newTenantNotificationNumbers}
                    onChange={(e) => setSettings({ ...settings, newTenantNotificationNumbers: e.target.value })}
                    style={{
                      width: '100%',
                      direction: 'ltr',
                      textAlign: 'right',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '1.5px solid var(--sa-sub-border)',
                      background: 'var(--sa-sub-bg)',
                      color: 'var(--sa-sub-text-primary)'
                    }}
                  />
                  <small style={{ color: 'var(--sa-sub-text-secondary)', display: 'block', marginTop: '4px' }}>
                    * سيتم إرسال إشعار على الواتساب لهذه الأرقام عند تسجيل متجر جديد. يمكنك إضافة أكثر من رقم مفصولين بفاصلة (,).
                  </small>
                </div>
              </div>

              {/* ─── Facebook Pixel ID ─────────────────────────────────────── */}
              <div className="sa-sub-form-group" style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', marginBottom: '8px' }}>
                  <i className="fa-solid fa-chart-column"></i> Facebook Pixel ID (معرّف بيكسل فيسبوك للإعلانات):
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="sa-sub-form-input"
                    placeholder="مثال: 1234567890123456"
                    value={settings.facebookPixelId}
                    onChange={(e) => setSettings({ ...settings, facebookPixelId: e.target.value.trim() })}
                    style={{
                      width: '100%',
                      direction: 'ltr',
                      textAlign: 'left',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: settings.facebookPixelId ? '1.5px solid #1877f2' : '1.5px solid var(--sa-sub-border)',
                      background: 'var(--sa-sub-bg)',
                      color: 'var(--sa-sub-text-primary)',
                      fontFamily: 'monospace',
                      fontSize: '1rem',
                      letterSpacing: '1px'
                    }}
                  />
                  {settings.facebookPixelId && (
                    <span style={{
                      position: 'absolute',
                      left: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '0.75rem',
                      color: '#1877f2',
                      fontWeight: 'bold',
                      pointerEvents: 'none'
                    }}><i className="fa-solid fa-check"></i> Pixel ID محدد</span>
                  )}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--sa-sub-text-secondary)', marginTop: '6px', lineHeight: '1.5' }}>
                  <i className="fa-solid fa-magnifying-glass"></i> ستجد الـ Pixel ID في: <strong>Meta Business Suite → Events Manager → اختار البيكسل → Settings</strong>
                  <br />بعد الحفظ، سيُفعَّل البيكسل تلقائياً في Landing Page وصفحة التسجيل.
                </p>
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-start', marginTop: '16px' }}>
                <button
                  type="submit"
                  className="sa-sub-btn-primary"
                  disabled={savingSettings}
                  style={{
                    padding: '12px 30px',
                    fontSize: '1rem',
                    borderRadius: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, var(--sa-sub-accent-blue), #4f46e5)',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    border: 'none',
                    color: '#fff',
                    fontFamily: 'inherit'
                  }}
                >
                  {savingSettings && <span className="sa-sub-spinner"></span>}
                  {savingSettings ? 'جاري حفظ الإعدادات...' : ' حفظ الإعدادات'}
                </button>
              </div>

            </form>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminSettings;