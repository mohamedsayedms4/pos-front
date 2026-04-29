import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';

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
            case 'CART': return <span className="badge badge-purple">🛒 إضافة للسلة</span>;
            case 'FAVORITE': return <span className="badge badge-pink">❤️ إضافة للمفضلة</span>;
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
        <div className="page-section">
            <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: 0 }}>📊 تتبع تفاعلات العملاء</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '5px' }}>
                            سجل حي لعمليات الإضافة للسلة والمفضلة من المتجر الإلكتروني
                        </p>
                    </div>
                    <button className="btn btn-secondary" onClick={() => loadInteractions()}>🔄 تحديث</button>
                </div>
                <div className="card-body no-padding">
                    {loading ? (
                        <Loader message="جاري تحميل سجل التفاعلات..." />
                    ) : interactions.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📈</div>
                            <h4>لا توجد تفاعلات بعد</h4>
                            <p>تفاعلات العملاء ستظهر هنا بمجرد حدوثها</p>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="data-table">
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
                                            <td style={{ fontSize: '0.85rem' }}>
                                                {new Intl.DateTimeFormat('ar-EG', {
                                                    year: 'numeric', month: '2-digit', day: '2-digit',
                                                    hour: '2-digit', minute: '2-digit', hour12: true
                                                }).format(new Date(row.timestamp))}
                                            </td>
                                            <td style={{ fontWeight: 600 }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span>{row.productName}</span>
                                                    <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{row.productCode}</small>
                                                </div>
                                            </td>
                                            <td>{getTypeLabel(row.type)}</td>
                                            <td>
                                                {row.customerName ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span>{row.customerName}</span>
                                                        <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{row.customerPhone}</small>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted">👤 زائر (Guest)</span>
                                                )}
                                            </td>
                                            <td>
                                                <code style={{ fontSize: '0.75rem', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: '4px' }}>
                                                    {row.ipAddress}
                                                </code>
                                            </td>
                                            <td>
                                                {row.customerId && (
                                                    <button 
                                                        className="btn btn-sm btn-primary"
                                                        onClick={() => {
                                                            setSelectedInteraction(row);
                                                            setOfferModalOpen(true);
                                                        }}
                                                    >
                                                        🎁 إرسال عرض
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                <div className="card-footer" style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                    <button 
                        className="btn btn-sm btn-secondary" 
                        disabled={page === 0} 
                        onClick={() => setPage(page - 1)}
                    >السابق</button>
                    <span style={{ alignSelf: 'center' }}>صفحة {page + 1} من {totalPages}</span>
                    <button 
                        className="btn btn-sm btn-secondary" 
                        disabled={page >= totalPages - 1} 
                        onClick={() => setPage(page + 1)}
                    >التالي</button>
                </div>
            </div>

            {/* Send Offer Modal */}
            {offerModalOpen && selectedInteraction && (
                <ModalContainer>
                    <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setOfferModalOpen(false); }}>
                        <div className="modal" style={{ maxWidth: '500px' }}>
                            <div className="modal-header">
                            <h3>🎁 إرسال عرض مخصص</h3>
                            <button className="btn-close" onClick={() => setOfferModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="alert alert-info" style={{ marginBottom: '20px' }}>
                                <strong>العميل:</strong> {selectedInteraction.customerName}<br/>
                                <strong>المنتج:</strong> {selectedInteraction.productName}
                            </div>
                            <form onSubmit={handleSendOffer} id="offerForm">
                                <div className="form-group">
                                    <label>عنوان العرض</label>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        required
                                        value={offerData.titleAr}
                                        onChange={e => setOfferData({...offerData, titleAr: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>رسالة العرض</label>
                                    <textarea 
                                        className="form-control" 
                                        rows="3" 
                                        required
                                        value={offerData.messageAr}
                                        onChange={e => setOfferData({...offerData, messageAr: e.target.value})}
                                    ></textarea>
                                </div>
                                <div className="form-row" style={{ display: 'flex', gap: '15px' }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>نوع الخصم</label>
                                        <select 
                                            className="form-control"
                                            value={offerData.discountType}
                                            onChange={e => setOfferData({...offerData, discountType: e.target.value})}
                                        >
                                            <option value="PERCENTAGE">نسبة مئوية (%)</option>
                                            <option value="FIXED_AMOUNT">مبلغ ثابت (ج.م)</option>
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>قيمة الخصم</label>
                                        <input 
                                            type="number" 
                                            className="form-control" 
                                            min="0.01" 
                                            step="0.01" 
                                            required
                                            value={offerData.discountValue}
                                            onChange={e => setOfferData({...offerData, discountValue: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>تاريخ الانتهاء (اختياري)</label>
                                    <input 
                                        type="datetime-local" 
                                        className="form-control" 
                                        value={offerData.expiresAt}
                                        onChange={e => setOfferData({...offerData, expiresAt: e.target.value})}
                                    />
                                    <small className="text-muted">إذا تركته فارغاً، لن تنتهي صلاحية العرض أبداً.</small>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-ghost" onClick={() => setOfferModalOpen(false)}>إلغاء</button>
                                    <button type="submit" className="btn btn-primary" disabled={loading}>إرسال العرض الآن</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                </ModalContainer>
            )}
        </div>
    );
};

export default ProductInteractions;
