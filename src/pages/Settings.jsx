import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StoreApi from '../services/storeApi';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import HeroSectionManager from '../components/settings/HeroSectionManager';
import '../styles/pages/SettingsPremium.css';

const Settings = () => {
    const { toast } = useGlobalUI();
    const [info, setInfo] = useState({
        name: '', aboutUs: '', currency: 'جنيه', logoUrl: '', facebookPixelId: '',
        facebookAdAccountId: '', facebookAccessToken: '', address: '', phone1: '', phone2: '',
        whatsappNumber: '', email: '', facebookUrl: '', instagramUrl: '', tiktokUrl: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => { loadInfo(); }, []);

    const loadInfo = async () => {
        setLoading(true);
        try { const res = await StoreApi.getStoreInfoAdmin(); if (res.success) setInfo(res.data); }
        catch (e) { toast('خطأ في تحميل الإعدادات', 'error'); }
        finally { setLoading(false); }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await StoreApi.updateStoreInfoAdmin(info);
            if (res.success) { toast('تم حفظ الإعدادات بنجاح ✅', 'success'); setInfo(res.data); }
            else { toast(res.message, 'error'); }
        } catch (e) { toast('خطأ في الاتصال بالسيرفر', 'error'); }
        finally { setSaving(false); }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        setUploading(true);
        try {
            const res = await StoreApi.uploadLogo(file);
            if (res.success) { toast('تم تحديث اللوجو', 'success'); setInfo(prev => ({ ...prev, logoUrl: res.data })); }
            else { toast(res.message, 'error'); }
        } catch (e) { toast('خطأ في الرفع', 'error'); }
        finally { setUploading(false); }
    };

    if (loading) return <Loader />;
    const logoPreview = StoreApi.getImageUrl(info.logoUrl);

    return (
        <div className="settings-container">
            {/* 1. Header */}
            <div className="set-header-row">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="set-breadcrumbs">
                        <Link to="/dashboard">الرئيسية</Link> / <span>الإعدادات</span>
                    </div>
                    <h1>إعدادات المتجر والهوية البصرية</h1>
                </div>
                <div className="set-header-actions">
                    <button type="submit" form="settingsForm" className="set-btn-premium set-btn-blue" disabled={saving}>
                        <i className="fas fa-save"></i> {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                    </button>
                </div>
            </div>

            {/* 2. Stats/Section Indicators */}
            <div className="set-stats-grid">
                <div className="set-stat-card">
                    <div className="set-stat-info"><h4>معلومات المتجر</h4><div style={{ fontSize: '0.8rem', opacity: 0.6 }}>الاسم والعنوان والهوية</div></div>
                    <div className="set-stat-visual"><div className="set-stat-icon icon-blue"><i className="fas fa-store"></i></div></div>
                </div>
                <div className="set-stat-card">
                    <div className="set-stat-info"><h4>قنوات التواصل</h4><div style={{ fontSize: '0.8rem', opacity: 0.6 }}>الهاتف والواتساب والإيميل</div></div>
                    <div className="set-stat-visual"><div className="set-stat-icon icon-green"><i className="fas fa-phone-alt"></i></div></div>
                </div>
                <div className="set-stat-card">
                    <div className="set-stat-info"><h4>الشبكات الاجتماعية</h4><div style={{ fontSize: '0.8rem', opacity: 0.6 }}>فيسبوك، انستجرام، تيك توك</div></div>
                    <div className="set-stat-visual"><div className="set-stat-icon icon-purple"><i className="fas fa-share-nodes"></i></div></div>
                </div>
                <div className="set-stat-card">
                    <div className="set-stat-info"><h4>تتبع الإعلانات</h4><div style={{ fontSize: '0.8rem', opacity: 0.6 }}>Facebook Pixel & Ads API</div></div>
                    <div className="set-stat-visual"><div className="set-stat-icon icon-amber"><i className="fas fa-chart-line"></i></div></div>
                </div>
            </div>

            <form id="settingsForm" onSubmit={handleSave}>
                <div className="set-table-card" style={{ padding: '32px' }}>
                    {/* Logo Section */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '32px', marginBottom: '40px', padding: '24px', background: 'rgba(99,102,241,0.03)', borderRadius: '20px', border: '1px solid var(--set-border)' }}>
                        <div style={{ width: '120px', height: '120px', borderRadius: '24px', border: '2px dashed var(--set-border)', background: 'var(--set-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                            {logoPreview ? <img src={logoPreview} style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} /> : <i className="fas fa-image" style={{ fontSize: '2rem', opacity: 0.2 }}></i>}
                            {uploading && <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center' }}><i className="fas fa-spinner fa-spin"></i></div>}
                        </div>
                        <div>
                            <h3 style={{ margin: 0 }}>شعار العلامة التجارية</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--set-text-secondary)', margin: '8px 0 16px' }}>ارفع لوجو المتجر بصيغة PNG أو JPG بدقة عالية.</p>
                            <label className="set-btn-premium set-btn-outline" style={{ cursor: 'pointer' }}>
                                <i className="fas fa-upload"></i> تغيير الشعار
                                <input type="file" hidden onChange={handleLogoUpload} accept="image/*" />
                            </label>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
                        <div className="set-form-group"><label>اسم المتجر (Brand Name)</label><input className="set-input" value={info.name} onChange={e => setInfo({...info, name: e.target.value})} required /></div>
                        <div className="set-form-group"><label>العنوان الفعلي (المقر)</label><input className="set-input" value={info.address || ''} onChange={e => setInfo({...info, address: e.target.value})} /></div>
                        <div className="set-form-group"><label>عملة المتجر (Currency)</label><input className="set-input" value={info.currency} onChange={e => setInfo({...info, currency: e.target.value})} /></div>
                        
                        <div className="set-form-group"><label>رقم الهاتف الأساسي</label><input className="set-input" value={info.phone1} onChange={e => setInfo({...info, phone1: e.target.value})} /></div>
                        <div className="set-form-group"><label>رقم هاتف إضافي</label><input className="set-input" value={info.phone2 || ''} onChange={e => setInfo({...info, phone2: e.target.value})} /></div>
                        <div className="set-form-group"><label>رقم الواتساب</label><input className="set-input" value={info.whatsappNumber || ''} onChange={e => setInfo({...info, whatsappNumber: e.target.value})} /></div>
                        
                        <div className="set-form-group"><label>رابط فيسبوك</label><input className="set-input" value={info.facebookUrl || ''} onChange={e => setInfo({...info, facebookUrl: e.target.value})} /></div>
                        <div className="set-form-group"><label>رابط انستجرام</label><input className="set-input" value={info.instagramUrl || ''} onChange={e => setInfo({...info, instagramUrl: e.target.value})} /></div>
                        <div className="set-form-group"><label>رابط تيك توك</label><input className="set-input" value={info.tiktokUrl || ''} onChange={e => setInfo({...info, tiktokUrl: e.target.value})} /></div>
                    </div>

                    <div className="set-form-group" style={{ marginTop: '32px' }}>
                        <label>نبذة عن المتجر (تظهر في تذييل الموقع)</label>
                        <textarea className="set-input" rows={4} value={info.aboutUs || ''} onChange={e => setInfo({...info, aboutUs: e.target.value})} />
                    </div>

                    <div style={{ marginTop: '40px', padding: '24px', background: 'rgba(59,130,246,0.05)', borderRadius: '20px', border: '1px solid rgba(59,130,246,0.1)' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}><i className="fab fa-facebook" style={{ color: '#1877F2' }}></i> إعدادات تتبع الإعلانات (Facebook Marketing)</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                            <div className="set-form-group"><label>Pixel ID</label><input className="set-input" value={info.facebookPixelId || ''} onChange={e => setInfo({...info, facebookPixelId: e.target.value})} /></div>
                            <div className="set-form-group"><label>Ad Account ID</label><input className="set-input" value={info.facebookAdAccountId || ''} onChange={e => setInfo({...info, facebookAdAccountId: e.target.value})} /></div>
                            <div className="set-form-group" style={{ gridColumn: '1 / -1' }}><label>Access Token (Marketing API)</label><input className="set-input" type="password" value={info.facebookAccessToken || ''} onChange={e => setInfo({...info, facebookAccessToken: e.target.value})} /></div>
                        </div>
                    </div>
                </div>
            </form>

            <div className="set-table-card" style={{ marginTop: '40px', padding: '32px' }}>
                <h2 style={{ marginBottom: '24px' }}>🖼️ إدارة البنرات الإعلانية (Hero Sections)</h2>
                <HeroSectionManager />
            </div>
        </div>
    );
};

export default Settings;
