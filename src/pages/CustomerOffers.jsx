import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';

const CustomerOffers = () => {
    const { toast } = useGlobalUI();
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const loadOffers = async (p = page) => {
        setLoading(true);
        try {
            const res = await Api.getAllOffers(p, 20);
            setOffers(res.items || []);
            setTotalPages(res.totalPages || 1);
        } catch (err) {
            toast(err.message || 'فشل تحميل العروض', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOffers(page);
    }, [page]);

    const handleDeactivate = async (id) => {
        if (!window.confirm('هل أنت متأكد من إلغاء هذا العرض؟')) return;
        try {
            setLoading(true);
            await Api.deactivateOffer(id);
            toast('تم إلغاء العرض بنجاح', 'success');
            loadOffers(page);
        } catch (err) {
            toast(err.message || 'حدث خطأ أثناء الإلغاء', 'error');
            setLoading(false);
        }
    };

    const getStatusLabel = (offer) => {
        if (offer.isUsed) return <span className="badge badge-green">تم الاستخدام</span>;
        if (!offer.isActive) return <span className="badge badge-red">ملغي</span>;
        if (offer.expiresAt && new Date(offer.expiresAt) < new Date()) return <span className="badge badge-orange">منتهي</span>;
        return <span className="badge badge-blue">فعّال</span>;
    };

    const getDiscountLabel = (type, value) => {
        switch (type) {
            case 'PERCENTAGE': return `${value}% خصم`;
            case 'FIXED_AMOUNT': return `${value} ج.م خصم`;
            default: return `${value}`;
        }
    };

    return (
        <div className="page-section">
            <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: 0 }}>🎁 إدارة العروض الخاصة (Targeted Offers)</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '5px' }}>
                            متابعة العروض المرسلة للعملاء وحالتها
                        </p>
                    </div>
                    <button className="btn btn-secondary" onClick={() => loadOffers(page)}>🔄 تحديث</button>
                </div>
                <div className="card-body no-padding">
                    {loading ? (
                        <Loader message="جاري تحميل العروض..." />
                    ) : offers.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">🎁</div>
                            <h4>لا توجد عروض</h4>
                            <p>لم تقم بإرسال أي عروض مخصصة للعملاء بعد</p>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>تاريخ الإرسال</th>
                                        <th>العميل</th>
                                        <th>المنتج</th>
                                        <th>العرض</th>
                                        <th>قيمة الخصم</th>
                                        <th>الحالة</th>
                                        <th>إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {offers.map(offer => (
                                        <tr key={offer.id}>
                                            <td style={{ fontSize: '0.85rem' }}>
                                                {new Date(offer.createdAt).toLocaleString('ar-EG')}
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{offer.customerName}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{offer.customerPhone}</div>
                                            </td>
                                            <td>
                                                {offer.productName ? (
                                                    <div>
                                                        <div>{offer.productName}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{offer.productCode}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted">كل المنتجات</span>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{offer.titleAr}</div>
                                            </td>
                                            <td>
                                                <span className="badge badge-gray">{getDiscountLabel(offer.discountType, offer.discountValue)}</span>
                                            </td>
                                            <td>{getStatusLabel(offer)}</td>
                                            <td>
                                                {offer.isActive && !offer.isUsed && (
                                                    <button 
                                                        className="btn btn-sm btn-danger"
                                                        onClick={() => handleDeactivate(offer.id)}
                                                    >
                                                        إلغاء
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
        </div>
    );
};

export default CustomerOffers;
