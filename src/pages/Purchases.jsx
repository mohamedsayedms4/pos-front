import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import ModalContainer from '../components/common/ModalContainer';
import Loader from '../components/common/Loader';

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
  const [invoiceForm, setInvoiceForm] = useState({
    supplierId: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    paidAmount: 0
  });
  const [invoiceItems, setInvoiceItems] = useState([]);

  // Item form — includes unit selection
  const [itemForm, setItemForm] = useState({
    productId: '',
    unitId: '',       // '' = base unit
    quantity: 1,
    unitPrice: 0
  });
  const [availableUnits, setAvailableUnits] = useState([]); // units of selected product
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [saving, setSaving] = useState(false);

  // Payment State
  const [paymentAmount, setPaymentAmount] = useState('');

  // ─── Data Loading ─────────────────────────────────────────────────────────
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
    if (supplierName) setSearchTerm(supplierName);
  }, [supplierName]);

  const getFilteredData = () => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(p =>
      (p.invoiceNumber || '').toLowerCase().includes(term) ||
      (p.supplierName || '').toLowerCase().includes(term)
    );
  };

  // ─── Form Open ────────────────────────────────────────────────────────────
  const openForm = async () => {
    try {
      const [sups, prods] = await Promise.all([Api.getSuppliers(), Api.getProducts()]);
      setSuppliers(sups);
      setProducts(prods);
      setInvoiceForm({ supplierId: '', invoiceDate: new Date().toISOString().split('T')[0], paidAmount: 0 });
      setInvoiceItems([]);
      setItemForm({ productId: '', unitId: '', quantity: 1, unitPrice: 0 });
      setAvailableUnits([]);
      setModalType('form');
    } catch (err) {
      toast('فشل في جلب البيانات الأساسية', 'error');
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

  // ─── Product Selection → load units ───────────────────────────────────────
  const handleProductChange = async (productId) => {
    const prod = products.find(p => p.id == productId);
    if (!productId || !prod) {
      setItemForm({ productId: '', unitId: '', quantity: 1, unitPrice: 0 });
      setAvailableUnits([]);
      return;
    }

    setItemForm(prev => ({ ...prev, productId, unitId: '', unitPrice: prod.purchasePrice || 0 }));

    // Fetch units for this product
    setLoadingUnits(true);
    try {
      const units = await Api.getProductUnits(productId);
      setAvailableUnits(units || []);

      // Auto-select default purchase unit
      const defaultUnit = units?.find(u => u.isDefaultPurchase);
      if (defaultUnit) {
        setItemForm(prev => ({
          ...prev,
          productId,
          unitId: defaultUnit.id,
          unitPrice: defaultUnit.purchasePrice || prod.purchasePrice || 0
        }));
      }
    } catch {
      setAvailableUnits([]);
    } finally {
      setLoadingUnits(false);
    }
  };

  // ─── Unit Selection → update price ────────────────────────────────────────
  const handleUnitChange = (unitId) => {
    if (!unitId) {
      // Base unit selected
      const prod = products.find(p => p.id == itemForm.productId);
      setItemForm(prev => ({ ...prev, unitId: '', unitPrice: prod?.purchasePrice || 0 }));
      return;
    }
    const unit = availableUnits.find(u => u.id == unitId);
    setItemForm(prev => ({
      ...prev,
      unitId,
      unitPrice: unit?.purchasePrice || prev.unitPrice
    }));
  };

  // ─── Add Item to Invoice ───────────────────────────────────────────────────
  const handleAddItem = () => {
    if (!itemForm.productId) { toast('يرجى اختيار المنتج', 'warning'); return; }
    const qty = parseFloat(itemForm.quantity);
    const price = parseFloat(itemForm.unitPrice);
    if (isNaN(qty) || qty <= 0) { toast('الكمية غير صحيحة', 'warning'); return; }
    if (isNaN(price) || price < 0) { toast('السعر غير صحيح', 'warning'); return; }

    const product = products.find(p => p.id == itemForm.productId);
    const unit = availableUnits.find(u => u.id == itemForm.unitId);
    const factor = unit ? parseFloat(unit.conversionFactor) : 1;
    const qtyInBase = qty * factor;

    const unitLabel = unit
      ? `${unit.unitName} (تحتوي على ${unit.conversionFactor} ${product?.unitName || 'قطعة'})`
      : (product?.unitName || 'الوحدة الأساسية');

    setInvoiceItems(prev => [...prev, {
      productId: parseInt(itemForm.productId),
      unitId: itemForm.unitId ? parseInt(itemForm.unitId) : null,
      name: product?.name,
      unitLabel,
      unitName: product?.unitName || 'قطعة',
      packagingDesc: unit ? `1 ${unit.unitName} = ${unit.conversionFactor} ${product?.unitName || 'قطعة'}` : 'قطاعي',
      quantity: qty,
      factor,
      qtyInBase,
      unitPrice: price,
      totalPrice: qtyInBase * price
    }]);

    // Reset item form but keep product for quick multi-unit entry
    setItemForm(prev => ({ ...prev, quantity: 1 }));
  };

  const handleRemoveItem = (index) => {
    setInvoiceItems(prev => prev.filter((_, i) => i !== index));
  };

  // ─── Save Invoice ──────────────────────────────────────────────────────────
  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    if (!invoiceForm.supplierId) { toast('يرجى اختيار المورد', 'warning'); return; }
    if (invoiceItems.length === 0) { toast('يجب إضافة منتج واحد على الأقل', 'warning'); return; }

    setSaving(true);
    const payload = {
      supplierId: parseInt(invoiceForm.supplierId),
      invoiceDate: new Date(invoiceForm.invoiceDate).toISOString(),
      paidAmount: parseFloat(invoiceForm.paidAmount) || 0,
      items: invoiceItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitId: item.unitId || null
      }))
    };

    try {
      await Api.createPurchase(payload);
      toast('تم إضافة الفاتورة بنجاح', 'success');
      closeModal();
      loadData();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Save Payment ──────────────────────────────────────────────────────────
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

  const invoiceTotal = invoiceItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const items = getFilteredData();

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="page-section">
        <div className="card">
          <div className="card-header">
            <h3>🛒 إدارة المشتريات</h3>
            <div className="toolbar">
              <div className="search-input">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="بحث برقم الفاتورة أو المورد..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" onClick={openForm}>
                <span>+</span> إضافة فاتورة
              </button>
            </div>
          </div>
          <div className="card-body no-padding">
            <div className="table-wrapper">
              {loading ? (
                <Loader message="جاري تحميل فواتير المشتريات..." />
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
                          <code
                            title="اضغط لعرض التفاصيل"
                            style={{ background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', color: 'var(--metro-blue)' }}
                            onClick={() => openDetails(p)}
                          >
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

      {/* ═══ Modal: New Invoice ═══════════════════════════════════════════════ */}
      {modalType === 'form' && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModal(); }}>
            <div className="modal" style={{ maxWidth: '860px' }}>
              <div className="modal-header">
                <h3>إنشاء فاتورة مشتريات جديدة</h3>
                <button className="modal-close" onClick={closeModal}>✕</button>
              </div>
              <div className="modal-body">
                <form id="purchaseForm" onSubmit={handleSaveInvoice}>

                  {/* Header fields */}
                  <div className="form-row">
                    <div className="form-group">
                      <label>المورد *</label>
                      <select
                        className="form-control"
                        value={invoiceForm.supplierId}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, supplierId: e.target.value })}
                        required
                      >
                        <option value="">-- اختر المورد --</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>تاريخ الفاتورة *</label>
                      <input
                        className="form-control"
                        type="date"
                        value={invoiceForm.invoiceDate}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>المبلغ المدفوع الآن</label>
                      <input
                        className="form-control"
                        type="number"
                        step="0.01"
                        min="0"
                        value={invoiceForm.paidAmount}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, paidAmount: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Items section */}
                  <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    <h4 style={{ marginBottom: '15px' }}>📦 إضافة منتجات للفاتورة</h4>

                    {/* Item add row */}
                    <div className="form-row" style={{ alignItems: 'flex-end', gap: '10px' }}>

                      {/* Product */}
                      <div className="form-group" style={{ flex: 2 }}>
                        <label>المنتج</label>
                        <select
                          className="form-control"
                          value={itemForm.productId}
                          onChange={(e) => handleProductChange(e.target.value)}
                        >
                          <option value="">-- اختر --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} (مخزون: {p.stock} {p.unitName})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Unit */}
                      <div className="form-group" style={{ flex: 1.5 }}>
                        <label>وحدة الاستلام</label>
                        <select
                          className="form-control"
                          value={itemForm.unitId}
                          onChange={(e) => handleUnitChange(e.target.value)}
                          disabled={!itemForm.productId || loadingUnits}
                        >
                          {/* Base unit option */}
                          {itemForm.productId && (() => {
                            const prod = products.find(p => p.id == itemForm.productId);
                            return <option value="">{prod?.unitName || 'الوحدة الأساسية'} (مفردة/قطاعي)</option>;
                          })()}
                          {availableUnits.map(u => {
                            const prod = products.find(p => p.id == itemForm.productId);
                            return (
                              <option key={u.id} value={u.id}>
                                {u.unitName} (تحتوي على {u.conversionFactor} {prod?.unitName || 'قطعة'})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="form-group" style={{ flex: 0.8 }}>
                        <label>الكمية</label>
                        <input
                          className="form-control"
                          type="number"
                          step="0.001"
                          min="0.001"
                          value={itemForm.quantity}
                          onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                        />
                      </div>

                      {/* Price */}
                      <div className="form-group" style={{ flex: 1.2 }}>
                        <label>سعر القطعة *</label>
                        <input
                          className="form-control"
                          type="number"
                          step="0.01"
                          min="0"
                          value={itemForm.unitPrice}
                          onChange={(e) => setItemForm({ ...itemForm, unitPrice: e.target.value })}
                        />
                        <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>سعر الوحدة الأساسية</small>
                      </div>

                      <div className="form-group" style={{ flex: 'none' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleAddItem}
                          style={{ marginTop: '22px' }}
                        >
                          + إضافة
                        </button>
                      </div>
                    </div>

                    {/* Unit preview hint */}
                    {itemForm.productId && itemForm.unitId && (() => {
                      const unit = availableUnits.find(u => u.id == itemForm.unitId);
                      const prod = products.find(p => p.id == itemForm.productId);
                      if (!unit) return null;
                      const qty = parseFloat(itemForm.quantity) || 0;
                      const inBase = qty * parseFloat(unit.conversionFactor);
                      return (
                        <div style={{
                          background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                          borderRadius: '6px', padding: '12px 14px', marginBottom: '12px',
                          fontSize: '0.9rem', color: 'var(--metro-blue)', fontWeight: 500
                        }}>
                          📦 استلام: {qty} {unit.unitName} (كل {unit.unitName} فيها {unit.conversionFactor} {prod?.unitName || 'قطعة'})
                          <br/>
                          📉 سيتم إضافة <strong>{inBase.toFixed(3)} {prod?.unitName || 'وحدة'}</strong> للمخزون
                        </div>
                      );
                    })()}

                    {/* Items table */}
                    <table className="data-table" style={{ marginTop: '10px' }}>
                      <thead>
                        <tr>
                          <th>المنتج</th>
                          <th>الوحدة</th>
                          <th>الكمية</th>
                          <th>= عدد القطع</th>
                          <th>سعر القطعة</th>
                          <th>الإجمالي</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceItems.length === 0 ? (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                              لم يتم إضافة منتجات بعد
                            </td>
                          </tr>
                        ) : (
                          invoiceItems.map((item, index) => (
                            <tr key={index}>
                              <td style={{ fontWeight: 600 }}>{item.name}</td>
                              <td>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.unitLabel}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.packagingDesc}</div>
                              </td>
                              <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                              <td style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>
                                {item.qtyInBase.toFixed(2)} {item.unitName}
                              </td>
                              <td>{Number(item.unitPrice).toFixed(2)}</td>
                              <td style={{ fontWeight: 700 }}>
                                {(item.totalPrice).toFixed(2)}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-icon btn-ghost"
                                  style={{ color: 'var(--metro-red)' }}
                                  onClick={() => handleRemoveItem(index)}
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      {invoiceItems.length > 0 && (
                        <tfoot>
                          <tr>
                            <th colSpan="5" style={{ textAlign: 'left' }}>إجمالي الفاتورة:</th>
                            <th>{invoiceTotal.toFixed(2)}</th>
                            <th></th>
                          </tr>
                        </tfoot>
                      )}
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

      {/* ═══ Modal: Payment ══════════════════════════════════════════════════ */}
      {modalType === 'payment' && activePurchase && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModal(); }}>
            <div className="modal" style={{ maxWidth: '400px' }}>
              <div className="modal-header">
                <h3>سداد دفعة: {activePurchase.invoiceNumber}</h3>
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
                    <input
                      className="form-control"
                      type="number"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      required
                      max={activePurchase.remainingAmount}
                    />
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

      {/* ═══ Modal: Invoice Details ══════════════════════════════════════════ */}
      {modalType === 'details' && activePurchase && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModal(); }}>
            <div className="modal" style={{ maxWidth: '680px' }}>
              <div className="modal-header">
                <h3>📋 تفاصيل الفاتورة: {activePurchase.invoiceNumber}</h3>
                <button className="modal-close" onClick={closeModal}>✕</button>
              </div>
              <div className="modal-body">

                {/* Invoice summary */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
                  marginBottom: '20px', padding: '16px',
                  background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)'
                }}>
                  <div><small style={{ color: 'var(--text-muted)' }}>المورد</small><div style={{ fontWeight: 600 }}>{activePurchase.supplierName}</div></div>
                  <div><small style={{ color: 'var(--text-muted)' }}>التاريخ</small><div style={{ fontWeight: 600 }}>{activePurchase.invoiceDate ? new Date(activePurchase.invoiceDate).toLocaleDateString('ar-EG') : '—'}</div></div>
                  <div><small style={{ color: 'var(--text-muted)' }}>المدفوع</small><div style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>{Number(activePurchase.paidAmount).toFixed(2)}</div></div>
                  <div><small style={{ color: 'var(--text-muted)' }}>المتبقي</small><div style={{ fontWeight: 600, color: 'var(--metro-red)' }}>{Number(activePurchase.remainingAmount).toFixed(2)}</div></div>
                  <div>
                    <small style={{ color: 'var(--text-muted)' }}>حالة الاستلام</small>
                    <div>
                      {activePurchase.receiptStatus === 'RECEIVED' ? 
                        <span className="badge badge-success">تم الاستلام</span> : 
                        <span className="badge badge-warning">بانتظار الاستلام</span>
                      }
                    </div>
                  </div>
                </div>

                {/* Items */}
                <h4 style={{ marginBottom: '10px' }}>قائمة المنتجات المستلمة</h4>
                {(!activePurchase.items || !activePurchase.items.length) ? (
                  <div className="empty-state" style={{ padding: '20px' }}>لا توجد منتجات</div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>المنتج</th>
                        <th>الوحدة</th>
                        <th>الكمية</th>
                        <th>يعادل</th>
                        <th>السعر</th>
                        <th>الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activePurchase.items.map((item, idx) => {
                        const factor = item.conversionFactor ? Number(item.conversionFactor) : 1;
                        const qtyBase = item.quantityInBaseUnit ?? (item.quantity * factor);
                        const isBaseUnit = !item.unitId || factor === 1;
                        return (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{item.productName}</td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{item.unitName}</div>
                              {!isBaseUnit && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>كل وحدة تحتوي على {factor} قطعة</div>}
                            </td>
                            <td>{item.quantity}</td>
                            <td style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>
                              {Number(qtyBase).toFixed(2)} قطعة
                            </td>
                            <td>{Number(item.unitPrice).toFixed(2)}</td>
                            <td style={{ fontWeight: 700 }}>{Number(item.totalPrice).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th colSpan="5" style={{ textAlign: 'left' }}>الإجمالي النهائي:</th>
                        <th>{Number(activePurchase.totalAmount).toFixed(2)}</th>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>إغلاق</button>
                {activePurchase.receiptStatus === 'PENDING' && Api.can('STOCK_WRITE') && (
                  <button 
                    type="button"
                    className="btn btn-primary" 
                    onClick={async () => {
                      try {
                        const res = await Api.getStockReceipts(0, 100);
                        // Find the PENDING receipt for this invoice
                        const receipt = res.items.find(r => r.purchaseInvoiceId === activePurchase.id && r.status === 'PENDING');
                        if (receipt) {
                          confirm('هل أنت متأكد من تسجيل استلام هذه الشحنة؟ سيتم حفظ الكميات دون تحديث المخزون حالياً.', async () => {
                            await Api.saveStockReceiptQuantities(receipt.id);
                            toast('تم تسجيل الاستلام بنجاح. يمكنك الآن الإضافة للمخزن.', 'success');
                            loadData();
                            closeModal();
                          });
                        } else {
                          toast('لم يتم العثور على إذن استلام لهذه الفاتورة', 'error');
                        }
                      } catch (err) { toast(err.message, 'error'); }
                    }}
                  >
                    📦 تسجيل الاستلام
                  </button>
                )}
                {activePurchase.receiptStatus === 'RECEIVED' && Api.can('STOCK_WRITE') && (
                  <button 
                    type="button"
                    className="btn btn-success" 
                    onClick={async () => {
                      try {
                        const res = await Api.getStockReceipts(0, 100);
                        // Find the RECEIVED receipt for this invoice
                        const receipt = res.items.find(r => r.purchaseInvoiceId === activePurchase.id && r.status === 'RECEIVED');
                        if (receipt) {
                          confirm('هل أنت متأكد من إضافة الأصناف للمخزن وتحديث الرصيد الفعلي؟', async () => {
                            await Api.commitStockReceiptToInventory(receipt.id);
                            toast('تمت إضافة الكميات للمخزن بنجاح', 'success');
                            loadData();
                            closeModal();
                          });
                        }
                      } catch (err) { toast(err.message, 'error'); }
                    }}
                  >
                    ➕ إضافة للمخزن
                  </button>
                )}
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </>
  );
};

export default Purchases;
