import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const CostCenterSetup = () => {
    const [costCenters, setCostCenters] = useState([]);
    const [formData, setFormData] = useState({ name: '', code: '', description: '' });

    useEffect(() => {
        fetchCostCenters();
    }, []);

    const fetchCostCenters = async () => {
        try {
            const response = await api.get('/manufacturing/cost-centers');
            const ccData = Array.isArray(response) ? response : (response?.data || []);
            setCostCenters(ccData);
        } catch (error) {
            console.error('Error fetching cost centers', error);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await api.post('/manufacturing/cost-centers', formData);
            fetchCostCenters();
            setFormData({ name: '', code: '', description: '' });
        } catch (error) {
            console.error('Error saving cost center', error);
        }
    };

    return (
        <div className="page-section">
            <div className="card mb-4">
                <div className="card-header">
                    <h3><i className="fa-solid fa-plus"></i> إضافة مركز تكلفة</h3>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSave}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>الرمز (Code)</label>
                                <input className="form-control" type="text" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)' }} />
                            </div>
                            <div>
                                <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>الاسم (Name)</label>
                                <input className="form-control" type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)' }} />
                            </div>
                            <div>
                                <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>الوصف (Description)</label>
                                <input className="form-control" type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)' }} />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px', borderRadius: '8px' }}>حفظ مركز التكلفة</button>
                    </form>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3><i className="fa-solid fa-industry"></i> مراكز التكلفة</h3>
                </div>
                <div className="card-body no-padding">
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>الرمز</th>
                                    <th>الاسم</th>
                                    <th>الوصف</th>
                                </tr>
                            </thead>
                            <tbody>
                                {costCenters.map(cc => (
                                    <tr key={cc.id}>
                                        <td><code style={{ color: 'var(--text-muted)' }}>{cc.code}</code></td>
                                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cc.name}</td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{cc.description || '—'}</td>
                                    </tr>
                                ))}
                                {costCenters.length === 0 && (
                                    <tr>
                                        <td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>لا يوجد مراكز تكلفة مضافة بعد.</td>
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

export default CostCenterSetup;
