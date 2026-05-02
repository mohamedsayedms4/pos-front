import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Api from '../services/api';
import Loader from '../components/common/Loader';
import { useGlobalUI } from '../components/common/GlobalUI';
import '../styles/pages/TrialBalancePremium.css';

const TrialBalance = () => {
  const { toast } = useGlobalUI();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await Api.getTrialBalance();
      setAccounts(data || []);
    } catch (err) {
      toast('Failed to load trial balance: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalAssets = accounts.filter(a => a.type === 'ASSET').reduce((sum, a) => sum + a.currentBalance, 0);
  const totalLiabilities = accounts.filter(a => a.type === 'LIABILITY').reduce((sum, a) => sum + a.currentBalance, 0);
  const cashAccount = accounts.find(a => a.code === '1101') || accounts.find(a => a.name.includes('نقدية'));

  const typeConfig = {
    ASSET: { label: 'أصل', color: '#10b981', icon: 'fa-plus-circle' },
    LIABILITY: { label: 'خصم', color: '#f59e0b', icon: 'fa-minus-circle' },
    EQUITY: { label: 'حقوق ملكية', color: '#6366f1', icon: 'fa-users' },
    REVENUE: { label: 'إيراد', color: '#10b981', icon: 'fa-arrow-up' },
    EXPENSE: { label: 'مصروف', color: '#f43f5e', icon: 'fa-arrow-down' }
  };

  return (
    <div className="trial-balance-container">
      {/* 1. Header */}
      <div className="tb-header-row">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="tb-breadcrumbs">
            <Link to="/dashboard">الرئيسية</Link> / <span>المحاسبة</span>
          </div>
          <h1>ميزان المراجعة</h1>
        </div>
        <div className="tb-header-actions">
          <button className="tb-btn-premium tb-btn-blue" onClick={loadData}>
            <i className="fas fa-sync-alt"></i> تحديث الأرصدة
          </button>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="tb-stats-grid">
        <div className="tb-stat-card">
          <div className="tb-stat-info">
            <h4>إجمالي الأصول</h4>
            <div className="tb-stat-value">{totalAssets.toLocaleString('ar-EG')} <span style={{fontSize: '0.8rem'}}>ج.م</span></div>
          </div>
          <div className="tb-stat-visual">
            <div className="tb-stat-icon icon-green">
              <i className="fas fa-balance-scale-right"></i>
            </div>
          </div>
        </div>
        <div className="tb-stat-card">
          <div className="tb-stat-info">
            <h4>إجمالي الخصوم</h4>
            <div className="tb-stat-value">{totalLiabilities.toLocaleString('ar-EG')} <span style={{fontSize: '0.8rem'}}>ج.م</span></div>
          </div>
          <div className="tb-stat-visual">
            <div className="tb-stat-icon icon-amber">
              <i className="fas fa-balance-scale-left"></i>
            </div>
          </div>
        </div>
        <div className="tb-stat-card">
          <div className="tb-stat-info">
            <h4>رصيد النقدية</h4>
            <div className="tb-stat-value">{cashAccount?.currentBalance.toLocaleString('ar-EG') || '0'} <span style={{fontSize: '0.8rem'}}>ج.م</span></div>
          </div>
          <div className="tb-stat-visual">
            <div className="tb-stat-icon icon-blue">
              <i className="fas fa-money-check-alt"></i>
            </div>
          </div>
        </div>
        <div className="tb-stat-card">
          <div className="tb-stat-info">
            <h4>عدد الحسابات</h4>
            <div className="tb-stat-value">{accounts.length} <span style={{fontSize: '0.8rem'}}>حساب</span></div>
          </div>
          <div className="tb-stat-visual">
            <div className="tb-stat-icon icon-purple">
              <i className="fas fa-list-ol"></i>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Table Card */}
      <div className="tb-table-card">
        <div style={{ padding: '24px', borderBottom: '1px solid var(--tb-border)' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>⚖️ الأرصدة الختامية للحسابات</h3>
        </div>
        <div className="tb-table-container">
          {loading ? (
            <div style={{ padding: '40px' }}><Loader message="جاري تحليل الحسابات..." /></div>
          ) : accounts.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--tb-text-secondary)' }}>
              <i className="fas fa-book" style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}></i>
              <h3>لا توجد بيانات حسابات</h3>
            </div>
          ) : (
            <table className="tb-table">
              <thead>
                <tr>
                  <th>كود الحساب</th>
                  <th>اسم الحساب</th>
                  <th>نوع الحساب</th>
                  <th>الرصيد الحالي</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(acc => {
                  const config = typeConfig[acc.type] || { label: acc.type, color: '#94a3b8', icon: 'fa-info-circle' };
                  return (
                    <tr key={acc.id}>
                      <td><code style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '4px 8px', borderRadius: '6px', color: 'var(--tb-accent-blue)' }}>{acc.code}</code></td>
                      <td style={{ fontWeight: 700 }}>{acc.name}</td>
                      <td>
                        <span className="tb-type-badge" style={{ background: config.color + '15', color: config.color }}>
                          <i className={`fas ${config.icon}`}></i> {config.label}
                        </span>
                      </td>
                      <td style={{ fontWeight: 800, fontSize: '1.1rem', color: acc.currentBalance > 0 ? 'var(--tb-accent-green)' : 'var(--tb-text-primary)' }}>
                        {acc.currentBalance.toLocaleString('ar-EG')}
                      </td>
                      <td>
                        <span className={`tb-type-badge ${acc.currentBalance !== 0 ? 'badge-green' : 'badge-blue'}`}>
                          {acc.currentBalance !== 0 ? 'نشط' : 'فارغ'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'rgba(16, 185, 129, 0.05)', fontWeight: 800 }}>
                  <td colSpan="3" style={{ padding: '24px' }}>إجمالي الأصول (Assets Total)</td>
                  <td style={{ color: 'var(--tb-accent-green)', fontSize: '1.3rem' }}>{totalAssets.toLocaleString('ar-EG')} ج.م</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrialBalance;
