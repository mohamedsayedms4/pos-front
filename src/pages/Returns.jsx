import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import { useGlobalUI } from '../components/common/GlobalUI';
import StatTile from '../components/common/StatTile';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const Returns = () => {
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeReturn, setActiveReturn] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [analytics, setAnalytics] = useState({ trend: [], totalRefund: 0, totalCount: 0 });
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

    const loadReturns = async (page = 0, size = 10, query = debouncedSearch) => {
        setLoading(true);
        try {
            const res = await Api.getReturns(page, size, query);
            setReturns(res.items || res.content || []);
            setTotalPages(res.totalPages || 0);
            setTotalElements(res.totalItems || res.totalElements || 0);
            setCurrentPage(res.currentPage ?? res.number ?? 0);
            
            // Load Analytics (30 day trend)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const dateStr = thirtyDaysAgo.toISOString().split('T')[0];
            const returnStats = await Api.getReturnAnalytics(dateStr);
            
            setAnalytics({
                trend: returnStats.map(d => ({ date: d.returnDate, amount: d.totalRefund, count: d.returnCount })),
                totalRefund: returnStats.reduce((sum, d) => sum + d.totalRefund, 0),
                totalCount: returnStats.reduce((sum, d) => sum + d.returnCount, 0)
            });
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReturns(currentPage, pageSize, debouncedSearch);
    }, [currentPage, debouncedSearch]);

    const openDetails = (ret) => {
        setActiveReturn(ret);
        setShowDetails(true);
    };

    return (
        <>
            <div className="page-section">
                
                {/* Analytics Dashboard */}
                <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                    <StatTile 
                        id="ret_refund"
                        label="إجمالي المسترد"
                        value={`${Number(analytics.totalRefund).toLocaleString()} ج.م`}
                        icon="💰"
                        defaults={{ color: 'crimson', size: 'tile-wd-sm', order: 1 }}
                    />
                    <StatTile 
                        id="ret_count"
                        label="عدد المرتجعات"
                        value={`${analytics.totalCount} عملية`}
                        icon="🔄"
                        defaults={{ color: 'blue', size: 'tile-sq-sm', order: 2 }}
                    />
                </div>

                {/* Main Table Card */}
                <div className="card">
                    <div className="card-header">
                        <h3>🔄 سجل مرتجعات المبيعات</h3>
                        <div className="toolbar">
                            <div className="search-input">
                                <span className="search-icon">🔍</span>
                                <input
                                    type="text"
                                    placeholder="بحث سريع..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(0);
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="card-body no-padding">
                        <div className="table-wrapper">
                            {loading && returns.length === 0 ? (
                                <Loader message="جاري التحميل..." />
                            ) : returns.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-icon">🔄</div>
                                    <h4>لا توجد عمليات مرتجع</h4>
                                </div>
                            ) : (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th className="hide-mobile">#</th>
                                            <th>رقم المرتجع</th>
                                            <th className="hide-tablet">التاريخ</th>
                                            <th>الفاتورة</th>
                                            <th>المبلغ المسترد</th>
                                            <th className="hide-tablet">الملاحظات</th>
                                            <th style={{ textAlign: 'center' }}>الإجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {returns.map((r, i) => (
                                            <tr key={r.id}>
                                                <td className="hide-mobile" style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                                                    {(currentPage * pageSize) + i + 1}
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 600, color: 'var(--metro-red)' }}>{r.returnNumber}</div>
                                                </td>
                                                <td className="hide-tablet" style={{ fontSize: '0.85rem' }}>
                                                    {new Date(r.returnDate).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                                                </td>
                                                <td>{r.invoiceNumber}</td>
                                                <td style={{ fontWeight: 700, color: 'var(--metro-red)' }}>{(r.totalRefund || 0).toFixed(2)}</td>
                                                <td className="hide-tablet" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{r.notes || '—'}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div className="table-actions" style={{ justifyContent: 'center' }}>
                                                        <button className="btn btn-icon btn-ghost" onClick={() => openDetails(r)} title="تفاصيل المرتجع">👁️</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {totalPages > 1 && (
                            <div className="pagination">
                                <button
                                    className="btn btn-ghost btn-sm"
                                    disabled={currentPage === 0}
                                    onClick={() => setCurrentPage(prev => prev - 1)}
                                >السابق</button>
                                <button className="active">{currentPage + 1}</button>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    disabled={currentPage >= totalPages - 1}
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                >التالي</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Details Modal */}
            {showDetails && activeReturn && (
                <ModalContainer>
                    <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setShowDetails(false); }}>
                        <div className="modal" style={{ maxWidth: '650px' }}>
                            <div className="modal-header">
                                <h3>تفاصيل المرتجع: {activeReturn.returnNumber}</h3>
                                <button className="modal-close" onClick={() => setShowDetails(false)}>✕</button>
                            </div>
                            <div className="modal-body no-padding">
                                <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', marginBottom: '15px' }}>
                                    <div className="form-row" style={{ marginBottom: 0 }}>
                                        <p><strong>رقم الفاتورة الأصلية:</strong> {activeReturn.invoiceNumber}</p>
                                        <p><strong>تاريخ المرتجع:</strong> {new Date(activeReturn.returnDate).toLocaleString('ar-EG')}</p>
                                    </div>
                                    <p className="mt-2 text-muted"><strong>الملاحظات:</strong> {activeReturn.notes || 'لا يوجد'}</p>
                                </div>
                                <div className="table-wrapper" style={{ maxHeight: '300px' }}>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>الصنف</th>
                                                <th>الكمية</th>
                                                <th>السعر</th>
                                                <th>إجمالي المرتجع</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeReturn.items?.map(item => (
                                                <tr key={item.id}>
                                                    <td>{item.productName}</td>
                                                    <td>{item.quantity} {item.unitName}</td>
                                                    <td>{(item.unitPrice || 0).toFixed(2)}</td>
                                                    <td style={{ fontWeight: 600, color: 'var(--metro-red)' }}>{(item.totalPrice || 0).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div style={{ padding: '20px', textAlign: 'left', borderTop: '1px solid var(--border-main)' }}>
                                    <h2 style={{ color: 'var(--metro-red)', margin: 0 }}>إجمالي المسترد: {(activeReturn.totalRefund || 0).toFixed(2)} ج.م</h2>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-ghost" onClick={() => setShowDetails(false)}>إغلاق</button>
                            </div>
                        </div>
                    </div>
                </ModalContainer>
            )}

    </>
  );
};

export default Returns;
