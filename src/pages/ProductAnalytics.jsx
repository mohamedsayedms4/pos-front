import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Api from '../services/api';
import Loader from '../components/common/Loader';
import { useGlobalUI } from '../components/common/GlobalUI';
import { useBranch } from '../context/BranchContext';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, ComposedChart, Line,
  LabelList
} from 'recharts';
import '../styles/pages/ProductAnalyticsPremium.css';

const ProductAnalytics = () => {
  const navigate = useNavigate();
  const { selectedBranchId } = useBranch();
  const { toast } = useGlobalUI();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [latest, setLatest] = useState([]);
  const [viewed, setViewed] = useState([]);
  const [mostCarted, setMostCarted] = useState([]);
  const [mostFavorited, setMostFavorited] = useState([]);
  const [dailyStats, setDailyStats] = useState([]);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [statData, latestData, viewedData, cartData, favData, dailyData] = await Promise.all([
          Api.getProductStatistics(selectedBranchId),
          Api.getProductsPaged(0, 5, '', 'id,desc', selectedBranchId),
          Api.getProductsPaged(0, 5, '', 'viewCount,desc', selectedBranchId),
          Api.getProductsPaged(0, 5, '', 'cartCount,desc', selectedBranchId),
          Api.getProductsPaged(0, 5, '', 'favoriteCount,desc', selectedBranchId),
          Api.getDailyProductStats(7).catch(() => [])
        ]);
        
        setStats(statData);
        setLatest(latestData?.items || []);
        setViewed(viewedData?.items || []);
        setMostCarted(cartData?.items || []);
        setMostFavorited(favData?.items || []);
        
        const mappedDaily = Array.isArray(dailyData) ? dailyData.map(d => ({
          name: new Date(d.additionDate).toLocaleDateString('ar-EG', { weekday: 'short' }),
          profit: d.totalExpectedProfit || 0,
          purchase: d.totalPurchaseValue || 0,
          sale: d.totalSaleValue || 0,
          count: d.productCount || 0
        })) : [];
        setDailyStats(mappedDaily);

      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [selectedBranchId, toast]);

  if (loading) return <Loader message="جاري تحميل التحليلات..." />;

  const pieData = stats ? [
    { name: 'متوفر', value: stats.totalProducts - (stats.outOfStockCount || 0) - (stats.lowStockCount || 0), color: '#10b981' },
    { name: 'منخفض', value: stats.lowStockCount || 0, color: '#f59e0b' },
    { name: 'نفد', value: stats.outOfStockCount || 0, color: '#ef4444' },
  ] : [];

  const topSellingData = (stats?.topSellingProducts || []).map(p => ({
    name: p.name,
    sales: p.soldQuantity || 0
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
          background: 'rgba(15, 23, 42, 0.9)', 
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--ana-glass-border)', 
          padding: '12px', 
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{label}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ margin: 0, color: p.color, fontSize: '0.9rem' }}>
              {p.name}: {Number(p.value).toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="analytics-page-container">
      {/* Header */}
      <div className="ana-header-container">
        <div className="ana-header-row">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '8px', fontSize: '0.9rem', color: 'var(--ana-text-secondary)', marginBottom: '12px' }}>
              <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>الرئيسية</Link>
              <span>/</span>
              <Link to="/products" style={{ color: 'inherit', textDecoration: 'none' }}>المنتجات</Link>
              <span>/</span>
              <span>التحليلات</span>
            </div>
            <h1>تحليلات المنتجات</h1>
          </div>
          <button className="ana-btn-back" onClick={() => navigate('/products')}>
            <i className="fas fa-arrow-right"></i>
            <span>العودة للمنتجات</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="ana-stats-grid">
        <div className="ana-stat-card">
          <div className="ana-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <i className="fas fa-box"></i>
          </div>
          <div className="ana-stat-info">
            <div className="ana-stat-label">إجمالي المنتجات</div>
            <div className="ana-stat-value">{stats?.totalProducts || 0}</div>
          </div>
        </div>
        <div className="ana-stat-card">
          <div className="ana-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <i className="fas fa-money-bill-wave"></i>
          </div>
          <div className="ana-stat-info">
            <div className="ana-stat-label">قيمة المخزون (شراء)</div>
            <div className="ana-stat-value">{(stats?.totalInventoryCapital || 0).toLocaleString()} <small>ج.م</small></div>
          </div>
        </div>
        <div className="ana-stat-card">
          <div className="ana-stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <i className="fas fa-chart-line"></i>
          </div>
          <div className="ana-stat-info">
            <div className="ana-stat-label">الأرباح المتوقعة</div>
            <div className="ana-stat-value">{(stats?.totalExpectedProfit || 0).toLocaleString()} <small>ج.م</small></div>
          </div>
        </div>
        <div className="ana-stat-card">
          <div className="ana-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <i className="fas fa-shopping-cart"></i>
          </div>
          <div className="ana-stat-info">
            <div className="ana-stat-label">إضافة للسلة</div>
            <div className="ana-stat-value">{stats?.totalCartCount || 0}</div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="ana-grid">
        {/* Latest Added */}
        <div className="ana-card">
          <div className="ana-card-title">
            <i className="fas fa-plus-circle" style={{ color: '#10b981' }}></i>
            الأحدث إضافة
          </div>
          <div style={{ height: '320px' }}>
            <ResponsiveContainer>
              <BarChart data={latest} layout="vertical" margin={{ left: 10, right: 50, top: 20 }}>
                <defs>
                   <linearGradient id="gradLatest" x1="0" y1="0" x2="1" y2="0">
                     <stop offset="0%" stopColor="#064e3b" />
                     <stop offset="100%" stopColor="#10b981" />
                   </linearGradient>
                </defs>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" hide />
                <Tooltip content={<CustomTooltip />} cursor={false} />
                <Bar dataKey="id" fill="url(#gradLatest)" radius={[0, 10, 10, 0]} barSize={12}>
                   <LabelList 
                     dataKey="name" 
                     position="top" 
                     offset={10} 
                     style={{ fill: 'var(--ana-text-primary)', fontSize: '13px', fontWeight: 700 }} 
                   />
                   <LabelList 
                     dataKey="id" 
                     position="right" 
                     offset={10}
                     formatter={(val) => `#${val}`}
                     style={{ fill: 'var(--ana-text-secondary)', fontSize: '11px' }} 
                   />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Most Viewed */}
        <div className="ana-card">
          <div className="ana-card-title">
            <i className="fas fa-eye" style={{ color: '#3b82f6' }}></i>
            الأكثر مشاهدة
          </div>
          <div style={{ height: '320px' }}>
            <ResponsiveContainer>
              <BarChart data={viewed} layout="vertical" margin={{ left: 10, right: 50, top: 20 }}>
                <defs>
                   <linearGradient id="gradViewed" x1="0" y1="0" x2="1" y2="0">
                     <stop offset="0%" stopColor="#1e3a8a" />
                     <stop offset="100%" stopColor="#3b82f6" />
                   </linearGradient>
                </defs>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" hide />
                <Tooltip content={<CustomTooltip />} cursor={false} />
                <Bar dataKey="viewCount" fill="url(#gradViewed)" radius={[0, 10, 10, 0]} barSize={12}>
                   <LabelList 
                     dataKey="name" 
                     position="top" 
                     offset={10} 
                     style={{ fill: 'var(--ana-text-primary)', fontSize: '13px', fontWeight: 700 }} 
                   />
                   <LabelList 
                     dataKey="viewCount" 
                     position="right" 
                     offset={10}
                     style={{ fill: 'var(--ana-text-primary)', fontSize: '14px', fontWeight: 800 }} 
                   />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Most Added to Cart */}
        <div className="ana-card">
          <div className="ana-card-title">
            <i className="fas fa-shopping-cart" style={{ color: '#f59e0b' }}></i>
            الأكثر إضافة للسلة
          </div>
          <div style={{ height: '320px' }}>
            <ResponsiveContainer>
              <BarChart data={mostCarted} layout="vertical" margin={{ left: 10, right: 50, top: 20 }}>
                <defs>
                   <linearGradient id="gradCart" x1="0" y1="0" x2="1" y2="0">
                     <stop offset="0%" stopColor="#92400e" />
                     <stop offset="100%" stopColor="#f59e0b" />
                   </linearGradient>
                </defs>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" hide />
                <Tooltip content={<CustomTooltip />} cursor={false} />
                <Bar dataKey="cartCount" fill="url(#gradCart)" radius={[0, 10, 10, 0]} barSize={12}>
                   <LabelList 
                     dataKey="name" 
                     position="top" 
                     offset={10} 
                     style={{ fill: 'var(--ana-text-primary)', fontSize: '13px', fontWeight: 700 }} 
                   />
                   <LabelList 
                     dataKey="cartCount" 
                     position="right" 
                     offset={10}
                     style={{ fill: 'var(--ana-text-primary)', fontSize: '14px', fontWeight: 800 }} 
                   />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Most Added to Favorites */}
        <div className="ana-card">
          <div className="ana-card-title">
            <i className="fas fa-heart" style={{ color: '#ec4899' }}></i>
            الأكثر في المفضلة
          </div>
          <div style={{ height: '320px' }}>
            <ResponsiveContainer>
              <BarChart data={mostFavorited} layout="vertical" margin={{ left: 10, right: 50, top: 20 }}>
                <defs>
                   <linearGradient id="gradFav" x1="0" y1="0" x2="1" y2="0">
                     <stop offset="0%" stopColor="#831843" />
                     <stop offset="100%" stopColor="#ec4899" />
                   </linearGradient>
                </defs>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" hide />
                <Tooltip content={<CustomTooltip />} cursor={false} />
                <Bar dataKey="favoriteCount" fill="url(#gradFav)" radius={[0, 10, 10, 0]} barSize={12}>
                   <LabelList 
                     dataKey="name" 
                     position="top" 
                     offset={10} 
                     style={{ fill: 'var(--ana-text-primary)', fontSize: '13px', fontWeight: 700 }} 
                   />
                   <LabelList 
                     dataKey="favoriteCount" 
                     position="right" 
                     offset={10}
                     style={{ fill: 'var(--ana-text-primary)', fontSize: '14px', fontWeight: 800 }} 
                   />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Most Selling Area */}
        <div className="ana-card">
          <div className="ana-card-title">
            <i className="fas fa-fire" style={{ color: '#ef4444' }}></i>
            الأكثر مبيعاً
          </div>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer>
              <AreaChart data={topSellingData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" hide />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="sales" stroke="#ef4444" strokeWidth={3} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock Status Donut */}
        <div className="ana-card">
          <div className="ana-card-title">
            <i className="fas fa-exclamation-triangle" style={{ color: '#f59e0b' }}></i>
            حالة المخزون
          </div>
          <div className="ana-pie-container" style={{ height: '300px', display: 'flex', alignItems: 'center' }}>
            <div className="ana-pie-chart-wrapper" style={{ flex: 1, height: '100%' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie 
                    data={pieData} 
                    innerRadius="60%" 
                    outerRadius="90%" 
                    paddingAngle={5} 
                    dataKey="value" 
                    stroke="none"
                  >
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="ana-pie-legend" style={{ width: '120px' }}>
              {pieData.map((d, i) => (
                <div key={i} style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: d.color }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--ana-text-secondary)' }}>{d.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Full Width Daily Stats */}
        <div className="ana-card ana-full-card">
          <div className="ana-card-title">
            <i className="fas fa-history" style={{ color: '#8b5cf6' }}></i>
            حركة الإضافات اليومية
          </div>
          <div style={{ height: '350px' }}>
            <ResponsiveContainer>
              <ComposedChart data={dailyStats} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ana-glass-border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'var(--ana-text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} height={50} />
                <YAxis yAxisId="left" tick={{ fill: 'var(--ana-text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#f59e0b', fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} />
                <Bar yAxisId="left" dataKey="purchase" name="رأس المال" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={25} />
                <Bar yAxisId="left" dataKey="profit" name="المكسب المتوقع" fill="#10b981" radius={[4, 4, 0, 0]} barSize={25} />
                <Line yAxisId="right" type="monotone" dataKey="count" name="عدد المنتجات" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductAnalytics;
