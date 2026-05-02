import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import '../styles/pages/ShiftsPremium.css';

const ShiftsManagement = () => {
    const { toast, confirm } = useGlobalUI();
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingShift, setEditingShift] = useState(null);
    const [formData, setFormData] = useState({ name: '', startTime: '', endTime: '', gracePeriodMinutes: 0 });

    useEffect(() => { loadShifts(); }, []);

    const loadShifts = async () => {
        setLoading(true);
        try { const data = await Api.getShifts(); setShifts(data); }
        catch (err) { toast(err.message, 'error'); }
        finally { setLoading(false); }
    };

    const handleOpenModal = (shift = null) => {
        if (shift) {
            setEditingShift(shift);
            setFormData({ name: shift.name, startTime: shift.startTime, endTime: shift.endTime, gracePeriodMinutes: shift.gracePeriodMinutes });
        } else {
            setEditingShift(null);
            setFormData({ name: '', startTime: '', endTime: '', gracePeriodMinutes: 0 });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingShift) { await Api.updateShift(editingShift.id, formData); toast('تم التحديث', 'success'); }
            else { await Api.createShift(formData); toast('تم الإضافة', 'success'); }
            setShowModal(false); loadShifts();
        } catch (err) { toast(err.message, 'error'); }
    };

    const handleDelete = (id) => {
        confirm('حذف هذه الوردية؟', async () => {
            try { await Api.deleteShift(id); toast('تم الحذف', 'success'); loadShifts(); }
            catch (err) { toast(err.message, 'error'); }
        });
    };

    const getShiftVisual = (name, startTime) => {
        const n = (name || '').toLowerCase();
        if (n.includes('صباح') || n.includes('morning')) return { icon: 'fa-sun', color: 'var(--shf-accent-amber)' };
        if (n.includes('مساء') || n.includes('night')) return { icon: 'fa-moon', color: 'var(--shf-accent-purple)' };
        const hour = parseInt(startTime?.split(':')[0] || '0');
        return (hour >= 6 && hour < 17) ? { icon: 'fa-sun', color: 'var(--shf-accent-amber)' } : { icon: 'fa-moon', color: 'var(--shf-accent-purple)' };
    };

    return (
        <div className="shifts-container">
            {/* 1. Header */}
            <div className="shf-header-row">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="shf-breadcrumbs">
                        <Link to="/dashboard">الرئيسية</Link> / <span>HR</span>
                    </div>
                    <h1>إدارة ورديات العمل</h1>
                </div>
                <div className="shf-header-actions">
                    <button className="shf-btn-premium shf-btn-blue" onClick={() => handleOpenModal()}>
                        <i className="fas fa-plus-circle"></i> إضافة وردية جديدة
                    </button>
                </div>
            </div>

            {/* 2. Stats Grid */}
            <div className="shf-stats-grid">
                <div className="shf-stat-card">
                    <div className="shf-stat-info">
                        <h4>إجمالي الورديات</h4>
                        <div className="shf-stat-value">{shifts.length}</div>
                    </div>
                    <div className="shf-stat-visual"><div className="shf-stat-icon icon-blue"><i className="fas fa-clock"></i></div></div>
                </div>
                <div className="shf-stat-card">
                    <div className="shf-stat-info">
                        <h4>ورديات صباحية</h4>
                        <div className="shf-stat-value" style={{ color: 'var(--shf-accent-amber)' }}>{shifts.filter(s => getShiftVisual(s.name, s.startTime).icon === 'fa-sun').length}</div>
                    </div>
                    <div className="shf-stat-visual"><div className="shf-stat-icon icon-amber"><i className="fas fa-sun"></i></div></div>
                </div>
                <div className="shf-stat-card">
                    <div className="shf-stat-info">
                        <h4>ورديات مسائية</h4>
                        <div className="shf-stat-value" style={{ color: 'var(--shf-accent-purple)' }}>{shifts.filter(s => getShiftVisual(s.name, s.startTime).icon === 'fa-moon').length}</div>
                    </div>
                    <div className="shf-stat-visual"><div className="shf-stat-icon icon-purple"><i className="fas fa-moon"></i></div></div>
                </div>
                <div className="shf-stat-card">
                    <div className="shf-stat-info">
                        <h4>متوسط فترات السماح</h4>
                        <div className="shf-stat-value" style={{ color: 'var(--shf-accent-green)' }}>{shifts.length > 0 ? Math.round(shifts.reduce((a,b)=>a+b.gracePeriodMinutes, 0)/shifts.length) : 0} د</div>
                    </div>
                    <div className="shf-stat-visual"><div className="shf-stat-icon icon-green"><i className="fas fa-hourglass-half"></i></div></div>
                </div>
            </div>

            {/* 3. Grid Display */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                {loading ? (
                    <div style={{ gridColumn: '1/-1', padding: '100px' }}><Loader message="جاري التحميل..." /></div>
                ) : shifts.length === 0 ? (
                    <div style={{ gridColumn: '1/-1', padding: '100px', textAlign: 'center', color: 'var(--shf-text-secondary)' }}>
                        <i className="fas fa-calendar-times" style={{ fontSize: '4rem', opacity: 0.1, marginBottom: '24px' }}></i>
                        <h3>لا توجد ورديات معرفة حالياً</h3>
                    </div>
                ) : shifts.map(s => {
                    const visual = getShiftVisual(s.name, s.startTime);
                    return (
                        <div key={s.id} className="shf-stat-card" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '0', overflow: 'hidden' }}>
                            <div style={{ padding: '24px', borderBottom: '1px solid var(--shf-border)', background: 'rgba(99,102,241,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div><div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{s.name}</div><div style={{ fontSize: '0.7rem', color: 'var(--shf-text-secondary)' }}>ID: {s.id}</div></div>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--shf-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: visual.color, fontSize: '1.4rem' }}><i className={`fas ${visual.icon}`}></i></div>
                            </div>
                            <div style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                    <div><label style={{ fontSize: '0.7rem', color: 'var(--shf-text-secondary)', display: 'block', marginBottom: '4px' }}>وقت الحضور</label><div style={{ fontSize: '1.5rem', fontWeight: 200 }}>{s.startTime?.slice(0,5)}</div></div>
                                    <div style={{ textAlign: 'left' }}><label style={{ fontSize: '0.7rem', color: 'var(--shf-text-secondary)', display: 'block', marginBottom: '4px' }}>وقت الانصراف</label><div style={{ fontSize: '1.5rem', fontWeight: 200 }}>{s.endTime?.slice(0,5)}</div></div>
                                </div>
                                <div className="shf-type-badge badge-blue" style={{ width: '100%', justifyContent: 'center', padding: '8px' }}>
                                    <i className="fas fa-stopwatch"></i> فترة سماح: {s.gracePeriodMinutes} دقيقة
                                </div>
                            </div>
                            <div style={{ padding: '16px 24px', background: 'rgba(0,0,0,0.02)', borderTop: '1px solid var(--shf-border)', display: 'flex', gap: '12px' }}>
                                <button className="shf-btn-premium shf-btn-outline" style={{ flex: 1, padding: '8px' }} onClick={() => handleOpenModal(s)}><i className="fas fa-edit"></i> تعديل</button>
                                <button className="shf-btn-premium" style={{ flex: 1, padding: '8px', background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)' }} onClick={() => handleDelete(s.id)}><i className="fas fa-trash-alt"></i> حذف</button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {showModal && (
                <ModalContainer>
                    <div className="shf-modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="shf-modal" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
                            <div className="shf-modal-header">
                                <h3>{editingShift ? 'تعديل الوردية' : 'إضافة وردية جديدة'}</h3>
                                <button className="shf-modal-close" onClick={() => setShowModal(false)}>✕</button>
                            </div>
                            <div className="shf-modal-body">
                                <form id="shfForm" onSubmit={handleSubmit}>
                                    <div className="shf-form-group">
                                        <label>اسم الوردية *</label>
                                        <input className="shf-input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="مثال: وردية الصباح" />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                                        <div className="shf-form-group">
                                            <label>من (وقت الحضور) *</label>
                                            <input className="shf-input" type="time" required value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                                        </div>
                                        <div className="shf-form-group">
                                            <label>إلى (وقت الانصراف) *</label>
                                            <input className="shf-input" type="time" required value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="shf-form-group" style={{ marginTop: '20px' }}>
                                        <label>فترة السماح (بالدقائق) *</label>
                                        <input className="shf-input" type="number" required value={formData.gracePeriodMinutes} onChange={e => setFormData({...formData, gracePeriodMinutes: parseInt(e.target.value)})} />
                                    </div>
                                </form>
                            </div>
                            <div className="shf-modal-footer">
                                <button type="button" className="shf-btn-ghost" onClick={() => setShowModal(false)}>إلغاء</button>
                                <button type="submit" form="shfForm" className="shf-btn-primary">حفظ الوردية</button>
                            </div>
                        </div>
                    </div>
                </ModalContainer>
            )}
        </div>
    );
};

export default ShiftsManagement;
