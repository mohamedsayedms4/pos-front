import React, { useState, useEffect, useMemo } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';

const FinancialAnalytics = () => {
    const { toast } = useGlobalUI();
    const [loading, setLoading] = useState(true);
    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [dateRange, setDateRange] = useState({
        from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        loadData();
    }, [dateRange]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [accRes, transRes] = await Promise.all([
                Api.getTreasuryOverview(),
                Api.getTreasuryTransactions(0, 1000, '') // We'll fetch a large batch and filter in memory for now
            ]);
            
            setAccounts(accRes || []);
            // Filter transactions by date range
            const filtered = (transRes.content || []).filter(t => {
                const date = t.transactionDate.split('T')[0];
                return date >= dateRange.from && date <= dateRange.to;
            });
            setTransactions(filtered);
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Group transactions by date and account
    const analyticalData = useMemo(() => {
        const groups = {};
        transactions.forEach(t => {
            const date = t.transactionDate.split('T')[0];
            if (!groups[date]) groups[date] = {};
            
            const accId = t.treasury.id;
            if (!groups[date][accId]) groups[date][accId] = 0;
            
            if (t.type === 'IN') groups[date][accId] += t.amount;
            else groups[date][accId] -= t.amount;
        });

        // Convert to sorted array of rows
        return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(date => ({
            date,
            values: groups[date]
        }));
    }, [transactions]);

    const calculateTotal = (accId) => {
        return transactions
            .filter(t => t.treasury.id === accId)
            .reduce((sum, t) => t.type === 'IN' ? sum + t.amount : sum - t.amount, 0);
    };

    if (loading && accounts.length === 0) return <Loader />;

    return (
        <div className="page-section">
            <div className="analytics-header card" style={{ marginBottom: '20px' }}>
                <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>📊 التحليل المالي الموحد</h2>
                        <p style={{ margin: '5px 0 0 0', color: 'var(--text-dim)', fontSize: '0.9rem' }}>تحليل حركة التدفقات النقدية والبنكية بشكل تفصيلي</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input 
                            type="date" 
                            className="form-control" 
                            value={dateRange.from} 
                            onChange={e => setDateRange({...dateRange, from: e.target.value})}
                        />
                        <span>إلى</span>
                        <input 
                            type="date" 
                            className="form-control" 
                            value={dateRange.to} 
                            onChange={e => setDateRange({...dateRange, to: e.target.value})}
                        />
                    </div>
                </div>
            </div>

            <div className="summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                {accounts.map(acc => (
                    <div key={acc.id} className="card stats-card" style={{ borderLeft: `4px solid ${acc.accountType === 'BANK' ? '#2196f3' : '#4caf50'}` }}>
                        <div className="card-body">
                            <small style={{ color: 'var(--text-dim)' }}>{acc.name}</small>
                            <h3 style={{ margin: '5px 0', fontSize: '1.25rem' }}>{acc.balance.toLocaleString()} <small>ج.م</small></h3>
                            <div style={{ fontSize: '0.75rem', color: calculateTotal(acc.id) >= 0 ? 'var(--accent-emerald)' : 'var(--accent-danger)' }}>
                                {calculateTotal(acc.id) >= 0 ? '▲' : '▼'} صافي الحركة: {Math.abs(calculateTotal(acc.id)).toLocaleString()}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>📑 جدول التحليل التحليلي (Columnar Analysis)</h3>
                </div>
                <div className="card-body no-padding">
                    <div className="table-wrapper scroll-horizontal">
                        <table className="data-table analytics-table">
                            <thead>
                                <tr>
                                    <th style={{ position: 'sticky', right: 0, background: 'var(--bg-card)', zIndex: 10 }}>التاريخ</th>
                                    {accounts.map(acc => (
                                        <th key={acc.id} style={{ textAlign: 'center' }}>
                                            {acc.name}
                                            <div style={{ fontSize: '0.7rem', fontWeight: 'normal', color: 'var(--text-dim)' }}>
                                                {acc.accountType === 'BANK' ? '🏦 بنكي' : '💵 نقدي'}
                                            </div>
                                        </th>
                                    ))}
                                    <th style={{ textAlign: 'center', background: 'rgba(var(--accent-primary-rgb), 0.05)' }}>الإجمالي اليومي</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analyticalData.length === 0 ? (
                                    <tr>
                                        <td colSpan={accounts.length + 2} style={{ textAlign: 'center', padding: '40px' }}>لا توجد حركات مالية في هذه الفترة</td>
                                    </tr>
                                ) : analyticalData.map(row => {
                                    let dailyTotal = 0;
                                    return (
                                        <tr key={row.date}>
                                            <td style={{ position: 'sticky', right: 0, background: 'var(--bg-card)', zIndex: 5, fontWeight: 'bold' }}>{row.date}</td>
                                            {accounts.map(acc => {
                                                const val = row.values[acc.id] || 0;
                                                dailyTotal += val;
                                                return (
                                                    <td key={acc.id} style={{ textAlign: 'center', color: val > 0 ? 'var(--accent-emerald)' : val < 0 ? 'var(--accent-danger)' : 'var(--text-dim)' }}>
                                                        {val !== 0 ? val.toLocaleString() : '-'}
                                                    </td>
                                                );
                                            })}
                                            <td style={{ textAlign: 'center', fontWeight: 'bold', background: 'rgba(var(--accent-primary-rgb), 0.02)' }}>
                                                <span style={{ color: dailyTotal > 0 ? 'var(--accent-emerald)' : dailyTotal < 0 ? 'var(--accent-danger)' : 'inherit' }}>
                                                    {dailyTotal.toLocaleString()}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: 'var(--bg-app)', fontWeight: 'bold' }}>
                                    <td style={{ position: 'sticky', right: 0, background: 'var(--bg-app)', zIndex: 10 }}>إجمالي الحركة للفترة</td>
                                    {accounts.map(acc => {
                                        const total = calculateTotal(acc.id);
                                        return (
                                            <td key={acc.id} style={{ textAlign: 'center', color: total > 0 ? 'var(--accent-emerald)' : total < 0 ? 'var(--accent-danger)' : 'inherit' }}>
                                                {total.toLocaleString()}
                                            </td>
                                        );
                                    })}
                                    <td style={{ textAlign: 'center' }}>
                                        {accounts.reduce((sum, acc) => sum + calculateTotal(acc.id), 0).toLocaleString()}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .analytics-table th, .analytics-table td {
                    min-width: 120px;
                    border-left: 1px solid var(--border-color) !important;
                }
                .analytics-table th:last-child, .analytics-table td:last-child {
                    border-left: none !important;
                }
                .scroll-horizontal {
                    overflow-x: auto;
                }
                .stats-card {
                    transition: transform 0.2s;
                    cursor: default;
                }
                .stats-card:hover {
                    transform: translateY(-5px);
                }
            `}} />
        </div>
    );
};

export default FinancialAnalytics;
