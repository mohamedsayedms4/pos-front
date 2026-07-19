import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';

import '../styles/pages/SettingsPremium.css';

const CustomerForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useGlobalUI();
  
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');
  const [branches, setBranches] = useState([]);

  const initialFormData = {
    name: '',
    phone: '',
    email: '',
    address: '',
    branchIds: []
  };

  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});

  // ScrollSpy
  useEffect(() => {
    const sectionIds = ['basic', 'branches'];
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
    const fetchData = async () => {
      try {
        const branchesData = await Api.getBranches();
        setBranches(branchesData || []);

        if (id) {
          const customerData = await Api.getCustomer(id);
          setFormData({
            name: customerData.name || '',
            phone: customerData.phone || '',
            email: customerData.email || '',
            address: customerData.address || '',
            branchIds: customerData.branches ? customerData.branches.map(b => b.id) : []
          });
        }
      } catch (err) {
        toast(err.message || 'فشل تحميل البيانات', 'error');
        navigate('/customers');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id, navigate, toast]);

  const handleSave = async (e, addAnother = false) => {
    if (e) e.preventDefault();
    setFormErrors({});

    if (!formData.name) {
      toast('يرجى إدخال اسم العميل', 'warning');
      setFormErrors({ name: 'هذا الحقل مطلوب' });
      return;
    }

    setSaving(true);

    try {
      if (id) {
        await Api.updateCustomer(id, formData);
        toast('تم تحديث بيانات العميل بنجاح', 'success');
      } else {
        await Api.createCustomer(formData);
        toast('تم إضافة العميل بنجاح', 'success');
      }
      
      if (addAnother && !id) {
         setFormData(initialFormData);
         window.scrollTo(0, 0);
         return;
      }

      navigate('/customers');
    } catch (err) {
      if (err.errors) {
        setFormErrors(err.errors);
        toast(err.message || 'يرجى تصحيح الأخطاء في الحقول المشار إليها', 'error');
      } else {
        toast(err.message, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleBranchToggle = (branchId) => {
    setFormData(prev => {
      const isSelected = prev.branchIds.includes(branchId);
      if (isSelected) {
        return { ...prev, branchIds: prev.branchIds.filter(id => id !== branchId) };
      } else {
        return { ...prev, branchIds: [...prev.branchIds, branchId] };
      }
    });
  };

  if (loading) return <Loader message="جاري التحميل..." />;

  const sections = [
    { id: 'basic',      label: 'البيانات الأساسية', icon: 'fa-solid fa-address-card' },
    { id: 'branches',   label: 'الفروع المرتبطة',  icon: 'fa-solid fa-store' },
  ];

  return (
    <div style={{ direction: 'rtl', minHeight: '100vh', paddingBottom: '60px' }}>

      {/* ── Sticky Page Header ── */}
      <div className="settings-page-header" style={{ padding: '14px 24px', marginBottom: 0 }}>
        <div>
          <span className="settings-eyebrow">إدارة العملاء</span>
          <h1 style={{ margin: 0, fontSize: 'clamp(20px,2vw,28px)', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {id ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--muted, #697386)', fontSize: 14 }}>
            قم بإضافة بيانات العميل والفروع التي يحق له التعامل معها.
          </p>
        </div>
        <div className="header-buttons">
          <button
            className="btn-seggele btn-seggele--secondary"
            type="button"
            onClick={() => navigate('/customers')}
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
            form="customerForm"
            disabled={saving}
          >
            {saving
              ? <><i className="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...</>
              : <><i className="fa-solid fa-check"></i> {id ? 'حفظ التعديلات' : 'حفظ العميل'}</>
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
              <strong>بياناتك محمية</strong>
              <p>يتم تشفير بيانات العملاء ولا تشارك مع أي أطراف أخرى.</p>
            </div>
          </div>
        </aside>

        {/* ── Content ── */}
        <div className="settings-content">
          <form id="customerForm" onSubmit={(e) => handleSave(e, false)}>

            {/* ─ 1. Basic Data ─ */}
            <div id="basic" style={{ scrollMarginTop: 120, marginBottom: 40 }}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>البيانات الأساسية</h2>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>المعلومات الرئيسية للتواصل مع العميل.</p>
              </div>
              <section className="settings-card">
                <div className="card-body">
                  <div className="form-grid">
                    
                    <div className="field field--full">
                      <label htmlFor="custName">اسم العميل <span className="required">*</span></label>
                      <input
                        id="custName"
                        placeholder="مثال: أحمد محمد"
                        value={formData.name}
                        onChange={e => {
                          setFormData({...formData, name: e.target.value});
                          if(formErrors.name) setFormErrors({...formErrors, name: null});
                        }}
                        style={formErrors.name ? { borderColor: 'var(--metro-red)' } : {}}
                        required
                      />
                      {formErrors.name && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.name}</span>}
                    </div>
                    
                    <div className="field">
                      <label htmlFor="custPhone">رقم الهاتف</label>
                      <input
                        id="custPhone"
                        placeholder="01xxxxxxxxx"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                      />
                      {formErrors.phone && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.phone}</span>}
                    </div>

                    <div className="field">
                      <label htmlFor="custEmail">البريد الإلكتروني</label>
                      <input
                        id="custEmail"
                        type="email"
                        placeholder="user@example.com"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                      />
                      {formErrors.email && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.email}</span>}
                    </div>
                    
                    <div className="field field--full">
                      <label htmlFor="custAddress">العنوان التفصيلي</label>
                      <textarea
                        id="custAddress"
                        className="form-control"
                        placeholder="أدخل عنوان العميل بالكامل..."
                        value={formData.address}
                        onChange={e => setFormData({...formData, address: e.target.value})}
                        style={{ minHeight: '80px', resize: 'vertical' }}
                      />
                      {formErrors.address && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.address}</span>}
                    </div>

                  </div>
                </div>
              </section>
            </div>

            {/* ─ 2. Branches ─ */}
            <div id="branches" style={{ scrollMarginTop: 120 }}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>الفروع المرتبطة</h2>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>حدد الفروع التي يُسمح للعميل بالتعامل معها.</p>
              </div>
              <section className="settings-card">
                <div className="card-body">
                  <div className="form-grid">
                    <div className="field field--full">
                      <label>اختر الفروع <span className="required">*</span></label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', background: 'var(--surface-2)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        {branches.map(branch => (
                          <label key={branch.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600 }}>
                            <div className="checkbox-wrapper" style={{ display: 'flex', alignItems: 'center' }}>
                                <input 
                                  type="checkbox" 
                                  checked={formData.branchIds.includes(branch.id)} 
                                  onChange={() => handleBranchToggle(branch.id)} 
                                  style={{ width: '18px', height: '18px', accentColor: 'var(--metro-blue)' }}
                                />
                            </div>
                            {branch.name}
                          </label>
                        ))}
                      </div>
                      {formErrors.branchIds && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '6px', display: 'block' }}>{formErrors.branchIds}</span>}
                      {formData.branchIds.length === 0 && <span style={{ color: 'var(--metro-orange)', fontSize: '0.8rem', marginTop: '6px', display: 'block' }}><i className="fa-solid fa-triangle-exclamation"></i> يفضل ربط العميل بفرع واحد على الأقل ليظهر في نقاط البيع الخاصة بالفرع.</span>}
                    </div>
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

export default CustomerForm;
