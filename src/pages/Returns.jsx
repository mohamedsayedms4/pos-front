import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Api from '../services/api';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import { useGlobalUI } from '../components/common/GlobalUI';
import '../styles/pages/ReturnsPremium.css';

const Returns = () => {
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeReturn, setActiveReturn] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [analytics, setAnalytics] = useState({ trend: [], totalRefund: 0, totalCount: 0, avgRefund: 0 });
    const { toast } = useGlobalUI();
    const [branches, setBranches] = useState([]);
    const [selectedBranchId, setSelectedBranchId] = useState('');
    const [sort, setSort] = useState('returnDate,desc');
    const isAdmin = Api.isAdminOrBranchManager();

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

    const loadReturns = async (page = 0, size = 10, query = debouncedSearch, branchId = selectedBranchId) => {
        setLoading(true);
        try {
            const res = await Api.getReturns(page, size, query, branchId);
            setReturns(res.items || res.content || []);
            setTotalPages(res.totalPages || 0);
            setTotalElements(res.totalItems || res.totalElements || 0);
            setCurrentPage(res.currentPage ?? res.number ?? 0);

            // Load Analytics (30 day trend)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const dateStr = thirtyDaysAgo.toISOString().split('T')[0];
            const returnStats = await Api.getReturnAnalytics(dateStr);

            const totalRefund = returnStats.reduce((sum, d) => sum + d.totalRefund, 0);
            const totalCount = returnStats.reduce((sum, d) => sum + d.returnCount, 0);

            setAnalytics({
                trend: returnStats.map(d => ({ date: d.returnDate, amount: d.totalRefund, count: d.returnCount })),
                totalRefund,
                totalCount,
                avgRefund: totalCount > 0 ? totalRefund / totalCount : 0
            });
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReturns(currentPage, pageSize, debouncedSearch, selectedBranchId);
    }, [currentPage, debouncedSearch, selectedBranchId, sort]);

    useEffect(() => {
        if (isAdmin && branches.length === 0) {
            Api.getBranches().then(setBranches).catch(() => { });
        }
    }, []);

    const openDetails = (ret) => {
        setActiveReturn(ret);
        setShowDetails(true);
    };

    // Custom Dropdown Component (matching Categories)
    const CustomSelect = ({ options, value, onChange, icon, label }) => {
        const [isOpen, setIsOpen] = useState(false);
        const selectedOption = options.find(o => o.value === value) || options[0];

        return (
            <div className="ret-custom-select-container">
                <div className={`ret-custom-select-header ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
                    <i className={`fas ${icon} icon-start`}></i>
                    <span className="selected-text">{selectedOption.label}</span>
                    <i className={`fas fa-chevron-down icon-end ${isOpen ? 'rotate' : ''}`}></i>
                </div>
                {isOpen && (
                    <>
                        <div className="ret-custom-select-overlay" onClick={() => setIsOpen(false)}></div>
                        <div className="ret-custom-select-dropdown">
                            {options.map(opt => (
                                <div 
                                    key={opt.value} 
                                    className={`ret-custom-select-item ${opt.value === value ? 'active' : ''}`}
                                    onClick={() => { onChange(opt.value); setIsOpen(false); }}
                                >
                                    {opt.label}
                                    {opt.value === value && <i className="fas fa-check"></i>}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    };


    return (
        <div className="returns-container">
            {/* 1. Breadcrumbs & Header */}
            <div className="ret-header-row">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="ret-breadcrumbs">
                        <Link to="/dashboard">الرئيسية</Link> / <span>مرتجعات المبيعات</span>
                    </div>
                    <h1>سجل المرتجعات</h1>
                </div>
                <div className="ret-header-actions">
                    <button className="ret-btn-premium ret-btn-outline" onClick={() => toast('سيتم تفعيل التصدير قريباً', 'info')}>
                        <i className="fas fa-file-excel"></i> إكسل
                    </button>
                    <button className="ret-btn-premium ret-btn-outline" onClick={() => toast('سيتم تفعيل التصدير قريباً', 'info')}>
                        <i className="fas fa-file-pdf"></i> PDF
                    </button>
                </div>
            </div>

            {/* 2. KPI Stats Grid */}
            <div className="ret-stats-grid">
                <div className="ret-stat-card">
                    <div className="ret-stat-info">
                        <h4>إجمالي المسترد</h4>
                        <div className="ret-stat-value">{Number(analytics.totalRefund).toLocaleString()} <span style={{fontSize: '0.9rem'}}>ج.م</span></div>
                    </div>
                    <div className="ret-stat-visual">
                        <div className="ret-stat-icon icon-amber">
                            <i className="fas fa-money-bill-wave"></i>
                        </div>
                    </div>
                </div>

                <div className="ret-stat-card">
                    <div className="ret-stat-info">
                        <h4>عدد العمليات</h4>
                        <div className="ret-stat-value">{analytics.totalCount} <span style={{fontSize: '0.9rem'}}>عملية</span></div>
                    </div>
                    <div className="ret-stat-visual">
                        <div className="ret-stat-icon icon-blue">
                            <i className="fas fa-undo"></i>
                        </div>
                    </div>
                </div>

                <div className="ret-stat-card">
                    <div className="ret-stat-info">
                        <h4>متوسط المرتجع</h4>
                        <div className="ret-stat-value">{Number(analytics.avgRefund).toFixed(0)} <span style={{fontSize: '0.9rem'}}>ج.م</span></div>
                    </div>
                    <div className="ret-stat-visual">
                        <div className="ret-stat-icon icon-green">
                            <i className="fas fa-chart-line"></i>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Toolbar Card */}
            <div className="ret-toolbar-card">
                <div className="ret-toolbar-left">
                    <CustomSelect 
                        icon="fa-sort-amount-down"
                        value={sort}
                        onChange={setSort}
                        options={[
                            { value: 'returnDate,desc', label: 'الأحدث أولاً' },
                            { value: 'totalRefund,desc', label: 'الأعلى قيمة' },
                            { value: 'totalRefund,asc', label: 'الأقل قيمة' }
                        ]}
                    />
                    {isAdmin && (
                        <CustomSelect 
                            icon="fa-store"
                            value={selectedBranchId}
                            onChange={(val) => { setSelectedBranchId(val); setCurrentPage(0); }}
                            options={[
                                { value: '', label: 'جميع الفروع' },
                                ...branches.map(b => ({ value: b.id.toString(), label: b.name }))
                            ]}
                        />
                    )}
                </div>

                <div className="ret-toolbar-right">
                    <div className="ret-search-box">
                        <i className="fas fa-search"></i>
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

            {/* 4. Table Card */}
            <div className="ret-table-card">
                <div className="ret-table-container">
                    {loading && returns.length === 0 ? (
                        <div style={{ padding: '40px' }}><Loader message="جاري التحميل..." /></div>
                    ) : returns.length === 0 ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--ret-text-secondary)' }}>
                            <i className="fas fa-undo" style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}></i>
                            <h3>لا توجد عمليات مرتجع</h3>
                            <p>لم يتم العثور على أي نتائج تطابق بحثك</p>
                        </div>
                    ) : (
                        <table className="ret-table">
                            <thead>
                                <tr>
                                    <th className="hide-mobile">#</th>
                                    <th>رقم المرتجع</th>
                                    <th>التاريخ</th>
                                    <th>رقم الفاتورة</th>
                                    <th>القيمة المستردة</th>
                                    <th className="hide-tablet">الملاحظات</th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {returns.map((r, idx) => (
                                    <tr key={r.id}>
                                        <td className="hide-mobile">{idx + 1 + (currentPage * pageSize)}</td>
                                        <td>
                                            <div style={{ fontWeight: 800, color: 'var(--ret-accent-red)' }}>{r.returnNumber}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--ret-text-secondary)' }}>ID: {r.id}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{new Date(r.returnDate).toLocaleDateString('ar-EG')}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--ret-text-secondary)' }}>
                                                {new Date(r.returnDate).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="ret-product-count" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                                                {r.invoiceNumber}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                                                {Number(r.totalRefund).toLocaleString()} <small>ج.م</small>
                                            </div>
                                        </td>
                                        <td className="hide-tablet">
                                            <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                                                {r.notes || '—'}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="ret-actions">
                                                <button className="ret-action-btn" onClick={() => openDetails(r)} title="تفاصيل">
                                                    <i className="fas fa-eye"></i>
                                                </button>
                                                <button className="ret-action-btn" onClick={() => toast('قريباً', 'info')} title="طباعة">
                                                    <i className="fas fa-print"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* 5. Pagination */}
                {totalPages > 1 && (
                    <div className="ret-pagination">
                        <div className="ret-pagination-info">
                            عرض {(currentPage * pageSize) + 1} إلى {Math.min((currentPage + 1) * pageSize, totalElements)} من {totalElements} نتيجة
                        </div>
                        <div className="ret-pagination-btns">
                            <button 
                                className="ret-page-btn" 
                                disabled={currentPage === 0}
                                onClick={() => setCurrentPage(prev => prev - 1)}
                            >السابق</button>
                            <button className="ret-page-btn active">{currentPage + 1}</button>
                            <button 
                                className="ret-page-btn" 
                                disabled={currentPage >= totalPages - 1}
                                onClick={() => setCurrentPage(prev => prev + 1)}
                            >التالي</button>
                        </div>
                    </div>
                )}
            </div>

            {/* 6. Details Modal */}
            {showDetails && activeReturn && (
                <ModalContainer>
                    <div className="ret-modal-overlay" onClick={(e) => { if (e.target.classList.contains('ret-modal-overlay')) setShowDetails(false); }}>
                        <div className="ret-modal" style={{ maxWidth: '700px' }}>
                            <div className="ret-modal-header">
                                <h3>تفاصيل المرتجع: {activeReturn.returnNumber}</h3>
                                <button className="ret-modal-close" onClick={() => setShowDetails(false)}>✕</button>
                            </div>
                            <div className="ret-modal-body">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', padding: '20px', background: 'var(--ret-bg)', borderRadius: '16px' }}>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--ret-text-secondary)', marginBottom: '4px' }}>رقم الفاتورة الأصلية</div>
                                        <div style={{ fontWeight: 700 }}>{activeReturn.invoiceNumber}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--ret-text-secondary)', marginBottom: '4px' }}>تاريخ العملية</div>
                                        <div style={{ fontWeight: 700 }}>{new Date(activeReturn.returnDate).toLocaleString('ar-EG')}</div>
                                    </div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--ret-text-secondary)', marginBottom: '4px' }}>الملاحظات</div>
                                        <div style={{ fontStyle: activeReturn.notes ? 'normal' : 'italic' }}>{activeReturn.notes || 'لا توجد ملاحظات'}</div>
                                    </div>
                                </div>

                                <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="fas fa-list-ul" style={{ color: 'var(--ret-accent-red)' }}></i> الأصناف المرتجعة
                                </h4>
                                
                                <div className="ret-table-container" style={{ border: '1px solid var(--ret-border)', borderRadius: '12px', overflow: 'hidden' }}>
                                    <table className="ret-table">
                                        <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
                                            <tr>
                                                <th>الصنف</th>
                                                <th>الكمية</th>
                                                <th>السعر</th>
                                                <th>الإجمالي</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeReturn.items?.map(item => (
                                                <tr key={item.id}>
                                                    <td style={{ fontWeight: 700 }}>{item.productName}</td>
                                                    <td>{item.quantity} {item.unitName}</td>
                                                    <td>{Number(item.unitPrice).toLocaleString()}</td>
                                                    <td style={{ fontWeight: 800, color: 'var(--ret-accent-red)' }}>{Number(item.totalPrice).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="ret-modal-footer">
                                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--ret-text-secondary)' }}>إجمالي المبلغ المسترد</div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--ret-accent-red)' }}>
                                        {Number(activeReturn.totalRefund).toLocaleString()} <span style={{ fontSize: '1rem' }}>ج.م</span>
                                    </div>
                                </div>
                                <button className="ret-btn-ghost" onClick={() => setShowDetails(false)}>إغلاق</button>
                                <button className="ret-btn-primary" style={{ background: 'var(--ret-accent-red)' }} onClick={() => toast('قريباً', 'info')}>
                                    <i className="fas fa-print" style={{ marginLeft: '8px' }}></i> طباعة
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalContainer>
            )}
        </div>
    );
};

export default Returns;
