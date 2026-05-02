import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import '../styles/pages/LeavesPremium.css';

const LeaveRequests = () => {
    const [requests, setRequests] = useState([]);
    const [balances, setBalances] = useState([]);
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast, confirm } = useGlobalUI();
    const user = Api._getUser();
    const isAdmin = Api.isAdminOrBranchManager();

    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({
        leaveTypeId: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: ''
    });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [reqs, bals, tps] = await Promise.all([
                isAdmin ? Api.getAllLeaveRequests() : Api.getMyLeaveRequests(user.id),
                Api.getMyLeaveBalances(user.id),
                Api.getLeaveTypes()
            ]);
            setRequests(reqs || []); setBalances(bals || []); setTypes(tps || []);
        } catch (err) { toast(err.message, 'error'); }
        finally { setLoading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await Api.submitLeaveRequest({ ...form, userId: user.id });
            toast('تم تقديم الطلب بنجاح', 'success'); setShowModal(false); loadData();
        } catch (err) { toast(err.message, 'error'); }
    };

    const handleAction = (id, action) => {
        confirm(`هل أنت متأكد من ${action === 'approve' ? 'الموافقة' : 'رفض'} هذا الطلب؟`, async () => {
            try {
                if (action === 'approve') await Api.approveLeaveRequest(id);
                else await Api.rejectLeaveRequest(id);
                toast('تمت العملية', 'success'); loadData();
            } catch (err) { toast(err.message, 'error'); }
        });
    };

    return (
        <div className="leaves-container">
            {/* 1. Header */}
            <div className="lea-header-row">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="lea-breadcrumbs">
                        <Link to="/dashboard">الرئيسية</Link> / <span>HR</span>
                    </div>
                    <h1>طلبات الإجازات</h1>
                </div>
                <div className="lea-header-actions">
                    <button className="lea-btn-premium lea-btn-blue" onClick={() => setShowModal(true)}>
                        <i className="fas fa-plus"></i> تقديم طلب جديد
                    </button>
                </div>
            </div>

            {/* 2. Stats Grid (Show balances if employee, show overall if admin) */}
            <div className="lea-stats-grid">
                <div className="lea-stat-card">
                    <div className="lea-stat-info">
                        <h4>إجمالي الطلبات</h4>
                        <div className="lea-stat-value">{requests.length}</div>
                    </div>
                    <div className="lea-stat-visual"><div className="lea-stat-icon icon-blue"><i className="fas fa-clipboard-list"></i></div></div>
                </div>
                <div className="lea-stat-card">
                    <div className="lea-stat-info">
                        <h4>بانتظار المراجعة</h4>
                        <div className="lea-stat-value" style={{ color: 'var(--lea-accent-amber)' }}>{requests.filter(r => r.status === 'PENDING').length}</div>
                    </div>
                    <div className="lea-stat-visual"><div className="lea-stat-icon icon-amber"><i className="fas fa-hourglass-half"></i></div></div>
                </div>
                <div className="lea-stat-card">
                    <div className="lea-stat-info">
                        <h4>الطلبات المقبولة</h4>
                        <div className="lea-stat-value" style={{ color: 'var(--lea-accent-green)' }}>{requests.filter(r => r.status === 'APPROVED').length}</div>
                    </div>
                    <div className="lea-stat-visual"><div className="lea-stat-icon icon-green"><i className="fas fa-check-circle"></i></div></div>
                </div>
                <div className="lea-stat-card">
                    <div className="lea-stat-info">
                        <h4>الطلبات المرفوضة</h4>
                        <div className="lea-stat-value" style={{ color: '#f43f5e' }}>{requests.filter(r => r.status === 'REJECTED').length}</div>
                    </div>
                    <div className="lea-stat-visual"><div className="lea-stat-icon icon-purple"><i className="fas fa-times-circle"></i></div></div>
                </div>
            </div>

            {/* 3. Table Card */}
            <div className="lea-table-card">
                <div className="lea-table-container">
                    {loading ? (
                        <div style={{ padding: '40px' }}><Loader message="جاري مراجعة الطلبات..." /></div>
                    ) : requests.length === 0 ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--lea-text-secondary)' }}>
                            <i className="fas fa-calendar-times" style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}></i>
                            <h3>لا توجد طلبات إجازة حالياً</h3>
                        </div>
                    ) : (
                        <table className="lea-table">
                            <thead>
                                <tr>
                                    {isAdmin && <th>الموظف</th>}
                                    <th>نوع الإجازة</th>
                                    <th>من</th>
                                    <th>إلى</th>
                                    <th>الأيام</th>
                                    <th>الحالة</th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(req => (
                                    <tr key={req.id}>
                                        {isAdmin && <td><div style={{ fontWeight: 800 }}>{req.userName}</div></td>}
                                        <td><span className="lea-type-badge badge-blue">{req.leaveTypeNameAr}</span></td>
                                        <td>{req.startDate}</td>
                                        <td>{req.endDate}</td>
                                        <td><div style={{ fontWeight: 900 }}>{req.actualDays} يوم</div></td>
                                        <td>
                                            <span className={`lea-type-badge ${req.status === 'APPROVED' ? 'badge-green' : req.status === 'REJECTED' ? 'badge-red' : 'badge-amber'}`}>
                                                {req.status === 'APPROVED' ? 'مقبول ✓' : req.status === 'REJECTED' ? 'مرفوض ✕' : 'قيد الانتظار ⏳'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {isAdmin && req.status === 'PENDING' ? (
                                                    <>
                                                        <button className="lea-action-btn" title="قبول" onClick={() => handleAction(req.id, 'approve')}><i className="fas fa-check" style={{ color: 'var(--lea-accent-green)' }}></i></button>
                                                        <button className="lea-action-btn" title="رفض" onClick={() => handleAction(req.id, 'reject')}><i className="fas fa-times" style={{ color: '#f43f5e' }}></i></button>
                                                    </>
                                                ) : (
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--lea-text-secondary)' }}>
                                                        {req.createdAt?.split('T')[0]}
                                                    </div>
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

            {showModal && (
                <ModalContainer>
                    <div className="lea-modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="lea-modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                            <div className="lea-modal-header">
                                <h3>🚀 تقديم طلب إجازة</h3>
                                <button className="lea-modal-close" onClick={() => setShowModal(false)}>✕</button>
                            </div>
                            <div className="lea-modal-body">
                                <form id="leaForm" onSubmit={handleSubmit}>
                                    <div className="lea-form-group">
                                        <label>نوع الإجازة</label>
                                        <select className="lea-input" required value={form.leaveTypeId} onChange={e => setForm({...form, leaveTypeId: e.target.value})}>
                                            <option value="">اختر النوع...</option>
                                            {types.map(t => <option key={t.id} value={t.id}>{t.nameAr}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div className="lea-form-group">
                                            <label>تاريخ البدء</label>
                                            <input type="date" className="lea-input" required value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
                                        </div>
                                        <div className="lea-form-group">
                                            <label>تاريخ الانتهاء</label>
                                            <input type="date" className="lea-input" required value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="lea-form-group">
                                        <label>السبب / ملاحظات</label>
                                        <textarea className="lea-input" rows="3" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="اذكر سبب الإجازة..."></textarea>
                                    </div>
                                </form>
                            </div>
                            <div className="lea-modal-footer">
                                <button type="button" className="lea-btn-ghost" onClick={() => setShowModal(false)}>إلغاء</button>
                                <button type="submit" form="leaForm" className="lea-btn-primary">إرسال الطلب</button>
                            </div>
                        </div>
                    </div>
                </ModalContainer>
            )}
        </div>
    );
};

export default LeaveRequests;
