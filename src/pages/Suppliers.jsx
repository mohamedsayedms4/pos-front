import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import ModalContainer from '../components/common/ModalContainer';
import Loader from '../components/common/Loader';
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
import '../styles/pages/SuppliersPremium.css';

// Reusable CustomSelect Component (Matched with Categories)
const CustomSelect = ({ options, value, onChange, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="sup-custom-select-container">
      <div className={`sup-custom-select-header ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        {icon && <i className={`fas ${icon} icon-start`}></i>}
        <span className="selected-text">{selectedOption ? selectedOption.label : 'اختر...'}</span>
        <i className={`fas fa-chevron-down icon-end ${isOpen ? 'rotate' : ''}`}></i>
      </div>
      
      {isOpen && (
        <>
          <div className="sup-custom-select-overlay" onClick={() => setIsOpen(false)}></div>
          <div className="sup-custom-select-dropdown">
            {options.map(option => (
              <div 
                key={option.value} 
                className={`sup-custom-select-item ${value === option.value ? 'active' : ''}`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {option.label}
                {value === option.value && <i className="fas fa-check"></i>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

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

  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Modals state
  const [modalType, setModalType] = useState(null); // 'form', 'payment', null
  const [activeSupplier, setActiveSupplier] = useState(null);

  // Form state
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '', taxNumber: '', branchIds: [] });

  // Payment state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDesc, setPaymentDesc] = useState('دفعة نقدية');

  const [saving, setSaving] = useState(false);

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      await Api.exportSuppliersExcel(debouncedSearch, sort, selectedBranchId);
      toast('تم تصدير ملف الإكسيل بنجاح', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      await Api.exportSuppliersPdf(debouncedSearch, sort, selectedBranchId);
      toast('تم تصدير ملف PDF بنجاح', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setExportingPdf(false);
    }
  };

  const loadData = async (page = 0, size = 10, query = debouncedSearch, sortParam = sort, branchId = selectedBranchId) => {
    setLoading(true);
    try {
      const [res, statsData] = await Promise.all([
        Api.getSuppliers(page, size, query, sortParam, branchId),
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

  const openForm = async (supplier = null) => {
    setActiveSupplier(supplier);
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        taxNumber: supplier.taxNumber || '',
        branchIds: supplier.branches ? supplier.branches.map(b => b.id) : []
      });
    } else {
      setFormData({ name: '', phone: '', email: '', address: '', taxNumber: '', branchIds: [] });
    }
    setModalType('form');
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
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast('يرجى إدخال اسم المورد', 'warning');
      return;
    }

    setSaving(true);
    try {
      if (activeSupplier) {
        await Api.updateSupplier(activeSupplier.id, formData);
      } else {
        await Api.createSupplier(formData, selectedBranchId);
      }
      toast(activeSupplier ? 'تم تحديث المورد بنجاح' : 'تم إضافة المورد بنجاح', 'success');
      closeModal();
      loadData();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
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
      loadData();
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

  const totalSuppliers = totalElements;
  const totalBalance = data.reduce((sum, s) => sum + Number(s.balance || 0), 0);
  const debtSuppliersCount = data.filter(s => Number(s.balance || 0) < 0).length;
  const creditSuppliersCount = data.filter(s => Number(s.balance || 0) > 0).length;

  return (
    <div className="suppliers-page-container">
      {/* Header & Main Controls */}
      <div className="sup-header-toolbar">
        <div className="sup-title-area">
          <h1>إدارة الموردين</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {Api.can('SUPPLIER_WRITE') && (
                <button className="sup-btn-premium sup-btn-blue" onClick={() => openForm(null)}>
                    إضافة مورد <i className="fas fa-plus"></i>
                </button>
            )}
            <button className="sup-btn-premium sup-btn-outline" onClick={handleExportPdf} disabled={exportingPdf || data.length === 0}>
                PDF <i className="fas fa-file-pdf"></i>
            </button>
            <button className="sup-btn-premium sup-btn-outline" onClick={handleExportExcel} disabled={exportingExcel || data.length === 0}>
                إكسيل <i className="fas fa-file-excel"></i> 
            </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="sup-kpi-grid">
        <div className="sup-kpi-card">
          <div className="sup-kpi-icon" style={{ color: '#3b82f6' }}><i className="fas fa-industry"></i></div>
          <div className="sup-kpi-info">
            <div className="label">إجمالي الموردين</div>
            <div className="value">{totalSuppliers}</div>
          </div>
        </div>
        <div className="sup-kpi-card">
          <div className="sup-kpi-icon" style={{ color: totalBalance >= 0 ? '#10b981' : '#f43f5e' }}>
            <i className={totalBalance >= 0 ? "fas fa-wallet" : "fas fa-exclamation-circle"}></i>
          </div>
          <div className="sup-kpi-info">
            <div className="label">{totalBalance >= 0 ? "إجمالي المستحقات لنا" : "إجمالي المديونيات علينا"}</div>
            <div className="value">{Math.abs(totalBalance).toLocaleString()} <small>ج.م</small></div>
          </div>
        </div>
        <div className="sup-kpi-card">
          <div className="sup-kpi-icon" style={{ color: '#f59e0b' }}><i className="fas fa-user-clock"></i></div>
          <div className="sup-kpi-info">
            <div className="label">موردين مدينين</div>
            <div className="value">{debtSuppliersCount}</div>
          </div>
        </div>
        <div className="sup-kpi-card">
          <div className="sup-kpi-icon" style={{ color: '#8b5cf6' }}><i className="fas fa-bell"></i></div>
          <div className="sup-kpi-info">
            <div className="label">موردين دائنين</div>
            <div className="value">{creditSuppliersCount}</div>
          </div>
        </div>
      </div>

      {/* Chart Card */}
      <div className="sup-chart-card">
        <div className="sup-chart-header">
            <h3>📊 حركة الموردين اليومية (أخر 7 أيام)</h3>
        </div>
        <div style={{ height: '320px', minHeight: '320px', width: '100%' }}>
            {dailyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dailyStats} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: 'var(--sup-text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                        <YAxis yAxisId="left" tick={{ fill: 'var(--sup-text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fill: '#f59e0b', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip 
                            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                            contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--sup-glass-border)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
                        />
                        <Legend verticalAlign="top" height={36} iconType="circle" />
                        <Bar yAxisId="left" dataKey="purchases" name="إجمالي الفواتير" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={20} />
                        <Bar yAxisId="left" dataKey="payments" name="الدفعات المسددة" fill="#10b981" radius={[6, 6, 0, 0]} barSize={20} />
                        <Line yAxisId="right" type="monotone" dataKey="invoicesCount" name="عدد الفواتير" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} />
                    </ComposedChart>
                </ResponsiveContainer>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--sup-text-secondary)' }}>لا توجد تعاملات في الفترة المحددة</div>
            )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="sup-main-card">
        <div className="sup-controls-wrapper">
            <div className="sup-toolbar-left">
              <CustomSelect 
                icon="fa-sort-amount-down"
                value={sort}
                onChange={(val) => { setSort(val); setCurrentPage(0); }}
                options={[
                  { value: 'name,asc', label: 'ترتيب: الاسم (أ-ي)' },
                  { value: 'name,desc', label: 'ترتيب: الاسم (ي-أ)' },
                  { value: 'balance,asc', label: 'ترتيب: الأرصدة السالبة أولاً' },
                  { value: 'balance,desc', label: 'ترتيب: الأرصدة الموجبة أولاً' },
                  { value: 'createdAt,desc', label: 'ترتيب: الأحدث تسجيلًا' },
                  { value: 'purchasesCount,desc', label: 'ترتيب: الأكثر توريداً' }
                ]}
              />
              <CustomSelect 
                icon="fa-building"
                value={selectedBranchId}
                onChange={setSelectedBranchId}
                options={[
                  { value: '', label: 'كل الفروع' },
                  ...branches.map(b => ({ value: String(b.id), label: b.name }))
                ]}
              />
            </div>

            <div className="sup-toolbar-right">
              <div className="sup-search-box">
                  <input 
                      type="text"
                      className="sup-search-input" 
                      placeholder="ابحث عن مورد..." 
                      value={searchTerm} 
                      onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(0); }} 
                  />
                  <i className="fas fa-search sup-search-icon"></i>
              </div>
            </div>
        </div>

        <div className="sup-table-wrapper">
          {loading ? (
            <div style={{ padding: '60px 0' }}><Loader message="جاري تحميل الموردين..." /></div>
          ) : data.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🏭</div>
                <h3>لا يوجد موردين</h3>
                <p style={{ color: 'var(--sup-text-secondary)' }}>قم بإضافة موردين جدد للبدء</p>
            </div>
          ) : (
            <>
                <table className="sup-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>#</th>
                      <th>المورد</th>
                      <th>الهاتف</th>
                      <th>الفرع</th>
                      <th>الرقم الضريبي</th>
                      <th>الرصيد الحالي</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((s, i) => {
                      const balance = Number(s.balance || 0);
                      const balanceColor = balance > 0 ? '#ef4444' : balance < 0 ? '#10b981' : 'inherit';
                      return (
                        <tr key={s.id}>
                          <td data-label="#" style={{ color: 'var(--sup-text-secondary)', fontSize: '0.85rem' }}>{(currentPage * pageSize) + i + 1}</td>
                          <td data-label="المورد">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div className="sup-avatar">{(s.name || 'S').charAt(0)}</div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <Link to={`/suppliers/${s.id}`} style={{ fontWeight: 700, color: 'var(--sup-text-primary)', textDecoration: 'none' }}>{s.name}</Link>
                                {s.address && <small style={{ color: 'var(--sup-text-secondary)', fontSize: '0.75rem' }}>{s.address}</small>}
                              </div>
                            </div>
                          </td>
                          <td data-label="الهاتف">{s.phone || '—'}</td>
                          <td data-label="الفرع">
                            {s.branch ? (
                              <span style={{ background: 'var(--sup-glass)', padding: '4px 10px', borderRadius: '20px', border: '1px solid var(--sup-glass-border)', fontSize: '0.8rem' }}>
                                {s.branch.name}
                              </span>
                            ) : '—'}
                          </td>
                          <td data-label="الرقم الضريبي">
                            <code style={{ background: 'var(--sup-glass)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--sup-glass-border)', fontSize: '0.75rem' }}>
                                {s.taxNumber || '—'}
                            </code>
                          </td>
                          <td data-label="الرصيد" style={{ fontWeight: 800, color: balanceColor }}>{balance.toLocaleString()}</td>
                          <td data-label="الإجراءات">
                            <div className="sup-action-group">
                              <button className="sup-action-btn-premium sup-btn-stats" title="ملف المورد" onClick={() => navigate(`/suppliers/${s.id}`)}>
                                <i className="fas fa-chart-bar"></i>
                              </button>
                              <button className="sup-action-btn-premium sup-btn-cart" title="الفواتير" onClick={() => navigate(`/purchases/${encodeURIComponent(s.name)}`)}>
                                <i className="fas fa-shopping-cart"></i>
                              </button>
                              {Api.can('SUPPLIER_WRITE') && (
                                <>
                                  <button className="sup-action-btn-premium sup-btn-wallet" title="دفع" onClick={() => openPayment(s)}>
                                    <i className="fas fa-wallet"></i>
                                  </button>
                                  <button className="sup-action-btn-premium sup-btn-edit" title="تعديل" onClick={() => openForm(s)}>
                                    <i className="fas fa-edit"></i>
                                  </button>
                                </>
                              )}
                              {Api.can('SUPPLIER_DELETE') && (
                                <button className="sup-action-btn-premium sup-btn-delete" title="حذف" onClick={() => handleDelete(s.id, s.name)}>
                                  <i className="fas fa-trash-alt"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {totalPages > 1 && (
                  <div className="int-pagination" style={{ marginTop: '24px' }}>
                    <button className="int-btn-page" disabled={currentPage === 0} onClick={() => setCurrentPage(prev => prev - 1)}>
                        <i className="fas fa-chevron-right"></i>
                    </button>
                    <span style={{ fontWeight: 600 }}>صفحة {currentPage + 1} من {totalPages}</span>
                    <button className="int-btn-page" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(prev => prev + 1)}>
                        <i className="fas fa-chevron-left"></i>
                    </button>
                  </div>
                )}
            </>
          )}
        </div>
      </div>

      {/* Supplier Form Modal */}
      {modalType === 'form' && (
        <div className="det-modal-overlay" onClick={() => closeModal()}>
            <div className="det-modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                <div className="det-modal-header">
                    <h3>{activeSupplier ? <><i className="fas fa-edit"></i> تعديل مورد</> : <><i className="fas fa-plus"></i> إضافة مورد جديد</>}</h3>
                    <button style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }} onClick={closeModal}>✕</button>
                </div>
                <div className="det-modal-body">
                    <form id="supplierForm" onSubmit={handleSaveForm}>
                        <div className="dmg-form-group">
                            <label className="dmg-label">اسم المورد *</label>
                            <input className="dmg-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="dmg-form-group">
                                <label className="dmg-label">الهاتف</label>
                                <input className="dmg-input" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                            <div className="dmg-form-group">
                                <label className="dmg-label">البريد الإلكتروني</label>
                                <input className="dmg-input" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                        </div>
                        <div className="dmg-form-group">
                            <label className="dmg-label">العنوان</label>
                            <input className="dmg-input" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                        </div>
                        <div className="dmg-form-group">
                            <label className="dmg-label">الرقم الضريبي</label>
                            <input className="dmg-input" value={formData.taxNumber} onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })} />
                        </div>
                        <div className="dmg-form-group">
                            <label className="dmg-label">الفروع المرتبطة *</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', background: 'var(--sup-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--sup-border)' }}>
                                {branches.map(branch => (
                                    <label key={branch.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={formData.branchIds.includes(branch.id)} 
                                            onChange={(e) => {
                                                const newIds = e.target.checked 
                                                    ? [...formData.branchIds, branch.id]
                                                    : formData.branchIds.filter(id => id !== branch.id);
                                                setFormData({ ...formData, branchIds: newIds });
                                            }} 
                                        />
                                        {branch.name}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </form>
                </div>
                <div className="det-modal-footer">
                    <button type="button" className="sup-btn-premium sup-btn-outline" onClick={closeModal}>إلغاء</button>
                    <button type="submit" form="supplierForm" className="sup-btn-premium sup-btn-blue" disabled={saving}>
                        {saving ? 'جاري الحفظ...' : (activeSupplier ? 'حفظ التعديلات' : 'إضافة المورد')}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Payment Modal */}
      {modalType === 'payment' && (
        <div className="det-modal-overlay" onClick={() => closeModal()}>
            <div className="det-modal" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
                <div className="det-modal-header">
                    <h3><i className="fas fa-money-bill-wave"></i> دفع للمورد — {activeSupplier.name}</h3>
                    <button style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }} onClick={closeModal}>✕</button>
                </div>
                <div className="det-modal-body">
                    <form id="paymentForm" onSubmit={handleSavePayment}>
                        <div className="dmg-form-group">
                            <label className="dmg-label">المبلغ *</label>
                            <input className="dmg-input" type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required />
                        </div>
                        <div className="dmg-form-group">
                            <label className="dmg-label">الوصف</label>
                            <input className="dmg-input" value={paymentDesc} onChange={(e) => setPaymentDesc(e.target.value)} />
                        </div>
                    </form>
                </div>
                <div className="det-modal-footer">
                    <button type="button" className="sup-btn-premium sup-btn-outline" onClick={closeModal}>إلغاء</button>
                    <button type="submit" form="paymentForm" className="sup-btn-premium sup-btn-blue" disabled={saving}>
                        {saving ? 'جاري التسجيل...' : 'تسجيل الدفعة'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
