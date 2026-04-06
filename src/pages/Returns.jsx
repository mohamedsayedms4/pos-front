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

    // Pagination & Search state
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
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
        loadReturns(currentPage, pageSize, debouncedSearch);
    }, [currentPage, debouncedSearch]);

    const loadReturns = async (page = 0, size = 10, query = debouncedSearch) => {
        setLoading(true);
        try {
            const res = await Api.getReturns(page, size, query);
            setReturns(res.items || res.content || []);
            setTotalPages(res.totalPages || 0);
            setTotalElements(res.totalItems || res.totalElements || 0);
            setCurrentPage(res.currentPage ?? res.number ?? 0);
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
                <div className="header-actions">
                    <div className="search-input">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="بحث برقم المرتجع أو الفاتورة..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(0);
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>#</th>
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
                            <tr><td colSpan="7"><Loader message="جاري تحميل المرتجعات..." /></td></tr>
                        ) : returns.length === 0 ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center' }}>لا يوجد عمليات مرتجع مبيعات</td></tr>
                        ) : returns.map((r, i) => (
                            <tr key={r.id}>
                                <td style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                                    {(currentPage * pageSize) + i + 1}
                                </td>
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
