import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import '../styles/pages/FinancialAnalyticsPremium.css';

const FinancialAnalytics = () => {
  const { toast } = useGlobalUI();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  useEffect(() => { loadData(); }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accRes, transRes] = await Promise.all([ Api.getTreasuryOverview(), Api.getTreasuryTransactions(0, 1000, '') ]);
      setAccounts(accRes || []);
      const filtered = (transRes.content || []).filter(t => {
        const date = t.transactionDate.split('T')[0];
        return date >= dateRange.from && date <= dateRange.to;
      });
      setTransactions(filtered);
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

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
    return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(date => ({ date, values: groups[date] }));
  }, [transactions]);

  const calculateTotal = (accId) => {
    return transactions.filter(t => t.treasury.id === accId).reduce((sum, t) => t.type === 'IN' ? sum + t.amount : sum - t.amount, 0);
  };

  return (
    <div className="financial-analytics-container">
      {/* 1. Header */}
      <div className="fya-header-row">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="fya-breadcrumbs">
            <Link to="/dashboard">الرئيسية</Link> / <span>التحليلات</span>
          </div>
          <h1>التحليل المالي الموحد</h1>
        </div>
        <div className="fya-header-actions">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input type="date" className="fya-input" style={{ width: '150px' }} value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} />
            <span style={{color: 'var(--fya-text-secondary)'}}>إلى</span>
            <input type="date" className="fya-input" style={{ width: '150px' }} value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} />
          </div>
        </div>
      </div>

      {/* 2. Dynamic Account Cards */}
      <div className="fya-stats-grid">
        {accounts.map(acc => {
          const netMovement = calculateTotal(acc.id);
          return (
            <div key={acc.id} className="fya-stat-card">
              <div className="fya-stat-info">
                <h4>{acc.name}</h4>
                <div className="fya-stat-value">{acc.balance.toLocaleString('ar-EG')} <span style={{fontSize: '0.8rem'}}>ج.م</span></div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: netMovement >= 0 ? 'var(--fya-accent-green)' : '#f43f5e', marginTop: '4px' }}>
                  <i className={`fas ${netMovement >= 0 ? 'fa-caret-up' : 'fa-caret-down'}`}></i> صافي الحركة: {Math.abs(netMovement).toLocaleString('ar-EG')}
                </div>
              </div>
              <div className="fya-stat-visual">
                <div className={`fya-stat-icon ${acc.accountType === 'BANK' ? 'icon-blue' : 'icon-green'}`}>
                  <i className={`fas ${acc.accountType === 'BANK' ? 'fa-university' : 'fa-money-bill-wave'}`}></i>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Analytical Table Card */}
      <div className="fya-table-card">
        <div style={{ padding: '24px', borderBottom: '1px solid var(--fya-border)' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>📑 جدول التحليل العمودي (Columnar Analysis)</h3>
        </div>
        <div className="fya-table-container">
          {loading ? (
            <div style={{ padding: '40px' }}><Loader message="جاري تحليل التدفقات..." /></div>
          ) : analyticalData.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--fya-text-secondary)' }}>
              <i className="fas fa-chart-bar" style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}></i>
              <h3>لا توجد حركات مالية في هذه الفترة</h3>
            </div>
          ) : (
            <table className="fya-table" style={{ textAlign: 'center' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'right', position: 'sticky', right: 0, background: 'var(--fya-card-bg)', zIndex: 10 }}>التاريخ</th>
                  {accounts.map(acc => (
                    <th key={acc.id}>
                      {acc.name}
                      <div style={{ fontSize: '0.6rem', fontWeight: 400, opacity: 0.6 }}>{acc.accountType === 'BANK' ? '🏦 بنكي' : '💵 نقدي'}</div>
                    </th>
                  ))}
                  <th style={{ background: 'rgba(99, 102, 241, 0.05)' }}>الإجمالي اليومي</th>
                </tr>
              </thead>
              <tbody>
                {analyticalData.map(row => {
                  let dailyTotal = 0;
                  return (
                    <tr key={row.date}>
                      <td style={{ textAlign: 'right', position: 'sticky', right: 0, background: 'var(--fya-card-bg)', zIndex: 5, fontWeight: 800 }}>{row.date}</td>
                      {accounts.map(acc => {
                        const val = row.values[acc.id] || 0;
                        dailyTotal += val;
                        return (
                          <td key={acc.id} style={{ color: val > 0 ? 'var(--fya-accent-green)' : val < 0 ? '#f43f5e' : 'var(--fya-text-secondary)', fontWeight: val !== 0 ? 700 : 400 }}>
                            {val !== 0 ? val.toLocaleString('ar-EG') : '-'}
                          </td>
                        );
                      })}
                      <td style={{ fontWeight: 900, background: 'rgba(99, 102, 241, 0.02)' }}>
                        <span style={{ color: dailyTotal > 0 ? 'var(--fya-accent-green)' : dailyTotal < 0 ? '#f43f5e' : 'inherit' }}>
                          {dailyTotal.toLocaleString('ar-EG')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'rgba(99, 102, 241, 0.05)', fontWeight: 800 }}>
                  <td style={{ textAlign: 'right', position: 'sticky', right: 0, background: 'var(--fya-card-bg)', zIndex: 10 }}>إجمالي الحركة للفترة</td>
                  {accounts.map(acc => {
                    const total = calculateTotal(acc.id);
                    return (
                      <td key={acc.id} style={{ color: total > 0 ? 'var(--fya-accent-green)' : total < 0 ? '#f43f5e' : 'inherit' }}>
                        {total.toLocaleString('ar-EG')}
                      </td>
                    );
                  })}
                  <td style={{ fontSize: '1.2rem', color: 'var(--fya-accent-blue)' }}>
                    {accounts.reduce((sum, acc) => sum + calculateTotal(acc.id), 0).toLocaleString('ar-EG')}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialAnalytics;
