import React, { useState, useEffect, useRef, useCallback } from 'react';
import Api from '../../services/api';
import ModalContainer from '../common/ModalContainer';
import { useGlobalUI } from '../common/GlobalUI';

const AddSaleModal = ({ onClose, onSuccess, initialBranchId, availableBranches }) => {
  const { toast } = useGlobalUI();
  const [formSelectedBranchId, setFormSelectedBranchId] = useState(initialBranchId || '');

  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [products, setProducts] = useState([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [productPage, setProductPage] = useState(0);
  const [productTotalPages, setProductTotalPages] = useState(1);
  const [productLoading, setProductLoading] = useState(false);
  const [selectedProductObj, setSelectedProductObj] = useState(null);
  
  const productDropdownRef = useRef(null);
  const productObserverTarget = useRef(null);

  const [invoiceForm, setInvoiceForm] = useState({
    customerId: '',
    discount: 0,
    discountType: 'FIXED',
    paidAmount: 0
  });

  const [invoiceItems, setInvoiceItems] = useState([]);
  const [itemForm, setItemForm] = useState({
    productId: '',
    unitId: '',
    quantity: 1,
    unitPrice: 0,
    discountValue: 0,
    discountType: 'FIXED'
  });
  
  const [availableUnits, setAvailableUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Search Customers
  useEffect(() => {
    if (invoiceForm.customerId) return;
    const timer = setTimeout(async () => {
      setLoadingCustomers(true);
      try {
        const res = await Api.getCustomers(0, 5, customerSearch, formSelectedBranchId);
        const custArray = res.content || res.items || (Array.isArray(res) ? res : []);
        setCustomers(custArray);
      } catch (err) {
        console.error('Failed to search customers', err);
      } finally {
        setLoadingCustomers(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, formSelectedBranchId, invoiceForm.customerId]);

  // Load Products
  const loadProductPage = useCallback(async (page, search, append = false, branchId = formSelectedBranchId) => {
    if (!branchId) return;
    setProductLoading(true);
    try {
      const data = await Api.getProductsPaged(page, 20, search, 'id,desc', branchId);
      const items = data.items || data.content || [];
      setProducts(prev => append ? [...prev, ...items] : items);
      setProductTotalPages(data.totalPages || 1);
      setProductPage(page);
    } catch (e) {
      console.warn("Failed to load products", e);
      if (!append) setProducts([]);
    } finally {
      setProductLoading(false);
    }
  }, [formSelectedBranchId]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadProductPage(0, productSearchQuery, false, formSelectedBranchId);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [productSearchQuery, formSelectedBranchId, loadProductPage]);

  // Infinite Scroll Products
  useEffect(() => {
    if (!showProductDropdown) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !productLoading && productPage < productTotalPages - 1) {
        loadProductPage(productPage + 1, productSearchQuery, true, formSelectedBranchId);
      }
    }, { threshold: 1.0 });
    if (productObserverTarget.current) observer.observe(productObserverTarget.current);
    return () => observer.disconnect();
  }, [productLoading, productPage, productTotalPages, productSearchQuery, loadProductPage, formSelectedBranchId, showProductDropdown]);

  // Handle Outside Click Products
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCustomer = (customer) => {
    setInvoiceForm(prev => ({ ...prev, customerId: customer.id }));
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
  };

  const handleProductChange = async (productId, optionalProductObj = null) => {
    let prod = optionalProductObj || products.find(p => p.id == productId);
    if (!prod && selectedProductObj?.id == productId) prod = selectedProductObj;

    if (!productId || !prod) {
      setItemForm({ productId: '', unitId: '', quantity: 1, unitPrice: 0, discountValue: 0, discountType: 'FIXED' });
      setAvailableUnits([]);
      setSelectedProductObj(null);
      return;
    }

    setSelectedProductObj(prod);
    setItemForm(prev => ({ ...prev, productId, unitId: '', unitPrice: prod.salePrice || 0 }));

    setLoadingUnits(true);
    try {
      const units = prod.units || [];
      setAvailableUnits(units);
      const defaultUnit = units?.find(u => u.isDefaultSale);
      if (defaultUnit) {
        setItemForm(prev => ({
          ...prev,
          productId,
          unitId: defaultUnit.id,
          unitPrice: defaultUnit.salePrice || prod.salePrice || 0
        }));
      }
    } catch {
      setAvailableUnits([]);
    } finally {
      setLoadingUnits(false);
    }
  };

  const handleUnitChange = (unitId) => {
    if (!unitId) {
      const prod = products.find(p => p.id == itemForm.productId) || selectedProductObj;
      setItemForm(prev => ({ ...prev, unitId: '', unitPrice: prod?.salePrice || 0 }));
      return;
    }
    const unit = availableUnits.find(u => u.id == unitId);
    setItemForm(prev => ({
      ...prev,
      unitId,
      unitPrice: unit?.salePrice || prev.unitPrice
    }));
  };

  const handleAddItem = () => {
    if (!itemForm.productId) { toast('يرجى اختيار المنتج', 'warning'); return; }
    const qty = parseFloat(itemForm.quantity);
    const price = parseFloat(itemForm.unitPrice);
    if (isNaN(qty) || qty <= 0) { toast('الكمية غير صحيحة', 'warning'); return; }
    if (isNaN(price) || price < 0) { toast('السعر غير صحيح', 'warning'); return; }

    const product = products.find(p => p.id == itemForm.productId) || selectedProductObj;
    const unit = availableUnits.find(u => u.id == itemForm.unitId);
    const factor = unit ? parseFloat(unit.conversionFactor) : 1;
    const qtyInBase = qty * factor;

    // Optional stock check
    if (qtyInBase > product.stock) {
      toast('الكمية المطلوبة تتجاوز المخزون المتاح', 'warning');
      // depending on settings, you might allow or block. Let's allow but warn.
    }

    const unitLabel = unit
      ? `${unit.unitName} (تحتوي على ${unit.conversionFactor} ${product?.unitName || 'قطعة'})`
      : (product?.unitName || 'الوحدة الأساسية');

    let baseTotal = qty * price;
    let itemDiscVal = parseFloat(itemForm.discountValue) || 0;
    let itemDiscType = itemForm.discountType || 'FIXED';
    let itemDiscAmount = 0;
    if (itemDiscVal > 0) {
        if (itemDiscType === 'PERCENTAGE') {
            itemDiscAmount = baseTotal * (itemDiscVal / 100);
        } else {
            itemDiscAmount = itemDiscVal;
        }
    }
    let finalItemTotal = baseTotal - itemDiscAmount;
    if (finalItemTotal < 0) finalItemTotal = 0;

    setInvoiceItems(prev => [...prev, {
      productId: parseInt(itemForm.productId),
      unitId: itemForm.unitId ? parseInt(itemForm.unitId) : null,
      name: product?.name,
      unitLabel,
      unitName: product?.unitName || 'قطعة',
      quantity: qty,
      factor,
      qtyInBase,
      unitPrice: price,
      discountValue: itemDiscVal,
      discountType: itemDiscType,
      discountAmount: itemDiscAmount,
      totalPrice: finalItemTotal
    }]);

    setItemForm(prev => ({ ...prev, quantity: 1, discountValue: 0, discountType: 'FIXED' }));
  };

  const handleRemoveItem = (index) => {
    setInvoiceItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    if (invoiceItems.length === 0) { toast('يجب إضافة منتج واحد على الأقل', 'warning'); return; }
    if (!formSelectedBranchId) {
      toast('يرجى اختيار الفرع', 'warning');
      return;
    }

    setSaving(true);
    setFormErrors({});
    
    const payload = {
      customerId: invoiceForm.customerId ? parseInt(invoiceForm.customerId) : null,
      branchId: parseInt(formSelectedBranchId),
      discount: parseFloat(invoiceForm.discount) || 0,
      discountType: invoiceForm.discountType || 'FIXED',
      paidAmount: parseFloat(invoiceForm.paidAmount) || 0,
      items: invoiceItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitId: item.unitId || null,
        discount: item.discountValue || 0,
        discountType: item.discountType || 'FIXED'
      }))
    };

    try {
      await Api.createSale(payload);
      toast('تم إضافة فاتورة المبيعات بنجاح', 'success');
      onSuccess();
    } catch (err) {
      if (err.errors) {
        setFormErrors(err.errors);
        toast(err.message || 'يرجى تصحيح الأخطاء في الحقول المشار إليها', 'error');
      } else {
        toast(err.message, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const subtotal = invoiceItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountVal = parseFloat(invoiceForm.discount) || 0;
  const discountType = invoiceForm.discountType || 'FIXED';
  let invoiceDiscAmount = 0;
  if (discountVal > 0) {
      if (discountType === 'PERCENTAGE') invoiceDiscAmount = subtotal * (discountVal / 100);
      else invoiceDiscAmount = discountVal;
  }
  let invoiceTotal = subtotal - invoiceDiscAmount;
  if (invoiceTotal < 0) invoiceTotal = 0;

  return (
    <ModalContainer>
      <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) onClose(); }}>
        <div className="modal" style={{ maxWidth: '860px' }}>
          <div className="modal-header">
            <h3>إنشاء فاتورة مبيعات جديدة</h3>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body">
            <form id="saleForm" onSubmit={handleSaveInvoice}>

              <div className="form-row">
                <div className="form-group">
                  <label>الفرع *</label>
                  <select 
                    className="form-control" 
                    value={formSelectedBranchId} 
                    onChange={(e) => setFormSelectedBranchId(e.target.value)}
                    disabled={!Api.can('ROLE_ADMIN')}
                    required
                  >
                    <option value="">-- اختر الفرع --</option>
                    {availableBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  {formErrors.branchId && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.branchId}</span>}
                </div>
              </div>

              {/* Header fields */}
              <div className="form-row">
                <div className="form-group" style={{ position: 'relative' }}>
                  <label>العميل (اختياري)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div className="searchable-select-wrapper" style={{ position: 'relative', flex: 1 }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="ابحث عن عميل بالاسم أو الهاتف..."
                        value={customerSearch}
                        onFocus={() => setShowCustomerDropdown(true)}
                        onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setInvoiceForm(prev => ({ ...prev, customerId: '' }));
                        }}
                        style={{ paddingLeft: invoiceForm.customerId ? '30px' : '12px' }}
                      />
                      {invoiceForm.customerId && (
                        <span 
                          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-muted, #888)', fontSize: '0.9rem', fontWeight: 'bold', zIndex: 5 }}
                          onClick={() => {
                            setCustomerSearch('');
                            setInvoiceForm(prev => ({ ...prev, customerId: '' }));
                            setShowCustomerDropdown(true);
                          }}
                        >✕</span>
                      )}
                      {showCustomerDropdown && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-elevated, #1a1a1a)', border: '1px solid var(--border-color, #333)', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto', zIndex: 1000, marginTop: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                          {loadingCustomers ? (
                            <div style={{ padding: '10px', color: 'var(--text-muted, #888)', textAlign: 'center' }}>جاري البحث...</div>
                          ) : customers.length === 0 ? (
                            <div style={{ padding: '10px', color: 'var(--text-muted, #888)', textAlign: 'center' }}>لا توجد نتائج</div>
                          ) : (
                            customers.map(c => (
                              <div
                                key={c.id}
                                onMouseDown={(e) => { e.preventDefault(); handleSelectCustomer(c); }}
                                style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle, #2a2a2a)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: invoiceForm.customerId === c.id ? 'var(--bg-hover, rgba(255,255,255,0.05))' : 'transparent', color: 'var(--text-main, #fff)' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(255,255,255,0.05))'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = invoiceForm.customerId === c.id ? 'var(--bg-hover, rgba(255,255,255,0.05))' : 'transparent'}
                              >
                                <span style={{ fontWeight: 600 }}>{c.name}</span>
                                {c.phone && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #888)' }}>{c.phone}</span>}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {formErrors.customerId && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.customerId}</span>}
                </div>
                <div className="form-group">
                  <label>الخصم</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        className="form-control"
                        type="number"
                        step="0.01"
                        min="0"
                        value={invoiceForm.discount}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, discount: e.target.value })}
                        style={{ flex: 1 }}
                      />
                      <select 
                        className="form-control" 
                        value={invoiceForm.discountType} 
                        onChange={e => setInvoiceForm({...invoiceForm, discountType: e.target.value})} 
                        style={{ flex: 1 }}
                      >
                         <option value="FIXED">مبلغ ثابت</option>
                         <option value="PERCENTAGE">نسبة مئوية</option>
                      </select>
                  </div>
                  {formErrors.discount && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.discount}</span>}
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
                  {formErrors.paidAmount && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.paidAmount}</span>}
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
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div className="searchable-select-container" ref={productDropdownRef} style={{ flex: 1, position: 'relative' }}>
                        <div 
                          className="form-control pos-select-display" 
                          onClick={() => setShowProductDropdown(!showProductDropdown)}
                          style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <span>{selectedProductObj ? `${selectedProductObj.name} (مخزون: ${selectedProductObj.stock} ${selectedProductObj.unitName})` : '-- اختر --'}</span>
                          <span className="dropdown-arrow">▼</span>
                        </div>
                        
                        {showProductDropdown && (
                          <div className="pos-select-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--bg-main, #fff)', border: '1px solid var(--border-color, #ccc)', borderRadius: '4px', marginTop: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                            <div className="dropdown-search-wrapper" style={{ padding: '8px' }}>
                              <input 
                                type="text" 
                                className="form-control" 
                                placeholder="ابحث باسم المنتج..." 
                                value={productSearchQuery}
                                onChange={e => setProductSearchQuery(e.target.value)}
                                autoFocus 
                              />
                            </div>
                            <div className="dropdown-options-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                              <div 
                                className="dropdown-option"
                                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle, #eee)' }}
                                onClick={() => { handleProductChange(''); setShowProductDropdown(false); }}
                              >
                                -- اختر --
                              </div>
                              {products.map(p => (
                                <div 
                                  key={p.id} 
                                  className="dropdown-option"
                                  style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle, #eee)', backgroundColor: itemForm.productId === p.id ? 'var(--bg-hover, #f5f5f5)' : 'transparent' }}
                                  onClick={() => { handleProductChange(p.id, p); setShowProductDropdown(false); }}
                                >
                                  {p.name} (مخزون: {p.stock} {p.unitName})
                                </div>
                              ))}
                              <div ref={productObserverTarget} style={{ height: '20px' }}></div>
                              {productLoading && <div style={{ textAlign: 'center', padding: '8px', color: 'var(--text-muted, #888)' }}>جاري التحميل...</div>}
                              {!productLoading && products.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '8px', color: 'var(--text-muted, #888)' }}>لا يوجد نتائج</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Unit */}
                  <div className="form-group" style={{ flex: 1.5 }}>
                    <label>وحدة البيع</label>
                    <select
                      className="form-control"
                      value={itemForm.unitId}
                      onChange={(e) => handleUnitChange(e.target.value)}
                      disabled={!itemForm.productId || loadingUnits}
                    >
                      {itemForm.productId && (() => {
                        const prod = products.find(p => p.id == itemForm.productId) || selectedProductObj;
                        return <option value="">{prod?.unitName || 'الوحدة الأساسية'} (مفردة/قطاعي)</option>;
                      })()}
                      {availableUnits.map(u => {
                        const prod = products.find(p => p.id == itemForm.productId) || selectedProductObj;
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
                    <label>سعر البيع *</label>
                    <input
                      className="form-control"
                      type="number"
                      step="0.01"
                      min="0"
                      value={itemForm.unitPrice}
                      onChange={(e) => setItemForm({ ...itemForm, unitPrice: e.target.value })}
                    />
                  </div>

                  {/* Discount */}
                  <div className="form-group" style={{ flex: 1.2 }}>
                    <label>الخصم</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <input
                        className="form-control"
                        type="number"
                        step="0.01"
                        min="0"
                        value={itemForm.discountValue}
                        onChange={(e) => setItemForm({ ...itemForm, discountValue: e.target.value })}
                        style={{ padding: '6px' }}
                      />
                      <select
                        className="form-control"
                        value={itemForm.discountType}
                        onChange={e => setItemForm({ ...itemForm, discountType: e.target.value })}
                        style={{ padding: '6px', width: '45px' }}
                      >
                         <option value="FIXED">$</option>
                         <option value="PERCENTAGE">%</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group" style={{ flex: 'none' }}>
                    <button type="button" className="btn btn-secondary" onClick={handleAddItem} style={{ marginTop: '22px' }}>
                      + إضافة
                    </button>
                  </div>
                </div>

                {/* Items table */}
                <div className="table-wrapper">
                  <table className="data-table" style={{ marginTop: '10px' }}>
                    <thead>
                      <tr>
                        <th>المنتج</th>
                        <th>الوحدة</th>
                        <th>الكمية</th>
                        <th>السعر</th>
                        <th>الخصم</th>
                        <th>الإجمالي</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItems.length === 0 ? (
                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>لا توجد أصناف مضافة</td></tr>
                      ) : invoiceItems.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.name}</td>
                          <td><small>{item.unitLabel}</small></td>
                          <td>{item.quantity}</td>
                          <td>{item.unitPrice.toFixed(2)}</td>
                          <td>
                             {item.discountValue > 0 ? (
                                item.discountType === 'PERCENTAGE' ? `${item.discountValue}%` : item.discountValue
                             ) : '-'}
                          </td>
                          <td style={{ fontWeight: 600 }}>{item.totalPrice.toFixed(2)}</td>
                          <td>
                            <button type="button" className="btn btn-icon btn-ghost" onClick={() => handleRemoveItem(idx)}>🗑️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: 'var(--bg-elevated)', fontWeight: 800 }}>
                        <td colSpan="5" style={{ textAlign: 'left' }}>الإجمالي قبل الخصم:</td>
                        <td style={{ color: 'var(--metro-blue)', fontSize: '1.1rem' }}>{subtotal.toFixed(2)}</td>
                        <td></td>
                      </tr>
                      {discountVal > 0 && (
                        <tr style={{ background: 'var(--bg-elevated)', fontWeight: 800 }}>
                          <td colSpan="5" style={{ textAlign: 'left' }}>الخصم ({discountType === 'PERCENTAGE' ? `${discountVal}%` : `$${discountVal}`}):</td>
                          <td style={{ color: 'var(--metro-red)', fontSize: '1.1rem' }}>- {invoiceDiscAmount.toFixed(2)}</td>
                          <td></td>
                        </tr>
                      )}
                      <tr style={{ background: 'var(--bg-elevated)', fontWeight: 800 }}>
                        <td colSpan="5" style={{ textAlign: 'left' }}>الصافي:</td>
                        <td style={{ color: 'var(--accent-emerald)', fontSize: '1.2rem' }}>{invoiceTotal.toFixed(2)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {formErrors.items && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block', textAlign: 'center' }}>{formErrors.items}</span>}
              </div>
            </form>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>إلغاء</button>
            <button type="submit" form="saleForm" className="btn btn-primary" disabled={saving}>
              {saving ? 'جاري الحفظ...' : 'حفظ الفاتورة'}
            </button>
          </div>
        </div>
      </div>
    </ModalContainer>
  );
};

export default AddSaleModal;
