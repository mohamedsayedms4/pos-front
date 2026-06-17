import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import CommunicationApi from '../services/CommunicationApi';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import StatTile from '../components/common/StatTile';

/* ─── Constants ─────────────────────────────────────────────────── */
const STATUS_LABELS = { PENDING: 'في الانتظار', PROCESSING: 'جاري الإرسال', COMPLETED: 'مكتمل', FAILED: 'فشل' };
const STATUS_COLORS = { PENDING: '#6b7280', PROCESSING: '#f59e0b', COMPLETED: '#10b981', FAILED: '#ef4444' };
const AUDIENCE_LABELS = { ALL: 'الكل', CUSTOMERS: 'عملاء', SUPPLIERS: 'موردون', SPECIFIC: 'مختارون' };

/* ─── Predefined Templates ───────────────────────────────────────── */
const getHtmlWrapper = (text, type = 'default', customHeader = '') => {
    // Convert newlines to paragraphs safely
    const textHtml = text.split('\n').filter(line => line.trim() !== '').map(line => `<p style="font-size: 16px; margin: 0 0 10px 0;">${line}</p>`).join('');
    
    let headerBg = '#0078D7';
    let headerText = customHeader || 'رسالة جديدة 📩';
    
    if (type === 'promo_eid') { headerBg = '#0078D7'; headerText = 'كل عام وأنتم بخير! 🌙'; }
    if (type === 'new_arrivals') { headerBg = '#107C10'; headerText = 'اكتشف أحدث منتجاتنا! ✨'; }
    if (type === 'debt_reminder') { headerBg = '#FF8C00'; headerText = 'تذكير بكشف الحساب 📄'; }
    if (type === 'supplier_order') { headerBg = '#005A9E'; headerText = 'طلب عرض سعر وتوريد 📦'; }
    
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
    <div style={{ border: '1px solid var(--border-input)', borderRadius: 8, overflow: 'hidden' }}>
        {/* Type tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-input)' }}>
            {['CUSTOMER', 'SUPPLIER'].map(t => (
                <button
                    key={t}
                    type="button"
                    onClick={() => onTypeChange(t)}
                    style={{
                        flex: 1, padding: '8px', border: 'none', cursor: 'pointer',
                        background: recipientType === t ? 'var(--metro-blue)' : 'var(--bg-elevated)',
                        color: recipientType === t ? '#fff' : 'var(--text-muted)',
                        fontWeight: recipientType === t ? '600' : '400',
                        transition: 'all .2s',
                    }}
                >
                    {t === 'CUSTOMER' ? '🛒 عملاء' : '🏭 موردون'}
                </button>
            ))}
        </div>

        {/* Search */}
        <div style={{ padding: '8px', borderBottom: '1px solid var(--border-input)' }}>
            <input
                type="text"
                placeholder={`ابحث عن ${recipientType === 'CUSTOMER' ? 'عميل' : 'مورد'}...`}
                onChange={e => onSearch(e.target.value)}
                className="form-control"
                style={{ margin: 0 }}
            />
        </div>

        {/* Results list */}
        <div style={{ maxHeight: 220, overflowY: 'auto', background: 'var(--bg-input)' }}>
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
                            cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)',
                            background: isSelected ? 'rgba(0,120,215,0.15)' : 'transparent',
                            transition: 'background .15s',
                        }}
                    >
                        <div style={{
                            width: 18, height: 18, borderRadius: 4,
                            border: `2px solid ${isSelected ? 'var(--metro-blue)' : 'var(--border-input)'}`,
                            background: isSelected ? 'var(--metro-blue)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            {isSelected && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '500', color: 'var(--text-main)', fontSize: '0.9rem' }}>{item.name}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', direction: 'ltr', textAlign: 'right' }}>
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
                background: 'rgba(0,120,215,0.15)', color: 'var(--metro-blue)',
                padding: '3px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: '500',
            }}>
                {s.type === 'CUSTOMER' ? '🛒' : '🏭'} {s.name}
                <button type="button" onClick={() => onRemove(s.key)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--metro-blue)', lineHeight: 1, padding: 0, fontSize: '1rem' }}>
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
            const types = [...new Set(selectedRecipients.map(s => s.type))];
            const recType = types.length === 1 ? types[0] : 'MIXED';
            const ids = selectedRecipients.map(s => s.id).join(',');
            onSubmit(e, { targetAudience: 'SPECIFIC', specificRecipientIds: ids, specificRecipientType: recType });
        } else {
            onSubmit(e, {});
        }
    };

    return ReactDOM.createPortal(
        <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) onClose(); }}>
            <div className="modal" style={{ maxWidth: '680px' }}>
                <div className="modal-header">
                    <h3>📣 إنشاء حملة تسويقية جديدة</h3>
                    <button type="button" className="modal-close" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Templates Selector */}
                        <div className="form-group" style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', marginBottom: 12, fontWeight: 600, color: 'var(--text-light)', fontSize: '0.95rem' }}>
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
                                            padding: '12px',
                                            border: '1px solid var(--border-input)',
                                            background: 'var(--bg-elevated)',
                                            color: 'var(--text-main)', cursor: 'pointer',
                                            fontWeight: 500, fontSize: '0.9rem',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseOver={e => {
                                            e.currentTarget.style.borderColor = 'var(--metro-blue)';
                                            e.currentTarget.style.background = 'var(--bg-hover-tile)';
                                        }}
                                        onMouseOut={e => {
                                            e.currentTarget.style.borderColor = 'var(--border-input)';
                                            e.currentTarget.style.background = 'var(--bg-elevated)';
                                        }}
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
                                            padding: '7px 16px', border: 'none', cursor: 'pointer',
                                            fontWeight: '500', fontSize: '0.88rem', transition: 'all .2s',
                                            background: mode === opt.value ? 'var(--metro-blue)' : 'var(--bg-elevated)',
                                            color: mode === opt.value ? '#fff' : 'var(--text-muted)',
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
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>إلغاء</button>
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
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    
    // Pagination States
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    
    // Stats State (retrieved from backend)
    const [stats, setStats] = useState({ totalCampaigns: 0, totalSuccessful: 0, completedCampaigns: 0, pendingCampaigns: 0 });
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ title: '', content: '', channel: 'EMAIL', targetAudience: 'ALL', templateId: 'default' });
    const [submitting, setSubmitting] = useState(false);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Reset to page 0 when search term changes
    useEffect(() => {
        setPage(0);
    }, [debouncedSearch]);

    // Load stats from the backend
    const loadStats = async () => {
        try {
            const statsData = await CommunicationApi.getCampaignStats();
            if (statsData) {
                setStats(statsData);
            }
        } catch (e) {
            console.error('Failed to load campaign statistics from backend', e);
        }
    };

    // Load campaigns list from the backend
    const loadCampaigns = async (pageNum = page, sizeNum = pageSize, searchStr = debouncedSearch) => {
        setLoading(true);
        try {
            const res = await CommunicationApi.getCampaigns(pageNum, sizeNum, searchStr);
            if (res) {
                setCampaigns(res.content || res.items || []);
                setTotalPages(res.totalPages || 0);
                setTotalElements(res.totalElements || 0);
            } else {
                setCampaigns([]);
            }
        } catch (e) {
            toast('حدث خطأ أثناء تحميل الحملات', 'error');
            setCampaigns([]);
        } finally {
            setLoading(false);
        }
    };

    // Reload data when pagination or search changes
    useEffect(() => {
        loadCampaigns(page, pageSize, debouncedSearch);
    }, [page, pageSize, debouncedSearch]);

    // Initial load for statistics
    useEffect(() => {
        loadStats();
    }, []);

    const handleCreate = async (e, extra = {}) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // Apply the HTML wrapper before sending
            const finalContent = getHtmlWrapper(formData.content, formData.templateId, formData.title);
            const payload = { ...formData, ...extra, content: finalContent };
            delete payload.templateId; // clean up payload for backend

            const res = await CommunicationApi.createCampaign(payload);
            if (res && (res.success || res.id)) {
                toast('✅ تم إنشاء الحملة وبدأ الإرسال في الخلفية!', 'success');
                setShowModal(false);
                setFormData({ title: '', content: '', channel: 'EMAIL', targetAudience: 'ALL', templateId: 'default' });
                
                // Reset page and reload both campaigns and statistics
                setPage(0);
                loadCampaigns(0, pageSize, debouncedSearch);
                loadStats();
            } else {
                toast('حدث خطأ أثناء إنشاء الحملة', 'error');
            }
        } catch (e) {
            toast(e.message || 'حدث خطأ في الاتصال', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const renderPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(0, page - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages - 1, start + maxVisible - 1);
        
        if (end - start + 1 < maxVisible) {
            start = Math.max(0, end - maxVisible + 1);
        }
        
        for (let i = start; i <= end; i++) {
            pages.push(
                <button 
                    key={i} 
                    className={page === i ? 'active' : ''} 
                    onClick={() => setPage(i)}
                    style={{ borderRadius: '0' }}
                >
                    {i + 1}
                </button>
            );
        }
        return pages;
    };

    if (loading) return <Loader />;

    return (
        <>
            <style>{`
                /* Responsive CSS Overrides for Campaigns Page */
                @media (max-width: 1024px) {
                  .stats-grid {
                    grid-template-columns: repeat(2, 1fr) !important;
                    gap: 12px !important;
                  }
                  .toolbar {
                    flex-direction: column !important;
                    align-items: stretch !important;
                    gap: 12px !important;
                    display: flex !important;
                  }
                  .toolbar select, 
                  .toolbar .search-input,
                  .toolbar .search-input input {
                    width: 100% !important;
                    max-width: 100% !important;
                    height: 40px !important;
                  }
                  .toolbar-actions {
                    width: 100% !important;
                    display: flex !important;
                    gap: 8px !important;
                    flex-wrap: wrap !important;
                  }
                  .toolbar-actions button {
                    flex: 1 1 45% !important;
                    justify-content: center !important;
                  }
                  .toolbar-actions .btn-primary {
                    flex: 1 1 100% !important;
                  }
                  
                  .table-wrapper {
                    overflow-x: auto !important;
                    width: 100% !important;
                    -webkit-overflow-scrolling: touch !important;
                    border: 1px solid var(--border-subtle) !important;
                    border-radius: 8px !important;
                  }
                  .data-table {
                    min-width: 850px !important;
                  }
                }

                @media (max-width: 768px) {
                  .page-section {
                    padding: 12px !important;
                  }
                  .card {
                    border-radius: 12px !important;
                  }
                  .card-header {
                    flex-direction: column !important;
                    align-items: stretch !important;
                    gap: 12px !important;
                  }
                  .card-header h3 {
                    font-size: 1.2rem !important;
                    text-align: center !important;
                  }
                }

                @media (max-width: 480px) {
                  .stats-grid {
                    grid-template-columns: 1fr !important;
                    gap: 8px !important;
                  }
                  .stats-grid .stat-tile-value {
                    font-size: 1.25rem !important;
                  }
                  .stats-grid .stat-tile-label {
                    font-size: 0.75rem !important;
                  }
                }
            `}</style>

            <div className="page-section" style={{ direction: 'rtl' }}>
                {/* Stats Tiles Grid */}
                <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                    <StatTile
                        id="camp_total"
                        label="إجمالي الحملات"
                        value={stats.totalCampaigns || 0}
                        icon="📣"
                        defaults={{ color: 'blue', size: 'tile-wd-sm', order: 1 }}
                    />
                    <StatTile
                        id="camp_success"
                        label="إجمالي الرسائل الناجحة"
                        value={stats.totalSuccessful || 0}
                        icon="✅"
                        defaults={{ color: 'emerald', size: 'tile-wd-sm', order: 2 }}
                    />
                    <StatTile
                        id="camp_completed"
                        label="حملات اكتملت"
                        value={stats.completedCampaigns || 0}
                        icon="📈"
                        defaults={{ color: 'purple', size: 'tile-sq-sm', order: 3 }}
                    />
                    <StatTile
                        id="camp_pending"
                        label="حملات قيد الإرسال/الانتظار"
                        value={stats.pendingCampaigns || 0}
                        icon="⏳"
                        defaults={{ color: 'amber', size: 'tile-sq-sm', order: 4 }}
                    />
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3>📣 الحملات التسويقية والرسائل <span className="badge badge-info" style={{ marginRight: '8px', borderRadius: 20 }}>{totalElements} حملة</span></h3>
                        <div className="toolbar">
                            <div className="search-input">
                                <input
                                    type="text"
                                    placeholder="بحث سريع عن حملة..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <span className="search-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button type="button" className="btn btn-primary" onClick={() => setShowModal(true)}>
                                    <span>+</span> إنشاء حملة جديدة
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="card-body no-padding">
                        <div className="table-wrapper">
                            <table className="data-table">
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
                                            <td style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{(page * pageSize) + i + 1}</td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{c.title}</div>
                                            </td>
                                            <td>
                                                <span className="badge badge-info" style={{ borderRadius: 20, padding: '3px 10px', fontSize: '0.8rem', fontWeight: 600 }}>
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
                                                <span style={{ color: 'var(--metro-green)', fontWeight: 'bold' }}>{c.successfulCount ?? 0}</span>
                                                {' / '}
                                                <span style={{ color: 'var(--metro-red)', fontWeight: 'bold' }}>{c.failedCount ?? 0}</span>
                                                <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}> من {c.totalRecipients ?? 0}</span>
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
                                                {searchTerm ? 'لا توجد نتائج تطابق البحث' : 'لا توجد حملات حتى الآن — ابدأ أول حملة!'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination controls */}
                        {!loading && totalElements > 0 && (
                            <div className="pagination" style={{ borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', flexWrap: 'wrap', gap: '15px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        عرض {campaigns.length} من إجمالي {totalElements} حملة
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>عدد الصفوف:</span>
                                        <select 
                                            className="form-control" 
                                            value={pageSize} 
                                            onChange={(e) => {
                                                setPageSize(Number(e.target.value));
                                                setPage(0);
                                            }}
                                            style={{ width: '70px', height: '34px', padding: '0 5px', fontSize: '0.85rem', borderRadius: '0' }}
                                        >
                                            <option value="5">5</option>
                                            <option value="10">10</option>
                                            <option value="20">20</option>
                                            <option value="50">50</option>
                                            <option value="100">100</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '2px' }}>
                                    <button 
                                        disabled={page === 0} 
                                        onClick={() => setPage(p => p - 1)}
                                        style={{ width: 'auto', padding: '0 15px', borderRadius: '0' }}
                                    >
                                        السابق
                                    </button>
                                    {renderPageNumbers()}
                                    <button 
                                        disabled={page >= totalPages - 1} 
                                        onClick={() => setPage(p => p + 1)}
                                        style={{ width: 'auto', padding: '0 15px', borderRadius: '0' }}
                                    >
                                        التالي
                                    </button>
                                </div>
                            </div>
                        )}
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
        </>
    );
};

export default Campaigns;
