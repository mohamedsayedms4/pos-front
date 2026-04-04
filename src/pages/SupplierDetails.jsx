import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';

const SupplierDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useGlobalUI();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
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
        const stats = await Api.getSupplierStatistics(id);
        setData(stats);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, navigate]);

  const handleShowLedger = async () => {
    setIsLedgerLoading(true);
    setIsLedgerOpen(true);
    try {
      const ledger = await Api.getSupplierLedger(id);
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
      <div className="page-section empty-state">
        <div className="empty-icon">⚠️</div>
        <h4>حدث خطأ</h4>
        <p>{error || 'لم يتم العثور على المورد'}</p>
        <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => navigate('/suppliers')}>العودة للموردين</button>
      </div>
    );
  }

  const d = data;

  return (
    <div className="page-section">
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header" style={{ justifyContent: 'flex-start', gap: '15px' }}>
          <button className="btn btn-ghost" style={{ padding: '4px 12px', gap: '6px' }} onClick={() => navigate('/suppliers')}>
            <span style={{ fontSize: '1.2rem' }}>⬅️</span> جميع الموردين
          </button>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
               <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-full)', background: 'var(--gradient-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: 'white', paddingTop: '2px' }}>
                 {(d.supplierName || 'S').charAt(0)}
               </div>
               {d.supplierName}
            </h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {d.supplierPhone ? `📞 ${d.supplierPhone}` : ''} {d.supplierEmail ? ` ✉️ ${d.supplierEmail}` : ''}
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid-responsive-4-to-2" style={{ marginBottom: '24px' }}>
        <div className="stat-card cobalt" style={{ minHeight: '120px' }}>
          <div className="stat-label">عدد الفواتير الكلي</div>
          <div className="stat-value">{d.totalInvoices}</div>
          <div className="stat-subtitle">هذا الشهر: <span style={{ fontWeight: 700 }}>{d.currentMonthInvoices}</span></div>
        </div>
        <div className="stat-card cobalt" style={{ minHeight: '120px' }}>
          <div className="stat-label">حجم التعامل (مشتريات)</div>
          <div className="stat-value">{Number(d.totalBusinessVolume).toFixed(2)}</div>
          <div className="stat-subtitle">هذا الشهر: <span style={{ fontWeight: 700 }}>{Number(d.currentMonthBusinessVolume).toFixed(2)}</span></div>
        </div>
        <div className="stat-card rose" style={{ minHeight: '120px' }}>
          <div className="stat-label">علينا للمورد (متبقي)</div>
          <div className="stat-value">{Number(d.weOweSupplier).toFixed(2)}</div>
          <div className="stat-subtitle">المديونيات المفتوحة</div>
        </div>
        <div className="stat-card emerald" style={{ minHeight: '120px' }}>
          <div className="stat-label">لنا عند المورد (سلف/مدين)</div>
          <div className="stat-value">{Number(d.supplierOwesUs).toFixed(2)}</div>
          <div className="stat-subtitle">أرصدة مدينة على المورد</div>
        </div>
      </div>

      <div className="details-grid">
        <div className="card">
          <div className="card-header" style={{ padding: '15px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1rem', margin: 0 }}>أحدث فواتير المشتريات</h3>
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => navigate(`/purchases/${encodeURIComponent(d.supplierName)}`)}>عرض الكل</button>
          </div>
          <div className="card-body no-padding" style={{ overflowX: 'auto' }}>
            {(!d.recentInvoices || d.recentInvoices.length === 0) ? (
              <div className="empty-state" style={{ padding: '20px', textAlign: 'center' }}>لا توجد فواتير سابقة</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>الفاتورة</th><th>التاريخ</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th></tr>
                </thead>
                <tbody>
                  {d.recentInvoices.map(i => (
                    <tr key={i.id}>
                      <td><code style={{ background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '4px' }}>{i.invoiceNumber}</code></td>
                      <td>{i.invoiceDate ? new Date(i.invoiceDate).toLocaleDateString('ar-EG') : '—'}</td>
                      <td style={{ fontWeight: 600 }}>{Number(i.totalAmount).toFixed(2)}</td>
                      <td style={{ color: 'var(--accent-emerald)' }}>{Number(i.paidAmount).toFixed(2)}</td>
                      <td style={{ color: 'var(--metro-red)' }}>{Number(i.remainingAmount).toFixed(2)}</td>
                      <td>
                        <span className={`badge ${i.status === 'PAID' ? 'badge-success' : i.status === 'PARTIAL' ? 'badge-warning' : 'badge-danger'}`}>
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

        <div className="card">
          <div className="card-header" style={{ padding: '15px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1rem', margin: 0 }}>أحدث حركات كشف الحساب</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
               <button className="btn btn-outline-success btn-sm" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => Api.exportSupplierStatement(d.supplierId, d.supplierName.replace(/'/g, "\\'"))}>📊 مبسط</button>
               <button className="btn btn-success btn-sm" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => Api.downloadComprehensiveReport(d.supplierId, d.supplierName.replace(/'/g, "\\'"))}>📄 شامل</button>
               <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={handleShowLedger}>التفاصيل كاملة</button>
            </div>
          </div>
          <div className="card-body no-padding" style={{ overflowX: 'auto' }}>
            {(!d.recentTransactions || d.recentTransactions.length === 0) ? (
              <div className="empty-state" style={{ padding: '20px', textAlign: 'center' }}>لا توجد حركات سابقة</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>التاريخ</th><th>النوع</th><th>الوصف</th><th>المبلغ</th><th>الرصيد بعد</th></tr>
                </thead>
                <tbody>
                  {d.recentTransactions.map(t => (
                    <tr key={t.id}>
                      <td>{t.transactionDate ? new Date(t.transactionDate).toLocaleDateString('ar-EG') : '—'}</td>
                      <td><span className={`badge ${t.type.includes('PAYMENT') ? 'badge-success' : 'badge-danger'}`}>{t.type.includes('PAYMENT') ? 'دفعة/سداد' : 'مديونية/شراء'}</span></td>
                      <td>{t.description}</td>
                      <td style={{ fontWeight: 600, color: 'var(--metro-blue)' }}>{Number(t.amount).toFixed(2)}</td>
                      <td style={{ fontWeight: 700 }}>{Number(t.balanceAfter).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {isLedgerOpen && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeLedger(); }}>
            <div className="modal" style={{ maxWidth: '800px' }}>
              <div className="modal-header">
                <h3>كشف حساب — {d.supplierName}</h3>
                <button className="modal-close" onClick={closeLedger}>✕</button>
              </div>
              <div className="modal-body">
                {isLedgerLoading ? (
                  <Loader message="جاري تحميل كشف الحساب..." />
                ) : !ledgerData || ledgerData.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <h4>لا توجد حركات</h4>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <button className="btn btn-outline-success btn-sm" onClick={() => Api.exportSupplierStatement(d.supplierId, d.supplierName.replace(/'/g, "\\'"))}>
                        📊 كشف حساب (مبسط)
                      </button>
                      <button className="btn btn-success btn-sm" onClick={() => Api.downloadComprehensiveReport(d.supplierId, d.supplierName.replace(/'/g, "\\'"))}>
                        📄 التقرير الشامل (Advanced)
                      </button>
                    </div>
                    <div className="table-wrapper">
                      <table className="data-table">
                        <thead>
                          <tr><th>التاريخ</th><th>النوع</th><th>الوصف</th><th>المبلغ</th></tr>
                        </thead>
                        <tbody>
                          {ledgerData.map((t, idx) => (
                            <tr key={idx}>
                              <td>{new Date(t.timestamp || t.createdAt).toLocaleDateString('ar-EG')}</td>
                              <td><span className={`badge ${t.type === 'CREDIT' ? 'badge-success' : 'badge-danger'}`}>{t.type === 'CREDIT' ? 'دائن' : 'مدين'}</span></td>
                              <td>{t.description || '—'}</td>
                              <td style={{ fontWeight: 600 }}>{Number(t.amount).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={closeLedger}>إغلاق</button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default SupplierDetails;
