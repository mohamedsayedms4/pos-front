import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import '../styles/pages/SuperAdminDashboard.css';

const SuperAdminDashboard = () => {
    const [tenants, setTenants] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
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

            <section className="sa-content">
                <div className="sa-table-container">
                    <table className="sa-table">
                        <thead>
                            <tr>
                                <th>اسم المتجر</th>
                                <th>الرابط (Slug)</th>
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
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default SuperAdminDashboard;
