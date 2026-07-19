import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const MrpDashboard = () => {
    const [requirements, setRequirements] = useState({});
    const [products, setProducts] = useState([]);

    useEffect(() => {
        fetchRequirements();
        fetchProducts();
    }, []);

    const fetchRequirements = async () => {
        try {
            const response = await api.get('/manufacturing/mrp/requirements?tenantId=1'); 
            const reqsData = Array.isArray(response) ? response : (response?.data || []);
            setRequirements(reqsData);
        } catch (error) {
            console.error('Error fetching MRP requirements', error);
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

    const getProductName = (id) => {
        const productArray = Array.isArray(products) ? products : (products.items || []);
        const prod = productArray.find(p => p.id === parseInt(id));
        return prod ? prod.name : `ID: ${id}`;
    };

    const createPurchaseRequest = (productId, qty) => {
        alert(`تم إرسال طلب شراء للمادة ${getProductName(productId)} بكمية ${qty}`);
    };

    return (
        <div className="page-section">
            <div className="card">
                <div className="card-header">
                    <h3><i className="fa-solid fa-chart-column"></i> تخطيط الاحتياجات (MRP)</h3>
                    <div className="toolbar">
                        <button type="button" className="btn btn-secondary" onClick={fetchRequirements}>
                            <i className="fa-solid fa-rotate"></i> تحديث البيانات
                        </button>
                    </div>
                </div>
                
                <div style={{ padding: '15px 20px', background: 'rgba(0, 0, 0, 0.02)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    يعرض هذا التقرير المواد الخام المطلوبة لأوامر الإنتاج <b>المجدولة</b> التي لم تبدأ بعد.
                </div>

                <div className="card-body no-padding">
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>المادة الخام (Raw Material)</th>
                                    <th>الكمية الإجمالية المطلوبة</th>
                                    <th>الرصيد المتاح (Inventory)</th>
                                    <th>العجز المتوقع</th>
                                    <th style={{ textAlign: 'center' }}>إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(requirements).map(([productId, requiredQty]) => {
                                    const availableStock = 0; // Should fetch from inventory, mocking for now
                                    const shortage = requiredQty > availableStock ? requiredQty - availableStock : 0;
                                    
                                    return (
                                        <tr key={productId} style={{ background: shortage > 0 ? 'rgba(var(--metro-red-rgb), 0.05)' : 'inherit' }}>
                                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{getProductName(productId)}</td>
                                            <td>{requiredQty}</td>
                                            <td>{availableStock}</td>
                                            <td style={{ fontWeight: 600, color: shortage > 0 ? 'var(--metro-red)' : 'inherit' }}>
                                                {shortage > 0 ? shortage : 0}
                                            </td>
                                            <td>
                                                <div className="table-actions" style={{ justifyContent: 'center' }}>
                                                    {shortage > 0 && (
                                                        <button type="button" className="btn btn-primary btn-sm" onClick={() => createPurchaseRequest(productId, shortage)}>
                                                            إنشاء طلب شراء
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {Object.keys(requirements).length === 0 && (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>لا توجد مواد مطلوبة حالياً. تأكد من وجود أوامر إنتاج مجدولة.</td>
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

export default MrpDashboard;
