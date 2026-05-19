import React, { useState, useEffect } from 'react';
import StoreApi from '../services/storeApi';
import { SERVER_URL } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import HeroSectionManager from '../components/settings/HeroSectionManager';

const Settings = () => {
    const { toast } = useGlobalUI();
    const [info, setInfo] = useState({
        aboutUs: '', currency: 'جنيه', logoUrl: '', facebookPixelId: '',
        facebookAdAccountId: '', facebookAccessToken: ''
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
            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="products-header-premium">
                    <div className="row-premium title-row">
                        <h3 style={{ margin: 0 }}>⚙️ إعدادات المتجر والهوية</h3>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                                type="submit" 
                                form="settingsForm"
                                className="btn btn-primary"
                                disabled={saving}
                            >
                                {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="card-body">
                    <form id="settingsForm" onSubmit={handleSave}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                            
                            {/* Logo Section */}
                            <div className="form-group" style={{ gridColumn: '1 / -1', background: 'var(--bg-elevated)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div style={{ 
                                    width: '100px', height: '100px', 
                                    background: 'var(--bg-card)', borderRadius: '8px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '1px dashed var(--border-color)', overflow: 'hidden',
                                    position: 'relative', flexShrink: 0
                                }}>
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Logo" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} />
                                    ) : (
                                        <span style={{ fontSize: '2rem', opacity: 0.3 }}>🖼️</span>
                                    )}
                                    {uploading && (
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                            ...
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: 'var(--text-main)' }}>شعار المتجر (اللوجو)</h4>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>يفضل استخدام صورة PNG شفافة بخلفية مفرغة</p>
                                    <label className="btn btn-sm btn-secondary" style={{ cursor: 'pointer', display: 'inline-block' }}>
                                        رفع صورة جديدة
                                        <input type="file" className="hidden" onChange={handleLogoUpload} disabled={uploading} accept="image/*" />
                                    </label>
                                </div>
                            </div>

                            {/* Basic Info */}
                            <div className="form-group">
                                <label>اسم المتجر</label>
                                <input type="text" className="form-control" value={info.name} onChange={e => setInfo({...info, name: e.target.value})} required />
                            </div>
                            <div className="form-group">
                                <label>العنوان</label>
                                <input type="text" className="form-control" value={info.address || ''} onChange={e => setInfo({...info, address: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>العملة</label>
                                <input type="text" className="form-control" value={info.currency} onChange={e => setInfo({...info, currency: e.target.value})} />
                            </div>

                            {/* Contact Info */}
                            <div className="form-group">
                                <label>رقم الهاتف الأساسي</label>
                                <input type="text" className="form-control" value={info.phone1} onChange={e => setInfo({...info, phone1: e.target.value})} required />
                            </div>
                            <div className="form-group">
                                <label>رقم هاتف إضافي</label>
                                <input type="text" className="form-control" value={info.phone2 || ''} onChange={e => setInfo({...info, phone2: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>رقم الواتساب</label>
                                <input type="text" className="form-control" value={info.whatsappNumber || ''} onChange={e => setInfo({...info, whatsappNumber: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>البريد الإلكتروني</label>
                                <input type="email" className="form-control" value={info.email || ''} onChange={e => setInfo({...info, email: e.target.value})} />
                            </div>

                            {/* Social Links */}
                            <div className="form-group">
                                <label>رابط فيسبوك</label>
                                <input type="text" className="form-control" value={info.facebookUrl || ''} onChange={e => setInfo({...info, facebookUrl: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>رابط انستجرام</label>
                                <input type="text" className="form-control" value={info.instagramUrl || ''} onChange={e => setInfo({...info, instagramUrl: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>رابط تيك توك</label>
                                <input type="text" className="form-control" value={info.tiktokUrl || ''} onChange={e => setInfo({...info, tiktokUrl: e.target.value})} />
                            </div>

                            {/* Facebook Pixel */}
                            <div className="form-group" style={{ gridColumn: '1 / -1', background: 'var(--bg-elevated)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '1.2rem' }}>📊</span>
                                    <strong>Facebook Pixel ID</strong>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>(اختياري — لتتبع إعلانات فيسبوك)</span>
                                </label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={info.facebookPixelId || ''} 
                                    onChange={e => setInfo({...info, facebookPixelId: e.target.value})}
                                    placeholder="مثال: 1234567890123456"
                                    style={{ fontFamily: 'monospace', letterSpacing: '1px' }}
                                />
                                <small style={{ color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
                                    ستجد الـ Pixel ID في <a href="https://business.facebook.com/events_manager" target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>Facebook Events Manager</a> → Data Sources → Pixel
                                </small>
                            </div>

                            {/* Facebook Ads Insights Config */}
                            <div className="form-group" style={{ gridColumn: '1 / -1', background: 'var(--bg-elevated)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '1.2rem' }}>📈</span>
                                    <strong>إعدادات تقارير الإعلانات (Facebook Ads Reports)</strong>
                                </label>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
                                    <div className="form-group">
                                        <label style={{ fontSize: '0.85rem' }}>Ad Account ID</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            value={info.facebookAdAccountId || ''} 
                                            onChange={e => setInfo({...info, facebookAdAccountId: e.target.value})}
                                            placeholder="مثال: 1234567890"
                                            style={{ fontFamily: 'monospace' }}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label style={{ fontSize: '0.85rem' }}>System User Access Token</label>
                                        <input 
                                            type="password" 
                                            className="form-control" 
                                            value={info.facebookAccessToken || ''} 
                                            onChange={e => setInfo({...info, facebookAccessToken: e.target.value})}
                                            placeholder="EAAB..."
                                        />
                                    </div>
                                </div>
                                <small style={{ color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
                                     للحصول على الـ Token والـ ID، اتبع دليل <a href="https://developers.facebook.com/docs/marketing-api/get-started" target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>Marketing API Get Started</a>. يجب أن يحتوي الـ Token على صلاحية <code>ads_read</code>.
                                </small>
                            </div>

                            {/* About Us */}
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label>نبذة عن المتجر (تظهر في تذييل الموقع)</label>
                                <textarea className="form-control" rows={3} value={info.aboutUs || ''} onChange={e => setInfo({...info, aboutUs: e.target.value})} />
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            <div className="card">
                <div className="products-header-premium">
                    <div className="row-premium title-row">
                        <h3 style={{ margin: 0 }}>🖼️ الـ Banner الإعلاني (Hero Sections)</h3>
                    </div>
                </div>
                <div className="card-body">
                    <HeroSectionManager />
                </div>
            </div>
        </div>
    );
};

export default Settings;
