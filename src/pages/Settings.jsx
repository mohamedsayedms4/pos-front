import React, { useState, useEffect } from 'react';
import StoreApi from '../services/storeApi';
import { SERVER_URL } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import HeroSectionManager from '../components/settings/HeroSectionManager';

const Settings = () => {
    const { toast } = useGlobalUI();
    const [info, setInfo] = useState({
        name: '', phone1: '', phone2: '', email: '', address: '',
        whatsappNumber: '', facebookUrl: '', instagramUrl: '', tiktokUrl: '',
        aboutUs: '', currency: 'جنيه', logoUrl: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        loadInfo();
    }, []);

    const loadInfo = async () => {
        setLoading(true);
        try {
            const res = await StoreApi.getStoreInfoAdmin();
            if (res.success) setInfo(res.data);
        } catch (e) {
            toast('خطأ في تحميل الإعدادات', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await StoreApi.updateStoreInfoAdmin(info);
            if (res.success) {
                toast('تم حفظ الإعدادات بنجاح ✅', 'success');
                setInfo(res.data);
            } else {
                toast(res.message, 'error');
            }
        } catch (e) {
            toast('خطأ في الاتصال بالسيرفر', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const res = await StoreApi.uploadLogo(file);
            if (res.success) {
                toast('تم تحديث اللوجو بنجاح', 'success');
                setInfo(prev => ({ ...prev, logoUrl: res.data }));
            } else {
                toast(res.message, 'error');
            }
        } catch (e) {
            toast('خطأ في رفع اللوجو', 'error');
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <Loader />;

    const logoPreview = StoreApi.getImageUrl(info.logoUrl);

    return (
        <div className="page-section" style={{ direction: 'rtl' }}>
            <div className="page-header" style={{ marginBottom: '30px' }}>
                <div className="page-title">
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '5px' }}>🏛️ إعدادات هوية المتجر</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>أدخل بيانات البراند الخاص بك لتظهر بشكل احترافي في النسخة الأونلاين والتقارير.</p>
                </div>
                <div className="page-actions">
                    <button 
                        type="submit" 
                        form="settingsForm"
                        className="btn btn-green"
                        disabled={saving}
                        style={{ height: '45px', padding: '0 30px', fontWeight: 700, fontSize: '1rem' }}
                    >
                        {saving ? '⏳ جاري الحفظ...' : '✅ حفظ الإعدادات'}
                    </button>
                </div>
            </div>

            <form id="settingsForm" onSubmit={handleSave} className="grid-layout">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '25px', alignItems: 'start' }}>
                    
                    {/* Left Column: Branding */}
                    <div className="side-cards" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                        <div className="card">
                            <div className="card-header">
                                <h3>🎨 اللوجو والهوية</h3>
                            </div>
                            <div className="card-body" style={{ textAlign: 'center', padding: '30px 20px' }}>
                                <div style={{ 
                                    width: '140px', height: '140px', margin: '0 auto 20px',
                                    background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '2px dashed var(--border-color)', overflow: 'hidden',
                                    position: 'relative'
                                }}>
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Logo" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} />
                                    ) : (
                                        <span style={{ fontSize: '3rem', opacity: 0.3 }}>🏛️</span>
                                    )}
                                    {uploading && (
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                            ⏳
                                        </div>
                                    )}
                                </div>
                                <label className="btn btn-secondary" style={{ width: '100%', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                    <span>📸 تغيير اللوجو</span>
                                    <input type="file" className="hidden" onChange={handleLogoUpload} disabled={uploading} accept="image/*" />
                                </label>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '12px' }}>يفضل استخدام صورة PNG شفافة</p>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-header">
                                <h3>📊 إعدادات النظام</h3>
                            </div>
                            <div className="card-body">
                                <div className="form-group">
                                    <label>الاسم الرسمي للمتجر</label>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        value={info.name}
                                        onChange={e => setInfo({...info, name: e.target.value})}
                                        required
                                        placeholder="مثال: مهلهل جروب"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>رمز العملة في المتجر</label>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        value={info.currency}
                                        onChange={e => setInfo({...info, currency: e.target.value})}
                                        placeholder="مثال: جنيه، ج.م، $"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Contact & About */}
                    <div className="main-cards" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                        <div className="card">
                            <div className="card-header">
                                <h3>📞 معلومات التواصل</h3>
                            </div>
                            <div className="card-body">
                                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>رقم الهاتف الأساسي</label>
                                        <input className="form-control" value={info.phone1} onChange={e => setInfo({...info, phone1: e.target.value})} />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>رقم هاتف إضافي</label>
                                        <input className="form-control" value={info.phone2 || ''} onChange={e => setInfo({...info, phone2: e.target.value})} />
                                    </div>
                                </div>
                                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>البريد الإلكتروني</label>
                                        <input type="email" className="form-control" value={info.email || ''} onChange={e => setInfo({...info, email: e.target.value})} />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>رقم الواتساب</label>
                                        <input className="form-control" value={info.whatsappNumber || ''} onChange={e => setInfo({...info, whatsappNumber: e.target.value})} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>عنوان المكتب / الفرع الرئيسي</label>
                                    <textarea className="form-control" rows={2} value={info.address || ''} onChange={e => setInfo({...info, address: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-header">
                                <h3>🌐 الروابط والسوشيال ميديا</h3>
                            </div>
                            <div className="card-body">
                                <div className="social-links" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div className="input-with-icon" style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>FB</span>
                                        <input className="form-control" style={{ paddingRight: '45px' }} placeholder="رابط صفحة فيسبوك" value={info.facebookUrl || ''} onChange={e => setInfo({...info, facebookUrl: e.target.value})} />
                                    </div>
                                    <div className="input-with-icon" style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>IG</span>
                                        <input className="form-control" style={{ paddingRight: '45px' }} placeholder="رابط انستجرام" value={info.instagramUrl || ''} onChange={e => setInfo({...info, instagramUrl: e.target.value})} />
                                    </div>
                                    <div className="input-with-icon" style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>TK</span>
                                        <input className="form-control" style={{ paddingRight: '45px' }} placeholder="رابط تيك توك" value={info.tiktokUrl || ''} onChange={e => setInfo({...info, tiktokUrl: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-header">
                                <h3>📝 نبذة "عن الموقع"</h3>
                            </div>
                            <div className="card-body">
                                <textarea 
                                    className="form-control" 
                                    style={{ height: '120px' }} 
                                    placeholder="هذا النص سيظهر في أسفل صفحة المتجر لتعريف العملاء بمشروعك..."
                                    value={info.aboutUs || ''}
                                    onChange={e => setInfo({...info, aboutUs: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            <div style={{ marginTop: '50px' }}>
                <div className="page-header" style={{ marginBottom: '20px' }}>
                    <div className="page-title">
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '5px' }}>🖼️ إدارة الـ Hero Sections</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>تحكم في البانرات الرئيسية التي تظهر في واجهة المتجر (Slideshow).</p>
                    </div>
                </div>
                <HeroSectionManager />
            </div>

            <style>{`
                .grid-layout { margin-top: 10px; }
                .form-control {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    color: var(--text-main);
                    border-radius: var(--radius-md);
                    transition: border-color 0.2s;
                }
                .form-control:focus {
                    border-color: var(--accent-blue);
                    outline: none;
                }
                @media (max-width: 992px) {
                    div[style*="grid-template-columns: 1fr 2fr"] {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default Settings;
