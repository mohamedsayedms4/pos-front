import React, { useState, useEffect } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import '../styles/pages/TreasuryPremium.css';

const CustomSelect = ({ options, value, onChange, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value) || options[0];
  return (
    <div className="trs-custom-select-container">
      <div className={`trs-custom-select-header ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        <i className={`fas ${icon} icon-start`}></i>
        <span className="selected-text">{selectedOption.label}</span>
        <i className="fas fa-chevron-down icon-end"></i>
      </div>
      {isOpen && (
        <>
          <div className="trs-custom-select-overlay" onClick={() => setIsOpen(false)}></div>
          <div className="trs-custom-select-dropdown">
            {options.map(opt => (
              <div key={opt.value} className={`trs-custom-select-item ${opt.value === value ? 'active' : ''}`} onClick={() => { onChange(opt.value); setIsOpen(false); }}>
                {opt.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const Treasury = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [treasury, setTreasury] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useGlobalUI();

  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const pageSize = 20;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const user = Api._getUser();
    const branchFromUrl = searchParams.get('branchId');
    if (branchFromUrl) setSelectedBranchId(branchFromUrl);
    else if (user && user.branchId) setSelectedBranchId(user.branchId);

    Api.getBranches().then(setBranches).catch(() => {});
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
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const calculateSummary = () => {
    const totalIn = transactions.filter(t => t.type === 'IN').reduce((acc, t) => acc + t.amount, 0);
    const totalOut = transactions.filter(t => t.type === 'OUT').reduce((acc, t) => acc + t.amount, 0);
    return { totalIn, totalOut };
  };

  const summary = calculateSummary();

  const sourceConfig = {
    SALE: { label: 'فاتورة مبيعات', color: '#6366f1' },
    RETURN: { label: 'مرتجع مبيعات', color: '#f59e0b' },
    PURCHASE: { label: 'فاتورة مشتريات', color: '#ef4444' },
    INSTALLMENT_PAYMENT: { label: 'قسط مورد', color: '#8b5cf6' },
    SUPPLIER_PAYMENT: { label: 'دفعة مورد', color: '#10b981' },
  };

  return (
    <div className="treasury-container">
      {/* 1. Header */}
      <div className="trs-header-row">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="trs-breadcrumbs">
            <Link to="/dashboard">الرئيسية</Link> / <span>المالية</span>
          </div>
          <h1>الخزنة المركزية</h1>
        </div>
        <div className="trs-header-actions">
          <button className="trs-btn-premium trs-btn-blue" onClick={() => loadData()}>
            <i className="fas fa-sync-alt"></i> تحديث
          </button>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="trs-stats-grid">
        <div className="trs-stat-card">
          <div className="trs-stat-info">
            <h4>رصيد الخزنة</h4>
            <div className="trs-stat-value">{treasury ? treasury.balance.toLocaleString('ar-EG') : '0'} <span style={{fontSize: '0.8rem'}}>ج.م</span></div>
          </div>
          <div className="trs-stat-visual">
            <div className="trs-stat-icon icon-blue">
              <i className="fas fa-vault"></i>
            </div>
          </div>
        </div>
        <div className="trs-stat-card">
          <div className="trs-stat-info">
            <h4>إجمالي الوارد</h4>
            <div className="trs-stat-value">{summary.totalIn.toLocaleString('ar-EG')} <span style={{fontSize: '0.8rem'}}>ج.م</span></div>
          </div>
          <div className="trs-stat-visual">
            <div className="trs-stat-icon icon-green">
              <i className="fas fa-arrow-trend-up"></i>
            </div>
          </div>
        </div>
        <div className="trs-stat-card">
          <div className="trs-stat-info">
            <h4>إجمالي الصادر</h4>
            <div className="trs-stat-value">{summary.totalOut.toLocaleString('ar-EG')} <span style={{fontSize: '0.8rem'}}>ج.م</span></div>
          </div>
          <div className="trs-stat-visual">
            <div className="trs-stat-icon icon-amber">
              <i className="fas fa-arrow-trend-down"></i>
            </div>
          </div>
        </div>
        <div className="trs-stat-card">
          <div className="trs-stat-info">
            <h4>عدد المعاملات</h4>
            <div className="trs-stat-value">{totalElements} <span style={{fontSize: '0.8rem'}}>حركة</span></div>
          </div>
          <div className="trs-stat-visual">
            <div className="trs-stat-icon icon-purple">
              <i className="fas fa-receipt"></i>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Toolbar */}
      <div className="trs-toolbar-card">
        <div className="trs-toolbar-left">
          <CustomSelect 
            icon="fa-store"
            value={selectedBranchId}
            onChange={val => { setSelectedBranchId(val); setCurrentPage(0); }}
            options={[{ value: '', label: 'الخزنة المركزية' }, ...branches.map(b => ({ value: b.id.toString(), label: b.name }))]}
          />
        </div>
        <div className="trs-toolbar-right">
          <div className="trs-search-box">
            <i className="fas fa-search"></i>
            <input type="text" placeholder="بحث في الملاحظات أو المصدر..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>
      </div>

      {/* 4. Table Card */}
      <div className="trs-table-card">
        <div className="trs-table-container">
          {loading ? (
            <div style={{ padding: '40px' }}><Loader message="جاري التحميل..." /></div>
          ) : transactions.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--trs-text-secondary)' }}>
              <i className="fas fa-receipt" style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}></i>
              <h3>لا توجد حركات مالية</h3>
            </div>
          ) : (
            <table className="trs-table">
              <thead>
                <tr>
                  <th>التاريخ والوقت</th>
                  <th>المصدر المالي</th>
                  <th>نوع الحركة</th>
                  <th>المبلغ</th>
                  <th>الملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, idx) => (
                  <tr key={t.id || idx}>
                    <td>
                      <div style={{ fontWeight: 800, color: 'var(--trs-text-primary)' }}>
                        {new Date(t.transactionDate).toLocaleDateString('ar-EG')}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--trs-text-secondary)' }}>
                        {new Date(t.transactionDate).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: sourceConfig[t.source]?.color || '#94a3b8' }}></span>
                        {sourceConfig[t.source]?.label || t.source}
                      </div>
                    </td>
                    <td>
                      <span className={`trs-type-badge ${t.type === 'IN' ? 'badge-green' : 'badge-blue'}`}>
                        <i className={`fas ${t.type === 'IN' ? 'fa-plus-circle' : 'fa-minus-circle'}`}></i> {t.type === 'IN' ? 'وارد' : 'صادر'}
                      </span>
                    </td>
                    <td style={{ fontSize: '1.1rem', fontWeight: 800, color: t.type === 'IN' ? 'var(--trs-accent-green)' : 'var(--trs-accent-amber)' }}>
                      {t.amount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--trs-text-secondary)', maxWidth: '250px' }}>{t.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="trs-pagination">
          <div className="trs-pagination-info">عرض {transactions.length} من {totalElements} حركة</div>
          <div className="trs-pagination-btns">
            <button className="trs-page-btn" disabled={currentPage === 0} onClick={() => setCurrentPage(prev => prev - 1)}>السابق</button>
            <button className="trs-page-btn active">{currentPage + 1}</button>
            <button className="trs-page-btn" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(prev => prev + 1)}>التالي</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Treasury;
