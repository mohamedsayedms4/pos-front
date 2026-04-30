import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import StatTile from '../components/common/StatTile';

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

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [reqs, bals, tps] = await Promise.all([
                isAdmin ? Api.getAllLeaveRequests() : Api.getMyLeaveRequests(user.id),
                Api.getMyLeaveBalances(user.id),
                Api.getLeaveTypes()
            ]);
            setRequests(reqs || []);
            setBalances(bals || []);
            setTypes(tps || []);
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await Api.submitLeaveRequest({ ...form, userId: user.id });
            toast('تم تقديم طلب الإجازة بنجاح', 'success');
            setShowModal(false);
            loadData();
        } catch (err) {
            toast(err.message, 'error');
        }
    };

    const handleAction = (id, action) => {
        const actionName = action === 'approve' ? 'الموافقة على' : 'رفض';
        confirm(`هل أنت متأكد من ${actionName} هذا الطلب؟`, async () => {
            try {
                if (action === 'approve') await Api.approveLeaveRequest(id);
                else await Api.rejectLeaveRequest(id);
                toast('تمت العملية بنجاح', 'success');
                loadData();
            } catch (err) {
                toast(err.message, 'error');
            }
        });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PENDING': return <span className="badge badge-warning">قيد الانتظار</span>;
            case 'APPROVED': return <span className="badge badge-success">مقبول</span>;
            case 'REJECTED': return <span className="badge badge-danger">مرفوض</span>;
            default: return <span className="badge">{status}</span>;
        }
    };

    return (
        <div className="page-section anim-fade-in">
            {/* Balances Section */}
            {!isAdmin && balances.length > 0 && (
                <div className="stats-grid mb-4">
                    {balances.map(b => (
                        <StatTile
                            key={b.id}
                            id={`bal_${b.id}`}
                            label={`رصيد ${b.leaveTypeNameAr}`}
                            value={`${b.remaining} يوم`}
                            icon="📅"
                            defaults={{ color: b.remaining > 5 ? 'emerald' : 'orange', size: 'tile-wd-sm' }}
                        />
                    ))}
                </div>
            )}

            <div className="card">
                <div className="card-header">
                    <h3>{isAdmin ? '📋 إدارة طلبات الإجازات' : '🏖️ طلباتي وإجازاتي'}</h3>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        + تقديم طلب إجازة
                    </button>
                </div>
                <div className="card-body no-padding">
                    <table className="data-table">
                        <thead>
                            <tr>
                                {isAdmin && <th>الموظف</th>}
                                <th>نوع الإجازة</th>
                                <th>من</th>
                                <th>إلى</th>
                                <th>الأيام</th>
                                <th>الحالة</th>
                                <th>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={isAdmin ? 7 : 6}><Loader /></td></tr>
                            ) : requests.length === 0 ? (
                                <tr><td colSpan={isAdmin ? 7 : 6} style={{ textAlign: 'center', padding: '40px' }}>لا توجد طلبات حالياً</td></tr>
                            ) : (
                                requests.map(req => (
                                    <tr key={req.id}>
                                        {isAdmin && <td><strong>{req.userName}</strong></td>}
                                        <td>{req.leaveTypeNameAr}</td>
                                        <td>{req.startDate}</td>
                                        <td>{req.endDate}</td>
                                        <td><strong>{req.actualDays} يوم</strong></td>
                                        <td>{getStatusBadge(req.status)}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                {isAdmin && req.status === 'PENDING' && (
                                                    <>
                                                        <button className="btn btn-sm btn-success" onClick={() => handleAction(req.id, 'approve')}>قبول</button>
                                                        <button className="btn btn-sm btn-danger" onClick={() => handleAction(req.id, 'reject')}>رفض</button>
                                                    </>
                                                )}
                                                {!isAdmin && req.status === 'PENDING' && (
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>انتظار المراجعة</span>
                                                )}
                                                {req.status !== 'PENDING' && (
                                                    <span style={{ fontSize: '0.8rem' }}>{req.createdAt?.split('T')[0]}</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <ModalContainer>
                    <div className="modal-overlay active anim-fade-in" onClick={() => setShowModal(false)}>
                        <div className="modal-content anim-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                            <div className="modal-header">
                                <h2>🚀 تقديم طلب إجازة جديد</h2>
                                <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body" style={{ padding: '20px' }}>
                                    <div className="form-group">
                                        <label>نوع الإجازة</label>
                                        <select className="form-control" required value={form.leaveTypeId} onChange={e => setForm({...form, leaveTypeId: e.target.value})}>
                                            <option value="">اختر النوع...</option>
                                            {types.map(t => <option key={t.id} value={t.id}>{t.nameAr}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div className="form-group">
                                            <label>تاريخ البدء</label>
                                            <input type="date" className="form-control" required value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
                                        </div>
                                        <div className="form-group">
                                            <label>تاريخ الانتهاء</label>
                                            <input type="date" className="form-control" required value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>السبب / ملاحظات</label>
                                        <textarea className="form-control" rows="3" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="اذكر سبب الإجازة هنا..."></textarea>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>إلغاء</button>
                                    <button type="submit" className="btn btn-primary">إرسال الطلب</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalContainer>
            )}
        </div>
    );
};

export default LeaveRequests;
