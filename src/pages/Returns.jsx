import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import Loader from '../components/common/Loader';
import ReactDOM from 'react-dom';
import { useGlobalUI } from '../components/common/GlobalUI';

const Returns = () => {
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeReturn, setActiveReturn] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const { toast } = useGlobalUI();

    useEffect(() => {
        loadReturns();
    }, []);

    const loadReturns = async () => {
        setLoading(true);
        try {
            const data = await Api.getReturns(0, 50);
            setReturns(data.items || data.content || []);
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const openDetails = (ret) => {
        setActiveReturn(ret);
        setShowDetails(true);
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="header-title">
                    <span className="header-icon">🔄</span>
                    <h1>سجل مرتجعات المبيعات</h1>
                </div>
            </div>

            <div className="card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>رقم المرتجع</th>
                            <th>التاريخ</th>
                            <th>رقم الفاتورة</th>
                            <th>المبلغ المسترد</th>
                            <th>ملاحظات</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6"><Loader message="جاري تحميل المرتجعات..." /></td></tr>
                        ) : returns.length === 0 ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center' }}>لا يوجد عمليات مرتجع مبيعات</td></tr>
                        ) : returns.map(r => (
                            <tr key={r.id}>
                                <td><strong>{r.returnNumber}</strong></td>
                                <td>{new Date(r.returnDate).toLocaleString('ar-EG')}</td>
                                <td>{r.invoiceNumber}</td>
                                <td className="text-danger">{(r.totalRefund || 0).toFixed(2)}</td>
                                <td>{r.notes}</td>
                                <td>
                                    <button className="btn btn-secondary btn-sm" onClick={() => openDetails(r)}>التفاصيل</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Details Modal */}
            {showDetails && activeReturn && ReactDOM.createPortal(
                <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setShowDetails(false); }}>
                    <div className="modal">
                        <div className="modal-header">
                            <h2>تفاصيل المرتجع: {activeReturn.returnNumber}</h2>
                            <button onClick={() => setShowDetails(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="invoice-summary mb-4">
                                <p><strong>رقم الفاتورة:</strong> {activeReturn.invoiceNumber}</p>
                                <p><strong>التاريخ:</strong> {new Date(activeReturn.returnDate).toLocaleString('ar-EG')}</p>
                                <p><strong>الملاحظات:</strong> {activeReturn.notes}</p>
                            </div>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>الصنف</th>
                                        <th>الكمية المُرجعة</th>
                                        <th>السعر</th>
                                        <th>إجمالي المرتجع</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeReturn.items && activeReturn.items.map(item => (
                                        <tr key={item.id}>
                                            <td>{item.productName}</td>
                                            <td>{item.quantity} {item.unitName}</td>
                                            <td>{(item.unitPrice || 0).toFixed(2)}</td>
                                            <td>{(item.totalPrice || 0).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="mt-4 text-left" style={{ textAlign: 'left' }}>
                                <h3 className="text-danger">إجمالي المبلغ المسترد: {(activeReturn.totalRefund || 0).toFixed(2)} <small>ج.م</small></h3>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowDetails(false)}>إغلاق</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Returns;
