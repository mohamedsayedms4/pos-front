import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const ProductionCostReport = () => {
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const response = await api.get('/manufacturing/production-orders?tenantId=1');
            setOrders(response.data.filter(o => o.status === 'COMPLETED'));
        } catch (error) {
            console.error('Error fetching production orders', error);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount || 0);
    };

    return (
        <div className="page-section">
            <div className="card">
                <div className="card-header">
                    <h3>💰 تقرير تكاليف التصنيع</h3>
                </div>
                
                <div style={{ padding: '15px 20px', background: 'rgba(var(--metro-blue-rgb), 0.05)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    يقارن هذا التقرير بين التكلفة المعيارية (المخططة) والتكلفة الفعلية لأوامر الإنتاج المكتملة، ويحسب نسبة الانحراف.
                    <br />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <strong>ملاحظة:</strong> الانحراف الإيجابي (لون أحمر) يعني أن التكلفة الفعلية تخطت المعيارية (خسارة/تجاوز)، والانحراف السلبي (لون أخضر) يعني توفير في التكلفة.
                    </span>
                </div>

                <div className="card-body no-padding">
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr style={{ background: 'var(--bg-panel)', borderBottom: '2px solid var(--border-subtle)' }}>
                                    <th rowSpan={2} style={{ verticalAlign: 'middle', borderLeft: '1px solid var(--border-subtle)' }}>رقم الأمر</th>
                                    <th rowSpan={2} style={{ verticalAlign: 'middle', borderLeft: '1px solid var(--border-subtle)' }}>المنتج النهائي</th>
                                    <th colSpan={3} style={{ textAlign: 'center', borderBottom: '1px solid var(--border-subtle)', borderLeft: '1px solid var(--border-subtle)' }}>تكلفة المواد (Material Cost)</th>
                                    <th colSpan={3} style={{ textAlign: 'center', borderBottom: '1px solid var(--border-subtle)' }}>تكلفة التشغيل (Operational Cost)</th>
                                </tr>
                                <tr style={{ background: 'var(--bg-body)' }}>
                                    <th style={{ textAlign: 'center' }}>معيارية</th>
                                    <th style={{ textAlign: 'center' }}>فعلية</th>
                                    <th style={{ textAlign: 'center', borderLeft: '1px solid var(--border-subtle)' }}>الانحراف</th>
                                    <th style={{ textAlign: 'center' }}>معيارية</th>
                                    <th style={{ textAlign: 'center' }}>فعلية</th>
                                    <th style={{ textAlign: 'center' }}>الانحراف</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map(order => {
                                    const matVariance = order.materialCostVariance;
                                    const opVariance = order.operationalCostVariance;
                                    
                                    return (
                                        <tr key={order.id} style={{ textAlign: 'center' }}>
                                            <td style={{ borderLeft: '1px solid var(--border-subtle)' }}><code style={{ color: 'var(--text-muted)' }}>{order.orderNumber}</code></td>
                                            <td style={{ fontWeight: 600, color: 'var(--text-primary)', borderLeft: '1px solid var(--border-subtle)' }}>{order.finishedProduct?.name}</td>
                                            
                                            {/* Materials */}
                                            <td>{formatCurrency(order.standardMaterialCost)}</td>
                                            <td>{formatCurrency(order.actualMaterialCost)}</td>
                                            <td style={{ 
                                                fontWeight: 600, 
                                                color: matVariance > 0 ? 'var(--metro-red)' : matVariance < 0 ? 'var(--metro-green)' : 'inherit',
                                                borderLeft: '1px solid var(--border-subtle)'
                                            }}>
                                                {formatCurrency(matVariance)}
                                            </td>
                                            
                                            {/* Operational */}
                                            <td>{formatCurrency(order.standardOperationalCost)}</td>
                                            <td>{formatCurrency(order.actualOperationalCost)}</td>
                                            <td style={{ 
                                                fontWeight: 600, 
                                                color: opVariance > 0 ? 'var(--metro-red)' : opVariance < 0 ? 'var(--metro-green)' : 'inherit'
                                            }}>
                                                {formatCurrency(opVariance)}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {orders.length === 0 && (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>لا توجد أوامر إنتاج مكتملة لعرض تقرير التكاليف.</td>
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

export default ProductionCostReport;
