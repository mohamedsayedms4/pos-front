import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Api from '../services/api';
import Loader from '../components/common/Loader';
import { useGlobalUI } from '../components/common/GlobalUI';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList
} from 'recharts';

const ProductAnalytics = () => {
  const navigate = useNavigate();
  const { toast } = useGlobalUI();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Design-specific data
  const [latest, setLatest] = useState([]);
  const [viewed, setViewed] = useState([]);
  const [expensive, setExpensive] = useState([]);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [statData, latestData, viewedData, priceyData] = await Promise.all([
          Api.getProductStatistics(),
          Api.getProductsPaged(0, 5, '', 'id,desc'),
          Api.getProductsPaged(0, 5, '', 'viewCount,desc'),
          Api.getProductsPaged(0, 5, '', 'purchasePrice,desc')
        ]);
        
        setStats(statData);
        setLatest(latestData?.items || []);
        setViewed(viewedData?.items || []);
        setExpensive(priceyData?.items || []);
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  if (loading) return <Loader message="جاري تحميل التحليلات..." />;

  const pieData = stats ? [
    { name: 'متوفر', value: stats.totalProducts - (stats.outOfStockCount || 0) - (stats.lowStockCount || 0), color: '#00b0ff' },
    { name: 'منخفض', value: stats.lowStockCount || 0, color: '#fbbf24' },
    { name: 'نفد', value: stats.outOfStockCount || 0, color: '#f87171' },
  ] : [];

  const topSellingData = (stats?.topSellingProducts || []).map(p => ({
    name: p.name,
    sales: p.soldQuantity || 0
  }));

  return (
    <div className="page-section animate-fade-in">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', border: 'none' }}>
        <h2 style={{ margin: 0, fontWeight: '300', letterSpacing: '1px' }}>📊 تحليلات المنتجات</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/products')}>← عودة</button>
      </div>

      {/* KPI TILES GRID — Compact Style (Like Categories) */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card azure tile-sq-sm">
          <div className="stat-value" style={{ fontSize: '1.4rem' }}>{stats?.totalProducts || 0}</div>
          <div className="stat-label">إجمالي المنتجات</div>
          <div className="stat-icon">▨</div>
        </div>

        <div className="stat-card forest tile-wd-sm">
          <div className="stat-value" style={{ fontSize: '1.4rem' }}>
            {Number(stats?.totalInventoryCapital || 0).toLocaleString()} 
            <span style={{ fontSize: '0.9rem', opacity: 0.7, marginRight: '5px' }}>ج.م</span>
          </div>
          <div className="stat-label">قيمة المخزون (شراء)</div>
          <div className="stat-icon">▧</div>
        </div>

        <div className="stat-card deep-purple tile-sq-sm">
          <div className="stat-value" style={{ fontSize: '1.4rem' }}>
            {Number(stats?.totalExpectedProfit || 0).toLocaleString()} 
            <span style={{ fontSize: '0.9rem', opacity: 0.7, marginRight: '5px' }}>ج.م</span>
          </div>
          <div className="stat-label">الأرباح المتوقعة</div>
          <div className="stat-icon">◈</div>
        </div>

        <div className="stat-card sky tile-wd-sm">
          <div className="stat-value" style={{ fontSize: '1.4rem' }}>
            {Number(stats?.totalRealizedProfit || 0).toLocaleString()} 
            <span style={{ fontSize: '0.9rem', opacity: 0.7, marginRight: '5px' }}>ج.م</span>
          </div>
          <div className="stat-label">الأرباح المحققة</div>
          <div className="stat-icon">▤</div>
        </div>
      </div>

      {/* 2x2 ANALYTICS GRID */}
      <div className="analytics-grid">
        
        {/* 1. LATEST ADDED (Green) */}
        <div className="analytics-card">
          <div className="chart-header">
            <span className="chart-badge badge-green">أحدث 5</span>
            <h4 className="chart-title">الأحدث إضافة 📋</h4>
          </div>
          <div style={{ height: '240px', width: '100%', minWidth: '0' }}>
            <ResponsiveContainer>
              <BarChart data={latest} layout="vertical">
                <defs>
                  <linearGradient id="gradGreen" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#064e3b" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" hide />
                <Bar dataKey="id" fill="url(#gradGreen)" radius={[0, 4, 4, 0]} barSize={20}>
                  <LabelList dataKey="name" position="top" offset={5} style={{ fill: '#888', fontSize: '11px' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. MOST VIEWED (Blue) */}
        <div className="analytics-card">
          <div className="chart-header">
            <span className="chart-badge badge-blue">أمر 7 أيام</span>
            <h4 className="chart-title">الأكثر مشاهدة 👁️</h4>
          </div>
          <div style={{ height: '240px', width: '100%', minWidth: '0' }}>
            <ResponsiveContainer>
              <BarChart data={viewed} layout="vertical">
                <defs>
                  <linearGradient id="gradBlue" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#1e3a8a" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" hide />
                <Bar dataKey="viewCount" fill="url(#gradBlue)" radius={[0, 4, 4, 0]} barSize={20}>
                  <LabelList dataKey="name" position="top" offset={5} style={{ fill: '#888', fontSize: '11px' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. MOST SELLING (Flow Chart - Area) */}
        <div className="analytics-card">
          <div className="chart-header">
            <span className="chart-badge badge-purple">الأداء (الكمية)</span>
            <h4 className="chart-title">الأكثر مبيعاً (Flow) 🔥</h4>
          </div>
          <div style={{ height: '240px', width: '100%', minWidth: '0' }}>
            <ResponsiveContainer>
              <AreaChart data={topSellingData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #333', color: '#fff' }}
                  itemStyle={{ color: '#8b5cf6' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. STOCK STATUS (Donut) */}
        <div className="analytics-card">
          <div className="chart-header">
            <span className="chart-badge badge-orange">المخزون (الأقل)</span>
            <h4 className="chart-title">حالة المخزون ⚠️</h4>
          </div>
          <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px' }}>
            {/* Chart on the left/center */}
            <div style={{ flex: 1.2, height: '100%', minWidth: '180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={pieData} 
                    innerRadius={60} 
                    outerRadius={85} 
                    paddingAngle={0} 
                    dataKey="value"
                    stroke="none"
                    startAngle={90}
                    endAngle={450}
                  >
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend on the right */}
            <div style={{ flex: 1 }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {pieData.map((d, i) => (
                  <li key={i} style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', direction: 'rtl' }}>
                    <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: d.color, boxShadow: `0 0 12px ${d.color}66`, flexShrink: 0 }} />
                    <div style={{ fontSize: '1rem', color: '#fff', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      {d.name}: <span style={{ fontSize: '1.2rem', color: d.color }}>{d.value}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProductAnalytics;
