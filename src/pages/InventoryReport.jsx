import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import { useBranch } from '../context/BranchContext';
import Loader from '../components/common/Loader';
import '../styles/pages/InventoryPremium.css';

const InventoryReport = () => {
    const { toast } = useGlobalUI();
    const { selectedBranchId } = useBranch();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const loadData = async (p = page) => {
        setLoading(true);
        try {
            const res = await Api.getInventoryReport(debouncedSearch, selectedBranchId, p, 20);
            setData(res.items || []); setTotalPages(res.totalPages || 1);
        } catch (err) { toast(err.message, 'error'); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadData(0); setPage(0); }, [debouncedSearch, selectedBranchId]);
    useEffect(() => { loadData(page); }, [page]);

    const handleExport = (type) => toast(`جاري تحضير ملف ${type}...`, 'info');

    return (
        <div className="inventory-container">
            {/* 1. Header */}
            <div className="inv-header-row">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="inv-breadcrumbs">
                        <Link to="/dashboard">الرئيسية</Link> / <span>المخازن</span>
                    </div>
                    <h1>تقرير جرد المخزون العام</h1>
                </div>
                <div className="inv-header-actions">
                    <button className="inv-btn-premium inv-btn-outline" onClick={() => handleExport('Excel')}>
                        <i className="fas fa-file-excel"></i> تصدير Excel
                    </button>
                    <button className="inv-btn-premium inv-btn-blue" onClick={() => loadData()}>
                        <i className="fas fa-sync-alt"></i> تحديث التقرير
                    </button>
                </div>
            </div>

            {/* 2. Stats Grid */}
            <div className="inv-stats-grid">
                <div className="inv-stat-card">
                    <div className="inv-stat-info">
                        <h4>إجمالي المنتجات</h4>
                        <div className="inv-stat-value">{data.length > 0 ? (page * 20 + data.length) : 0}</div>
                    </div>
                    <div className="inv-stat-visual"><div className="inv-stat-icon icon-blue"><i className="fas fa-box-open"></i></div></div>
                </div>
                <div className="inv-stat-card">
                    <div className="inv-stat-info">
                        <h4>منتجات متوفرة</h4>
                        <div className="inv-stat-value" style={{ color: 'var(--inv-accent-green)' }}>{data.filter(d => Number(d.totalQuantity) > 0).length}</div>
                    </div>
                    <div className="inv-stat-visual"><div className="inv-stat-icon icon-green"><i className="fas fa-check-circle"></i></div></div>
                </div>
                <div className="inv-stat-card">
                    <div className="inv-stat-info">
                        <h4>منخفضة المخزون</h4>
                        <div className="inv-stat-value" style={{ color: 'var(--inv-accent-amber)' }}>{data.filter(d => Number(d.totalQuantity) > 0 && Number(d.totalQuantity) < 10).length}</div>
                    </div>
                    <div className="inv-stat-visual"><div className="inv-stat-icon icon-amber"><i className="fas fa-exclamation-triangle"></i></div></div>
                </div>
                <div className="inv-stat-card">
                    <div className="inv-stat-info">
                        <h4>غير متوفرة</h4>
                        <div className="inv-stat-value" style={{ color: '#f43f5e' }}>{data.filter(d => Number(d.totalQuantity) <= 0).length}</div>
                    </div>
                    <div className="inv-stat-visual"><div className="inv-stat-icon icon-purple"><i className="fas fa-times-circle"></i></div></div>
                </div>
            </div>

            {/* 3. Toolbar */}
            <div className="inv-toolbar-card">
                <div className="inv-search-box" style={{ flex: 1, maxWidth: '500px' }}>
                    <i className="fas fa-search"></i>
                    <input className="inv-input" placeholder="بحث باسم المنتج أو الكود..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>

            {/* 4. Table Card */}
            <div className="inv-table-card">
                <div className="inv-table-container">
                    {loading ? (
                        <div style={{ padding: '60px' }}><Loader message="جاري إعداد تقرير الجرد..." /></div>
                    ) : data.length === 0 ? (
                        <div style={{ padding: '80px', textAlign: 'center', color: 'var(--inv-text-secondary)' }}>
                            <i className="fas fa-clipboard-list" style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}></i>
                            <h3>لا توجد بيانات جرد مطابقة للبحث</h3>
                        </div>
                    ) : (
                        <>
                            <table className="inv-table">
                                <thead>
                                    <tr>
                                        <th>المنتج</th>
                                        <th>الفئة</th>
                                        <th>الإجمالي العام</th>
                                        <th>توزيع المخازن والفروع</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map(p => (
                                        <tr key={p.productId}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(99,102,241,0.1)', color: 'var(--inv-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}><i className="fas fa-box"></i></div>
                                                    <div>
                                                        <Link to={`/products/${p.productId}`} style={{ fontWeight: 800, color: 'inherit', textDecoration: 'none' }}>{p.productName}</Link>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--inv-text-secondary)' }}>كود: {p.productCode || '—'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><span className="inv-type-badge badge-ghost">{p.categoryName}</span></td>
                                            <td>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: Number(p.totalQuantity) > 0 ? 'var(--inv-accent-green)' : '#f43f5e' }}>
                                                    {Number(p.totalQuantity).toLocaleString()}
                                                </div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--inv-text-secondary)' }}>وحدة قياس</div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                    {p.warehouseStocks?.map(ws => (
                                                        <div key={ws.warehouseId} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--inv-border)', borderRadius: '10px', padding: '6px 12px', minWidth: '80px' }}>
                                                            <div style={{ fontSize: '0.65rem', opacity: 0.6, marginBottom: '2px' }}>{ws.warehouseName}</div>
                                                            <div style={{ fontWeight: 800, color: 'var(--inv-accent-blue)' }}>{Number(ws.quantity).toLocaleString()}</div>
                                                        </div>
                                                    ))}
                                                    {(!p.warehouseStocks || p.warehouseStocks.length === 0) && <span style={{ opacity: 0.4, fontSize: '0.8rem' }}>غير متوفر</span>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="inv-pagination">
                                <div className="inv-pagination-info">الصفحة {page + 1} من {totalPages}</div>
                                <div className="inv-pagination-btns">
                                    <button className="inv-page-btn" disabled={page === 0} onClick={() => setPage(page - 1)}><i className="fas fa-chevron-right"></i></button>
                                    <button className="inv-page-btn active">{page + 1}</button>
                                    <button className="inv-page-btn" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}><i className="fas fa-chevron-left"></i></button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InventoryReport;
