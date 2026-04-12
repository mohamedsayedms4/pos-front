import React, { useState, useEffect } from 'react';
import StoreApi from '../../services/storeApi';
import { useGlobalUI } from '../common/GlobalUI';
import Loader from '../common/Loader';

const HeroSectionManager = () => {
    const { toast } = useGlobalUI();
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [form, setForm] = useState({
        id: null, title: '', subtitle: '', imageUrl: '', linkUrl: '', active: true, displayOrder: 0
    });
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        loadSections();
    }, []);

    const loadSections = async () => {
        setLoading(true);
        try {
            const res = await StoreApi.getHeroSectionsAdmin();
            if (res.success) setSections(res.data);
        } catch (e) {
            toast('خطأ في تحميل البيانات', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const res = await StoreApi.uploadHeroImage(file);
            if (res.success) {
                setForm({ ...form, imageUrl: res.data });
                toast('تم رفع الصورة بنجاح', 'success');
            }
        } catch (e) {
            toast('خطأ في الرفع', 'error');
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await StoreApi.saveHeroSection(form);
            if (res.success) {
                toast('تم الحفظ بنجاح', 'success');
                resetForm();
                loadSections();
            }
        } catch (e) {
            toast('خطأ في الحفظ', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (section) => {
        setForm(section);
        setIsEditing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('هل أنت متأكد من الحذف؟')) return;
        try {
            const res = await StoreApi.deleteHeroSection(id);
            if (res.success) {
                toast('تم الحذف', 'success');
                loadSections();
            }
        } catch (e) {
            toast('خطأ في الحذف', 'error');
        }
    };

    const handleToggle = async (id) => {
        try {
            const res = await StoreApi.toggleHeroSection(id);
            if (res.success) loadSections();
        } catch (e) {
            toast('خطأ في تغيير الحالة', 'error');
        }
    };

    const resetForm = () => {
        setForm({ id: null, title: '', subtitle: '', imageUrl: '', linkUrl: '', active: true, displayOrder: 0 });
        setIsEditing(false);
    };

    if (loading && sections.length === 0) return <Loader />;

    return (
        <div className="hero-manager">
            <div className="card" style={{ marginBottom: '25px' }}>
                <div className="products-header-premium">
                    <div className="row-premium title-row">
                        <h3 style={{ margin: 0 }}>{isEditing ? 'تعديل البانر' : 'إضافة بانر جديد'}</h3>
                    </div>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSave} className="hero-form">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                            <div className="form-group">
                                <label>العنوان الأساسي</label>
                                <input 
                                    className="form-control" 
                                    value={form.title} 
                                    onChange={e => setForm({...form, title: e.target.value})} 
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label>العنوان الفرعي</label>
                                <input 
                                    className="form-control" 
                                    value={form.subtitle || ''} 
                                    onChange={e => setForm({...form, subtitle: e.target.value})} 
                                />
                            </div>
                            <div className="form-group">
                                <label>رابط التوجيه عند الضغط على البانر</label>
                                <input 
                                    className="form-control" 
                                    placeholder="مثال: /store/category/1"
                                    value={form.linkUrl || ''} 
                                    onChange={e => setForm({...form, linkUrl: e.target.value})} 
                                />
                            </div>
                            <div className="form-group">
                                <label>أولوية العرض (الترتيب)</label>
                                <input 
                                    type="number" 
                                    className="form-control" 
                                    value={form.displayOrder} 
                                    onChange={e => setForm({...form, displayOrder: parseInt(e.target.value)})} 
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginTop: '15px' }}>
                            <label>صورة البانر</label>
                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                <div style={{ 
                                    width: '160px', height: '80px', background: 'var(--bg-elevated)', 
                                    borderRadius: '8px', overflow: 'hidden', border: '1px dashed var(--border-color)' 
                                }}>
                                    {form.imageUrl ? (
                                        <img src={StoreApi.getImageUrl(form.imageUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>لا توجد صورة</div>
                                    )}
                                </div>
                                <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                                    رفع صورة
                                    <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
                                </label>
                            </div>
                        </div>

                        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'جاري الحفظ...' : 'حفظ البيانات'}
                            </button>
                            {isEditing && (
                                <button type="button" className="btn btn-ghost" onClick={resetForm}>إلغاء</button>
                            )}
                        </div>
                    </form>
                </div>
            </div>

            <div className="card">
                <div className="products-header-premium">
                    <div className="row-premium title-row">
                        <h3 style={{ margin: 0 }}>قائمة البانرات الفعالة</h3>
                    </div>
                </div>
                <div className="card-body no-padding">
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>الصورة</th>
                                    <th>العنوان</th>
                                    <th>الترتيب</th>
                                    <th>الحالة</th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sections.map(s => (
                                    <tr key={s.id}>
                                        <td>
                                            <div style={{ width: '80px', height: '40px', background: 'var(--bg-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
                                                {s.imageUrl && <img src={StoreApi.getImageUrl(s.imageUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                            </div>
                                        </td>
                                        <td style={{ fontWeight: 600, color: 'var(--metro-blue)' }}>{s.title || 'بدون عنوان'}</td>
                                        <td><code style={{ background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '4px' }}>{s.displayOrder}</code></td>
                                        <td>
                                            <button 
                                                className={`badge ${s.active ? 'badge-success' : 'badge-danger'}`}
                                                onClick={() => handleToggle(s.id)}
                                                style={{ border: 'none', cursor: 'pointer' }}
                                            >
                                                {s.active ? 'مفعل' : 'معطل'}
                                            </button>
                                        </td>
                                        <td>
                                            <div className="table-actions" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <button className="btn btn-icon btn-ghost" title="تعديل" onClick={() => handleEdit(s)}>✏️</button>
                                                <button className="btn btn-icon btn-ghost" title="حذف" onClick={() => handleDelete(s.id)}>🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {sections.length === 0 && (
                                    <tr>
                                        <td colSpan="5">
                                            <div className="empty-state">
                                              <div className="empty-icon">🖼️</div>
                                              <h4>لا توجد بيانات</h4>
                                              <p>قم بإضافة بانرات جديدة للبدء</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeroSectionManager;
