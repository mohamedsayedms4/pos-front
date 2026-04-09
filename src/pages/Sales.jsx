import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

    // Pagination & Search state
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const pageSize = 10;

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        loadSales(currentPage, pageSize, debouncedSearch);
    }, [currentPage, debouncedSearch]);

    const loadSales = async (page = 0, size = 10, query = debouncedSearch) => {
        setLoading(true);
        try {
            const res = await Api.getSales(page, size, query);
            setSales(res.items || res.content || []);
            setTotalPages(res.totalPages || 0);
            setTotalElements(res.totalItems || res.totalElements || 0);
            setCurrentPage(res.currentPage ?? res.number ?? 0);
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
                <div className="header-actions">
                    <button 
                        className="btn btn-secondary" 
                        onClick={() => navigate('/sales/analytics')}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--metro-purple)', color: '#fff', border: 'none' }}
                    >
                        <span>📊</span> إحصائيات المبيعات
                    </button>
                    <div className="search-input">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="بحث برقم الفاتورة أو اسم العميل..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(0);
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="table-responsive">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>#</th>
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
                            <tr><td colSpan="9" className="full-mobile"><Loader message="جاري تحميل فواتير المبيعات..." /></td></tr>
                        ) : sales.length === 0 ? (
                            <tr><td colSpan="9" className="full-mobile" style={{ textAlign: 'center' }}>لا يوجد فواتير مبيعات</td></tr>
                        ) : sales.map((s, i) => (
                            <tr key={s.id}>
                                <td data-label="#"><strong>{(currentPage * pageSize) + i + 1}</strong></td>
                                <td data-label="رقم الفاتورة"><strong>{s.invoiceNumber}</strong></td>
                                <td data-label="التاريخ">{new Date(s.invoiceDate).toLocaleString('ar-EG')}</td>
                                <td data-label="العميل">{s.customerName}</td>
                                <td data-label="الإجمالي">{(s.totalAmount || 0).toFixed(2)}</td>
                                <td data-label="المدفوع">{(s.paidAmount || 0).toFixed(2)}</td>
                                <td data-label="المتبقي" className={(s.remainingAmount || 0) > 0 ? 'text-danger' : 'text-success'}>
                                    {(s.remainingAmount || 0).toFixed(2)}
                                </td>
                                <td data-label="الحالة">
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
                                <td data-label="الإجراءات">
                                    <button className="btn btn-secondary btn-sm" onClick={() => openDetails(s)}>التفاصيل</button>
                                    <button className="btn btn-danger btn-sm" onClick={() => openReturnModal(s)}>↩ مرتجع</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="pagination" style={{ borderTop: '1px solid var(--border-main)' }}>
                    <button
                        className="btn btn-ghost btn-sm"
                        style={{ width: 'auto', padding: '0 15px' }}
                        disabled={currentPage === 0}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                    >
                        السابق
                    </button>
                    <button className="active">{currentPage + 1}</button>
                    <button
                        className="btn btn-ghost btn-sm"
                        style={{ width: 'auto', padding: '0 15px' }}
                        disabled={currentPage >= totalPages - 1}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                    >
                        التالي
                    </button>
                </div>
            )}

            {/* Details Modal */}
            {showDetails && activeSale && ReactDOM.createPortal(
                <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setShowDetails(false); }}>
                    <div className="modal" style={{ width: '100%', maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2>تفاصيل الفاتورة: {activeSale.invoiceNumber}</h2>
                            <button onClick={() => setShowDetails(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ padding: '15px' }}>
                            <div className="invoice-summary mb-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                                <p><strong>العميل:</strong><br/> {activeSale.customerName}</p>
                                <p><strong>التاريخ:</strong><br/> {new Date(activeSale.invoiceDate).toLocaleDateString('ar-EG')}</p>
                            </div>
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>الصنف</th>
                                            <th>الكمية</th>
                                            <th>السعر</th>
                                            <th>الإجمالي</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeSale.items && activeSale.items.map(item => (
                                            <tr key={item.id}>
                                                <td data-label="الصنف">{item.productName}</td>
                                                <td data-label="الكمية">{item.quantity} {item.unitName}</td>
                                                <td data-label="السعر">{(item.unitPrice || 0).toFixed(2)}</td>
                                                <td data-label="الإجمالي">{(item.totalPrice || 0).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4" style={{ textAlign: 'left', borderTop: '2px solid #222', paddingTop: '10px' }}>
                                <h3 style={{ color: 'var(--metro-blue)' }}>الإجمالي: {(activeSale.totalAmount || 0).toFixed(2)} <small>ج.م</small></h3>
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
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>الصنف</th>
                                            <th>الكمية المباعة</th>
                                            <th>السعر</th>
                                            <th>كمية المرتجع</th>
                                            <th>الإجمالي</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {returnItems.map((item, idx) => (
                                            <tr key={item.id}>
                                                <td data-label="الصنف">{item.productName}</td>
                                                <td data-label="الكمية">{item.quantity} {item.unitName}</td>
                                                <td data-label="السعر">{(item.unitPrice || 0).toFixed(2)}</td>
                                                <td data-label="كمية المرتجع">
                                                    <input 
                                                        type="number" 
                                                        className="form-control" 
                                                        style={{ width: '80px', margin: '0 auto' }}
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
                                                <td data-label="الإجمالي">{(item.returnQty * (item.unitPrice || 0)).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
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
