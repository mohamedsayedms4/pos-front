import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import '../styles/pages/CustomersPremium.css';

// Reusable CustomSelect Component (Matched with Categories/Suppliers)
const CustomSelect = ({ options, value, onChange, icon, label }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div className="cus-custom-select-container" ref={containerRef}>
      <div 
        className={`cus-custom-select-header ${isOpen ? 'open' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} arrow-icon`}></i>
        <span className="selected-text">{selectedOption?.label}</span>
        {icon && <span className="select-icon">{icon}</span>}
      </div>
      
      {isOpen && (
        <>
          <div className="cus-custom-select-overlay" onClick={() => setIsOpen(false)} />
          <div className="cus-custom-select-dropdown">
            {options.map((opt) => (
              <div 
                key={opt.value} 
                className={`cus-custom-select-option ${value === opt.value ? 'active' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                <i className={`fas fa-check ${value === opt.value ? '' : 'invisible'}`} style={{ opacity: value === opt.value ? 1 : 0 }}></i>
                <span>{opt.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const isAdmin = Api.isAdminOrBranchManager();
  const [showModal, setShowModal] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState({ name: '', phone: '', email: '', address: '', branchIds: [] });
  const [isEditing, setIsEditing] = useState(false);
  const { toast, confirm } = useGlobalUI();
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize] = useState(10);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [debtSummary, setDebtSummary] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Transaction History State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyTab, setHistoryTab] = useState('pos'); // 'pos' or 'online'
  const [historyData, setHistoryData] = useState({ items: [], totalPages: 0, totalElements: 0, page: 0 });
  const [onlineData, setOnlineData] = useState({ items: [], totalPages: 0, totalElements: 0, page: 0 });
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoryCustomer, setSelectedHistoryCustomer] = useState(null);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);

  useEffect(() => {
    loadCustomers(currentPage, pageSize, query, selectedBranchId);
  }, [currentPage, selectedBranchId]);

  const loadCustomers = async (page = currentPage, size = pageSize, searchQuery = query, branchId = selectedBranchId) => {
    setLoading(true);
    try {
      const [res, branchesData] = await Promise.all([
        Api.getCustomers(page, size, searchQuery, branchId),
        branches.length === 0 ? Api.getBranches().catch(() => []) : Promise.resolve(branches)
      ]);
      setCustomers(res.items || res.content || []);
      setTotalPages(res.totalPages || 0);
      setTotalElements(res.totalElements || res.totalItems || 0);
      if (branches.length === 0) setBranches(branchesData);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await Api.updateCustomer(currentCustomer.id, currentCustomer);
        toast('تم تحديث بيانات العميل بنجاح', 'success');
      } else {
        await Api.createCustomer(currentCustomer);
        toast('تم إضافة العميل بنجاح', 'success');
      }
      setShowModal(false);
      loadCustomers(currentPage, pageSize, query);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleDelete = (id) => {
    confirm('هل أنت متأكد من حذف هذا العميل؟', async () => {
      try {
        await Api.deleteCustomer(id);
        toast('تم حذف العميل بنجاح', 'success');
        loadCustomers(currentPage, pageSize, query);
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  };

  const openAddModal = () => {
    setCurrentCustomer({ name: '', phone: '', email: '', address: '', branchIds: [] });
    setIsEditing(false);
    setShowModal(true);
  };

  const openEditModal = (customer) => {
    setCurrentCustomer({
      ...customer,
      branchIds: customer.branches ? customer.branches.map(b => b.id) : []
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleViewDebt = async (customerId) => {
    setLoading(true);
    try {
      const summary = await Api.getCustomerDebt(customerId, selectedBranchId);
      setDebtSummary(summary);
      setPaymentAmount('');
      setPaymentNotes('');
      setShowDebtModal(true);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast('يرجى إدخال مبلغ صحيح', 'error');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const updatedSummary = await Api.collectCustomerPayment(debtSummary.customerId, {
        amount: Number(paymentAmount),
        notes: paymentNotes,
        branchId: selectedBranchId
      });
      setDebtSummary(updatedSummary);
      setPaymentAmount('');
      setPaymentNotes('');
      toast('تم تسجيل الدفعة بنجاح', 'success');
      loadCustomers(currentPage, pageSize, query);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleViewHistory = async (customer, page = 0, tab = 'pos') => {
    setSelectedHistoryCustomer(customer);
    setHistoryTab(tab);
    setLoadingHistory(true);
    setShowHistoryModal(true);
    try {
      if (tab === 'pos') {
        const res = await Api.getCustomerInvoices(customer.id, page, 10);
        setHistoryData({
          items: res.items || res.content || [],
          totalPages: res.totalPages || 0,
          totalElements: res.totalElements || 0,
          page: res.number || page
        });
      } else {
        const res = await Api.getCustomerOnlineOrders(customer.id, page, 10);
        setOnlineData({
          items: res.items || res.content || [],
          totalPages: res.totalPages || 0,
          totalElements: res.totalElements || 0,
          page: res.number || page
        });
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const openInvoiceDetails = (invoice) => {
    setActiveInvoice(invoice);
    setShowInvoiceDetails(true);
  };

  return (
    <div className="customers-page-container">
      {/* HEADER SECTION */}
      <div className="cus-header-container">
        <div className="cus-breadcrumbs">
          <Link to="/">الرئيسية</Link>
          <span>/</span>
          <span>العملاء</span>
        </div>
        <div className="cus-header-row">
          <h1>العملاء</h1>
          <div className="cus-header-actions">
            {Api.can('CUSTOMER_WRITE') !== false && (
              <button className="cus-btn-primary" onClick={openAddModal}>
                <span>عميل جديد</span>
                <i className="fas fa-plus"></i>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="cus-stats-grid">
        <div className="cus-stat-card">
          <div className="cus-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <i className="fas fa-users"></i>
          </div>
          <div className="cus-stat-info">
            <div className="cus-stat-label">إجمالي العملاء</div>
            <div className="cus-stat-value">{totalElements}</div>
          </div>
        </div>

        <div className="cus-stat-card">
          <div className="cus-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="cus-stat-info">
            <div className="cus-stat-label">نشط بالمزامنة</div>
            <div className="cus-stat-value">{customers.length}</div>
          </div>
        </div>

        <div className="cus-stat-card">
          <div className="cus-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <i className="fas fa-clock"></i>
          </div>
          <div className="cus-stat-info">
            <div className="cus-stat-label">انضموا مؤخراً</div>
            <div className="cus-stat-value">0</div>
          </div>
        </div>
      </div>

      {/* MAIN DATA CARD */}
      <div className="cus-main-card">
        <div className="cus-toolbar">
          <div className="cus-toolbar-left">
            {isAdmin && (
              <CustomSelect 
                label="كل الفروع"
                value={selectedBranchId}
                options={[
                  { label: 'جميع الفروع', value: '' },
                  ...branches.map(b => ({ label: b.name, value: b.id }))
                ]}
                onChange={setSelectedBranchId}
                icon={<i className="fas fa-building"></i>}
              />
            )}
          </div>

          <div className="cus-toolbar-right">
            <div className="cus-search-box">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="ابحث عن عميل بالاسم أو الهاتف..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCurrentPage(0);
                  loadCustomers(0, pageSize, e.target.value);
                }}
              />
            </div>
          </div>
        </div>

        <div className="cus-table-wrapper">
          {loading ? (
            <Loader message="جاري جلب البيانات..." />
          ) : customers.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <i className="fas fa-users" style={{ fontSize: '3rem', color: 'var(--cus-text-secondary)', marginBottom: '16px', display: 'block' }}></i>
              <h3 style={{ color: 'var(--cus-text-primary)' }}>لا يوجد عملاء حالياً</h3>
            </div>
          ) : (
            <table className="cus-table">
              <thead>
                <tr>
                  <th>العميل</th>
                  <th>الهاتف</th>
                  <th className="hide-tablet">البريد</th>
                  <th style={{ textAlign: 'center' }}>الرصيد</th>
                  <th style={{ textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, idx) => (
                  <tr key={c.id}>
                    <td>
                      <div className="cus-customer-cell">
                        <div className="cus-avatar">{(c.name || 'C').charAt(0)}</div>
                        <div style={{ fontWeight: 800 }}>{c.name}</div>
                      </div>
                    </td>
                    <td>{c.phone || '—'}</td>
                    <td className="hide-tablet">{c.email || '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`cus-balance ${c.balance > 0 ? 'cus-balance-negative' : 'cus-balance-positive'}`}>
                        {Number(c.balance).toLocaleString()} ج.م
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button className="cus-action-btn" onClick={() => handleViewHistory(c)} title="سجل التعاملات">
                          <i className="fas fa-eye"></i>
                        </button>
                        {Number(c.balance) > 0 && (
                          <button className="cus-action-btn" style={{ color: '#10b981' }} onClick={() => handleViewDebt(c.id)} title="تحصيل دفع">
                            <i className="fas fa-hand-holding-usd"></i>
                          </button>
                        )}
                        <button className="cus-action-btn" onClick={() => openEditModal(c)} title="تعديل">
                          <i className="fas fa-edit"></i>
                        </button>
                        <button className="cus-action-btn delete" style={{ color: '#f43f5e' }} onClick={() => handleDelete(c.id)} title="حذف">
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="cus-pagination">
            <div style={{ color: 'var(--cus-text-secondary)', fontSize: '0.9rem' }}>
              عرض صفحة {currentPage + 1} من {totalPages}
            </div>
            <div className="cus-page-buttons">
              <button
                className="cus-page-btn"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage(prev => prev - 1)}
              ><i className="fas fa-chevron-right"></i></button>
              <button className="cus-page-btn active">{currentPage + 1}</button>
              <button
                className="cus-page-btn"
                disabled={currentPage >= totalPages - 1}
                onClick={() => setCurrentPage(prev => prev + 1)}
              ><i className="fas fa-chevron-left"></i></button>
            </div>
          </div>
        )}
      </div>

      {/* --- Modals --- */}
      {showModal && (
        <ModalContainer>
          <div className="prd-modal-overlay active" onClick={(e) => { if (e.target.classList.contains('prd-modal-overlay')) setShowModal(false); }}>
            <div className="prd-modal" style={{ maxWidth: '600px' }}>
              <div className="prd-card-title-row" style={{ padding: '24px 24px 0' }}>
                <h3 className="prd-card-title">{isEditing ? 'تعديل بيانات عميل' : 'إضافة عميل جديد'}</h3>
                <button className="prd-modal-close" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <form onSubmit={handleSave}>
                <div className="prd-modal-body">
                  <div className="prd-form-group">
                    <label className="prd-label">اسم العميل *</label>
                    <input type="text" className="prd-input" required value={currentCustomer.name} onChange={e => setCurrentCustomer({ ...currentCustomer, name: e.target.value })} />
                  </div>
                  <div className="prd-form-row">
                    <div className="prd-form-group">
                      <label className="prd-label">رقم الهاتف</label>
                      <input type="text" className="prd-input" value={currentCustomer.phone} onChange={e => setCurrentCustomer({ ...currentCustomer, phone: e.target.value })} />
                    </div>
                    <div className="prd-form-group">
                      <label className="prd-label">البريد الإلكتروني</label>
                      <input type="email" className="prd-input" value={currentCustomer.email} onChange={e => setCurrentCustomer({ ...currentCustomer, email: e.target.value })} />
                    </div>
                  </div>
                  <div className="prd-form-group">
                    <label className="prd-label">العنوان التفصيلي</label>
                    <textarea className="prd-textarea" rows="2" value={currentCustomer.address} onChange={e => setCurrentCustomer({ ...currentCustomer, address: e.target.value })} />
                  </div>
                  <div className="prd-form-group">
                    <label className="prd-label">الفروع المرتبطة *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', background: 'var(--cus-bg-dark)', padding: '15px', borderRadius: '16px', marginTop: '5px' }}>
                      {branches.map(branch => (
                        <label key={branch.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--cus-text-primary)' }}>
                          <input 
                            type="checkbox" 
                            checked={currentCustomer.branchIds?.includes(branch.id)} 
                            onChange={(e) => {
                              const newIds = e.target.checked 
                                ? [...(currentCustomer.branchIds || []), branch.id]
                                : (currentCustomer.branchIds || []).filter(id => id !== branch.id);
                              setCurrentCustomer({ ...currentCustomer, branchIds: newIds });
                            }} 
                          />
                          {branch.name}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="prd-modal-footer">
                  <button type="button" className="cus-btn-ghost" onClick={() => setShowModal(false)}>إلغاء</button>
                  <button type="submit" className="cus-btn-primary">
                    <span>{isEditing ? 'تحديث البيانات' : 'إضافة العميل'}</span>
                    <i className="fas fa-check"></i>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalContainer>
      )}

      {showDebtModal && (
        <ModalContainer>
          <div className="prd-modal-overlay active" onClick={(e) => { if (e.target.classList.contains('prd-modal-overlay')) setShowDebtModal(false); }}>
            <div className="prd-modal" style={{ maxWidth: '700px' }}>
              <div className="prd-card-title-row" style={{ padding: '24px 24px 0' }}>
                <h3 className="prd-card-title">كشف حساب: {debtSummary?.customerName}</h3>
                <button className="prd-modal-close" onClick={() => setShowDebtModal(false)}>✕</button>
              </div>
              <div className="prd-modal-body">
                {debtSummary && (
                  <>
                    <div className="cus-stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '24px' }}>
                      <div className="cus-stat-card" style={{ borderLeft: '4px solid #f43f5e' }}>
                        <div className="cus-stat-info">
                          <div className="cus-stat-label">المديونية الحالية</div>
                          <div className="cus-stat-value" style={{ color: '#f43f5e' }}>{Number(debtSummary.totalDebt).toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="cus-stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                        <div className="cus-stat-info">
                          <div className="cus-stat-label">فواتير مفتوحة</div>
                          <div className="cus-stat-value" style={{ color: '#3b82f6' }}>{debtSummary.openInvoicesCount}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="cus-table-wrapper" style={{ maxHeight: '200px', marginBottom: '24px', borderRadius: '16px', border: '1px solid var(--cus-glass-border)' }}>
                      <table className="cus-table">
                        <thead>
                          <tr>
                            <th>رقم الفاتورة</th>
                            <th>المتبقي</th>
                          </tr>
                        </thead>
                        <tbody>
                          {debtSummary.openInvoices.map(inv => (
                            <tr key={inv.id}>
                              <td>{inv.invoiceNumber}</td>
                              <td style={{ color: '#f43f5e', fontWeight: 800 }}>{Number(inv.remainingAmount).toLocaleString()} ج.م</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div> 

                    <form onSubmit={handlePayment} style={{ background: 'var(--cus-bg-dark)', padding: '24px', borderRadius: '20px', border: '1px solid var(--cus-glass-border)' }}>
                      <div className="prd-form-group">
                        <label className="prd-label">المبلغ المحصل</label>
                        <input type="number" step="0.01" className="prd-input" required max={debtSummary.totalDebt} value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
                      </div>
                      <button type="submit" className="cus-btn-primary" style={{ width: '100%' }} disabled={isSubmittingPayment}>
                        <span>{isSubmittingPayment ? 'جاري الحفظ...' : 'تأكيد تحصيل الدفعة'}</span>
                        <i className="fas fa-save"></i>
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {showHistoryModal && (
        <ModalContainer>
          <div className="prd-modal-overlay active" onClick={(e) => { if (e.target.classList.contains('prd-modal-overlay')) setShowHistoryModal(false); }}>
            <div className="prd-modal" style={{ maxWidth: '900px' }}>
              <div className="prd-card-title-row" style={{ padding: '24px 24px 0' }}>
                <h3 className="prd-card-title">السجل: {selectedHistoryCustomer?.name}</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className={`cus-btn-ghost ${historyTab === 'pos' ? 'active' : ''}`} style={{ padding: '8px 16px', background: historyTab === 'pos' ? 'var(--cus-primary)' : '', color: historyTab === 'pos' ? 'white' : '' }} onClick={() => handleViewHistory(selectedHistoryCustomer, 0, 'pos')}>كاشير</button>
                  <button className={`cus-btn-ghost ${historyTab === 'online' ? 'active' : ''}`} style={{ padding: '8px 16px', background: historyTab === 'online' ? 'var(--cus-primary)' : '', color: historyTab === 'online' ? 'white' : '' }} onClick={() => handleViewHistory(selectedHistoryCustomer, 0, 'online')}>أونلاين</button>
                </div>
                <button className="prd-modal-close" onClick={() => setShowHistoryModal(false)}>✕</button>
              </div>
              <div className="prd-modal-body" style={{ minHeight: '300px' }}>
                <div className="cus-table-wrapper">
                  <table className="cus-table">
                    <thead>
                      <tr>
                        <th>الرقم</th>
                        <th>التاريخ</th>
                        <th>الإجمالي</th>
                        <th style={{ textAlign: 'center' }}>الإجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(historyTab === 'pos' ? historyData : onlineData).items.map(inv => (
                        <tr key={inv.id}>
                          <td><code style={{ background: 'var(--cus-bg-dark)', padding: '4px 10px', borderRadius: '8px' }}>{inv.invoiceNumber || inv.orderNumber}</code></td>
                          <td>{new Date(inv.invoiceDate || inv.orderDate).toLocaleDateString('ar-EG')}</td>
                          <td style={{ fontWeight: 800 }}>{Number(inv.totalAmount).toLocaleString()} ج.م</td>
                          <td style={{ textAlign: 'center' }}>
                             <button className="cus-btn-ghost" style={{ padding: '6px 12px', fontSize: '0.8rem', margin: '0 auto' }} onClick={() => openInvoiceDetails(inv)}>التفاصيل</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {showInvoiceDetails && (
        <ModalContainer>
          <div className="prd-modal-overlay active" style={{ zIndex: 1100 }} onClick={() => setShowInvoiceDetails(false)}>
            <div className="prd-modal" style={{ maxWidth: '500px' }}>
              <div className="prd-card-title-row" style={{ padding: '24px 24px 0' }}>
                <h3 className="prd-card-title">تفاصيل: {activeInvoice?.invoiceNumber}</h3>
                <button className="prd-modal-close" onClick={() => setShowInvoiceDetails(false)}>✕</button>
              </div>
              <div className="prd-modal-body">
                <div className="cus-table-wrapper">
                  <table className="cus-table">
                    <thead>
                      <tr><th>الصنف</th><th>الكمية</th><th>السعر</th></tr>
                    </thead>
                    <tbody>
                      {activeInvoice?.items?.map(it => (
                        <tr key={it.id}><td>{it.productName}</td><td>{it.quantity}</td><td>{Number(it.unitPrice).toLocaleString()}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default Customers;
