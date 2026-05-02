import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import Api from '../services/api';
import Loader from '../components/common/Loader';
import { useGlobalUI } from '../components/common/GlobalUI';
import ModalContainer from '../components/common/ModalContainer';
import '../styles/pages/StockReceiptsPremium.css';

const CustomSelect = ({ options, value, onChange, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value) || options[0];
  return (
    <div className="stk-custom-select-container">
      <div className={`stk-custom-select-header ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        <i className={`fas ${icon} icon-start`}></i>
        <span className="selected-text">{selectedOption.label}</span>
        <i className="fas fa-chevron-down icon-end"></i>
      </div>
      {isOpen && (
        <>
          <div className="stk-custom-select-overlay" onClick={() => setIsOpen(false)}></div>
          <div className="stk-custom-select-dropdown">
            {options.map(opt => (
              <div key={opt.value} className={`stk-custom-select-item ${opt.value === value ? 'active' : ''}`} onClick={() => { onChange(opt.value); setIsOpen(false); }}>
                {opt.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const StockReceipts = () => {
  const { toast, confirm } = useGlobalUI();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [receivedQuantities, setReceivedQuantities] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [analytics, setAnalytics] = useState({ pending: 0, received: 0, completed: 0, total: 0, trend: [] });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const isAdmin = Api.isAdminOrBranchManager();
  
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const pageSize = 10;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadReceipts = async (pageIndex = currentPage, size = pageSize, query = debouncedSearch, branchId = selectedBranchId) => {
    setLoading(true);
    try {
      const response = await Api.getStockReceipts(pageIndex, size, query, branchId);
      setReceipts(response?.items || []);
      setTotalPages(response?.totalPages || 1);
      setTotalElements(response?.totalItems || 0);
      setCurrentPage(response?.currentPage || pageIndex);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const stats = await Api.getStockReceiptAnalytics();
      const summary = { pending: 0, received: 0, completed: 0, total: 0, trend: [] };
      const trendMap = {};

      stats.forEach(s => {
        if (!trendMap[s.receiptDate]) trendMap[s.receiptDate] = { date: s.receiptDate, PENDING: 0, RECEIVED: 0, COMPLETED: 0 };
        trendMap[s.receiptDate][s.receiptStatus] = s.receiptCount;
        
        if (s.receiptStatus === 'PENDING') summary.pending += s.receiptCount;
        if (s.receiptStatus === 'RECEIVED') summary.received += s.receiptCount;
        if (s.receiptStatus === 'COMPLETED') summary.completed += s.receiptCount;
        summary.total += s.receiptCount;
      });
      
      summary.trend = Object.values(trendMap).sort((a,b) => a.date.localeCompare(b.date)).slice(-15);
      setAnalytics(summary);
    } catch (err) { console.error(err); }
    finally { setAnalyticsLoading(false); }
  };

  useEffect(() => {
    loadReceipts(currentPage, pageSize, debouncedSearch, selectedBranchId);
  }, [currentPage, debouncedSearch, selectedBranchId]);

  useEffect(() => {
    loadAnalytics();
    if (isAdmin && branches.length === 0) {
      Api.getBranches().then(setBranches).catch(() => {});
    }
  }, [isAdmin, branches.length]);

  const handleSaveQuantities = async (receiptId, qtys = null) => {
    confirm('هل أنت متأكد من تسجيل هذه الكميات؟ سيتم حفظها دون تحديث المخزون الفعلي.', async () => {
      try {
        await Api.saveStockReceiptQuantities(receiptId, qtys);
        toast('تم تسجيل الاستلام بنجاح. يمكنك الآن الإضافة للمخزن.', 'success');
        loadReceipts();
        closeModal();
      } catch (err) { toast(err.message, 'error'); }
    });
  };

  const handleCommitToInventory = async (receiptId) => {
    confirm('هل أنت متأكد من إضافة الأصناف للمخزن؟ سيتم زيادة رصيد المنتجات الفعلي الآن.', async () => {
      try {
        await Api.commitStockReceiptToInventory(receiptId);
        toast('تمت إضافة الكميات للمخزن بنجاح', 'success');
        loadReceipts();
        closeModal();
      } catch (err) { toast(err.message, 'error'); }
    });
  };

  const openDetails = (receipt) => {
    setSelectedReceipt(receipt);
    const initialQtys = {};
    receipt.items.forEach(item => { initialQtys[item.id] = item.quantity; });
    setReceivedQuantities(initialQtys);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedReceipt(null);
  };

  const statusConfig = {
    PENDING: { label: 'بانتظار الاستلام', badgeClass: 'badge-amber', icon: 'fa-hourglass-start' },
    RECEIVED: { label: 'تم الاستلام', badgeClass: 'badge-blue', icon: 'fa-box-open' },
    COMPLETED: { label: 'تم التخزين', badgeClass: 'badge-green', icon: 'fa-warehouse' },
    CANCELLED: { label: 'ملغي', badgeClass: 'badge-danger', icon: 'fa-ban' },
  };

  return (
    <div className="stock-receipts-container">
      {/* 1. Header */}
      <div className="stk-header-row">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="stk-breadcrumbs">
            <Link to="/dashboard">الرئيسية</Link> / <span>المخزن</span>
          </div>
          <h1>أذونات الاستلام</h1>
        </div>
        <div className="stk-header-actions">
          <button className="stk-btn-premium stk-btn-blue" onClick={() => loadReceipts()}>
            <i className="fas fa-sync-alt"></i> تحديث البيانات
          </button>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="stk-stats-grid">
        <div className="stk-stat-card">
          <div className="stk-stat-info">
            <h4>إجمالي الأذونات</h4>
            <div className="stk-stat-value">{analytics.total} <span style={{fontSize: '0.8rem'}}>إذن</span></div>
          </div>
          <div className="stk-stat-visual">
            <div className="stk-stat-icon icon-purple">
              <i className="fas fa-file-invoice"></i>
            </div>
          </div>
        </div>
        <div className="stk-stat-card">
          <div className="stk-stat-info">
            <h4>بانتظار المورد</h4>
            <div className="stk-stat-value">{analytics.pending} <span style={{fontSize: '0.8rem'}}>أمر</span></div>
          </div>
          <div className="stk-stat-visual">
            <div className="stk-stat-icon icon-amber">
              <i className="fas fa-hourglass-start"></i>
            </div>
          </div>
        </div>
        <div className="stk-stat-card">
          <div className="stk-stat-info">
            <h4>استلام مؤقت</h4>
            <div className="stk-stat-value">{analytics.received} <span style={{fontSize: '0.8rem'}}>إذن</span></div>
          </div>
          <div className="stk-stat-visual">
            <div className="stk-stat-icon icon-blue">
              <i className="fas fa-box-open"></i>
            </div>
          </div>
        </div>
        <div className="stk-stat-card">
          <div className="stk-stat-info">
            <h4>تم التخزين</h4>
            <div className="stk-stat-value">{analytics.completed} <span style={{fontSize: '0.8rem'}}>إذن</span></div>
          </div>
          <div className="stk-stat-visual">
            <div className="stk-stat-icon icon-green">
              <i className="fas fa-warehouse"></i>
            </div>
          </div>
        </div>
      </div>

      {/* 2.1 Analytics Diagram Section */}
      <div className="stk-table-card" style={{ marginBottom: '30px', borderRadius: '16px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>📊 اتجاه التوريد (آخر 15 يوم)</h3>
          {analyticsLoading && <small style={{ color: 'var(--stk-text-secondary)' }}>جاري التحديث...</small>}
        </div>
        <div style={{ height: '300px', width: '100%' }}>
          {analytics.trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--stk-border)" />
                <XAxis dataKey="date" tick={{fontSize: 10, fill: 'var(--stk-text-secondary)'}} tickFormatter={(v) => v.split('-').slice(1).join('/')} />
                <YAxis tick={{fontSize: 10, fill: 'var(--stk-text-secondary)'}} />
                <Tooltip 
                  contentStyle={{backgroundColor: 'var(--stk-card-bg)', border: '1px solid var(--stk-border)', borderRadius: '12px', boxShadow: 'var(--stk-shadow)'}}
                  itemStyle={{fontSize: '0.8rem', fontWeight: 600}}
                />
                <Legend iconType="circle" wrapperStyle={{fontSize: '0.8rem', paddingTop: '10px'}} />
                <Bar dataKey="PENDING" name="بانتظار المورد" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="RECEIVED" name="استلام جزئي" fill="#6366f1" />
                <Bar dataKey="COMPLETED" name="مرحل للمخزن" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--stk-text-secondary)' }}>لا توجد بيانات كافية للرسم البياني</div>
          )}
        </div>
      </div>

      {/* 3. Toolbar */}
      <div className="stk-toolbar-card">
        <div className="stk-toolbar-left">
          {isAdmin && (
            <CustomSelect 
              icon="fa-store"
              value={selectedBranchId}
              onChange={val => { setSelectedBranchId(val); setCurrentPage(0); }}
              options={[{ value: '', label: 'جميع الفروع' }, ...branches.map(b => ({ value: b.id.toString(), label: b.name }))]}
            />
          )}
        </div>
        <div className="stk-toolbar-right">
          <div className="stk-search-box">
            <i className="fas fa-search"></i>
            <input type="text" placeholder="بحث برقم الإذن أو المورد..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>
      </div>

      {/* 4. Table Card */}
      <div className="stk-table-card">
        <div className="stk-table-container">
          {loading ? (
            <div style={{ padding: '40px' }}><Loader message="جاري التحميل..." /></div>
          ) : receipts.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--stk-text-secondary)' }}>
              <i className="fas fa-box" style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}></i>
              <h3>لا توجد أذونات استلام</h3>
            </div>
          ) : (
            <table className="stk-table">
              <thead>
                <tr>
                  <th>رقم الإذن</th>
                  <th>المورد</th>
                  <th>رقم الفاتورة</th>
                  <th>التاريخ</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 800, color: 'var(--stk-accent-blue)' }}>{r.receiptNumber}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--stk-text-secondary)' }}>بواسطة: {r.receivedBy || '—'}</div>
                    </td>
                    <td style={{ fontWeight: 700 }}>{r.supplierName}</td>
                    <td>{r.invoiceNumber}</td>
                    <td>{new Date(r.receiptDate).toLocaleString('ar-EG')}</td>
                    <td>
                      <span className={`stk-type-badge ${statusConfig[r.status]?.badgeClass}`}>
                        <i className={`fas ${statusConfig[r.status]?.icon}`}></i> {statusConfig[r.status]?.label}
                      </span>
                    </td>
                    <td>
                      <div className="stk-actions">
                        <button className="stk-action-btn" onClick={() => openDetails(r)} title="التفاصيل"><i className="fas fa-eye"></i></button>
                        {r.status === 'PENDING' && (
                          <button className="stk-action-btn" style={{color: '#f59e0b'}} onClick={() => openDetails(r)} title="استلام"><i className="fas fa-box"></i></button>
                        )}
                        {r.status === 'RECEIVED' && (
                          <button className="stk-action-btn" style={{color: '#10b981'}} onClick={() => handleCommitToInventory(r.id)} title="للمخزن"><i className="fas fa-plus-circle"></i></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="stk-pagination">
          <div className="stk-pagination-info">عرض {receipts.length} من {totalElements} نتيجة</div>
          <div className="stk-pagination-btns">
            <button className="stk-page-btn" disabled={currentPage === 0} onClick={() => setCurrentPage(prev => prev - 1)}>السابق</button>
            <button className="stk-page-btn active">{currentPage + 1}</button>
            <button className="stk-page-btn" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(prev => prev + 1)}>التالي</button>
          </div>
        </div>
      </div>

      {/* 5. Modal */}
      {isModalOpen && selectedReceipt && (
        <ModalContainer>
          <div className="stk-modal-overlay" onClick={(e) => { if (e.target.classList.contains('stk-modal-overlay')) closeModal(); }}>
            <div className="stk-modal" style={{ maxWidth: '850px' }}>
              <div className="stk-modal-header">
                <h3>إذن استلام: {selectedReceipt.receiptNumber}</h3>
                <button className="stk-modal-close" onClick={closeModal}>✕</button>
              </div>
              <div className="stk-modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '24px', padding: '20px', background: 'var(--stk-bg)', borderRadius: '16px' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--stk-text-secondary)' }}>المورد</div>
                    <div style={{ fontWeight: 700 }}>{selectedReceipt.supplierName}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--stk-text-secondary)' }}>الفاتورة</div>
                    <div style={{ fontWeight: 700 }}>{selectedReceipt.invoiceNumber}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--stk-text-secondary)' }}>الحالة</div>
                    <span className={`stk-type-badge ${statusConfig[selectedReceipt.status]?.badgeClass}`}>{statusConfig[selectedReceipt.status]?.label}</span>
                  </div>
                </div>

                <div className="stk-table-container" style={{ border: '1px solid var(--stk-border)', borderRadius: '12px', overflow: 'hidden' }}>
                  <table className="stk-table">
                    <thead>
                      <tr><th>المنتج</th><th>الوحدة</th><th>المطلوب</th><th>المستلم</th><th>القطع</th></tr>
                    </thead>
                    <tbody>
                      {selectedReceipt.items.map(item => (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 700 }}>{item.productName}</td>
                          <td>{item.unitName}</td>
                          <td>{item.quantity}</td>
                          <td>
                            {selectedReceipt.status === 'PENDING' ? (
                              <input type="number" className="stk-input" style={{padding: '4px 8px', width: '80px'}} value={receivedQuantities[item.id] || ''} onChange={e => setReceivedQuantities(prev => ({ ...prev, [item.id]: e.target.value }))} />
                            ) : (item.receivedQuantity ?? item.quantity)}
                          </td>
                          <td style={{ fontWeight: 800, color: 'var(--stk-accent-green)' }}>{(((selectedReceipt.status === 'PENDING' ? receivedQuantities[item.id] : item.receivedQuantity) || item.quantity) * item.conversionFactor).toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="stk-modal-footer">
                <button className="stk-btn-ghost" onClick={closeModal}>إغلاق</button>
                {selectedReceipt.status === 'PENDING' && Api.can('STOCK_WRITE') && (
                  <button className="stk-btn-primary" onClick={() => handleSaveQuantities(selectedReceipt.id, receivedQuantities)}>📦 حفظ الكميات</button>
                )}
                {selectedReceipt.status === 'RECEIVED' && Api.can('STOCK_WRITE') && (
                  <button className="stk-btn-primary" style={{background: 'var(--stk-accent-green)'}} onClick={() => handleCommitToInventory(selectedReceipt.id)}>➕ ترحيل للمخزن</button>
                )}
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default StockReceipts;
