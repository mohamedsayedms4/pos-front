import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    recentProducts: []
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [products, categories, suppliers] = await Promise.all([
          Api.getProducts().catch(() => []),
          Api.getCategories().catch(() => []),
          Api.getSuppliers().catch(() => []),
        ]);

        let users = [];
        if (Api.can('ROLE_ADMIN')) {
          try { users = await Api.getUsers(); } catch { }
        }

        const lowStockItems = products.filter(p => Number(p.stock) < 10 && Number(p.stock) > 0);
        const outOfStockItems = products.filter(p => Number(p.stock) <= 0);
        const recent = [...products].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

        setStats({
          products: products.length,
          categories: categories.length,
          suppliers: suppliers.length,
          users: users.length,
          lowStock: lowStockItems,
          outOfStock: outOfStockItems,
          recentProducts: recent
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

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
          <Link className="quick-action-card" to="/notifications">
            <div className="qa-icon">◈</div>
            <div className="qa-label">الإشعارات</div>
          </Link>
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
