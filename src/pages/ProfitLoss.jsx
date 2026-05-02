import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import { useBranch } from '../context/BranchContext';
import '../styles/pages/ProfitLossPremium.css';

const CustomSelect = ({ options, value, onChange, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value) || options[0];
  return (
    <div className="pnl-custom-select-container">
      <div className={`pnl-custom-select-header ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        <i className={`fas ${icon} icon-start`}></i>
        <span className="selected-text">{selectedOption.label}</span>
        <i className="fas fa-chevron-down icon-end"></i>
      </div>
      {isOpen && (
        <>
          <div className="pnl-custom-select-overlay" onClick={() => setIsOpen(false)}></div>
          <div className="pnl-custom-select-dropdown">
            {options.map(opt => (
              <div key={opt.value} className={`pnl-custom-select-item ${opt.value === value ? 'active' : ''}`} onClick={() => { onChange(opt.value); setIsOpen(false); }}>
                {opt.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const ProfitLoss = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useGlobalUI();
  const { selectedBranchId: globalBranchId, branches: contextBranches } = useBranch();

  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [branches, setBranches] = useState([]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899'];

  useEffect(() => {
    const user = Api._getUser();
    if (globalBranchId) setSelectedBranchId(globalBranchId);
    else if (user && user.branchId) setSelectedBranchId(user.branchId);
    
    if (contextBranches && contextBranches.length > 0) setBranches(contextBranches);
  }, [globalBranchId, contextBranches]);

  useEffect(() => { fetchReport(); }, [selectedBranchId]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const startTime = dateRange.start + 'T00:00:00';
      const endTime = dateRange.end + 'T23:59:59';
      const res = await Api.getProfitLossReport(startTime, endTime, selectedBranchId);
      setData(res);
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const expenseData = data ? Object.entries(data.expensesByCategory).map(([name, value]) => ({ name, value })) : [];
  
  const mainStats = data ? [
    { name: 'صافي الإيرادات', value: data.netRevenue, color: '#6366f1' },
    { name: 'تكلفة البضاعة', value: data.costOfGoodsSold, color: '#f59e0b' },
    { name: 'إجمالي المصروفات', value: data.totalExpenses, color: '#f43f5e' },
    { name: 'صافي الربح', value: data.netProfit, color: '#10b981' }
  ] : [];

  return (
    <div className="profit-loss-container">
      {/* 1. Header */}
      <div className="pnl-header-row">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="pnl-breadcrumbs">
            <Link to="/dashboard">الرئيسية</Link> / <span>التقارير</span>
          </div>
          <h1>الأرباح والخسائر</h1>
        </div>
        <div className="pnl-header-actions">
          <button className="pnl-btn-premium pnl-btn-blue" onClick={fetchReport}>
            <i className="fas fa-sync-alt"></i> تحديث التقرير
          </button>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="pnl-stats-grid">
        <div className="pnl-stat-card">
          <div className="pnl-stat-info">
            <h4>صافي الإيرادات</h4>
            <div className="pnl-stat-value">{data?.netRevenue.toLocaleString('ar-EG') || '0'} <span style={{fontSize: '0.8rem'}}>ج.م</span></div>
          </div>
          <div className="pnl-stat-visual">
            <div className="pnl-stat-icon icon-blue">
              <i className="fas fa-coins"></i>
            </div>
          </div>
        </div>
        <div className="pnl-stat-card">
          <div className="pnl-stat-info">
            <h4>إجمالي الربح</h4>
            <div className="pnl-stat-value">{data?.grossProfit.toLocaleString('ar-EG') || '0'} <span style={{fontSize: '0.8rem'}}>ج.م</span></div>
          </div>
          <div className="pnl-stat-visual">
            <div className="pnl-stat-icon icon-green">
              <i className="fas fa-chart-line"></i>
            </div>
          </div>
        </div>
        <div className="pnl-stat-card">
          <div className="pnl-stat-info">
            <h4>إجمالي المصروفات</h4>
            <div className="pnl-stat-value">{data?.totalExpenses.toLocaleString('ar-EG') || '0'} <span style={{fontSize: '0.8rem'}}>ج.م</span></div>
          </div>
          <div className="pnl-stat-visual">
            <div className="pnl-stat-icon icon-amber">
              <i className="fas fa-money-bill-wave"></i>
            </div>
          </div>
        </div>
        <div className="pnl-stat-card">
          <div className="pnl-stat-info">
            <h4>صافي الربح</h4>
            <div className="pnl-stat-value" style={{ color: data?.netProfit >= 0 ? 'var(--pnl-accent-green)' : '#f43f5e' }}>
              {data?.netProfit.toLocaleString('ar-EG') || '0'} <span style={{fontSize: '0.8rem'}}>ج.م</span>
            </div>
          </div>
          <div className="pnl-stat-visual">
            <div className={`pnl-stat-icon ${data?.netProfit >= 0 ? 'icon-green' : 'icon-amber'}`}>
              <i className={`fas ${data?.netProfit >= 0 ? 'fa-gem' : 'fa-exclamation-triangle'}`}></i>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Toolbar (Filters) */}
      <div className="pnl-toolbar-card">
        <div className="pnl-toolbar-left" style={{ flexWrap: 'wrap' }}>
          {Api.can('ROLE_ADMIN') && (
            <CustomSelect 
              icon="fa-store"
              value={selectedBranchId}
              onChange={setSelectedBranchId}
              options={[{ value: '', label: 'جميع الفروع' }, ...branches.map(b => ({ value: b.id.toString(), label: b.name }))]}
            />
          )}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input type="date" className="pnl-input" style={{ width: '150px' }} value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
            <span style={{color: 'var(--pnl-text-secondary)'}}>إلى</span>
            <input type="date" className="pnl-input" style={{ width: '150px' }} value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
          </div>
        </div>
      </div>

      {/* 4. Analytics Grid */}
      <div className="pnl-analytics-grid">
        {/* Chart 1: Financial Structure */}
        <div className="pnl-table-card" style={{ padding: '24px', borderRadius: '24px' }}>
          <h3 style={{ margin: '0 0 24px 0', fontSize: '1.2rem', fontWeight: 800 }}>🏦 الهيكل المالي</h3>
          <div style={{ height: '350px', width: '100%' }}>
            {data ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mainStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--pnl-border)" />
                  <XAxis dataKey="name" tick={{fontSize: 12, fill: 'var(--pnl-text-secondary)', fontWeight: 600}} />
                  <YAxis tick={{fontSize: 12, fill: 'var(--pnl-text-secondary)'}} />
                  <Tooltip 
                    contentStyle={{backgroundColor: 'var(--pnl-card-bg)', border: '1px solid var(--pnl-border)', borderRadius: '12px'}}
                    itemStyle={{fontSize: '0.9rem', fontWeight: 700}}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                    {mainStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <Loader />}
          </div>
        </div>

        {/* Chart 2: Expenses Distribution */}
        <div className="pnl-table-card" style={{ padding: '24px', borderRadius: '24px' }}>
          <h3 style={{ margin: '0 0 24px 0', fontSize: '1.2rem', fontWeight: 800 }}>🍕 توزيع المصروفات</h3>
          <div style={{ height: '350px', width: '100%' }}>
            {expenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{backgroundColor: 'var(--pnl-card-bg)', border: '1px solid var(--pnl-border)', borderRadius: '12px'}}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--pnl-text-secondary)' }}>لا توجد مصروفات مسجلة</div>}
          </div>
        </div>
      </div>

      {/* 5. Detailed Breakdown Table */}
      <div className="pnl-table-card">
        <div style={{ padding: '24px', borderBottom: '1px solid var(--pnl-border)' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>📝 تفاصيل البنود المالية</h3>
        </div>
        <div className="pnl-table-container">
          {data ? (
            <table className="pnl-table">
              <tbody>
                <tr>
                  <td style={{ fontWeight: 600 }}>إجمالي المبيعات (Sale Invoices)</td>
                  <td style={{ color: 'var(--pnl-accent-green)', fontWeight: 800, fontSize: '1.1rem' }}>+{data.totalSales.toLocaleString('ar-EG')}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>إجمالي المرتجعات (Returns)</td>
                  <td style={{ color: '#f43f5e', fontWeight: 800 }}>-{data.totalReturns.toLocaleString('ar-EG')}</td>
                </tr>
                <tr style={{ background: 'rgba(99, 102, 241, 0.05)' }}>
                  <td style={{ fontWeight: 800, color: 'var(--pnl-accent-blue)' }}>صافي الإيرادات (Net Revenue)</td>
                  <td style={{ fontWeight: 800, fontSize: '1.2rem' }}>{data.netRevenue.toLocaleString('ar-EG')}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>تكلفة البضاعة المباعة (COGS)</td>
                  <td style={{ color: '#f59e0b', fontWeight: 800 }}>-{data.costOfGoodsSold.toLocaleString('ar-EG')}</td>
                </tr>
                <tr style={{ background: 'rgba(16, 185, 129, 0.05)' }}>
                  <td style={{ fontWeight: 800, color: 'var(--pnl-accent-green)' }}>إجمالي الربح (Gross Profit)</td>
                  <td style={{ fontWeight: 800, fontSize: '1.2rem' }}>{data.grossProfit.toLocaleString('ar-EG')}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>إجمالي المصروفات (Expenses)</td>
                  <td style={{ color: '#f43f5e', fontWeight: 800 }}>-{data.totalExpenses.toLocaleString('ar-EG')}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>خسائر التوالف (Damaged Goods)</td>
                  <td style={{ color: '#f43f5e', fontWeight: 800 }}>-{data.totalDamagedLoss.toLocaleString('ar-EG')}</td>
                </tr>
                <tr style={{ background: 'linear-gradient(90deg, var(--pnl-accent-green), #059669)', color: 'white' }}>
                  <td style={{ fontWeight: 800, fontSize: '1.3rem', padding: '24px' }}>صافي الربح النهائي (Net Profit)</td>
                  <td style={{ fontWeight: 800, fontSize: '1.5rem', padding: '24px' }}>{data.netProfit.toLocaleString('ar-EG')} ج.م</td>
                </tr>
              </tbody>
            </table>
          ) : <Loader />}
        </div>
      </div>

      {/* 6. Partner Distribution Table */}
      {data?.partnerShares && data.partnerShares.length > 0 && (
        <div className="pnl-table-card" style={{ marginTop: '24px' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--pnl-border)' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>💎 توزيع الأرباح على الشركاء</h3>
          </div>
          <div className="pnl-table-container">
            <table className="pnl-table">
              <thead>
                <tr>
                  <th>الشريك</th>
                  <th>النسبة</th>
                  <th>المبلغ المستحق</th>
                </tr>
              </thead>
              <tbody>
                {data.partnerShares.map(ps => (
                  <tr key={ps.partnerId}>
                    <td style={{ fontWeight: 700 }}>{ps.partnerName}</td>
                    <td><span className="pnl-type-badge badge-blue">{ps.sharePercentage}%</span></td>
                    <td style={{ fontWeight: 800, color: 'var(--pnl-accent-green)', fontSize: '1.1rem' }}>{ps.profitAmount.toLocaleString('ar-EG')} ج.م</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfitLoss;
