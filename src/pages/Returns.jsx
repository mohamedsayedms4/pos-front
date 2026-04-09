import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import Loader from '../components/common/Loader';
import ReactDOM from 'react-dom';
import { useGlobalUI } from '../components/common/GlobalUI';
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

            {/* Returns Analytics Dashboard */}
            <div className="analytics-dashboard-grid">
                {/* Stat Cards Column */}
                <div className="stat-cards-container">
                    <div className="card" style={{ 
                        flex: 1, 
                        padding: '20px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'center',
                        borderRight: '4px solid var(--metro-red)', 
                        background: 'linear-gradient(135deg, rgba(229,20,0,0.05) 0%, transparent 100%)',
                        minHeight: '140px'
                    }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>إجمالي المبالغ المُرجعة</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--metro-red)', lineHeight: 1 }}>{Number(analytics.totalRefund).toLocaleString()} <small style={{ fontSize: '1rem' }}>ج.م</small></div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '10px' }}>سيولة خارجة للمرتجع (آخر 30 يوم)</div>
                    </div>
                    <div className="card" style={{ 
                        flex: 1, 
                        padding: '20px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'center',
                        borderRight: '4px solid var(--metro-purple)', 
                        background: 'linear-gradient(135deg, rgba(162,0,255,0.05) 0%, transparent 100%)',
                        minHeight: '140px'
                    }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>عدد عمليات المرتجع</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--metro-purple)', lineHeight: 1 }}>{analytics.totalCount} <small style={{ fontSize: '1rem' }}>عملية</small></div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '10px' }}>إجمالي الحركات المسجلة</div>
                    </div>
                </div>

                {/* Trend Chart Column */}
                <div className="card" style={{ padding: '25px', display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ marginBottom: '20px', fontWeight: 300, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ opacity: 0.7 }}>📈</span> اتجاه المرتجعات (آخر 30 يوم)
                    </h4>
                    <div style={{ flex: 1, width: '100%', minHeight: '250px' }}>
                        {analytics.trend.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <AreaChart data={analytics.trend}>
                                    <defs>
                                        <linearGradient id="colorRefund" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--metro-red)" stopOpacity={0.6}/>
                                            <stop offset="95%" stopColor="var(--metro-red)" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                    <XAxis 
                                        dataKey="date" 
                                        tick={{fontSize: 10, fill: 'var(--text-dim)'}} 
                                        axisLine={{stroke: 'rgba(255,255,255,0.1)'}}
                                        tickFormatter={(v) => v.split('-').slice(1).join('/')} 
                                    />
                                    <YAxis hide={true} />
                                    <Tooltip 
                                        contentStyle={{backgroundColor: '#111', border: '1px solid #333', borderRadius: '4px'}}
                                        itemStyle={{color: 'var(--metro-red)'}}
                                    />
                                    <Area type="monotone" dataKey="amount" stroke="var(--metro-red)" fillOpacity={1} fill="url(#colorRefund)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-dim)', fontSize: '0.9rem' }}>لا توجد بيانات كافية للرسم البياني</div>
                        )}
                    </div>
                    {analytics.trend.length > 0 && (
                        <div style={{ 
                            marginTop: '15px', 
                            fontSize: '0.75rem', 
                            color: 'var(--text-dim)', 
                            textAlign: 'center',
                            borderTop: '1px solid rgba(255,255,255,0.03)',
                            paddingTop: '10px'
                        }}>
                            الفترة من <strong>{new Date(analytics.trend[0].date).toLocaleDateString('ar-EG')}</strong> إلى <strong>{new Date(analytics.trend[analytics.trend.length - 1].date).toLocaleDateString('ar-EG')}</strong>
                        </div>
                    )}
                </div>
            </div>

            <div className="card">
                <div className="table-wrapper">
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
