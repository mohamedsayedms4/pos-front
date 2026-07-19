import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import StatTile from '../components/common/StatTile';
import ModalContainer from '../components/common/ModalContainer';
import { useBranch } from '../context/BranchContext';

const CustomerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useGlobalUI();
  const { selectedBranchId, branches } = useBranch();
  
  const [customer, setCustomer] = useState(null);
  const [debtSummary, setDebtSummary] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [onlineOrders, setOnlineOrders] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices', 'online', 'open'
  const [onlinePage, setOnlinePage] = useState(0);
  const [onlineTotalPages, setOnlineTotalPages] = useState(0);

  // Filters State
  const [filterBranchId, setFilterBranchId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');
  const [clientInvoicePage, setClientInvoicePage] = useState(0);
  
  // Payment Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const loadData = async (branchId) => {
    setLoading(true);
    try {
      const [profileData, debtData] = await Promise.all([
        Api.getCustomerDto(id, branchId),
        Api.getCustomerDebt(id, branchId).catch(() => null)
      ]);
      setCustomer(profileData);
      setDebtSummary(debtData);
      
      // Load first page of online orders
      await loadOnlineOrders(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) {
      navigate('/customers');
      return;
    }
    setFilterBranchId('');
  }, [id]);

  const loadInvoices = async (branchId) => {
    try {
      const res = await Api.getCustomerInvoices(id, 0, 200, branchId);
      setInvoices(res.items || res.content || []);
    } catch (err) {
      console.warn("Failed to load invoices", err);
    }
  };

  useEffect(() => {
    if (id) {
      loadData(filterBranchId);
      loadInvoices(filterBranchId);
    }
  }, [id, filterBranchId]);

  const loadOnlineOrders = async (page) => {
    try {
      const res = await Api.getCustomerOnlineOrders(id, page, 5);
      setOnlineOrders(res.items || res.content || []);
      setOnlineTotalPages(res.totalPages || 0);
      setOnlinePage(page);
    } catch (err) {
      console.warn("Failed to load online orders", err);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast('يرجى إدخال مبلغ صحيح', 'error');
      return;
    }
    setIsSubmittingPayment(true);
    try {
      const updatedSummary = await Api.collectCustomerPayment(id, {
        amount: Number(paymentAmount),
        notes: paymentNotes,
        branchId: selectedBranchId
      });
      setDebtSummary(updatedSummary);
      setPaymentAmount('');
      setPaymentNotes('');
      setShowPayModal(false);
      toast('تم تسجيل الدفعة بنجاح', 'success');
      // Reload profile to get updated balance
      const profileData = await Api.getCustomerDto(id, selectedBranchId);
      setCustomer(profileData);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Reset client page to 0 when filters change
  useEffect(() => {
    setClientInvoicePage(0);
  }, [filterBranchId, filterStartDate, filterEndDate, filterMinAmount, filterMaxAmount]);

  const filteredInvoices = invoices.filter(inv => {
    // 1. Filter by branch
    if (filterBranchId && String(inv.branchId) !== String(filterBranchId)) return false;
    
    // 2. Filter by date
    if (filterStartDate) {
      const invDate = new Date(inv.invoiceDate).setHours(0,0,0,0);
      const startDate = new Date(filterStartDate).setHours(0,0,0,0);
      if (invDate < startDate) return false;
    }
    if (filterEndDate) {
      const invDate = new Date(inv.invoiceDate).setHours(0,0,0,0);
      const endDate = new Date(filterEndDate).setHours(23,59,59,999);
      if (invDate > endDate) return false;
    }
    
    // 3. Filter by amount
    if (filterMinAmount && Number(inv.totalAmount) < Number(filterMinAmount)) return false;
    if (filterMaxAmount && Number(inv.totalAmount) > Number(filterMaxAmount)) return false;
    
    return true;
  });

  const itemsPerPage = 5;
  const totalFilteredPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    clientInvoicePage * itemsPerPage,
    (clientInvoicePage + 1) * itemsPerPage
  );

  const openInvoices = debtSummary?.openInvoices || [];
  const filteredOpenInvoices = openInvoices.filter(inv => {
    if (filterBranchId && String(inv.branchId) !== String(filterBranchId)) return false;
    if (filterStartDate) {
      const invDate = new Date(inv.invoiceDate).setHours(0,0,0,0);
      const startDate = new Date(filterStartDate).setHours(0,0,0,0);
      if (invDate < startDate) return false;
    }
    if (filterEndDate) {
      const invDate = new Date(inv.invoiceDate).setHours(0,0,0,0);
      const endDate = new Date(filterEndDate).setHours(23,59,59,999);
      if (invDate > endDate) return false;
    }
    if (filterMinAmount && Number(inv.totalAmount) < Number(filterMinAmount)) return false;
    if (filterMaxAmount && Number(inv.totalAmount) > Number(filterMaxAmount)) return false;
    return true;
  });

  if (loading) {
    return <Loader message="جاري تحميل تفاصيل العميل..." />;
  }

  if (error || !customer) {
    return (
      <div className="page-section empty-state">
        <div className="empty-icon"><i className="fa-solid fa-triangle-exclamation"></i></div>
        <h4>حدث خطأ</h4>
        <p>{error || 'لم يتم العثور على العميل'}</p>
        <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => navigate('/customers')}>العودة للعملاء</button>
      </div>
    );
  }

  const c = customer;

  return (
    <div className="page-section" style={{ direction: 'rtl' }}>
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header" style={{ justifyContent: 'flex-start', gap: '15px' }}>
          <button className="btn btn-ghost" style={{ padding: '4px 12px', gap: '6px' }} onClick={() => navigate('/customers')}>
            <span style={{ fontSize: '1.2rem' }}><i className="fa-solid fa-arrow-left"></i>️</span> جميع العملاء
          </button>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
               <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-full)', background: 'var(--gradient-azure)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: 'white', paddingTop: '2px' }}>
                 {(c.name || 'C').charAt(0)}
               </div>
               {c.name}
            </h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {c.phone ? ` ${c.phone}` : ''} {c.email ? ` ️ ${c.email}` : ''}
            </div>
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '24px' }}>
        <StatTile 
          id="c_balance"
          label="الرصيد / المديونية الحالية"
          value={Number(c.balance || 0).toFixed(2)}
          subtitle={c.balance > 0 ? "مديونية مستحقة" : "رصيد دائن"}
          icon={<i className="fa-solid fa-hand-holding-dollar"></i>}
          defaults={{ color: c.balance > 0 ? 'rose' : 'emerald', size: 'tile-wd-sm', order: 1 }}
        />
        <StatTile 
          id="c_open_invoices"
          label="الفواتير المفتوحة"
          value={debtSummary?.openInvoicesCount || 0}
          subtitle="غير مسددة بالكامل"
          icon={<i className="fa-solid fa-chart-simple"></i>}
          defaults={{ color: 'amber', size: 'tile-wd-sm', order: 2 }}
        />
      </div>

      <div className="details-grid" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
        {/* Profile Details Card */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div className="card-header">
            <h4><i className="fa-solid fa-clipboard-list"></i> معلومات الملف الشخصي</h4>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>الاسم بالكامل</label>
                <div style={{ fontWeight: 600 }}>{c.name}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>رقم الهاتف</label>
                <div>{c.phone || '—'}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>البريد الإلكتروني</label>
                <div style={{ wordBreak: 'break-all' }}>{c.email || '—'}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>العنوان</label>
                <div>{c.address || '—'}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>تاريخ الانضمام</label>
                <div>{c.createdAt ? new Date(c.createdAt).toLocaleDateString('ar-EG') : '—'}</div>
              </div>
              {c.balance > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                  <button className="btn btn-primary w-100" onClick={() => { setPaymentAmount(c.balance); setShowPayModal(true); }}>
                    <i className="fa-solid fa-sack-dollar"></i> تحصيل مديونية
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabbed Content */}
        <div className="card">
          <div className="card-header" style={{ padding: '0 15px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="modal-tabs" style={{ display: 'flex', gap: '15px' }}>
              <button className={`tab-btn ${activeTab === 'invoices' ? 'active' : ''}`} onClick={() => setActiveTab('invoices')} style={{ background: 'none', border: 'none', padding: '15px 5px', cursor: 'pointer', color: activeTab === 'invoices' ? 'var(--metro-blue)' : 'var(--text-muted)', borderBottom: activeTab === 'invoices' ? '2px solid var(--metro-blue)' : 'none', fontWeight: activeTab === 'invoices' ? 'bold' : 'normal' }}>
                <i className="fa-solid fa-file-lines"></i> فواتير الكاشير
              </button>
              <button className={`tab-btn ${activeTab === 'online' ? 'active' : ''}`} onClick={() => setActiveTab('online')} style={{ background: 'none', border: 'none', padding: '15px 5px', cursor: 'pointer', color: activeTab === 'online' ? 'var(--metro-blue)' : 'var(--text-muted)', borderBottom: activeTab === 'online' ? '2px solid var(--metro-blue)' : 'none', fontWeight: activeTab === 'online' ? 'bold' : 'normal' }}>
                <i className="fa-solid fa-globe"></i> طلبات أونلاين
              </button>
              <button className={`tab-btn ${activeTab === 'open' ? 'active' : ''}`} onClick={() => setActiveTab('open')} style={{ background: 'none', border: 'none', padding: '15px 5px', cursor: 'pointer', color: activeTab === 'open' ? 'var(--metro-blue)' : 'var(--text-muted)', borderBottom: activeTab === 'open' ? '2px solid var(--metro-blue)' : 'none', fontWeight: activeTab === 'open' ? 'bold' : 'normal' }}>
                <i className="fa-solid fa-triangle-exclamation"></i> فواتير معلقة الدفع
              </button>
            </div>
          </div>
          
          <div className="card-body no-padding" style={{ minHeight: '250px' }}>
            {/* Filter Bar (Only for POS Invoices or Open/Unpaid Invoices) */}
            {(activeTab === 'invoices' || activeTab === 'open') && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', padding: '15px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                {/* Branch Filter */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}><i className="fa-solid fa-building"></i> الفرع</label>
                  <select className="form-control" style={{ height: '36px', padding: '4px 10px', fontSize: '0.85rem' }} value={filterBranchId} onChange={e => setFilterBranchId(e.target.value)}>
                    <option value="">كل الفروع</option>
                    {branches && branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                
                {/* Start Date */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}><i className="fa-solid fa-calendar-days"></i> من تاريخ</label>
                  <input type="date" className="form-control" style={{ height: '36px', padding: '4px 10px', fontSize: '0.85rem' }} value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
                </div>

                {/* End Date */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}><i className="fa-solid fa-calendar-days"></i> إلى تاريخ</label>
                  <input type="date" className="form-control" style={{ height: '36px', padding: '4px 10px', fontSize: '0.85rem' }} value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
                </div>

                {/* Min Amount */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}><i className="fa-solid fa-sack-dollar"></i> الحد الأدنى</label>
                  <input type="number" step="0.01" className="form-control" placeholder="0.00" style={{ height: '36px', padding: '4px 10px', fontSize: '0.85rem' }} value={filterMinAmount} onChange={e => setFilterMinAmount(e.target.value)} />
                </div>

                {/* Max Amount */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}><i className="fa-solid fa-sack-dollar"></i> الحد الأقصى</label>
                  <input type="number" step="0.01" className="form-control" placeholder="0.00" style={{ height: '36px', padding: '4px 10px', fontSize: '0.85rem' }} value={filterMaxAmount} onChange={e => setFilterMaxAmount(e.target.value)} />
                </div>

                {/* Reset Button */}
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button className="btn btn-ghost" style={{ height: '36px', width: '100%', fontSize: '0.85rem', padding: 0 }} onClick={() => {
                    setFilterBranchId('');
                    setFilterStartDate('');
                    setFilterEndDate('');
                    setFilterMinAmount('');
                    setFilterMaxAmount('');
                  }}>
                    <i className="fa-solid fa-broom"></i> مسح الفلاتر
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'invoices' && (
              <>
                <div className="table-wrapper">
                  {filteredInvoices.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px 20px' }}>لا توجد فواتير كاشير مطابقة للبحث</div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>رقم الفاتورة</th>
                          <th>التاريخ</th>
                          <th><i className="fa-solid fa-building"></i> الفرع</th>
                          <th>الإجمالي</th>
                          <th>المدفوع</th>
                          <th>المتبقي</th>
                          <th>الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedInvoices.map(inv => (
                          <tr key={inv.id}>
                            <td>
                              <Link to={`/sales/view/${inv.id}`} style={{ textDecoration: 'none' }}>
                                <code style={{ background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '4px', color: 'var(--metro-blue)', cursor: 'pointer' }}>
                                  {inv.invoiceNumber}
                                </code>
                              </Link>
                            </td>
                            <td>{new Date(inv.invoiceDate).toLocaleDateString('ar-EG')}</td>
                            <td><span style={{ fontWeight: 500 }}>{inv.branchName || 'الفرع الرئيسي'}</span></td>
                            <td style={{ fontWeight: 600 }}>{Number(inv.totalAmount).toFixed(2)}</td>
                            <td style={{ color: 'var(--accent-emerald)' }}>{Number(inv.paidAmount).toFixed(2)}</td>
                            <td style={{ color: 'var(--metro-red)' }}>{Number(inv.remainingAmount).toFixed(2)}</td>
                            <td>
                              <span className={`badge ${inv.status === 'PAID' ? 'badge-success' : inv.status === 'PARTIAL' ? 'badge-warning' : 'badge-danger'}`}>
                                {inv.status === 'PAID' ? 'مدفوعة' : inv.status === 'PARTIAL' ? 'جزئي' : 'غير مدفوعة'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                {totalFilteredPages > 1 && (
                  <div className="pagination" style={{ padding: '15px' }}>
                    <button className="btn btn-ghost btn-sm" disabled={clientInvoicePage === 0} onClick={() => setClientInvoicePage(clientInvoicePage - 1)}>السابق</button>
                    <button className="active">{clientInvoicePage + 1}</button>
                    <button className="btn btn-ghost btn-sm" disabled={clientInvoicePage >= totalFilteredPages - 1} onClick={() => setClientInvoicePage(clientInvoicePage + 1)}>التالي</button>
                  </div>
                )}
              </>
            )}

            {activeTab === 'online' && (
              <>
                <div className="table-wrapper">
                  {onlineOrders.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px 20px' }}>لا توجد طلبات أونلاين مسجلة</div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr><th>رقم الطلب</th><th>التاريخ</th><th>الإجمالي</th><th>الحالة</th></tr>
                      </thead>
                      <tbody>
                        {onlineOrders.map(order => (
                          <tr key={order.id}>
                            <td><code style={{ background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '4px' }}>{order.orderNumber}</code></td>
                            <td>{new Date(order.orderDate).toLocaleDateString('ar-EG')}</td>
                            <td style={{ fontWeight: 600 }}>{Number(order.totalAmount).toFixed(2)}</td>
                            <td>
                              <span className={`badge ${order.status === 'DELIVERED' ? 'badge-success' : 'badge-warning'}`}>
                                {order.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                {onlineTotalPages > 1 && (
                  <div className="pagination" style={{ padding: '15px' }}>
                    <button className="btn btn-ghost btn-sm" disabled={onlinePage === 0} onClick={() => loadOnlineOrders(onlinePage - 1)}>السابق</button>
                    <button className="active">{onlinePage + 1}</button>
                    <button className="btn btn-ghost btn-sm" disabled={onlinePage >= onlineTotalPages - 1} onClick={() => loadOnlineOrders(onlinePage + 1)}>التالي</button>
                  </div>
                )}
              </>
            )}

            {activeTab === 'open' && (
              <div className="table-wrapper">
                {filteredOpenInvoices.length === 0 ? (
                  <div className="empty-state" style={{ padding: '40px 20px' }}>لا توجد فواتير مفتوحة مطابقة للبحث</div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>رقم الفاتورة</th>
                        <th>التاريخ</th>
                        <th><i className="fa-solid fa-building"></i> الفرع</th>
                        <th>إجمالي الفاتورة</th>
                        <th>المتبقي (المديونية)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOpenInvoices.map(inv => (
                        <tr key={inv.id}>
                          <td>
                            <Link to={`/sales/view/${inv.id}`} style={{ textDecoration: 'none' }}>
                              <code style={{ background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '4px', color: 'var(--metro-blue)', cursor: 'pointer' }}>
                                {inv.invoiceNumber}
                              </code>
                            </Link>
                          </td>
                          <td>{new Date(inv.invoiceDate).toLocaleDateString('ar-EG')}</td>
                          <td><span style={{ fontWeight: 500 }}>{inv.branchName || 'الفرع الرئيسي'}</span></td>
                          <td>{Number(inv.totalAmount).toFixed(2)}</td>
                          <td style={{ color: 'var(--metro-red)', fontWeight: 700 }}>{Number(inv.remainingAmount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showPayModal && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setShowPayModal(false); }}>
            <div className="modal" style={{ maxWidth: '500px' }}>
              <div className="modal-header">
                <h3>تحصيل دفعة مديونية</h3>
                <button className="modal-close" onClick={() => setShowPayModal(false)}><i className="fa-solid fa-times"></i></button>
              </div>
              <form onSubmit={handlePaymentSubmit}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>المبلغ المحصل *</label>
                    <input type="number" step="0.01" className="form-control" required max={c.balance} value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>ملاحظات</label>
                    <input type="text" className="form-control" value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} placeholder="مثال: سداد نقدي من العميل" />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowPayModal(false)}>إلغاء</button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmittingPayment}>{isSubmittingPayment ? 'جاري الحفظ...' : 'تأكيد التحصيل'}</button>
                </div>
              </form>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default CustomerDetails;
