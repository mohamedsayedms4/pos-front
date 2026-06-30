import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const QualityControlBoard = () => {
    const [inspections, setInspections] = useState([]);
    const [orders, setOrders] = useState([]);
    const [formData, setFormData] = useState({ 
        productionOrderId: '', 
        inspectedQuantity: '', 
        passedQuantity: '', 
        failedQuantity: '', 
        reworkedQuantity: '',
        inspectorNotes: '' 
    });

    useEffect(() => {
        fetchInspections();
        fetchOrders();
    }, []);

    const fetchInspections = async () => {
        try {
            const response = await api.get('/manufacturing/quality?tenantId=1');
            const insData = Array.isArray(response) ? response : (response?.data || []);
            setInspections(insData);
        } catch (error) {
            console.error('Error fetching quality inspections', error);
        }
    };

    const fetchOrders = async () => {
        try {
            const response = await api.get('/manufacturing/production-orders?tenantId=1');
            const ordersData = Array.isArray(response) ? response : (response?.data || []);
            setOrders(ordersData.filter(o => o.status !== 'PLANNED'));
        } catch (error) {
            console.error('Error fetching production orders', error);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                productionOrder: { id: parseInt(formData.productionOrderId) },
                status: (parseFloat(formData.failedQuantity) > 0) ? 'FAILED' : 'PASSED'
            };
            await api.post('/manufacturing/quality', payload);
            fetchInspections();
            setFormData({ productionOrderId: '', inspectedQuantity: '', passedQuantity: '', failedQuantity: '', reworkedQuantity: '', inspectorNotes: '' });
        } catch (error) {
            console.error('Error saving inspection', error);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PENDING': return <span className="badge badge-warning text-dark">قيد الانتظار</span>;
            case 'PASSED': return <span className="badge badge-success">مجتاز</span>;
            case 'FAILED': return <span className="badge badge-danger">مرفوض</span>;
            case 'PARTIAL_PASS': return <span className="badge badge-info">مجتاز جزئياً</span>;
            default: return <span className="badge badge-secondary">{status}</span>;
        }
    };

    return (
        <div className="page-section">
            <div className="card mb-4">
                <div className="card-header">
                    <h3>🔍 تسجيل فحص جودة جديد</h3>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSave}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                            <div style={{ gridColumn: '1 / -1', maxWidth: '400px' }}>
                                <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>أمر الإنتاج</label>
                                <select className="form-control" value={formData.productionOrderId} onChange={(e) => setFormData({...formData, productionOrderId: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)' }}>
                                    <option value="">اختر أمر الإنتاج...</option>
                                    {orders.map(o => <option key={o.id} value={o.id}>{o.orderNumber} ({o.finishedProduct?.name})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>الكمية المفحوصة</label>
                                <input className="form-control" type="number" step="any" value={formData.inspectedQuantity} onChange={(e) => setFormData({...formData, inspectedQuantity: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)' }} />
                            </div>
                            <div>
                                <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>الكمية السليمة</label>
                                <input className="form-control" type="number" step="any" value={formData.passedQuantity} onChange={(e) => setFormData({...formData, passedQuantity: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)' }} />
                            </div>
                            <div>
                                <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>الكمية التالفة</label>
                                <input className="form-control" type="number" step="any" value={formData.failedQuantity} onChange={(e) => setFormData({...formData, failedQuantity: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)' }} />
                            </div>
                            <div>
                                <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>الكمية المعاد تصنيعها</label>
                                <input className="form-control" type="number" step="any" value={formData.reworkedQuantity} onChange={(e) => setFormData({...formData, reworkedQuantity: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)' }} />
                            </div>
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>ملاحظات المفتش</label>
                            <textarea className="form-control" rows={2} value={formData.inspectorNotes} onChange={(e) => setFormData({...formData, inspectorNotes: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)' }}></textarea>
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px', borderRadius: '8px' }}>حفظ نتيجة الفحص</button>
                    </form>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>📋 سجل فحوصات الجودة</h3>
                </div>
                <div className="card-body no-padding">
                    <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>أمر الإنتاج</th>
                                    <th>المنتج</th>
                                    <th>الكمية المفحوصة</th>
                                    <th>سليم / تالف</th>
                                    <th>النتيجة</th>
                                    <th>الملاحظات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {inspections.map(insp => (
                                    <tr key={insp.id}>
                                        <td><code style={{ color: 'var(--text-muted)' }}>{insp.productionOrder?.orderNumber}</code></td>
                                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{insp.productionOrder?.finishedProduct?.name}</td>
                                        <td>{insp.inspectedQuantity}</td>
                                        <td>
                                            <span style={{ color: 'var(--metro-green)', fontWeight: 'bold' }}>{insp.passedQuantity}</span> / <span style={{ color: 'var(--metro-red)', fontWeight: 'bold' }}>{insp.failedQuantity}</span>
                                        </td>
                                        <td>{getStatusBadge(insp.status)}</td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{insp.inspectorNotes || '—'}</td>
                                    </tr>
                                ))}
                                {inspections.length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>لا توجد فحوصات مسجلة بعد.</td>
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

export default QualityControlBoard;
