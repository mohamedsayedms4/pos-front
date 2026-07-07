import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import StoreApi from '../services/storeApi';
import Api, { SERVER_URL } from '../services/api';
import JsBarcode from 'jsbarcode';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import HeroSectionManager from '../components/settings/HeroSectionManager';
import ModalContainer from '../components/common/ModalContainer';
import A4Receipt from '../components/common/A4Receipt';
import ThermalReceipt from '../components/common/ThermalReceipt';
import ChatService from '../services/ChatService';
import CommunicationApi from '../services/CommunicationApi';
import { Joyride, STATUS } from 'react-joyride';

import { useRef } from 'react';

const Settings = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { toast } = useGlobalUI();

    const isIdentity = location.pathname === '/settings';
    const isSmtp = location.pathname === '/settings/smtp';
    const isPrint = location.pathname === '/settings/print';
    const isBanner = location.pathname === '/settings/banner';

    const [info, setInfo] = useState({
        aboutUs: '', currency: 'جنيه', logoUrl: '', facebookPixelId: '',
        facebookAdAccountId: '', facebookAccessToken: '', enableWholesale: false
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [interBranchChatEnabled, setInterBranchChatEnabled] = useState(true);

    // Tour State
    const [runTour, setRunTour] = useState(false);
    
    useEffect(() => {
        // Run tour if on identity tab, not loading, and hasn't completed it yet
        if (!loading && isIdentity && !localStorage.getItem('tour_settings_done')) {
            // Delay to ensure elements are rendered after loading
            setTimeout(() => {
                setRunTour(true);
            }, 300);
        }
    }, [loading, isIdentity]);

    const handleJoyrideCallback = (data) => {
        const { status } = data;
        const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
        
        if (finishedStatuses.includes(status)) {
            setRunTour(false);
            localStorage.setItem('tour_settings_done', 'true');
        }
    };

    const tourSteps = [
        {
            target: '.tour-logo-upload',
            content: 'نبدأ بإضافة شعار متجرك ليعكس هويتك، ارفع صورة مناسبة.',
            disableBeacon: true,
            placement: 'bottom',
        },
        {
            target: '.tour-store-name',
            content: 'أدخل اسم متجرك كما سيظهر للعملاء في الفواتير والنظام.',
            disableBeacon: true,
            placement: 'bottom',
        },
        {
            target: '.tour-currency',
            content: 'حدد العملة التي ستستخدمها في مبيعاتك (مثال: جنيه، ريال، دولار).',
            disableBeacon: true,
            placement: 'bottom',
        },
        {
            target: '.tour-contact',
            content: 'أضف أرقام التواصل الخاصة بك لتظهر بوضوح في الفواتير.',
            disableBeacon: true,
            placement: 'top',
        },
        {
            target: '.tour-save-button',
            content: 'أخيراً، اضغط هنا لحفظ التعديلات والبدء بالبيع بنجاح! 🎉',
            disableBeacon: true,
            placement: 'bottom',
        }
    ];

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
    const [posPrintPreview, setPosPrintPreview] = useState(() => localStorage.getItem('pos_print_preview') !== 'false');
    const [showInvoicePreviewModal, setShowInvoicePreviewModal] = useState(false);

    const dummyInvoice = {
        id: "INV-PREVIEW-001",
        invoiceNumber: "123456789",
        invoiceDate: new Date().toISOString(),
        status: "PAID",
        createdBy: "أحمد محمد (تجريبي)",
        customerName: "عميل نقدي",
        tenantName: info?.name || 'اسم المتجر',
        branchName: 'الفرع الرئيسي',
        totalAmount: 150.00,
        paidAmount: 150.00,
        remainingAmount: 0,
        discount: 10.00,
        items: [
            { id: 1, productName: 'منتج تجريبي 1', barcode: '1000123', quantity: 2, unitPrice: 50.00, unitName: 'قطعة' },
            { id: 2, productName: 'منتج تجريبي 2', barcode: '1000124', quantity: 1, unitPrice: 50.00, unitName: 'قطعة' }
        ]
    };

    // Barcode Settings State
    const [barcodeConfig, setBarcodeConfig] = useState({ labelWidthMm: 40, labelHeightMm: 30 });
    const [barcodeTemplate, setBarcodeTemplate] = useState(() => localStorage.getItem('pos_barcode_template') || '1');
    const [barcodeDataUrl, setBarcodeDataUrl] = useState('');

    useEffect(() => {
        if (!isPrint) return;
        try {
            const canvas = document.createElement('canvas');
            JsBarcode(canvas, '123456789', {
                format: "CODE128",
                displayValue: false,
                margin: 0,
                width: 1.5,
                height: 35
            });
            setBarcodeDataUrl(canvas.toDataURL('image/png'));
        } catch (e) {
            console.error('Barcode preview error', e);
        }
    }, [isPrint]);

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

    const handleSavePrintSettings = async (e) => {
        e.preventDefault();
        try {
            await Api.updatePrinterConfig(barcodeConfig);
            localStorage.setItem('print_format', printFormat);
            localStorage.setItem('print_template', printTemplate);
            localStorage.setItem('print_auto_trigger', String(printAutoTrigger));
            localStorage.setItem('pos_print_preview', String(posPrintPreview));
            localStorage.setItem('pos_barcode_template', barcodeTemplate);
            toast('تم حفظ إعدادات الطباعة بنجاح على هذا الجهاز 🖨️', 'success');
        } catch (err) {
            toast('فشل حفظ إعدادات طابعة الباركود', 'error');
        }
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
            } catch (e) {
                console.warn('Could not load chat settings');
            }

            try {
                const smtpData = await CommunicationApi.getSmtpConfig();
                if (smtpData) setSmtpConfig(smtpData);
            } catch (e) {
                console.warn('Could not load SMTP config');
            }

            try {
                const bConfig = await Api.getPrinterConfig();
                if (bConfig) setBarcodeConfig(bConfig);
            } catch (e) {
                console.warn('Could not load barcode config');
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
            } catch (e) {
                console.warn('Could not save chat settings');
            }

            if (res.success) {
                toast('تم حفظ الإعدادات بنجاح ✅', 'success');
                setInfo(res.data);
                // Redirect back to dashboard if they are in onboarding phase
                try {
                    const onboardingStr = localStorage.getItem('onboardingStatus');
                    if (onboardingStr) {
                        const obs = JSON.parse(onboardingStr);
                        if (!obs.completed) {
                            navigate('/dashboard');
                        }
                    }
                } catch (e) {
                    console.error(e);
                }
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



    return (
        <div className="page-section settings-page-wrapper" style={{ direction: 'rtl' }}>
            <Joyride
                steps={tourSteps}
                run={runTour}
                continuous={true}
                showProgress={true}
                showSkipButton={true}
                disableOverlayClose={true}
                spotlightClicks={true}
                callback={handleJoyrideCallback}
                styles={{
                    options: {
                        primaryColor: '#6A00FF',
                        backgroundColor: 'var(--bg-card, #ffffff)',
                        textColor: 'var(--text-main, #333333)',
                        arrowColor: 'var(--bg-card, #ffffff)',
                        zIndex: 1000,
                    },
                    tooltipContainer: {
                        textAlign: 'right',
                    },
                    buttonNext: {
                        outline: 'none',
                        fontFamily: 'Cairo, sans-serif', 
                        padding: '6px 16px', 
                        borderRadius: '6px'
                    },
                    buttonBack: {
                        marginLeft: 15,
                        marginRight: 0,
                        outline: 'none',
                        fontFamily: 'Cairo, sans-serif', 
                        color: 'var(--text-muted, #666)'
                    }
                }}
                locale={{
                    back: 'السابق',
                    close: 'إغلاق',
                    last: 'إنهاء',
                    next: 'التالي',
                    skip: 'تخطي'
                }}
            />
            <style>{`
                .settings-responsive-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                }
                .settings-logo-section {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    grid-column: 1 / -1;
                    background: var(--bg-elevated);
                    padding: 20px;
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                }
                .settings-ads-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    margin-top: 10px;
                }
                .settings-checkbox-group {
                    grid-column: 1 / -1;
                    display: flex;
                    gap: 20px;
                }
                @media (max-width: 768px) {
                    .settings-logo-section {
                        flex-direction: column;
                        text-align: center;
                    }
                    .settings-logo-section .logo-info-text {
                        text-align: center;
                    }
                    .settings-ads-grid {
                        grid-template-columns: 1fr;
                    }
                    .settings-checkbox-group {
                        flex-direction: column;
                        gap: 10px;
                    }
                    .settings-toolbar-mobile {
                        width: 100%;
                    }
                    .settings-toolbar-mobile button {
                        width: 100%;
                    }
                }
            `}</style>
            {isIdentity && (
                <div className="card" style={{ marginBottom: '20px' }}>
                    <div className="card-header" style={{ flexWrap: 'wrap' }}>
                        <h3>⚙️ إعدادات المتجر والهوية</h3>
                        <div className="toolbar settings-toolbar-mobile" style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="submit"
                                form="settingsForm"
                                className="btn btn-primary tour-save-button"
                                disabled={saving}
                            >
                                {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                            </button>
                        </div>
                    </div>

                    <div className="card-body">
                        <form id="settingsForm" onSubmit={handleSave}>
                            <div className="settings-responsive-grid">

                                {/* Logo Section */}
                                <div className="form-group settings-logo-section tour-logo-upload">
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
                                    <div className="logo-info-text">
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
                                <div className="form-group tour-store-name">
                                    <label>اسم المتجر</label>
                                    <input type="text" className="form-control" value={info.name} onChange={e => setInfo({ ...info, name: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>العنوان</label>
                                    <input type="text" className="form-control" value={info.address || ''} onChange={e => setInfo({ ...info, address: e.target.value })} />
                                </div>
                                <div className="form-group tour-currency">
                                    <label>العملة</label>
                                    <input type="text" className="form-control" value={info.currency} onChange={e => setInfo({ ...info, currency: e.target.value })} />
                                </div>
                                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '15px' }}>
                                    <input 
                                        type="checkbox" 
                                        id="enableWholesaleToggle"
                                        checked={info.enableWholesale || false} 
                                        onChange={e => setInfo({ ...info, enableWholesale: e.target.checked })}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="enableWholesaleToggle" style={{ margin: 0, cursor: 'pointer', userSelect: 'none' }}>تفعيل البيع بأسعار الجملة</label>
                                </div>

                                {/* Contact Info */}
                                <div className="form-group tour-contact">
                                    <label>رقم الهاتف الأساسي</label>
                                    <input type="text" className="form-control" value={info.phone1} onChange={e => setInfo({ ...info, phone1: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>رقم هاتف إضافي</label>
                                    <input type="text" className="form-control" value={info.phone2 || ''} onChange={e => setInfo({ ...info, phone2: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>رقم الواتساب</label>
                                    <input type="text" className="form-control" value={info.whatsappNumber || ''} onChange={e => setInfo({ ...info, whatsappNumber: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>البريد الإلكتروني</label>
                                    <input type="email" className="form-control" value={info.email || ''} onChange={e => setInfo({ ...info, email: e.target.value })} />
                                </div>

                                {/* Social Links */}
                                <div className="form-group">
                                    <label>رابط فيسبوك</label>
                                    <input type="text" className="form-control" value={info.facebookUrl || ''} onChange={e => setInfo({ ...info, facebookUrl: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>رابط انستجرام</label>
                                    <input type="text" className="form-control" value={info.instagramUrl || ''} onChange={e => setInfo({ ...info, instagramUrl: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>رابط تيك توك</label>
                                    <input type="text" className="form-control" value={info.tiktokUrl || ''} onChange={e => setInfo({ ...info, tiktokUrl: e.target.value })} />
                                </div>

                                {/* Facebook Pixel */}
                                {/* <div className="form-group" style={{ gridColumn: '1 / -1', background: 'var(--bg-elevated)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '1.2rem' }}>📊</span>
                                        <strong>Facebook Pixel ID</strong>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>(اختياري — لتتبع إعلانات فيسبوك)</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={info.facebookPixelId || ''}
                                        onChange={e => setInfo({ ...info, facebookPixelId: e.target.value })}
                                        placeholder="مثال: 1234567890123456"
                                        style={{ fontFamily: 'monospace', letterSpacing: '1px' }}
                                    />
                                    <small style={{ color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
                                        ستجد الـ Pixel ID في <a href="https://business.facebook.com/events_manager" target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>Facebook Events Manager</a> → Data Sources → Pixel
                                    </small>
                                </div> */}

                                {/* Facebook Ads Insights Config */}
                                {/* <div className="form-group" style={{ gridColumn: '1 / -1', background: 'var(--bg-elevated)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '1.2rem' }}>📈</span>
                                        <strong>إعدادات تقارير الإعلانات (Facebook Ads Reports)</strong>
                                    </label>

                                    <div className="settings-ads-grid">
                                        <div className="form-group">
                                            <label style={{ fontSize: '0.85rem' }}>Ad Account ID</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={info.facebookAdAccountId || ''}
                                                onChange={e => setInfo({ ...info, facebookAdAccountId: e.target.value })}
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
                                                onChange={e => setInfo({ ...info, facebookAccessToken: e.target.value })}
                                                placeholder="EAAB..."
                                            />
                                        </div>
                                    </div>
                                    <small style={{ color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
                                        للحصول على الـ Token والـ ID، اتبع دليل <a href="https://developers.facebook.com/docs/marketing-api/get-started" target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>Marketing API Get Started</a>. يجب أن يحتوي الـ Token على صلاحية <code>ads_read</code>.
                                    </small>
                                </div> */}

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
                                {/* <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label>نبذة عن المتجر (تظهر في تذييل الموقع)</label>
                                    <textarea className="form-control" rows={3} value={info.aboutUs || ''} onChange={e => setInfo({ ...info, aboutUs: e.target.value })} />
                                </div> */}
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
                                    <input type="text" className="form-control" value={smtpConfig.host || ''} onChange={e => setSmtpConfig({ ...smtpConfig, host: e.target.value })} placeholder="smtp.gmail.com" required />
                                </div>
                                <div className="form-group">
                                    <label>المنفذ (Port)</label>
                                    <input type="number" className="form-control" value={smtpConfig.port || ''} onChange={e => setSmtpConfig({ ...smtpConfig, port: e.target.value })} placeholder="587" required />
                                </div>
                                <div className="form-group">
                                    <label>اسم المستخدم (Email)</label>
                                    <input type="text" className="form-control" value={smtpConfig.username || ''} onChange={e => setSmtpConfig({ ...smtpConfig, username: e.target.value })} placeholder="example@gmail.com" required />
                                </div>
                                <div className="form-group">
                                    <label>كلمة المرور (App Password)</label>
                                    <input type="password" className="form-control" value={smtpConfig.password || ''} onChange={e => setSmtpConfig({ ...smtpConfig, password: e.target.value })} placeholder="اترك فارغاً إن لم ترغب بتغييره" />
                                </div>
                                <div className="form-group">
                                    <label>إيميل المرسل (From Email)</label>
                                    <input type="email" className="form-control" value={smtpConfig.fromEmail || ''} onChange={e => setSmtpConfig({ ...smtpConfig, fromEmail: e.target.value })} placeholder="info@mystore.com" />
                                </div>
                                <div className="form-group">
                                    <label>اسم المرسل (From Name)</label>
                                    <input type="text" className="form-control" value={smtpConfig.fromName || ''} onChange={e => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })} placeholder="اسم المتجر" />
                                </div>
                                <div className="form-group settings-checkbox-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <input type="checkbox" checked={smtpConfig.authEnabled} onChange={e => setSmtpConfig({ ...smtpConfig, authEnabled: e.target.checked })} />
                                        تفعيل المصادقة (Auth Enabled)
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <input type="checkbox" checked={smtpConfig.tlsEnabled} onChange={e => setSmtpConfig({ ...smtpConfig, tlsEnabled: e.target.checked })} />
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

                    <div className="card-body print-settings-layout">
                        <style>{`
                        .print-settings-layout {
                            display: grid;
                            grid-template-columns: 1fr 350px;
                            gap: 20px;
                            align-items: start;
                        }
                        @media (max-width: 900px) {
                            .print-settings-layout {
                                grid-template-columns: 1fr;
                            }
                        }
                    `}</style>
                        <div className="print-settings-form" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
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
                                            <option value="barcode_only">🏷️ باركود فقط (بدون اسم)</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="standard">🧾 قياسي (التفاصيل الكاملة والباركود)</option>
                                            <option value="compact">✂️ موفر / مبسط (توفير في طول الورق)</option>
                                            <option value="barcode_only">🏷️ باركود فقط (بدون اسم)</option>
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

                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', gridColumn: '1 / -1' }}>
                                <input
                                    type="checkbox"
                                    id="posPrintPreviewToggle"
                                    checked={posPrintPreview}
                                    onChange={e => setPosPrintPreview(e.target.checked)}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--metro-blue)' }}
                                />
                                <label htmlFor="posPrintPreviewToggle" style={{ margin: 0, cursor: 'pointer', userSelect: 'none' }}>
                                    معاينة الفاتورة قبل الطباعة من شاشة الكاشير (عند إلغاء التفعيل سيتم الطباعة مباشرة)
                                </label>
                            </div>

                            <div style={{ gridColumn: '1 / -1', margin: '15px 0' }}>
                                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />
                                <h4 style={{ marginTop: '15px', color: 'var(--text-main)' }}>🏷️ إعدادات طابعة الباركود</h4>
                            </div>

                            <div className="form-group">
                                <label>العرض (مم)</label>
                                <input
                                    className="form-control"
                                    type="number"
                                    step="0.1"
                                    value={barcodeConfig.labelWidthMm}
                                    onChange={(e) => setBarcodeConfig({ ...barcodeConfig, labelWidthMm: parseFloat(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>الطول (مم)</label>
                                <input
                                    className="form-control"
                                    type="number"
                                    step="0.1"
                                    value={barcodeConfig.labelHeightMm}
                                    onChange={(e) => setBarcodeConfig({ ...barcodeConfig, labelHeightMm: parseFloat(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label>قالب تصميم الباركود</label>
                                <select
                                    className="form-control"
                                    value={barcodeTemplate}
                                    onChange={(e) => setBarcodeTemplate(e.target.value)}
                                >
                                    <option value="1">قالب 1 (التقليدي)</option>
                                    <option value="2">قالب 2 (نظام ERP)</option>
                                    <option value="3">قالب 3 (الخط الفاصل)</option>
                                    <option value="4">قالب 4 (المتباعد)</option>
                                    <option value="5">قالب 5 (التاج 🏷️)</option>
                                    <option value="6">قالب 6 (SKU)</option>
                                </select>
                            </div>
                        </div>

                        {/* Live Preview Panel */}
                        <div className="preview-panel" style={{ background: 'var(--bg-hover)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <h4>👁️ معاينة الفاتورة</h4>
                            <div className="invoice-preview-container" style={{ display: 'flex', justifyContent: 'center' }}>
                                <button
                                    className="btn btn-primary"
                                    style={{ width: '100%' }}
                                    onClick={() => setShowInvoicePreviewModal(true)}
                                >
                                    👁️ معاينة الفاتورة كاملة
                                </button>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />
                            <h4>👁️ معاينة الباركود</h4>
                            <div className="barcode-preview-container" style={{ background: '#fff', color: '#000', padding: '15px', borderRadius: '4px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'center', overflow: 'auto' }}>
                                {(() => {
                                    if (!barcodeDataUrl) return null;
                                    const tenantName = info?.name || Api._getUser()?.tenantName || 'اسم المتجر';
                                    const priceStr = '15.00 EGP';
                                    const codeStr = '123456789';
                                    const nameStr = 'اسم المنتج التجريبي';

                                    let templateHtml = '';
                                    if (barcodeTemplate === '2') {
                                        templateHtml = `
                                    <div style="margin-bottom: 2px;">${tenantName}</div>
                                    <div style="font-size: 11px; font-weight: bold; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 100%; line-height: 1.1; margin-bottom: 2px;">${nameStr}</div>
                                    <img src="${barcodeDataUrl}" style="max-width:100%; max-height:14mm; display:block; object-fit:contain;" />
                                    <div style="font-size: 9px; margin-top: 2px; letter-spacing: 1px;">${codeStr}</div>
                                    <div style="font-size: 8px; font-weight: bold; margin-top: 2px;">${tenantName}</div>
                                    <div style="font-size: 13px; font-weight: bold; margin-top: 2px;">${priceStr}</div>
                                    `;
                                    } else if (barcodeTemplate === '3') {
                                        templateHtml = `
                                    <div style="font-size: 10px; font-weight: bold;">${tenantName}</div>
                                    <hr style="width: 80%; border: 0; border-top: 1px solid #000; margin: 2px 0;" />
                                    <div style="font-size: 11px; font-weight: bold; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 100%; line-height: 1.1; margin-bottom: 2px;">${nameStr}</div>
                                    <div style="font-size: 13px; font-weight: bold;">${priceStr}</div>
                                    <img src="${barcodeDataUrl}" style="max-width:100%; max-height:14mm; display:block; object-fit:contain;" />
                                    <div style="font-size: 9px; margin-top: 2px; letter-spacing: 1px;">${codeStr}</div>
                                    `;
                                    } else if (barcodeTemplate === '4') {
                                        templateHtml = `
                                    <div style="font-size: 11px; font-weight: bold; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 100%; line-height: 1.1; margin-bottom: 2px;">${nameStr}</div>
                                    <div style="font-size: 13px; font-weight: bold; margin-bottom: 4px;">${priceStr}</div>
                                    <img src="${barcodeDataUrl}" style="max-width:100%; max-height:14mm; display:block; object-fit:contain;" />
                                    <div style="font-size: 9px; margin-top: 4px; letter-spacing: 1px;">${codeStr}</div>
                                    <div style="font-size: 9px; font-weight: bold; margin-top: 2px;">${tenantName}</div>
                                    `;
                                    } else if (barcodeTemplate === '5') {
                                        templateHtml = `
                                    <div style="margin-bottom: 2px; font-size: 10px;">🏷️ ${tenantName}</div>
                                    <div style="font-size: 11px; font-weight: bold; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 100%; line-height: 1.1; margin-bottom: 2px;">${nameStr}</div>
                                    <div style="font-size: 13px; font-weight: bold;">${priceStr}</div>
                                    <img src="${barcodeDataUrl}" style="max-width:100%; max-height:14mm; display:block; object-fit:contain;" />
                                    <div style="font-size: 9px; margin-top: 2px; letter-spacing: 1px;">${codeStr}</div>
                                    `;
                                    } else if (barcodeTemplate === '6') {
                                        templateHtml = `
                                    <div style="font-size: 10px; font-weight: bold;">${tenantName}</div>
                                    <div style="font-size: 11px; font-weight: bold; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 100%; line-height: 1.1; margin-bottom: 2px;">${nameStr}</div>
                                    <div style="font-size: 9px; margin-bottom: 2px; letter-spacing: 1px;">SKU: ${codeStr}</div>
                                    <div style="font-size: 13px; font-weight: bold;">${priceStr}</div>
                                    <img src="${barcodeDataUrl}" style="max-width:100%; max-height:14mm; display:block; object-fit:contain;" />
                                    `;
                                    } else {
                                        templateHtml = `
                                    <div style="font-size: 11px; font-weight: bold; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 100%; line-height: 1.1; margin-bottom: 2px;">${nameStr}</div>
                                    <div style="font-size: 13px; font-weight: bold;">${priceStr}</div>
                                    <img src="${barcodeDataUrl}" style="max-width:100%; max-height:14mm; display:block; object-fit:contain;" />
                                    <div style="font-size: 9px; margin-top: 2px; letter-spacing: 1px;">${codeStr}</div>
                                    <div style="font-size: 9px; font-weight: bold; margin-top: 2px;">${tenantName}</div>
                                    `;
                                    }

                                    return (
                                        <div style={{
                                            width: `${barcodeConfig.labelWidthMm}mm`,
                                            height: `${barcodeConfig.labelHeightMm}mm`,
                                            background: '#fff',
                                            color: '#000',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '1mm',
                                            boxSizing: 'border-box',
                                            textAlign: 'center',
                                            border: '1px dashed #ccc',
                                            overflow: 'hidden',
                                            fontFamily: 'sans-serif',
                                            lineHeight: 1,
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                        }} dangerouslySetInnerHTML={{ __html: templateHtml }} />
                                    );
                                })()}
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

            {/* Invoice Preview Modal */}
            {showInvoicePreviewModal && (
                <ModalContainer>
                    <div className="modal-overlay active" style={{ zIndex: 999999 }} onClick={() => setShowInvoicePreviewModal(false)}>
                        <div className="modal" style={{ maxWidth: '800px', width: '90%', padding: 0 }} onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3 style={{ margin: 0 }}>👁️ معاينة الفاتورة</h3>
                                <button className="btn-close" onClick={() => setShowInvoicePreviewModal(false)}>✕</button>
                            </div>
                            <div className="modal-body" style={{ padding: '20px', background: '#e2e8f0', maxHeight: '70vh', overflowY: 'auto' }}>
                                {printFormat === 'A4' ? (
                                    <div style={{ background: '#fff', margin: '0 auto', width: 'fit-content', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                                        <A4Receipt invoice={dummyInvoice} template={printTemplate} isPreview={true} />
                                    </div>
                                ) : (
                                    <div style={{ background: '#fff', margin: '0 auto', width: 'fit-content', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                                        <ThermalReceipt invoice={dummyInvoice} template={printTemplate} isPreview={true} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </ModalContainer>
            )}
        </div>
    );
};

export default Settings;
