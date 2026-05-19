import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Api, { SERVER_URL } from '../services/api';
import Loader from '../components/common/Loader';
import { useGlobalUI } from '../components/common/GlobalUI';
import StatTile from '../components/common/StatTile';
import { useBranch } from '../context/BranchContext';
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
  LabelList,
  ComposedChart,
  Line
} from 'recharts';

const ProductAnalytics = () => {
  const navigate = useNavigate();
  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${SERVER_URL}${url}`;
    return `${SERVER_URL}/api/v1/products/images/${url.split('/').pop()}`;
  };
  const { selectedBranchId, branches, selectBranch } = useBranch();
  const { toast } = useGlobalUI();
  const isAdmin = Api.isAdminOrBranchManager();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Design-specific data
  const [latest, setLatest] = useState([]);
  const [viewed, setViewed] = useState([]);
  const [expensive, setExpensive] = useState([]);
  const [dailyStats, setDailyStats] = useState([]);


  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [statData, latestData, viewedData, priceyData, dailyData] = await Promise.all([
          Api.getProductStatistics(selectedBranchId),
          Api.getProductsPaged(0, 5, '', 'id,desc', selectedBranchId),
          Api.getProductsPaged(0, 5, '', 'viewCount,desc', selectedBranchId),
          Api.getProductsPaged(0, 5, '', 'purchasePrice,desc', selectedBranchId),
          Api.getDailyProductStats(7, selectedBranchId).catch(() => [])
        ]);
        
        setStats(statData);
        setLatest(latestData?.items || []);
        setViewed(viewedData?.items || []);
        setExpensive(priceyData?.items || []);
        
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
  }, [selectedBranchId]);

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
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', border: 'none', gap: '15px' }}>
        <h2 style={{ margin: 0, fontWeight: '300', letterSpacing: '1px' }}>📊 تحليلات المنتجات</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {isAdmin && (
            <select 
              className="form-control" 
              value={selectedBranchId || ''} 
              onChange={e => {
                const val = e.target.value;
                selectBranch(val ? parseInt(val) : null);
              }} 
              style={{ width: '200px', height: '40px', background: 'var(--bg-elevated, #1a1a1a)', color: 'var(--text-main, #ffffff)', border: '1px solid var(--border-main, #333)', borderRadius: '8px', padding: '0 10px', fontSize: '0.9rem', outline: 'none' }}
            >
              <option value="">🏢 كل الفروع</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>📍 {b.name}</option>
              ))}
            </select>
          )}
          <button className="btn btn-secondary" onClick={() => navigate('/products')}>← عودة</button>
        </div>
      </div>

      {/* KPI TILES GRID — Compact Style (Like Categories) */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '24px' }}>
        <StatTile 
          id="ana_total"
          label="إجمالي المنتجات"
          value={stats?.totalProducts || 0}
          icon="▨"
          defaults={{ color: 'azure', size: 'tile-wd-sm', order: 1 }}
        />
        <StatTile 
          id="ana_capital"
          label="قيمة المخزون (شراء)"
          value={`${Number(stats?.totalInventoryCapital || 0).toLocaleString()} ج.م`}
          icon="▧"
          defaults={{ color: 'forest', size: 'tile-wd-sm', order: 2 }}
        />
        <StatTile 
          id="ana_expected"
          label="الأرباح المتوقعة"
          value={`${Number(stats?.totalExpectedProfit || 0).toLocaleString()} ج.م`}
          icon="◈"
          defaults={{ color: 'deep-purple', size: 'tile-wd-sm', order: 3 }}
        />
        <StatTile 
          id="ana_realized"
          label="الأرباح المحققة"
          value={`${Number(stats?.totalRealizedProfit || 0).toLocaleString()} ج.م`}
          icon="▤"
          defaults={{ color: 'sky', size: 'tile-wd-sm', order: 4 }}
        />
        <StatTile 
          id="ana_cart"
          label="إضافة للسلة"
          value={stats?.totalCartCount || 0}
          icon="🛒"
          defaults={{ color: 'purple', size: 'tile-wd-sm', order: 5 }}
        />
        <StatTile 
          id="ana_fav"
          label="في المفضلة"
          value={stats?.totalFavoriteCount || 0}
          icon="❤️"
          defaults={{ color: 'pink', size: 'tile-wd-sm', order: 6 }}
        />
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
          <div style={{ height: '240px', width: '100%', minWidth: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {topSellingData.length > 0 && topSellingData.some(p => p.sales > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
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
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-dim, #888)', padding: '20px' }}>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '10px' }}>📈</span>
                <span style={{ fontSize: '0.9rem' }}>لا توجد عمليات بيع مسجلة بعد في هذا الفرع 📊</span>
              </div>
            )}
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
                    <div style={{ fontSize: '1rem', color: 'var(--text-main, #ffffff)', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      {d.name}: <span style={{ fontSize: '1.2rem', color: d.color }}>{d.value}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        {/* المنتجات الأكثر مبيعاً (قائمة) */}
        <div className="analytics-card" style={{ direction: 'rtl' }}>
          <div className="chart-header">
            <span className="chart-badge badge-purple" style={{ backgroundColor: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' }}>الترتيب</span>
            <h4 className="chart-title">قائمة المنتجات الأكثر مبيعاً 🔥</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
            {stats?.topSellingProducts && stats.topSellingProducts.length > 0 ? (
              stats.topSellingProducts.map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {p.imageUrl ? (
                        <img src={getImageUrl(p.imageUrl)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '1.2rem', color: '#888' }}>📦</span>
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-main, #ffffff)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={p.name}>{p.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#888' }}>{p.price?.toLocaleString()} ج.م</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', padding: '4px 8px', borderRadius: '6px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                    🔥 {Number(p.soldQuantity || 0).toLocaleString()} قطعة
                  </span>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>لا توجد منتجات مباعة حتى الآن 📊</div>
            )}
          </div>
        </div>

        {/* المنتجات القريبة من النفاد */}
        <div className="analytics-card" style={{ direction: 'rtl' }}>
          <div className="chart-header">
            <span className="chart-badge badge-orange" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>النواقص</span>
            <h4 className="chart-title">المنتجات القريبة من النفاد ⚠️</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
            {stats?.lowStockProducts && stats.lowStockProducts.length > 0 ? (
              stats.lowStockProducts.map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {p.imageUrl ? (
                        <img src={getImageUrl(p.imageUrl)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '1.2rem', color: '#888' }}>📦</span>
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-main, #ffffff)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={p.name}>{p.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#888' }}>{p.price?.toLocaleString()} ج.م</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', padding: '4px 8px', borderRadius: '6px', backgroundColor: p.stock <= 1 ? 'rgba(220, 38, 38, 0.15)' : 'rgba(245, 158, 11, 0.1)', color: p.stock <= 1 ? '#dc2626' : '#f59e0b' }}>
                    ⚠️ متبقي {Number(p.stock || 0).toLocaleString()} فقط
                  </span>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>المخزون كافٍ ولا توجد نواقص 👍</div>
            )}
          </div>
        </div>

      </div>

      {/* Daily Additions Chart (Full Width) */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3>📦 حركة الإضافات اليومية للمنتجات (الـ 7 أيام الماضية)</h3>
        </div>
        <div className="card-body" style={{ height: '350px', width: '100%', padding: '20px' }}>
          {dailyStats.length > 0 ? (
            <ResponsiveContainer>
              <ComposedChart data={dailyStats} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                
                {/* المحور الأيسر للقيم المالية */}
                <YAxis yAxisId="left" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val} />
                
                {/* المحور الأيمن لعدد المنتجات */}
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#f59e0b', fontSize: 12 }} axisLine={false} tickLine={false} />

                <Tooltip 
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  formatter={(value, name) => {
                    let label = name;
                    if (name === 'profit') return [`${Number(value).toLocaleString()} ج.م`, 'المكسب المتوقع'];
                    if (name === 'purchase') return [`${Number(value).toLocaleString()} ج.م`, 'رأس المال (مشتريات)'];
                    if (name === 'sale') return [`${Number(value).toLocaleString()} ج.م`, 'إجمالي المبيعات المحتملة'];
                    if (name === 'count') return [value, 'عدد المنتجات المختلفة'];
                    return [value, label];
                  }}
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                />
                
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#ccc' }} />

                <Bar yAxisId="left" dataKey="purchase" name="رأس المال" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={25} />
                <Bar yAxisId="left" dataKey="profit" name="المكسب المتوقع" fill="#10b981" radius={[4, 4, 0, 0]} barSize={25} />
                
                <Line yAxisId="right" type="monotone" dataKey="count" name="عدد المنتجات" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#111' }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: '20px', color: 'var(--text-dim)', textAlign: 'center', marginTop: '100px' }}>لا توجد إضافات في الفترة المحددة</div>
          )}
        </div>
      </div>
    </div>

  );
};

export default ProductAnalytics;
