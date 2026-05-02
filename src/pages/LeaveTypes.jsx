import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import '../styles/pages/LeavesPremium.css';

const LeaveTypes = () => {
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast, confirm } = useGlobalUI();
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({
        nameAr: '', nameEn: '', maxDaysPerYear: 21, isCarryOver: false, isPaid: true, genderRestricted: 'NONE',
        oncePerLifetime: false, minServiceMonths: 0, includeHolidays: false
    });

    useEffect(() => { loadTypes(); }, []);

    const loadTypes = async () => {
        setLoading(true);
        try {
            const data = await Api.getLeaveTypes();
            setTypes(data || []);
        } catch (err) { toast(err.message, 'error'); }
        finally { setLoading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) await Api.updateLeaveType(editingId, form);
            else await Api.createLeaveType(form);
            toast('تم الحفظ بنجاح', 'success'); setShowModal(false); loadTypes();
        } catch (err) { toast(err.message, 'error'); }
    };

    const handleEdit = (type) => {
        setEditingId(type.id);
        setForm({ ...type });
        setShowModal(true);
    };

    return (
        <div className="leaves-container">
            {/* 1. Header */}
            <div className="lea-header-row">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="lea-breadcrumbs">
                        <Link to="/dashboard">الرئيسية</Link> / <span>HR Settings</span>
                    </div>
                    <h1>أنواع الإجازات</h1>
                </div>
                <div className="lea-header-actions">
                    <button className="lea-btn-premium lea-btn-blue" onClick={() => { setEditingId(null); setForm({ nameAr: '', nameEn: '', maxDaysPerYear: 21, isCarryOver: false, isPaid: true, genderRestricted: 'NONE', oncePerLifetime: false, minServiceMonths: 0, includeHolidays: false }); setShowModal(true); }}>
                        <i className="fas fa-plus"></i> إضافة نوع جديد
                    </button>
                </div>
            </div>

            {/* 2. Stats Grid */}
            <div className="lea-stats-grid">
                <div className="lea-stat-card">
                    <div className="lea-stat-info">
                        <h4>إجمالي الأنواع</h4>
                        <div className="lea-stat-value">{types.length}</div>
                    </div>
                    <div className="lea-stat-visual"><div className="lea-stat-icon icon-blue"><i className="fas fa-cog"></i></div></div>
                </div>
                <div className="lea-stat-card">
                    <div className="lea-stat-info">
                        <h4>إجازات مدفوعة</h4>
                        <div className="lea-stat-value" style={{ color: 'var(--lea-accent-green)' }}>{types.filter(t => t.isPaid).length}</div>
                    </div>
                    <div className="lea-stat-visual"><div className="lea-stat-icon icon-green"><i className="fas fa-money-bill-wave"></i></div></div>
                </div>
                <div className="lea-stat-card">
                    <div className="lea-stat-info">
                        <h4>قابلة للترحيل</h4>
                        <div className="lea-stat-value" style={{ color: 'var(--lea-accent-amber)' }}>{types.filter(t => t.isCarryOver).length}</div>
                    </div>
                    <div className="lea-stat-visual"><div className="lea-stat-icon icon-amber"><i className="fas fa-redo"></i></div></div>
                </div>
                <div className="lea-stat-card">
                    <div className="lea-stat-info">
                        <h4>مرة بالعمر</h4>
                        <div className="lea-stat-value" style={{ color: 'var(--lea-accent-purple)' }}>{types.filter(t => t.oncePerLifetime).length}</div>
                    </div>
                    <div className="lea-stat-visual"><div className="lea-stat-icon icon-purple"><i className="fas fa-star"></i></div></div>
                </div>
            </div>

            {/* 3. Table Card */}
            <div className="lea-table-card">
                <div className="lea-table-container">
                    {loading ? (
                        <div style={{ padding: '40px' }}><Loader message="جاري التحميل..." /></div>
                    ) : (
                        <table className="lea-table">
                            <thead>
                                <tr>
                                    <th>الاسم</th>
                                    <th>المدة السنوية</th>
                                    <th>الخصائص</th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {types.map(type => (
                                    <tr key={type.id}>
                                        <td>
                                            <div style={{ fontWeight: 800 }}>{type.nameAr}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--lea-text-secondary)' }}>{type.nameEn}</div>
                                        </td>
                                        <td><div style={{ fontWeight: 900 }}>{type.maxDaysPerYear || '∞'} يوم</div></td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                {type.isPaid ? <span className="lea-type-badge badge-green">مدفوعة</span> : <span className="lea-type-badge badge-red">غير مدفوعة</span>}
                                                {type.isCarryOver && <span className="lea-type-badge badge-amber">ترحيل</span>}
                                                {type.oncePerLifetime && <span className="lea-type-badge badge-blue">مرة بالعمر</span>}
                                                {type.genderRestricted !== 'NONE' && <span className="lea-type-badge badge-purple">{type.genderRestricted === 'MALE' ? 'رجال' : 'سيدات'}</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button className="lea-action-btn" onClick={() => handleEdit(type)}><i className="fas fa-edit"></i></button>
                                                <button className="lea-action-btn delete" onClick={() => confirm(`حذف ${type.nameAr}؟`, () => Api.deleteLeaveType(type.id).then(loadTypes))}><i className="fas fa-trash"></i></button>
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
                        <div className="lea-modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                            <div className="lea-modal-header">
                                <h3>{editingId ? 'تعديل نوع إجازة' : 'إضافة نوع إجازة جديد'}</h3>
                                <button className="lea-modal-close" onClick={() => setShowModal(false)}>✕</button>
                            </div>
                            <div className="lea-modal-body">
                                <form id="jtForm" onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="lea-form-group">
                                        <label>الاسم (عربي)</label>
                                        <input className="lea-input" required value={form.nameAr} onChange={e => setForm({...form, nameAr: e.target.value})} />
                                    </div>
                                    <div className="lea-form-group">
                                        <label>الاسم (إنجليزي)</label>
                                        <input className="lea-input" required value={form.nameEn} onChange={e => setForm({...form, nameEn: e.target.value})} />
                                    </div>
                                    <div className="lea-form-group">
                                        <label>الأيام/سنة</label>
                                        <input type="number" className="lea-input" value={form.maxDaysPerYear} onChange={e => setForm({...form, maxDaysPerYear: e.target.value})} />
                                    </div>
                                    <div className="lea-form-group">
                                        <label>القيد حسب النوع</label>
                                        <select className="lea-input" value={form.genderRestricted} onChange={e => setForm({...form, genderRestricted: e.target.value})}>
                                            <option value="NONE">للجميع</option>
                                            <option value="MALE">ذكور فقط</option>
                                            <option value="FEMALE">إناث فقط</option>
                                        </select>
                                    </div>
                                    <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <label className="lea-checkbox-label">
                                            <input type="checkbox" checked={form.isPaid} onChange={e => setForm({...form, isPaid: e.target.checked})} /> مدفوعة الأجر
                                        </label>
                                        <label className="lea-checkbox-label">
                                            <input type="checkbox" checked={form.isCarryOver} onChange={e => setForm({...form, isCarryOver: e.target.checked})} /> قابلة للترحيل
                                        </label>
                                        <label className="lea-checkbox-label">
                                            <input type="checkbox" checked={form.oncePerLifetime} onChange={e => setForm({...form, oncePerLifetime: e.target.checked})} /> مرة واحدة بالعمر
                                        </label>
                                        <label className="lea-checkbox-label">
                                            <input type="checkbox" checked={form.includeHolidays} onChange={e => setForm({...form, includeHolidays: e.target.checked})} /> تشمل العطلات
                                        </label>
                                    </div>
                                </form>
                            </div>
                            <div className="lea-modal-footer">
                                <button type="button" className="lea-btn-ghost" onClick={() => setShowModal(false)}>إلغاء</button>
                                <button type="submit" form="jtForm" className="lea-btn-primary">حفظ</button>
                            </div>
                        </div>
                    </div>
                </ModalContainer>
            )}
            <style dangerouslySetInnerHTML={{ __html: `
                .lea-checkbox-label { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.02); padding: 12px; border-radius: 12px; border: 1px solid var(--lea-border); cursor: pointer; font-weight: 700; font-size: 0.85rem; }
                .lea-checkbox-label input { width: 18px; height: 18px; }
            `}} />
        </div>
    );
};

export default LeaveTypes;
