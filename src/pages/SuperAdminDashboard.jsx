import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import '../styles/pages/SuperAdminDashboard.css';

const SuperAdminDashboard = () => {
    const [tenants, setTenants] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, tenant: null, password: '', mode: 'soft' });
    const [addTenantModal, setAddTenantModal] = useState({
        isOpen: false,
        businessName: '',
        slug: '',
        adminName: '',
        adminEmail: '',
        password: '',
        phone: '',
        saving: false,
    });
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

    // ── Manual Tenant Creation ──
    const generateSlug = (name) => {
        return name
            .trim()
            .toLowerCase()
            .replace(/[^\u0621-\u064Aa-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 40);
    };

    const handleAddTenantChange = (field, value) => {
        setAddTenantModal(prev => {
            const updated = { ...prev, [field]: value };
            // Auto-generate slug from business name
            if (field === 'businessName') {
                updated.slug = generateSlug(value);
            }
            return updated;
        });
    };

    const handleAddTenantSubmit = async (e) => {
        e.preventDefault();
        setAddTenantModal(prev => ({ ...prev, saving: true }));
        try {
            await Api.createTenantManual({
                businessName: addTenantModal.businessName,
                slug: addTenantModal.slug,
                adminName: addTenantModal.adminName,
                adminEmail: addTenantModal.adminEmail,
                password: addTenantModal.password,
                phone: addTenantModal.phone,
            });
            showToast('تم إنشاء المتجر بنجاح بدون OTP ✅', 'success');
            setAddTenantModal({
                isOpen: false, businessName: '', slug: '', adminName: '',
                adminEmail: '', password: '', phone: '', saving: false,
            });
            fetchData();
        } catch (error) {
            showToast(error.message || 'فشل في إنشاء المتجر', 'error');
            setAddTenantModal(prev => ({ ...prev, saving: false }));
        }
    };

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

            {/* Add Tenant Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 20px 15px', gap: '10px' }}>
                <button
                    className="btn btn-primary"
                    onClick={() => setAddTenantModal(prev => ({ ...prev, isOpen: true }))}
                    style={{
                        background: 'var(--primary, #0078D4)',
                        color: '#fff',
                        border: 'none',
                        padding: '10px 24px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <i className="fas fa-plus"></i>
                    إضافة متجر يدوي (بدون OTP)
                </button>
            </div>

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

            {/* Add Tenant Manual Modal */}
            {addTenantModal.isOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '520px' }}>
                        <h2 style={{ marginBottom: '5px' }}>
                            <i className="fas fa-store" style={{ marginLeft: '8px' }}></i>
                            إضافة متجر يدوي
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
                            سيتم إنشاء المتجر مباشرةً بدون الحاجة لتحقق OTP
                        </p>
                        <form onSubmit={handleAddTenantSubmit}>
                            <div className="form-group" style={{ marginBottom: '12px' }}>
                                <label>اسم النشاط التجاري *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    required
                                    value={addTenantModal.businessName}
                                    onChange={(e) => handleAddTenantChange('businessName', e.target.value)}
                                    placeholder="مثال: سوبر ماركت النور"
                                    style={{ textAlign: 'right' }}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: '12px' }}>
                                <label>الرابط (Slug) *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    required
                                    value={addTenantModal.slug}
                                    onChange={(e) => handleAddTenantChange('slug', e.target.value)}
                                    placeholder="super-market-alnour"
                                    dir="ltr"
                                    style={{ textAlign: 'left', fontFamily: 'monospace' }}
                                />
                                <small style={{ color: 'var(--text-muted)' }}>سيتم إنشاء subdomain بناءً على هذا الرابط</small>
                            </div>
                            <div className="form-group" style={{ marginBottom: '12px' }}>
                                <label>اسم المسؤول *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    required
                                    value={addTenantModal.adminName}
                                    onChange={(e) => handleAddTenantChange('adminName', e.target.value)}
                                    placeholder="أحمد محمد"
                                    style={{ textAlign: 'right' }}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: '12px' }}>
                                <label>البريد الإلكتروني *</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    required
                                    value={addTenantModal.adminEmail}
                                    onChange={(e) => handleAddTenantChange('adminEmail', e.target.value)}
                                    placeholder="admin@example.com"
                                    dir="ltr"
                                    style={{ textAlign: 'left' }}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: '12px' }}>
                                <label>كلمة المرور *</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    required
                                    minLength={6}
                                    value={addTenantModal.password}
                                    onChange={(e) => handleAddTenantChange('password', e.target.value)}
                                    placeholder="كلمة مرور المسؤول (6 أحرف على الأقل)"
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label>رقم الجوال *</label>
                                <input
                                    type="tel"
                                    className="form-control"
                                    required
                                    value={addTenantModal.phone}
                                    onChange={(e) => handleAddTenantChange('phone', e.target.value)}
                                    placeholder="01xxxxxxxxx"
                                    dir="ltr"
                                    style={{ textAlign: 'left' }}
                                />
                                <small style={{ color: 'var(--text-muted)' }}>رقم مصري (مثال: 01012345678)</small>
                            </div>
                            <div className="modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setAddTenantModal({
                                        isOpen: false, businessName: '', slug: '', adminName: '',
                                        adminEmail: '', password: '', phone: '', saving: false,
                                    })}
                                    disabled={addTenantModal.saving}
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={addTenantModal.saving}
                                    style={{ background: 'var(--primary, #0078D4)', color: '#fff', border: 'none', fontWeight: 'bold' }}
                                >
                                    {addTenantModal.saving ? 'جاري الإنشاء...' : '✅ إنشاء المتجر'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminDashboard;

