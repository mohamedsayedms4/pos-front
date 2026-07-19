import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import { useBranch } from '../context/BranchContext';

import '../styles/pages/SettingsPremium.css';

const SupplierForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useGlobalUI();
  const { selectedBranchId } = useBranch();
  
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');

  const initialFormData = {
    name: '',
    phone: '',
    email: '',
    address: '',
    taxNumber: ''
  };

  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});

  // ScrollSpy
  useEffect(() => {
    const sectionIds = ['basic'];
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
    if (id) {
      const fetchSupplier = async () => {
        try {
          const supplierData = await Api.getSupplier(id);
          setFormData({
            name: supplierData.name || '',
            phone: supplierData.phone || '',
            email: supplierData.email || '',
            address: supplierData.address || '',
            taxNumber: supplierData.taxNumber || ''
          });
        } catch (err) {
          toast(err.message || 'فشل تحميل بيانات المورد', 'error');
          navigate('/suppliers');
        } finally {
          setLoading(false);
        }
      };
      fetchSupplier();
    }
  }, [id, navigate, toast]);

  const handleSave = async (e, addAnother = false) => {
    if (e) e.preventDefault();
    setFormErrors({});

    if (!formData.name) {
      toast('يرجى إدخال اسم المورد', 'warning');
      setFormErrors({ name: 'هذا الحقل مطلوب' });
      return;
    }

    setSaving(true);

    try {
      if (id) {
        await Api.updateSupplier(id, formData);
        toast('تم تحديث بيانات المورد بنجاح', 'success');
      } else {
        await Api.createSupplier(formData, selectedBranchId);
        toast('تم إضافة المورد بنجاح', 'success');
      }
      
      if (addAnother && !id) {
         setFormData(initialFormData);
         window.scrollTo(0, 0);
         return;
      }

      navigate('/suppliers');
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

  if (loading) return <Loader message="جاري التحميل..." />;

  const sections = [
    { id: 'basic', label: 'البيانات الأساسية', icon: 'fa-solid fa-building' }
  ];

  return (
    <div style={{ direction: 'rtl', minHeight: '100vh', paddingBottom: '60px' }}>

      {/* ── Sticky Page Header ── */}
      <div className="settings-page-header" style={{ padding: '14px 24px', marginBottom: 0 }}>
        <div>
          <span className="settings-eyebrow">إدارة الموردين</span>
          <h1 style={{ margin: 0, fontSize: 'clamp(20px,2vw,28px)', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {id ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--muted, #697386)', fontSize: 14 }}>
            قم بإضافة بيانات المورد لتسهيل عمليات الشراء والتوريد.
          </p>
        </div>
        <div className="header-buttons">
          <button
            className="btn-seggele btn-seggele--secondary"
            type="button"
            onClick={() => navigate('/suppliers')}
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
            form="supplierForm"
            disabled={saving}
          >
            {saving
              ? <><i className="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...</>
              : <><i className="fa-solid fa-check"></i> {id ? 'حفظ التعديلات' : 'حفظ المورد'}</>
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
              <p>يتم تشفير بيانات الموردين ولا تشارك مع أي أطراف أخرى.</p>
            </div>
          </div>
        </aside>

        {/* ── Content ── */}
        <div className="settings-content">
          <form id="supplierForm" onSubmit={(e) => handleSave(e, false)}>

            {/* ─ 1. Basic Data ─ */}
            <div id="basic" style={{ scrollMarginTop: 120, marginBottom: 40 }}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>البيانات الأساسية</h2>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>المعلومات الرئيسية للتواصل مع المورد والتعاملات المالية.</p>
              </div>
              <section className="settings-card">
                <div className="card-body">
                  <div className="form-grid">
                    
                    <div className="field field--full">
                      <label htmlFor="suppName">اسم المورد <span className="required">*</span></label>
                      <input
                        id="suppName"
                        placeholder="مثال: شركة النور للتوريدات"
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
                      <label htmlFor="suppPhone">رقم الهاتف</label>
                      <input
                        id="suppPhone"
                        placeholder="01xxxxxxxxx"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                      />
                      {formErrors.phone && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.phone}</span>}
                    </div>

                    <div className="field">
                      <label htmlFor="suppEmail">البريد الإلكتروني</label>
                      <input
                        id="suppEmail"
                        type="email"
                        placeholder="supplier@example.com"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                      />
                      {formErrors.email && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.email}</span>}
                    </div>

                    <div className="field">
                      <label htmlFor="suppTaxNumber">الرقم الضريبي</label>
                      <input
                        id="suppTaxNumber"
                        placeholder="مثال: 123-456-789"
                        value={formData.taxNumber}
                        onChange={e => setFormData({...formData, taxNumber: e.target.value})}
                      />
                      {formErrors.taxNumber && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.taxNumber}</span>}
                    </div>
                    
                    <div className="field field--full">
                      <label htmlFor="suppAddress">العنوان التفصيلي</label>
                      <textarea
                        id="suppAddress"
                        className="form-control"
                        placeholder="أدخل عنوان المورد بالكامل..."
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

          </form>
        </div>
      </div>
    </div>
  );
};

export default SupplierForm;
