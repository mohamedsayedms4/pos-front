import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import '../styles/pages/ProductInteractionsPremium.css';

const ProductInteractions = () => {
    const { toast } = useGlobalUI();
    const [interactions, setInteractions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    
    const [offerModalOpen, setOfferModalOpen] = useState(false);
    const [selectedInteraction, setSelectedInteraction] = useState(null);
    const [offerData, setOfferData] = useState({
        titleAr: 'عرض خاص لك!',
        messageAr: 'بناءً على اهتمامك بهذا المنتج، نقدم لك هذا العرض الحصري.',
        discountType: 'PERCENTAGE',
        discountValue: '',
        expiresAt: ''
    });

    const loadInteractions = async (p = page) => {
        setLoading(true);
        try {
            const res = await Api.getInteractions(p, 20);
            setInteractions(res.items || []);
            setTotalPages(res.totalPages || 1);
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInteractions();
    }, [page]);

    const getTypeLabel = (type) => {
        switch (type) {
            case 'CART': return <span className="int-badge int-badge-purple"><i className="fas fa-shopping-cart"></i> إضافة للسلة</span>;
            case 'FAVORITE': return <span className="int-badge int-badge-pink"><i className="fas fa-heart"></i> إضافة للمفضلة</span>;
            default: return type;
        }
    };

    const handleSendOffer = async (e) => {
        e.preventDefault();
        if (!selectedInteraction || !selectedInteraction.customerId) return;
        
        try {
            setLoading(true);
            const payload = {
                customerId: selectedInteraction.customerId,
                productId: selectedInteraction.productId,
                titleAr: offerData.titleAr,
                messageAr: offerData.messageAr,
                discountType: offerData.discountType,
                discountValue: parseFloat(offerData.discountValue),
                triggerType: selectedInteraction.type,
                expiresAt: offerData.expiresAt ? new Date(offerData.expiresAt).toISOString() : null
            };
            
            await Api.createCustomerOffer(payload);
            toast('تم إرسال العرض للعميل بنجاح!', 'success');
            setOfferModalOpen(false);
            setSelectedInteraction(null);
        } catch (err) {
            toast(err.message || 'حدث خطأ أثناء إرسال العرض', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="interactions-page-container">
            <div className="int-header-container">
                <div className="int-header-info">
                    <h1>تتبع تفاعلات العملاء</h1>
                    <p>سجل حي لعمليات الإضافة للسلة والمفضلة من المتجر الإلكتروني</p>
                </div>
                <button className="det-btn-back" style={{ background: 'var(--int-primary)', color: '#fff', border: 'none' }} onClick={() => loadInteractions()}>
                    <i className="fas fa-sync-alt"></i>
                    تحديث البيانات
                </button>
            </div>

            <div className="int-main-card">
                {loading ? (
                    <div style={{ padding: '60px 0' }}><Loader message="جاري تحميل سجل التفاعلات..." /></div>
                ) : interactions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📈</div>
                        <h3>لا توجد تفاعلات بعد</h3>
                        <p style={{ color: 'var(--int-text-secondary)' }}>تفاعلات العملاء ستظهر هنا بمجرد حدوثها</p>
                    </div>
                ) : (
                    <>
                        <div className="int-table-wrapper">
                            <table className="int-table">
                                <thead>
                                    <tr>
                                        <th>التوقيت</th>
                                        <th>المنتج</th>
                                        <th>النوع</th>
                                        <th>العميل</th>
                                        <th>IP Address</th>
                                        <th>إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {interactions.map((row) => (
                                        <tr key={row.id}>
                                            <td data-label="التوقيت" style={{ fontSize: '0.85rem', color: 'var(--int-text-secondary)' }}>
                                                {new Intl.DateTimeFormat('ar-EG', {
                                                    year: 'numeric', month: '2-digit', day: '2-digit',
                                                    hour: '2-digit', minute: '2-digit', hour12: true
                                                }).format(new Date(row.timestamp))}
                                            </td>
                                            <td data-label="المنتج">
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 700 }}>{row.productName}</span>
                                                    <small style={{ color: 'var(--int-text-secondary)', fontSize: '0.75rem' }}>{row.productCode}</small>
                                                </div>
                                            </td>
                                            <td data-label="النوع">{getTypeLabel(row.type)}</td>
                                            <td data-label="العميل">
                                                {row.customerName ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontWeight: 600 }}>{row.customerName}</span>
                                                        <small style={{ color: 'var(--int-text-secondary)', fontSize: '0.75rem' }}>{row.customerPhone}</small>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'var(--int-text-secondary)' }}>👤 زائر (Guest)</span>
                                                )}
                                            </td>
                                            <td data-label="IP Address">
                                                <code style={{ fontSize: '0.75rem', background: 'var(--int-glass)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--int-glass-border)' }}>
                                                    {row.ipAddress}
                                                </code>
                                            </td>
                                            <td data-label="إجراءات">
                                                {row.customerId && (
                                                    <button 
                                                        className="det-btn-action"
                                                        style={{ background: 'var(--int-primary)', color: '#fff', padding: '6px 12px', fontSize: '0.85rem' }}
                                                        onClick={() => {
                                                            setSelectedInteraction(row);
                                                            setOfferModalOpen(true);
                                                        }}
                                                    >
                                                        <i className="fas fa-gift"></i> إرسال عرض
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="int-pagination">
                            <button className="int-btn-page" disabled={page === 0} onClick={() => setPage(page - 1)}>
                                <i className="fas fa-chevron-right"></i>
                            </button>
                            <span style={{ fontWeight: 600 }}>صفحة {page + 1} من {totalPages}</span>
                            <button className="int-btn-page" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                                <i className="fas fa-chevron-left"></i>
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Send Offer Modal */}
            {offerModalOpen && selectedInteraction && (
                <div className="det-modal-overlay" onClick={() => setOfferModalOpen(false)}>
                    <div className="det-modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                        <div className="det-modal-header">
                            <h3><i className="fas fa-gift" style={{ color: 'var(--int-primary-light)' }}></i> إرسال عرض مخصص</h3>
                            <button style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setOfferModalOpen(false)}>✕</button>
                        </div>
                        <div className="det-modal-body">
                            <div style={{ background: 'var(--int-glass)', padding: '16px', borderRadius: '12px', border: '1px solid var(--int-glass-border)', marginBottom: '24px' }}>
                                <div style={{ fontSize: '0.9rem', color: 'var(--int-text-secondary)' }}>العميل: <strong style={{ color: '#fff' }}>{selectedInteraction.customerName}</strong></div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--int-text-secondary)' }}>المنتج: <strong style={{ color: '#fff' }}>{selectedInteraction.productName}</strong></div>
                            </div>
                            <form onSubmit={handleSendOffer} id="offerForm">
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>عنوان العرض</label>
                                    <input type="text" className="form-control" style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--int-bg-dark)', border: '1px solid var(--int-glass-border)', color: '#fff' }} required
                                        value={offerData.titleAr} onChange={e => setOfferData({...offerData, titleAr: e.target.value})} />
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>رسالة العرض</label>
                                    <textarea className="form-control" style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--int-bg-dark)', border: '1px solid var(--int-glass-border)', color: '#fff' }} rows="3" required
                                        value={offerData.messageAr} onChange={e => setOfferData({...offerData, messageAr: e.target.value})} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>نوع الخصم</label>
                                        <select className="form-control" style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--int-bg-dark)', border: '1px solid var(--int-glass-border)', color: '#fff' }}
                                            value={offerData.discountType} onChange={e => setOfferData({...offerData, discountType: e.target.value})} >
                                            <option value="PERCENTAGE">نسبة مئوية (%)</option>
                                            <option value="FIXED_AMOUNT">مبلغ ثابت (ج.م)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>قيمة الخصم</label>
                                        <input type="number" className="form-control" style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--int-bg-dark)', border: '1px solid var(--int-glass-border)', color: '#fff' }} min="0.01" step="0.01" required
                                            value={offerData.discountValue} onChange={e => setOfferData({...offerData, discountValue: e.target.value})} />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>تاريخ الانتهاء (اختياري)</label>
                                    <input type="datetime-local" className="form-control" style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--int-bg-dark)', border: '1px solid var(--int-glass-border)', color: '#fff' }}
                                        value={offerData.expiresAt} onChange={e => setOfferData({...offerData, expiresAt: e.target.value})} />
                                </div>
                            </form>
                        </div>
                        <div className="det-modal-footer">
                            <button type="button" className="det-btn-action" style={{ background: 'transparent', color: 'var(--int-text-secondary)' }} onClick={() => setOfferModalOpen(false)}>إلغاء</button>
                            <button type="submit" form="offerForm" className="det-btn-action" style={{ background: 'var(--int-primary)', color: '#fff' }} disabled={loading}>إرسال العرض الآن</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductInteractions;
