import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Api from '../services/api';
import Loader from '../components/common/Loader';
import { useBranch } from '../context/BranchContext';
import { useNotifications } from '../services/useNotifications';
import '../styles/pages/Dashboard2.css';

const branchMarkerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const Dashboard2 = () => {
  const navigate = useNavigate();
  const { selectedBranchId } = useBranch();
  const { notifications } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  // Real KPI States
  const [treasuryBalance, setTreasuryBalance] = useState(0);
  const [totalDebts, setTotalDebts] = useState(0);
  const [todayExpenses, setTodayExpenses] = useState(0);
  const [todaySales, setTodaySales] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [netProfit, setNetProfit] = useState(0);

  // Charts data
  const [salesTrend, setSalesTrend] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  // Tables & Cards data
  const [dueInvoices, setDueInvoices] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [branchList, setBranchList] = useState([]);

  useEffect(() => {
    const user = Api._getUser();
    if (user && user.name) {
      setUserName(user.name);
    } else {
      setUserName('محمد');
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;

      const [
        treasuryRes,
        summaryRes,
        debtsRes,
        profitRes,
        productsRes,
        productAnalyticsRes,
        branchesRes,
        customersRes,
        salesRes
      ] = await Promise.allSettled([
        Api.getMainTreasury(selectedBranchId),
        Api.getSalesSummary('', selectedBranchId),
        Api.getDebts(0, 5, '', 'PENDING', '', '', selectedBranchId),
        Api.getProfitLossReport(monthStart, today, selectedBranchId),
        Api.getProducts(0, 1000, selectedBranchId),
        Api.getProductAnalytics('', selectedBranchId),
        Api.getBranches(),
        Api.getCustomers(0, 5, '', selectedBranchId),
        Api.getSales(0, 5, '', selectedBranchId)
      ]);

      // 1. Treasury / Available Cash
      if (treasuryRes.status === 'fulfilled' && treasuryRes.value) {
        setTreasuryBalance(treasuryRes.value.balance || treasuryRes.value.totalBalance || 0);
      }

      // 2. Sales Summary & Trend Chart
      if (summaryRes.status === 'fulfilled' && summaryRes.value) {
        const sum = summaryRes.value;
        setTodaySales(sum.todayTotalSales || 0);
        
        if (sum.dailyTrend && Array.isArray(sum.dailyTrend)) {
          const formattedTrend = sum.dailyTrend.slice(-7).map(item => {
            const dateParts = (item.saleDate || '').split('-');
            const label = dateParts.length >= 3 ? `${dateParts[2]} / ${dateParts[1]}` : item.saleDate;
            return {
              name: label,
              sales: item.totalAmount || 0
            };
          });
          setSalesTrend(formattedTrend);
          const totalSum = sum.dailyTrend.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
          setTotalSales(totalSum || sum.todayTotalSales || 0);
        }
      }

      // 3. Debts & Due Invoices Table
      if (debtsRes.status === 'fulfilled' && debtsRes.value) {
        const rawDebts = debtsRes.value.items || debtsRes.value.content || (Array.isArray(debtsRes.value) ? debtsRes.value : []);
        const formattedInvoices = rawDebts.slice(0, 5).map((d) => ({
          id: d.invoiceNumber || `INV-${d.id}`,
          saleId: d.saleId || d.invoiceId || d.id,
          customer: d.customerName || d.entityName || 'عميل نقدي',
          date: d.dueDate || d.createdAt?.split('T')[0] || today,
          amount: Number(d.totalAmount || d.amount || 0).toLocaleString(),
          remaining: Number(d.remainingAmount || d.amount || 0).toLocaleString(),
          status: d.status === 'OVERDUE' ? 'متأخرة' : d.status === 'PENDING' ? 'قريبة الاستحقاق' : 'سليمة',
          statusClass: d.status === 'OVERDUE' ? 'status-danger' : d.status === 'PENDING' ? 'status-warning' : 'status-success'
        }));
        setDueInvoices(formattedInvoices);
        const sumDebts = rawDebts.reduce((acc, curr) => acc + (curr.remainingAmount || curr.amount || 0), 0);
        setTotalDebts(sumDebts);
      }

      // 4. Profit & Loss / Expenses
      if (profitRes.status === 'fulfilled' && profitRes.value) {
        const report = profitRes.value;
        setTodayExpenses(report.totalExpenses || 0);
        setNetProfit(report.netProfit || (report.totalSales - report.totalExpenses) || 0);
      }

      // 5. Low Stock Products
      if (productsRes.status === 'fulfilled' && productsRes.value) {
        const rawProds = productsRes.value.content || productsRes.value.items || (Array.isArray(productsRes.value) ? productsRes.value : []);
        const lowList = rawProds
          .filter(p => (p.quantity || p.stockQuantity || 0) <= (p.minStockQuantity || 5))
          .slice(0, 5)
          .map(p => ({
            name: p.name || p.title,
            current: p.quantity || p.stockQuantity || 0,
            min: p.minStockQuantity || 5,
            status: 'منخفض',
            statusClass: 'status-danger',
            img: p.imageUrl ? '' : ''
          }));
        setLowStockProducts(lowList);

        const formattedProds = rawProds.slice(0, 5).map((p, idx) => ({
          id: p.id || idx,
          name: p.name || p.title || p.productName || `منتج #${p.id || idx + 1}`,
          price: Number(p.salePrice || p.price || p.unitPrice || 0).toLocaleString(),
          salesCount: p.soldQuantity || p.salesCount || p.quantity || 0,
          inStock: (p.quantity ?? p.stockQuantity ?? 0) > 0,
          icon: (p.categoryName || '').includes('إلكترو') ? '' : (p.categoryName || '').includes('ملابس') ? '' : ''
        }));
        setTopProducts(formattedProds);
      } else {
        setLowStockProducts([]);
        setTopProducts([]);
      }

      // 6. Category Analytics (Pie Chart) - Real DB calculation
      if (productAnalyticsRes.status === 'fulfilled' && Array.isArray(productAnalyticsRes.value) && productAnalyticsRes.value.length > 0) {
        const rawCategoryData = productAnalyticsRes.value;
        const colors = ['#339af0', '#20c997', '#fcc419', '#ff922b', '#ff6b6b', '#845ef7'];
        const totalRev = rawCategoryData.reduce((acc, c) => acc + (c.totalRevenue || c.revenue || c.totalAmount || 0), 0);
        
        if (totalRev > 0) {
          const pieFormatted = rawCategoryData.slice(0, 5).map((c, i) => ({
            name: c.categoryName || c.name || c.productName || `فئة #${i + 1}`,
            value: Math.round(((c.totalRevenue || c.revenue || c.totalAmount || 0) / totalRev) * 100),
            color: colors[i % colors.length]
          }));
          setCategoryData(pieFormatted);
        } else {
          setCategoryData([]);
        }
      } else if (productsRes.status === 'fulfilled' && Array.isArray(productsRes.value)) {
        // Dynamic group by category from DB products
        const rawProds = productsRes.value.content || productsRes.value.items || (Array.isArray(productsRes.value) ? productsRes.value : []);
        const catMap = {};
        let totalCount = 0;

        rawProds.forEach(p => {
          const cName = p.categoryName || p.category?.name || 'عام';
          const qty = p.soldQuantity || p.salesCount || p.quantity || 1;
          catMap[cName] = (catMap[cName] || 0) + qty;
          totalCount += qty;
        });

        const colors = ['#339af0', '#20c997', '#fcc419', '#ff922b', '#ff6b6b', '#845ef7'];
        const catKeys = Object.keys(catMap);

        if (catKeys.length > 0 && totalCount > 0) {
          const computedCats = catKeys.slice(0, 5).map((cName, i) => ({
            name: cName,
            value: Math.round((catMap[cName] / totalCount) * 100),
            color: colors[i % colors.length]
          }));
          setCategoryData(computedCats);
        } else {
          setCategoryData([]);
        }
      } else {
        setCategoryData([]);
      }

      // 7. Branches List
      if (branchesRes.status === 'fulfilled' && branchesRes.value) {
        setBranchList(Array.isArray(branchesRes.value) ? branchesRes.value : []);
      }

      // 8. Top Customers
      if (customersRes.status === 'fulfilled' && customersRes.value) {
        const custs = customersRes.value.content || customersRes.value.items || (Array.isArray(customersRes.value) ? customersRes.value : []);
        const formattedCusts = custs.slice(0, 5).map((c, idx) => ({
          id: c.id || idx,
          name: c.name || c.fullName || c.customerName || `عميل #${c.id || idx + 1}`,
          code: c.code || `#CUS${String(c.id || idx + 1).padStart(4, '0')}`,
          spent: Number(c.totalSpent || c.balance || c.currentBalance || 0).toLocaleString(),
          avatar: (c.name || c.fullName || c.customerName || 'C').charAt(0).toUpperCase()
        }));
        setTopCustomers(formattedCusts);
      } else {
        setTopCustomers([]);
      }

      // 9. Recent Transactions
      if (salesRes.status === 'fulfilled' && salesRes.value) {
        const salesData = salesRes.value.content || salesRes.value.items || (Array.isArray(salesRes.value) ? salesRes.value : []);
        const formattedSales = salesData.slice(0, 5).map((s, idx) => ({
          id: s.id,
          code: s.invoiceNumber || `SALE-${s.id}`,
          customerName: s.customerName || s.customer?.name || 'Cash Customer',
          amount: Number(s.totalAmount || s.finalAmount || s.grandTotal || 0).toLocaleString(),
          date: s.saleDate || s.createdAt?.split('T')[0] || today,
          status: s.status === 'CANCELLED' ? 'ملغى' : s.paymentStatus === 'PENDING' ? 'معلق' : 'مكتمل',
          statusClass: s.status === 'CANCELLED' ? 'pill-danger' : s.paymentStatus === 'PENDING' ? 'pill-warning' : 'pill-success'
        }));
        setRecentTransactions(formattedSales);
      } else {
        setRecentTransactions([]);
      }
    } catch (err) {
      console.error('Failed to load dashboard 2 data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const todayStr = new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Dynamic trend computation from dailyTrend
  const [salesTrendChange, setSalesTrendChange] = useState({ trend: 'up', trendValue: '0.0%' });

  // Update sales summary & dynamic percentage calculation
  useEffect(() => {
    // If we have daily trend data, compute real change compared to yesterday
    if (salesTrend && salesTrend.length >= 2) {
      const todayVal = salesTrend[salesTrend.length - 1]?.sales || 0;
      const yesterdayVal = salesTrend[salesTrend.length - 2]?.sales || 0;
      if (yesterdayVal > 0) {
        const pct = ((todayVal - yesterdayVal) / yesterdayVal) * 100;
        setSalesTrendChange({
          trend: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral',
          trendValue: pct === 0 ? 'لا تغيير' : `${Math.abs(pct).toFixed(1)}%`
        });
      } else if (todayVal > 0) {
        setSalesTrendChange({ trend: 'up', trendValue: '100%' });
      }
    }
  }, [salesTrend]);

  // Fallback / Data formatting
  const kpiList = [
    { title: 'النقدية المتاحة', value: Number(treasuryBalance).toLocaleString('en-US', { minimumFractionDigits: 2 }), currency: 'جنية', trend: 'up', trendValue: 'مباشر', icon: '', colorClass: 'icon-green' },
    { title: 'المستحقات', value: Number(totalDebts).toLocaleString('en-US', { minimumFractionDigits: 2 }), currency: 'جنية', trend: 'neutral', trendValue: 'لا تغيير', icon: '', colorClass: 'icon-orange' },
    { title: 'المصروفات', value: Number(todayExpenses).toLocaleString('en-US', { minimumFractionDigits: 2 }), currency: 'جنية', trend: 'down', trendValue: 'هذا الشهر', icon: '', colorClass: 'icon-red' },
    { title: 'المبيعات اليوم', value: Number(todaySales).toLocaleString('en-US', { minimumFractionDigits: 2 }), currency: 'جنية', trend: salesTrendChange.trend, trendValue: salesTrendChange.trendValue, icon: '️', colorClass: 'icon-purple' },
    { title: 'إجمالي المبيعات', value: Number(totalSales).toLocaleString('en-US', { minimumFractionDigits: 2 }), currency: 'جنية', trend: 'up', trendValue: salesTrendChange.trendValue, icon: '', colorClass: 'icon-blue' },
    { title: 'صافي الربح', value: Number(netProfit).toLocaleString('en-US', { minimumFractionDigits: 2 }), currency: 'جنية', trend: netProfit >= 0 ? 'up' : 'down', trendValue: netProfit >= 0 ? 'موجب' : 'سالب', icon: '', colorClass: 'icon-teal' },
  ];

  const systemAlerts = notifications && notifications.length > 0
    ? notifications.slice(0, 4).map(n => ({
        id: n.id,
        type: n.type === 'ERROR' ? 'error' : n.type === 'WARNING' ? 'warning' : 'info',
        title: n.title || 'إشعار للنظام',
        desc: n.message || n.desc,
        time: n.timestamp ? new Date(n.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : 'الآن',
        icon: n.type === 'ERROR' ? '' : n.type === 'WARNING' ? '' : 'ℹ️'
      }))
    : [
        { id: 1, type: 'info', title: 'النظام يعمل بشكل ممتاز', desc: 'لا توجد تنبيهات عاجلة حالياً', time: 'الآن', icon: '' }
      ];

  if (loading) {
    return <Loader message="جاري التحميل..." />;
  }

  return (
    <div className="dashboard2-container">
      {/* Top Banner (Header + KPI Cards with #2596be background) */}
      <div className="d2-top-banner">
        <div className="d2-header">
          <div className="d2-greeting-section">
            <h1>مرحباً {userName} <i className="fa-solid fa-hand-wave"></i></h1>
            <p>هذا ملخص أعمالك ليوم {todayStr}</p>
          </div>
          <div className="d2-header-actions">
            <button className="d2-refresh-btn" onClick={loadDashboardData}>
              <i className="fa-solid fa-rotate"></i> تحديث البيانات
            </button>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="d2-kpi-grid">
          {kpiList.map((kpi, idx) => (
            <div className="d2-kpi-card" key={idx}>
              <div className="d2-kpi-header">
                <span className="d2-kpi-title">{kpi.title}</span>
                <div className={`d2-kpi-icon ${kpi.colorClass}`}>{kpi.icon}</div>
              </div>
              <div className="d2-kpi-value-container">
                <span className="d2-kpi-value">{kpi.value}</span>
                <span className="d2-kpi-currency">{kpi.currency}</span>
              </div>
              <div className="d2-kpi-footer">
                {kpi.trend === 'up' && <span className="trend-up">↑ {kpi.trendValue}</span>}
                {kpi.trend === 'down' && <span className="trend-down">↓ {kpi.trendValue}</span>}
                {kpi.trend === 'neutral' && <span className="trend-neutral">— {kpi.trendValue}</span>}
                {kpi.trend !== 'neutral' && <span className="d2-kpi-compare">عن أمس</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="d2-main-content-padding">
        {/* Branch Sales Map Widget (Disabled) */}
        {false && (
          <div className="d2-map-card">
            <div className="d2-card-header" style={{ padding: '16px 20px', marginBottom: 0 }}>
              <h3 className="d2-card-title">المبيعات حسب الفروع والمناطق (Sales by Region)</h3>
              <select className="form-select" style={{ width: 'auto', padding: '4px 24px 4px 10px', fontSize: '0.85rem' }}>
                <option>2026</option>
                <option>2025</option>
              </select>
            </div>
            <div className="d2-map-container" style={{ height: '320px', width: '100%' }}>
              <MapContainer 
                center={[24.7136, 46.6753]} 
                zoom={5} 
                style={{ height: '100%', width: '100%', zIndex: 1 }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />

                {/* Real Leaflet Map Markers for Store Branches */}
                {(branchList.length > 0 ? branchList : [
                  { id: 1, name: 'الفرع الرئيسي - الرياض', latitude: 24.7136, longitude: 46.6753, address: 'شارع العليا، الرياض' },
                  { id: 2, name: 'فرع جدة - الكورنيش', latitude: 21.5433, longitude: 39.1728, address: 'حي الزهراء، جدة' },
                  { id: 3, name: 'فرع الدمام', latitude: 26.4207, longitude: 50.0888, address: 'طريق الملك فهد، الدمام' },
                  { id: 4, name: 'فرع مكة المكرمة', latitude: 21.3891, longitude: 39.8579, address: 'العزيزية، مكة' },
                  { id: 5, name: 'فرع القاهرة', latitude: 30.0444, longitude: 31.2357, address: 'مدينة نصر، القاهرة' }
                ]).map((b, idx) => {
                  const lat = parseFloat(b.latitude || b.lat || (24.7136 + idx * 1.5));
                  const lng = parseFloat(b.longitude || b.lng || (46.6753 + idx * 2.2));
                  return (
                    <Marker 
                      key={b.id || idx} 
                      position={[lat, lng]} 
                      icon={branchMarkerIcon}
                    >
                      <Popup style={{ direction: 'rtl', textAlign: 'right' }}>
                        <div style={{ fontFamily: 'Cairo, sans-serif', padding: '4px' }}>
                          <strong style={{ fontSize: '0.95rem', color: '#2596be' }}><i className="fa-solid fa-building"></i> {b.name || `فرع ${idx + 1}`}</strong>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}><i className="fa-solid fa-location-dot"></i> {b.address || 'العنوان المسجل بالفرع'}</div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#16a34a', marginTop: '4px' }}>
                            <i className="fa-solid fa-circle" style={{color: "#22c55e"}}></i> الفرع نشط ومربوط بالنظام
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>

            {/* Progress Footer matching design */}
            <div className="d2-map-footer-bar">
              <div className="d2-map-footer-top">
                <div className="d2-map-footer-val">
                  {Number(totalSales || 2400000).toLocaleString()} ر.س
                  <span className="d2-map-footer-sub">مقارنة بالشهر السابق</span>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>الهدف الشهري 60%</span>
              </div>
              <div className="d2-progress-track">
                <div className="d2-progress-fill" style={{ width: '60%' }}></div>
              </div>
              <div className="d2-progress-labels">
                <span>0</span>
                <span>2M</span>
                <span>4M</span>
              </div>
            </div>
          </div>
        )}

      {/* Middle Section (Charts & Alerts) */}
      <div className="d2-middle-section">
        <div className="d2-card">
          <div className="d2-card-header">
            <h3 className="d2-card-title">المبيعات خلال آخر 7 أيام</h3>
            <select className="form-select" style={{ width: 'auto', padding: '4px 30px 4px 10px', borderRadius: '20px', fontSize: '0.85rem' }}>
              <option>آخر 7 أيام</option>
            </select>
          </div>
          <div style={{ height: '250px', width: '100%' }}>
            {salesTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={salesTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle, #f1f3f5)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickFormatter={(val) => val >= 1000 ? `${val / 1000}K` : val} />
                  <RechartsTooltip cursor={{ stroke: 'rgba(132, 94, 247, 0.2)', strokeWidth: 2 }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="sales" stroke="#845ef7" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
                لا توجد مبيعات مسجلة في آخر 7 أيام
              </div>
            )}
          </div>
        </div>

        <div className="d2-card">
          <div className="d2-card-header">
            <h3 className="d2-card-title">المبيعات حسب الفئة</h3>
          </div>
          {categoryData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', height: '240px', gap: '12px' }}>
              {/* Donut Chart Container */}
              <div style={{ flex: '1', height: '100%', position: 'relative', minWidth: '0' }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie data={categoryData} innerRadius={55} outerRadius={75} paddingAngle={2} dataKey="value" stroke="none">
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(val) => `${val}%`} contentStyle={{ borderRadius: '0', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none', width: '90px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>إجمالي المبيعات</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: '800', wordBreak: 'break-word' }}>{Number(totalSales).toLocaleString()}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>جنية</div>
                </div>
              </div>

              {/* Clean Side Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '135px', paddingLeft: '8px' }}>
                {categoryData.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                    <div style={{ width: '12px', height: '12px', background: item.color, flexShrink: 0 }}></div>
                    <span style={{ color: 'var(--text-dark)', fontWeight: '600' }}>{item.name}</span>
                    <span style={{ fontWeight: '700', marginRight: 'auto', color: 'var(--text-muted)' }}>{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '240px', color: 'var(--text-muted)' }}>
              لا توجد مبيعات فئات مسجلة حالياً <i className="fa-solid fa-chart-column"></i>
            </div>
          )}
        </div>

        <div className="d2-card">
          <div className="d2-card-header" style={{ marginBottom: '12px' }}>
            <h3 className="d2-card-title">التنبيهات الحية</h3>
            <span style={{ color: '#ff6b6b' }}><i className="fa-solid fa-bell"></i></span>
          </div>
          <div className="d2-alerts-list">
            {systemAlerts.map((alert) => (
              <div key={alert.id} className={`d2-alert-item alert-${alert.type}`}>
                <div className="d2-alert-icon">{alert.icon}</div>
                <div className="d2-alert-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className="d2-alert-title">{alert.title}</div>
                    <div className="d2-alert-time">{alert.time}</div>
                  </div>
                  <div className="d2-alert-desc">{alert.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <Link to="/notifications" className="d2-view-all-alerts">عرض كل التنبيهات</Link>
        </div>
      </div>

      {/* 3 Analytics Cards Row (Top Customers | Top Selling Products | Recent Transactions) */}
      <div className="d2-analytics-3col">
        {/* Card 1: Top Customers */}
        <div className="d2-card">
          <div className="d2-card-header">
            <h3 className="d2-card-title">كبار العملاء (Top Customers)</h3>
            <Link to="/customers" className="d2-view-link">عرض الكل ›</Link>
          </div>
          <div className="d2-list">
            {topCustomers.length > 0 ? (
              topCustomers.map((cust) => (
                <div key={cust.id} className="d2-list-row">
                  <div className="d2-item-left">
                    <div className="d2-avatar">{cust.avatar}</div>
                    <div className="d2-item-info">
                      <span className="d2-item-name">{cust.name}</span>
                      <span className="d2-item-sub">{cust.code}</span>
                    </div>
                  </div>
                  <div className="d2-item-right">
                    <span className="d2-item-val">{cust.spent} جنية</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>إجمالي الإنفاق</span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                لا يوجد عملاء مسجلين حالياً <i className="fa-solid fa-users"></i>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Top Selling Products */}
        <div className="d2-card">
          <div className="d2-card-header">
            <h3 className="d2-card-title">الأكثر مبيعاً (Top Products)</h3>
            <Link to="/products" className="d2-view-link">عرض الكل ›</Link>
          </div>
          <div className="d2-list">
            {topProducts.length > 0 ? (
              topProducts.map((prod) => (
                <div key={prod.id} className="d2-list-row">
                  <div className="d2-item-left">
                    <div className="d2-avatar" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a' }}>{prod.icon}</div>
                    <div className="d2-item-info">
                      <span className="d2-item-name">{prod.name}</span>
                      <div className="d2-item-sub">
                        <span>{prod.price} جنية</span>
                        <span className={`d2-pill ${prod.inStock ? 'pill-success' : 'pill-danger'}`}>
                          {prod.inStock ? 'متوفر' : 'نفد المخزون'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="d2-item-right">
                    <span className="d2-item-val">{prod.salesCount}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>مبيعة</span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                لا توجد منتجات مسجلة حالياً <i className="fa-solid fa-box"></i>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Recent Transactions */}
        <div className="d2-card">
          <div className="d2-card-header">
            <h3 className="d2-card-title">أحدث العمليات (Transactions)</h3>
            <Link to="/sales" className="d2-view-link">عرض الكل ›</Link>
          </div>
          <div className="d2-list">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((trx) => (
                <div key={trx.id} className="d2-list-row" style={{ cursor: 'pointer' }} onClick={() => navigate(`/sales/view/${trx.id}`)}>
                  <div className="d2-item-left">
                    <div className="d2-avatar" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                      {trx.customerName.charAt(0)}
                    </div>
                    <div className="d2-item-info">
                      <span className="d2-item-name">{trx.customerName}</span>
                      <div className="d2-item-sub">
                        <span>{trx.code}</span>
                        <span className={`d2-pill ${trx.statusClass}`}>{trx.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="d2-item-right">
                    <span className="d2-item-val">{trx.amount} جنية</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{trx.date}</span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                لا توجد عمليات مبيعات مسجلة مؤخراً <i className="fa-solid fa-bag-shopping"></i>️
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section (Tables) */}
      <div className="d2-bottom-section">
        <div className="d2-card">
          <div className="d2-card-header">
            <h3 className="d2-card-title">أحدث الفواتير المستحقة ↗️</h3>
            <Link to="/debts" style={{ fontSize: '0.85rem', color: '#339af0', textDecoration: 'none' }}>عرض الكل</Link>
          </div>
          <div className="d2-table-wrapper">
            {dueInvoices.length > 0 ? (
              <table className="d2-table">
                <thead>
                  <tr>
                    <th>رقم الفاتورة</th>
                    <th>العميل</th>
                    <th>تاريخ الاستحقاق</th>
                    <th>المبلغ</th>
                    <th>المتبقي</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {dueInvoices.map((inv, idx) => (
                    <tr key={idx} style={{ cursor: 'pointer' }} onClick={() => navigate(inv.saleId ? `/sales/view/${inv.saleId}` : '/debts')}>
                      <td>
                        <Link 
                          to={inv.saleId ? `/sales/view/${inv.saleId}` : '/debts'} 
                          style={{ color: '#2596be', fontWeight: '700', textDecoration: 'none' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {inv.id} <i className="fa-solid fa-link"></i>
                        </Link>
                      </td>
                      <td>{inv.customer}</td>
                      <td>{inv.date}</td>
                      <td style={{ fontWeight: '600' }}>{inv.amount}</td>
                      <td style={{ fontWeight: '600' }}>{inv.remaining}</td>
                      <td><span className={`d2-status-badge ${inv.statusClass}`}>{inv.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                لا توجد فواتير مستحقة الدفع حالياً <i className="fa-solid fa-party-horn"></i>
              </div>
            )}
          </div>
        </div>

        <div className="d2-card">
          <div className="d2-card-header">
            <h3 className="d2-card-title">أقل المنتجات في المخزون</h3>
            <Link to="/inventory/report" style={{ fontSize: '0.85rem', color: '#339af0', textDecoration: 'none' }}>عرض الكل</Link>
          </div>
          <div className="d2-table-wrapper">
            {lowStockProducts.length > 0 ? (
              <table className="d2-table">
                <thead>
                  <tr>
                    <th>المنتج</th>
                    <th>المخزون الحالي</th>
                    <th>الحد الأدنى</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1.2rem' }}>{item.img}</span>
                          {item.name}
                        </div>
                      </td>
                      <td style={{ fontWeight: '700', color: '#ff6b6b' }}>{item.current}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{item.min}</td>
                      <td><span className={`d2-status-badge ${item.statusClass}`}>{item.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                جميع المنتجات في النطاق الآمن للمخزون <i className="fa-solid fa-thumbs-up"></i>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Footer */}
      <div style={{ position: 'relative', marginTop: '20px' }}>
        <div style={{ position: 'absolute', top: '-10px', right: '40px', background: 'var(--bg-body)', padding: '0 10px', fontSize: '0.8rem', color: 'var(--text-muted)', zIndex: 1 }}>إجراءات سريعة</div>
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
          <div className="d2-quick-actions-strip">
            <button className="d2-action-btn" onClick={() => navigate('/pos')}>
              <span style={{ color: '#845ef7' }}><i className="fa-solid fa-cart-shopping"></i></span> فاتورة بيع
            </button>
            <button className="d2-action-btn" onClick={() => navigate('/purchases/add')}>
              <span style={{ color: '#ff922b' }}><i className="fa-solid fa-file-lines"></i></span> فاتورة شراء
            </button>
            <button className="d2-action-btn" onClick={() => navigate('/products/add')}>
              <span style={{ color: '#339af0' }}><i className="fa-solid fa-box"></i></span> إضافة منتج
            </button>
            <button className="d2-action-btn" onClick={() => navigate('/customers')}>
              <span style={{ color: '#20c997' }}><i className="fa-solid fa-user"></i></span> إضافة عميل
            </button>
            <button className="d2-action-btn" onClick={() => navigate('/suppliers')}>
              <span style={{ color: '#ff6b6b' }}><i className="fa-solid fa-building"></i></span> إضافة مورد
            </button>
            <button className="d2-action-btn" onClick={() => navigate('/financial-analytics')}>
              <span style={{ color: '#845ef7' }}><i className="fa-solid fa-chart-column"></i></span> عرض التقارير
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);
};

export default Dashboard2;
