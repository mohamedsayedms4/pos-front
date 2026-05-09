import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import '../styles/pages/ProductsPremium.css'; // Reuse product styles

const ProductRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast, confirm } = useGlobalUI();
    const isAdmin = Api.isAdmin();

    const [notesModal, setNotesModal] = useState({ open: false, requestId: null, notes: '', action: '' });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await Api.getProductRequests();
            setRequests(data || []);
        } catch (err) { 
            toast(err.message, 'error'); 
        } finally { 
            setLoading(false); 
        }
    };

    const handleAction = async (e) => {
        e.preventDefault();
        const { requestId, notes, action } = notesModal;
        try {
            if (action === 'approve') {
                await Api.approveProductRequest(requestId, notes);
                toast('تم قبول الطلب ونقل المنتج بنجاح', 'success');
            } else {
                await Api.rejectProductRequest(requestId, notes);
                toast('تم رفض الطلب', 'info');
            }
            setNotesModal({ open: false, requestId: null, notes: '', action: '' });
            loadData();
        } catch (err) { 
            toast(err.message, 'error'); 
        }
    };

    const openNotesModal = (id, action) => {
        setNotesModal({ open: true, requestId: id, notes: '', action });
    };

    return (
        <div className="products-page-container">
            <div className="prd-header-container">
                <div className="prd-breadcrumbs">
                    <Link to="/">الرئيسية</Link>
                    <span>/</span>
                    <span>طلبات المنتجات</span>
                </div>
                <div className="prd-header-row">
                    <h1>طلبات تعيين المنتجات</h1>
                </div>
            </div>

            <div className="prd-stats-grid">
                <div className="prd-stat-card">
                    <div className="prd-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                        <i className="fas fa-list"></i>
                    </div>
                    <div className="prd-stat-info">
                        <div className="prd-stat-label">إجمالي الطلبات</div>
                        <div className="prd-stat-value">{requests.length}</div>
                    </div>
                </div>
                <div className="prd-stat-card">
                    <div className="prd-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                        <i className="fas fa-hourglass-half"></i>
                    </div>
                    <div className="prd-stat-info">
                        <div className="prd-stat-label">قيد الانتظار</div>
                        <div className="prd-stat-value">{requests.filter(r => r.status === 'PENDING').length}</div>
                    </div>
                </div>
                <div className="prd-stat-card">
                    <div className="prd-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                        <i className="fas fa-check-circle"></i>
                    </div>
                    <div className="prd-stat-info">
                        <div className="prd-stat-label">تمت الموافقة</div>
                        <div className="prd-stat-value">{requests.filter(r => r.status === 'APPROVED').length}</div>
                    </div>
                </div>
            </div>

            <div className="prd-main-card" style={{ marginTop: '20px' }}>
                <div className="prd-table-container">
                    {loading ? (
                        <Loader message="جاري تحميل الطلبات..." />
                    ) : requests.length === 0 ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--prd-text-secondary)' }}>
                            <i className="fas fa-clipboard-check" style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}></i>
                            <h3>لا توجد طلبات معلقة حالياً</h3>
                        </div>
                    ) : (
                        <table className="prd-table">
                            <thead>
                                <tr>
                                    <th>المنتج</th>
                                    <th>الفرع المستهدف</th>
                                    <th>مقدم الطلب</th>
                                    <th>الحالة</th>
                                    <th>تاريخ الطلب</th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(req => (
                                    <tr key={req.id}>
                                        <td>
                                            <div style={{ fontWeight: 700 }}>{req.product.name}</div>
                                            <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{req.product.productCode}</div>
                                        </td>
                                        <td>{req.targetBranch.name}</td>
                                        <td>{req.requester.name}</td>
                                        <td>
                                            <span className={`prd-badge ${req.status === 'APPROVED' ? 'prd-badge-active' : req.status === 'REJECTED' ? 'prd-badge-inactive' : 'prd-badge-pending'}`}>
                                                {req.status === 'APPROVED' ? 'مقبول' : req.status === 'REJECTED' ? 'مرفوض' : 'قيد الانتظار'}
                                            </span>
                                        </td>
                                        <td>{new Date(req.createdAt).toLocaleDateString('ar-EG')}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {isAdmin && req.status === 'PENDING' ? (
                                                    <>
                                                        <button className="prd-action-btn prd-btn-edit" title="قبول" onClick={() => openNotesModal(req.id, 'approve')}>
                                                            <i className="fas fa-check"></i>
                                                        </button>
                                                        <button className="prd-action-btn prd-btn-delete" title="رفض" onClick={() => openNotesModal(req.id, 'reject')}>
                                                            <i className="fas fa-times"></i>
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>{req.adminNotes || '-'}</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {notesModal.open && (
                <ModalContainer>
                    <div className="prd-modal-overlay" onClick={() => setNotesModal({ ...notesModal, open: false })}>
                        <div className="prd-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                            <div className="prd-modal-header">
                                <h3>{notesModal.action === 'approve' ? 'الموافقة على الطلب' : 'رفض الطلب'}</h3>
                                <button className="prd-modal-close" onClick={() => setNotesModal({ ...notesModal, open: false })}>✕</button>
                            </div>
                            <form onSubmit={handleAction}>
                                <div className="prd-modal-body">
                                    <div className="prd-form-group">
                                        <label>ملاحظات الأدمن</label>
                                        <textarea 
                                            className="prd-input" 
                                            rows="4" 
                                            value={notesModal.notes} 
                                            onChange={e => setNotesModal({ ...notesModal, notes: e.target.value })}
                                            placeholder="اكتب ملاحظاتك هنا..."
                                        />
                                    </div>
                                </div>
                                <div className="prd-modal-footer">
                                    <button type="button" className="prd-btn-ghost" onClick={() => setNotesModal({ ...notesModal, open: false })}>إلغاء</button>
                                    <button type="submit" className={`prd-btn-primary ${notesModal.action === 'reject' ? 'prd-btn-danger' : ''}`}>
                                        {notesModal.action === 'approve' ? 'تأكيد القبول' : 'تأكيد الرفض'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalContainer>
            )}

            <style>{`
                .prd-badge-pending { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
                .prd-btn-danger { background: #ef4444 !important; }
            `}</style>
        </div>
    );
};

export default ProductRequests;
