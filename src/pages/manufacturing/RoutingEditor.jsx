import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const RoutingEditor = () => {
    const [boms, setBoms] = useState([]);
    const [workstations, setWorkstations] = useState([]);
    const [selectedBomId, setSelectedBomId] = useState('');
    const [routingData, setRoutingData] = useState([]);
    const [newRoute, setNewRoute] = useState({ sequenceNumber: '', workstationId: '', estimatedTimeInMinutes: '', description: '' });

    useEffect(() => {
        fetchBoms();
        fetchWorkstations();
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

    const fetchWorkstations = async () => {
        try {
            const response = await api.get('/manufacturing/workstations');
            const wsData = Array.isArray(response) ? response : (response?.data || []);
            setWorkstations(wsData);
        } catch (error) {
            console.error('Error fetching workstations', error);
        }
    };

    const handleAddRoute = () => {
        if (newRoute.sequenceNumber && newRoute.workstationId && newRoute.estimatedTimeInMinutes) {
            setRoutingData([...routingData, newRoute].sort((a, b) => parseInt(a.sequenceNumber) - parseInt(b.sequenceNumber)));
            setNewRoute({ sequenceNumber: '', workstationId: '', estimatedTimeInMinutes: '', description: '' });
        }
    };

    const saveRouting = async () => {
        if (!selectedBomId) return alert('اختر قائمة مواد أولاً');
        try {
            await api.post(`/manufacturing/boms/${selectedBomId}/routing`, { operations: routingData });
            alert('تم حفظ مسار التصنيع بنجاح!');
        } catch (error) {
            console.error('Error saving routing', error);
        }
    };

    const getWorkstationName = (id) => {
        const ws = workstations.find(w => w.id === parseInt(id));
        return ws ? ws.name : `ID: ${id}`;
    };

    return (
        <div className="page-section">
            <div className="card mb-4">
                <div className="card-header">
                    <h3>🛤️ محرر مسارات التصنيع (Routing)</h3>
                </div>
                <div className="card-body">
                    <div style={{ marginBottom: '20px' }}>
                        <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>اختر قائمة المواد (BOM) لتعديل مسارها</label>
                        <select className="form-control" value={selectedBomId} onChange={(e) => setSelectedBomId(e.target.value)} style={{ width: '100%', maxWidth: '400px', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)' }}>
                            <option value="">اختر القائمة...</option>
                            {boms.map(bom => <option key={bom.id} value={bom.id}>{bom.name} ({bom.finishedProduct?.name})</option>)}
                        </select>
                    </div>

                    {selectedBomId && (
                        <>
                            <div style={{ padding: '15px', background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: '8px', marginBottom: '20px' }}>
                                <h5 style={{ marginBottom: '15px', color: 'var(--text-primary)' }}>إضافة خطوة تصنيع جديدة</h5>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                                    <div>
                                        <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>الترتيب (Seq)</label>
                                        <input className="form-control" type="number" placeholder="مثال: 10" value={newRoute.sequenceNumber} onChange={(e) => setNewRoute({...newRoute, sequenceNumber: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-body)', color: 'var(--text-primary)' }} />
                                    </div>
                                    <div>
                                        <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>محطة العمل</label>
                                        <select className="form-control" value={newRoute.workstationId} onChange={(e) => setNewRoute({...newRoute, workstationId: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-body)', color: 'var(--text-primary)' }}>
                                            <option value="">اختر...</option>
                                            {workstations.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>الوقت المقدر (دقائق)</label>
                                        <input className="form-control" type="number" value={newRoute.estimatedTimeInMinutes} onChange={(e) => setNewRoute({...newRoute, estimatedTimeInMinutes: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-body)', color: 'var(--text-primary)' }} />
                                    </div>
                                    <div>
                                        <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>وصف العملية</label>
                                        <input className="form-control" type="text" value={newRoute.description} onChange={(e) => setNewRoute({...newRoute, description: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-body)', color: 'var(--text-primary)' }} />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                        <button type="button" className="btn btn-secondary" onClick={handleAddRoute} style={{ width: '100%', padding: '8px', borderRadius: '6px' }}>إضافة الخطوة</button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {selectedBomId && (
                <div className="card">
                    <div className="card-header">
                        <h3>📋 مسار التصنيع للقائمة المحددة</h3>
                    </div>
                    <div className="card-body no-padding">
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '80px' }}>الترتيب</th>
                                        <th>محطة العمل</th>
                                        <th>الوقت المقدر</th>
                                        <th>الوصف</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {routingData.map((route, idx) => (
                                        <tr key={idx}>
                                            <td style={{ fontWeight: 600 }}>{route.sequenceNumber}</td>
                                            <td>{getWorkstationName(route.workstationId)}</td>
                                            <td>{route.estimatedTimeInMinutes} دقيقة</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{route.description || '—'}</td>
                                        </tr>
                                    ))}
                                    {routingData.length === 0 && (
                                        <tr>
                                            <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>لم يتم إضافة أي خطوات مسار بعد.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {routingData.length > 0 && (
                            <div style={{ padding: '15px' }}>
                                <button type="button" className="btn btn-primary" onClick={saveRouting} style={{ padding: '10px 20px', borderRadius: '8px' }}>
                                    حفظ واعتماد مسار التصنيع
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoutingEditor;
