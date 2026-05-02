import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useBranch } from '../context/BranchContext';
import '../styles/pages/SupplierDetailsPremium.css';

const SupplierDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useGlobalUI();
  const { selectedBranchId } = useBranch();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dailyStats, setDailyStats] = useState([]);

  // Ledger Modal State
  const [ledgerData, setLedgerData] = useState(null);
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!id) {
        navigate('/suppliers');
        return;
      }
      setLoading(true);
      try {
        const [stats, historyData] = await Promise.all([
          Api.getSupplierStatistics(id, selectedBranchId),
          Api.getSupplierDailyStats(id, 7).catch(() => [])
        ]);
        setData(stats);
        
        const mappedDaily = Array.isArray(historyData) ? historyData.map(d => ({
          name: new Date(d.statDate).toLocaleDateString('ar-EG', { weekday: 'short' }),
          invoicesCount: d.invoiceCount || 0,
          purchases: d.totalPurchases || 0,
          payments: d.totalPayments || 0
        })) : [];
        setDailyStats(mappedDaily);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, navigate, selectedBranchId]);

  const handleShowLedger = async () => {
    setIsLedgerLoading(true);
    setIsLedgerOpen(true);
    try {
      const ledger = await Api.getSupplierLedger(id, selectedBranchId);
      setLedgerData(ledger);
    } catch (err) {
      toast(err.message, 'error');
      setIsLedgerOpen(false);
    } finally {
      setIsLedgerLoading(false);
    }
  };

  const closeLedger = () => {
    setIsLedgerOpen(false);
    setLedgerData(null);
  };

  if (loading) {
    return <Loader message="جاري تحميل إحصائيات المورد..." />;
  }

  if (error || !data) {
    return (
      <div className="spd-container">
        <div className="spd-table-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⚠️</div>
          <h2 style={{ color: 'var(--spd-text-primary)' }}>حدث خطأ أثناء تحميل البيانات</h2>
          <p style={{ color: 'var(--spd-text-secondary)', marginBottom: '30px' }}>{error || 'لم يتم العثور على المورد المطلوب'}</p>
          <button className="spd-btn spd-btn-primary" style={{ margin: '0 auto' }} onClick={() => navigate('/suppliers')}>العودة للموردين</button>
        </div>
      </div>
    );
  }

  const d = data;

  return (
    <div className="spd-container">
      {/* 1. Header Card */}
      <div className="spd-header-card">
        <div className="spd-header-left">
          <button className="spd-back-btn" onClick={() => navigate('/suppliers')}>
            <i className="fas fa-arrow-right"></i>
            <span>الموردين</span>
          </button>
          
          <div className="spd-supplier-avatar">
            {(d.supplierName || 'S').charAt(0)}
          </div>
          
          <div className="spd-supplier-info">
            <h1>{d.supplierName}</h1>
            <div className="spd-supplier-meta">
              {d.supplierPhone && (
                <div className="spd-meta-item">
                  <i className="fas fa-phone-alt"></i>
                  <span>{d.supplierPhone}</span>
                </div>
              )}
              {d.supplierEmail && (
                <div className="spd-meta-item">
                  <i className="fas fa-envelope"></i>
                  <span>{d.supplierEmail}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="spd-actions-row">
            <button className="spd-btn spd-btn-ghost" onClick={() => Api.exportSupplierStatement(d.supplierId, d.supplierName, selectedBranchId)}>
              <span>إكسيل</span>
              <i className="fas fa-file-excel"></i>
            </button>
            <button className="spd-btn spd-btn-ghost" onClick={() => Api.downloadComprehensiveReport(d.supplierId, d.supplierName, selectedBranchId)}>
              <span>PDF</span>
              <i className="fas fa-file-pdf"></i>
            </button>
            <button className="spd-btn spd-btn-primary" onClick={handleShowLedger}>
              <span>كشف الحساب</span>
              <i className="fas fa-list-alt"></i>
            </button>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="spd-stats-grid">
        <div className="spd-stat-card">
          <div className="spd-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <i className="fas fa-file-invoice"></i>
          </div>
          <div className="spd-stat-info">
            <div className="spd-stat-label">عدد الفواتير</div>
            <div className="spd-stat-value">{d.totalInvoices}</div>
            <div className="spd-stat-subtitle">هذا الشهر: {d.currentMonthInvoices}</div>
          </div>
        </div>
        
        <div className="spd-stat-card">
          <div className="spd-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <i className="fas fa-chart-line"></i>
          </div>
          <div className="spd-stat-info">
            <div className="spd-stat-label">حجم التعامل</div>
            <div className="spd-stat-value">{Number(d.totalBusinessVolume).toLocaleString()}</div>
            <div className="spd-stat-subtitle">هذا الشهر: {Number(d.currentMonthBusinessVolume).toLocaleString()}</div>
          </div>
        </div>

        <div className="spd-stat-card">
          <div className="spd-stat-icon" style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e' }}>
            <i className="fas fa-hand-holding-usd"></i>
          </div>
          <div className="spd-stat-info">
            <div className="spd-stat-label">مستحقات المورد</div>
            <div className="spd-stat-value">{Number(d.weOweSupplier).toLocaleString()}</div>
            <div className="spd-stat-subtitle">مديونيات مفتوحة</div>
          </div>
        </div>

        <div className="spd-stat-card">
          <div className="spd-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <i className="fas fa-coins"></i>
          </div>
          <div className="spd-stat-info">
            <div className="spd-stat-label">رصيد مدين لنا</div>
            <div className="spd-stat-value">{Number(d.supplierOwesUs).toLocaleString()}</div>
            <div className="spd-stat-subtitle">سلف / أرصدة مدينة</div>
          </div>
        </div>
      </div>

      {/* 3. Analytics Chart */}
      <div className="spd-chart-card">
        <div className="spd-card-header">
          <h3><i className="fas fa-chart-bar"></i> نشاط المورد اليومي (أخر 7 أيام)</h3>
        </div>
        <div className="spd-chart-container">
          {dailyStats.length > 0 ? (
            <ResponsiveContainer>
              <ComposedChart data={dailyStats} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--spd-border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'var(--spd-text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis yAxisId="left" tick={{ fill: 'var(--spd-text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--spd-amber)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                  contentStyle={{ backgroundColor: 'var(--spd-card-bg)', border: '1px solid var(--spd-border)', color: 'var(--spd-text-primary)', borderRadius: '12px' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                <Bar yAxisId="left" dataKey="purchases" name="قيمة المشتريات" fill="var(--spd-rose)" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar yAxisId="left" dataKey="payments" name="الدفعات المسددة" fill="var(--spd-accent)" radius={[4, 4, 0, 0]} barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="invoicesCount" name="عدد الفواتير" stroke="var(--spd-amber)" strokeWidth={3} dot={{ r: 4, fill: 'var(--spd-amber)' }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--spd-text-secondary)' }}>لا توجد بيانات متاحة حالياً</div>
          )}
        </div>
      </div>

      {/* 4. Tables Grid */}
      <div className="spd-details-grid">
        {/* Recent Invoices */}
        <div className="spd-table-card">
          <div className="spd-card-header">
            <h3><i className="fas fa-history"></i> أحدث فواتير المشتريات</h3>
            <button className="spd-btn spd-btn-ghost" onClick={() => navigate(`/purchases/${encodeURIComponent(d.supplierName)}`)}>عرض الكل</button>
          </div>
          <div className="spd-table-wrapper">
            {(!d.recentInvoices || d.recentInvoices.length === 0) ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--spd-text-secondary)' }}>لا توجد فواتير سابقة</div>
            ) : (
              <table className="spd-table">
                <thead>
                  <tr><th>الفاتورة</th><th>التاريخ</th><th>الإجمالي</th><th>المتبقي</th><th>الحالة</th></tr>
                </thead>
                <tbody>
                  {d.recentInvoices.map(i => (
                    <tr key={i.id}>
                      <td><code style={{ background: 'var(--spd-bg)', padding: '4px 10px', borderRadius: '8px', color: 'var(--spd-primary)' }}>{i.invoiceNumber}</code></td>
                      <td>{i.invoiceDate ? new Date(i.invoiceDate).toLocaleDateString('ar-EG') : '—'}</td>
                      <td>{Number(i.totalAmount).toLocaleString()}</td>
                      <td style={{ color: 'var(--metro-red)' }}>{Number(i.remainingAmount).toLocaleString()}</td>
                      <td>
                        <span className={`spd-badge ${i.status === 'PAID' ? 'spd-badge-success' : i.status === 'PARTIAL' ? 'spd-badge-warning' : 'spd-badge-danger'}`}>
                          {i.status === 'PAID' ? 'مدفوعة' : i.status === 'PARTIAL' ? 'جزئي' : 'غير مدفوعة'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="spd-table-card">
          <div className="spd-card-header">
            <h3><i className="fas fa-file-invoice-dollar"></i> أحدث حركات كشف الحساب</h3>
            <div className="spd-actions-row">
              <button className="spd-btn spd-btn-ghost" onClick={() => Api.exportSupplierStatement(d.supplierId, d.supplierName, selectedBranchId)}>
                <span>إكسيل</span>
                <i className="fas fa-file-excel"></i>
              </button>
              <button className="spd-btn spd-btn-primary" onClick={handleShowLedger}>
                <span>التفاصيل</span>
                <i className="fas fa-list-alt"></i>
              </button>
            </div>
          </div>
          <div className="spd-table-wrapper">
            {(!d.recentTransactions || d.recentTransactions.length === 0) ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--spd-text-secondary)' }}>لا توجد حركات سابقة</div>
            ) : (
              <table className="spd-table">
                <thead>
                  <tr><th>التاريخ</th><th>النوع</th><th>المبلغ</th><th>الرصيد</th></tr>
                </thead>
                <tbody>
                  {d.recentTransactions.map(t => (
                    <tr key={t.id}>
                      <td>{t.transactionDate ? new Date(t.transactionDate).toLocaleDateString('ar-EG') : '—'}</td>
                      <td>
                        <span className={`spd-badge ${t.type.includes('PAYMENT') ? 'spd-badge-success' : 'spd-badge-danger'}`}>
                          {t.type.includes('PAYMENT') ? 'دفعة' : 'شراء'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--spd-primary)' }}>{Number(t.amount).toLocaleString()}</td>
                      <td>{Number(t.balanceAfter).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Ledger Modal */}
      {isLedgerOpen && (
        <ModalContainer>
          <div className="prd-modal-overlay active" onClick={(e) => { if (e.target.classList.contains('prd-modal-overlay')) closeLedger(); }}>
            <div className="prd-modal" style={{ maxWidth: '900px' }}>
              <div className="prd-card-title-row" style={{ padding: '24px 24px 0' }}>
                <h3 className="prd-card-title"><i className="fas fa-list-alt"></i> كشف حساب — {d.supplierName}</h3>
                <button className="prd-modal-close" onClick={closeLedger}>✕</button>
              </div>
              <div className="prd-modal-body">
                {isLedgerLoading ? (
                  <Loader message="جاري تحميل كشف الحساب..." />
                ) : !ledgerData || ledgerData.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>لا توجد حركات مسجلة</div>
                ) : (
                  <div className="spd-table-wrapper">
                    <table className="spd-table">
                      <thead>
                        <tr><th>التاريخ</th><th>النوع</th><th>البيان</th><th>المبلغ</th></tr>
                      </thead>
                      <tbody>
                        {ledgerData.map((t, idx) => (
                          <tr key={idx}>
                            <td>{new Date(t.timestamp || t.createdAt).toLocaleDateString('ar-EG')}</td>
                            <td><span className={`spd-badge ${t.type === 'CREDIT' ? 'spd-badge-success' : 'spd-badge-danger'}`}>{t.type === 'CREDIT' ? 'دائن' : 'مدين'}</span></td>
                            <td style={{ fontSize: '0.85rem' }}>{t.description || '—'}</td>
                            <td style={{ fontWeight: 800 }}>{Number(t.amount).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="prd-modal-footer">
                <button className="spd-btn spd-btn-ghost" onClick={closeLedger}>إغلاق</button>
                <button className="spd-btn spd-btn-primary" onClick={() => Api.downloadComprehensiveReport(d.supplierId, d.supplierName, selectedBranchId)}>
                  <i className="fas fa-file-download"></i> تحميل التقرير الشامل
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default SupplierDetails;
