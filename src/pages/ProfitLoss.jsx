import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import StatTile from '../components/common/StatTile';
import { useBranch } from '../context/BranchContext';

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

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

  useEffect(() => {
    const user = Api._getUser();
    if (globalBranchId) {
      setSelectedBranchId(globalBranchId);
    } else if (user && user.branchId) {
      setSelectedBranchId(user.branchId);
    }
    
    if (contextBranches && contextBranches.length > 0) {
      setBranches(contextBranches);
    }
  }, [globalBranchId, contextBranches]);

  useEffect(() => {
    fetchReport();
  }, [selectedBranchId]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      // API expects ISO strings or format that matches
      const startTime = dateRange.start + 'T00:00:00';
      const endTime = dateRange.end + 'T23:59:59';
      const res = await Api.getProfitLossReport(startTime, endTime, selectedBranchId);
      setData(res);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) return <Loader message="جاري تحليل البيانات المالية..." />;

  const expenseData = data ? Object.entries(data.expensesByCategory).map(([name, value]) => ({ name, value })) : [];
  
  const mainStats = data ? [
    { name: 'صافي الإيرادات', value: data.netRevenue, color: 'var(--metro-blue)' },
    { name: 'تكلفة البضاعة', value: data.costOfGoodsSold, color: 'var(--metro-orange)' },
    { name: 'إجمالي المصروفات', value: data.totalExpenses, color: 'var(--metro-red)' },
    { name: 'صافي الربح', value: data.netProfit, color: 'var(--metro-green)' }
  ] : [];

  return (
    <div className="page-section">
      <div className="stats-grid mb-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
        <StatTile 
          id="pnl_revenue"
          label="صافي الإيرادات"
          value={data?.netRevenue.toLocaleString() || '0'}
          icon="💰"
          defaults={{ color: 'blue', size: 'tile-wd-sm', order: 1 }}
        />
        <StatTile 
          id="pnl_gross"
          label="إجمالي الربح"
          value={data?.grossProfit.toLocaleString() || '0'}
          icon="📈"
          defaults={{ color: 'emerald', size: 'tile-wd-sm', order: 2 }}
        />
        <StatTile 
          id="pnl_expenses"
          label="إجمالي المصروفات"
          value={data?.totalExpenses.toLocaleString() || '0'}
          icon="↘️"
          defaults={{ color: 'crimson', size: 'tile-wd-sm', order: 3 }}
        />
        <StatTile 
          id="pnl_net"
          label="صافي الربح النهائي"
          value={data?.netProfit.toLocaleString() || '0'}
          icon={data?.netProfit >= 0 ? '💎' : '⚠️'}
          defaults={{ color: data?.netProfit >= 0 ? 'emerald' : 'rose', size: 'tile-wd-sm', order: 4 }}
        />
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <h3>📊 فلترة التقرير المالي</h3>
          <div className="toolbar">
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select 
                className="form-control" 
                value={selectedBranchId} 
                onChange={(e) => setSelectedBranchId(e.target.value)}
                style={{ width: '180px', height: '40px' }}
                disabled={!Api.can('ROLE_ADMIN')}
              >
                <option value="">كل الفروع</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>

              <input 
                type="date" 
                className="form-control" 
                value={dateRange.start} 
                onChange={e => setDateRange({...dateRange, start: e.target.value})} 
                style={{ width: '160px', height: '40px' }}
              />
              <input 
                type="date" 
                className="form-control" 
                value={dateRange.end} 
                onChange={e => setDateRange({...dateRange, end: e.target.value})} 
                style={{ width: '160px', height: '40px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" onClick={fetchReport}>تحديث التقرير</button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        {/* Main Stats Chart */}
        <div className="card">
          <div className="card-header"><h3>🔄 الهيكل المالي</h3></div>
          <div className="card-body" style={{ height: '300px', width: '100%', minHeight: '300px' }}>
            <ResponsiveContainer width="99%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={mainStats}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value">
                  {mainStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="card">
          <div className="card-header"><h3>🍕 توزيع المصروفات</h3></div>
          <div className="card-body" style={{ height: '300px', width: '100%', minHeight: '300px' }}>
            {expenseData.length > 0 ? (
              <ResponsiveContainer width="99%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="text-center" style={{marginTop: '100px'}}>لا يوجد مصروفات في هذه الفترة</div>}
          </div>
        </div>
      </div>

      {/* Details Table */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header"><h3>📝 تفاصيل البنود</h3></div>
        <div className="card-body no-padding">
          <table className="data-table">
            <tbody>
              <tr>
                <td>إجمالي المبيعات (Sale Invoices)</td>
                <td className="text-success" dir="ltr">+{data.totalSales.toLocaleString()}</td>
              </tr>
              <tr>
                <td>إجمالي المرتجعات (Returns)</td>
                <td className="text-danger" dir="ltr">-{data.totalReturns.toLocaleString()}</td>
              </tr>
              <tr style={{ background: 'rgba(255,255,255,0.05)', fontWeight: 'bold' }}>
                <td>صافي الإيرادات (Net Revenue)</td>
                <td dir="ltr">{data.netRevenue.toLocaleString()}</td>
              </tr>
              <tr>
                <td>تكلفة البضاعة المباعة (COGS)</td>
                <td className="text-danger" dir="ltr">-{data.costOfGoodsSold.toLocaleString()}</td>
              </tr>
              <tr style={{ background: 'rgba(255,255,255,0.05)', fontWeight: 'bold' }}>
                <td>إجمالي الربح (Gross Profit)</td>
                <td dir="ltr">{data.grossProfit.toLocaleString()}</td>
              </tr>
              <tr>
                <td>إجمالي المصروفات (Expenses)</td>
                <td className="text-danger" dir="ltr">-{data.totalExpenses.toLocaleString()}</td>
              </tr>
              <tr>
                <td>خسائر التوالف (Damaged Goods)</td>
                <td className="text-danger" dir="ltr">-{data.totalDamagedLoss.toLocaleString()}</td>
              </tr>
              <tr style={{ background: 'var(--metro-green)', color: 'white', fontWeight: 'bold', fontSize: '1.2rem' }}>
                <td>صافي الربح النهائي (Net Profit)</td>
                <td dir="ltr">{data.netProfit.toLocaleString()} ج.م</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Partner Distribution Table */}
      {data.partnerShares && data.partnerShares.length > 0 && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header"><h3>💎 توزيع الأرباح على الشركاء (تقديري)</h3></div>
          <div className="card-body no-padding">
            <table className="data-table">
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
                    <td>{ps.partnerName}</td>
                    <td>{ps.sharePercentage}%</td>
                    <td className="text-success" style={{ fontWeight: 'bold' }}>{ps.profitAmount.toLocaleString()} ج.م</td>
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
