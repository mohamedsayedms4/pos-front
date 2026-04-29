import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import StatTile from '../components/common/StatTile';

const BranchManagement = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useGlobalUI();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <Loader message="جاري تحميل بيانات الفرع..." />;
  if (!stats) return <div className="error-state">فشل تحميل البيانات</div>;

  return (
    <div className="page-section" style={{ direction: 'rtl' }}>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>🏢 إدارة فرع: {stats.branchName}</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/branches')}>
          العودة للقائمة
        </button>
      </div>

      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <StatTile
          id="br_prod_count"
          label="عدد المنتجات"
          value={stats.productCount}
          icon="📦"
          defaults={{ color: 'blue', size: 'tile-wd-sm' }}
        />
        <StatTile
          id="br_supp_count"
          label="عدد الموردين"
          value={stats.supplierCount}
          icon="🤝"
          defaults={{ color: 'emerald', size: 'tile-wd-sm' }}
        />
        <StatTile
          id="br_treasury"
          label="رصيد الخزينة"
          value={`${Number(stats.treasuryBalance).toLocaleString()} ج.م`}
          icon="💰"
          defaults={{ color: 'amber', size: 'tile-wd-sm' }}
        />
      </div>

      <div className="grid grid-3 gap-20">
        <div className="card clickable-card" onClick={() => navigate(`/products?branchId=${id}`)}>
          <div className="card-body text-center" style={{ padding: '40px 20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '15px' }}>📦</div>
            <h3>إدارة المنتجات</h3>
            <p className="text-muted">إضافة وتعديل ومراقبة مخزون المنتجات التابعة لهذا الفرع</p>
          </div>
        </div>

        <div className="card clickable-card" onClick={() => navigate(`/suppliers?branchId=${id}`)}>
          <div className="card-body text-center" style={{ padding: '40px 20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '15px' }}>🤝</div>
            <h3>إدارة الموردين</h3>
            <p className="text-muted">إدارة الموردين والديون والمعاملات الخاصة بهذا الفرع</p>
          </div>
        </div>

        <div className="card clickable-card" onClick={() => navigate(`/treasury?branchId=${id}`)}>
          <div className="card-body text-center" style={{ padding: '40px 20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '15px' }}>💰</div>
            <h3>الخزينة والمعاملات</h3>
            <p className="text-muted">مراقبة الوارد والمنصرف من خزينة الفرع</p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .clickable-card {
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          border: 1px solid transparent;
        }
        .clickable-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.1);
          border-color: var(--primary-color);
        }
        .text-center { text-align: center; }
      `}} />
    </div>
  );
};

export default BranchManagement;
