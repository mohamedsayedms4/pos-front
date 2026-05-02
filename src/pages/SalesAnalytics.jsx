import React, { useState, useEffect, useCallback } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import '../styles/pages/SalesAnalyticsPremium.css';

// ─── Sub-Component: Analytics Widget Wrapper ───
const AnalyticsWidget = ({ title, icon, children, date, onDateChange, loading }) => (
  <div className="san-widget">
    <div className="san-widget-header">
      <div className="san-widget-title">
        <i className={icon}></i>
        <h3>{title}</h3>
      </div>
      <input 
        type="date" 
        className="san-date-input" 
        value={date} 
        onChange={(e) => onDateChange(e.target.value)} 
      />
    </div>
    
    {loading && (
      <div className="san-loader-overlay">
        <div className="spinner-border text-primary" style={{ width: '2.5rem', height: '2.5rem' }}></div>
      </div>
    )}

    <div style={{ opacity: loading ? 0.3 : 1, transition: 'all 0.3s ease' }}>
        {children}
    </div>
  </div>
);

const KPICard = ({ label, value, trend, icon, color }) => (
    <div className="san-kpi-card">
        <div className="san-kpi-icon" style={{ background: `rgba(${color}, 0.1)`, color: `rgb(${color})` }}>
            <i className={icon}></i>
        </div>
        <div className="san-kpi-info">
            <span className="label">{label}</span>
            <div className="value">{value}</div>
            {trend && (
                <div className="trend" style={{ color: trend.startsWith('+') ? 'var(--san-accent-emerald)' : 'var(--san-accent-rose)' }}>
                    <i className={`fas fa-arrow-${trend.startsWith('+') ? 'up' : 'down'}`}></i>
                    {trend}
                </div>
            )}
        </div>
    </div>
);

const SalesAnalytics = () => {
  const { toast } = useGlobalUI();
  const todayStr = new Date().toISOString().split('T')[0];

  // Global Stat State (Summary)
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Widget States
  const [hourlyDate, setHourlyDate] = useState(todayStr);
  const [hourlyData, setHourlyData] = useState([]);
  const [hourlyLoading, setHourlyLoading] = useState(false);

  const [cashierDate, setCashierDate] = useState(todayStr);
  const [cashierData, setCashierData] = useState([]);
  const [cashierLoading, setCashierLoading] = useState(false);

  const [productDate, setProductDate] = useState(todayStr);
  const [productData, setProductData] = useState([]);
  const [productLoading, setProductLoading] = useState(false);

  const [returnDate, setReturnDate] = useState(todayStr);
  const [returnData, setReturnData] = useState([]);
  const [returnLoading, setReturnLoading] = useState(false);

  // Loaders
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await Api.getSalesSummary();
      setSummary(res);
    } catch (err) { toast(err.message, 'error'); }
    finally { setSummaryLoading(false); }
  }, [toast]);

  const loadHourly = useCallback(async (date) => {
    setHourlyLoading(true);
    try {
      const res = await Api.getHourlyAnalytics(date);
      setHourlyData(res);
    } catch (err) { toast(err.message, 'error'); }
    finally { setHourlyLoading(false); }
  }, [toast]);

  const loadCashiers = useCallback(async (date) => {
    setCashierLoading(true);
    try {
      const res = await Api.getCashierAnalytics(date);
      setCashierData(res);
    } catch (err) { toast(err.message, 'error'); }
    finally { setCashierLoading(false); }
  }, [toast]);

  const loadProducts = useCallback(async (date) => {
    setProductLoading(true);
    try {
      const res = await Api.getProductAnalytics(date);
      setProductData(res);
    } catch (err) { toast(err.message, 'error'); }
    finally { setProductLoading(false); }
  }, [toast]);

  const loadReturns = useCallback(async (date) => {
    setReturnLoading(true);
    try {
      const res = await Api.getReturnAnalytics(date);
      setReturnData(res);
    } catch (err) { toast(err.message, 'error'); }
    finally { setReturnLoading(false); }
  }, [toast]);

  // Effects
  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { loadHourly(hourlyDate); }, [hourlyDate, loadHourly]);
  useEffect(() => { loadCashiers(cashierDate); }, [cashierDate, loadCashiers]);
  useEffect(() => { loadProducts(productDate); }, [productDate, loadProducts]);
  useEffect(() => { loadReturns(returnDate); }, [returnDate, loadReturns]);

  if (summaryLoading && !summary) return <Loader message="جاري تجهيز لوحة التحليلات..." />;

  const trendData = summary?.dailyTrend?.reduce((acc, curr) => {
      const existing = acc.find(a => a.date === curr.saleDate);
      if (existing) existing.total += curr.totalAmount;
      else acc.push({ date: curr.saleDate, total: curr.totalAmount });
      return acc;
  }, []).slice(-30) || [];

  return (
    <div className="san-page-container">
      {/* HEADER */}
      <div className="san-header-container">
        <h1>إحصائيات المبيعات الذكية</h1>
      </div>

      {/* KPI GRID */}
      {summary && (
        <div className="san-kpi-grid">
            <KPICard 
                label="مبيعات اليوم" 
                value={`${Number(summary.todayTotalSales).toLocaleString()} ج.م`}
                trend="+12%"
                icon="fas fa-sack-dollar"
                color="59, 130, 246"
            />
            <KPICard 
                label="المحصل كاش" 
                value={`${Number(summary.todayCollectedCash).toLocaleString()} ج.م`}
                icon="fas fa-money-bill-wave"
                color="16, 185, 129"
            />
            <KPICard 
                label="المبيعات الآجلة" 
                value={`${Number(summary.todayCreditSales).toLocaleString()} ج.م`}
                icon="fas fa-clock"
                color="245, 158, 11"
            />
            <KPICard 
                label="فواتير اليوم" 
                value={summary.todayInvoiceCount}
                icon="fas fa-file-invoice"
                color="139, 92, 246"
            />
        </div>
      )}

      {/* MAIN TREND CHART */}
      <div className="san-main-chart-card">
          <div className="san-chart-header">
              <h2>📈 اتجاه المبيعات (آخر 30 يوم)</h2>
          </div>
          <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                      <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--san-primary)" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="var(--san-primary)" stopOpacity={0}/>
                          </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--san-glass-border)" />
                      <XAxis 
                        dataKey="date" 
                        tick={{fontSize: 11, fill: 'var(--san-text-secondary)'}} 
                        tickFormatter={(v) => v.split('-').slice(1).join('/')}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{fontSize: 11, fill: 'var(--san-text-secondary)'}}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => v >= 1000 ? `${v/1000}k` : v}
                      />
                      <Tooltip 
                        contentStyle={{ 
                            backgroundColor: 'var(--san-card-bg)', 
                            border: '1px solid var(--san-glass-border)',
                            borderRadius: '12px',
                            boxShadow: 'var(--san-shadow)',
                            color: 'var(--san-text-primary)'
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="total" 
                        stroke="var(--san-primary)" 
                        fillOpacity={1} 
                        fill="url(#colorTotal)" 
                        strokeWidth={3} 
                        animationDuration={1500}
                      />
                  </AreaChart>
              </ResponsiveContainer>
          </div>
      </div>

      {/* WIDGETS GRID */}
      <div className="san-widgets-grid">
        
        {/* Hourly Trend Widget */}
        <AnalyticsWidget title="أوقات الذروة (يومي)" icon="fas fa-history" date={hourlyDate} onDateChange={setHourlyDate} loading={hourlyLoading}>
            <div style={{ height: '280px', marginTop: '10px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Array.from({length: 24}, (_, i) => {
                        const d = hourlyData.find(h => h.saleHour === i);
                        return { hour: `${i}:00`, count: d ? d.invoiceCount : 0 };
                    })}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--san-glass-border)" />
                        <XAxis dataKey="hour" tick={{fontSize: 10, fill: 'var(--san-text-secondary)'}} axisLine={false} tickLine={false} />
                        <Tooltip 
                            cursor={{fill: 'rgba(255,255,255,0.05)'}}
                            contentStyle={{ 
                                backgroundColor: 'var(--san-card-bg)', 
                                border: '1px solid var(--san-glass-border)',
                                borderRadius: '12px'
                            }} 
                        />
                        <Bar dataKey="count" fill="var(--san-accent-blue)" radius={[6, 6, 0, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </AnalyticsWidget>

        {/* Top Products Widget */}
        <AnalyticsWidget title="الأكثر مبيعاً" icon="fas fa-crown" date={productDate} onDateChange={setProductDate} loading={productLoading}>
            <div className="san-table-wrapper" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                <table className="san-table">
                    <thead>
                        <tr><th>المنتج</th><th>الكمية</th><th>العائد</th></tr>
                    </thead>
                    <tbody>
                        {productData.map((p, i) => (
                            <tr key={i}>
                                <td style={{ fontWeight: 600 }}>{p.productName}</td>
                                <td><span style={{ color: 'var(--san-text-secondary)' }}>{Number(p.totalQuantity).toFixed(1)}</span></td>
                                <td style={{ color: 'var(--san-primary)', fontWeight: 800 }}>{Number(p.totalRevenue).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AnalyticsWidget>

        {/* Cashier Stats Widget */}
        <AnalyticsWidget title="أداء الموظفين" icon="fas fa-users" date={cashierDate} onDateChange={setCashierDate} loading={cashierLoading}>
            <div className="san-table-wrapper" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                <table className="san-table">
                    <thead>
                        <tr><th>الموظف</th><th>الفواتير</th><th>كاش</th><th>آجل</th></tr>
                    </thead>
                    <tbody>
                        {cashierData.filter(c => c.saleDate === cashierDate).map((s, i) => (
                            <tr key={i}>
                                <td style={{ fontWeight: 600 }}>{s.cashierName}</td>
                                <td>{s.invoiceCount}</td>
                                <td style={{ color: 'var(--san-accent-emerald)', fontWeight: 700 }}>{Number(s.totalPaid).toLocaleString()}</td>
                                <td style={{ color: 'var(--san-accent-rose)', fontWeight: 700 }}>{Number(s.totalRemaining).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AnalyticsWidget>

        {/* Returns Widget */}
        <AnalyticsWidget title="المرتجعات" icon="fas fa-undo-alt" date={returnDate} onDateChange={setReturnDate} loading={returnLoading}>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
                <div style={{ padding: '24px', textAlign: 'center', background: 'var(--san-bg-dark)', borderRadius: '20px', border: '1px solid var(--san-glass-border)' }}>
                    <div style={{ color: 'var(--san-text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>عدد المرتجعات</div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 800 }}>{returnData.reduce((acc, c) => acc + c.returnCount, 0)}</div>
                </div>
                <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(244, 63, 94, 0.05)', borderRadius: '20px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                    <div style={{ color: 'var(--san-accent-rose)', fontSize: '0.85rem', marginBottom: '8px' }}>إجمالي المبالغ</div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--san-accent-rose)' }}>{Number(returnData.reduce((acc, c) => acc + c.totalRefund, 0)).toLocaleString()}</div>
                </div>
            </div>
            <div style={{ marginTop: '30px', padding: '15px', borderRadius: '12px', background: 'var(--san-bg-dark)', color: 'var(--san-text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
                <i className="fas fa-shield-alt" style={{ marginLeft: '8px' }}></i>
                يتم تحديث البيانات لحظياً بناءً على الحركات المسجلة
            </div>
        </AnalyticsWidget>

      </div>
    </div>
  );
};

export default SalesAnalytics;
