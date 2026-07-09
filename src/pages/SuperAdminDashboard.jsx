import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import '../styles/pages/SuperAdminDashboard.css';

const SuperAdminDashboard = () => {
    const [tenants, setTenants] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, tenant: null, password: '', mode: 'soft' });
    const { toast: showToast, confirm: showConfirm } = useGlobalUI();

    const fetchData = async () => {
        try {
            setLoading(true);
            const [tenantsData, statsData] = await Promise.all([
                Api.getSuperAdminTenants(),
                Api.getSuperAdminStats()
            ]);
            setTenants(tenantsData);
            setStats(statsData);
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleToggleStatus = async (tenant) => {
        const action = tenant.active ? 'تعطيل' : 'تفعيل';
        showConfirm(`هل أنت متأكد من ${action} متجر "${tenant.name}"؟`, async () => {
            try {
                await Api.updateTenantStatus(tenant.id, !tenant.active);
                showToast(`تم ${action} المتجر بنجاح`, 'success');
                fetchData();
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
    };

    const handleAdjustSubscription = async (tenant, amount, type = 'months') => {
        try {
            const payload = { [type]: amount };
            await Api.adjustTenantSubscription(tenant.id, payload);
            const actionLabel = amount > 0 ? 'تمديد' : 'تقليل';
            const unitLabel = type === 'months' ? 'شهر' : 'يوم';
            showToast(`تم ${actionLabel} اشتراك "${tenant.name}" بمقدار ${Math.abs(amount)} ${unitLabel}`, 'success');
            fetchData();
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    const handleDeleteSubmit = async (e) => {
        e.preventDefault();
        try {
            await Api.deleteSuperAdminTenant(deleteModalState.tenant.id, deleteModalState.password, deleteModalState.mode);
            showToast('تم حذف المتجر بنجاح', 'success');
            setDeleteModalState({ isOpen: false, tenant: null, password: '', mode: 'soft' });
            fetchData();
        } catch (error) {
            showToast(error.message || 'فشل في عملية الحذف', 'error');
        }
    };

    // The rest of the handlers

    if (loading && !tenants.length) return <div className="loading-container">جاري التحميل...</div>;

    return (
        <div className="super-admin-dashboard">
            <header className="sa-header">
                <div className="sa-title">
                    <h1>لوحة تحكم السوبر أدمن</h1>
                    <p>إدارة المتاجر والاشتراكات العالمية</p>
                </div>
                <div className="sa-stats-grid">
                    <div className="sa-stat-card">
                        <span className="label">إجمالي المتاجر</span>
                        <span className="value">{stats?.totalTenants || 0}</span>
                    </div>
                    <div className="sa-stat-card success">
                        <span className="label">المتاجر النشطة</span>
                        <span className="value">{stats?.activeTenants || 0}</span>
                    </div>
                    <div className="sa-stat-card danger">
                        <span className="label">المتاجر المتوقفة</span>
                        <span className="value">{stats?.inactiveTenants || 0}</span>
                    </div>
                </div>
            </header>

            </header>

            <section className="sa-content">
                <div className="sa-table-container">
                    <table className="sa-table">
                        <thead>
                            <tr>
                                <th>اسم المتجر</th>
                                <th>الرابط (Slug)</th>
                                <th>تاريخ الاشتراك</th>
                                <th>تاريخ انتهاء الاشتراك</th>
                                <th>الحالة</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tenants.map(tenant => (
                                <tr key={tenant.id}>
                                    <td>
                                        <div className="tenant-info">
                                            <span className="name">{tenant.name}</span>
                                            <span className="email">{tenant.contactEmail}</span>
                                        </div>
                                    </td>
                                    <td><code>{tenant.slug}</code></td>
                                    <td>
                                        <span className="created-date" style={{ color: 'var(--text-muted)' }}>
                                            {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString('ar-EG') : 'غير محدد'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`expiry-date ${new Date(tenant.subscriptionExpiry) < new Date() ? 'expired' : ''}`}>
                                            {tenant.subscriptionExpiry ? new Date(tenant.subscriptionExpiry).toLocaleDateString('ar-EG') : 'غير محدد'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${tenant.active ? 'active' : 'inactive'}`}>
                                            {tenant.active ? 'نشط' : 'معطل'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="sa-actions">
                                            <button 
                                                className={`btn-action ${tenant.active ? 'btn-disable' : 'btn-enable'}`}
                                                onClick={() => handleToggleStatus(tenant)}
                                                title={tenant.active ? 'تعطيل' : 'تفعيل'}
                                            >
                                                <i className={`fas fa-${tenant.active ? 'user-slash' : 'user-check'}`}></i>
                                            </button>
                                            
                                            <div className="sa-btn-group">
                                                <button className="btn-action btn-minus" onClick={() => handleAdjustSubscription(tenant, -1, 'months')} title="نقص شهر">
                                                    <i className="fas fa-minus"></i>
                                                </button>
                                                <button className="btn-action btn-plus" onClick={() => handleAdjustSubscription(tenant, 1, 'months')} title="زيادة شهر">
                                                    <i className="fas fa-plus"></i>
                                                </button>
                                                <span className="unit-label">شهر</span>
                                            </div>

                                            <div className="sa-btn-group">
                                                <button className="btn-action btn-minus" onClick={() => handleAdjustSubscription(tenant, -7, 'days')} title="نقص أسبوع">
                                                    <i className="fas fa-angle-left"></i>
                                                </button>
                                                <button className="btn-action btn-plus" onClick={() => handleAdjustSubscription(tenant, 7, 'days')} title="زيادة أسبوع">
                                                    <i className="fas fa-angle-right"></i>
                                                </button>
                                                <span className="unit-label">أسبوع</span>
                                            </div>

                                            <button 
                                                className="btn-action btn-danger" 
                                                onClick={() => setDeleteModalState({ isOpen: true, tenant, password: '', mode: 'soft' })} 
                                                title="حذف المتجر"
                                                style={{ color: 'var(--danger)' }}
                                            >
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Delete Modal */}
            {deleteModalState.isOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '400px' }}>
                        <h2>حذف المتجر: {deleteModalState.tenant?.name}</h2>
                        <form onSubmit={handleDeleteSubmit}>
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label>نوع الحذف:</label>
                                <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                                    <label>
                                        <input 
                                            type="radio" 
                                            name="deleteMode" 
                                            value="soft" 
                                            checked={deleteModalState.mode === 'soft'} 
                                            onChange={(e) => setDeleteModalState({...deleteModalState, mode: e.target.value})} 
                                        />
                                        أرشفة (Soft Delete)
                                    </label>
                                    <label>
                                        <input 
                                            type="radio" 
                                            name="deleteMode" 
                                            value="hard" 
                                            checked={deleteModalState.mode === 'hard'} 
                                            onChange={(e) => setDeleteModalState({...deleteModalState, mode: e.target.value})} 
                                        />
                                        حذف نهائي (Hard Delete)
                                    </label>
                                </div>
                                {deleteModalState.mode === 'hard' && (
                                    <small style={{ color: 'var(--danger)', display: 'block', marginTop: '10px' }}>
                                        <i className="fas fa-exclamation-triangle"></i> تحذير: هذا الخيار سيقوم بحذف جميع البيانات المتعلقة بالمتجر نهائياً ولا يمكن التراجع عنه.
                                    </small>
                                )}
                            </div>
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label>كلمة المرور الخاصة بك لتأكيد العملية:</label>
                                <input 
                                    type="password" 
                                    className="form-control" 
                                    required 
                                    value={deleteModalState.password} 
                                    onChange={(e) => setDeleteModalState({...deleteModalState, password: e.target.value})} 
                                    placeholder="أدخل كلمة المرور"
                                />
                            </div>
                            <div className="modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setDeleteModalState({ isOpen: false, tenant: null, password: '', mode: 'soft' })}>إلغاء</button>
                                <button type="submit" className="btn btn-danger">تأكيد الحذف</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            )}
        </div>
    );
};

export default SuperAdminDashboard;

