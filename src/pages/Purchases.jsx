import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import ModalContainer from '../components/common/ModalContainer';

const Purchases = () => {
  const { toast } = useGlobalUI();
  const { supplierName } = useParams();
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState(supplierName || '');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalType, setModalType] = useState(null); // 'form', 'payment', 'details'
  const [activePurchase, setActivePurchase] = useState(null);

  // Form State (New Invoice)
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [invoiceForm, setInvoiceForm] = useState({ supplierId: '', invoiceDate: new Date().toISOString().split('T')[0], paidAmount: 0 });
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [itemForm, setItemForm] = useState({ productId: '', quantity: 1, unitPrice: 0 });
  const [saving, setSaving] = useState(false);

  // Payment State
  const [paymentAmount, setPaymentAmount] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const purchasesData = await Api.getPurchases();
      setData(purchasesData);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (supplierName) {
      setSearchTerm(supplierName);
    }
  }, [supplierName]);

  const getFilteredData = () => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(p =>
      (p.invoiceNumber || '').toLowerCase().includes(term) ||
      (p.supplierName || '').toLowerCase().includes(term)
    );
  };

  const openForm = async () => {
    try {
      const [sups, prods] = await Promise.all([Api.getSuppliers(), Api.getProducts()]);
      setSuppliers(sups);
      setProducts(prods);
      setInvoiceForm({ supplierId: '', invoiceDate: new Date().toISOString().split('T')[0], paidAmount: 0 });
      setInvoiceItems([]);
      setItemForm({ productId: '', quantity: 1, unitPrice: 0 });
      setModalType('form');
    } catch (err) {
      toast('فشل في جلب البيانات الأساسية (الموردين/المنتجات)', 'error');
    }
  };

  const openPayment = (purchase) => {
    setActivePurchase(purchase);
    setPaymentAmount(purchase.remainingAmount);
    setModalType('payment');
  };

  const openDetails = (purchase) => {
    setActivePurchase(purchase);
    setModalType('details');
  };

  const closeModal = () => {
    setModalType(null);
    setActivePurchase(null);
  };

  const handleAddItem = () => {
    if (!itemForm.productId) {
      toast('يرجى اختيار المنتج', 'warning');
      return;
    }
    const qty = parseFloat(itemForm.quantity);
    const price = parseFloat(itemForm.unitPrice);

    if (isNaN(qty) || qty <= 0) { alert('الكمية غير صحيحة'); return; }
    if (isNaN(price) || price < 0) { alert('السعر غير صحيح'); return; }

    const product = products.find(p => p.id == itemForm.productId);
    
    setInvoiceItems([...invoiceItems, {
      productId: parseInt(itemForm.productId),
      name: product?.name,
      quantity: qty,
      unitPrice: price
    }]);

    setItemForm({ productId: '', quantity: 1, unitPrice: 0 });
  };

  const handleRemoveItem = (index) => {
    const newItems = [...invoiceItems];
    newItems.splice(index, 1);
    setInvoiceItems(newItems);
  };

  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    if (!invoiceForm.supplierId) { toast('يرجى اختيار المورد', 'warning'); return; }
    if (invoiceItems.length === 0) { toast('يجب إضافة منتج واحد على الأقل لفاتورة المشتريات', 'warning'); return; }

    setSaving(true);
    const dataToSend = {
      supplierId: parseInt(invoiceForm.supplierId),
      invoiceDate: new Date(invoiceForm.invoiceDate).toISOString(),
      paidAmount: parseFloat(invoiceForm.paidAmount) || 0,
      items: invoiceItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }))
    };

    try {
      await Api.createPurchase(dataToSend);
      toast('تم إضافة الفاتورة بنجاح', 'success');
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
    const remaining = Number(activePurchase.remainingAmount);

    if (!amount || amount <= 0 || amount > remaining) {
      toast('يرجى إدخال مبلغ صحيح لا يتجاوز المتبقي', 'warning');
      return;
    }

    setSaving(true);
    try {
      await Api.payPurchaseInvoice(activePurchase.id, amount);
      toast('تم تسجيل الدفعة بنجاح', 'success');
      closeModal();
      loadData();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const items = getFilteredData();

  return (
    <>
      <div className="page-section">
      <div className="card">
        <div className="card-header">
          <h3>🛒 إدارة المشتريات</h3>
          <div className="toolbar">
            <div className="search-input">
              <span className="search-icon">🔍</span>
              <input type="text" placeholder="بحث برقم الفاتورة أو المورد..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={openForm}>
              <span>+</span> إضافة فاتورة
            </button>
          </div>
        </div>
        <div className="card-body no-padding">
          <div className="table-wrapper">
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>جاري التحميل...</div>
            ) : items.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🛒</div>
                <h4>لا توجد فواتير مشتريات</h4>
                <p>قم بإضافة فواتير جديدة من الموردين</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>رقم الفاتورة</th>
                    <th>التاريخ</th>
                    <th>المورد</th>
                    <th>الإجمالي</th>
                    <th>المدفوع</th>
                    <th>المتبقي</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p, i) => (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td>
                        <code title="اضغط لعرض التفاصيل" style={{ background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', color: 'var(--metro-blue)' }} onClick={() => openDetails(p)}>
                          {p.invoiceNumber || '—'}
                        </code>
                      </td>
                      <td>{p.invoiceDate ? new Date(p.invoiceDate).toLocaleDateString('ar-EG') : '—'}</td>
                      <td style={{ fontWeight: 600, color: 'var(--metro-blue)' }}>{p.supplierName}</td>
                      <td style={{ fontWeight: 600 }}>{Number(p.totalAmount).toFixed(2)}</td>
                      <td style={{ color: 'var(--accent-emerald)' }}>{Number(p.paidAmount).toFixed(2)}</td>
                      <td style={{ color: 'var(--metro-red)' }}>{Number(p.remainingAmount).toFixed(2)}</td>
                      <td>
                        <span className={`badge ${p.status === 'PAID' ? 'badge-success' : p.status === 'PARTIAL' ? 'badge-warning' : 'badge-danger'}`}>
                          {p.status === 'PAID' ? 'مدفوعة' : p.status === 'PARTIAL' ? 'جزئي' : 'غير مدفوعة'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-icon btn-ghost" title="تفاصيل الفاتورة" onClick={() => openDetails(p)}>👁️</button>
                          {p.status !== 'PAID' && (
                            <button className="btn btn-icon btn-ghost" title="تسديد دفعة" onClick={() => openPayment(p)}>💰</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>

    {modalType === 'form' && (
      <ModalContainer>
        <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModal(); }}>
          <div className="modal" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3>إنشاء فاتورة مشتريات جديدة</h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              <form id="purchaseForm" onSubmit={handleSaveInvoice}>
                <div className="form-row">
                  <div className="form-group">
                    <label>المورد *</label>
                    <select className="form-control" name="supplierId" value={invoiceForm.supplierId} onChange={(e) => setInvoiceForm({...invoiceForm, supplierId: e.target.value})} required>
                      <option value="">-- اختر المورد --</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>تاريخ الفاتورة *</label>
                    <input className="form-control" type="date" name="invoiceDate" value={invoiceForm.invoiceDate} onChange={(e) => setInvoiceForm({...invoiceForm, invoiceDate: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>المبلغ المدفوع الان *</label>
                    <input className="form-control" type="number" step="0.01" name="paidAmount" value={invoiceForm.paidAmount} onChange={(e) => setInvoiceForm({...invoiceForm, paidAmount: e.target.value})} required />
                  </div>
                </div>

                <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                  <h4 style={{ marginBottom: '15px' }}>إضافة منتجات للفاتورة</h4>
                  <div className="form-row" style={{ alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ flex: 2 }}>
                      <label>المنتج</label>
                      <select className="form-control" id="piProduct" value={itemForm.productId} onChange={(e) => {
                        const val = e.target.value;
                        const prod = products.find(p => p.id == val);
                        setItemForm({...itemForm, productId: val, unitPrice: prod ? prod.purchasePrice || 0 : 0});
                      }}>
                        <option value="">-- اختر --</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} (المخزون: {p.stock})</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>الكمية</label>
                      <input className="form-control" type="number" step="0.01" id="piQty" value={itemForm.quantity} onChange={(e) => setItemForm({...itemForm, quantity: e.target.value})} />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>سعر الشراء</label>
                      <input className="form-control" type="number" step="0.01" id="piPrice" value={itemForm.unitPrice} onChange={(e) => setItemForm({...itemForm, unitPrice: e.target.value})} />
                    </div>
                    <div className="form-group" style={{ flex: 'auto' }}>
                      <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={handleAddItem}>إضافة</button>
                    </div>
                  </div>

                  <table className="data-table" style={{ marginTop: '15px' }}>
                    <thead>
                      <tr>
                        <th>المنتج</th>
                        <th>الكمية</th>
                        <th>سعر الوحدة</th>
                        <th>الإجمالي</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItems.length === 0 ? (
                        <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>لم يتم إضافة منتجات</td></tr>
                      ) : (
                        invoiceItems.map((item, index) => {
                          const st = item.quantity * item.unitPrice;
                          return (
                            <tr key={index}>
                              <td>{item.name}</td>
                              <td>{item.quantity}</td>
                              <td>{item.unitPrice.toFixed(2)}</td>
                              <td style={{ fontWeight: 'bold' }}>{st.toFixed(2)}</td>
                              <td>
                                <button type="button" className="btn btn-icon btn-ghost" style={{ color: 'var(--metro-red)' }} onClick={() => handleRemoveItem(index)}>✕</button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th colSpan="3" style={{ textAlign: 'left' }}>إجمالي الفاتورة:</th>
                        <th>{invoiceItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2)}</th>
                        <th></th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={closeModal}>إلغاء</button>
              <button type="submit" form="purchaseForm" className="btn btn-primary" disabled={saving}>
                {saving ? 'جاري الحفظ...' : 'حفظ الفاتورة'}
              </button>
            </div>
          </div>
        </div>
      </ModalContainer>
    )}

      {modalType === 'payment' && activePurchase && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModal(); }}>
            <div className="modal" style={{ maxWidth: '400px' }}>
              <div className="modal-header">
                <h3>سداد جزء من فاتورة: {activePurchase.invoiceNumber}</h3>
                <button className="modal-close" onClick={closeModal}>✕</button>
              </div>
              <div className="modal-body">
                <form id="purchasePaymentForm" onSubmit={handleSavePayment}>
                  <div className="form-group">
                    <label>المتبقي من الفاتورة</label>
                    <input className="form-control" type="text" value={Number(activePurchase.remainingAmount).toFixed(2)} disabled />
                  </div>
                  <div className="form-group">
                    <label>المبلغ المراد سداده *</label>
                    <input className="form-control" type="number" step="0.01" name="amount" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required max={activePurchase.remainingAmount} />
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>إلغاء</button>
                <button type="submit" form="purchasePaymentForm" className="btn btn-success" disabled={saving}>
                  {saving ? 'جاري الدفع...' : 'تأكيد الدفع'}
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {modalType === 'details' && activePurchase && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModal(); }}>
            <div className="modal" style={{ maxWidth: '600px' }}>
              <div className="modal-header">
                <h3>تفاصيل فاتورة المشتريات: {activePurchase.invoiceNumber}</h3>
                <button className="modal-close" onClick={closeModal}>✕</button>
              </div>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px', padding: '15px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                  <div><small>المورد:</small> <span style={{ fontWeight: 600 }}>{activePurchase.supplierName}</span></div>
                  <div><small>التاريخ:</small> <span style={{ fontWeight: 600 }}>{activePurchase.invoiceDate ? new Date(activePurchase.invoiceDate).toLocaleDateString('ar-EG') : '—'}</span></div>
                  <div><small>المبلغ المدفوع:</small> <span style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>{Number(activePurchase.paidAmount).toFixed(2)}</span></div>
                  <div><small>المبلغ المتبقي:</small> <span style={{ fontWeight: 600, color: 'var(--metro-red)' }}>{Number(activePurchase.remainingAmount).toFixed(2)}</span></div>
                </div>
                <div>
                  <h4 style={{ marginBottom: '10px' }}>قائمة المنتجات</h4>
                  {(!activePurchase.items || !activePurchase.items.length) ? (
                    <div className="empty-state" style={{ padding: '20px' }}>لا توجد منتجات في هذه الفاتورة</div>
                  ) : (
                    <table className="data-table" style={{ marginTop: '10px' }}>
                      <thead>
                        <tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>
                      </thead>
                      <tbody>
                        {activePurchase.items.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.productName}</td>
                            <td>{item.quantity}</td>
                            <td>{Number(item.unitPrice).toFixed(2)}</td>
                            <td style={{ fontWeight: 600 }}>{Number(item.totalPrice).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <th colSpan="3" style={{ textAlign: 'left' }}>الإجمالي النهائي:</th>
                          <th>{Number(activePurchase.totalAmount).toFixed(2)}</th>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>إغلاق</button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </>
  );
};

export default Purchases;
