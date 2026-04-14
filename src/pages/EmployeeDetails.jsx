import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Api, { API_BASE } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';

const EmployeeDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast, confirm } = useGlobalUI();

    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showIdModal, setShowIdModal] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');

    const [bonuses, setBonuses] = useState([]);
    const [deductions, setDeductions] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [payrolls, setPayrolls] = useState([]);
    const [shifts, setShifts] = useState([]);

    const [newBonus, setNewBonus] = useState({ amount: '', bonusType: 'MONTHLY', reason: '' });
    const [newDeduction, setNewDeduction] = useState({ amount: '', deductionType: 'PENALTY', reason: '' });
    const [salaryForm, setSalaryForm] = useState({ baseSalary: '', shiftId: '' });

    const API_IMAGE_BASE = `${API_BASE}/products/images`;

    useEffect(() => {
        loadEmployee();
    }, [id]);

    useEffect(() => {
        loadExtraData();
    }, [id, activeTab]);

    useEffect(() => {
        if (employee && employee.profile) {
            setSalaryForm({
                baseSalary: employee.profile.baseSalary || '',
                shiftId: employee.profile.shift?.id || ''
            });
        }
    }, [employee]);

    const loadEmployee = async () => {
        setLoading(true);
        try {
            const data = await Api.getUser(id);
            setEmployee(data);
        } catch (err) {
            toast('فشل في تحميل بيانات الموظف: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadExtraData = async () => {
        try {
            if (activeTab === 'financial') {
                const s = await Api.getShifts();
                setShifts(s);
            } else if (activeTab === 'bonuses') {
                const b = await Api.getEmployeeBonuses(id);
                setBonuses(b);
            } else if (activeTab === 'deductions') {
                const d = await Api.getEmployeeDeductions(id);
                setDeductions(d);
            } else if (activeTab === 'attendance') {
                const now = new Date();
                const a = await Api.getEmployeeAttendance(id, now.getMonth() + 1, now.getFullYear());
                setAttendance(a);
            } else if (activeTab === 'payrolls') {
                const p = await Api.getMonthlyPayrolls(new Date().getMonth() + 1, new Date().getFullYear());
                setPayrolls(p.filter(item => item.userId === parseInt(id)));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const toggleStatus = async () => {
        try {
            await Api.setUserEnabled(employee.id, !employee.enabled);
            setEmployee({ ...employee, enabled: !employee.enabled });
            toast(employee.enabled ? 'تم تعطيل الحساب بنجاح' : 'تم تفعيل الحساب بنجاح', 'success');
        } catch (err) {
            toast(err.message, 'error');
        }
    };

    const handleDelete = () => {
        confirm(`هل أنت متأكد نهائياً من حذف الموظف "${employee.name}"؟ سيتم حذف جميع سجلاته المرتبطة.`, async () => {
            try {
                await Api.deleteUser(employee.id);
                toast('تم حذف الموظف بنجاح', 'success');
                navigate('/employees');
            } catch (err) {
                toast(err.message, 'error');
            }
        });
    };

    const handleUpdateFinancial = async (e) => {
        e.preventDefault();
        try {
            const updatedProfile = { ...employee.profile, baseSalary: salaryForm.baseSalary, shift: salaryForm.shiftId ? { id: salaryForm.shiftId } : null };
            await Api.updateUserProfile(employee.id, updatedProfile);
            toast('تم تحديث البيانات المالية للراتب بنجاح', 'success');
            loadEmployee();
        } catch (err) {
            toast(err.message, 'error');
        }
    };

    const handleAddBonus = async (e) => {
        e.preventDefault();
        try {
            await Api.addEmployeeBonus(id, newBonus);
            toast('تم إضافة المكافأة بنجاح', 'success');
            setNewBonus({ amount: '', bonusType: 'MONTHLY', reason: '' });
            loadExtraData();
        } catch (err) {
            toast(err.message, 'error');
        }
    };

    const handlePayBonus = async (bonusId) => {
        try {
            await Api.payEmployeeBonus(bonusId);
            toast('تم صرف المكافأة للراتب بنجاح', 'success');
            loadExtraData();
        } catch (err) {
            toast(err.message, 'error');
        }
    };

    const handleAddDeduction = async (e) => {
        e.preventDefault();
        try {
            await Api.addEmployeeDeduction(id, newDeduction);
            toast('تم إضافة الخصم بنجاح', 'success');
            setNewDeduction({ amount: '', deductionType: 'PENALTY', reason: '' });
            loadExtraData();
        } catch (err) {
            toast(err.message, 'error');
        }
    };

    const handleCheckIn = async () => {
        try {
            await Api.checkInEmployee(id);
            toast('تم تسجيل الحضور بنجاح', 'success');
            loadExtraData();
        } catch (err) {
            toast(err.message, 'error');
        }
    };

    const handleCheckOut = async () => {
        try {
            await Api.checkOutEmployee(id);
            toast('تم تسجيل الانصراف بنجاح', 'success');
            loadExtraData();
        } catch (err) {
            toast(err.message, 'error');
        }
    };

    const handleGeneratePayroll = async () => {
        const now = new Date();
        try {
            await Api.generateEmployeePayroll(id, now.getMonth() + 1, now.getFullYear());
            toast('تم توليد كشف المرتب بنجاح', 'success');
            loadExtraData();
        } catch (err) {
            // Already handled by idempotent backend, but keeping for safety
            if (err.message.includes('Already generated')) {
                toast('تم توليد كشف المرتب لهذا الشهر مسبقاً', 'info');
            } else {
                toast(err.message, 'error');
            }
        }
    };

    if (loading) return <Loader message="جاري جلب ملف الموظف..." />;
    if (!employee) return (
        <div className="page-section empty-state">
            <div className="empty-icon">👤</div>
            <h3>الموظف غير موجود أو تم حذفه</h3>
            <button className="btn btn-primary" onClick={() => navigate('/employees')}>العودة للقائمة الرئيسية</button>
        </div>
    );

    const profile = employee.profile || {};

    const renderProfileTab = () => (
        <div className="details-grid-container anim-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
            <div className="card" style={{ borderTop: '4px solid var(--metro-blue)' }}>
                <div className="card-header" style={{ padding: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>💼 بيانات العمل والحساب</h3>
                </div>
                <div className="card-body" style={{ padding: '25px' }}>
                    <div className="detail-item">
                        <label>المسمى الوظيفي</label>
                        <div className="detail-value">{employee.jobTitle?.title || 'موظف بالفريق'}</div>
                    </div>
                    <div className="detail-item">
                        <label>البريد الإلكتروني</label>
                        <div className="detail-value">{employee.email}</div>
                    </div>
                    <div className="detail-item">
                        <label>الأدوار والصلاحيات</label>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
                            {(employee.roles || []).map(r => (
                                <span key={r} className="badge badge-info" style={{ borderRadius: '4px', textTransform: 'uppercase', fontSize: '10px' }}>{r.replace('ROLE_', '')}</span>
                            ))}
                        </div>
                    </div>
                    <div className="detail-item" style={{ marginBottom: 0 }}>
                        <label>تاريخ الانضمام للشركة</label>
                        <div className="detail-value">{profile.joiningDate || (employee.createdAt ? new Date(employee.createdAt).toLocaleDateString('ar-EG') : '—')}</div>
                    </div>
                </div>
            </div>

            <div className="card" style={{ borderTop: '4px solid var(--metro-purple)' }}>
                <div className="card-header" style={{ padding: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>👤 البيانات الشخصية</h3>
                </div>
                <div className="card-body" style={{ padding: '25px' }}>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className="detail-item">
                            <label>تاريخ الميلاد</label>
                            <div className="detail-value">{profile.birthDate || '—'}</div>
                        </div>
                        <div className="detail-item">
                            <label>النوع</label>
                            <div className="detail-value">{profile.gender === 'MALE' ? 'ذكر' : 'أنثى'}</div>
                        </div>
                        <div className="detail-item">
                            <label>الحالة الاجتماعية</label>
                            <div className="detail-value">{profile.maritalStatus || '—'}</div>
                        </div>
                        <div className="detail-item">
                            <label>فصيلة الدم</label>
                            <div className="detail-value" style={{ color: 'var(--metro-red)', fontWeight: 'bold' }}>{profile.bloodType || '—'}</div>
                        </div>
                   </div>
                   {profile.nationalIdImage && (
                    <button className="btn btn-sm btn-ghost" style={{ marginTop: '15px', width: '100%' }} onClick={() => setShowIdModal(true)}>
                        🔍 عرض صورة الهوية (الرقم القومي)
                    </button>
                   )}
                </div>
            </div>

            <div className="card" style={{ borderTop: '4px solid var(--metro-green)' }}>
                <div className="card-header" style={{ padding: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>📞 بيانات الاتصال</h3>
                </div>
                <div className="card-body" style={{ padding: '25px' }}>
                    <div className="detail-item">
                        <label>رقم الهاتف الأساسي</label>
                        <div className="detail-value" style={{ fontSize: '1.4rem', fontFamily: 'monospace' }}>{profile.mobileNumber || '—'}</div>
                    </div>
                    <div className="detail-item" style={{ marginBottom: 0 }}>
                        <label>رقم الواتساب</label>
                        <div className="detail-value" style={{ fontSize: '1.1rem' }}>{profile.whatsappNumber || '—'}</div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderFinancialTab = () => (
        <div className="card anim-slide-in" style={{ maxWidth: '700px', margin: '0 auto', borderTop: '4px solid var(--metro-teal)' }}>
            <div className="card-header" style={{ padding: '25px' }}>
                <h3 style={{ margin: 0 }}>⚙️ إعدادات الراتب والوردية</h3>
                <p className="text-dim" style={{ fontSize: '0.9rem', marginTop: '5px' }}>تعديل الراتب الأساسي وتخصيص وردية العمل للموظف</p>
            </div>
            <div className="card-body" style={{ padding: '30px' }}>
                <form onSubmit={handleUpdateFinancial}>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>المرتب الأساسي (شهري):</label>
                            <div style={{ position: 'relative' }}>
                                <input type="number" className="form-control" value={salaryForm.baseSalary} onChange={e => setSalaryForm({ ...salaryForm, baseSalary: e.target.value })} placeholder="0.00" style={{ paddingRight: '45px', height: '50px', fontSize: '1.2rem' }} />
                                <span style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>ج.م</span>
                            </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>وردية العمل (Shift):</label>
                            <select className="form-control" value={salaryForm.shiftId} onChange={e => setSalaryForm({ ...salaryForm, shiftId: e.target.value })} style={{ height: '50px' }}>
                                <option value="">بدون وردية ثابتة</option>
                                {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                   </div>
                   <button type="submit" className="btn btn-primary" style={{ height: '50px', width: '100%' }}>💾 حفظ التعديلات المالية</button>
                </form>
            </div>
        </div>
    );

    const renderBonusesTab = () => (
        <div className="anim-slide-in">
            <div className="card" style={{ marginBottom: '20px', background: 'rgba(16, 124, 16, 0.05)', border: '1px solid rgba(16, 124, 16, 0.2)' }}>
                <div className="card-body" style={{ padding: '20px' }}>
                    <h4 style={{ marginBottom: '15px', color: 'var(--metro-green)' }}>🎁 إضافة مكافأة سريعة</h4>
                    <form onSubmit={handleAddBonus} style={{ display: 'grid', gridTemplateColumns: '150px 180px 1fr auto', gap: '15px', alignItems: 'flex-end' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.75rem' }}>المبلغ</label>
                            <input type="number" className="form-control" placeholder="0.00" value={newBonus.amount} onChange={e => setNewBonus({ ...newBonus, amount: e.target.value })} required />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.75rem' }}>نوع المكافأة</label>
                            <select className="form-control" value={newBonus.bonusType} onChange={e => setNewBonus({ ...newBonus, bonusType: e.target.value })}>
                                <option value="MONTHLY">إضافي شهري</option>
                                <option value="PERFORMANCE">مكافأة أداء</option>
                                <option value="ALLOWANCE">بدل انتقال/سكن</option>
                                <option value="OTHER">أخرى</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.75rem' }}>السبب / الملاحظات</label>
                            <input type="text" className="form-control" placeholder="اكتب سبب المكافأة هنا..." value={newBonus.reason} onChange={e => setNewBonus({ ...newBonus, reason: e.target.value })} required />
                        </div>
                        <button type="submit" className="btn btn-success" style={{ height: '42px', padding: '0 30px' }}>إضافة</button>
                    </form>
                </div>
            </div>
            
            <div className="card">
                <table className="data-table">
                    <thead><tr><th>التاريخ</th><th>المبلغ</th><th>النوع</th><th>السبب</th><th>الحالة</th><th>إجراء</th></tr></thead>
                    <tbody>
                        {bonuses.length === 0 ? <tr><td colSpan="6" style={{ textAlign: 'center', padding: '50px' }}>لا توجد مكافآت مسجلة</td></tr> : bonuses.map(b => (
                            <tr key={b.id}>
                                <td>{b.bonusDate}</td>
                                <td style={{ color: 'var(--metro-green)', fontWeight: '700' }}>{b.amount.toLocaleString()} ج.م</td>
                                <td><span className="badge badge-info">{b.bonusType}</span></td>
                                <td>{b.reason}</td>
                                <td>{b.paid ? <span className="badge badge-success">مدفوعة</span> : <span className="badge badge-warning">معلقة</span>}</td>
                                <td>{!b.paid && <button className="btn btn-sm btn-primary" onClick={() => handlePayBonus(b.id)}>صرف الآن</button>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderDeductionsTab = () => (
        <div className="anim-slide-in">
            <div className="card" style={{ marginBottom: '20px', background: 'rgba(216, 59, 1, 0.05)', border: '1px solid rgba(216, 59, 1, 0.2)' }}>
                <div className="card-body" style={{ padding: '20px' }}>
                    <h4 style={{ marginBottom: '15px', color: 'var(--metro-red)' }}>📉 إضافة خصم أو سلفة</h4>
                    <form onSubmit={handleAddDeduction} style={{ display: 'grid', gridTemplateColumns: '150px 180px 1fr auto', gap: '15px', alignItems: 'flex-end' }}>
                         <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.75rem' }}>المبلغ</label>
                            <input type="number" className="form-control" placeholder="0.00" value={newDeduction.amount} onChange={e => setNewDeduction({ ...newDeduction, amount: e.target.value })} required />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.75rem' }}>نوع الخصم</label>
                            <select className="form-control" value={newDeduction.deductionType} onChange={e => setNewDeduction({ ...newDeduction, deductionType: e.target.value })}>
                                <option value="PENALTY">جزاء إداري</option>
                                <option value="ADVANCE">سلفة مالية</option>
                                <option value="ABSENCE">غياب بدون إذن</option>
                                <option value="LATE">تأخير مفرط</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.75rem' }}>السبب / التفاصيل</label>
                            <input type="text" className="form-control" placeholder="سبب الخصم..." value={newDeduction.reason} onChange={e => setNewDeduction({ ...newDeduction, reason: e.target.value })} required />
                        </div>
                        <button type="submit" className="btn btn-danger" style={{ height: '42px', padding: '0 30px' }}>تسجيل</button>
                    </form>
                </div>
            </div>

            <div className="card">
                <table className="data-table">
                    <thead><tr><th>التاريخ</th><th>المبلغ</th><th>النوع</th><th>السبب</th></tr></thead>
                    <tbody>
                        {deductions.length === 0 ? <tr><td colSpan="4" style={{ textAlign: 'center', padding: '50px' }}>لا توجد خصومات مسجلة</td></tr> : deductions.map(d => (
                            <tr key={d.id}><td>{d.deductionDate}</td><td style={{ color: 'var(--metro-red)', fontWeight: '700' }}>-{d.amount.toLocaleString()} ج.م</td><td><span className="badge badge-danger">{d.deductionType}</span></td><td>{d.reason}</td></tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderAttendanceTab = () => (
        <div className="anim-slide-in">
            <div className="toolbar" style={{ marginBottom: '25px', display: 'flex', gap: '15px' }}>
                <button className="btn btn-success" onClick={handleCheckIn} style={{ height: '48px', flex: 1 }}>📍 تسجيل حضور اليوم</button>
                <button className="btn btn-danger" onClick={handleCheckOut} style={{ height: '48px', flex: 1 }}>🏃 تسجيل انصراف اليوم</button>
            </div>
            <div className="card">
                <table className="data-table">
                    <thead><tr><th>التاريخ</th><th>الحضور</th><th>الانصراف</th><th>ساعات العمل</th><th>التأخير</th><th>الحالة</th></tr></thead>
                    <tbody>
                        {attendance.length === 0 ? <tr><td colSpan="6" style={{ textAlign: 'center', padding: '50px' }}>لا يوجد سجل حضور لهذا الشهر</td></tr> : attendance.map(a => (
                            <tr key={a.id}>
                                <td>{a.date}</td>
                                <td style={{ fontFamily: 'monospace' }}>{a.checkIn || '—'}</td>
                                <td style={{ fontFamily: 'monospace' }}>{a.checkOut || '—'}</td>
                                <td>{a.workedHours?.toFixed(1) || 0} س</td>
                                <td style={{ color: a.lateMinutes > 0 ? 'var(--metro-orange)' : 'inherit' }}>{a.lateMinutes || 0} د</td>
                                <td><span className={`badge ${a.status === 'PRESENT' ? 'badge-success' : 'badge-danger'}`}>{a.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderPayrollsTab = () => (
        <div className="anim-slide-in">
            <div className="toolbar" style={{ marginBottom: '25px' }}>
                <button className="btn btn-primary" onClick={handleGeneratePayroll} style={{ height: '50px', width: '100%', background: 'var(--metro-purple)', borderColor: 'var(--metro-purple)' }}>
                    📝 توليد أو تحديث كشف المرتب لهذا الشهر
                </button>
            </div>
            <div className="card">
                <table className="data-table">
                    <thead><tr><th>الفترة</th><th>الأساسي</th><th>المكافآت (+)</th><th>الخصومات (-)</th><th>الصافي المستحق</th><th>الحالة</th></tr></thead>
                    <tbody>
                        {payrolls.length === 0 ? <tr><td colSpan="6" style={{ textAlign: 'center', padding: '50px' }}>لا توجد كشوفات مرتبات مصدرة لهذا الموظف</td></tr> : payrolls.map(p => (
                            <tr key={p.id}>
                                <td style={{ fontWeight: '700' }}>{String(p.month).padStart(2,'0')}/{p.year}</td>
                                <td>{p.baseSalary.toLocaleString()}</td>
                                <td style={{ color: 'var(--metro-green)' }}>+{p.totalBonuses.toLocaleString()}</td>
                                <td style={{ color: 'var(--metro-red)' }}>-{p.totalDeductions.toLocaleString()}</td>
                                <td style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 'bold' }}>{p.netSalary.toLocaleString()} ج.م</td>
                                <td><span className={`badge ${p.status === 'PAID' ? 'badge-success' : 'badge-warning'}`}>{p.status === 'PAID' ? 'تم الصرف' : 'بانتظار الصرف'}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="page-section anim-fade-in">
            <div className="toolbar" style={{ marginBottom: '25px', display: 'flex', gap: '15px', alignItems: 'center' }}>
                <button className="btn btn-ghost" onClick={() => navigate('/employees')} style={{ padding: '0 20px', height: '42px' }}>← عودة للموظفين</button>
                <div style={{ flex: 1 }}></div>
                <button className="btn btn-ghost" onClick={toggleStatus} style={{ height: '42px' }}>
                    {employee.enabled ? '🔒 تعطيل الحساب' : '🔓 تفعيل الحساب'}
                </button>
                <button className="btn btn-danger" onClick={handleDelete} style={{ height: '42px' }}>🗑️ حذف الملف</button>
            </div>

            <div className="card profile-header-card-premium" style={{ marginBottom: '30px', padding: 0, overflow: 'hidden', position: 'relative' }}>
                <div className="profile-banner" style={{ height: '160px', background: 'var(--gradient-primary)', opacity: 0.9 }}>
                   {/* Decorative background circles */}
                   <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }}></div>
                </div>
                
                <div className="profile-content-container" style={{ padding: '0 40px 40px', marginTop: '-80px', position: 'relative', display: 'flex', gap: '30px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className="profile-avatar-premium" style={{ 
                        width: '160px', 
                        height: '160px', 
                        borderRadius: '20px', 
                        background: 'var(--bg-elevated)', 
                        padding: '6px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        {employee.profilePicture ? (
                            <img src={`${API_IMAGE_BASE}/${employee.profilePicture}`} alt="" style={{ width: '100%', height: '100%', borderRadius: '15px', objectFit: 'cover' }} />
                        ) : (
                            <div className="avatar-placeholder" style={{ width: '100%', height: '100%', borderRadius: '15px', background: 'var(--gradient-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', color: '#fff' }}>
                                {(employee.name || 'U').charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    
                    <div className="profile-text-premium" style={{ flex: 1, paddingBottom: '10px' }}>
                        <h1 style={{ fontSize: '3rem', margin: '0 0 10px 0', fontWeight: '800', letterSpacing: '-1px' }}>{employee.name}</h1>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <span className="badge badge-info" style={{ fontSize: '1rem', padding: '8px 20px', borderRadius: '8px' }}>{employee.jobTitle?.title || 'موظف بالفريق'}</span>
                            <span className={`badge ${employee.enabled ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '1rem', padding: '8px 20px', borderRadius: '8px' }}>
                                {employee.enabled ? '● نشط حالياً' : '● حساب معطل'}
                            </span>
                            <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>ID: #{employee.id}</span>
                        </div>
                    </div>
                </div>

                <div className="tabs-navigation-premium" style={{ borderTop: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.2)', display: 'flex', padding: '0 40px' }}>
                    {[
                        { id: 'profile', label: '👤 البروفايل' },
                        { id: 'financial', label: '💰 المرتب' },
                        { id: 'bonuses', label: '🎁 المكافآت' },
                        { id: 'deductions', label: '🛑 الخصومات' },
                        { id: 'attendance', label: '📅 الحضور' },
                        { id: 'payrolls', label: '📝 الرواتب' }
                    ].map(tab => (
                        <button key={tab.id} className={`nav-tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="tab-render-area">
                {activeTab === 'profile' && renderProfileTab()}
                {activeTab === 'financial' && renderFinancialTab()}
                {activeTab === 'bonuses' && renderBonusesTab()}
                {activeTab === 'deductions' && renderDeductionsTab()}
                {activeTab === 'attendance' && renderAttendanceTab()}
                {activeTab === 'payrolls' && renderPayrollsTab()}
            </div>

            {showIdModal && (
                <div className="modal-overlay active" onClick={() => setShowIdModal(false)}>
                    <div className="modal modal-xl anim-scale-in" onClick={e => e.stopPropagation()} style={{ background: 'transparent', boxShadow: 'none' }}>
                        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                           <button className="btn btn-ghost" onClick={() => setShowIdModal(false)}>✕ إغلاق المعاينة</button>
                        </div>
                        <img src={`${API_IMAGE_BASE}/${profile.nationalIdImage}`} style={{ width: '100%', borderRadius: '15px', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }} alt="National ID" />
                    </div>
                </div>
            )}

            <style>{`
                .nav-tab-btn {
                    padding: 20px 25px;
                    background: transparent;
                    border: none;
                    color: var(--text-dim);
                    cursor: pointer;
                    font-weight: 600;
                    position: relative;
                    transition: all 0.3s;
                    font-size: 0.95rem;
                }
                .nav-tab-btn:hover { color: #fff; background: rgba(255,255,255,0.05); }
                .nav-tab-btn.active { color: var(--metro-blue); }
                .nav-tab-btn.active::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: var(--metro-blue);
                    box-shadow: 0 -5px 15px var(--metro-blue);
                }
                
                .detail-item { margin-bottom: 25px; }
                .detail-item label { 
                    display: block; 
                    font-size: 0.7rem; 
                    color: var(--text-dim); 
                    text-transform: uppercase; 
                    letter-spacing: 1px;
                    margin-bottom: 6px;
                }
                .detail-value { font-size: 1.1rem; color: #fff; font-weight: 500; }
                
                .data-table { width: 100%; border-collapse: collapse; }
                .data-table th { text-align: right; padding: 15px 20px; background: rgba(0,0,0,0.3); color: var(--text-dim); font-size: 0.8rem; border-bottom: 1px solid var(--border-main); }
                .data-table td { padding: 15px 20px; border-bottom: 1px solid var(--border-subtle); color: var(--text-muted); }
                .data-table tr:hover td { background: rgba(255,255,255,0.02); color: #fff; }
            `}</style>
        </div>
    );
};

export default EmployeeDetails;
