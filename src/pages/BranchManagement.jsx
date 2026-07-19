import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const BranchManagement = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useGlobalUI();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mock data for chart
  const salesTrend = [
    { date: '10/07', sales: 1200 },
    { date: '11/07', sales: 1500 },
    { date: '12/07', sales: 1800 },
    { date: '13/07', sales: 1400 },
    { date: '14/07', sales: 2100 },
    { date: '15/07', sales: 1900 },
    { date: '16/07', sales: 2400 },
  ];

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await Api.getBranchStats(id);
      setStats(res);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [id]);

  if (loading) return <Loader message="جاري تحميل إحصائيات الفرع..." />;
  if (!stats) return <div className="bm-error-state">فشل تحميل البيانات</div>;

  return (
    <div className="bm-container">
      <div className="bm-header">
        <div>
          <h2 className="bm-title"><i className="fa-solid fa-building"></i> تفاصيل فرع: {stats.branchName || 'الفرع'}</h2>
          <p className="bm-subtitle">ملخص أداء الفرع والإحصائيات الحيوية</p>
        </div>
        <div className="bm-header-actions">
          <button className="bm-btn bm-btn-secondary" onClick={() => navigate('/branches')}>
            <i className="fas fa-arrow-right" style={{marginLeft: '8px'}}></i>
            العودة للقائمة
          </button>
          <button className="bm-btn bm-btn-primary" onClick={loadStats}>
            <i className="fas fa-sync-alt" style={{marginLeft: '8px'}}></i>
            تحديث
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="bm-kpi-grid">
        <div className="bm-kpi-card">
          <div className="bm-kpi-header">
            <span className="bm-kpi-title">عدد المنتجات</span>
            <div className="bm-kpi-icon icon-blue"><i className="fa-solid fa-box"></i></div>
          </div>
          <div className="bm-kpi-value">{Number(stats.productCount || 0).toLocaleString()}</div>
          <div className="bm-kpi-footer">إجمالي المنتجات المسجلة</div>
        </div>

        <div className="bm-kpi-card">
          <div className="bm-kpi-header">
            <span className="bm-kpi-title">نواقص المخزون</span>
            <div className="bm-kpi-icon icon-red"><i className="fa-solid fa-triangle-exclamation"></i></div>
          </div>
          <div className="bm-kpi-value">{Number(stats.lowStockCount || 0).toLocaleString()}</div>
          <div className="bm-kpi-footer" style={{color: '#ef4444'}}>منتجات قاربت على النفاد</div>
        </div>

        <div className="bm-kpi-card">
          <div className="bm-kpi-header">
            <span className="bm-kpi-title">فريق العمل</span>
            <div className="bm-kpi-icon icon-purple"><i className="fa-solid fa-users"></i></div>
          </div>
          <div className="bm-kpi-value">{Number(stats.employeeCount || 0).toLocaleString()}</div>
          <div className="bm-kpi-footer">موظفين بالفرع</div>
        </div>

        <div className="bm-kpi-card">
          <div className="bm-kpi-header">
            <span className="bm-kpi-title">إجمالي الفواتير</span>
            <div className="bm-kpi-icon icon-teal"><i className="fa-solid fa-receipt"></i></div>
          </div>
          <div className="bm-kpi-value">{Number((stats.saleInvoiceCount || 0) + (stats.purchaseInvoiceCount || 0)).toLocaleString()}</div>
          <div className="bm-kpi-footer">
            <span style={{marginLeft: '10px'}}>{stats.saleInvoiceCount || 0} مبيعات</span>
            <span>{stats.purchaseInvoiceCount || 0} مشتريات</span>
          </div>
        </div>

        <div className="bm-kpi-card" style={{gridColumn: 'span 2'}}>
          <div className="bm-kpi-header">
            <span className="bm-kpi-title">أداء الفرع (إجمالي المبيعات)</span>
            <div className="bm-kpi-icon icon-green"><i className="fa-solid fa-sack-dollar"></i></div>
          </div>
          <div className="bm-kpi-value" style={{color: '#10b981'}}>{Number(stats.totalSales || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} ج.م</div>
          <div className="bm-kpi-footer">
            <span className="bm-trend trend-up">↑ 12%</span>
            <span style={{marginRight: '8px'}}>نمو المبيعات مقارنة بالشهر السابق</span>
          </div>
        </div>
      </div>

      <div className="bm-middle-section">
        {/* Quick Actions */}
        <div className="bm-card">
          <h3 className="bm-card-title">إجراءات سريعة للفرع</h3>
          <div className="bm-quick-actions">
            <button className="bm-action-btn" onClick={() => navigate(`/products?branchId=${id}`)}>
              <span className="bm-action-icon"><i className="fa-solid fa-box"></i></span>
              إدارة منتجات الفرع
            </button>
            <button className="bm-action-btn" onClick={() => navigate(`/suppliers?branchId=${id}`)}>
              <span className="bm-action-icon"><i className="fa-solid fa-handshake"></i></span>
              الموردين والديون
            </button>
            <button className="bm-action-btn" onClick={() => navigate(`/treasury?branchId=${id}`)}>
              <span className="bm-action-icon"><i className="fa-solid fa-money-bill"></i></span>
              خزينة الفرع
            </button>
            <button className="bm-action-btn" onClick={() => navigate(`/reports/sales?branchId=${id}`)}>
              <span className="bm-action-icon"><i className="fa-solid fa-chart-column"></i></span>
              تقارير المبيعات
            </button>
          </div>
        </div>

        {/* Mock Chart */}
        <div className="bm-card">
          <h3 className="bm-card-title">مؤشر أداء المبيعات (آخر 7 أيام)</h3>
          <div style={{ height: '250px', width: '100%', marginTop: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} />
                <RechartsTooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                  formatter={(value) => [`${value} ج.م`, 'المبيعات']}
                />
                <Line type="monotone" dataKey="sales" stroke="#2596be" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .bm-container { padding: 24px; direction: rtl; font-family: 'Cairo', sans-serif; background-color: #f8f9fa; min-height: 100vh; }
        .bm-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .bm-title { font-size: 1.8rem; font-weight: 700; color: #1e293b; margin: 0 0 8px 0; }
        .bm-subtitle { font-size: 1rem; color: #64748b; margin: 0; }
        .bm-header-actions { display: flex; gap: 12px; }
        .bm-btn { padding: 10px 20px; border-radius: 8px; font-weight: 700; font-family: 'Cairo', sans-serif; cursor: pointer; border: none; display: flex; align-items: center; transition: all 0.2s; }
        .bm-btn-primary { background: #2596be; color: white; }
        .bm-btn-primary:hover { background: #1c7a9c; }
        .bm-btn-secondary { background: white; color: #475569; border: 1px solid #cbd5e1; }
        .bm-btn-secondary:hover { background: #f1f5f9; }

        .bm-kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 20px; margin-bottom: 24px; }
        .bm-kpi-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 12px; transition: transform 0.2s; grid-column: span 1; }
        .bm-kpi-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.06); }
        .bm-kpi-header { display: flex; justify-content: space-between; align-items: center; }
        .bm-kpi-title { font-size: 0.95rem; font-weight: 700; color: #64748b; }
        .bm-kpi-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; justify-content: center; align-items: center; font-size: 1.3rem; }
        .bm-kpi-value { font-size: 1.8rem; font-weight: 800; color: #0f172a; }
        .bm-kpi-footer { font-size: 0.85rem; color: #94a3b8; font-weight: 600; display: flex; align-items: center; }

        .icon-blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .icon-red { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        .icon-purple { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
        .icon-teal { background: rgba(20, 184, 166, 0.1); color: #14b8a6; }
        .icon-green { background: rgba(16, 185, 129, 0.1); color: #10b981; }

        .trend-up { color: #10b981; background: rgba(16, 185, 129, 0.1); padding: 2px 8px; border-radius: 4px; }

        .bm-middle-section { display: grid; grid-template-columns: 1fr 2fr; gap: 24px; }
        .bm-card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; }
        .bm-card-title { font-size: 1.1rem; font-weight: 800; color: #1e293b; margin: 0 0 20px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; }

        .bm-quick-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .bm-action-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; color: #334155; font-weight: 700; font-family: 'Cairo', sans-serif; font-size: 1rem; cursor: pointer; transition: all 0.2s; }
        .bm-action-btn:hover { background: white; border-color: #2596be; color: #2596be; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(37, 150, 190, 0.1); }
        .bm-action-icon { font-size: 2rem; }

        /* Dark Mode */
        [data-theme='dark'] .bm-container, .dark-mode .bm-container { background-color: #121212 !important; }
        [data-theme='dark'] .bm-title, .dark-mode .bm-title { color: #f8fafc !important; }
        [data-theme='dark'] .bm-subtitle, .dark-mode .bm-subtitle { color: #94a3b8 !important; }
        [data-theme='dark'] .bm-card, [data-theme='dark'] .bm-kpi-card, .dark-mode .bm-card, .dark-mode .bm-kpi-card { background-color: #1c1c1c !important; border-color: #2e2e2e !important; box-shadow: none !important; }
        [data-theme='dark'] .bm-kpi-value, .dark-mode .bm-kpi-value { color: #f8fafc !important; }
        [data-theme='dark'] .bm-card-title, .dark-mode .bm-card-title { color: #f8fafc !important; border-bottom-color: #2e2e2e !important; }
        [data-theme='dark'] .bm-action-btn, .dark-mode .bm-action-btn { background-color: #1c1c1c !important; border-color: #2e2e2e !important; color: #f8fafc !important; }
        [data-theme='dark'] .bm-action-btn:hover, .dark-mode .bm-action-btn:hover { border-color: #2596be !important; color: #2596be !important; }
        [data-theme='dark'] .bm-btn-secondary, .dark-mode .bm-btn-secondary { background-color: #1c1c1c !important; color: #f8fafc !important; border-color: #2e2e2e !important; }

        @media (max-width: 1200px) {
          .bm-kpi-grid { grid-template-columns: repeat(3, 1fr); }
          .bm-kpi-card:last-child { grid-column: span 3; }
          .bm-middle-section { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .bm-kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .bm-kpi-card:last-child { grid-column: span 2; }
          .bm-quick-actions { grid-template-columns: 1fr; }
          .bm-header { flex-direction: column; align-items: flex-start; gap: 16px; }
        }
      `}} />
    </div>
  );
};

export default BranchManagement;
