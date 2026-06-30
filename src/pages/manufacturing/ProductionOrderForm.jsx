import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const ProductionOrderForm = () => {
    const navigate = useNavigate();
    const [boms, setBoms] = useState([]);
    const [formData, setFormData] = useState({ orderNumber: '', bomId: '', plannedQuantity: 1, plannedStartDate: '' });

    useEffect(() => {
        fetchBoms();
    }, []);

    const fetchBoms = async () => {
        try {
            const response = await api.get('/manufacturing/boms');
            const bomsData = Array.isArray(response) ? response : (response?.data || []);
            setBoms(bomsData);
        } catch (error) {
            console.error('Error fetching BOMs', error);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const selectedBom = boms.find(b => b.id === parseInt(formData.bomId));
            if (!selectedBom) return alert('الرجاء اختيار قائمة المواد');

            const orderData = {
                ...formData,
                finishedProduct: { id: selectedBom.finishedProduct?.id },
                billOfMaterial: { id: selectedBom.id }
            };

            await api.post('/manufacturing/production-orders', orderData);
            navigate('/manufacturing/production-orders');
        } catch (error) {
            console.error('Error saving production order', error);
        }
    };

    return (
        <div className="page-section d-flex align-items-center justify-content-center" style={{ minHeight: 'calc(100vh - 100px)' }}>
            <div className="card" style={{ maxWidth: '600px', width: '100%', margin: '0 auto' }}>
                <div className="card-header" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '15px' }}>
                    <h3>➕ إنشاء أمر إنتاج جديد</h3>
                </div>
                <div className="card-body" style={{ padding: '25px' }}>
                    <form onSubmit={handleSave}>
                        <div style={{ marginBottom: '20px' }}>
                            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>رقم الأمر (Order Number)</label>
                            <input className="form-control" type="text" value={formData.orderNumber} onChange={(e) => setFormData({...formData, orderNumber: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)' }} />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>قائمة المواد (BOM)</label>
                            <select className="form-control" value={formData.bomId} onChange={(e) => setFormData({...formData, bomId: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)' }}>
                                <option value="">اختر القائمة...</option>
                                {boms.map(bom => <option key={bom.id} value={bom.id}>{bom.name} ({bom.finishedProduct?.name})</option>)}
                            </select>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>الكمية المخططة</label>
                            <input className="form-control" type="number" min="1" step="any" value={formData.plannedQuantity} onChange={(e) => setFormData({...formData, plannedQuantity: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)' }} />
                        </div>

                        <div style={{ marginBottom: '30px' }}>
                            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>تاريخ البدء المخطط</label>
                            <input className="form-control" type="datetime-local" value={formData.plannedStartDate} onChange={(e) => setFormData({...formData, plannedStartDate: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)' }} />
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="button" className="btn btn-secondary" style={{ flex: '1', padding: '12px', borderRadius: '8px' }} onClick={() => navigate(-1)}>إلغاء</button>
                            <button type="submit" className="btn btn-primary" style={{ flex: '2', padding: '12px', borderRadius: '8px' }}>حفظ وإنشاء الأمر</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProductionOrderForm;
