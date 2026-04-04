import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import Loader from '../components/common/Loader';
import ReactDOM from 'react-dom';
import { useGlobalUI } from '../components/common/GlobalUI';

const Sales = () => {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSale, setActiveSale] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnItems, setReturnItems] = useState([]);
    const [returnNotes, setReturnNotes] = useState('');
    const { toast, confirm } = useGlobalUI();

    useEffect(() => {
        loadSales();
    }, []);

    const loadSales = async () => {
        setLoading(true);
        try {
            const data = await Api.getSales(0, 50);
            setSales(data.items || data.content || []);
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const openDetails = (sale) => {
        setActiveSale(sale);
        setShowDetails(true);
    };

    const openReturnModal = (sale) => {
        setActiveSale(sale);
        // Initialize return items with 0 quantity
        setReturnItems((sale.items || []).map(i => ({
            ...i,
            returnQty: 0
        })));
        setReturnNotes('');
        setShowReturnModal(true);
    };

    const handleReturn = async () => {
        const itemsToReturn = returnItems.filter(i => i.returnQty > 0);
        if (itemsToReturn.length === 0) {
            toast('يجب تحديد أصناف للرجوع أولاً', 'warning');
            return;
        }

        confirm('هل أنت متأكد من اتمام عملية المرتجع؟ سيتم استرجاع الأصناف للمخزن وخصم المبلغ من الخزنة.', async () => {
            try {
                const request = {
                    invoiceId: activeSale.id,
                    notes: returnNotes,
                    items: itemsToReturn.map(i => ({
                        productId: i.productId,
                        quantity: i.returnQty
                    }))
                };
                await Api.createSaleReturn(request);
                toast('تمت عملية المرتجع بنجاح', 'success');
                setShowReturnModal(false);
                loadSales();
            } catch (err) {
                toast(err.message, 'error');
            }
        });
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="header-title">
                    <span className="header-icon">🧾</span>
                    <h1>سجل فواتير المبيعات</h1>
                </div>
            </div>

            <div className="card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>رقم الفاتورة</th>
                            <th>التاريخ</th>
                            <th>العميل</th>
                            <th>الإجمالي</th>
                            <th>المدفوع</th>
                            <th>المتبقي</th>
                            <th>الحالة</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="8"><Loader message="جاري تحميل فواتير المبيعات..." /></td></tr>
                        ) : sales.length === 0 ? (
                            <tr><td colSpan="8" style={{ textAlign: 'center' }}>لا يوجد فواتير مبيعات</td></tr>
                        ) : sales.map(s => (
                            <tr key={s.id}>
                                <td><strong>{s.invoiceNumber}</strong></td>
                                <td>{new Date(s.invoiceDate).toLocaleString('ar-EG')}</td>
                                <td>{s.customerName}</td>
                                <td>{(s.totalAmount || 0).toFixed(2)}</td>
                                <td>{(s.paidAmount || 0).toFixed(2)}</td>
                                <td className={(s.remainingAmount || 0) > 0 ? 'text-danger' : 'text-success'}>
                                    {(s.remainingAmount || 0).toFixed(2)}
                                </td>
                                <td>
                                    <span className={`badge ${
                                        s.status === 'PAID' ? 'badge-success' : 
                                        s.status === 'PARTIAL' ? 'badge-info' : 
                                        s.status === 'RETURNED' ? 'badge-neutral' :
                                        s.status === 'PARTIALLY_RETURNED' ? 'badge-warning' :
                                        'badge-danger'
                                    }`}>
                                        {s.status === 'PAID' ? 'تم الدفع' : 
                                         s.status === 'PARTIAL' ? 'دفع جزئي' : 
                                         s.status === 'RETURNED' ? 'مرتجع كلي' :
                                         s.status === 'PARTIALLY_RETURNED' ? 'مرتجع جزئي' :
                                         'آجل'}
                                    </span>
                                </td>
                                <td>
                                    <button className="btn btn-secondary btn-sm" onClick={() => openDetails(s)}>التفاصيل</button>
                                    <button className="btn btn-danger btn-sm" onClick={() => openReturnModal(s)}>↩ مرتجع</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Details Modal */}
            {showDetails && activeSale && ReactDOM.createPortal(
                <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setShowDetails(false); }}>
                    <div className="modal">
                        <div className="modal-header">
                            <h2>تفاصيل الفاتورة: {activeSale.invoiceNumber}</h2>
                            <button onClick={() => setShowDetails(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="invoice-summary mb-4">
                                <p><strong>العميل:</strong> {activeSale.customerName}</p>
                                <p><strong>التاريخ:</strong> {new Date(activeSale.invoiceDate).toLocaleString('ar-EG')}</p>
                            </div>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>الصنف</th>
                                        <th>الكمية</th>
                                        <th>الوحدة</th>
                                        <th>السعر</th>
                                        <th>الإجمالي</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeSale.items && activeSale.items.map(item => (
                                        <tr key={item.id}>
                                            <td>{item.productName}</td>
                                            <td>{item.quantity}</td>
                                            <td>{item.unitName}</td>
                                            <td>{(item.unitPrice || 0).toFixed(2)}</td>
                                            <td>{(item.totalPrice || 0).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="mt-4 text-left" style={{ textAlign: 'left' }}>
                                <h3>الإجمالي النهائي: {(activeSale.totalAmount || 0).toFixed(2)} <small>ج.م</small></h3>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowDetails(false)}>إغلاق</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Return Modal */}
            {showReturnModal && activeSale && ReactDOM.createPortal(
                <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setShowReturnModal(false); }}>
                    <div className="modal" style={{ width: '900px', maxWidth: '95vw' }}>
                        <div className="modal-header">
                            <h2>إجراء مرتجع مبيعات - فاتورة {activeSale.invoiceNumber}</h2>
                            <button onClick={() => setShowReturnModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="alert alert-info" style={{ marginBottom: '15px' }}>حدد الكميات المراد إرجاعها للمخزن من القائمة أدناه</div>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>الصنف</th>
                                        <th>الكمية المباعة</th>
                                        <th>السعر</th>
                                        <th>كمية المرتجع</th>
                                        <th>إجمالي المرتجع</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {returnItems.map((item, idx) => (
                                        <tr key={item.id}>
                                            <td>{item.productName}</td>
                                            <td>{item.quantity} {item.unitName}</td>
                                            <td>{(item.unitPrice || 0).toFixed(2)}</td>
                                            <td>
                                                <input 
                                                    type="number" 
                                                    className="form-control" 
                                                    style={{ width: '80px' }}
                                                    min="0"
                                                    max={item.quantity}
                                                    value={item.returnQty}
                                                    onChange={e => {
                                                        const val = Math.min(item.quantity, Math.max(0, parseFloat(e.target.value) || 0));
                                                        const newItems = [...returnItems];
                                                        newItems[idx].returnQty = val;
                                                        setReturnItems(newItems);
                                                    }}
                                                />
                                            </td>
                                            <td>{(item.returnQty * (item.unitPrice || 0)).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="form-group mt-4">
                                <label>ملاحظات المرتجع (سبب الإرجاع) *</label>
                                <textarea 
                                    className="form-control" 
                                    rows="3"
                                    value={returnNotes}
                                    onChange={e => setReturnNotes(e.target.value)}
                                    placeholder="اكتب سبب المرتجع هنا..."
                                ></textarea>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowReturnModal(false)}>إلغاء</button>
                            <button className="btn btn-danger" onClick={handleReturn}>📦 اتمام المرتجع</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Sales;
