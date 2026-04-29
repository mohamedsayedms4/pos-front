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

  // Server-side filtering is now handled in loadData

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

  const items = data;

  return (
    <>
      <div className="page-section">
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          <StatTile
            id="supp_total"
            label="إجمالي الموردين"
            value={totalElements}
            icon="🏭"
            defaults={{ color: 'blue', size: 'tile-wd-sm', order: 1 }}
          />
          <StatTile
            id="supp_balance"
            label={data.reduce((sum, s) => sum + Number(s.balance || 0), 0) >= 0 ? "إجمالي المستحقات لنا" : "إجمالي المديونيات علينا"}
            value={Math.abs(data.reduce((sum, s) => sum + Number(s.balance || 0), 0)).toLocaleString()}
            icon="💳"
            defaults={{ color: 'emerald', size: 'tile-wd-sm', order: 2 }}
          />
          <StatTile
            id="supp_debt"
            label="عليهم مديونية"
            value={data.filter(s => Number(s.balance || 0) < 0).length}
            icon="⚠️"
            defaults={{ color: 'amber', size: 'tile-sq-sm', order: 3 }}
          />
          <StatTile
            id="supp_credit"
            label="لهم مستحقات"
            value={data.filter(s => Number(s.balance || 0) > 0).length}
            icon="🔔"
            defaults={{ color: 'magenta', size: 'tile-sq-sm', order: 4 }}
          />
        </div>

        {/* Daily Supplier Stats Chart */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3>📊 حركة الموردين اليومية (أخر 7 أيام)</h3>
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
            <h3>🏭 إدارة الموردين</h3>
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
                <span className="search-icon">🔍</span>
                <input 
                  type="text" 
                  placeholder="بحث عن مورد..." 
                  value={searchTerm} 
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(0);
                  }} 
                />
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
                <option value="purchasesCount,desc">الأكثر توريداً (عدد فواتير) 📈</option>
                <option value="purchasesCount,asc">الأقل توريداً (عدد فواتير) 📉</option>
                <option value="purchasesTotalValue,desc">الأكثر توريداً (قيمة مالية) 💰</option>
                <option value="purchasesTotalValue,asc">الأقل توريداً (قيمة مالية) 💵</option>
              </select>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleExportExcel}
                  disabled={exportingExcel || items.length === 0}
                >
                  {exportingExcel ? '⏳' : '📊'} إكسيل
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleExportPdf}
                  disabled={exportingPdf || items.length === 0}
                >
                  {exportingPdf ? '⏳' : '📄'} PDF
                </button>

                {Api.can('SUPPLIER_WRITE') && (
                  <button className="btn btn-primary" onClick={() => openForm(null)}>
                    <span>+</span> إضافة مورد
                  </button>
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
                  <div className="empty-icon">🏭</div>
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
                          <td>
                            {s.branch ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', fontSize: '0.8rem', fontWeight: 600 }}>
                                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent-emerald)', display: 'inline-block' }}></span>
                                {s.branch.name}
                              </span>
                            ) : <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>—</span>}
                          </td>
                          <td><code style={{ background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{s.taxNumber || '—'}</code></td>
                          <td className={balanceClass} style={{ fontWeight: 700 }}>{balance.toFixed(2)}</td>
                          <td>
                            <div className="table-actions">
                              <button className="btn btn-icon btn-ghost" title="ملف المورد والإحصائيات" onClick={() => navigate(`/suppliers/${s.id}`)}>📊</button>
                              <button className="btn btn-icon btn-ghost" title="عرض الفواتير" onClick={() => navigate(`/purchases/${encodeURIComponent(s.name)}`)}>🛒</button>
                              {Api.can('SUPPLIER_WRITE') && (
                                <>
                                  <button className="btn btn-icon btn-ghost" title="دفع" onClick={() => openPayment(s)}>💰</button>
                                  <button className="btn btn-icon btn-ghost" title="تعديل" onClick={() => openForm(s)}>✏️</button>
                                </>
                              )}
                              {Api.can('SUPPLIER_DELETE') && <button className="btn btn-icon btn-ghost" title="حذف" onClick={() => handleDelete(s.id, s.name)}>🗑️</button>}
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

      {modalType === 'form' && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModal(); }}>
            <div className="modal">
              <div className="modal-header">
                <h3>{activeSupplier ? 'تعديل مورد' : 'إضافة مورد جديد'}</h3>
                <button className="modal-close" onClick={closeModal}>✕</button>
              </div>
              <div className="modal-body">
                <form id="supplierForm" onSubmit={handleSaveForm}>
                  <div className="form-group">
                    <label>اسم المورد *</label>
                    <input className="form-control" name="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>الهاتف</label>
                      <input className="form-control" name="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>البريد الإلكتروني</label>
                      <input className="form-control" name="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>العنوان</label>
                    <input className="form-control" name="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>الرقم الضريبي</label>
                    <input className="form-control" name="taxNumber" value={formData.taxNumber} onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>الفروع المرتبطة *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', background: 'var(--bg-elevated)', padding: '15px', borderRadius: '8px', marginTop: '5px' }}>
                      {branches.map(branch => (
                        <label key={branch.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
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
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>إلغاء</button>
                <button type="submit" form="supplierForm" className="btn btn-primary" disabled={saving}>
                  {saving ? 'جاري الحفظ...' : (activeSupplier ? 'حفظ التعديلات' : 'إضافة المورد')}
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {modalType === 'payment' && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModal(); }}>
            <div className="modal" style={{ maxWidth: '450px' }}>
              <div className="modal-header">
                <h3>دفع للمورد — {activeSupplier.name}</h3>
                <button className="modal-close" onClick={closeModal}>✕</button>
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
