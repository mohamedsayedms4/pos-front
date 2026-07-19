import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import { translateRole } from '../utils/permissionTranslations';

import '../styles/pages/SettingsPremium.css';

const UserForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useGlobalUI();
  
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [activeSection, setActiveSection] = useState('basic');

  const initialFormData = {
    name: '',
    email: '',
    password: '',
    roles: [],
    enabled: true,
    branchId: '',
    profilePicture: ''
  };

  const [formData, setFormData] = useState(initialFormData);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  const API_BASE_URL = Api.API_BASE || 'https://posapi.digitalrace.net/api/v1';

  // ScrollSpy
  useEffect(() => {
    const sectionIds = ['basic', 'assignment', 'access'];
    const observers = sectionIds.map((sid) => {
      const el = document.getElementById(sid);
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(sid); },
        { rootMargin: '-20% 0px -60% 0px', threshold: 0.01 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach(o => o?.disconnect());
  }, [loading]);

  const scrollTo = (sid) => {
    document.getElementById(sid)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(sid);
  };

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [branchesRes, rolesRes] = await Promise.all([
          Api.getBranches(),
          Api.getRoles()
        ]);
        setBranches(branchesRes || []);
        setAvailableRoles(rolesRes || []);
      } catch (err) {
        console.error("Error fetching options", err);
      }
    };
    
    fetchOptions();

    if (id) {
      const fetchUser = async () => {
        try {
          const user = await Api.getUser(id);
          setFormData({
            name: user.name || '',
            email: user.email || '',
            password: '', // Keep empty for security
            roles: user.roles || [],
            enabled: user.enabled ?? true,
            branchId: user.branchId || '',
            profilePicture: user.profilePicture || ''
          });
        } catch (err) {
          toast(err.message, 'error');
          navigate('/users');
        } finally {
          setLoading(false);
        }
      };
      fetchUser();
    }
  }, [id]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSave = async (e, addAnother = false) => {
    if (e) e.preventDefault();
    
    if (!formData.name || !formData.email || (!id && !formData.password)) {
      toast('يرجى ملء جميع الحقول المطلوبة', 'warning');
      return;
    }

    setSaving(true);
    try {
      if (id) {
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        await Api.updateUser(id, updateData, selectedFile);
        toast('تم تحديث بيانات المستخدم بنجاح', 'success');
      } else {
        await Api.createUser(formData, selectedFile);
        toast('تم إضافة المستخدم بنجاح', 'success');
      }
      
      if (addAnother && !id) {
         setFormData(initialFormData);
         setSelectedFile(null);
         setPreviewUrl(null);
         window.scrollTo(0, 0);
         return;
      }

      navigate('/users');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader message="جاري التحميل..." />;

  const sections = [
    { id: 'basic',      label: 'البيانات الأساسية', icon: 'fa-solid fa-id-card' },
    { id: 'assignment', label: 'التعيين ومكان العمل', icon: 'fa-solid fa-building-user' },
    { id: 'access',     label: 'الصلاحيات والحالة', icon: 'fa-solid fa-shield-halved' },
  ];

  return (
    <div style={{ direction: 'rtl', minHeight: '100vh', paddingBottom: '60px' }}>

      {/* ── Sticky Page Header ── */}
      <div className="settings-page-header" style={{ padding: '14px 24px', marginBottom: 0 }}>
        <div>
          <span className="settings-eyebrow">إدارة المستخدمين</span>
          <h1 style={{ margin: 0, fontSize: 'clamp(20px,2vw,28px)', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {id ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--muted, #697386)', fontSize: 14 }}>
            أدخل بيانات المستخدم وحدد صلاحياته بداخل النظام
          </p>
        </div>
        <div className="header-buttons">
          <button
            className="btn-seggele btn-seggele--secondary"
            type="button"
            onClick={() => navigate('/users')}
            disabled={saving}
          >
            <i className="fa-solid fa-arrow-right"></i> إلغاء
          </button>
          {!id && (
            <button
              className="btn-seggele btn-seggele--secondary"
              type="button"
              onClick={(e) => handleSave(e, true)}
              disabled={saving}
            >
              <i className="fa-solid fa-plus"></i> حفظ وإضافة آخر
            </button>
          )}
          <button
            className="btn-seggele btn-seggele--primary"
            type="submit"
            form="userForm"
            disabled={saving}
          >
            {saving
              ? <><i className="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...</>
              : <><i className="fa-solid fa-check"></i> {id ? 'حفظ التعديلات' : 'حفظ المستخدم'}</>
            }
          </button>
        </div>
      </div>

      <div className="settings-layout" style={{ maxWidth: 1200, margin: '20px auto 0', padding: '0 24px' }}>
        
        {/* ── Sidebar Nav ── */}
        <aside className="settings-nav">
          <nav>
            {sections.map(({ id: sid, label, icon }) => (
              <button
                key={sid}
                type="button"
                className={`section-link ${activeSection === sid ? 'active' : ''}`}
                onClick={() => scrollTo(sid)}
              >
                <i className={icon}></i>
                <span>{label}</span>
                {activeSection === sid && <span className="active-dot" />}
              </button>
            ))}
          </nav>
          <div className="security-note" style={{ marginTop: 14 }}>
            <i className="fa-solid fa-shield-halved" style={{ marginTop: 2 }}></i>
            <div>
              <strong>صلاحيات آمنة</strong>
              <p>يتم تشفير كلمات المرور تلقائياً وحماية الوصول.</p>
            </div>
          </div>
        </aside>

        {/* ── Content ── */}
        <div className="settings-content">
          <form id="userForm" onSubmit={(e) => handleSave(e, false)}>

            {/* ─ 1. Basic Data ─ */}
            <div id="basic" style={{ scrollMarginTop: 120, marginBottom: 40 }}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>البيانات الأساسية</h2>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>المعلومات الشخصية التي تُعرّف المستخدم وبيانات الدخول.</p>
              </div>
              <section className="settings-card">
                <div className="card-body">
                  <div className="form-grid">
                    <div className="field field--full" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                      <div className="avatar-upload-container" style={{ position: 'relative', width: 80, height: 80 }}>
                        <div className="avatar-preview-box" style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', border: '2px dashed var(--border)', display: 'grid', placeItems: 'center', background: 'var(--surface-2)' }}>
                          {previewUrl ? (
                            <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : formData.profilePicture ? (
                            <img src={`${API_BASE_URL}/products/images/${formData.profilePicture}`} alt="Current" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <i className="fa-solid fa-user" style={{ fontSize: 32, color: 'var(--muted)' }}></i>
                          )}
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>صورة الملف الشخصي</label>
                        <button type="button" className="btn-seggele btn-seggele--secondary" onClick={() => document.getElementById('avatarInput').click()}>
                          <i className="fa-solid fa-image"></i> {previewUrl || formData.profilePicture ? 'تغيير الصورة' : 'اختيار صورة'}
                        </button>
                        <input id="avatarInput" type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                      </div>
                    </div>
                    
                    <div className="field">
                      <label htmlFor="userName">الاسم <span className="required">*</span></label>
                      <input
                        id="userName"
                        placeholder="الاسم الكامل"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div className="field">
                      <label htmlFor="userEmail">البريد الإلكتروني <span className="required">*</span></label>
                      <input
                        id="userEmail"
                        type="email"
                        placeholder="example@domain.com"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        required
                        dir="ltr"
                        style={{ textAlign: 'left' }}
                      />
                    </div>
                    
                    <div className="field field--full">
                      <label htmlFor="userPassword">
                        كلمة المرور {id ? <span style={{ fontSize:'0.8rem', fontWeight:'normal', color: 'var(--muted)', marginRight: 6 }}>(اتركه فارغاً للإبقاء على كلمة المرور الحالية)</span> : <span className="required">*</span>}
                      </label>
                      <input
                        id="userPassword"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        required={!id}
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* ─ 2. Assignment ─ */}
            <div id="assignment" style={{ scrollMarginTop: 120, marginBottom: 40 }}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>التعيين ومكان العمل</h2>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>اربط المستخدم بالفرع الذي يعمل به (اختياري للإدارة العليا).</p>
              </div>
              <section className="settings-card">
                <div className="card-body">
                  <div className="form-grid">
                    <div className="field field--full">
                      <label htmlFor="userBranch">الفرع التابع له</label>
                      <div className="select-wrap">
                        <select
                          id="userBranch"
                          value={formData.branchId}
                          onChange={e => setFormData({...formData, branchId: e.target.value})}
                        >
                          <option value="">-- غير محدد (صلاحية عامة) --</option>
                          {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* ─ 3. Access and Status ─ */}
            <div id="access" style={{ scrollMarginTop: 120 }}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>الصلاحيات والحالة</h2>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>تحكم في أدوار المستخدم وصلاحية وصوله للنظام.</p>
              </div>
              <section className="settings-card">
                <div className="card-body">
                  <div className="field field--full" style={{ marginBottom: 24 }}>
                    <label>الأدوار (Roles)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginTop: 12 }}>
                      {availableRoles.map(r => (
                        <label key={r} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                          <input 
                            type="checkbox" 
                            name="roles" 
                            value={r} 
                            checked={formData.roles.includes(r)} 
                            onChange={(e) => {
                              const newRoles = e.target.checked 
                                ? [...formData.roles, r] 
                                : formData.roles.filter(role => role !== r);
                              setFormData({ ...formData, roles: newRoles });
                            }} 
                            style={{ accentColor: 'var(--primary)', width: 16, height: 16 }} 
                          />
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{translateRole(r)}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="divider"></div>

                  <div className="switch-row">
                    <div className="switch-copy">
                      <span className="switch-icon"><i className="fa-solid fa-toggle-on"></i></span>
                      <div>
                        <strong>حساب نشط</strong>
                        <p>يمكنك تعطيل الحساب لاحقاً لمنع المستخدم من الدخول للنظام.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={formData.enabled}
                      className={`switch-btn ${formData.enabled ? 'switch-btn--active' : ''}`}
                      onClick={() => setFormData({...formData, enabled: !formData.enabled})}
                    >
                      <span/>
                    </button>
                  </div>
                </div>
              </section>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default UserForm;
