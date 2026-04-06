import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import ModalContainer from '../components/common/ModalContainer';
import Loader from '../components/common/Loader';

const Suppliers = () => {
  const { toast, confirm } = useGlobalUI();
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10;
  const navigate = useNavigate();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Modals state
  const [modalType, setModalType] = useState(null); // 'form', 'payment', null
  const [activeSupplier, setActiveSupplier] = useState(null);

  // Form state
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '', taxNumber: '' });

  // Payment state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDesc, setPaymentDesc] = useState('دفعة نقدية');

  const [saving, setSaving] = useState(false);

  const loadData = async (page = 0, size = 10, query = debouncedSearch) => {
    setLoading(true);
    try {
      const res = await Api.getSuppliers(page, size, query);
      setData(res.content || res.items || []);
      setTotalPages(res.totalPages || 0);
      setTotalElements(res.totalElements || 0);
      setCurrentPage(res.number || 0);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(currentPage, pageSize, debouncedSearch);
  }, [currentPage, debouncedSearch]);

  // Server-side filtering is now handled in loadData

  const openForm = async (supplier = null) => {
    setActiveSupplier(supplier);
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        taxNumber: supplier.taxNumber || ''
      });
    } else {
      setFormData({ name: '', phone: '', email: '', address: '', taxNumber: '' });
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
        await Api.createSupplier(formData);
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
      await Api.paySupplier(activeSupplier.id, amount, paymentDesc || 'Manual Payment');
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
        <div className="stats-grid">
          <div className="stat-card blue tile-wd-sm">
            <div className="stat-icon">🏭</div>
            <div className="stat-value">{totalElements}</div>
            <div className="stat-label">إجمالي الموردين</div>
          </div>
          <div className="stat-card emerald tile-wd-sm">
            <div className="stat-icon">💳</div>
            <div className="stat-value">
              {Math.abs(data.reduce((sum, s) => sum + Number(s.balance || 0), 0)).toLocaleString()}
            </div>
            <div className="stat-label">
              {data.reduce((sum, s) => sum + Number(s.balance || 0), 0) >= 0 ? "إجمالي المستحقات لنا" : "إجمالي المديونيات علينا"}
            </div>
          </div>
          <div className="stat-card amber tile-sq-sm">
            <div className="stat-icon">⚠️</div>
            <div className="stat-value">{data.filter(s => Number(s.balance || 0) < 0).length}</div>
            <div className="stat-label">عليهم مديونية</div>
          </div>
          <div className="stat-card magenta tile-sq-sm">
            <div className="stat-icon">🔔</div>
            <div className="stat-value">{data.filter(s => Number(s.balance || 0) > 0).length}</div>
            <div className="stat-label">لهم مستحقات</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>🏭 إدارة الموردين</h3>
            <div className="toolbar">
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
              {Api.can('SUPPLIER_WRITE') && (
                <button className="btn btn-primary" onClick={() => openForm(null)}>
                  <span>+</span> إضافة مورد
                </button>
              )}
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
                          <td>{s.email || '—'}</td>
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
