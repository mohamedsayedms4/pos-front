import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';

const ShiftsManagement = () => {
    const { toast, confirm } = useGlobalUI();
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingShift, setEditingShift] = useState(null);
    const [formData, setFormData] = useState({ name: '', startTime: '', endTime: '', gracePeriodMinutes: 0 });

    useEffect(() => {
        loadShifts();
    }, []);

    const loadShifts = async () => {
        setLoading(true);
        try {
            const data = await Api.getShifts();
            setShifts(data);
        } catch (err) {
            toast('فشل في تحميل الورديات: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (shift = null) => {
        if (shift) {
            setEditingShift(shift);
            setFormData({
                name: shift.name,
                startTime: shift.startTime,
                endTime: shift.endTime,
                gracePeriodMinutes: shift.gracePeriodMinutes
            });
        } else {
            setEditingShift(null);
            setFormData({ name: '', startTime: '', endTime: '', gracePeriodMinutes: 0 });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingShift) {
                await Api.updateShift(editingShift.id, formData);
                toast('تم تحديث الوردية بنجاح', 'success');
            } else {
                await Api.createShift(formData);
                toast('تم إضافة الوردية بنجاح', 'success');
            }
            setShowModal(false);
            loadShifts();
        } catch (err) {
            toast(err.message, 'error');
        }
    };

    const handleDelete = (id) => {
        confirm('هل أنت متأكد من حذف هذه الوردية؟', async () => {
            try {
                await Api.deleteShift(id);
                toast('تم حذف الوردية', 'success');
                loadShifts();
            } catch (err) {
                toast(err.message, 'error');
            }
        });
    };

    const getShiftIcon = (name, startTime) => {
        const n = (name || '').toLowerCase();
        if (n.includes('صباح') || n.includes('day') || n.includes('morning')) return '☀️';
        if (n.includes('مساء') || n.includes('ليل') || n.includes('night') || n.includes('evening')) return '🌙';
        
        // fallback to hour check
        if (startTime) {
            const hour = parseInt(startTime.split(':')[0]);
            if (hour >= 6 && hour < 17) return '☀️';
            return '🌙';
        }
        return '🕒';
    };

    const getShiftColor = (index) => {
        const colors = ['var(--metro-blue)', 'var(--metro-green)', 'var(--metro-purple)', 'var(--metro-orange)', 'var(--metro-teal)'];
        return colors[index % colors.length];
    };

    if (loading) return <Loader message="جاري تحميل الورديات..." />;

    return (
        <div className="page-section anim-fade-in">
            <div className="section-header" style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                   <h1 className="page-title" style={{ marginBottom: '5px' }}>🕒 إدارة الورديات</h1>
                   <p className="text-dim">تحديد ساعات العمل وفترات السماح لكل وردية</p>
                </div>
                <button className="btn btn-primary" onClick={() => handleOpenModal()} style={{ height: '48px', padding: '0 30px' }}>
                    + إضافة وردية جديدة
                </button>
            </div>

            <div className="grid-tiles" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {shifts.length === 0 ? (
                    <div className="card empty-state" style={{ gridColumn: '1 / -1', padding: '100px', textAlign: 'center' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>⏰</div>
                        <h3>لا توجد ورديات مسجلة حالياً</h3>
                        <p className="text-dim">ابدأ بإضافة أول وردية لتنظيم عمل الموظفين</p>
                    </div>
                ) : shifts.map((shift, idx) => (
                    <div key={shift.id} className="card shift-card anim-slide-in" style={{ 
                        borderLeft: `5px solid ${getShiftColor(idx)}`,
                        position: 'relative',
                        transition: 'transform 0.2s'
                    }}>
                        <div className="card-header" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '20px 25px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, color: '#fff', fontWeight: '700' }}>{shift.name}</h3>
                                <span style={{ fontSize: '1.5rem' }}>{getShiftIcon(shift.name, shift.startTime)}</span>
                            </div>
                        </div>
                        <div className="card-body" style={{ padding: '25px' }}>
                            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '5px' }}>البداية</label>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '200', fontFamily: 'monospace', color: 'var(--text-white)' }}>{shift.startTime?.slice(0, 5)}</div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '5px' }}>النهاية</label>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '200', fontFamily: 'monospace', color: 'var(--text-white)' }}>{shift.endTime?.slice(0, 5)}</div>
                                </div>
                            </div>
                            <div style={{ borderTop: '1px dashed var(--border-main)', paddingTop: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>فترة السماح (نأخير):</span>
                                    <span className="badge badge-info">{shift.gracePeriodMinutes || 0} دقيقة</span>
                                </div>
                            </div>
                        </div>
                        <div className="card-footer" style={{ background: 'rgba(255,255,255,0.02)', padding: '15px 25px', display: 'flex', gap: '10px' }}>
                            <button className="btn btn-sm btn-ghost" onClick={() => handleOpenModal(shift)} style={{ flex: 1 }}>تعديل</button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(shift.id)}>حذف</button>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="modal-overlay active">
                    <div className="modal anim-scale-in" style={{ maxWidth: '450px' }}>
                        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-main)' }}>
                            <h3 style={{ margin: 0 }}>{editingShift ? 'تعديل وردية' : 'إضافة وردية جديدة'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body" style={{ padding: '25px' }}>
                                <div className="form-group">
                                    <label>اسم الوردية (مثل: وردية الصباح):</label>
                                    <input type="text" className="form-control" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required autoFocus />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>وقت الحضور:</label>
                                        <input type="time" className="form-control" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} required />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>وقت الانصراف:</label>
                                        <input type="time" className="form-control" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} required />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>فترة السماح قبل احتساب التأخير (دقائق):</label>
                                    <input type="number" className="form-control" value={formData.gracePeriodMinutes} onChange={e => setFormData({ ...formData, gracePeriodMinutes: e.target.value })} required />
                                </div>
                            </div>
                            <div className="modal-footer" style={{ padding: '20px 25px', background: 'var(--bg-elevated)', borderTop: '1px solid var(--border-main)' }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ marginRight: '10px' }}>إلغاء</button>
                                <button type="submit" className="btn btn-primary" style={{ padding: '0 30px' }}>حفظ الوردية</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShiftsManagement;
