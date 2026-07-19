import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Api, { SERVER_URL } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';

import '../styles/pages/SettingsPremium.css';

const CategoryForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useGlobalUI();
  
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');
  const [categories, setCategories] = useState([]);

  const initialFormData = {
    name: '',
    description: '',
    parentId: ''
  };

  const [formData, setFormData] = useState(initialFormData);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  // ScrollSpy
  useEffect(() => {
    const sectionIds = ['basic', 'hierarchy'];
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

  const flattenCategories = (cats, level = 0) => {
    if (!cats) return [];
    let result = [];
    for (const cat of cats) {
      result.push({ ...cat, level });
      if (cat.children && cat.children.length) {
        result = result.concat(flattenCategories(cat.children, level + 1));
      }
    }
    return result;
  };

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const categoriesData = await Api.getCategories(true);
        setCategories(flattenCategories(categoriesData));
      } catch (err) {
        console.error("Error fetching categories", err);
      }
    };
    
    fetchOptions();

    if (id) {
      const fetchCategory = async () => {
        try {
          // Since getCategory by ID might not exist or we can just fetch all and find it
          // Wait, Api.getCategory(id) exists? Let's check or just fetch all and find.
          // In Categories.jsx, it passes the object directly from the list.
          // Let's assume Api.getCategory(id) exists or we get it from the list.
          const cats = await Api.getCategories(true);
          const flat = flattenCategories(cats);
          const category = flat.find(c => c.id.toString() === id.toString());
          
          if (!category) {
            throw new Error('الفئة غير موجودة');
          }

          setFormData({
            name: category.name || '',
            description: category.description || '',
            parentId: category.parentId || ''
          });
          setCurrentImageUrl(category.imageUrl);
        } catch (err) {
          toast(err.message, 'error');
          navigate('/categories');
        } finally {
          setLoading(false);
        }
      };
      fetchCategory();
    }
  }, [id]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSave = async (e, addAnother = false) => {
    if (e) e.preventDefault();
    setFormErrors({});

    if (!formData.name) {
      toast('يرجى إدخال اسم الفئة', 'warning');
      setFormErrors({ name: 'هذا الحقل مطلوب' });
      return;
    }

    setSaving(true);
    
    const apiData = {
      name: formData.name,
      description: formData.description || null,
      parentId: formData.parentId ? parseInt(formData.parentId) : null,
    };

    const formDataPayload = new FormData();
    formDataPayload.append('category', new Blob([JSON.stringify(apiData)], { type: 'application/json' }));
    if (imageFile) {
      formDataPayload.append('image', imageFile);
    }

    try {
      if (id) {
        await Api.updateCategory(id, formDataPayload);
        toast('تم تحديث الفئة بنجاح', 'success');
      } else {
        await Api.createCategory(formDataPayload);
        toast('تم إضافة الفئة بنجاح', 'success');
      }
      
      if (addAnother && !id) {
         setFormData(initialFormData);
         setImageFile(null);
         setPreviewUrl(null);
         setCurrentImageUrl(null);
         window.scrollTo(0, 0);
         return;
      }

      navigate('/categories');
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
    { id: 'basic',      label: 'البيانات الأساسية', icon: 'fa-solid fa-folder-open' },
    { id: 'hierarchy',  label: 'التنظيم والتفرع',  icon: 'fa-solid fa-sitemap' },
  ];

  return (
    <div style={{ direction: 'rtl', minHeight: '100vh', paddingBottom: '60px' }}>

      {/* ── Sticky Page Header ── */}
      <div className="settings-page-header" style={{ padding: '14px 24px', marginBottom: 0 }}>
        <div>
          <span className="settings-eyebrow">إدارة الفئات</span>
          <h1 style={{ margin: 0, fontSize: 'clamp(20px,2vw,28px)', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {id ? 'تعديل بيانات الفئة' : 'إضافة فئة جديدة'}
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--muted, #697386)', fontSize: 14 }}>
            قم بتهيئة بيانات الفئة لتنظيم وعرض المنتجات بشكل أفضل
          </p>
        </div>
        <div className="header-buttons">
          <button
            className="btn-seggele btn-seggele--secondary"
            type="button"
            onClick={() => navigate('/categories')}
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
              <i className="fa-solid fa-plus"></i> حفظ وإضافة أخرى
            </button>
          )}
          <button
            className="btn-seggele btn-seggele--primary"
            type="submit"
            form="categoryForm"
            disabled={saving}
          >
            {saving
              ? <><i className="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...</>
              : <><i className="fa-solid fa-check"></i> {id ? 'حفظ التعديلات' : 'حفظ الفئة'}</>
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
            <i className="fa-solid fa-lightbulb" style={{ marginTop: 2 }}></i>
            <div>
              <strong>نصيحة تنظيمية</strong>
              <p>استخدم الفئات الفرعية لترتيب المنتجات وتسهيل البحث للعملاء.</p>
            </div>
          </div>
        </aside>

        {/* ── Content ── */}
        <div className="settings-content">
          <form id="categoryForm" onSubmit={(e) => handleSave(e, false)}>

            {/* ─ 1. Basic Data ─ */}
            <div id="basic" style={{ scrollMarginTop: 120, marginBottom: 40 }}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>البيانات الأساسية</h2>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>المعلومات الرئيسية التي تُعرّف الفئة.</p>
              </div>
              <section className="settings-card">
                <div className="card-body">
                  <div className="form-grid">
                    <div className="field field--full" style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: 10 }}>
                      <div className="avatar-upload-container" style={{ position: 'relative', width: 90, height: 90 }}>
                        <div className="avatar-preview-box" style={{ width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden', border: '2px dashed var(--border)', display: 'grid', placeItems: 'center', background: 'var(--surface-2)' }}>
                          {previewUrl ? (
                            <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : currentImageUrl ? (
                            <img src={SERVER_URL + currentImageUrl} alt="Current" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <i className="fa-solid fa-image" style={{ fontSize: 32, color: 'var(--muted)' }}></i>
                          )}
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>صورة الفئة (اختياري)</label>
                        <button type="button" className="btn-seggele btn-seggele--secondary" onClick={() => document.getElementById('categoryImageInput').click()}>
                          <i className="fa-solid fa-upload"></i> {previewUrl || currentImageUrl ? 'تغيير الصورة' : 'رفع صورة'}
                        </button>
                        <input id="categoryImageInput" type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                        {formErrors.image && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '6px', display: 'block' }}>{formErrors.image}</span>}
                      </div>
                    </div>
                    
                    <div className="field field--full">
                      <label htmlFor="catName">اسم الفئة <span className="required">*</span></label>
                      <input
                        id="catName"
                        placeholder="مثال: أجهزة كهربائية"
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
                    
                    <div className="field field--full">
                      <label htmlFor="catDesc">الوصف</label>
                      <textarea
                        id="catDesc"
                        className="form-control"
                        placeholder="وصف مختصر للفئة..."
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        style={{ minHeight: '80px', resize: 'vertical' }}
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* ─ 2. Hierarchy ─ */}
            <div id="hierarchy" style={{ scrollMarginTop: 120 }}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>التنظيم والتفرع</h2>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>اربط هذه الفئة كقسم فرعي من فئة رئيسية أخرى (اختياري).</p>
              </div>
              <section className="settings-card">
                <div className="card-body">
                  <div className="form-grid">
                    <div className="field field--full">
                      <label htmlFor="catParent">الفئة الأم</label>
                      <div className="select-wrap">
                        <select
                          id="catParent"
                          value={formData.parentId}
                          onChange={e => setFormData({...formData, parentId: e.target.value})}
                        >
                          <option value="">-- بدون فئة أم (فئة رئيسية) --</option>
                          {categories.filter(c => c.id.toString() !== id?.toString()).map(c => (
                            <option key={c.id} value={c.id}>
                              {'—'.repeat(c.level)} {c.name}
                            </option>
                          ))}
                        </select>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
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

export default CategoryForm;
