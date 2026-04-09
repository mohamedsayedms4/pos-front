import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Api from '../services/api';
import Loader from '../components/common/Loader';

const Dashboard = () => {
  const [stats, setStats] = useState({
    products: 0,
    categories: 0,
    suppliers: 0,
    users: 0,
    lowStock: [],
    outOfStock: [],
    recentProducts: [],
    dailySales: [],
    debtSummary: { totalReceivable: 0, totalPayable: 0, dailyReceivable: 0, dailyPayable: 0, overdueCount: 0, netDebtPosition: 0 },
    debtTrend: []
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [products, categories, suppliers, dailySales, debtSummary, debtDaily] = await Promise.all([
          Api.getProducts().catch(() => []),
          Api.getCategories().catch(() => []),
          Api.getSuppliers().catch(() => []),
          Api.getDailySaleStats(7).catch(() => []),
          Api.getDebtStats().catch(() => ({})),
          Api.getDailyDebtStats(7).catch(() => [])
        ]);

        let users = [];
        if (Api.can('ROLE_ADMIN')) {
          try { users = await Api.getUsers(); } catch { }
        }

        const lowStockItems = Array.isArray(products) ? products.filter(p => Number(p.stock) < 10 && Number(p.stock) > 0) : (products.content || []).filter(p => Number(p.stock) < 10 && Number(p.stock) > 0);
        const outOfStockItems = Array.isArray(products) ? products.filter(p => Number(p.stock) <= 0) : (products.content || []).filter(p => Number(p.stock) <= 0);
        
        const productsArray = Array.isArray(products) ? products : (products.content || []);
        const recent = [...productsArray].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

        setStats({
          products: products.totalElements ?? products.totalItems ?? productsArray.length,
          categories: categories.totalElements ?? categories.totalItems ?? (Array.isArray(categories) ? categories.length : (categories.content || []).length),
          suppliers: suppliers.totalElements ?? suppliers.totalItems ?? (Array.isArray(suppliers) ? suppliers.length : (suppliers.content || []).length),
          users: Array.isArray(users) ? users.length : (users.totalElements || users.length || 0),
          lowStock: lowStockItems,
          outOfStock: outOfStockItems,
          recentProducts: recent,
          dailySales: Array.isArray(dailySales) ? dailySales.map(d => ({
            name: new Date(d.saleDate).toLocaleDateString('ar-EG', { weekday: 'short' }),
            sales: d.dailyTotal || 0,
            count: d.invoiceCount || 0
          })) : [],
          debtSummary: debtSummary,
          debtTrend: processDebtTrend(debtDaily)
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const processDebtTrend = (data) => {
    if (!Array.isArray(data)) return [];
    
    // Group by date
    const grouped = data.reduce((acc, curr) => {
        const dateStr = new Date(curr.debtDate).toLocaleDateString('ar-EG', { weekday: 'short' });
        if (!acc[dateStr]) acc[dateStr] = { name: dateStr, receivable: 0, payable: 0 };
        
        if (curr.debtType === 'RECEIVABLE') acc[dateStr].receivable = curr.dailyTotal;
        else acc[dateStr].payable = curr.dailyTotal;
        
        return acc;
    }, {});
    
    return Object.values(grouped).reverse();
  };

  if (loading) {
    return <Loader message="جاري تحميل إحصائيات النظام..." />;
  }

  return (
    <div className="page-section">
      {/* Metro Stat Tiles */}
      <div className="stats-grid">
        {Api.can('PRODUCT_READ') && (
          <div className="stat-card cobalt tile-wd-md tile-flip-container">
            <div className="tile-front">
              <div className="stat-value">{stats.products}</div>
              <div className="stat-label">المخزن</div>
              <div className="stat-subtitle">إجمالي المنتجات المسجلة</div>
              <div className="stat-icon">▨</div>
            </div>
            <div className="tile-back">
              <div style={{ fontSize: '1.1rem', fontWeight: 200 }}>متوفر الآن {stats.products} صنف مختلف</div>
            </div>
          </div>
        )}

        {Api.can('CATEGORY_READ') && (
          <div className="stat-card emerald tile-sq-md tile-flip-container">
            <div className="tile-front">
              <div className="stat-value">{stats.categories}</div>
              <div className="stat-label">الفئات</div>
              <div className="stat-icon">▤</div>
            </div>
            <div className="tile-back">
              <div style={{ fontSize: '0.85rem', fontWeight: 300 }}>{stats.categories} قسم</div>
            </div>
          </div>
        )}

        {Api.can('SUPPLIER_READ') && (
          <div className="stat-card amber tile-wd-sm tile-flip-container">
            <div className="tile-front">
              <div className="stat-value">{stats.suppliers}</div>
              <div className="stat-label">الموردين</div>
              <div className="stat-icon">▧</div>
            </div>
            <div className="tile-back">
              <div style={{ fontSize: '0.8rem', fontWeight: 300 }}>{stats.suppliers} مورد</div>
            </div>
          </div>
        )}

        {Api.can('ROLE_ADMIN') && (
          <div className="stat-card rose tile-sq-sm tile-flip-container">
            <div className="tile-front">
              <div className="stat-value">{stats.users}</div>
              <div className="stat-label">فريقنا</div>
              <div className="stat-icon">◉</div>
            </div>
            <div className="tile-back">
              <div style={{ fontSize: '0.7rem', fontWeight: 400 }}>{stats.users} مستخدم</div>
            </div>
          </div>
        )}

        <div className="stat-card purple tile-sq-sm">
          <div className="stat-value" style={{ fontSize: '1.2rem' }}>9+</div>
          <div className="stat-label">تنبيه</div>
          <div className="stat-icon">◈</div>
        </div>

        <div className="stat-card magenta tile-wd-lg tile-flip-container">
          <div className="tile-front">
            <div className="stat-value" style={{ display: 'inline-block', marginRight: '8px' }}>{stats.lowStock.length}</div>
            <div className="stat-label" style={{ display: 'inline-block' }}>نواقص تحتاج توفير</div>
            <div className="stat-icon">⚠</div>
          </div>
          <div className="tile-back">
            <div style={{ fontSize: '0.9rem', fontWeight: 300 }}>
              {stats.lowStock.length > 0 ? `${stats.lowStock.length} منتج بحاجة لشراء` : 'المخزون كافٍ ✓'}
            </div>
          </div>
        </div>

        <div className="stat-card teal tile-sq-sm">
          <div className="stat-value" style={{ fontSize: '1.2rem' }}>{stats.outOfStock.length}</div>
          <div className="stat-label">نفذ</div>
        </div>

        {Api.can('AUDIT_READ') && (
          <div className="stat-card cobalt tile-sq-sm" style={{ background: '#333', cursor: 'pointer' }} onClick={() => navigate('/audit')}>
            <div className="stat-icon" style={{ top: '50%', right: '50%', transform: 'translate(50%,-50%)', opacity: 0.8 }}>▣</div>
          </div>
        )}

        {/* Debt Tiles */}
        <div className="stat-card emerald tile-wd-sm tile-flip-container" style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}>
          <div className="tile-front">
            <div className="stat-value" style={{ fontSize: '1.5rem' }}>{Number(stats.debtSummary.totalReceivable).toLocaleString()}</div>
            <div className="stat-label">تحصيلات (لنا)</div>
            <div className="stat-icon">💰</div>
          </div>
          <div className="tile-back">
            <div style={{ fontSize: '0.9rem' }}>جديد اليوم: {Number(stats.debtSummary.dailyReceivable).toLocaleString()} ج.م</div>
          </div>
        </div>

        <div className="stat-card amber tile-wd-sm tile-flip-container" style={{ background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)' }}>
          <div className="tile-front">
            <div className="stat-value" style={{ fontSize: '1.5rem' }}>{Number(stats.debtSummary.totalPayable).toLocaleString()}</div>
            <div className="stat-label">مديونيات (علينا)</div>
            <div className="stat-icon">💸</div>
          </div>
          <div className="tile-back">
            <div style={{ fontSize: '0.9rem' }}>جديد اليوم: {Number(stats.debtSummary.dailyPayable).toLocaleString()} ج.م</div>
          </div>
        </div>
      </div>

      {/* Metro Quick Actions Tiles */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontWeight: 200, fontSize: '2rem', marginBottom: '12px', letterSpacing: '1px' }}>إجراءات سريعة</h1>
        <div className="quick-actions">
          {Api.can('PRODUCT_READ') && (
            <Link className="quick-action-card" to="/products">
              <div className="qa-icon">▨</div>
              <div className="qa-label">المنتجات</div>
            </Link>
          )}
          {Api.can('CATEGORY_READ') && (
            <Link className="quick-action-card" to="/categories">
              <div className="qa-icon">▤</div>
              <div className="qa-label">الفئات</div>
            </Link>
          )}
          {Api.can('SUPPLIER_READ') && (
            <Link className="quick-action-card" to="/suppliers">
              <div className="qa-icon">▧</div>
              <div className="qa-label">الموردين</div>
            </Link>
          )}
          {Api.can('ROLE_ADMIN') && (
            <Link className="quick-action-card" to="/users">
              <div className="qa-icon">◉</div>
              <div className="qa-label">المستخدمين</div>
            </Link>
          )}
          {Api.can('AUDIT_READ') && (
            <Link className="quick-action-card" to="/audit">
              <div className="qa-icon">▣</div>
              <div className="qa-label">المراجعة</div>
            </Link>
          )}
          {Api.can('SALE_READ') && (
            <Link className="quick-action-card" to="/sales/analytics" style={{ background: 'var(--metro-purple)' }}>
              <div className="qa-icon">📊</div>
              <div className="qa-label">تحليلات البيع</div>
            </Link>
          )}
          <Link className="quick-action-card" to="/notifications">
            <div className="qa-icon">◈</div>
            <div className="qa-label">الإشعارات</div>
          </Link>
        </div>
      </div>

      {/* Daily Sales Chart */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3>📈 مبيعات آخر 7 أيام</h3>
        </div>
        <div className="card-body" style={{ height: '300px', width: '100%' }}>
          {stats.dailySales.length > 0 ? (
            <ResponsiveContainer>
              <AreaChart data={stats.dailySales} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSalesTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--metro-blue)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--metro-blue)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" />
                <Tooltip 
                  formatter={(value, name) => [name === 'sales' ? `${value} ج.م` : value, name === 'sales' ? 'إجمالي المبيعات' : 'عدد الفواتير']}
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
                  itemStyle={{ color: 'var(--metro-blue)' }}
                />
                <Area type="monotone" dataKey="sales" stroke="var(--metro-blue)" fillOpacity={1} fill="url(#colorSalesTrend)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: '20px', color: 'var(--text-dim)', textAlign: 'center', marginTop: '100px' }}>لا توجد بيانات مبيعات في الفترة المحددة</div>
          )}
        </div>
      </div>

      {/* Daily Debt Trend Chart */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
            <h3>📊 تحليل حركة الديون السبعة أيام الماضية</h3>
        </div>
        <div className="card-body" style={{ height: '300px', width: '100%' }}>
            {stats.debtTrend.length > 0 ? (
                <ResponsiveContainer>
                    <AreaChart data={stats.debtTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorPay" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="name" />
                        <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-color)', textAlign: 'right' }}
                        />
                        <Area type="monotone" name="لنا (تحصيلات)" dataKey="receivable" stroke="#10b981" fillOpacity={1} fill="url(#colorRec)" />
                        <Area type="monotone" name="علينا (ديون)" dataKey="payable" stroke="#f59e0b" fillOpacity={1} fill="url(#colorPay)" />
                    </AreaChart>
                </ResponsiveContainer>
            ) : (
                <div style={{ padding: '20px', color: 'var(--text-dim)', textAlign: 'center', marginTop: '100px' }}>لا توجد تحركات ديون في الفترة المحددة</div>
            )}
        </div>
      </div>

      {/* Content Tables Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
        <div className="card">
          <div className="card-header">
            <h3>أحدث الإضافات</h3>
          </div>
          <div className="card-body no-padding">
            {stats.recentProducts.length > 0 ? (
              <table className="data-table">
                <tbody>
                  {stats.recentProducts.map(p => (
                    <tr key={p.id || p.name}>
                      <td>{p.name}</td>
                      <td style={{ textAlign: 'left', color: 'var(--metro-green)' }}>{Number(p.salePrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '20px', color: 'var(--text-dim)' }}>لا يوجد بيانات</div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>تنبيهات المخزون</h3>
          </div>
          <div className="card-body no-padding">
            {stats.lowStock.slice(0, 5).length > 0 ? (
              <table className="data-table">
                <tbody>
                  {stats.lowStock.slice(0, 5).map(p => (
                    <tr key={p.id || p.name}>
                      <td>{p.name}</td>
                      <td style={{ textAlign: 'left' }}>
                        <span className={`badge ${p.stock == 0 ? 'badge-danger' : 'badge-warning'}`}>{p.stock}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '20px', color: 'var(--text-green)' }}>المخزون جيد جداً</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
