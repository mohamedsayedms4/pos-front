import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import ModalContainer from '../components/common/ModalContainer';
import Loader from '../components/common/Loader';
import StatTile from '../components/common/StatTile';
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
import { useExport } from '../utils/useExport';
import ExportProgressModal from '../components/ExportProgressModal';


const Suppliers = () => {
  const { toast, confirm } = useGlobalUI();
  const { selectedBranchId: globalBranchId, branches: contextBranches } = useBranch();

  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState('name,asc');
  const [loading, setLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState([]);

  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10;
  const navigate = useNavigate();
  const location = useLocation();
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [importingExcel, setImportingExcel] = useState(false);
  const fileInputRef = React.useRef(null);
  const { exportState, triggerExport, closeExportModal } = useExport();

  useEffect(() => {
    const handleOutsideClick = (e) => {
      const menu = document.getElementById('importSuppliersDropdownMenu');
      if (menu && menu.style.display === 'block' && !e.target.closest('.dropdown-import-container')) {
        menu.style.display = 'none';
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Modals state
  const [modalType, setModalType] = useState(null); // 'form', 'payment', null
  const [activeSupplier, setActiveSupplier] = useState(null);

  // Form state removed, using dedicated page

  // Payment state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDesc, setPaymentDesc] = useState('دفعة نقدية');

  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const handleExportExcel = async () => {
    await triggerExport('SUPPLIERS_EXCEL', {
      query: debouncedSearch,
      branchId: selectedBranchId
    });
  };

  const handleExportPdf = async () => {
    await triggerExport('SUPPLIERS_PDF', {
      query: debouncedSearch,
      branchId: selectedBranchId
    });
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportingExcel(true);
    toast('جاري استيراد الموردين من ملف إكسيل...', 'info');
    try {
      const res = await Api.importSuppliersExcel(file, selectedBranchId);
      toast(res.data || res.message || 'تم استيراد الموردين بنجاح', 'success');
      loadData();
    } catch (err) {
      toast(err.message || 'فشل استيراد الموردين', 'error');
    } finally {
      setImportingExcel(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = async () => {
    toast('جاري تحميل نموذج الاستيراد...', 'info');
    try {
      await Api.downloadSuppliersImportTemplate();
      toast('تم تحميل النموذج بنجاح', 'success');
    } catch (err) {
      toast(err.message || 'فشل تحميل النموذج', 'error');
    }
  };

  const loadData = async (page = 0, size = 10, query = debouncedSearch, sortParam = sort, branchId = selectedBranchId) => {
    setLoading(true);
    try {
      const [res, statsData] = await Promise.all([
        Api.getSuppliersSummary(page, size, query, sortParam, branchId),
        Api.getDailySupplierStats(7, branchId).catch(() => [])
      ]);
      setData(res.content || res.items || []);
      setTotalPages(res.totalPages || 0);
      setTotalElements(res.totalElements || 0);
      setCurrentPage(res.number || 0);
      
      const mappedDaily = Array.isArray(statsData) ? statsData.map(d => ({
        name: new Date(d.statDate).toLocaleDateString('ar-EG', { weekday: 'short' }),
        invoicesCount: d.invoiceCount || 0,
        purchases: d.totalPurchases || 0,
        payments: d.totalPayments || 0
      })) : [];
      setDailyStats(mappedDaily);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    const user = Api._getUser();
    const queryParams = new URLSearchParams(location.search);
    const branchFromUrl = queryParams.get('branchId');

    if (branchFromUrl) {
      setSelectedBranchId(branchFromUrl);
    } else if (globalBranchId) {
      setSelectedBranchId(globalBranchId);
    } else if (user && user.branchId) {
      setSelectedBranchId(user.branchId);
    }

    if (contextBranches && contextBranches.length > 0) {
      setBranches(contextBranches);
    }
  }, [location.search, globalBranchId, contextBranches]);

  useEffect(() => {
    loadData(currentPage, pageSize, debouncedSearch, sort, selectedBranchId);
  }, [currentPage, debouncedSearch, sort, selectedBranchId]);

  // Server-side filtering is now handled in loadData

  const openForm = (supplier = null) => {
    if (supplier) {
      navigate(`/suppliers/edit/${supplier.id}`);
    } else {
      navigate('/suppliers/add');
    }
  };

  const openPayment = (supplier) => {
    setActiveSupplier(supplier);
    setPaymentAmount('');
    setPaymentDesc('دفعة نقدية');
    setModalType('payment');
  };

  const closeModal = () => {
    setModalType(null);
    setActiveSupplier(null);
    setFormErrors({});
  };



  const handleSavePayment = async (e) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast('يرجى إدخال مبلغ صحيح', 'warning');
      return;
    }

    setSaving(true);
    try {
      await Api.paySupplier(activeSupplier.id, amount, paymentDesc || 'Manual Payment', selectedBranchId);
      toast('تم تسجيل الدفعة بنجاح', 'success');
      closeModal();
      window.location.reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id, name) => {
    confirm(`سيتم حذف المورد "${name}" نهائياً`, async () => {
      try {
        await Api.deleteSupplier(id);
        toast('تم حذف المورد بنجاح', 'success');
        loadData();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  };

  const items = data;

  return (
    <>
      <style>{`
        /* Responsive CSS Overrides for Suppliers Page */
        @media (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
          .toolbar {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
            display: flex !important;
          }
          .toolbar select, 
          .toolbar .search-input,
          .toolbar .search-input input {
            width: 100% !important;
            max-width: 100% !important;
            height: 40px !important;
          }
          .toolbar-actions {
            width: 100% !important;
            display: flex !important;
            gap: 8px !important;
            flex-wrap: wrap !important;
          }
          .toolbar-actions button {
            flex: 1 1 45% !important;
            justify-content: center !important;
          }
          .toolbar-actions .btn-primary {
            flex: 1 1 100% !important;
          }
          
          .table-wrapper {
            overflow-x: auto !important;
            width: 100% !important;
            -webkit-overflow-scrolling: touch !important;
            border: 1px solid var(--border-subtle) !important;
            border-radius: 8px !important;
          }
          .data-table {
            min-width: 850px !important;
          }
        }

        @media (max-width: 768px) {
          .page-section {
            padding: 12px !important;
          }
          .card {
            border-radius: 12px !important;
          }
          .card-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
          .card-header h3 {
            font-size: 1.2rem !important;
            text-align: center !important;
          }
          .card-body {
            padding: 10px !important;
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr !important;
          }
          .pagination {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
            padding: 12px !important;
          }
          .pagination button {
            flex: 1 !important;
            padding: 8px 10px !important;
            font-size: 0.8rem !important;
          }
        }
      `}</style>
      <div className="page-section">
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          <StatTile
            id="supp_total"
            label="إجمالي الموردين"
            value={totalElements}
            icon={<i className="fa-solid fa-truck-field"></i>}
            defaults={{ color: 'blue', size: 'tile-wd-sm', order: 1 }}
          />
          <StatTile
            id="supp_balance"
            label={data.reduce((sum, s) => sum + Number(s.balance || 0), 0) >= 0 ? "إجمالي المستحقات لنا" : "إجمالي المديونيات علينا"}
            value={Math.abs(data.reduce((sum, s) => sum + Number(s.balance || 0), 0)).toLocaleString()}
            icon={<i className="fa-solid fa-chart-simple"></i>}
            defaults={{ color: 'emerald', size: 'tile-wd-sm', order: 2 }}
          />
          <StatTile
            id="supp_debt"
            label="عليهم مديونية"
            value={data.filter(s => Number(s.balance || 0) < 0).length}
            icon={<i className="fa-solid fa-hand-holding-dollar"></i>}
            defaults={{ color: 'amber', size: 'tile-sq-sm', order: 3 }}
          />
          <StatTile
            id="supp_credit"
            label="لهم مستحقات"
            value={data.filter(s => Number(s.balance || 0) > 0).length}
            icon={<i className="fa-solid fa-chart-simple"></i>}
            defaults={{ color: 'magenta', size: 'tile-sq-sm', order: 4 }}
          />
        </div>

        {/* Daily Supplier Stats Chart */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3><i className="fa-solid fa-chart-column"></i> حركة الموردين اليومية (أخر 7 أيام)</h3>
          </div>
          <div className="card-body" style={{ minHeight: '350px', height: 'auto', width: '100%', padding: '20px' }}>
            {dailyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300} minWidth={0}>
                <ComposedChart data={dailyStats} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                  
                  {/* المحور الأيسر للقيم المالية */}
                  <YAxis yAxisId="left" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val} />
                  
                  {/* المحور الأيمن لعدد الفواتير */}
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#f59e0b', fontSize: 12 }} axisLine={false} tickLine={false} />

                  <Tooltip 
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                    formatter={(value, name) => {
                      let label = name;
                      if (name === 'invoicesCount') return [value, 'عدد فواتير المشتريات'];
                      if (name === 'purchases') return [`${Number(value).toLocaleString()} ج.م`, 'إجمالي الفواتير (علينا)'];
                      if (name === 'payments') return [`${Number(value).toLocaleString()} ج.م`, 'إجمالي الدفعات (دفعنا)'];
                      return [value, label];
                    }}
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                  />
                  
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#ccc' }} />

                  <Bar yAxisId="left" dataKey="purchases" name="إجمالي الفواتير" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={25} />
                  <Bar yAxisId="left" dataKey="payments" name="الدفعات المسددة" fill="#10b981" radius={[4, 4, 0, 0]} barSize={25} />
                  
                  <Line yAxisId="right" type="monotone" dataKey="invoicesCount" name="عدد الفواتير" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#111' }} activeDot={{ r: 6 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ padding: '20px', color: 'var(--text-dim)', textAlign: 'center', marginTop: '100px' }}>لا توجد تعاملات في الفترة المحددة</div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3><i className="fa-solid fa-industry"></i> إدارة الموردين</h3>
            <div className="toolbar">
              <select 
                className="form-control" 
                value={selectedBranchId} 
                onChange={(e) => setSelectedBranchId(e.target.value)}
                style={{ width: '180px', height: '40px', padding: '0 10px' }}
                disabled={!Api.can('ROLE_ADMIN')}
              >
                <option value="">كل الفروع</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>

              <div className="search-input">
                <input 
                  type="text" 
                  placeholder="بحث عن مورد..." 
                  value={searchTerm} 
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(0);
                  }} 
                />
                <span className="search-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
              </div>
              
              <select 
                className="form-control" 
                value={sort} 
                onChange={(e) => {
                  setSort(e.target.value);
                  setCurrentPage(0);
                }}
                style={{ width: '230px', height: '40px', padding: '0 10px' }}
              >
                <option value="name,asc">الاسم (أ-ي)</option>
                <option value="name,desc">الاسم (ي-أ)</option>
                <option value="balance,asc">لموردين لهم مستحقات (الرصيد السالب)</option>
                <option value="balance,desc">موردين عليهم مديونيات (الرصيد الموجب)</option>
                <option value="createdAt,desc">الأحدث تسجيلًا 🆕</option>
                <option value="createdAt,asc">الأقدم تسجيلًا</option>
                <option value="purchasesCount,desc">الأكثر توريداً (عدد فواتير) <i className="fa-solid fa-arrow-trend-up"></i></option>
                <option value="purchasesCount,asc">الأقل توريداً (عدد فواتير) <i className="fa-solid fa-arrow-trend-down"></i></option>
                <option value="purchasesTotalValue,desc">الأكثر توريداً (قيمة مالية) <i className="fa-solid fa-sack-dollar"></i></option>
                <option value="purchasesTotalValue,asc">الأقل توريداً (قيمة مالية) <i className="fa-solid fa-money-bill"></i></option>
              </select>

              <div className="toolbar-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImportExcel} 
                  accept=".xlsx, .xls" 
                  style={{ display: 'none' }} 
                />

                {Api.can('SUPPLIER_READ') && (
                  <>
                    <button
                      className="btn btn-secondary"
                      onClick={handleExportExcel}
                      disabled={exportState.isOpen || items.length === 0}
                    >
                      تصدير إكسيل
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={handleExportPdf}
                      disabled={exportState.isOpen || items.length === 0}
                    >
                      تصدير PDF
                    </button>
                  </>
                )}

                {Api.can('SUPPLIER_WRITE') && (
                  <>
                    <div className="dropdown-import-container" style={{ position: 'relative', display: 'inline-block' }}>
                       <button
                         type="button"
                         className="btn btn-secondary"
                         onClick={() => {
                           const menu = document.getElementById('importSuppliersDropdownMenu');
                           if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                         }}
                         disabled={importingExcel}
                       >
                         {importingExcel ? ' جاري الاستيراد...' : ' استيراد'}
                       </button>
                       <div 
                         id="importSuppliersDropdownMenu" 
                         style={{ 
                           display: 'none', 
                           position: 'absolute', 
                           background: 'var(--bg-elevated, #1a1a1a)', 
                           minWidth: '200px', 
                           boxShadow: '0px 8px 24px rgba(0,0,0,0.3)', 
                           zIndex: 100, 
                           right: 0, 
                           borderRadius: '8px', 
                           border: '1px solid var(--border-subtle, #333)',
                           marginTop: '8px',
                           overflow: 'hidden'
                         }}
                       >
                         <button 
                           type="button"
                           onClick={() => {
                             const menu = document.getElementById('importSuppliersDropdownMenu');
                             if (menu) menu.style.display = 'none';
                             if (fileInputRef.current) fileInputRef.current.click();
                           }}
                           style={{ 
                             color: 'var(--text-main, #ffffff)', 
                             padding: '12px 16px', 
                             textDecoration: 'none', 
                             display: 'flex', 
                             alignItems: 'center',
                             justifyContent: 'flex-start',
                             gap: '10px',
                             width: '100%', 
                             border: 'none', 
                             background: 'transparent', 
                             textAlign: 'right', 
                             fontSize: '0.9rem', 
                             cursor: 'pointer',
                             transition: 'background-color 0.2s'
                           }}
                           onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover-tile, #2a2a2a)'}
                           onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                         >
                           <span style={{ fontSize: '1.1rem' }}><i className="fa-solid fa-folder-open"></i></span>
                           <span style={{ color: 'var(--text-main, #ffffff)' }}>رفع ملف إكسيل</span>
                         </button>
                         <button 
                           type="button"
                           onClick={() => {
                             const menu = document.getElementById('importSuppliersDropdownMenu');
                             if (menu) menu.style.display = 'none';
                             handleDownloadTemplate();
                           }}
                           style={{ color: 'var(--text-white, #fff)', padding: '12px 16px', textDecoration: 'none', display: 'block', width: '100%', border: 'none', background: 'none', textAlign: 'right', fontSize: '0.85rem', cursor: 'pointer', borderTop: '1px solid var(--border-color, #333)' }}
                         >
                           <i className="fa-solid fa-clipboard-list"></i> تحميل نموذج فارغ
                         </button>
                       </div>
                    </div>

                    <button className="btn btn-primary" onClick={() => openForm(null)}>
                      <span>+</span> إضافة مورد
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="card-body no-padding">
            <div className="table-wrapper">
              {loading ? (
                <Loader message="جاري تحميل الموردين..." />
              ) : items.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon"><i className="fa-solid fa-industry"></i></div>
                  <h4>لا يوجد موردين</h4>
                  <p>قم بإضافة موردين جدد</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>المورد</th>
                      <th>الهاتف</th>
                      <th>البريد</th>
                      <th>الرقم الضريبي</th>
                      <th>الرصيد</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((s, i) => {
                      const balance = Number(s.balance || 0);
                      const balanceClass = balance > 0 ? 'balance-negative' : balance < 0 ? 'balance-positive' : '';
                      return (
                        <tr key={s.id}>
                          <td style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                            {(currentPage * pageSize) + i + 1}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-full)', background: 'var(--gradient-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                                {(s.name || 'M').charAt(0)}
                              </div>
                              <div>
                                <Link to={`/suppliers/${s.id}`} style={{ fontWeight: 600, color: 'var(--metro-blue)', textDecoration: 'none' }}>{s.name}</Link>
                                {s.address && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.address}</div>}
                              </div>
                            </div>
                          </td>
                          <td>{s.phone || '—'}</td>
                          <td>{s.email || '—'}</td>
                          <td><code style={{ background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{s.taxNumber || '—'}</code></td>
                          <td className={balanceClass} style={{ fontWeight: 700 }}>{balance.toFixed(2)}</td>
                          <td>
                            <div className="table-actions">
                              <button className="btn btn-icon btn-ghost" title="ملف المورد والإحصائيات" onClick={() => navigate(`/suppliers/${s.id}`)}><i className="fa-solid fa-chart-column"></i></button>
                              <button className="btn btn-icon btn-ghost" title="عرض الفواتير" onClick={() => navigate(`/purchases/${encodeURIComponent(s.name)}`)}><i className="fa-solid fa-cart-shopping"></i></button>
                              {Api.can('SUPPLIER_WRITE') && (
                                <>
                                  <button className="btn btn-icon btn-ghost" title="دفع" onClick={() => openPayment(s)}><i className="fa-solid fa-sack-dollar"></i></button>
                                  <button className="btn btn-icon btn-ghost" title="تعديل" onClick={() => openForm(s)}><i className="fa-solid fa-pencil"></i></button>
                                </>
                              )}
                              {Api.can('SUPPLIER_DELETE') && <button className="btn btn-icon btn-ghost" title="حذف" onClick={() => handleDelete(s.id, s.name)}><i className="fa-solid fa-trash"></i></button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {totalPages > 1 && (
              <div className="pagination" style={{ borderTop: '1px solid var(--border-main)' }}>
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
        </div>
      </div>
      <ExportProgressModal exportState={exportState} onClose={closeExportModal} />

      {modalType === 'payment' && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModal(); }}>
            <div className="modal" style={{ maxWidth: '450px' }}>
              <div className="modal-header">
                <h3>دفع للمورد — {activeSupplier.name}</h3>
                <button className="modal-close" onClick={closeModal}><i className="fa-solid fa-times"></i></button>
              </div>
              <div className="modal-body">
                <form id="paymentForm" onSubmit={handleSavePayment}>
                  <div className="form-group">
                    <label>المبلغ *</label>
                    <input className="form-control" name="amount" type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>الوصف</label>
                    <input className="form-control" name="description" value={paymentDesc} onChange={(e) => setPaymentDesc(e.target.value)} />
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>إلغاء</button>
                <button type="submit" form="paymentForm" className="btn btn-success" disabled={saving}>
                  {saving ? 'جاري التسجيل...' : 'تسجيل الدفعة'}
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </>
  );
};

export default Suppliers;
