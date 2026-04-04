import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';

const Treasury = () => {
  const [treasury, setTreasury] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useGlobalUI();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const tData = await Api.getMainTreasury();
      setTreasury(tData);
      
      const transData = await Api.getTreasuryTransactions(0, 100);
      setTransactions(transData.items || transData.content || []);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = () => {
    const totalIn = transactions.filter(t => t.type === 'IN').reduce((acc, t) => acc + t.amount, 0);
    const totalOut = transactions.filter(t => t.type === 'OUT').reduce((acc, t) => acc + t.amount, 0);
    return { totalIn, totalOut };
  };

  const summary = calculateSummary();

  return (
    <div className="page-section">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div className="header-title">
          <h1 style={{ fontWeight: 200, fontSize: '2.5rem', letterSpacing: '1px' }}>الخزنة والمالية</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>إدارة السيولة النقدية وسجل الحركات المالية</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={loadData} disabled={loading}>
            {loading ? 'جاري التحديث...' : 'تحديث البيانات'}
          </button>
        </div>
      </div>

      <div className="stats-grid">
        {/* Main Balance Tile - Large Wide */}
        <div className="stat-card cobalt tile-wd-md">
          <div className="tile-front">
            <div className="stat-value" style={{ fontSize: '3.5rem' }}>
              {treasury ? treasury.balance.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) : '0.00'}
              <span style={{ fontSize: '1rem', marginRight: '8px', fontWeight: 400 }}>ج.م</span>
            </div>
            <div className="stat-label" style={{ fontSize: '1.1rem', fontWeight: 300 }}>رصيد الخزنة الحالي</div>
            <div className="stat-icon" style={{ fontSize: '5rem', opacity: 0.1 }}>💵</div>
          </div>
        </div>

        {/* Total In - Medium Square */}
        <div className="stat-card emerald tile-sq-md">
          <div className="tile-front">
            <div className="stat-value">
              {summary.totalIn.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
            </div>
            <div className="stat-label">إجمالي الوارد</div>
            <div className="stat-subtitle">خلال آخر 100 حركة</div>
            <div className="stat-icon">📈</div>
          </div>
        </div>

        {/* Total Out - Medium Square */}
        <div className="stat-card rose tile-sq-md">
          <div className="tile-front">
            <div className="stat-value">
              {summary.totalOut.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
            </div>
            <div className="stat-label">إجمالي الصادر</div>
            <div className="stat-subtitle">خلال آخر 100 حركة</div>
            <div className="stat-icon">📉</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 300 }}>سجل الحركات المالية الحديثة</h3>
        </div>
        <div className="card-body no-padding">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '200px' }}>التاريخ والوقت</th>
                  <th>المصدر المالي</th>
                  <th>نوع الحركة</th>
                  <th>المبلغ</th>
                  <th>التفاصيل والملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5">
                      <Loader message="جاري جلب البيانات من الخزنة..." />
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center" style={{ padding: '40px', color: 'var(--text-dim)' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '10px', opacity: 0.2 }}>🗃</div>
                      لا يوجد حركات مالية مسجلة حالياً
                    </td>
                  </tr>
                ) : transactions.map((t, idx) => (
                  <tr key={t.id || idx} style={{ animationDelay: `${idx * 0.05}s` }}>
                    <td style={{ fontWeight: 600, color: 'var(--text-white)' }}>
                      {new Date(t.transactionDate).toLocaleString('ar-EG', {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                          width: '8px', height: '8px', 
                          background: t.source === 'SALE' ? 'var(--metro-blue)' : 
                                      t.source === 'PURCHASE' ? 'var(--metro-orange)' : 
                                      'var(--metro-purple)'
                        }}></span>
                        {t.source === 'SALE' ? 'فاتورة مبيعات' : 
                         t.source === 'RETURN' ? 'مرتجع مبيعات' : 
                         t.source === 'PURCHASE' ? 'فاتورة مشتريات' : 
                         t.source === 'INSTALLMENT_PAYMENT' ? 'قسط مورد' :
                         t.source === 'SUPPLIER_PAYMENT' ? 'دفعة مورد' : t.source}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${t.type === 'IN' ? 'badge-success' : 'badge-danger'}`} style={{ minWidth: '60px', justifyContent: 'center' }}>
                        {t.type === 'IN' ? 'وارد +' : 'صادر -'}
                      </span>
                    </td>
                    <td style={{ fontSize: '1.05rem' }}>
                      <strong className={t.type === 'IN' ? 'text-success' : 'text-danger'}>
                        {t.amount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                      </strong>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Treasury;
