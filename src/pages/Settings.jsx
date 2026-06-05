import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import StoreApi from '../services/storeApi';
import { SERVER_URL } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import HeroSectionManager from '../components/settings/HeroSectionManager';
import ChatService from '../services/ChatService';
import CommunicationApi from '../services/CommunicationApi';

const Settings = () => {
    const location = useLocation();
    const { toast } = useGlobalUI();
    const [info, setInfo] = useState({
        aboutUs: '', currency: 'جنيه', logoUrl: '', facebookPixelId: '',
        facebookAdAccountId: '', facebookAccessToken: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [interBranchChatEnabled, setInterBranchChatEnabled] = useState(true);
    
    // SMTP Config
    const [smtpConfig, setSmtpConfig] = useState({
        host: '', port: 587, username: '', password: '', 
        authEnabled: true, tlsEnabled: true, fromEmail: '', fromName: ''
    });
    const [savingSmtp, setSavingSmtp] = useState(false);

    // Print Settings State
    const [printFormat, setPrintFormat] = useState(() => localStorage.getItem('print_format') || '80mm');
    const [printTemplate, setPrintTemplate] = useState(() => localStorage.getItem('print_template') || 'standard');
    const [printAutoTrigger, setPrintAutoTrigger] = useState(() => localStorage.getItem('print_auto_trigger') === 'true');

    // Sync template default when format changes
    useEffect(() => {
        const savedFormat = localStorage.getItem('print_format') || '80mm';
        const savedTemplate = localStorage.getItem('print_template');
        if (printFormat !== savedFormat || !savedTemplate) {
            const defaultTemplate = printFormat === 'A4' ? 'classic' : 'standard';
            setPrintTemplate(defaultTemplate);
            localStorage.setItem('print_template', defaultTemplate);
        }
    }, [printFormat]);

    const handleSavePrintSettings = (e) => {
        e.preventDefault();
        localStorage.setItem('print_format', printFormat);
        localStorage.setItem('print_template', printTemplate);
        localStorage.setItem('print_auto_trigger', String(printAutoTrigger));
        toast('تم حفظ إعدادات الطباعة بنجاح على هذا الجهاز 🖨️', 'success');
    };

    useEffect(() => {
        loadInfo();
    }, []);

    const loadInfo = async () => {
        setLoading(true);
        try {
            const res = await StoreApi.getStoreInfoAdmin();
            if (res.success) setInfo(res.data);
            
            try {
                const chatSetting = await ChatService.getInterBranchSetting();
                setInterBranchChatEnabled(chatSetting);
            } catch(e) {
                console.warn('Could not load chat settings');
            }

            try {
                const smtpData = await CommunicationApi.getSmtpConfig();
                if (smtpData) setSmtpConfig(smtpData);
            } catch (e) {
                console.warn('Could not load SMTP config');
            }
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
            try {
                await ChatService.setInterBranchSetting(interBranchChatEnabled);
            } catch(e) {
                console.warn('Could not save chat settings');
            }
            
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

    const handleSaveSmtp = async (e) => {
        e.preventDefault();
        setSavingSmtp(true);
        try {
            await CommunicationApi.saveSmtpConfig(smtpConfig);
            toast('تم حفظ إعدادات خادم البريد بنجاح', 'success');
        } catch (e) {
            toast('خطأ أثناء حفظ إعدادات البريد', 'error');
        } finally {
            setSavingSmtp(false);
        }
    };

    if (loading) return <Loader />;

    const logoPreview = StoreApi.getImageUrl(info.logoUrl);

    const isIdentity = location.pathname === '/settings';
    const isSmtp = location.pathname === '/settings/smtp';
    const isPrint = location.pathname === '/settings/print';
    const isBanner = location.pathname === '/settings/banner';

    return (
        <div className="page-section" style={{ direction: 'rtl' }}>
            {isIdentity && (
            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="card-header">
                    <h3>⚙️ إعدادات المتجر والهوية</h3>
                    <div className="toolbar" style={{ display: 'flex', gap: '10px' }}>
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
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                        يفضل استخدام صورة PNG شفافة أو SVG. المقاسات المستخدمة في النظام:
                                    </p>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', background: 'var(--bg-card)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                        <span>• الجانبية والفوتر: 32px × 32px</span>
                                        <span>• صفحة تسجيل الدخول: 64px × 64px</span>
                                        <span>• صفحة الهبوط: 44px × 44px</span>
                                        <span>• أيقونة المتصفح: 16px × 16px</span>
                                    </div>
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

                            {/* Chat Settings */}
                            <div className="form-group" style={{ gridColumn: '1 / -1', background: 'var(--bg-elevated)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '1.2rem' }}>💬</span>
                                    <strong>إعدادات المحادثات (Chat)</strong>
                                </label>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                                    <input 
                                        type="checkbox" 
                                        id="interBranchChatToggle"
                                        checked={interBranchChatEnabled}
                                        onChange={e => setInterBranchChatEnabled(e.target.checked)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="interBranchChatToggle" style={{ margin: 0, cursor: 'pointer', userSelect: 'none' }}>
                                        السماح للموظفين بالمحادثة بين الأفرع المختلفة (Inter-branch Chat)
                                    </label>
                                </div>
                                <small style={{ color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
                                    عند إيقاف هذا الخيار، سيتمكن الموظفون فقط من مراسلة زملائهم في نفس الفرع. (المدراء مستثنون دائماً من هذا القيد).
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
            )}

            {/* SMTP Settings Card */}
            {isSmtp && (
            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="card-header">
                    <h3>📧 إعدادات خادم البريد (SMTP)</h3>
                    <div className="toolbar" style={{ display: 'flex', gap: '10px' }}>
                        <button 
                            type="submit" 
                            form="smtpForm"
                            className="btn btn-primary"
                            disabled={savingSmtp}
                        >
                            {savingSmtp ? 'جاري الحفظ...' : 'حفظ إعدادات البريد'}
                        </button>
                    </div>
                </div>
                
                <div className="card-body">
                    <form id="smtpForm" onSubmit={handleSaveSmtp}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                            <div className="form-group">
                                <label>الخادم (Host)</label>
                                <input type="text" className="form-control" value={smtpConfig.host || ''} onChange={e => setSmtpConfig({...smtpConfig, host: e.target.value})} placeholder="smtp.gmail.com" required />
                            </div>
                            <div className="form-group">
                                <label>المنفذ (Port)</label>
                                <input type="number" className="form-control" value={smtpConfig.port || ''} onChange={e => setSmtpConfig({...smtpConfig, port: e.target.value})} placeholder="587" required />
                            </div>
                            <div className="form-group">
                                <label>اسم المستخدم (Email)</label>
                                <input type="text" className="form-control" value={smtpConfig.username || ''} onChange={e => setSmtpConfig({...smtpConfig, username: e.target.value})} placeholder="example@gmail.com" required />
                            </div>
                            <div className="form-group">
                                <label>كلمة المرور (App Password)</label>
                                <input type="password" className="form-control" value={smtpConfig.password || ''} onChange={e => setSmtpConfig({...smtpConfig, password: e.target.value})} placeholder="اترك فارغاً إن لم ترغب بتغييره" />
                            </div>
                            <div className="form-group">
                                <label>إيميل المرسل (From Email)</label>
                                <input type="email" className="form-control" value={smtpConfig.fromEmail || ''} onChange={e => setSmtpConfig({...smtpConfig, fromEmail: e.target.value})} placeholder="info@mystore.com" />
                            </div>
                            <div className="form-group">
                                <label>اسم المرسل (From Name)</label>
                                <input type="text" className="form-control" value={smtpConfig.fromName || ''} onChange={e => setSmtpConfig({...smtpConfig, fromName: e.target.value})} placeholder="اسم المتجر" />
                            </div>
                            <div className="form-group" style={{ gridColumn: '1 / -1', display: 'flex', gap: '20px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input type="checkbox" checked={smtpConfig.authEnabled} onChange={e => setSmtpConfig({...smtpConfig, authEnabled: e.target.checked})} />
                                    تفعيل المصادقة (Auth Enabled)
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input type="checkbox" checked={smtpConfig.tlsEnabled} onChange={e => setSmtpConfig({...smtpConfig, tlsEnabled: e.target.checked})} />
                                    تفعيل التشفير (TLS Enabled)
                                </label>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
            )}

            {/* Print & Templates Settings Card */}
            {isPrint && (
            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="card-header">
                    <h3>🖨️ إعدادات الطباعة والقوالب (للجهاز الحالي)</h3>
                    <div className="toolbar" style={{ display: 'flex', gap: '10px' }}>
                        <button 
                            type="button"
                            onClick={handleSavePrintSettings}
                            className="btn btn-primary"
                        >
                            حفظ إعدادات الطباعة
                        </button>
                    </div>
                </div>
                
                <div className="card-body">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                        <div className="form-group">
                            <label>تنسيق وحجم ورق الفاتورة</label>
                            <select 
                                className="form-control" 
                                value={printFormat} 
                                onChange={e => setPrintFormat(e.target.value)}
                            >
                                <option value="80mm">📄 فاتورة كاشير حرارية (80mm)</option>
                                <option value="A4">📝 فاتورة مبيعات كاملة (A4)</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>قالب تصميم الفاتورة</label>
                            <select 
                                className="form-control" 
                                value={printTemplate} 
                                onChange={e => setPrintTemplate(e.target.value)}
                            >
                                {printFormat === 'A4' ? (
                                    <>
                                        <option value="classic">🏛️ كلاسيكي (جدول ممتد تقليدي)</option>
                                        <option value="modern">⚡ عصري / بريميوم (ملون ومقاطع أنيقة)</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="standard">🧾 قياسي (التفاصيل الكاملة والباركود)</option>
                                        <option value="compact">✂️ موفر / مبسط (توفير في طول الورق)</option>
                                    </>
                                )}
                            </select>
                        </div>

                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', gridColumn: '1 / -1' }}>
                            <input 
                                type="checkbox" 
                                id="printAutoTriggerToggle"
                                checked={printAutoTrigger}
                                onChange={e => setPrintAutoTrigger(e.target.checked)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <label htmlFor="printAutoTriggerToggle" style={{ margin: 0, cursor: 'pointer', userSelect: 'none' }}>
                                فتح نافذة الطباعة تلقائياً عند فتح الفاتورة
                            </label>
                        </div>
                    </div>
                </div>
            </div>
            )}

            {isBanner && (
            <div className="card">
                <div className="card-header">
                    <h3>🖼️ الـ Banner الإعلاني (Hero Sections)</h3>
                </div>
                <div className="card-body">
                    <HeroSectionManager />
                </div>
            </div>
            )}
        </div>
    );
};

export default Settings;
