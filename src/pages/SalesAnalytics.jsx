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

// ─── Sub-Component: Analytics Widget Wrapper ───
const AnalyticsWidget = ({ title, icon, children, date, onDateChange, loading }) => (
  <div className="card" style={{ padding: '20px', position: 'relative', minHeight: '350px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
      <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '1.2rem' }}>{icon}</span> {title}
      </h4>
      <input 
        type="date" 
        className="form-control" 
        value={date} 
        onChange={(e) => onDateChange(e.target.value)} 
        style={{ width: '135px', padding: '4px 8px', fontSize: '0.85rem' }}
      />
    </div>
    {loading && (
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10, borderRadius: '8px' }}>
        <div className="spinner-border text-primary" style={{ width: '2rem', height: '2rem' }}></div>
      </div>
    )}
    <div style={{ pointerEvents: loading ? 'none' : 'auto', opacity: loading ? 0.6 : 1, transition: 'all 0.3s ease' }}>
        {children}
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

  return (
    <div className="page-section">
      <div className="card-header" style={{ marginBottom: '20px' }}>
        <h3>📊 تحليلات المبيعات الذكية (Widgets)</h3>
      </div>

      {/* ─── Global Stats Card ─── */}
      {summary && (
        <>
        <div className="stat-cards-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', flexDirection: 'row' }}>
            <div className="card" style={{ padding: '15px', borderLeft: '4px solid var(--metro-blue)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>مبيعات اليوم</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{Number(summary.todayTotalSales).toLocaleString()} <small>ج.م</small></div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)' }}>{summary.todayInvoiceCount} فاتورة</div>
            </div>
            <div className="card" style={{ padding: '15px', borderLeft: '4px solid var(--metro-green)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>المحصل نقداً</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--metro-green)' }}>{Number(summary.todayCollectedCash).toLocaleString()}</div>
            </div>
            <div className="card" style={{ padding: '15px', borderLeft: '4_px solid var(--metro-orange)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>المبيعات الآجلة</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--metro-orange)' }}>{Number(summary.todayCreditSales).toLocaleString()}</div>
            </div>
            <div className="card" style={{ padding: '15px', borderLeft: '4px solid var(--metro-purple)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>المرتجعات (اليوم)</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--metro-purple)' }}>
                    {Number(returnData.filter(r => r.returnDate === todayStr).reduce((acc, c) => acc + c.totalRefund, 0)).toLocaleString()}
                </div>
            </div>
        </div>

        {/* 30 Day Trend Chart */}
        <div className="card" style={{ padding: '20px', marginBottom: '25px' }}>
            <h4 style={{ marginBottom: '15px' }}>📈 اتجاه المبيعات (30 يوم)</h4>
            <div style={{ height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart data={summary.dailyTrend.reduce((acc, curr) => {
                        const existing = acc.find(a => a.date === curr.saleDate);
                        if (existing) existing.total += curr.totalAmount;
                        else acc.push({ date: curr.saleDate, total: curr.totalAmount });
                        return acc;
                    }, []).slice(-30)}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                        <XAxis dataKey="date" tick={{fontSize: 10}} tickFormatter={(v) => v.split('-').slice(1).join('/')} />
                        <Tooltip contentStyle={{backgroundColor: '#1a1a1a', border: '1px solid #333'}} />
                        <Area type="monotone" dataKey="total" stroke="var(--metro-blue)" fill="rgba(0,120,215,0.1)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
        </>
      )}

      {/* ─── Widgets Grid ─── */}
      <div className="widgets-2-column-grid">
        
        {/* Hourly Trend Widget */}
        <AnalyticsWidget title="أوقات الذروة" icon="🕒" date={hourlyDate} onDateChange={setHourlyDate} loading={hourlyLoading}>
            <div style={{ height: '250px' }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={Array.from({length: 24}, (_, i) => {
                        const d = hourlyData.find(h => h.saleHour === i);
                        return { hour: `${i}:00`, count: d ? d.invoiceCount : 0 };
                    })}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                        <XAxis dataKey="hour" tick={{fontSize: 9}} />
                        <Tooltip contentStyle={{backgroundColor: '#1a1a1a'}} />
                        <Bar dataKey="count" fill="var(--metro-purple)" radius={[4, 4, 0, 0]} barSize={15} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </AnalyticsWidget>

        <AnalyticsWidget title="الأكثر مبيعاً" icon="🏆" date={productDate} onDateChange={setProductDate} loading={productLoading}>
            <div className="table-wrapper" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <table className="data-table">
                    <thead>
                        <tr><th>المنتج</th><th>الكمية</th><th>العائد</th></tr>
                    </thead>
                    <tbody>
                        {productData.map((p, i) => (
                            <tr key={i}>
                                <td>{p.productName}</td>
                                <td>{Number(p.totalQuantity).toFixed(1)}</td>
                                <td style={{ color: 'var(--metro-blue)', fontWeight: 700 }}>{Number(p.totalRevenue).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AnalyticsWidget>

        {/* Cashier Stats Widget */}
        <AnalyticsWidget title="أداء الموظفين" icon="👥" date={cashierDate} onDateChange={setCashierDate} loading={cashierLoading}>
            <div className="table-wrapper" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <table className="data-table">
                    <thead>
                        <tr><th>الموظف</th><th>الفواتير</th><th>كاش</th><th>آجل</th></tr>
                    </thead>
                    <tbody>
                        {cashierData.filter(c => c.saleDate === cashierDate).map((s, i) => (
                            <tr key={i}>
                                <td>{s.cashierName}</td>
                                <td>{s.invoiceCount}</td>
                                <td style={{ color: 'var(--accent-emerald)' }}>{Number(s.totalPaid).toLocaleString()}</td>
                                <td style={{ color: 'var(--metro-red)' }}>{Number(s.totalRemaining).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AnalyticsWidget>

        {/* Returns Widget */}
        <AnalyticsWidget title="المرتجعات" icon="📦" date={returnDate} onDateChange={setReturnDate} loading={returnLoading}>
             <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <div className="card" style={{ flex: 1, padding: '15px', textAlign: 'center', background: 'rgba(255,255,255,0.03)', minWidth: '140px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>عدد المرتجعات</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{returnData.reduce((acc, c) => acc + c.returnCount, 0)}</div>
                </div>
                <div className="card" style={{ flex: 1, padding: '15px', textAlign: 'center', background: 'rgba(255,162,0,0.03)', minWidth: '140px', borderLeft: '3px solid var(--metro-red)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>إجمالي المبالغ</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--metro-red)' }}>{Number(returnData.reduce((acc, c) => acc + c.totalRefund, 0)).toLocaleString()}</div>
                </div>
            </div>
            {/* Simple sparkline if multiple dates present in returnData else message */}
            <div style={{ marginTop: '15px', fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'center' }}>
                إحصائيات دقيقة مرتكزة على إجمالي الحركات المسجلة
            </div>
        </AnalyticsWidget>

      </div>
    </div>
  );
};

export default SalesAnalytics;
