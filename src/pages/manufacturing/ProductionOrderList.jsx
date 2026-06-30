import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const ProductionOrderList = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const response = await api.get('/manufacturing/production-orders');
            const ordersData = Array.isArray(response) ? response : (response?.data || []);
            setOrders(ordersData);
        } catch (error) {
            console.error('Error fetching production orders', error);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PLANNED': return <span className="badge badge-secondary">مجدول</span>;
            case 'IN_PROGRESS': return <span className="badge badge-info">قيد التنفيذ</span>;
            case 'COMPLETED': return <span className="badge badge-success">مكتمل</span>;
            case 'CANCELLED': return <span className="badge badge-danger">ملغي</span>;
            default: return <span className="badge badge-secondary">{status}</span>;
        }
    };

    const startOrder = async (id) => {
        try {
            await api.post(`/manufacturing/production-orders/${id}/start`);
            fetchOrders();
        } catch (error) {
            console.error('Error starting order', error);
        }
    };

    const completeOrder = async (id) => {
        const producedQuantity = prompt("أدخل الكمية المنتجة فعلياً:");
        if (producedQuantity) {
            try {
                await api.post(`/manufacturing/production-orders/${id}/complete?producedQuantity=${producedQuantity}`);
                fetchOrders();
            } catch (error) {
                console.error('Error completing order', error);
            }
        }
    };

    return (
        <div className="page-section">
            <div className="card">
                <div className="card-header">
                    <h3>🏭 أوامر الإنتاج</h3>
                    <div className="toolbar">
                        <div className="toolbar-actions">
                            <button className="btn btn-primary" onClick={() => navigate('/manufacturing/production-orders/new')}>
                                <span>+</span> أمر إنتاج جديد
                            </button>
                        </div>
                    </div>
                </div>
                <div className="card-body no-padding">
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>رقم الأمر</th>
                                    <th>المنتج النهائي</th>
                                    <th>الكمية المخططة</th>
                                    <th>الكمية المنتجة</th>
                                    <th>الحالة</th>
                                    <th style={{ textAlign: 'center' }}>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map(order => (
                                    <tr key={order.id}>
                                        <td><code style={{ color: 'var(--text-muted)' }}>{order.orderNumber}</code></td>
                                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{order.finishedProduct?.name}</td>
                                        <td>{order.plannedQuantity}</td>
                                        <td style={{ fontWeight: 600, color: order.producedQuantity > 0 ? 'var(--metro-green)' : 'inherit' }}>
                                            {order.producedQuantity || '-'}
                                        </td>
                                        <td>{getStatusBadge(order.status)}</td>
                                        <td>
                                            <div className="table-actions" style={{ justifyContent: 'center' }}>
                                                {order.status === 'PLANNED' && (
                                                    <button className="btn btn-icon btn-ghost" onClick={() => startOrder(order.id)} title="بدء الإنتاج">
                                                        ▶️
                                                    </button>
                                                )}
                                                {order.status === 'IN_PROGRESS' && (
                                                    <button className="btn btn-icon btn-ghost" onClick={() => completeOrder(order.id)} title="إكمال الإنتاج">
                                                        ✅
                                                    </button>
                                                )}
                                                <button className="btn btn-icon btn-ghost" onClick={() => navigate(`/manufacturing/production-orders/${order.id}/cost-report`)} title="تقرير التكلفة">
                                                    📊
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {orders.length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>لا يوجد أوامر إنتاج مسجلة.</td>
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

export default ProductionOrderList;
