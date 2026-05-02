import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import '../styles/pages/WarehousesPremium.css';

const Warehouses = () => {
    const { toast, confirm } = useGlobalUI();
    const [data, setData] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalType, setModalType] = useState(null); 
    const [activeWarehouse, setActiveWarehouse] = useState(null);
    const [saving, setSaving] = useState(false);
    
    const [stockSearch, setStockSearch] = useState('');
    const [stockProducts, setStockProducts] = useState([]);
    const [loadingStock, setLoadingStock] = useState(false);
    const [editingStock, setEditingStock] = useState(null);

    const [formData, setFormData] = useState({ name: '', code: '', branchId: '', isDefault: false, active: true });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [whRes, brRes] = await Promise.all([Api._request('/warehouses'), Api.getBranches()]);
            setData(whRes.data || whRes || []); setBranches(brRes || []);
        } catch (err) { toast(err.message, 'error'); }
        finally { setLoading(false); }
    };

    const openForm = (wh = null) => {
        setActiveWarehouse(wh);
        if (wh) setFormData({ name: wh.name || '', code: wh.code || '', branchId: wh.branchId || '', isDefault: wh.isDefault || false, active: wh.active ?? true });
        else setFormData({ name: '', code: '', branchId: branches[0]?.id || '', isDefault: false, active: true });
        setModalType('form');
    };

    const closeModal = () => { setModalType(null); setActiveWarehouse(null); };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const method = activeWarehouse ? 'PUT' : 'POST';
            const url = activeWarehouse ? `/warehouses/${activeWarehouse.id}` : '/warehouses';
            await Api._request(url, { method, body: JSON.stringify(formData) });
            toast('تم الحفظ', 'success'); closeModal(); loadData();
        } catch (err) { toast(err.message, 'error'); }
        finally { setSaving(false); }
    };

    const openStockModal = (wh) => { setActiveWarehouse(wh); setModalType('stock'); loadWarehouseStock(wh.id); };

    useEffect(() => {
        if (!activeWarehouse || modalType !== 'stock') return;
        const timer = setTimeout(() => loadWarehouseStock(activeWarehouse.id, stockSearch), 500);
        return () => clearTimeout(timer);
    }, [stockSearch]);

    const loadWarehouseStock = async (whId, search = '') => {
        setLoadingStock(true);
        try {
            const res = await Api.getWarehouseProducts(whId, 0, 50, search, 'id,desc');
            setStockProducts(res.items || []);
        } catch (err) { console.error(err); }
        finally { setLoadingStock(false); }
    };

    const handleUpdateStock = async (productId, quantity) => {
        try {
            await Api.updateWarehouseStock(activeWarehouse.id, productId, quantity);
            toast('تم تحديث المخزون', 'success'); loadWarehouseStock(activeWarehouse.id, stockSearch); setEditingStock(null);
        } catch (err) { toast(err.message, 'error'); }
    };

    return (
        <div className="warehouses-container">
            {/* 1. Header */}
            <div className="war-header-row">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="war-breadcrumbs">
                        <Link to="/dashboard">الرئيسية</Link> / <span>المخازن</span>
                    </div>
                    <h1>إدارة المستودعات والمخازن</h1>
                </div>
                <div className="war-header-actions">
                    <button className="war-btn-premium war-btn-blue" onClick={() => openForm()}>
                        <i className="fas fa-plus-circle"></i> إضافة مخزن جديد
                    </button>
                </div>
            </div>

            {/* 2. Stats Grid */}
            <div className="war-stats-grid">
                <div className="war-stat-card">
                    <div className="war-stat-info">
                        <h4>إجمالي المخازن</h4>
                        <div className="war-stat-value">{data.length}</div>
                    </div>
                    <div className="war-stat-visual"><div className="war-stat-icon icon-blue"><i className="fas fa-warehouse"></i></div></div>
                </div>
                <div className="war-stat-card">
                    <div className="war-stat-info">
                        <h4>مخازن افتراضية</h4>
                        <div className="war-stat-value" style={{ color: 'var(--war-accent-amber)' }}>{data.filter(w => w.isDefault).length}</div>
                    </div>
                    <div className="war-stat-visual"><div className="war-stat-icon icon-amber"><i className="fas fa-star"></i></div></div>
                </div>
                <div className="war-stat-card">
                    <div className="war-stat-info">
                        <h4>المنتجات المسجلة</h4>
                        <div className="war-stat-value" style={{ color: 'var(--war-accent-purple)' }}>{stockProducts.length}</div>
                    </div>
                    <div className="war-stat-visual"><div className="war-stat-icon icon-purple"><i className="fas fa-boxes"></i></div></div>
                </div>
                <div className="war-stat-card">
                    <div className="war-stat-info">
                        <h4>المخازن النشطة</h4>
                        <div className="war-stat-value" style={{ color: 'var(--war-accent-green)' }}>{data.filter(w => w.active).length}</div>
                    </div>
                    <div className="war-stat-visual"><div className="war-stat-icon icon-green"><i className="fas fa-check-double"></i></div></div>
                </div>
            </div>

            {/* 3. Table Card */}
            <div className="war-table-card">
                <div className="war-table-container">
                    {loading ? (
                        <div style={{ padding: '60px' }}><Loader message="جاري جلب بيانات المخازن..." /></div>
                    ) : data.length === 0 ? (
                        <div style={{ padding: '80px', textAlign: 'center', color: 'var(--war-text-secondary)' }}>
                            <i className="fas fa-box-open" style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}></i>
                            <h3>لا توجد مخازن مضافة حالياً</h3>
                        </div>
                    ) : (
                        <table className="war-table">
                            <thead>
                                <tr>
                                    <th>المخزن</th>
                                    <th>الفرع التابع له</th>
                                    <th>النوع</th>
                                    <th>الحالة</th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map(w => (
                                    <tr key={w.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--war-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}><i className="fas fa-cubes"></i></div>
                                                <div><div style={{ fontWeight: 800 }}>{w.name}</div><div style={{ fontSize: '0.7rem', color: 'var(--war-text-secondary)' }}>كود: {w.code}</div></div>
                                            </div>
                                        </td>
                                        <td>{w.branchName || branches.find(b => b.id === w.branchId)?.name || '—'}</td>
                                        <td>
                                            <span className={`war-type-badge ${w.isDefault ? 'badge-blue' : 'badge-ghost'}`}>
                                                {w.isDefault ? '⭐ افتراضي' : 'ثانوي'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`war-type-badge ${w.active ? 'badge-green' : 'badge-red'}`}>
                                                {w.active ? 'نشط ✓' : 'متوقف ✗'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="war-actions">
                                                <button className="war-action-btn" title="الجرد" onClick={() => openStockModal(w)}><i className="fas fa-boxes"></i></button>
                                                <button className="war-action-btn" title="تعديل" onClick={() => openForm(w)}><i className="fas fa-edit"></i></button>
                                                <button className="war-action-btn delete" onClick={() => confirm(`حذف مخزن ${w.name}؟`, () => Api._request(`/warehouses/${w.id}`, {method:'DELETE'}).then(loadData))}><i className="fas fa-trash"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {modalType === 'form' && (
                <ModalContainer>
                    <div className="war-modal-overlay" onClick={closeModal}>
                        <div className="war-modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                            <div className="war-modal-header">
                                <h3>{activeWarehouse ? 'تعديل بيانات المخزن' : 'إضافة مخزن جديد'}</h3>
                                <button className="war-modal-close" onClick={closeModal}>✕</button>
                            </div>
                            <div className="war-modal-body">
                                <form id="warForm" onSubmit={handleSave}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div className="war-form-group">
                                            <label>اسم المخزن *</label>
                                            <input className="war-input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                        </div>
                                        <div className="war-form-group">
                                            <label>كود المخزن *</label>
                                            <input className="war-input" required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="WH-01" />
                                        </div>
                                    </div>
                                    <div className="war-form-group" style={{ marginTop: '20px' }}>
                                        <label>الفرع التابع له *</label>
                                        <select className="war-input" required value={formData.branchId} onChange={e => setFormData({...formData, branchId: e.target.value})}>
                                            <option value="">-- اختر الفرع --</option>
                                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', gap: '30px', marginTop: '20px', background: 'rgba(99,102,241,0.05)', padding: '15px', borderRadius: '16px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={formData.isDefault} onChange={e => setFormData({...formData, isDefault: e.target.checked})} />
                                            <span>مخزن افتراضي لهذا الفرع</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} />
                                            <span>نشط ومتاح للاستخدام</span>
                                        </label>
                                    </div>
                                </form>
                            </div>
                            <div className="war-modal-footer">
                                <button type="button" className="war-btn-ghost" onClick={closeModal}>إلغاء</button>
                                <button type="submit" form="warForm" className="war-btn-primary" disabled={saving}>حفظ البيانات</button>
                            </div>
                        </div>
                    </div>
                </ModalContainer>
            )}

            {modalType === 'stock' && (
                <ModalContainer>
                    <div className="war-modal-overlay" onClick={closeModal}>
                        <div className="war-modal" style={{ maxWidth: '800px', width: '95%' }} onClick={e => e.stopPropagation()}>
                            <div className="war-modal-header">
                                <h3>📦 بضاعة مخزن: {activeWarehouse?.name}</h3>
                                <button className="war-modal-close" onClick={closeModal}>✕</button>
                            </div>
                            <div className="war-modal-body">
                                <div className="war-search-box" style={{ marginBottom: '20px' }}>
                                    <i className="fas fa-search"></i>
                                    <input className="war-input" placeholder="بحث عن منتج في هذا المخزن..." value={stockSearch} onChange={e => setStockSearch(e.target.value)} />
                                </div>
                                <div className="war-table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                    {loadingStock ? <Loader /> : (
                                        <table className="war-table">
                                            <thead><tr><th>المنتج</th><th>الكمية الحالية</th><th>تعديل</th></tr></thead>
                                            <tbody>
                                                {stockProducts.map(p => (
                                                    <tr key={p.id}>
                                                        <td style={{ fontWeight: 800 }}>{p.name}</td>
                                                        <td>
                                                            {editingStock?.productId === p.id ? (
                                                                <input type="number" className="war-input" style={{ width: '100px' }} defaultValue={p.stock} onBlur={(e) => handleUpdateStock(p.id, e.target.value)} autoFocus />
                                                            ) : (
                                                                <span style={{ fontWeight: 800, color: 'var(--war-accent-blue)' }}>{p.stock} {p.unitName}</span>
                                                            )}
                                                        </td>
                                                        <td><button className="war-action-btn" onClick={() => setEditingStock({ productId: p.id, quantity: p.stock })}><i className="fas fa-edit"></i></button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                            <div className="war-modal-footer">
                                <button className="war-btn-primary" onClick={closeModal}>إغلاق النافذة</button>
                            </div>
                        </div>
                    </div>
                </ModalContainer>
            )}
        </div>
    );
};

export default Warehouses;
