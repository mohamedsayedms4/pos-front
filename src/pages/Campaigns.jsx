import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import CommunicationApi from '../services/CommunicationApi';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';

/* ─── Constants ─────────────────────────────────────────────────── */
const STATUS_LABELS = { PENDING: 'في الانتظار', PROCESSING: 'جاري الإرسال', COMPLETED: 'مكتمل', FAILED: 'فشل' };
const STATUS_COLORS = { PENDING: '#6b7280', PROCESSING: '#f59e0b', COMPLETED: '#10b981', FAILED: '#ef4444' };
const AUDIENCE_LABELS = { ALL: 'الكل', CUSTOMERS: 'عملاء', SUPPLIERS: 'موردون', SPECIFIC: 'مختارون' };

/* ─── Predefined Templates ───────────────────────────────────────── */
const getHtmlWrapper = (text, type = 'default', customHeader = '') => {
    // Convert newlines to paragraphs safely
    const textHtml = text.split('\n').filter(line => line.trim() !== '').map(line => `<p style="font-size: 16px; margin: 0 0 10px 0;">${line}</p>`).join('');
    
    let headerBg = '#6366f1';
    let headerText = customHeader || 'رسالة جديدة 📩';
    
    if (type === 'promo_eid') { headerBg = '#6366f1'; headerText = 'كل عام وأنتم بخير! 🌙'; }
    if (type === 'new_arrivals') { headerBg = '#10b981'; headerText = 'اكتشف أحدث منتجاتنا! ✨'; }
    if (type === 'debt_reminder') { headerBg = '#f59e0b'; headerText = 'تذكير بكشف الحساب 📄'; }
    if (type === 'supplier_order') { headerBg = '#3b82f6'; headerText = 'طلب عرض سعر وتوريد 📦'; }
    
    return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); direction: rtl; text-align: right;">
  <div style="background-color: ${headerBg}; padding: 20px; text-align: center;">
    <h2 style="color: #ffffff; margin: 0; font-size: 24px;">${headerText}</h2>
  </div>
  <div style="padding: 24px; background-color: #ffffff; color: #374151; line-height: 1.6;">
    ${textHtml}
  </div>
</div>`;
};

const TEMPLATES = [
    {
        id: 'promo_eid',
        label: '🎉 عروض العيد',
        title: 'عروض حصرية بمناسبة العيد المجيد! 🎊',
        content: 'بمناسبة العيد، يسعدنا أن نقدم لكم خصومات تصل إلى 30% على منتجات مختارة.\n\nزورونا الآن للاستفادة من العروض قبل نفاد الكمية!\n\nكود الخصم: EID30'
    },
    {
        id: 'new_arrivals',
        label: '📦 تشكيلة جديدة',
        title: 'وصل حديثاً: تشكيلة جديدة ومميزة! 🌟',
        content: 'يسعدنا إبلاغكم بوصول تشكيلة جديدة ومميزة لتلبي كافة احتياجاتكم.\n\nتم اختيار هذه المنتجات بعناية لضمان أعلى جودة بأفضل سعر.\n\nتفضل بزيارة الفرع الآن لاكتشاف المزيد.'
    },
    {
        id: 'debt_reminder',
        label: '💰 تذكير بالمديونية',
        title: 'تذكير ودي بكشف الحساب 📝',
        content: 'عميلنا العزيز،\n\nنود تذكيركم بلطف بمراجعة كشف حسابكم الأخير وتأكيد الرصيد المتبقي.\n\nنسعد دائماً بخدمتكم وتلبية طلباتكم.\nشكراً لتعاونكم المستمر معنا.'
    },
    {
        id: 'supplier_order',
        label: '🏭 طلب توريد',
        title: 'طلب عرض سعر / توريد مواد جديدة 📋',
        content: 'السادة الموردين الأفاضل، تحية طيبة وبعد،\n\nنرجو منكم موافاتنا بأحدث عروض الأسعار للمواد المطلوبة في أقرب وقت ممكن مع بيان مدة التوريد وطرق الدفع.\n\nفي انتظار ردكم الكريم لبدء إجراءات الاعتماد.\nمع خالص التحيات.'
    }
];

/* ─── Recipient Picker ───────────────────────────────────────────── */
const RecipientPicker = ({ selected, onToggle, onSearch, results, loading, recipientType, onTypeChange }) => (
    <div style={{ border: '1px solid var(--border-color,#2e3347)', borderRadius: 8, overflow: 'hidden' }}>
        {/* Type tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color,#2e3347)' }}>
            {['CUSTOMER', 'SUPPLIER'].map(t => (
                <button
                    key={t}
                    type="button"
                    onClick={() => onTypeChange(t)}
                    style={{
                        flex: 1, padding: '8px', border: 'none', cursor: 'pointer',
                        background: recipientType === t ? 'var(--color-primary,#6366f1)' : 'var(--bg-elevated,#252836)',
                        color: recipientType === t ? '#fff' : 'var(--text-muted,#9ca3af)',
                        fontWeight: recipientType === t ? '600' : '400',
                        transition: 'all .2s',
                    }}
                >
                    {t === 'CUSTOMER' ? '🛒 عملاء' : '🏭 موردون'}
                </button>
            ))}
        </div>

        {/* Search */}
        <div style={{ padding: '8px', borderBottom: '1px solid var(--border-color,#2e3347)' }}>
            <input
                type="text"
                placeholder={`ابحث عن ${recipientType === 'CUSTOMER' ? 'عميل' : 'مورد'}...`}
                onChange={e => onSearch(e.target.value)}
                className="form-control"
                style={{ margin: 0 }}
            />
        </div>

        {/* Results list */}
        <div style={{ maxHeight: 220, overflowY: 'auto', background: 'var(--bg-elevated,#252836)' }}>
            {loading ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>جاري البحث...</div>
            ) : results.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد نتائج</div>
            ) : results.map(item => {
                const key = `${recipientType}:${item.id}`;
                const isSelected = selected.some(s => s.key === key);
                return (
                    <div
                        key={key}
                        onClick={() => onToggle({ key, id: item.id, name: item.name, email: item.email, phone: item.phone, type: recipientType })}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                            cursor: 'pointer', borderBottom: '1px solid var(--border-color,#2e3347)',
                            background: isSelected ? 'rgba(99,102,241,0.12)' : 'transparent',
                            transition: 'background .15s',
                        }}
                    >
                        <div style={{
                            width: 18, height: 18, borderRadius: 4,
                            border: `2px solid ${isSelected ? '#6366f1' : 'var(--border-color,#2e3347)'}`,
                            background: isSelected ? '#6366f1' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            {isSelected && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '500', color: 'var(--text-main,#fff)', fontSize: '0.9rem' }}>{item.name}</div>
                            <div style={{ color: 'var(--text-muted,#9ca3af)', fontSize: '0.75rem', direction: 'ltr', textAlign: 'right' }}>
                                {item.email || item.phone || 'لا يوجد بريد إلكتروني'}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
);

/* ─── Selected Tags ──────────────────────────────────────────────── */
const SelectedTags = ({ selected, onRemove }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {selected.map(s => (
            <span key={s.key} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'rgba(99,102,241,0.15)', color: '#818cf8',
                padding: '3px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: '500',
            }}>
                {s.type === 'CUSTOMER' ? '🛒' : '🏭'} {s.name}
                <button type="button" onClick={() => onRemove(s.key)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#818cf8', lineHeight: 1, padding: 0, fontSize: '1rem' }}>
                    ×
                </button>
            </span>
        ))}
    </div>
);

/* ─── Campaign Modal ─────────────────────────────────────────────── */
const CampaignModal = ({ onClose, onSubmit, formData, setFormData, submitting }) => {
    const [mode, setMode] = useState('broadcast'); // 'broadcast' | 'specific'
    const [selectedRecipients, setSelectedRecipients] = useState([]);
    const [recipientType, setRecipientType] = useState('CUSTOMER');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Load initial list
    useEffect(() => {
        doSearch('');
    }, [recipientType]);

    const doSearch = useCallback(async (q) => {
        setSearching(true);
        try {
            const results = await CommunicationApi.searchRecipients(recipientType, q, 0, 30);
            setSearchResults(results);
        } catch (e) {
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    }, [recipientType]);

    const handleSearch = (q) => {
        setSearchQuery(q);
        doSearch(q);
    };

    const toggleRecipient = (item) => {
        setSelectedRecipients(prev =>
            prev.some(s => s.key === item.key)
                ? prev.filter(s => s.key !== item.key)
                : [...prev, item]
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (mode === 'specific') {
            if (selectedRecipients.length === 0) return;
            // Group by type — if all same type use that, else mixed
            const types = [...new Set(selectedRecipients.map(s => s.type))];
            const recType = types.length === 1 ? types[0] : 'MIXED';
            const ids = selectedRecipients.map(s => s.id).join(',');
            onSubmit(e, { targetAudience: 'SPECIFIC', specificRecipientIds: ids, specificRecipientType: recType });
        } else {
            onSubmit(e, {});
        }
    };

    return ReactDOM.createPortal(
        <div
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.65)', zIndex: 99999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(4px)',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{
                background: 'var(--bg-card,#1e2130)', borderRadius: 16, padding: '28px 32px',
                width: '100%', maxWidth: 680, boxShadow: '0 30px 70px rgba(0,0,0,0.5)',
                border: '1px solid var(--border-color,#2e3347)', direction: 'rtl',
                maxHeight: '92vh', overflowY: 'auto',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main,#fff)' }}>
                        📣 إنشاء حملة تسويقية جديدة
                    </h3>
                    <button type="button" onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.6rem', lineHeight: 1 }}>
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Templates Selector */}
                    <div className="form-group" style={{ marginBottom: 20 }}>
                        <label style={{ display: 'block', marginBottom: 12, fontWeight: 600, color: 'var(--text-main,#fff)', fontSize: '0.95rem' }}>
                            ✨ قوالب سريعة (اختر لملء الحقول تلقائياً)
                        </label>
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
                            gap: 10 
                        }}>
                            {TEMPLATES.map(tmpl => (
                                <button
                                    key={tmpl.id}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, title: tmpl.title, content: tmpl.content, templateId: tmpl.id })}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                        padding: '12px', borderRadius: 12,
                                        border: '1px solid rgba(99,102,241,0.2)',
                                        background: 'linear-gradient(145deg, rgba(37,40,54,1) 0%, rgba(30,33,48,1) 100%)',
                                        color: 'var(--text-main,#fff)', cursor: 'pointer',
                                        fontWeight: 500, fontSize: '0.9rem',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                        position: 'relative', overflow: 'hidden'
                                    }}
                                    onMouseOver={e => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(99,102,241,0.15)';
                                        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)';
                                    }}
                                    onMouseOut={e => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                                        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)';
                                    }}
                                    onMouseDown={e => e.currentTarget.style.transform = 'translateY(1px)'}
                                    onMouseUp={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                >
                                    {tmpl.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Title */}
                    <div className="form-group" style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>موضوع الرسالة</label>
                        <input type="text" className="form-control" value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="مثال: عروض عيد الأضحى المبارك" required />
                    </div>

                    {/* Content */}
                    <div className="form-group" style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>محتوى الرسالة</label>
                        <textarea className="form-control" rows="5" value={formData.content}
                            onChange={e => setFormData({ ...formData, content: e.target.value })}
                            placeholder="اكتب رسالتك هنا وسيتم تنسيقها بشكل جميل وتلقائي..." required
                            style={{ resize: 'vertical', minHeight: 120, lineHeight: '1.6' }} />
                        <small style={{ color: 'var(--text-muted)' }}>* سيتم إضافة إطار احترافي وألوان للرسالة تلقائياً عند الإرسال.</small>
                    </div>

                    {/* Channel */}
                    <div className="form-group" style={{ marginBottom: 20 }}>
                        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>قناة الإرسال</label>
                        <select className="form-control" value={formData.channel}
                            onChange={e => setFormData({ ...formData, channel: e.target.value })}>
                            <option value="EMAIL">📧 بريد إلكتروني (Email)</option>
                            <option value="SMS" disabled>📱 SMS - قريباً</option>
                            <option value="WHATSAPP" disabled>💬 واتساب - قريباً</option>
                        </select>
                    </div>

                    {/* Audience Mode Toggle */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>المستلمون</label>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                            {[
                                { value: 'broadcast', label: '📢 إرسال جماعي' },
                                { value: 'specific', label: '🎯 اختيار يدوي' },
                            ].map(opt => (
                                <button key={opt.value} type="button"
                                    onClick={() => setMode(opt.value)}
                                    style={{
                                        padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                        fontWeight: '500', fontSize: '0.88rem', transition: 'all .2s',
                                        background: mode === opt.value ? 'var(--color-primary,#6366f1)' : 'var(--bg-elevated,#252836)',
                                        color: mode === opt.value ? '#fff' : 'var(--text-muted,#9ca3af)',
                                        boxShadow: mode === opt.value ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
                                    }}>
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        {mode === 'broadcast' ? (
                            <select className="form-control" value={formData.targetAudience}
                                onChange={e => setFormData({ ...formData, targetAudience: e.target.value })}>
                                <option value="ALL">👥 الكل (عملاء + موردون)</option>
                                <option value="CUSTOMERS">🛒 العملاء فقط</option>
                                <option value="SUPPLIERS">🏭 الموردون فقط</option>
                            </select>
                        ) : (
                            <>
                                <RecipientPicker
                                    selected={selectedRecipients}
                                    onToggle={toggleRecipient}
                                    onSearch={handleSearch}
                                    results={searchResults}
                                    loading={searching}
                                    recipientType={recipientType}
                                    onTypeChange={(t) => { setRecipientType(t); setSearchResults([]); }}
                                />
                                {selectedRecipients.length > 0 && (
                                    <div style={{ marginTop: 10 }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                                            تم اختيار {selectedRecipients.length} مستلم:
                                        </div>
                                        <SelectedTags
                                            selected={selectedRecipients}
                                            onRemove={(key) => setSelectedRecipients(prev => prev.filter(s => s.key !== key))}
                                        />
                                    </div>
                                )}
                                {selectedRecipients.length === 0 && (
                                    <p style={{ marginTop: 8, fontSize: '0.82rem', color: '#ef4444' }}>
                                        ⚠️ اختر مستلماً واحداً على الأقل
                                    </p>
                                )}
                            </>
                        )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>إلغاء</button>
                        <button type="submit" className="btn btn-primary" disabled={submitting || (mode === 'specific' && selectedRecipients.length === 0)}>
                            {submitting ? '⏳ جاري الإرسال...' : '🚀 إرسال الحملة الآن'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

/* ─── Main Page ──────────────────────────────────────────────────── */
const Campaigns = () => {
    const { toast } = useGlobalUI();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ title: '', content: '', channel: 'EMAIL', targetAudience: 'ALL', templateId: 'default' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => { loadCampaigns(); }, []);

    const loadCampaigns = async () => {
        setLoading(true);
        try {
            const data = await CommunicationApi.getCampaigns();
            setCampaigns(Array.isArray(data) ? data : []);
        } catch (e) {
            toast('حدث خطأ أثناء تحميل الحملات', 'error');
            setCampaigns([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e, extra = {}) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // Apply the beautiful HTML wrapper before sending
            const finalContent = getHtmlWrapper(formData.content, formData.templateId, formData.title);
            const payload = { ...formData, ...extra, content: finalContent };
            delete payload.templateId; // clean up payload for backend

            const res = await CommunicationApi.createCampaign(payload);
            if (res && (res.success || res.id)) {
                toast('✅ تم إنشاء الحملة وبدأ الإرسال في الخلفية!', 'success');
                setShowModal(false);
                setFormData({ title: '', content: '', channel: 'EMAIL', targetAudience: 'ALL', templateId: 'default' });
                loadCampaigns();
            } else {
                toast('حدث خطأ أثناء إنشاء الحملة', 'error');
            }
        } catch (e) {
            toast(e.message || 'حدث خطأ في الاتصال', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <Loader />;

    return (
        <div className="page-section" style={{ direction: 'rtl' }}>
            <div className="products-header-premium">
                <div className="row-premium title-row">
                    <div className="title-with-badge">
                        <h2>📣 الحملات التسويقية والرسائل</h2>
                        <span className="badge-count">{campaigns.length} حملة</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button type="button" className="btn btn-primary" onClick={() => setShowModal(true)}>
                            + إنشاء حملة جديدة
                        </button>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="table-responsive">
                    <table className="table table-hover">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>عنوان الحملة</th>
                                <th>القناة</th>
                                <th>المستهدفين</th>
                                <th>الحالة</th>
                                <th>نجاح / فشل</th>
                                <th>التاريخ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {campaigns.map((c, i) => (
                                <tr key={c.id}>
                                    <td>{i + 1}</td>
                                    <td><strong>{c.title}</strong></td>
                                    <td>
                                        <span style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '3px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600 }}>
                                            {c.channel}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        {AUDIENCE_LABELS[c.targetAudience] || c.targetAudience}
                                    </td>
                                    <td>
                                        <span style={{
                                            background: `${STATUS_COLORS[c.status]}22`,
                                            color: STATUS_COLORS[c.status] || '#aaa',
                                            padding: '3px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600,
                                        }}>
                                            {STATUS_LABELS[c.status] || c.status}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>{c.successfulCount ?? 0}</span>
                                        {' / '}
                                        <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{c.failedCount ?? 0}</span>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}> من {c.totalRecipients ?? 0}</span>
                                    </td>
                                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {c.createdAt ? new Date(c.createdAt).toLocaleString('ar-EG') : '-'}
                                    </td>
                                </tr>
                            ))}
                            {campaigns.length === 0 && (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                        <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
                                        لا توجد حملات حتى الآن — ابدأ أول حملة!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <CampaignModal
                    formData={formData}
                    setFormData={setFormData}
                    onClose={() => setShowModal(false)}
                    onSubmit={handleCreate}
                    submitting={submitting}
                />
            )}
        </div>
    );
};

export default Campaigns;
