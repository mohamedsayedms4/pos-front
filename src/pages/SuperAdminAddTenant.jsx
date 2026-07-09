import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import '../styles/pages/SuperAdminDashboard.css';

const SuperAdminAddTenant = () => {
    const navigate = useNavigate();
    const { toast: showToast } = useGlobalUI();
    const [formData, setFormData] = useState({
        businessName: '',
        slug: '',
        adminName: '',
        adminEmail: '',
        password: '',
        phone: '',
        saving: false,
    });

    const generateSlug = (name) => {
        return name
            .trim()
            .toLowerCase()
            .replace(/[^\u0621-\u064Aa-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 40);
    };

    const handleChange = (field, value) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };
            if (field === 'businessName') {
                updated.slug = generateSlug(value);
            }
            return updated;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormData(prev => ({ ...prev, saving: true }));
        try {
            await Api.createTenantManual({
                businessName: formData.businessName,
                slug: formData.slug,
                adminName: formData.adminName,
                adminEmail: formData.adminEmail,
                password: formData.password,
                phone: formData.phone,
            });
            showToast('تم إنشاء المتجر بنجاح بدون OTP ✅', 'success');
            navigate('/super-admin/dashboard');
        } catch (error) {
            showToast(error.message || 'فشل في إنشاء المتجر', 'error');
            setFormData(prev => ({ ...prev, saving: false }));
        }
    };

    return (
        <div className="super-admin-dashboard" style={{ padding: '20px', maxWidth: '700px', margin: '0 auto' }}>
            <header className="sa-header" style={{ marginBottom: '30px' }}>
                <div className="sa-title">
                    <h1>
                        <i className="fas fa-store" style={{ marginLeft: '8px', color: 'var(--primary)' }}></i>
                        إضافة متجر جديد (بدون OTP)
                    </h1>
                    <p style={{ marginTop: '5px', color: 'var(--text-muted)' }}>
                        إنشاء تنانت جديد للمنصة يدوياً بدون إرسال كود تحقق عبر الموبايل.
                    </p>
                </div>
            </header>

            <div className="card" style={{ padding: '25px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>اسم النشاط التجاري *</label>
                        <input
                            type="text"
                            className="form-control"
                            required
                            value={formData.businessName}
                            onChange={(e) => handleChange('businessName', e.target.value)}
                            placeholder="مثال: سوبر ماركت النور"
                            style={{ textAlign: 'right', width: '100%', padding: '10px' }}
                        />
                    </div>
                    
                    <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>الرابط (Slug) *</label>
                        <input
                            type="text"
                            className="form-control"
                            required
                            value={formData.slug}
                            onChange={(e) => handleChange('slug', e.target.value)}
                            placeholder="super-market-alnour"
                            dir="ltr"
                            style={{ textAlign: 'left', fontFamily: 'monospace', width: '100%', padding: '10px' }}
                        />
                        <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '5px' }}>سيتم إنشاء subdomain بناءً على هذا الرابط</small>
                    </div>

                    <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>اسم المسؤول *</label>
                        <input
                            type="text"
                            className="form-control"
                            required
                            value={formData.adminName}
                            onChange={(e) => handleChange('adminName', e.target.value)}
                            placeholder="أحمد محمد"
                            style={{ textAlign: 'right', width: '100%', padding: '10px' }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>البريد الإلكتروني *</label>
                        <input
                            type="email"
                            className="form-control"
                            required
                            value={formData.adminEmail}
                            onChange={(e) => handleChange('adminEmail', e.target.value)}
                            placeholder="admin@example.com"
                            dir="ltr"
                            style={{ textAlign: 'left', width: '100%', padding: '10px' }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>كلمة المرور *</label>
                        <input
                            type="password"
                            className="form-control"
                            required
                            minLength={6}
                            value={formData.password}
                            onChange={(e) => handleChange('password', e.target.value)}
                            placeholder="كلمة مرور المسؤول (6 أحرف على الأقل)"
                            style={{ width: '100%', padding: '10px' }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>رقم الجوال *</label>
                        <input
                            type="tel"
                            className="form-control"
                            required
                            value={formData.phone}
                            onChange={(e) => handleChange('phone', e.target.value)}
                            placeholder="01xxxxxxxxx"
                            dir="ltr"
                            style={{ textAlign: 'left', width: '100%', padding: '10px' }}
                        />
                        <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '5px' }}>رقم الموبايل (مثال: 01012345678)</small>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid #eee' }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => navigate('/super-admin/dashboard')}
                            disabled={formData.saving}
                            style={{ padding: '10px 20px' }}
                        >
                            إلغاء والعودة
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={formData.saving}
                            style={{ 
                                background: 'var(--primary, #0078D4)', 
                                color: '#fff', 
                                border: 'none', 
                                fontWeight: 'bold',
                                padding: '10px 30px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {formData.saving ? (
                                <>
                                    <i className="fas fa-spinner fa-spin"></i>
                                    جاري الإنشاء...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-check"></i>
                                    إنشاء المتجر
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SuperAdminAddTenant;
