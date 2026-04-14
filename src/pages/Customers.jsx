import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import StatTile from '../components/common/StatTile';

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
  const [historyTab, setHistoryTab] = useState('pos'); // 'pos' or 'online'
  const [historyData, setHistoryData] = useState({ items: [], totalPages: 0, totalElements: 0, page: 0 });
  const [onlineData, setOnlineData] = useState({ items: [], totalPages: 0, totalElements: 0, page: 0 });
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoryCustomer, setSelectedHistoryCustomer] = useState(null);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);

  useEffect(() => {
    loadCustomers(currentPage, pageSize, query);
  }, [currentPage]);

  const loadCustomers = async (page = 0, size = 10, searchQuery = query) => {
    setLoading(true);
    try {
      const res = await Api.getCustomers(page, size, searchQuery);
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
    <>
      <div className="page-section">
        
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          <StatTile
            id="cust_total"
            label="إجمالي العملاء"
            value={totalElements}
            icon="👥"
            defaults={{ color: 'blue', size: 'tile-wd-sm', order: 1 }}
          />
          <StatTile
            id="cust_active"
            label="نشط بالمزامنة"
            value={customers.length}
            icon="✅"
            defaults={{ color: 'emerald', size: 'tile-sq-sm', order: 2 }}
          />
          <StatTile
            id="cust_recent"
            label="انضموا مؤخراً"
            value="0"
            icon="🕒"
            defaults={{ color: 'amber', size: 'tile-sq-sm', order: 3 }}
          />
        </div>

        <div className="card">
          <div className="card-header">
            <h3>👥 إدارة العملاء</h3>
            <div className="toolbar">
              <div className="search-input">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="بحث سريع..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setCurrentPage(0);
                    loadCustomers(0, pageSize, e.target.value);
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {Api.can('CUSTOMER_WRITE') !== false && (
                  <button className="btn btn-primary" onClick={openAddModal}>
                    <span>+</span> عميل جديد
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="card-body no-padding">
            <div className="table-wrapper">
              {loading ? (
                <Loader message="جاري جلب البيانات..." />
              ) : customers.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">👥</div>
                  <h4>لا يوجد عملاء</h4>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="hide-mobile">#</th>
                      <th>الاسم</th>
                      <th>الهاتف</th>
                      <th className="hide-tablet">البريد</th>
                      <th className="hide-tablet">العنوان</th>
                      <th style={{ textAlign: 'center' }}>الرصيد</th>
                      <th style={{ textAlign: 'center' }}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c, idx) => (
                      <tr key={c.id}>
                        <td className="hide-mobile" style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                          {(currentPage * pageSize) + idx + 1}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{c.name}</div>
                        </td>
                        <td>{c.phone || '—'}</td>
                        <td className="hide-tablet" style={{ fontSize: '0.85rem' }}>{c.email || '—'}</td>
                        <td className="hide-tablet" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{c.address || '—'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={c.balance > 0 ? 'text-danger' : 'text-success'} style={{ fontWeight: 700 }}>
                            {Number(c.balance).toFixed(2)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="table-actions" style={{ justifyContent: 'center' }}>
                            <button className="btn btn-icon btn-ghost" onClick={() => handleViewHistory(c)} title="سجل التعاملات">👁️</button>
                            {Number(c.balance) > 0 && (
                              <button className="btn btn-icon btn-ghost" style={{ color: 'var(--metro-green)' }} onClick={() => handleViewDebt(c.id)} title="تحصيل دفع">💰</button>
                            )}
                            <button className="btn btn-icon btn-ghost" onClick={() => openEditModal(c)} title="تعديل">✏️</button>
                            <button className="btn btn-icon btn-ghost" style={{ color: 'var(--metro-red)' }} onClick={() => handleDelete(c.id)} title="حذف">🗑</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >السابق</button>
                <button className="active">{currentPage + 1}</button>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >التالي</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- Modals --- */}
      {showModal && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setShowModal(false); }}>
            <div className="modal" style={{ maxWidth: '600px' }}>
              <div className="modal-header">
                <h3>{isEditing ? 'تعديل بيانات عميل' : 'إضافة عميل جديد'}</h3>
                <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>اسم العميل *</label>
                    <input type="text" className="form-control" required value={currentCustomer.name} onChange={e => setCurrentCustomer({ ...currentCustomer, name: e.target.value })} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>رقم الهاتف</label>
                      <input type="text" className="form-control" value={currentCustomer.phone} onChange={e => setCurrentCustomer({ ...currentCustomer, phone: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>البريد الإلكتروني</label>
                      <input type="email" className="form-control" value={currentCustomer.email} onChange={e => setCurrentCustomer({ ...currentCustomer, email: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>العنوان التفصيلي</label>
                    <textarea className="form-control" rows="2" value={currentCustomer.address} onChange={e => setCurrentCustomer({ ...currentCustomer, address: e.target.value })} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>إلغاء</button>
                  <button type="submit" className="btn btn-primary">{isEditing ? 'تحديث' : 'إضافة'}</button>
                </div>
              </form>
            </div>
          </div>
        </ModalContainer>
      )}

      {showDebtModal && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setShowDebtModal(false); }}>
            <div className="modal" style={{ maxWidth: '700px' }}>
              <div className="modal-header">
                <h3>كشف حساب: {debtSummary?.customerName}</h3>
                <button className="modal-close" onClick={() => setShowDebtModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                {debtSummary && (
                  <>
                    <div className="stats-grid mb-3" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                      <div className="stat-card amber" style={{ margin: 0 }}>
                        <div className="stat-value">{Number(debtSummary.totalDebt).toFixed(2)}</div>
                        <div className="stat-label">المديونية الحالية</div>
                      </div>
                      <div className="stat-card blue" style={{ margin: 0 }}>
                        <div className="stat-value">{debtSummary.openInvoicesCount}</div>
                        <div className="stat-label">فواتير مفتوحة</div>
                      </div>
                    </div>
                    
                    <div className="table-wrapper mb-3" style={{ maxHeight: '200px' }}>
                      <table className="data-table">
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
                              <td style={{ color: 'var(--metro-red)', fontWeight: 700 }}>{Number(inv.remainingAmount).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <form onSubmit={handlePayment} style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '8px' }}>
                      <div className="form-group">
                        <label>المبلغ المحصل</label>
                        <input type="number" step="0.01" className="form-control" required max={debtSummary.totalDebt} value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
                      </div>
                      <button type="submit" className="btn btn-primary w-100" disabled={isSubmittingPayment}>{isSubmittingPayment ? 'جاري الحفظ...' : 'تأكيد التحصيل'}</button>
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
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setShowHistoryModal(false); }}>
            <div className="modal" style={{ maxWidth: '900px' }}>
              <div className="modal-header">
                <h3>السجل: {selectedHistoryCustomer?.name}</h3>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button className={`btn btn-sm ${historyTab === 'pos' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => handleViewHistory(selectedHistoryCustomer, 0, 'pos')}>كاشير</button>
                  <button className={`btn btn-sm ${historyTab === 'online' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => handleViewHistory(selectedHistoryCustomer, 0, 'online')}>أونلاين</button>
                </div>
                <button className="modal-close" onClick={() => setShowHistoryModal(false)}>✕</button>
              </div>
              <div className="modal-body" style={{ minHeight: '300px' }}>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>الرقم</th>
                        <th>التاريخ</th>
                        <th>الإجمالي</th>
                        <th className="hide-mobile">الإجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(historyTab === 'pos' ? historyData : onlineData).items.map(inv => (
                        <tr key={inv.id}>
                          <td>{inv.invoiceNumber || inv.orderNumber}</td>
                          <td style={{ fontSize: '0.8rem' }}>{new Date(inv.invoiceDate || inv.orderDate).toLocaleDateString('ar-EG')}</td>
                          <td style={{ fontWeight: 700 }}>{inv.totalAmount}</td>
                          <td className="hide-mobile">
                             <button className="btn btn-ghost btn-sm" onClick={() => openInvoiceDetails(inv)}>تفاصيل</button>
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
          <div className="modal-overlay active" style={{ zIndex: 1100 }} onClick={() => setShowInvoiceDetails(false)}>
            <div className="modal" style={{ maxWidth: '500px' }}>
              <div className="modal-header">
                <h3>تفاصيل: {activeInvoice?.invoiceNumber}</h3>
                <button className="modal-close" onClick={() => setShowInvoiceDetails(false)}>✕</button>
              </div>
              <div className="modal-body">
                <table className="data-table">
                  <thead>
                    <tr><th>الصنف</th><th>الكمية</th><th>السعر</th></tr>
                  </thead>
                  <tbody>
                    {activeInvoice?.items?.map(it => (
                      <tr key={it.id}><td>{it.productName}</td><td>{it.quantity}</td><td>{it.unitPrice}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

    </>
  );
};

export default Customers;
