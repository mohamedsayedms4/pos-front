import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState({ name: '', phone: '', email: '', address: '' });
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
  const [historyData, setHistoryData] = useState({ items: [], totalPages: 0, totalElements: 0, page: 0 });
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoryCustomer, setSelectedHistoryCustomer] = useState(null);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  useEffect(() => {
    loadCustomers(currentPage, pageSize, query);
  }, [currentPage]);

  const loadCustomers = async (page = 0, size = 10, searchQuery = query) => {
    setLoading(true);
    try {
      const res = await Api.getCustomers(page, size, searchQuery);
      // Backend returns Page object
      setCustomers(res.items || res.content || []);
      setTotalPages(res.totalPages || 0);
      setTotalElements(res.totalElements || 0);
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
    setCurrentCustomer({ name: '', phone: '', email: '', address: '' });
    setIsEditing(false);
    setShowModal(true);
  };

  const openEditModal = (customer) => {
    setCurrentCustomer(customer);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleViewDebt = async (customerId) => {
    setLoading(true);
    try {
      const summary = await Api.getCustomerDebt(customerId);
      setDebtSummary(summary);
      setPaymentAmount(''); // Initialize payment amount as empty
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
        notes: paymentNotes
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

  const handleViewHistory = async (customer, page = 0) => {
    setSelectedHistoryCustomer(customer);
    setLoadingHistory(true);
    setShowHistoryModal(true);
    try {
      const res = await Api.getCustomerInvoices(customer.id, page, 10);
      setHistoryData({
        items: res.items || res.content || [],
        totalPages: res.totalPages || 0,
        totalElements: res.totalElements || 0,
        page: res.number || page
      });
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
    <div className="page-section">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div className="header-title">
          <h1 style={{ fontWeight: 200, fontSize: '2.5rem', letterSpacing: '1px' }}>إدارة العملاء</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>قائمة العملاء المسجلين والتحكم في حساباتهم</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={openAddModal}>
            + عميل جديد
          </button>
        </div>
      </div>

      <div className="stats-grid mb-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        <div className="stat-card blue" style={{ height: '70px', margin: 0, padding: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="stat-value" style={{ fontSize: '1.4rem' }}>{totalElements}</div>
          <div className="stat-label" style={{ fontSize: '0.75rem' }}>إجمالي العملاء</div>
        </div>
        <div className="stat-card emerald" style={{ height: '70px', margin: 0, padding: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="stat-value" style={{ fontSize: '1.4rem' }}>{customers.length}</div>
          <div className="stat-label" style={{ fontSize: '0.75rem' }}>نشط</div>
        </div>
        <div className="stat-card amber" style={{ height: '70px', margin: 0, padding: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="stat-value" style={{ fontSize: '1.4rem' }}>0</div>
          <div className="stat-label" style={{ fontSize: '0.75rem' }}>انضموا مؤخراً</div>
        </div>
      </div>

      <div className="toolbar mb-3">
        <div className="search-input">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="بحث بالاسم أو رقم الهاتف..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCurrentPage(0);
              loadCustomers(0, pageSize, e.target.value);
            }}
          />
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>#</th>
                <th>الاسم</th>
                <th>الهاتف</th>
                <th>البريد الإلكتروني</th>
                <th>العنوان</th>
                <th style={{ textAlign: 'center' }}>الرصيد</th>
                <th style={{ textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6">
                    <Loader message="جاري جلب بيانات العملاء..." />
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center" style={{ padding: '40px', color: 'var(--text-dim)' }}>
                    لا يوجد عملاء مسجلين حالياً
                  </td>
                </tr>
              ) : customers.map((c, idx) => (
                <tr key={c.id} style={{ animationDelay: `${idx * 0.05}s` }}>
                  <td style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                    {(currentPage * pageSize) + idx + 1}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-white)' }}>{c.name}</div>
                  </td>
                  <td>{c.phone || '—'}</td>
                  <td style={{ fontSize: '0.85rem' }}>{c.email || '—'}</td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{c.address || '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={c.balance > 0 ? 'text-danger' : 'text-success'} style={{ fontWeight: 700 }}>
                      {Number(c.balance).toFixed(2)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="table-actions" style={{ justifyContent: 'center' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleViewHistory(c)} title="سجل التعاملات">
                        👁️
                      </button>
                      {Number(c.balance) > 0 && (
                        <button className="btn btn-emerald btn-sm" onClick={() => handleViewDebt(c.id)} title="تحصيل دفع">
                          💰
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(c)} title="تعديل">
                        ✏️
                      </button>
                      <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }} onClick={() => handleDelete(c.id)} title="حذف">
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {/* Modern Metro Modal */}
      {ReactDOM.createPortal(
      <div className={`modal-overlay ${showModal ? 'active' : ''}`}>
        <div className="modal">
          <div className="modal-header">
            <h3>{isEditing ? 'تعديل بيانات عميل' : 'إضافة عميل جديد'}</h3>
            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
          </div>
          <form onSubmit={handleSave}>
            <div className="modal-body">
              <div className="form-group">
                <label>اسم العميل *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="مثال: محمد علي"
                  value={currentCustomer.name}
                  onChange={e => setCurrentCustomer({ ...currentCustomer, name: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>رقم الهاتف</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="01xxxxxxxxx"
                    value={currentCustomer.phone}
                    onChange={e => setCurrentCustomer({ ...currentCustomer, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>البريد الإلكتروني</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="example@mail.com"
                    value={currentCustomer.email}
                    onChange={e => setCurrentCustomer({ ...currentCustomer, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>العنوان التفصيلي</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="المدينة، الشارع، رقم المبنى..."
                  value={currentCustomer.address}
                  onChange={e => setCurrentCustomer({ ...currentCustomer, address: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>إلغاء</button>
              <button type="submit" className="btn btn-primary">
                {isEditing ? 'تحديث البيانات' : 'حفظ العميل'}
              </button>
            </div>
          </form>
        </div>
      </div>,
      document.body
      )}

      {/* Customer Debt & Payment Modal */}
      {ReactDOM.createPortal(
        <div className={`modal-overlay ${showDebtModal ? 'active' : ''}`}>
        <div className="modal" style={{ maxWidth: '700px', width: '90%' }}>
          <div className="modal-header">
            <h3>كشف حساب ومديونية: <span style={{ fontWeight: 800 }}>{debtSummary?.customerName}</span></h3>
            <button className="modal-close" onClick={() => setShowDebtModal(false)}>✕</button>
          </div>
          <div className="modal-body">
            {debtSummary && (
              <>
                <div className="stats-grid mb-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <div className="stat-card amber" style={{ height: '90px', margin: 0, padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div className="stat-value" style={{ fontSize: '1.6rem', fontWeight: 800 }}>{Number(debtSummary.totalDebt).toFixed(2)}</div>
                    <div className="stat-label" style={{ fontSize: '0.75rem' }}>إجمالي المديونية</div>
                  </div>
                  <div className="stat-card blue" style={{ height: '90px', margin: 0, padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div className="stat-value" style={{ fontSize: '1.6rem' }}>{debtSummary.openInvoicesCount}</div>
                    <div className="stat-label" style={{ fontSize: '0.75rem' }}>عدد الفواتير</div>
                  </div>
                  <div className="stat-card emerald" style={{ height: '90px', margin: 0, padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div className="stat-value" style={{ fontSize: '1.6rem' }}>{Number(debtSummary.totalPaid).toFixed(2)}</div>
                    <div className="stat-label" style={{ fontSize: '0.75rem' }}>المسدد لليوم</div>
                  </div>
                </div>

                <h4 className="mb-2" style={{ borderBottom: '1px solid var(--border-main)', paddingBottom: '8px' }}>الفواتير المفتوحة</h4>
                <div className="table-wrapper mb-3" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>رقم الفاتورة</th>
                        <th>التاريخ</th>
                        <th style={{ textAlign: 'center' }}>الإجمالي</th>
                        <th style={{ textAlign: 'center' }}>المتبقي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {debtSummary.openInvoices.length === 0 ? (
                        <tr><td colSpan="4" className="text-center">لا توجد فواتير مفتوحة</td></tr>
                      ) : debtSummary.openInvoices.map(inv => (
                        <tr key={inv.id}>
                          <td>{inv.invoiceNumber}</td>
                          <td>{new Date(inv.invoiceDate).toLocaleDateString('ar-EG')}</td>
                          <td style={{ textAlign: 'center' }}>{Number(inv.totalAmount).toFixed(2)}</td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--accent-red)' }}>{Number(inv.remainingAmount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {Number(debtSummary.totalDebt) > 0 && (
                  <form onSubmit={handlePayment} style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px' }}>
                    <h4 className="mb-2">تسجيل تحصيل مبلغ من العميل</h4>
                    <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                      <div className="form-group">
                        <label>المبلغ المراد تحصيله *</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          required
                          max={debtSummary.totalDebt}
                          placeholder="0.00"
                          value={paymentAmount}
                          onChange={e => setPaymentAmount(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>ملاحظات</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="مثال: دفعة كاش، تحويل بنكي..."
                          value={paymentNotes}
                          onChange={e => setPaymentNotes(e.target.value)}
                        />
                      </div>
                    </div>
                    <button type="submit" className="btn btn-emerald w-100 mt-2" disabled={isSubmittingPayment}>
                      {isSubmittingPayment ? 'جاري الحفظ...' : 'تأكيد عملية التحصيل'}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>,
      document.body
      )}

      {/* Customer Full Transaction History Modal */}
      {ReactDOM.createPortal(
      <div className={`modal-overlay ${showHistoryModal ? 'active' : ''}`}>
        <div className="modal" style={{ maxWidth: '900px', width: '95%' }}>
          <div className="modal-header">
            <h3>سجل تعاملات العميل: <span style={{ fontWeight: 800 }}>{selectedHistoryCustomer?.name}</span></h3>
            <button className="modal-close" onClick={() => setShowHistoryModal(false)}>✕</button>
          </div>
          <div className="modal-body">
            {loadingHistory ? (
              <Loader message="جاري جلب سجل الفواتير..." />
            ) : (
              <>
                <div className="table-wrapper mb-3" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>رقم الفاتورة</th>
                        <th>التاريخ</th>
                        <th style={{ textAlign: 'center' }}>الإجمالي</th>
                        <th style={{ textAlign: 'center' }}>الحالة</th>
                        <th style={{ textAlign: 'center' }}>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyData.items.length === 0 ? (
                        <tr><td colSpan="5" className="text-center">لا توجد تعاملات سابقة لهذا العميل</td></tr>
                      ) : historyData.items.map(inv => (
                        <tr key={inv.id}>
                          <td><strong>{inv.invoiceNumber}</strong></td>
                          <td style={{ fontSize: '0.85rem' }}>{new Date(inv.invoiceDate).toLocaleString('ar-EG')}</td>
                          <td style={{ textAlign: 'center' }}>{Number(inv.totalAmount).toFixed(2)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${
                              inv.status === 'PAID' ? 'badge-success' : 
                              inv.status === 'PARTIAL' ? 'badge-info' : 
                              'badge-danger'
                            }`}>
                              {inv.status === 'PAID' ? 'تم الدفع' : inv.status === 'PARTIAL' ? 'جزئي' : 'آجل'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                             <button className="btn btn-ghost btn-sm" onClick={() => openInvoiceDetails(inv)}>
                               تفاصيل 📄
                             </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {historyData.totalPages > 1 && (
                  <div className="pagination">
                    <button 
                      className="btn btn-ghost btn-sm" 
                      disabled={historyData.page === 0}
                      onClick={() => handleViewHistory(selectedHistoryCustomer, historyData.page - 1)}
                    >السابق</button>
                    <span>صفحة {historyData.page + 1} من {historyData.totalPages}</span>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      disabled={historyData.page >= historyData.totalPages - 1}
                      onClick={() => handleViewHistory(selectedHistoryCustomer, historyData.page + 1)}
                    >التالي</button>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setShowHistoryModal(false)}>إغلاق</button>
          </div>
        </div>
      </div>,
      document.body
      )}

      {/* Quick Invoice Details View (Inside History) */}
      {ReactDOM.createPortal(
      <div className={`modal-overlay ${showInvoiceDetails ? 'active' : ''}`} style={{ zIndex: 1100 }}>
        <div className="modal" style={{ maxWidth: '600px' }}>
          <div className="modal-header">
            <h3>تفاصيل فاتورة: {activeInvoice?.invoiceNumber}</h3>
            <button className="modal-close" onClick={() => setShowInvoiceDetails(false)}>✕</button>
          </div>
          <div className="modal-body">
            {activeInvoice && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <span><strong>التاريخ:</strong> {new Date(activeInvoice.invoiceDate).toLocaleDateString('ar-EG')}</span>
                  <span><strong>الحالة:</strong> {activeInvoice.status}</span>
                </div>
                <div className="table-wrapper" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>الصنف</th>
                        <th>الكمية</th>
                        <th>السعر</th>
                        <th>الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeInvoice.items?.map(item => (
                        <tr key={item.id}>
                          <td>{item.productName}</td>
                          <td>{item.quantity} {item.unitName}</td>
                          <td>{Number(item.unitPrice).toFixed(2)}</td>
                          <td>{Number(item.totalPrice).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3" style={{ textAlign: 'left', fontSize: '1.2rem', fontWeight: 'bold' }}>
                  الإجمالي النهائي: {Number(activeInvoice.totalAmount).toFixed(2)} ج.م
                </div>
              </>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setShowInvoiceDetails(false)}>عودة للسجل</button>
          </div>
        </div>
      </div>,
      document.body
      )}
    </div>
  );
};

export default Customers;
