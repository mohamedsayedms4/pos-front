import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Api from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

const BranchDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [kpis, setKpis] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [charts, setCharts] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [dueInvoices, setDueInvoices] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [branchesList, setBranchesList] = useState([]);

  const [filterType, setFilterType] = useState('today');
  const [customDates, setCustomDates] = useState({ start: '', end: '' });
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [userName, setUserName] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  const getDates = () => {
    if (filterType === 'custom') {
      return { startDate: customDates.start, endDate: customDates.end };
    }
    const end = new Date();
    const start = new Date();
    if (filterType === 'week') {
      start.setDate(end.getDate() - 7);
    } else if (filterType === 'month') {
      start.setDate(1);
    }
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  };

  useEffect(() => {
    Api.getBranches().then(res => {
      setBranchesList(res.data || res || []);
    }).catch(err => console.error(err));

    const user = Api._getUser ? Api._getUser() : null;
    if (user && user.name) {
      setUserName(user.name);
    } else {
      setUserName('محمد');
    }
  }, []);

  useEffect(() => {
    if (filterType !== 'custom') {
      fetchDashboardData();
    }
  }, [filterType, selectedBranchId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    const { startDate, endDate } = getDates();
    const branchId = selectedBranchId ? selectedBranchId : null;
    
    try {
      const [
        kpiRes, alertsRes, chartsRes, transRes, prodRes, custRes, dueRes, stockRes, tableRes
      ] = await Promise.all([
        Api.getBranchDashboardKpis(startDate, endDate, branchId).catch(() => null),
        Api.getBranchDashboardAlerts(startDate, endDate, branchId).catch(() => []),
        Api.getBranchDashboardCharts(startDate, endDate, branchId).catch(() => null),
        Api.getLatestTransactions(startDate, endDate, branchId).catch(() => []),
        Api.getTopProducts(startDate, endDate, branchId).catch(() => []),
        Api.getTopCustomers(startDate, endDate, branchId).catch(() => []),
        Api.getDueInvoices(startDate, endDate, branchId).catch(() => []),
        Api.getLowStock(startDate, endDate, branchId).catch(() => []),
        Api.getBranchDashboardTable(startDate, endDate, branchId).catch(() => [])
      ]);
      
      setKpis(kpiRes);
      setAlerts(alertsRes || []);
      setCharts(chartsRes);
      setTransactions(transRes || []);
      setProducts(prodRes || []);
      setCustomers(custRes || []);
      setDueInvoices(dueRes || []);
      setLowStock(stockRes || []);
      setTableData(tableRes || []);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
      setLastUpdated(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading && !kpis) {
    return (
      <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', backgroundColor:'#f8fafc'}}>
        <div style={{fontSize:'1.25rem', color:'#64748b', fontWeight:'600'}}>جاري تحميل الداشبورد...</div>
      </div>
    );
  }

  return (
    <div className="bd-container">
      <style dangerouslySetInnerHTML={{__html: `
        .bd-container { min-height: 100vh; background-color: #f1f5f9; padding: 24px; font-family: sans-serif; direction: rtl; }
        .bd-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .bd-title { font-size: 1.5rem; font-weight: bold; color: #1e293b; margin: 0; }
        .bd-subtitle { font-size: 0.875rem; color: #64748b; margin-top: 4px; }
        .bd-filter-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .bd-input { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; font-size: 0.875rem; background-color: white; }
        .bd-btn-primary { background-color: #2563eb; color: white; padding: 8px 16px; border-radius: 8px; font-size: 0.875rem; border: none; cursor: pointer; transition: 0.2s; }
        .bd-btn-primary:hover { background-color: #1d4ed8; }
        .bd-btn-secondary { background-color: #f8fafc; color: #334155; padding: 8px 24px; border-radius: 8px; font-weight: 500; border: 1px solid #cbd5e1; cursor: pointer; transition: 0.2s; font-size: 0.875rem;}
        .bd-btn-secondary:hover { background-color: #f1f5f9; }

        .bd-kpi-banner { background-color: #2B82A9; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
        .bd-kpi-grid-primary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px; }
        .bd-kpi-grid-secondary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
        @media (min-width: 1024px) {
           .bd-kpi-grid-primary { grid-template-columns: repeat(4, 1fr); }
           .bd-kpi-grid-secondary { grid-template-columns: repeat(2, 1fr); }
        }
        .bd-kpi-card-hover { transition: all 0.2s ease-in-out; }
        .bd-kpi-card-hover.clickable { cursor: pointer; }
        .bd-kpi-card-hover.clickable:hover { transform: translateY(-2px); box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important; }
        
        .bd-kpi-card { background-color: white; border-radius: 8px; padding: 16px; text-align: center; }
        .bd-kpi-title { font-size: 0.75rem; color: #64748b; margin-bottom: 4px; }
        .bd-kpi-value { font-size: 1.25rem; font-weight: bold; color: #2B82A9; }
        .bd-kpi-currency { font-size: 0.875rem; font-weight: normal; }

        .bd-grid-row-1 { display: grid; grid-template-columns: 1fr; gap: 24px; margin-bottom: 24px; }
        @media (min-width: 1024px) { .bd-grid-row-1 { grid-template-columns: 3fr 3fr 6fr; } }
        .bd-grid-row-2 { display: grid; grid-template-columns: 1fr; gap: 24px; margin-bottom: 24px; }
        @media (min-width: 1024px) { .bd-grid-row-2 { grid-template-columns: repeat(3, 1fr); } }
        .bd-grid-row-3 { display: grid; grid-template-columns: 1fr; gap: 24px; margin-bottom: 32px; }
        @media (min-width: 1024px) { .bd-grid-row-3 { grid-template-columns: repeat(2, 1fr); } }

        .bd-card { background-color: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); border: 1px solid #e2e8f0; }
        .bd-card-scroll { max-height: 350px; overflow-y: auto; }
        .bd-card-title { font-size: 1.125rem; font-weight: bold; color: #1e293b; margin-bottom: 16px; margin-top: 0; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9; }

        .bd-alert { padding: 12px; border-radius: 8px; border-right: 4px solid; margin-bottom: 12px; }
        .bd-alert.CRITICAL { background-color: #fef2f2; border-color: #ef4444; color: #991b1b; }
        .bd-alert.WARNING { background-color: #fefce8; border-color: #eab308; color: #854d0e; }
        .bd-alert.INFO { background-color: #eff6ff; border-color: #3b82f6; color: #1e40af; }
        .bd-alert strong { display: block; font-size: 0.875rem; margin-bottom: 4px; }
        .bd-alert span { font-size: 0.75rem; }

        .bd-list-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
        .bd-list-item:last-child { border-bottom: none; }
        .bd-list-left { text-align: right; }
        .bd-list-right { text-align: left; }
        .bd-list-title { font-size: 0.875rem; font-weight: 600; color: #1e293b; margin-bottom: 4px; }
        .bd-list-sub { font-size: 0.75rem; color: #64748b; }
        .bd-list-value { font-size: 0.875rem; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
        .bd-badge { font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; display: inline-block; font-weight: 500;}
        .bd-badge.green { background-color: #f0fdf4; color: #16a34a; }
        .bd-badge.blue { background-color: #eff6ff; color: #2563eb; }
        .bd-badge.red { background-color: #fef2f2; color: #dc2626; }
        .bd-badge.orange { background-color: #fff7ed; color: #ea580c; }

        .bd-table { width: 100%; border-collapse: collapse; text-align: right; font-size: 0.875rem; }
        .bd-table th { color: #64748b; font-weight: normal; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
        .bd-table td { padding: 12px 8px; color: #334155; border-bottom: 1px solid #f8fafc; }
        .bd-table tr:last-child td { border-bottom: none; }
        .bd-table-red { color: #dc2626; font-weight: bold; }

        .bd-quick-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; background-color: white; padding: 20px; border-radius: 12px; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); border: 1px solid #e2e8f0; }
        .bd-map-container { height: 350px; border-radius: 8px; overflow: hidden; }

        .bd-empty-state { background-color: white; }
        .bd-empty-state-title { color: #1e293b; }
        .bd-empty-state-text { color: #64748b; }

        /* Dark Mode Overrides */
        [data-theme='dark'] .bd-container, .dark-mode .bd-container { background-color: #121212 !important; color: #f5f5f5 !important; }
        [data-theme='dark'] .bd-title, .dark-mode .bd-title { color: #f5f5f5 !important; }
        [data-theme='dark'] .bd-subtitle, .dark-mode .bd-subtitle { color: #a3a3a3 !important; }
        [data-theme='dark'] .bd-card, .dark-mode .bd-card { background-color: #1c1c1c !important; border-color: #2e2e2e !important; }
        [data-theme='dark'] .bd-card-title, .dark-mode .bd-card-title { color: #f5f5f5 !important; border-bottom-color: #2e2e2e !important; }
        [data-theme='dark'] .bd-kpi-banner, .dark-mode .bd-kpi-banner { background-color: #164e63 !important; }
        [data-theme='dark'] .bd-kpi-card, .dark-mode .bd-kpi-card { background-color: #1c1c1c !important; border-color: #2e2e2e !important; }
        [data-theme='dark'] .bd-kpi-card-title, .dark-mode .bd-kpi-card-title { color: #a3a3a3 !important; }
        [data-theme='dark'] .bd-kpi-card-value, .dark-mode .bd-kpi-card-value { color: #f5f5f5 !important; }
        [data-theme='dark'] .bd-input, .dark-mode .bd-input { background-color: #2e2e2e !important; color: #f5f5f5 !important; border-color: #3f3f3f !important; }
        [data-theme='dark'] .bd-input option, .dark-mode .bd-input option { background-color: #2e2e2e !important; color: #f5f5f5 !important; }
        [data-theme='dark'] .bd-btn-secondary, .dark-mode .bd-btn-secondary { background-color: #1c1c1c !important; color: #a3a3a3 !important; border-color: #2e2e2e !important; }
        [data-theme='dark'] .bd-btn-secondary:hover, .dark-mode .bd-btn-secondary:hover { background-color: #2e2e2e !important; }
        [data-theme='dark'] .bd-table th, .dark-mode .bd-table th { color: #a3a3a3 !important; border-bottom-color: #2e2e2e !important; }
        [data-theme='dark'] .bd-table td, .dark-mode .bd-table td { color: #f5f5f5 !important; border-bottom-color: #2e2e2e !important; }
        [data-theme='dark'] .bd-list-item, .dark-mode .bd-list-item { border-bottom-color: #2e2e2e !important; }
        [data-theme='dark'] .bd-list-title, .dark-mode .bd-list-title { color: #f5f5f5 !important; }
        [data-theme='dark'] .bd-list-value, .dark-mode .bd-list-value { color: #f5f5f5 !important; }
        [data-theme='dark'] .bd-empty-state, .dark-mode .bd-empty-state { background-color: #1c1c1c !important; border-color: #2e2e2e !important; }
        [data-theme='dark'] .bd-empty-state-title, .dark-mode .bd-empty-state-title { color: #f5f5f5 !important; }
        [data-theme='dark'] .bd-empty-state-text, .dark-mode .bd-empty-state-text { color: #a3a3a3 !important; }
        [data-theme='dark'] .bd-quick-actions, .dark-mode .bd-quick-actions { background-color: #1c1c1c !important; border-color: #2e2e2e !important; }
        [data-theme='dark'] .bd-alert.INFO, .dark-mode .bd-alert.INFO { background-color: #0f172a !important; border-color: #3b82f6 !important; color: #bfdbfe !important; }
        [data-theme='dark'] .bd-alert.WARNING, .dark-mode .bd-alert.WARNING { background-color: #422006 !important; border-color: #eab308 !important; color: #fef08a !important; }
        [data-theme='dark'] .bd-alert.CRITICAL, .dark-mode .bd-alert.CRITICAL { background-color: #450a0a !important; border-color: #ef4444 !important; color: #fecaca !important; }
      `}} />
      


      {loading && <div style={{textAlign:'center', color:'#2563eb', marginBottom:'16px'}}>جاري تحديث البيانات...</div>}

      {/* KPI Row (Blue Background Theme matching image) */}
      <div style={{ backgroundColor: '#218eb3', padding: '24px', marginBottom: '24px', borderRadius: '8px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 'bold', margin: '0', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', direction: 'rtl' }}>
                مرحباً {userName} <i className="fa-solid fa-hand-wave"></i>
              </h2>
              <button onClick={fetchDashboardData} style={{ backgroundColor: 'white', color: '#218eb3', padding: '6px 12px', borderRadius: '4px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                 تحديث البيانات ↻
              </button>
            </div>
            <div style={{ color: '#e0f2fe', fontSize: '0.875rem', marginTop: '8px' }}>
              هذا ملخص أعمالك ليوم {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {lastUpdated && <span style={{ marginRight: '16px', color: '#bae6fd' }}>آخر تحديث: {lastUpdated}</span>}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.1)', padding: '6px', borderRadius: '8px' }}>
             <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
                className="bd-input"
                style={{ border: 'none', padding: '6px 16px', backgroundColor: 'transparent', color: 'white', fontWeight: 'bold', cursor: 'pointer', outline: 'none' }}
              >
                <option value="today" style={{color: 'black'}}>اليوم</option>
                <option value="week" style={{color: 'black'}}>هذا الأسبوع</option>
                <option value="month" style={{color: 'black'}}>هذا الشهر</option>
                <option value="custom" style={{color: 'black'}}>تاريخ مخصص</option>
              </select>
              <span style={{color: '#93c5fd'}}>—</span>
              <select 
                value={selectedBranchId} 
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bd-input"
                style={{fontWeight: 'bold', border: 'none', padding: '6px 16px', backgroundColor: 'transparent', color: 'white', cursor: 'pointer', outline: 'none'}}
              >
                <option value="" style={{color: 'black'}}>جميع الفروع</option>
                {branchesList.map(b => (
                  <option key={b.id} value={b.id} style={{color: 'black'}}>{b.name}</option>
                ))}
              </select>
          </div>
        </div>
        
        {filterType === 'custom' && (
          <div style={{display:'flex', gap:'8px', marginBottom: '24px', justifyContent: 'flex-end', alignItems: 'center'}}>
            <span style={{color: 'white', fontSize: '0.875rem', fontWeight: 'bold'}}>من :</span>
            <input type="date" value={customDates.start} onChange={e => setCustomDates({...customDates, start: e.target.value})} className="bd-input" style={{ border: 'none', padding: '6px 12px' }}/>
            <span style={{color: 'white', fontSize: '0.875rem', fontWeight: 'bold', marginRight: '8px'}}>إلى :</span>
            <input type="date" value={customDates.end} onChange={e => setCustomDates({...customDates, end: e.target.value})} className="bd-input" style={{ border: 'none', padding: '6px 12px' }}/>
            <button onClick={fetchDashboardData} className="bd-btn-primary" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '6px 16px' }}>تطبيق</button>
          </div>
        )}

        {(!kpis || (kpis.todaySales === 0 && kpis.monthSales === 0 && alerts.length === 0 && transactions.length === 0)) ? (
           <div className="bd-empty-state" style={{ padding: '40px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}><i className="fa-solid fa-mailbox"></i></div>
              <h3 className="bd-empty-state-title" style={{ fontSize: '1.25rem', marginBottom: '8px', fontWeight: 'bold' }}>لا توجد معاملات مسجلة اليوم</h3>
              <p className="bd-empty-state-text" style={{ marginBottom: '24px' }}>ابدأ بإضافة فاتورة بيع أو مصروف لعرض البيانات هنا.</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                 <button onClick={() => navigate('/sales/new')} className="bd-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                    <i className="fa-solid fa-receipt"></i> إضافة فاتورة بيع
                 </button>
                 <button onClick={() => navigate('/expenses')} className="bd-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                    <i className="fa-solid fa-money-bill-wave"></i> إضافة مصروف
                 </button>
              </div>
           </div>
        ) : (
          <>
            <div className="bd-kpi-grid-primary">
              <KpiCard title="النقدية المتاحة" value={0} iconBg="#dcfce7" iconColor="#16a34a" iconEmoji="" trendType="up" trendText="موجب عن أمس" />
              <KpiCard title="مبيعات اليوم" value={kpis?.todaySales || 0} iconBg="#ede9fe" iconColor="#8b5cf6" iconEmoji="️" trendType={(kpis?.todaySales === 0 && kpis?.yesterdaySales === 0) ? 'neutral' : 'up'} trendText={(kpis?.todaySales === 0 && kpis?.yesterdaySales === 0) ? 'لا توجد مبيعات للمقارنة' : `${(kpis?.salesChangePercentage || 0).toFixed(1)}% عن أمس`} />
              <KpiCard title="مصروفات هذا الشهر" value={0} iconBg="#fee2e2" iconColor="#dc2626" iconEmoji="" trendType="down" trendText="هذا الشهر" onClick={() => navigate('/reports')} />
              <KpiCard title="صافي الربح" value={kpis?.grossProfit || 0} iconBg="#ecfdf5" iconColor="#059669" iconEmoji="" trendType="up" trendText="موجب عن أمس" />
            </div>
            <div className="bd-kpi-grid-secondary">
              <KpiCard title="مستحقات حتى اليوم" value={0} iconBg="#ffedd5" iconColor="#ea580c" iconEmoji="" trendType="neutral" trendText="لا تغيير" onClick={() => navigate('/crm/customers')} />
              <KpiCard title="مبيعات هذا الشهر" value={kpis?.monthSales || 0} iconBg="#e0f2fe" iconColor="#0284c7" iconEmoji="" trendType={(kpis?.monthSales === 0 && kpis?.lastMonthSales === 0) ? 'neutral' : 'up'} trendText={(kpis?.monthSales === 0 && kpis?.lastMonthSales === 0) ? 'لا توجد مبيعات للمقارنة' : `${(kpis?.monthSalesChangePercentage || 0).toFixed(1)}% عن الشهر الماضي`} />
            </div>
          </>
        )}
      </div>

      <div className="bd-grid-row-1">
        
        {/* Live Alerts */}
        <div className="bd-card bd-card-scroll">
          <h2 className="bd-card-title">التنبيهات الحية</h2>
          {alerts.length === 0 ? (
            <div style={{textAlign:'center', color:'#94a3b8', padding:'40px 0'}}>لا توجد تنبيهات حالياً</div>
          ) : (
            <div>
              {alerts.map((a, i) => (
                <div key={i} className={`bd-alert ${a.severity}`}>
                  <strong>{a.branchName}</strong>
                  <span>{a.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sales by Category/Type */}
        <div className="bd-card">
          <h2 className="bd-card-title" style={{textAlign:'center'}}>المبيعات حسب نوع الفرع</h2>
          <div style={{width:'100%', height:'250px'}}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={charts?.salesByType || []} dataKey="sales" nameKey="type" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                  {(charts?.salesByType || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(val) => val + ' ج.م'} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales Trend */}
        <div className="bd-card">
          <h2 className="bd-card-title">المبيعات خلال الفترة</h2>
          <div style={{width:'100%', height:'280px'}}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts?.salesTrend || []} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false}/>
                <YAxis tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} tickFormatter={(val) => val/1000 + 'k'}/>
                <RechartsTooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  formatter={(val) => [val.toLocaleString() + ' ج.م', 'المبيعات']}
                />
                <Line type="monotone" dataKey="sales" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div className="bd-grid-row-2">
        
        {/* Latest Transactions */}
        <div className="bd-card">
          <h2 className="bd-card-title">أحدث العمليات (Transactions)</h2>
          {transactions.map((t, i) => (
            <div key={i} className="bd-list-item">
              <div className="bd-list-left">
                <div className="bd-list-value">{t.amount.toLocaleString()} ج.م</div>
                <div className="bd-list-sub">{new Date(t.date).toLocaleDateString()}</div>
              </div>
              <div className="bd-list-right">
                <div className="bd-list-title">{t.customerName}</div>
                <div className="bd-badge green">{t.invoiceCode}</div>
              </div>
            </div>
          ))}
          {transactions.length === 0 && <div style={{textAlign:'center', color:'#94a3b8', padding:'20px 0'}}>لا توجد بيانات</div>}
        </div>

        {/* Top Products */}
        <div className="bd-card">
          <h2 className="bd-card-title">الأكثر مبيعاً (Top Products)</h2>
          {products.map((p, i) => (
            <div key={i} className="bd-list-item">
              <div className="bd-list-left">
                <div className="bd-list-title">{p.productName}</div>
                <div className="bd-list-sub">{p.soldQuantity} مبيعاً - {p.totalValue.toLocaleString()} ج.م</div>
              </div>
              <div className="bd-list-right">
                <div className="bd-badge blue">متوفر</div>
              </div>
            </div>
          ))}
          {products.length === 0 && <div style={{textAlign:'center', color:'#94a3b8', padding:'20px 0'}}>لا توجد بيانات</div>}
        </div>

        {/* Top Customers */}
        <div className="bd-card">
          <h2 className="bd-card-title">كبار العملاء (Top Customers)</h2>
          {customers.map((c, i) => (
            <div key={i} className="bd-list-item">
              <div className="bd-list-left">
                <div className="bd-list-title">{c.customerName}</div>
                <div className="bd-list-sub">{c.invoicesCount} فواتير</div>
              </div>
              <div className="bd-list-right">
                <div className="bd-list-value">{c.totalPurchases.toLocaleString()} ج.م</div>
              </div>
            </div>
          ))}
          {customers.length === 0 && <div style={{textAlign:'center', color:'#94a3b8', padding:'20px 0'}}>لا توجد بيانات</div>}
        </div>

      </div>

      <div className="bd-grid-row-3">
        
        {/* Low Stock */}
        <div className="bd-card">
          <h2 className="bd-card-title">أقل المنتجات في المخزون</h2>
          <table className="bd-table">
            <thead>
              <tr>
                <th>المنتج</th>
                <th>المخزون الحالي</th>
                <th>الفرع</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map((s, i) => (
                <tr key={i}>
                  <td style={{fontWeight:500}}>{s.productName}</td>
                  <td className="bd-table-red">{s.currentStock}</td>
                  <td>{s.branchName}</td>
                  <td><span className="bd-badge red">منخفض</span></td>
                </tr>
              ))}
              {lowStock.length === 0 && <tr><td colSpan="4" style={{textAlign:'center', padding:'20px'}}>لا يوجد منتجات منخفضة</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Due Invoices */}
        <div className="bd-card">
          <h2 className="bd-card-title">أحدث الفواتير المستحقة</h2>
          <table className="bd-table">
            <thead>
              <tr>
                <th>العميل</th>
                <th>تاريخ الاستحقاق</th>
                <th>المبلغ</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {dueInvoices.map((d, i) => (
                <tr key={i}>
                  <td style={{fontWeight:500}}>{d.customerName}</td>
                  <td>{d.dueDate}</td>
                  <td style={{fontWeight:600}}>{d.amountDue.toLocaleString()} ج.م</td>
                  <td><span className="bd-badge orange">قريب الاستحقاق</span></td>
                </tr>
              ))}
              {dueInvoices.length === 0 && <tr><td colSpan="4" style={{textAlign:'center', padding:'20px'}}>لا توجد ديون مستحقة</td></tr>}
            </tbody>
          </table>
        </div>

      </div>

      {/* Branch Performance Table */}
      <div className="bd-card" style={{marginBottom: '32px'}}>
        <h2 className="bd-card-title">أداء الفروع</h2>
        <div style={{overflowX: 'auto'}}>
          <table className="bd-table">
            <thead>
              <tr>
                <th>اسم الفرع</th>
                <th>الحالة</th>
                <th>مبيعات اليوم</th>
                <th>مبيعات الشهر</th>
                <th>الأرباح</th>
                <th>عدد الفواتير</th>
                <th>قيمة المخزون</th>
                <th>التنبيهات</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((b, i) => (
                <tr key={i} onClick={() => navigate(`/branches/${b.branchId}/manage`)} style={{cursor: 'pointer'}}>
                  <td style={{fontWeight: 'bold', color: '#1e293b'}}>{b.name}</td>
                  <td><span className={`bd-badge ${b.status === 'نشط' ? 'green' : 'red'}`}>{b.status}</span></td>
                  <td style={{fontWeight: '600'}}>{(b.todaySales || 0).toLocaleString()} ج.م</td>
                  <td>{(b.monthSales || 0).toLocaleString()} ج.م</td>
                  <td style={{color: '#16a34a', fontWeight: 'bold'}}>{(b.profit || 0).toLocaleString()} ج.م</td>
                  <td>{b.invoices}</td>
                  <td>{(b.inventoryValue || 0).toLocaleString()} ج.م</td>
                  <td>
                    {b.alertsCount > 0 ? <span className="bd-badge red">{b.alertsCount} تنبيه</span> : <span className="bd-badge green">سليم</span>}
                  </td>
                </tr>
              ))}
              {tableData.length === 0 && <tr><td colSpan="8" style={{textAlign:'center', padding:'20px'}}>لا توجد بيانات للفروع</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Map Section */}
      <div className="bd-card" style={{marginBottom: '32px'}}>
        <h2 className="bd-card-title">خريطة الفروع ومبيعات اليوم</h2>
        <div className="bd-map-container">
          <MapContainer center={[30.0444, 31.2357]} zoom={6} style={{ height: '100%', width: '100%', zIndex: 1 }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
            {tableData.filter(b => b.geoLat && b.geoLng).map((b) => (
              <Marker key={b.branchId} position={[b.geoLat, b.geoLng]}>
                <Popup>
                  <strong>{b.name}</strong><br/>
                  مبيعات الفترة: {(b.todaySales || 0).toLocaleString()} ج.م
                </Popup>
              </Marker>
            ))}
            {tableData.filter(b => b.geoLat && b.geoLng).length === 0 && (
              <Marker position={[30.0444, 31.2357]}>
                <Popup>الفرع الرئيسي (افتراضي) - مبيعات: {(kpis?.todaySales || 0).toLocaleString()} ج.م</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      </div>

      {/* Quick Actions Footer */}
      <div className="bd-quick-actions">
        <button onClick={() => navigate('/sales/new')} className="bd-btn-secondary">فاتورة بيع</button>
        <button onClick={() => navigate('/purchases/new')} className="bd-btn-secondary">فاتورة شراء</button>
        <button onClick={() => navigate('/inventory/products')} className="bd-btn-secondary">إضافة منتج</button>
        <button onClick={() => navigate('/crm/customers')} className="bd-btn-secondary">إضافة عميل</button>
        <button onClick={() => navigate('/reports')} className="bd-btn-secondary" style={{borderColor:'#3b82f6', color:'#3b82f6'}}>عرض التقارير</button>
      </div>



    </div>
  );
};

const KpiCard = ({ title, value, isNumber, iconBg, iconColor, iconEmoji, trendType, trendText, onClick }) => (
  <div 
    className={`bd-kpi-card bd-kpi-card-hover ${onClick ? 'clickable' : ''}`}
    onClick={onClick}
    style={{ borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '130px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
  >
    
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div className="bd-kpi-card-title" style={{ fontSize: '0.875rem', fontWeight: '500' }}>{title}</div>
      <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: iconBg || '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
        {iconEmoji ? iconEmoji : <div style={{ width: '14px', height: '14px', backgroundColor: iconColor || '#cbd5e1', borderRadius: '2px' }}></div>}
      </div>
    </div>

    <div style={{ marginTop: '16px', display: 'flex', alignItems: 'baseline', justifyContent: 'flex-start', gap: '4px' }}>
      <span className="bd-kpi-card-value" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
        {value ? Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
      </span>
      {!isNumber && <span className="bd-kpi-card-title" style={{ fontSize: '0.75rem' }}>ج.م</span>}
    </div>

    <div style={{ marginTop: '8px', fontSize: '0.75rem', color: trendType === 'up' ? '#16a34a' : trendType === 'down' ? '#dc2626' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '4px' }}>
       {trendType === 'up' && <span>↑</span>}
       {trendType === 'down' && <span>↓</span>}
       {trendType === 'neutral' && <span>—</span>}
       <span style={{ color: trendText === 'لا توجد مبيعات للمقارنة' ? '#94a3b8' : 'inherit' }}>{trendText || 'لا تغيير'}</span>
    </div>
  </div>
);

export default BranchDashboard;
