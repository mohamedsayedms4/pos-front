import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const WorkstationSetup = () => {
    const [workstations, setWorkstations] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [formData, setFormData] = useState({ name: '', code: '', costCenterId: '', standardHourlyCost: 0 });

    useEffect(() => {
        fetchWorkstations();
        fetchCostCenters();
    }, []);

    const fetchWorkstations = async () => {
        try {
            const response = await api.get('/manufacturing/workstations');
            setWorkstations(response.data);
        } catch (error) {
            console.error('Error fetching workstations', error);
        }
    };

    const fetchCostCenters = async () => {
        try {
            const response = await api.get('/manufacturing/cost-centers');
            setCostCenters(response.data);
        } catch (error) {
            console.error('Error fetching cost centers', error);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await api.post('/manufacturing/workstations', formData);
            fetchWorkstations();
            setFormData({ name: '', code: '', costCenterId: '', standardHourlyCost: 0 });
        } catch (error) {
            console.error('Error saving workstation', error);
        }
    };

    return (
        <div className="page-section">
            <div className="card mb-4">
                <div className="card-header">
                    <h3>➕ إضافة محطة عمل</h3>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSave}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>الرمز</label>
                                <input className="form-control" type="text" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)' }} />
                            </div>
                            <div>
                                <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>الاسم</label>
                                <input className="form-control" type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)' }} />
                            </div>
                            <div>
                                <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>مركز التكلفة التابع له</label>
                                <select className="form-control" value={formData.costCenterId} onChange={(e) => setFormData({...formData, costCenterId: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)' }}>
                                    <option value="">اختر مركز التكلفة...</option>
                                    {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>التكلفة المعيارية/ساعة</label>
                                <input className="form-control" type="number" step="0.01" value={formData.standardHourlyCost} onChange={(e) => setFormData({...formData, standardHourlyCost: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)' }} />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px', borderRadius: '8px' }}>حفظ محطة العمل</button>
                    </form>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>⚙️ محطات العمل والماكينات</h3>
                </div>
                <div className="card-body no-padding">
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>الرمز</th>
                                    <th>الاسم</th>
                                    <th>مركز التكلفة</th>
                                    <th>التكلفة/ساعة</th>
                                    <th>الحالة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {workstations.map(ws => (
                                    <tr key={ws.id}>
                                        <td><code style={{ color: 'var(--text-muted)' }}>{ws.code}</code></td>
                                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ws.name}</td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{ws.costCenter?.name || '—'}</td>
                                        <td style={{ fontWeight: 600 }}>{Number(ws.standardHourlyCost).toFixed(2)} ج.م</td>
                                        <td>
                                            <span className={`badge ${ws.active ? 'badge-success' : 'badge-danger'}`}>
                                                {ws.active ? 'نشط' : 'متوقف'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {workstations.length === 0 && (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>لا يوجد محطات عمل مضافة بعد.</td>
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

export default WorkstationSetup;
