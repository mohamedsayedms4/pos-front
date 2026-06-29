import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const BomManagement = () => {
    const [boms, setBoms] = useState([]);
    const [products, setProducts] = useState([]);
    const [formData, setFormData] = useState({ name: '', finishedProductId: '', quantity: 1, items: [] });
    const [newItem, setNewItem] = useState({ rawMaterialId: '', quantity: '' });

    useEffect(() => {
        fetchBoms();
        fetchProducts();
    }, []);

    const fetchBoms = async () => {
        try {
            const response = await api.get('/manufacturing/boms');
            setBoms(response.data);
        } catch (error) {
            console.error('Error fetching BOMs', error);
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await api.get('/inventory/products');
            setProducts(response.data.items || response.data);
        } catch (error) {
            console.error('Error fetching products', error);
        }
    };

    const addItem = () => {
        if (newItem.rawMaterialId && newItem.quantity) {
            setFormData({ ...formData, items: [...formData.items, newItem] });
            setNewItem({ rawMaterialId: '', quantity: '' });
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await api.post('/manufacturing/boms', formData);
            fetchBoms();
            setFormData({ name: '', finishedProductId: '', quantity: 1, items: [] });
        } catch (error) {
            console.error('Error saving BOM', error);
        }
    };

    const getProductName = (id) => {
        const productArray = Array.isArray(products) ? products : (products.items || []);
        const prod = productArray.find(p => p.id === parseInt(id));
        return prod ? prod.name : `ID: ${id}`;
    };

    return (
        <div className="page-section">
            <div className="card mb-4">
                <div className="card-header">
                    <h3>➕ إنشاء قائمة مواد (BOM)</h3>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSave}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                            <div>
                                <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>اسم القائمة</label>
                                <input className="form-control" type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)' }} />
                            </div>
                            <div>
                                <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>المنتج النهائي</label>
                                <select className="form-control" value={formData.finishedProductId} onChange={(e) => setFormData({...formData, finishedProductId: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)' }}>
                                    <option value="">اختر المنتج...</option>
                                    {(Array.isArray(products) ? products : []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>الكمية الأساسية (للإنتاج)</label>
                                <input className="form-control" type="number" min="1" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)' }} />
                            </div>
                        </div>

                        <div style={{ padding: '15px', background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: '8px', marginBottom: '20px' }}>
                            <h5 style={{ marginBottom: '15px', color: 'var(--text-primary)' }}>المواد الخام المطلوبة</h5>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                <div style={{ flex: '1', minWidth: '200px' }}>
                                    <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>المادة الخام</label>
                                    <select className="form-control" value={newItem.rawMaterialId} onChange={(e) => setNewItem({...newItem, rawMaterialId: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-body)', color: 'var(--text-primary)' }}>
                                        <option value="">اختر المادة الخام...</option>
                                        {(Array.isArray(products) ? products : []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div style={{ flex: '1', minWidth: '150px' }}>
                                    <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>الكمية المطلوبة</label>
                                    <input className="form-control" type="number" placeholder="الكمية المطلوبة" value={newItem.quantity} onChange={(e) => setNewItem({...newItem, quantity: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-body)', color: 'var(--text-primary)' }} />
                                </div>
                                <div>
                                    <button type="button" className="btn btn-secondary" onClick={addItem} style={{ padding: '8px 15px', borderRadius: '6px' }}>إضافة</button>
                                </div>
                            </div>

                            {formData.items.length > 0 && (
                                <div style={{ marginTop: '15px' }}>
                                    <table className="data-table" style={{ marginTop: '10px' }}>
                                        <thead>
                                            <tr>
                                                <th>المادة الخام</th>
                                                <th>الكمية</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {formData.items.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td>{getProductName(item.rawMaterialId)}</td>
                                                    <td>{item.quantity}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px', borderRadius: '8px' }}>حفظ القائمة</button>
                    </form>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>📋 قوائم المواد (BOMs)</h3>
                </div>
                <div className="card-body no-padding">
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>اسم القائمة</th>
                                    <th>المنتج النهائي</th>
                                    <th>الكمية المنتجة</th>
                                    <th>عدد المواد المكونة</th>
                                    <th>الحالة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {boms.map(bom => (
                                    <tr key={bom.id}>
                                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{bom.name}</td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{bom.finishedProduct?.name || '—'}</td>
                                        <td>{bom.quantity || 1}</td>
                                        <td>
                                            <span className="badge badge-info" style={{ borderRadius: '4px' }}>
                                                {bom.items?.length || 0}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${bom.active ? 'badge-success' : 'badge-secondary'}`}>
                                                {bom.active ? 'فعال' : 'غير فعال'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {boms.length === 0 && (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>لا يوجد قوائم مواد مضافة بعد.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BomManagement;
