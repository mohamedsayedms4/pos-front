import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import SyncService from '../services/SyncService';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';

const OfflineAudit = () => {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [offlineSales, setOfflineSales] = useState([]);
  const [branches, setBranches] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [stats, setStats] = useState({ products: 0, customers: 0, pending: 0, branches: 0, warehouses: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useGlobalUI();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [p, c, s, b, w] = await Promise.all([
        db.products.toArray(),
        db.customers.toArray(),
        db.offlineSales.toArray(),
        db.branches.toArray(),
        db.warehouses.toArray()
      ]);
      
      setProducts(p);
      setCustomers(c);
      setOfflineSales(s);
      setBranches(b);
      setWarehouses(w);
      setStats({
        products: p.length,
        customers: c.length,
        branches: b.length,
        warehouses: w.length,
        pending: s.filter(x => x.status === 'pending').length
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!navigator.onLine) {
      toast('يجب أن تكون متصلاً بالإنترنت للمزامنة', 'warning');
      return;
    }
    setSyncing(true);
    try {
      toast('جاري بدء المزامنة الشاملة...', 'info');
      await SyncService.pullDataFromServer();
      await SyncService.pushOfflineSales();
      await loadData();
      toast('تمت المزامنة بنجاح', 'success');
    } catch (err) {
      toast('فشلت المزامنة: ' + err.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const clearDB = async () => {
    if (window.confirm('⚠️ تحذير: سيتم مسح كافة البيانات المخزنة محلياً. هل أنت متأكد؟')) {
      await db.products.clear();
      await db.customers.clear();
      await db.branches.clear();
      await db.warehouses.clear();
      await db.offlineSales.clear();
      loadData();
      toast('تم تصفير قاعدة البيانات المحلية', 'info');
    }
  };

  if (loading) return <Loader message="جاري تحليل البيانات المحلية..." />;

  return (
    <div className="audit-dashboard">
      {syncing && <div className="sync-overlay"><Loader message="جاري تحديث البيانات من السيرفر..." /></div>}
      
      <header className="dashboard-header">
        <div className="header-content">
          <div className="title-wrapper">
            <span className="pulsing-dot"></span>
            <h1>مركز التحكم بالأوفلاين</h1>
          </div>
          <p>إدارة البيانات المحلية، متابعة طابور المزامنة، وتجهيز النظام للعمل بدون إنترنت</p>
        </div>
        <div className="header-buttons">
          <button className="btn-premium sync" onClick={handleSync} disabled={syncing}>
            <span className="icon">🚀</span>
            <span>مزامنة شاملة</span>
          </button>
          <button className="btn-premium clear" onClick={clearDB}>
            <span className="icon">🧹</span>
            <span>تصفير الذاكرة</span>
          </button>
        </div>
      </header>

      <section className="stats-row">
        <div className="stat-card-premium">
          <div className="card-bg"></div>
          <div className="card-icon products-icon">📦</div>
          <div className="card-body">
            <span className="label">المنتجات</span>
            <span className="number">{stats.products.toLocaleString()}</span>
          </div>
        </div>

        <div className="stat-card-premium">
          <div className="card-bg"></div>
          <div className="card-icon customers-icon">👥</div>
          <div className="card-body">
            <span className="label">العملاء</span>
            <span className="number">{stats.customers.toLocaleString()}</span>
          </div>
        </div>

        <div className="stat-card-premium">
          <div className="card-bg"></div>
          <div className="card-icon branches-icon">🏢</div>
          <div className="card-body">
            <span className="label">الفروع / المخازن</span>
            <span className="number">{stats.branches} / {stats.warehouses}</span>
          </div>
        </div>

        <div className={`stat-card-premium pending ${stats.pending > 0 ? 'has-pending' : ''}`}>
          <div className="card-bg"></div>
          <div className="card-icon sales-icon">⏳</div>
          <div className="card-body">
            <span className="label">فواتير معلقة</span>
            <span className="number">{stats.pending}</span>
          </div>
        </div>
      </section>

      <main className="content-grid">
        <div className="main-column">
          <div className="glass-panel queue-panel">
            <div className="panel-header">
              <h2>🧾 طابور المبيعات (Queue)</h2>
            </div>
            <div className="panel-body scrollable">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>المعرف</th>
                    <th>التاريخ والوقت</th>
                    <th>إجمالي المبلغ</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {offlineSales.length === 0 ? (
                    <tr><td colSpan="4" className="empty-msg">لا توجد عمليات مبيعات مسجلة في الذاكرة حالياً</td></tr>
                  ) : (
                    offlineSales.sort((a,b) => b.timestamp - a.timestamp).map(s => (
                      <tr key={s.id}>
                        <td><span className="badge-id">#{s.id}</span></td>
                        <td>{new Date(s.timestamp).toLocaleString('ar-EG')}</td>
                        <td className="bold text-emerald">{s.data.paidAmount?.toFixed(2)} ج.م</td>
                        <td>
                          <span className={`status-pill ${s.status}`}>
                            {s.status === 'pending' ? '⏳ بانتظار المزامنة' : '✅ تم الرفع'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="side-column">
          <div className="glass-panel data-health">
            <div className="panel-header">
              <h2>🛠️ تفاصيل الفروع والمخازن</h2>
            </div>
            <div className="panel-body">
              <div className="branch-list">
                {branches.map(b => (
                  <div key={b.id} className="health-item">
                    <span className="dot online"></span>
                    <span className="name">{b.name || 'بدون اسم!'}</span>
                    <span className="status-val">ID: {b.id}</span>
                  </div>
                ))}
                {branches.length === 0 && <p className="empty-msg">لا توجد فروع</p>}
              </div>
              <hr style={{ borderColor: '#27272a' }} />
              <div className="warehouse-list mt-3">
                {warehouses.slice(0, 5).map(w => (
                  <div key={w.id} className="health-item compact">
                    <span className="dot online"></span>
                    <span className="name">{w.name} (فرع {w.branchId})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-panel preview-panel">
            <div className="panel-header">
              <h2>📋 عينة منتجات</h2>
            </div>
            <div className="panel-body compact-scroll">
              {products.slice(0, 10).map(p => (
                <div key={p.id} className="mini-product-card">
                  <span className="p-title">{p.name}</span>
                  <span className="p-price">{p.salePrice}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .audit-dashboard { padding: 40px; color: #fff; font-family: 'Inter', 'Cairo', sans-serif; background: #09090b; min-height: 100vh; direction: rtl; }
        .dashboard-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 50px; }
        .title-wrapper { display: flex; align-items: center; gap: 15px; margin-bottom: 8px; }
        .pulsing-dot { width: 12px; height: 12px; background: #3b82f6; border-radius: 50%; box-shadow: 0 0 15px #3b82f6; animation: pulse-ring 2s infinite; }
        @keyframes pulse-ring { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.8); opacity: 0; } 100% { transform: scale(1); opacity: 0; } }
        .dashboard-header h1 { font-size: 2.5rem; font-weight: 900; margin: 0; }
        .dashboard-header p { color: #a1a1aa; margin: 0; }
        .header-buttons { display: flex; gap: 15px; }
        .btn-premium { padding: 14px 28px; border-radius: 16px; border: none; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: 0.3s; }
        .btn-premium.sync { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #fff; }
        .btn-premium.clear { background: rgba(255, 255, 255, 0.05); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
        .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 30px; margin-bottom: 50px; }
        .stat-card-premium { position: relative; padding: 25px; border-radius: 20px; background: #18181b; border: 1px solid #27272a; }
        .card-icon { font-size: 1.8rem; margin-bottom: 15px; }
        .card-body .label { color: #71717a; font-size: 0.9rem; }
        .card-body .number { display: block; font-size: 1.8rem; font-weight: 900; margin-top: 5px; }
        .content-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 30px; }
        .glass-panel { background: #18181b; border: 1px solid #27272a; border-radius: 24px; padding: 25px; }
        .panel-header h2 { font-size: 1.2rem; font-weight: 700; margin: 0; }
        .premium-table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
        .premium-table tr { background: rgba(255,255,255,0.02); }
        .premium-table td { padding: 12px; }
        .badge-id { background: #27272a; padding: 3px 8px; border-radius: 6px; color: #a1a1aa; font-family: monospace; }
        .status-pill { padding: 4px 12px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; }
        .status-pill.pending { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .status-pill.synced { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .health-item { display: flex; align-items: center; gap: 12px; padding: 10px; background: rgba(255,255,255,0.02); border-radius: 12px; margin-bottom: 8px; }
        .health-item.compact { padding: 6px 10px; font-size: 0.85rem; }
        .dot.online { width: 8px; height: 8px; background: #10b981; border-radius: 50%; }
        .mini-product-card { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #27272a; }
        .p-title { font-weight: 600; font-size: 0.9rem; }
        .p-price { color: #3b82f6; font-weight: 800; }
        .empty-msg { text-align: center; padding: 30px; color: #71717a; }
        .sync-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 2000; display: flex; align-items: center; justify-content: center; }
        .scrollable { overflow-y: auto; max-height: 450px; }
        .compact-scroll { overflow-y: auto; max-height: 350px; }
      `}</style>
    </div>
  );
};

export default OfflineAudit;
