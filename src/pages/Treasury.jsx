import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import StatTile from '../components/common/StatTile';

const Treasury = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [treasury, setTreasury] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useGlobalUI();

  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  // Pagination & Search state
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const pageSize = 20;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const user = Api._getUser();
    const branchFromUrl = searchParams.get('branchId');

    if (branchFromUrl) {
      setSelectedBranchId(branchFromUrl);
    } else if (user && user.branchId) {
      setSelectedBranchId(user.branchId);
    }

    const loadBranches = async () => {
      try {
        const data = await Api.getBranches();
        setBranches(data);
      } catch (e) { }
    };
    loadBranches();
  }, [location.search]);

  useEffect(() => {
    loadData(currentPage, pageSize, debouncedSearch, selectedBranchId);
  }, [currentPage, debouncedSearch, selectedBranchId]);

  const loadData = async (page = currentPage, size = pageSize, query = debouncedSearch, branchId = selectedBranchId) => {
    setLoading(true);
    try {
      const tData = await Api.getMainTreasury(branchId);
      setTreasury(tData);

      const res = await Api.getTreasuryTransactions(page, size, query, branchId);
      setTransactions(res.items || res.content || []);
      setTotalPages(res.totalPages || 0);
      setTotalElements(res.totalItems || res.totalElements || 0);
      setCurrentPage(res.currentPage ?? res.number ?? 0);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (t) => {
    if (!t.sourceId) return;

    if (t.source === 'SALE') {
      navigate(`/sales/view/${t.sourceId}`);
    } else if (t.source === 'PURCHASE') {
      navigate(`/purchases/view/${t.sourceId}`);
    } else if (t.source === 'RETURN') {
      // In the current system, we might be able to go to /sales/view or /returns
      // If sourceId is the return ID, navigating to /returns is safest.
      navigate(`/returns`);
    } else if (t.source === 'DEBT_PAYMENT' || t.source === 'INSTALLMENT_PAYMENT') {
      navigate(`/debts`);
    } else if (t.source === 'EXPENSE') {
      navigate(`/expenses`);
    }
    // other sources can be ignored or customized later
  };

  const calculateSummary = () => {
    const totalIn = transactions.filter(t => t.type === 'IN').reduce((acc, t) => acc + t.amount, 0);
    const totalOut = transactions.filter(t => t.type === 'OUT').reduce((acc, t) => acc + t.amount, 0);
    return { totalIn, totalOut };
  };

  const summary = calculateSummary();

  return (
    <div className="page-section" style={{ direction: 'rtl' }}>
      <div className="stats-grid mb-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
        <StatTile
          id="trs_balance"
          label="رصيد الخزنة الحالي"
          value={treasury ? `${treasury.balance.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م` : '0.00 ج.م'}
          icon="💰"
          defaults={{ color: 'blue', size: 'tile-wd-sm', order: 1 }}
        />
        <StatTile
          id="trs_total_in"
          label="إجمالي الوارد (بالصفحة)"
          value={summary.totalIn.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
          icon="↗️"
          defaults={{ color: 'emerald', size: 'tile-sq-sm', order: 2 }}
        />
        <StatTile
          id="trs_total_out"
          label="إجمالي الصادر (بالصفحة)"
          value={summary.totalOut.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
          icon="↘️"
          defaults={{ color: 'crimson', size: 'tile-sq-sm', order: 3 }}
        />
      </div>

      <div className="card">
        <div className="card-header">
          <h3>🏦 سجل المعاملات المالية</h3>
          <div className="toolbar">
            <select
              className="form-control"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              style={{ width: '180px', height: '40px', padding: '0 10px' }}
              disabled={!Api.can('ROLE_ADMIN')}
            >
              <option value="">الخزنة المركزية</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>

            <div className="search-input">
              <input
                type="text"
                placeholder="بحث سريع..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(0);
                }}
              />
              <span className="search-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => loadData()} disabled={loading}>
                {loading ? '⏳' : '🔄'} تحديث
              </button>
            </div>
          </div>
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
                  <tr
                    key={t.id || idx}
                    onClick={() => handleRowClick(t)}
                    style={{ cursor: t.sourceId ? 'pointer' : 'default', transition: 'background 0.2s ease' }}
                    className={t.sourceId ? 'hoverable-row' : ''}
                    onMouseEnter={(e) => { if (t.sourceId) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                    onMouseLeave={(e) => { if (t.sourceId) e.currentTarget.style.background = 'transparent' }}
                  >
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
                        {(() => {
                          switch (t.source) {
                            case 'SALE': return 'فاتورة مبيعات';
                            case 'RETURN': return 'مرتجع مبيعات';
                            case 'PURCHASE': return 'فاتورة مشتريات';
                            case 'INSTALLMENT_PAYMENT': return 'قسط مورد';
                            case 'SUPPLIER_PAYMENT': return 'دفعة مورد';
                            case 'DEBT_PAYMENT': return 'سداد قسط/دين';
                            case 'DAMAGED_GOODS': return 'إهلاك بضاعة';
                            case 'EXPENSE': return 'مصروفات';
                            case 'CHECK_COLLECTION': return 'تحصيل شيك';
                            case 'ADJUSTMENT': return 'تسوية مالية';
                            default: return t.source;
                          }
                        })()}
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
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {(() => {
                        if (!t.description) return '';
                        let d = t.description;
                        d = d.replace(/First payment for purchase invoice #/g, 'دفعة مقدمة لفاتورة مشتريات رقم: ');
                        d = d.replace(/Payment for purchase invoice #/g, 'سداد لفاتورة مشتريات رقم: ');
                        d = d.replace(/Manual payment to supplier:/g, 'دفعة نقدية للمورد:');
                        d = d.replace(/Manual payment to supplier/g, 'دفعة نقدية للمورد');
                        d = d.replace(/Refund for return from invoice #/g, 'استرداد نقدي لمرتجع من الفاتورة: ');
                        d = d.replace(/Payment for invoice/g, 'سداد للفاتورة رقم');
                        d = d.replace(/Payment of/g, 'سداد مبلغ');
                        d = d.replace(/for installment/g, 'للقسط رقم');
                        d = d.replace(/المصدر: PURCHASE/g, 'المصدر: مشتريات');
                        d = d.replace(/المصدر: SALE/g, 'المصدر: مبيعات');
                        return d;
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="pagination" style={{ marginTop: '10px' }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ width: 'auto', padding: '0 15px' }}
            disabled={currentPage === 0}
            onClick={() => setCurrentPage(prev => prev - 1)}
          >
            السابق
          </button>
          <button className="active">{currentPage + 1}</button>
          <button
            className="btn btn-ghost btn-sm"
            style={{ width: 'auto', padding: '0 15px' }}
            disabled={currentPage >= totalPages - 1}
            onClick={() => setCurrentPage(prev => prev + 1)}
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
};

export default Treasury;
