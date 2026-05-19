import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';

const LeaveTypes = () => {
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast, confirm } = useGlobalUI();
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({
        nameAr: '',
        nameEn: '',
        maxDaysPerYear: 21,
        isCarryOver: false,
        isPaid: true,
        genderRestricted: 'NONE',
        oncePerLifetime: false,
        minServiceMonths: 0,
        includeHolidays: false
    });

    useEffect(() => {
        loadTypes();
    }, []);

    const loadTypes = async () => {
        setLoading(true);
        try {
            const data = await Api.getLeaveTypes();
            setTypes(data || []);
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await Api.updateLeaveType(editingId, form);
                toast('تم تحديث نوع الإجازة بنجاح', 'success');
            } else {
                await Api.createLeaveType(form);
                toast('تم إضافة نوع الإجازة بنجاح', 'success');
            }
            setShowModal(false);
            loadTypes();
        } catch (err) {
            toast(err.message, 'error');
        }
    };

    const handleEdit = (type) => {
        setEditingId(type.id);
        setForm({
            nameAr: type.nameAr,
            nameEn: type.nameEn,
            maxDaysPerYear: type.maxDaysPerYear || 0,
            isCarryOver: type.isCarryOver,
            isPaid: type.isPaid,
            genderRestricted: type.genderRestricted,
            oncePerLifetime: type.oncePerLifetime,
            minServiceMonths: type.minServiceMonths,
            includeHolidays: type.includeHolidays
        });
        setShowModal(true);
    };

    const handleDelete = (id) => {
        confirm('هل أنت متأكد من حذف هذا النوع؟ سيؤثر ذلك على الطلبات الحالية.', async () => {
            try {
                await Api.deleteLeaveType(id);
                toast('تم الحذف بنجاح', 'success');
                loadTypes();
            } catch (err) {
                toast(err.message, 'error');
            }
        });
    };

    return (
        <div className="page-section anim-fade-in">
            <div className="card">
                <div className="card-header">
                    <h3>⚙️ إعدادات أنواع الإجازات</h3>
                    <button className="btn btn-primary" onClick={() => { setEditingId(null); setForm({ nameAr: '', nameEn: '', maxDaysPerYear: 21, isCarryOver: false, isPaid: true, genderRestricted: 'NONE', oncePerLifetime: false, minServiceMonths: 0, includeHolidays: false }); setShowModal(true); }}>
                        + إضافة نوع جديد
                    </button>
                </div>
                <div className="card-body no-padding">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>الاسم (عربي)</th>
                                <th>الاسم (إنجليزي)</th>
                                <th>المدة السنوية</th>
                                <th>خصائص</th>
                                <th>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5"><Loader /></td></tr>
                            ) : types.map(type => (
                                <tr key={type.id}>
                                    <td><strong>{type.nameAr}</strong></td>
                                    <td>{type.nameEn}</td>
                                    <td>{type.maxDaysPerYear ? `${type.maxDaysPerYear} يوم` : 'غير محدد'}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                            {type.isCarryOver && <span className="badge badge-primary">ترحل</span>}
                                            {type.isPaid ? <span className="badge badge-success">مدفوعة</span> : <span className="badge badge-danger">غير مدفوعة</span>}
                                            {type.oncePerLifetime && <span className="badge badge-warning">مرة بالعمر</span>}
                                            {type.includeHolidays && <span className="badge">تشمل العطلات</span>}
                                            {type.genderRestricted !== 'NONE' && <span className="badge badge-purple">{type.genderRestricted === 'MALE' ? 'ذكر' : 'أنثى'}</span>}
                                        </div>
                                    </td>
                                    <td>
                                        <button className="btn btn-sm btn-ghost" onClick={() => handleEdit(type)}>تعديل</button>
                                        <button className="btn btn-sm btn-ghost-danger" onClick={() => handleDelete(type.id)}>حذف</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <ModalContainer>
                    <div className="modal-overlay active anim-fade-in" onClick={() => setShowModal(false)}>
                        <div className="modal-content anim-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                            <div className="modal-header">
                                <h2>{editingId ? 'تعديل نوع إجازة' : 'إضافة نوع إجازة جديد'}</h2>
                                <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', padding: '20px' }}>
                                    <div className="form-group">
                                        <label>الاسم بالعربية</label>
                                        <input type="text" className="form-control" required value={form.nameAr} onChange={e => setForm({...form, nameAr: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>الاسم بالإنجليزية</label>
                                        <input type="text" className="form-control" required value={form.nameEn} onChange={e => setForm({...form, nameEn: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>الحد الأقصى للأيام/سنة</label>
                                        <input type="number" className="form-control" value={form.maxDaysPerYear} onChange={e => setForm({...form, maxDaysPerYear: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>أقل مدة خدمة (أشهر)</label>
                                        <input type="number" className="form-control" value={form.minServiceMonths} onChange={e => setForm({...form, minServiceMonths: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>القيد حسب النوع</label>
                                        <select className="form-control" value={form.genderRestricted} onChange={e => setForm({...form, genderRestricted: e.target.value})}>
                                            <option value="NONE">للجميع</option>
                                            <option value="MALE">ذكور فقط</option>
                                            <option value="FEMALE">إناث فقط</option>
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={form.isCarryOver} onChange={e => setForm({...form, isCarryOver: e.target.checked})} />
                                            قابلة للترحيل للسنة التالية
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={form.isPaid} onChange={e => setForm({...form, isPaid: e.target.checked})} />
                                            إجازة مدفوعة الأجر
                                        </label>
                                    </div>
                                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={form.oncePerLifetime} onChange={e => setForm({...form, oncePerLifetime: e.target.checked})} />
                                            تُمنح مرة واحدة بالعمر
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={form.includeHolidays} onChange={e => setForm({...form, includeHolidays: e.target.checked})} />
                                            تشمل العطلات الأسبوعية
                                        </label>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>إلغاء</button>
                                    <button type="submit" className="btn btn-primary">حفظ البيانات</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalContainer>
            )}
        </div>
    );
};

export default LeaveTypes;
