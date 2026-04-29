import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import { useBranch } from '../context/BranchContext';
import Loader from '../components/common/Loader';

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
            setData(res.items || []);
            setTotalPages(res.totalPages || 1);
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (type) => {
        toast(`جاري تحضير ملف ${type}...`, 'info');
        // Implementation for export could be added here similar to Products.jsx
    };

    useEffect(() => {
        loadData(0);
        setPage(0);
    }, [debouncedSearch, selectedBranchId]);

    useEffect(() => {
        loadData(page);
    }, [page]);

    return (
        <div className="page-section">
            <div className="card">
                <div className="card-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', width: '100%' }}>
                        <div>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '1.5rem' }}>📋</span> تقرير جرد المخزون العام
                            </h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '5px' }}>
                                عرض تفصيلي لجميع المنتجات وتوزيعها عبر المخازن والفروع
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <div className="search-wrap-new" style={{ width: '300px', borderRadius: '8px', overflow: 'hidden', display: 'flex', border: '1px solid var(--border-color)', background: 'var(--bg-input)' }}>
                                <span style={{ padding: '0 10px', display: 'flex', alignItems: 'center' }}>🔍</span>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    placeholder="بحث باسم المنتج أو الكود..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ border: 'none', background: 'transparent' }}
                                />
                            </div>
                            <button className="btn btn-secondary" onClick={() => loadData()}>🔄 تحديث</button>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <button className="btn btn-ghost" onClick={() => handleExport('Excel')} title="تصدير Excel">📊</button>
                                <button className="btn btn-ghost" onClick={() => handleExport('PDF')} title="تصدير PDF">📄</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="card-body no-padding">
                    {loading ? (
                        <Loader message="جاري جلب بيانات المخزون..." />
                    ) : data.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📦</div>
                            <h4>لا توجد بيانات مخزون</h4>
                            <p>لم يتم العثور على منتجات تطابق البحث في المخازن</p>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '30%' }}>المنتج</th>
                                        <th style={{ width: '15%' }}>الفئة</th>
                                        <th style={{ width: '15%' }}>الإجمالي العام</th>
                                        <th style={{ width: '40%' }}>توزيع المخازن (كمية بكل مخزن)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((product) => (
                                        <tr key={product.productId}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                                                        📦
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <a href={`/products/${product.productId}`} style={{ fontWeight: 700, color: 'var(--color-primary)', textDecoration: 'none' }}>
                                                            {product.productName}
                                                        </a>
                                                        <code style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>{product.productCode || '—'}</code>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="badge" style={{ background: 'var(--bg-hover)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
                                                    {product.categoryName}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: Number(product.totalQuantity) > 0 ? 'var(--accent-emerald)' : 'var(--metro-red)' }}>
                                                        {Number(product.totalQuantity).toLocaleString()}
                                                    </span>
                                                    <small style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>إجمالي القطع</small>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                    {product.warehouseStocks && product.warehouseStocks.length > 0 ? product.warehouseStocks.map(ws => (
                                                        <div key={ws.warehouseId} className="modern-stock-tag" title={`فرع: ${ws.branchName}`}>
                                                            <div className="tag-header">
                                                                <span className="branch-dot"></span>
                                                                {ws.warehouseName}
                                                            </div>
                                                            <div className="tag-body">
                                                                {Number(ws.quantity).toLocaleString()}
                                                            </div>
                                                        </div>
                                                    )) : (
                                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', padding: '5px' }}>
                                                            غير متوفر في أي مخزن حالياً
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        عرض {data.length} منتج في هذه الصفحة
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button className="btn btn-sm btn-ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>السابق</button>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {[...Array(totalPages)].map((_, i) => (
                                <button 
                                    key={i} 
                                    className={`btn btn-sm ${page === i ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setPage(i)}
                                    style={{ minWidth: '32px' }}
                                >
                                    {i + 1}
                                </button>
                            )).slice(Math.max(0, page - 2), Math.min(totalPages, page + 3))}
                        </div>
                        <button className="btn btn-sm btn-ghost" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>التالي</button>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .modern-stock-tag {
                    display: flex;
                    flex-direction: column;
                    min-width: 100px;
                    border: 1px solid var(--border-color);
                    border-radius: 10px;
                    overflow: hidden;
                    transition: all 0.2s ease;
                    background: var(--bg-card);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }
                .modern-stock-tag:hover {
                    transform: translateY(-2px);
                    border-color: var(--color-primary);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                }
                .tag-header {
                    padding: 4px 10px;
                    background: var(--bg-hover);
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: var(--text-muted);
                    border-bottom: 1px solid var(--border-color);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .branch-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: var(--accent-emerald);
                }
                .tag-body {
                    padding: 6px 10px;
                    font-size: 1rem;
                    font-weight: 800;
                    color: var(--color-primary);
                    text-align: center;
                }
                .table-wrapper {
                    overflow-x: auto;
                }
                .data-table th {
                    background: var(--bg-hover);
                    text-transform: uppercase;
                    font-size: 0.75rem;
                    letter-spacing: 0.5px;
                }
            `}} />
        </div>
    );
};

export default InventoryReport;
