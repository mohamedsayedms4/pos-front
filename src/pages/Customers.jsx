import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Api from '../services/api';
import CommunicationApi from '../services/CommunicationApi';
import { useGlobalUI } from '../components/common/GlobalUI';
import { useExport } from '../utils/useExport';
import ExportProgressModal from '../components/ExportProgressModal';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import StatTile from '../components/common/StatTile';

const Customers = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const isAdmin = Api.isAdminOrBranchManager();
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
  const { exportState, triggerExport, closeExportModal } = useExport();

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
        Api.getCustomersSummary(page, size, searchQuery, branchId),
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
    navigate('/customers/add');
  };

  const openEditModal = (customer) => {
    navigate(`/customers/edit/${customer.id}`);
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

  const handleSendDebtMessage = (customer) => {
    if (!customer.balance || Number(customer.balance) <= 0) {
      toast('العميل ليس عليه مديونية لإرسال تذكير', 'info');
      return;
    }
    confirm(`هل أنت متأكد من إرسال رسالة تذكير بالمديونية (${Number(customer.balance).toFixed(2)}) للعميل ${customer.name}؟`, async () => {
      try {
        const textContent = `عميلنا العزيز ${customer.name}،\n\nنود تذكيركم بلطف بمراجعة كشف حسابكم الأخير وتأكيد الرصيد المتبقي وقدره ${Number(customer.balance).toFixed(2)}.\n\nنسعد دائماً بخدمتكم وتلبية طلباتكم.\nشكراً لتعاونكم المستمر معنا.`;
        
        const textHtml = textContent.split('\n').filter(line => line.trim() !== '').map(line => `<p style="font-size: 16px; margin: 0 0 10px 0;">${line}</p>`).join('');
        const finalContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); direction: rtl; text-align: right;">
  <div style="background-color: #f59e0b; padding: 20px; text-align: center;">
    <h2 style="color: #ffffff; margin: 0; font-size: 24px;">تذكير بكشف الحساب </h2>
  </div>
  <div style="padding: 24px; background-color: #ffffff; color: #374151; line-height: 1.6;">
    ${textHtml}
  </div>
</div>`;

        await CommunicationApi.createCampaign({
           title: 'تذكير ودي بكشف الحساب ',
           content: finalContent,
           channel: 'EMAIL',
           targetAudience: 'SPECIFIC',
           specificRecipientIds: String(customer.id),
           specificRecipientType: 'CUSTOMER'
        });
        toast('تم إرسال رسالة التذكير بنجاح!', 'success');
      } catch (err) {
        toast(err.message || 'فشل إرسال الرسالة', 'error');
      }
    });
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

  const handleExportExcel = async () => {
    triggerExport('CUSTOMERS_EXCEL', {
      query: query,
      branchId: selectedBranchId
    });
  };

  const handleDownloadTemplate = async () => {
    try {
      await Api.downloadCustomersImportTemplate();
      toast('تم تحميل قالب الاستيراد بنجاح', 'success');
    } catch (err) {
      toast(err.message || 'حدث خطأ أثناء تحميل القالب', 'error');
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = null;
    setLoading(true);
    try {
      const res = await Api.importCustomersExcel(file, selectedBranchId);
      toast(res.data || 'تم الاستيراد بنجاح', 'success');
      loadCustomers(0, pageSize, query);
    } catch (err) {
      toast(err.message || 'حدث خطأ أثناء الاستيراد', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-section">
        
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          <StatTile
            id="cust_total"
            label="إجمالي العملاء"
            value={totalElements}
            icon={<i className="fa-solid fa-users"></i>}
            defaults={{ color: 'blue', size: 'tile-wd-sm', order: 1 }}
          />
          <StatTile
            id="cust_active"
            label="نشط بالمزامنة"
            value={customers.length}
            icon={<i className="fa-solid fa-check-circle"></i>}
            defaults={{ color: 'emerald', size: 'tile-sq-sm', order: 2 }}
          />
          <StatTile
            id="cust_recent"
            label="انضموا مؤخراً"
            value="0"
            icon={<i className="fa-solid fa-chart-simple"></i>}
            defaults={{ color: 'amber', size: 'tile-sq-sm', order: 3 }}
          />
        </div>

        <div className="card">
          <div className="card-header">
            <h3><i className="fa-solid fa-users"></i> إدارة العملاء</h3>
            <div className="toolbar">
              <div className="search-input">
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
                <span className="search-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
              </div>

              {isAdmin && (
                <select className="form-control" value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)} style={{ width: '180px', height: '40px', padding: '0 10px' }}>
                  <option value="">جميع الفروع</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              )}

              <div className="toolbar-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {Api.can('CUSTOMER_READ') && <button className="btn btn-secondary" onClick={handleExportExcel} disabled={exportState.isOpen} title="تصدير إلى إكسيل"><i className="fa-solid fa-chart-column"></i> إكسيل</button>}
                {Api.can('CUSTOMER_WRITE') !== false && (
                  <>
                    <input type="file" id="customerExcelInput" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImportExcel} />
                    <button className="btn btn-secondary" onClick={handleDownloadTemplate} title="تحميل قالب الاستيراد"><i className="fa-solid fa-file-lines"></i> قالب</button>
                    <button className="btn btn-secondary" onClick={() => document.getElementById('customerExcelInput').click()} title="استيراد من إكسيل"><i className="fa-solid fa-upload"></i> استيراد</button>
                    <button className="btn btn-primary" onClick={openAddModal}>
                      <span>+</span> عميل جديد
                    </button>
                  </>
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
                  <div className="empty-icon"><i className="fa-solid fa-users"></i></div>
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
                            <button className="btn btn-icon btn-ghost" onClick={() => navigate(`/customers/${c.id}`)} title="عرض التفاصيل"><i className="fa-solid fa-eye"></i>️</button>
                            {Number(c.balance) > 0 && Api.can('TREASURY_WRITE') && (
                              <>
                                <button className="btn btn-icon btn-ghost" style={{ color: '#f59e0b' }} onClick={() => handleSendDebtMessage(c)} title="إرسال رسالة تذكير"><i className="fa-solid fa-envelope"></i></button>
                                <button className="btn btn-icon btn-ghost" style={{ color: 'var(--metro-green)' }} onClick={() => handleViewDebt(c.id)} title="تحصيل دفع"><i className="fa-solid fa-sack-dollar"></i></button>
                              </>
                            )}
                            {Api.can('CUSTOMER_WRITE') && <button className="btn btn-icon btn-ghost" onClick={() => openEditModal(c)} title="تعديل"><i className="fa-solid fa-pencil"></i></button>}
                            {Api.can('CUSTOMER_DELETE') && <button className="btn btn-icon btn-ghost" style={{ color: 'var(--metro-red)' }} onClick={() => handleDelete(c.id)} title="حذف"><i className="fa-solid fa-trash"></i></button>}
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

      <ExportProgressModal exportState={exportState} onClose={closeExportModal} />

      {/* --- Modals --- */}

      {showDebtModal && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setShowDebtModal(false); }}>
            <div className="modal" style={{ maxWidth: '700px' }}>
              <div className="modal-header">
                <h3>كشف حساب: {debtSummary?.customerName}</h3>
                <button className="modal-close" onClick={() => setShowDebtModal(false)}><i className="fa-solid fa-times"></i></button>
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
                <button className="modal-close" onClick={() => setShowHistoryModal(false)}><i className="fa-solid fa-times"></i></button>
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
                <button className="modal-close" onClick={() => setShowInvoiceDetails(false)}><i className="fa-solid fa-times"></i></button>
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
