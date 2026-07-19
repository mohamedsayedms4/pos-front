import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import { useBranch } from '../context/BranchContext';
import '../styles/pages/SettingsPremium.css';

const AddPurchase = () => {
  const { toast } = useGlobalUI();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { selectedBranchId: globalBranchId, branches: contextBranches } = useBranch();

  // ─── Stepper State ────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  // ─── Shared Form State ────────────────────────────────────────────────────
  const [availableBranches, setAvailableBranches] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [formSelectedBranchId, setFormSelectedBranchId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');

  const [suppliers, setSuppliers] = useState([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  const [invoiceForm, setInvoiceForm] = useState({
    supplierId: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    paidAmount: 0,
    discount: 0,
    discountType: 'FIXED'
  });

  const [invoiceItems, setInvoiceItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // ─── Quick Add Supplier State ─────────────────────────────────────────────
  const [showQuickAddSupplier, setShowQuickAddSupplier] = useState(false);
  const [quickSupplierForm, setQuickSupplierForm] = useState({ name: '', phone: '', address: '' });
  const [savingQuickSupplier, setSavingQuickSupplier] = useState(false);

  // ─── Product Search / Quick Add State ──────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [productPage, setProductPage] = useState(0);
  const [productTotalPages, setProductTotalPages] = useState(1);
  const [productLoading, setProductLoading] = useState(false);
  const productDropdownRef = useRef(null);
  const productObserverTarget = useRef(null);
  const [selectedProductObj, setSelectedProductObj] = useState(null);

  const [itemForm, setItemForm] = useState({
    productId: '', unitId: '', quantity: 1, unitPrice: 0, discountValue: 0, discountType: 'FIXED'
  });
  const [availableUnits, setAvailableUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  const [quickProductForms, setQuickProductForms] = useState([]);

  const addQuickProductForm = () => {
    setQuickProductForms(prev => [
      ...prev,
      { id: Date.now() + Math.random(), name: '', purchasePrice: 0, salePrice: 0, productCode: '', categoryId: '', unitName: 'قطعة' }
    ]);
  };
  const updateQuickProductForm = (id, field, value) => {
    setQuickProductForms(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const [savingQuickProduct, setSavingQuickProduct] = useState(false);

  // ─── Initialization ────────────────────────────────────────────────────────
  useEffect(() => {
    const initData = async () => {
      const user = Api._getUser();
      const initialBranchId = searchParams.get('branchId') || globalBranchId || user?.branchId || '';
      
      setAvailableBranches(contextBranches || []);
      setFormSelectedBranchId(initialBranchId);

      if (initialBranchId) {
        try {
          const whs = await Api.getWarehousesByBranch(initialBranchId);
          setWarehouses(whs);
          if (whs.length > 0) setSelectedWarehouseId(whs[0].id);
        } catch (err) {
          console.error("Failed to load warehouses");
        }
      }

      try {
        const cats = await Api.getCategories();
        setCategories(cats || []);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    initData();
  }, [searchParams, globalBranchId, contextBranches]);

  // Handle Branch Change
  const handleBranchChange = async (branchId) => {
    setFormSelectedBranchId(branchId);
    if (branchId) {
      try {
        const whs = await Api.getWarehousesByBranch(branchId);
        setWarehouses(whs);
        if (whs.length > 0) setSelectedWarehouseId(whs[0].id);
        else setSelectedWarehouseId('');
        
        // Reset dependent state
        setProducts([]);
        setProductSearchQuery('');
        setSelectedProductObj(null);
        setSuppliers([]);
        setSupplierSearch('');
        setInvoiceForm(prev => ({ ...prev, supplierId: '' }));
      } catch (err) {
        setWarehouses([]);
        setSelectedWarehouseId('');
      }
    } else {
      setWarehouses([]);
      setSelectedWarehouseId('');
    }
  };

  // ─── Supplier Search Logic ───────────────────────────────────────────────
  useEffect(() => {
    if (invoiceForm.supplierId) return;

    const timer = setTimeout(async () => {
      setLoadingSuppliers(true);
      try {
        const res = await Api.getSuppliers(0, 5, supplierSearch, '', formSelectedBranchId);
        const supsArray = res.content || res.items || (Array.isArray(res) ? res : []);
        setSuppliers(supsArray);
      } catch (err) {
        console.error('Failed to search suppliers', err);
      } finally {
        setLoadingSuppliers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [supplierSearch, formSelectedBranchId, invoiceForm.supplierId]);

  const handleSelectSupplier = (supplier) => {
    setInvoiceForm(prev => ({ ...prev, supplierId: supplier.id }));
    setSupplierSearch(supplier.name);
    setShowSupplierDropdown(false);
  };

  // ─── Product Search Logic ────────────────────────────────────────────────
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProductChange = async (productId, optionalProductObj = null) => {
    let prod = optionalProductObj || products.find(p => p.id == productId);
    if (!prod && selectedProductObj?.id == productId) prod = selectedProductObj;

    if (!productId || !prod) return;

    const units = prod.units || [];
    const defaultUnit = units?.find(u => u.isDefaultPurchase);
    const unitId = defaultUnit ? defaultUnit.id : '';
    const unitPrice = defaultUnit ? (defaultUnit.purchasePrice || prod.purchasePrice || 0) : (prod.purchasePrice || 0);

    const newItem = {
      productId: prod.id,
      productObj: prod,
      name: prod.name,
      units: units,
      unitId: unitId,
      unitName: prod.unitName || 'قطعة',
      quantity: 1,
      unitPrice: unitPrice,
      discountValue: 0,
      discountType: 'FIXED'
    };

    setInvoiceItems(prev => [newItem, ...prev]);
    setProductSearchQuery('');
    setShowProductDropdown(false);
  };

  const handleSaveQuickProduct = async (formId, quickProductForm) => {
    if (!quickProductForm.name) return;
    if (!quickProductForm.unitName) { toast('الوحدة الأساسية للمنتج السريع مطلوبة', 'warning'); return; }
    try {
      const data = {
        name: quickProductForm.name,
        description: '',
        salePrice: quickProductForm.salePrice ? parseFloat(quickProductForm.salePrice) : 0.01,
        purchasePrice: quickProductForm.purchasePrice ? parseFloat(quickProductForm.purchasePrice) : 0,
        productCode: quickProductForm.productCode || '',
        categoryId: quickProductForm.categoryId ? parseInt(quickProductForm.categoryId) : null,
        unitName: quickProductForm.unitName || 'قطعة',
        type: 'STANDARD',
        status: 'ACTIVE',
        trackStock: true,
        stock: 0,
        showInStore: true,
        isRawMaterial: false,
        units: []
      };
      
      const tempId = `temp-${Date.now()}`;
      const tempProduct = { ...data, id: tempId };
      
      const newItem = {
        productId: tempProduct.id,
        isNewProduct: true,
        productData: data,
        productObj: tempProduct,
        name: tempProduct.name,
        units: tempProduct.units || [],
        unitId: '',
        unitName: tempProduct.unitName || 'قطعة',
        quantity: 1,
        unitPrice: tempProduct.purchasePrice || 0,
        discountValue: 0,
        discountType: 'FIXED'
      };

      setInvoiceItems(prev => [newItem, ...prev]);
      setQuickProductForms(prev => prev.filter(f => f.id !== formId));
      toast('تم إضافة المنتج للفاتورة بشكل مؤقت وسيتم حفظه معها', 'success');
    } catch (err) {
      toast('حدث خطأ أثناء إضافة المنتج المؤقت', 'error');
    }
  };

  const handleRemoveItem = (index) => {
    setInvoiceItems(prev => prev.filter((_, i) => i !== index));
  };

  // ─── Save Invoice ──────────────────────────────────────────────────────────
  const handleSaveInvoice = async () => {
    setSaving(true);
    setFormErrors({});

    let finalSupplierId = invoiceForm.supplierId;
    
    if (showQuickAddSupplier && quickSupplierForm.name) {
       try {
         const newSupplier = await Api.createSupplier(quickSupplierForm);
         finalSupplierId = newSupplier.id;
         setShowQuickAddSupplier(false);
         setQuickSupplierForm({ name: '', phone: '', address: '' });
       } catch (err) {
         toast('فشل إنشاء المورد الجديد', 'error');
         setSaving(false);
         return;
       }
    }

    const processedItems = [];
    for (const item of invoiceItems) {
      let finalProductId = item.productId;
      if (item.isNewProduct) {
        try {
          const newProduct = await Api.createProduct(item.productData, null, formSelectedBranchId);
          finalProductId = newProduct.id;
        } catch (err) {
          toast(`فشل إنشاء المنتج: ${item.name}`, 'error');
          setSaving(false);
          return;
        }
      }
      processedItems.push({
        ...item,
        productId: finalProductId
      });
    }

    const payload = {
      supplierId: parseInt(finalSupplierId),
      branchId: parseInt(formSelectedBranchId),
      warehouseId: parseInt(selectedWarehouseId),
      invoiceDate: new Date(invoiceForm.invoiceDate).toISOString(),
      discount: parseFloat(invoiceForm.discount) || 0,
      discountType: invoiceForm.discountType || 'FIXED',
      paidAmount: parseFloat(invoiceForm.paidAmount) || 0,
      items: processedItems.map(item => ({
        productId: item.productId,
        quantity: parseFloat(item.quantity) || 0,
        unitPrice: parseFloat(item.unitPrice) || 0,
        unitId: item.unitId || null,
        discount: parseFloat(item.discountValue) || 0,
        discountType: item.discountType || 'FIXED'
      }))
    };

    try {
      await Api.createPurchase(payload);
      toast('تم إضافة الفاتورة بنجاح', 'success');
      navigate('/purchases');
    } catch (err) {
      if (err.errors) {
        setFormErrors(err.errors);
        toast(err.message || 'يرجى تصحيح الأخطاء في الحقول المشار إليها', 'error');
        setCurrentStep(1); // Go back to fix errors
      } else {
        toast(err.message, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  // ─── Stepper Logic ────────────────────────────────────────────────────────
  const nextStep = () => {
    if (currentStep === 1) {
      if (!formSelectedBranchId || !selectedWarehouseId) {
        toast('يرجى اختيار الفرع والمخزن', 'warning');
        return;
      }
      if (!invoiceForm.supplierId && !(showQuickAddSupplier && quickSupplierForm.name)) {
        toast('يرجى اختيار المورد أو تعبئة بيانات مورد جديد', 'warning');
        return;
      }
    }
    if (currentStep === 2) {
      if (invoiceItems.length === 0) {
        toast('يجب إضافة منتج واحد على الأقل للمتابعة', 'warning');
        return;
      }
    }
    if (currentStep < totalSteps) setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  // ─── Totals Calculation ───────────────────────────────────────────────────
  const subtotal = invoiceItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    const baseTotal = qty * price;
    let itemDiscAmount = 0;
    const itemDiscVal = parseFloat(item.discountValue) || 0;
    if (itemDiscVal > 0) {
        if (item.discountType === 'PERCENTAGE') itemDiscAmount = baseTotal * (itemDiscVal / 100);
        else itemDiscAmount = itemDiscVal;
    }
    return sum + Math.max(0, baseTotal - itemDiscAmount);
  }, 0);
  const discountVal = parseFloat(invoiceForm.discount) || 0;
  const discountType = invoiceForm.discountType || 'FIXED';
  let invoiceDiscAmount = 0;
  if (discountVal > 0) {
      if (discountType === 'PERCENTAGE') invoiceDiscAmount = subtotal * (discountVal / 100);
      else invoiceDiscAmount = discountVal;
  }
  let invoiceTotal = subtotal - invoiceDiscAmount;
  if (invoiceTotal < 0) invoiceTotal = 0;
  const [activeSection, setActiveSection] = useState('basic');
  useEffect(() => {
    const sectionIds = ['basic', 'products', 'totals'];
    const observers = sectionIds.map((sid) => {
      const el = document.getElementById(sid);
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(sid); },
        { rootMargin: '-20% 0px -60% 0px', threshold: 0.01 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach(o => o?.disconnect());
  }, [invoiceItems]);

  const scrollTo = (sid) => {
    document.getElementById(sid)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(sid);
  };

  return (
    <div style={{ direction: 'rtl', minHeight: '100vh', paddingBottom: '60px' }}>
      
      {/* ── Sticky Page Header ── */}
      <div className="settings-page-header" style={{ padding: '14px 24px', marginBottom: 0 }}>
        <div>
          <span className="settings-eyebrow">المشتريات</span>
          <h1 style={{ margin: 0, fontSize: 'clamp(20px,2vw,28px)', fontWeight: 800, letterSpacing: '-0.02em' }}>
            إنشاء فاتورة مشتريات جديدة
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--muted, #697386)', fontSize: 14 }}>
            قم بإضافة منتجاتك وتحديد المورد والمخزن لإتمام العملية.
          </p>
        </div>
        <div className="header-buttons">
          <button
            className="btn-seggele btn-seggele--secondary"
            type="button"
            onClick={() => navigate('/purchases')}
            disabled={saving}
          >
            <i className="fa-solid fa-arrow-right"></i> إلغاء
          </button>
          <button
            className="btn-seggele btn-seggele--primary"
            type="button"
            onClick={handleSaveInvoice}
            disabled={saving || invoiceItems.length === 0}
          >
            {saving
              ? <><i className="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...</>
              : <><i className="fa-solid fa-check"></i> حفظ الفاتورة</>
            }
          </button>
        </div>
      </div>

      <div className="settings-layout" style={{ maxWidth: 1400, margin: '20px auto 0', padding: '0 24px' }}>
        
        {/* ── Sidebar Nav ── */}
        <aside className="settings-nav">
          <nav>
            {[
              { id: 'basic', label: 'البيانات الأساسية', icon: 'fa-solid fa-file-invoice' },
              { id: 'products', label: 'المنتجات', icon: 'fa-solid fa-box-open' },
              { id: 'totals', label: 'الإجمالي والدفع', icon: 'fa-solid fa-calculator' }
            ].map(({ id: sid, label, icon }) => (
              <button
                key={sid}
                type="button"
                className={`section-link ${activeSection === sid ? 'active' : ''}`}
                onClick={() => scrollTo(sid)}
              >
                <i className={icon}></i>
                <span>{label}</span>
                {activeSection === sid && <span className="active-dot" />}
              </button>
            ))}
          </nav>
          
          <div className="security-note" style={{ marginTop: 14 }}>
            <i className="fa-solid fa-lightbulb" style={{ marginTop: 2 }}></i>
            <div>
              <strong>نصيحة سريعة</strong>
              <p>يمكنك استخدام البحث السريع لإضافة الموردين والمنتجات فوراً للفاتورة دون مغادرة الصفحة.</p>
            </div>
          </div>
        </aside>

        {/* ── Content ── */}
        <div className="settings-content">

          {/* ─ 1. Basic Data ─ */}
          <div id="basic" style={{ scrollMarginTop: 120, marginBottom: 40 }}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>البيانات الأساسية</h2>
              <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>تحديد الفرع، المخزن المستلم، والمورد.</p>
            </div>
            
            <section className="settings-card">
              <div className="card-body">
                <div className="form-grid">
                  
                  <div className="field">
                    <label>الفرع <span className="required">*</span></label>
                    <div className="select-wrap">
                      <select 
                        value={formSelectedBranchId} 
                        onChange={(e) => handleBranchChange(e.target.value)}
                        disabled={!Api.can('ROLE_ADMIN')}
                        required
                      >
                        <option value="">-- اختر الفرع --</option>
                        {availableBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                    {formErrors.branchId && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: 4 }}>{formErrors.branchId}</span>}
                  </div>

                  <div className="field">
                    <label>المخزن (المستلم) <span className="required">*</span></label>
                    <div className="select-wrap">
                      <select 
                        value={selectedWarehouseId} 
                        onChange={(e) => setSelectedWarehouseId(e.target.value)}
                        required
                      >
                        <option value="">-- اختر المخزن --</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                    {formErrors.warehouseId && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: 4 }}>{formErrors.warehouseId}</span>}
                  </div>

                  <div className="field">
                    <label>تاريخ الفاتورة <span className="required">*</span></label>
                    <input
                      type="date"
                      value={invoiceForm.invoiceDate}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })}
                      required
                    />
                    {formErrors.invoiceDate && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: 4 }}>{formErrors.invoiceDate}</span>}
                  </div>

                  <div className="field field--full" style={{ position: 'relative', zIndex: 50 }}>
                    <label>المورد <span className="required">*</span></label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div className="searchable-select-wrapper" style={{ position: 'relative', flex: 1 }}>
                        <input
                          type="text"
                          placeholder="ابحث عن مورد بالاسم أو الهاتف..."
                          value={supplierSearch}
                          onFocus={() => setShowSupplierDropdown(true)}
                          onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 200)}
                          onChange={(e) => {
                            setSupplierSearch(e.target.value);
                            setInvoiceForm(prev => ({ ...prev, supplierId: '' }));
                          }}
                          required={!invoiceForm.supplierId}
                        />
                        {invoiceForm.supplierId && (
                          <span 
                            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--metro-green)', fontWeight: 'bold' }}
                          >✓</span>
                        )}
                        {showSupplierDropdown && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto', marginTop: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                            {loadingSuppliers ? (
                              <div style={{ padding: '10px', textAlign: 'center' }}>جاري البحث...</div>
                            ) : suppliers.length === 0 ? (
                              <div style={{ padding: '10px', textAlign: 'center' }}>لا توجد نتائج</div>
                            ) : (
                              suppliers.map(s => (
                                <div
                                  key={s.id}
                                  onMouseDown={(e) => { e.preventDefault(); handleSelectSupplier(s); }}
                                  style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                  <span>{s.name}</span>
                                  {s.phone && <span style={{ color: 'var(--text-muted)' }}>{s.phone}</span>}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      <button type="button" className="btn-seggele btn-seggele--secondary" style={{ whiteSpace: 'nowrap' }} onClick={() => setShowQuickAddSupplier(!showQuickAddSupplier)}>
                        <i className="fa-solid fa-user-plus"></i> مورد جديد
                      </button>
                    </div>
                    {formErrors.supplierId && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: 4 }}>{formErrors.supplierId}</span>}
                  </div>

                </div>

                {showQuickAddSupplier && (
                  <div style={{ marginTop: '20px', padding: '20px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-user-plus"></i> إضافة مورد سريع
                      </h4>
                      <button type="button" className="btn btn-icon btn-ghost" onClick={() => setShowQuickAddSupplier(false)}><i className="fa-solid fa-times"></i></button>
                    </div>
                    <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                      <div className="field">
                        <label>اسم المورد *</label>
                        <input type="text" placeholder="مثال: شركة النور" value={quickSupplierForm.name} onChange={e => setQuickSupplierForm({...quickSupplierForm, name: e.target.value})} />
                      </div>
                      <div className="field">
                        <label>رقم الهاتف</label>
                        <input type="text" placeholder="01000000000" value={quickSupplierForm.phone} onChange={e => setQuickSupplierForm({...quickSupplierForm, phone: e.target.value})} />
                      </div>
                      <div className="field">
                        <label>العنوان</label>
                        <input type="text" placeholder="الفيوم، مصر" value={quickSupplierForm.address} onChange={e => setQuickSupplierForm({...quickSupplierForm, address: e.target.value})} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ─ 2. Products ─ */}
          <div id="products" style={{ scrollMarginTop: 120, marginBottom: 40 }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>المنتجات</h2>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>أضف المنتجات وقم بتحديد الكميات والأسعار.</p>
              </div>
              <button type="button" className="btn-seggele btn-seggele--secondary btn-sm" onClick={addQuickProductForm}>
                <i className="fa-solid fa-plus"></i> منتج جديد سريع
              </button>
            </div>
            
            <section className="settings-card" style={{ overflow: 'visible' }}>
              <div className="card-body">
                
                {quickProductForms.map((formState) => (
                  <div key={formState.id} style={{ padding: '20px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px dashed var(--primary-color)', marginBottom: '20px' }}>
                    <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 15 }}>
                      <div className="field">
                        <label>اسم المنتج *</label>
                        <input type="text" value={formState.name} onChange={e => updateQuickProductForm(formState.id, 'name', e.target.value)} />
                      </div>
                      <div className="field">
                        <label>سعر الشراء *</label>
                        <input type="number" step="0.01" value={formState.purchasePrice === 0 ? '' : formState.purchasePrice} onChange={e => updateQuickProductForm(formState.id, 'purchasePrice', e.target.value)} />
                      </div>
                      <div className="field">
                        <label>سعر البيع *</label>
                        <input type="number" step="0.01" value={formState.salePrice === 0 ? '' : formState.salePrice} onChange={e => updateQuickProductForm(formState.id, 'salePrice', e.target.value)} />
                      </div>
                      <div className="field">
                        <label>الباركود</label>
                        <input type="text" value={formState.productCode} onChange={e => updateQuickProductForm(formState.id, 'productCode', e.target.value)} />
                      </div>
                      <div className="field">
                        <label>الوحدة الأساسية *</label>
                        <input type="text" value={formState.unitName} onChange={e => updateQuickProductForm(formState.id, 'unitName', e.target.value)} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <button type="button" className="btn-seggele btn-seggele--secondary" onClick={() => setQuickProductForms(prev => prev.filter(f => f.id !== formState.id))}>إلغاء</button>
                      <button type="button" className="btn-seggele btn-seggele--primary" onClick={() => handleSaveQuickProduct(formState.id, formState)}>حفظ وإضافة للفاتورة</button>
                    </div>
                  </div>
                ))}

                <div className="field field--full" style={{ position: 'relative', zIndex: 40, marginBottom: 25 }}>
                  <label>البحث عن منتج وإضافته مباشرة للفاتورة</label>
                  <div className="searchable-select-container" ref={productDropdownRef} style={{ position: 'relative' }}>
                    <div 
                      className="form-control pos-select-display" 
                      onClick={() => setShowProductDropdown(!showProductDropdown)}
                      style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '44px', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                    >
                      <span style={{ color: 'var(--text-muted)' }}>-- ابحث عن المنتج لإضافته --</span>
                      <span className="dropdown-arrow">▼</span>
                    </div>
                    
                    {showProductDropdown && (
                      <div className="pos-select-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', marginTop: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                        <div className="dropdown-search-wrapper" style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                          <input 
                            type="text" 
                            className="form-control" 
                            placeholder="ابحث باسم المنتج..." 
                            value={productSearchQuery}
                            onChange={e => setProductSearchQuery(e.target.value)}
                            autoFocus 
                          />
                        </div>
                        <div className="dropdown-options-list" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                          {productLoading && productPage === 0 ? (
                            <div style={{ padding: '10px', textAlign: 'center' }}>جاري التحميل...</div>
                          ) : products.length === 0 ? (
                            <div style={{ padding: '10px', textAlign: 'center' }}>لا توجد منتجات</div>
                          ) : (
                            <>
                              {products.map(p => (
                                <div 
                                  key={p.id} 
                                  className="dropdown-option"
                                  onMouseDown={(e) => { e.preventDefault(); handleProductChange(p.id, p); }}
                                  style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                  <div>
                                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>الكود: {p.productCode || '-'} | السعر: {p.purchasePrice}</div>
                                  </div>
                                  <div style={{ fontSize: '0.8rem', textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <span style={{ color: p.stock <= 0 ? 'var(--metro-red)' : 'var(--metro-green)', fontWeight: 'bold' }}>المخزون: {p.stock} {p.unitName}</span>
                                  </div>
                                </div>
                              ))}
                              <div ref={productObserverTarget} style={{ height: '1px' }}></div>
                              {productLoading && productPage > 0 && <div style={{ padding: '10px', textAlign: 'center', fontSize: '0.8rem' }}>جاري التحميل...</div>}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                <div className="table-responsive" style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ minWidth: '900px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <thead style={{ background: 'var(--surface-2)' }}>
                      <tr>
                        <th style={{ whiteSpace: 'nowrap' }}>المنتج</th>
                        <th style={{ whiteSpace: 'nowrap', width: '150px' }}>الوحدة</th>
                        <th style={{ whiteSpace: 'nowrap', width: '120px' }}>الكمية</th>
                        <th style={{ whiteSpace: 'nowrap', width: '140px' }}>سعر الوحدة</th>
                        <th style={{ whiteSpace: 'nowrap', width: '160px' }}>الخصم</th>
                        <th style={{ whiteSpace: 'nowrap', width: '120px' }}>الإجمالي</th>
                        <th style={{ whiteSpace: 'nowrap', width: '60px', textAlign: 'center' }}>حذف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItems.length === 0 ? (
                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>لا يوجد منتجات في الفاتورة. قم بالبحث عن المنتجات وإضافتها من الأعلى.</td></tr>
                      ) : (
                        invoiceItems.map((item, index) => {
                          const qty = parseFloat(item.quantity) || 0;
                          const price = parseFloat(item.unitPrice) || 0;
                          const baseTotal = qty * price;
                          let itemDiscAmount = 0;
                          const itemDiscVal = parseFloat(item.discountValue) || 0;
                          if (itemDiscVal > 0) {
                              if (item.discountType === 'PERCENTAGE') itemDiscAmount = baseTotal * (itemDiscVal / 100);
                              else itemDiscAmount = itemDiscVal;
                          }
                          let finalItemTotal = baseTotal - itemDiscAmount;
                          if (finalItemTotal < 0) finalItemTotal = 0;
                          
                          return (
                            <tr key={index} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td>
                                <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>الكود: {item.productObj?.productCode || '-'}</div>
                              </td>
                              <td>
                                <div className="select-wrap">
                                  <select 
                                    value={item.unitId || ''} 
                                    onChange={(e) => {
                                      const newItems = [...invoiceItems];
                                      const selectedUnitId = e.target.value;
                                      newItems[index].unitId = selectedUnitId;
                                      const selectedUnit = (newItems[index].units || []).find(u => u.id == selectedUnitId);
                                      if (selectedUnit) newItems[index].unitPrice = selectedUnit.purchasePrice || newItems[index].productObj?.purchasePrice || 0;
                                      else newItems[index].unitPrice = newItems[index].productObj?.purchasePrice || 0;
                                      setInvoiceItems(newItems);
                                    }}
                                  >
                                    <option value="">{item.productObj?.unitName || 'الأساسية'}</option>
                                    {(item.units || []).map(u => <option key={u.id} value={u.id}>{u.unitName} ({u.conversionFactor})</option>)}
                                  </select>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                </div>
                              </td>
                              <td>
                                <input 
                                  className="form-control" 
                                  type="number" 
                                  min="0.01" 
                                  step="0.01" 
                                  value={item.quantity === 0 ? '' : item.quantity} 
                                  onChange={(e) => {
                                    const newItems = [...invoiceItems];
                                    newItems[index].quantity = e.target.value;
                                    setInvoiceItems(newItems);
                                  }} 
                                  style={{ textAlign: 'center' }} 
                                />
                              </td>
                              <td>
                                <input 
                                  className="form-control" 
                                  type="number" 
                                  min="0" 
                                  step="0.01" 
                                  value={item.unitPrice === 0 ? '' : item.unitPrice} 
                                  onChange={(e) => {
                                    const newItems = [...invoiceItems];
                                    newItems[index].unitPrice = e.target.value;
                                    setInvoiceItems(newItems);
                                  }} 
                                  style={{ textAlign: 'center' }} 
                                />
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <input 
                                    className="form-control" 
                                    type="number" 
                                    min="0" 
                                    step="0.01" 
                                    value={item.discountValue === 0 ? '' : item.discountValue} 
                                    onChange={(e) => {
                                      const newItems = [...invoiceItems];
                                      newItems[index].discountValue = e.target.value;
                                      setInvoiceItems(newItems);
                                    }} 
                                    style={{ flex: 1, minWidth: '60px' }} 
                                  />
                                  <div className="select-wrap" style={{ width: '60px' }}>
                                    <select 
                                      value={item.discountType} 
                                      onChange={(e) => {
                                        const newItems = [...invoiceItems];
                                        newItems[index].discountType = e.target.value;
                                        setInvoiceItems(newItems);
                                      }} 
                                      style={{ paddingRight: '10px' }}
                                    >
                                      <option value="FIXED">$</option>
                                      <option value="PERCENTAGE">%</option>
                                    </select>
                                  </div>
                                </div>
                              </td>
                              <td style={{ fontWeight: 'bold', whiteSpace: 'nowrap', verticalAlign: 'middle', color: 'var(--primary-color)' }}>
                                {finalItemTotal.toLocaleString()} ج.م
                              </td>
                              <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                <button type="button" className="btn btn-icon btn-ghost" style={{ color: 'var(--metro-red)' }} onClick={() => handleRemoveItem(index)}>
                                  <i className="fa-solid fa-trash"></i>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            </section>
          </div>

          {/* ─ 3. Totals and Payments ─ */}
          <div id="totals" style={{ scrollMarginTop: 120, marginBottom: 40 }}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>الإجمالي والدفع</h2>
              <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>مراجعة الإجماليات وتحديد الخصم الكلي والمبلغ المدفوع.</p>
            </div>
            <section className="settings-card" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div className="card-body">
                
                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', marginBottom: 25 }}>
                  <div className="field">
                    <label>الخصم الكلي على الفاتورة</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        className="form-control"
                        type="number"
                        step="0.01"
                        min="0"
                        value={invoiceForm.discount === 0 ? '' : invoiceForm.discount}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, discount: e.target.value })}
                        style={{ flex: 1 }}
                      />
                      <div className="select-wrap" style={{ flex: 1 }}>
                        <select 
                          value={invoiceForm.discountType} 
                          onChange={e => setInvoiceForm({...invoiceForm, discountType: e.target.value})} 
                        >
                           <option value="FIXED">مبلغ ثابت</option>
                           <option value="PERCENTAGE">نسبة مئوية</option>
                        </select>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="field">
                    <label>المبلغ المدفوع الآن</label>
                    <input
                      className="form-control"
                      type="number"
                      step="0.01"
                      min="0"
                      value={invoiceForm.paidAmount === 0 ? '' : invoiceForm.paidAmount}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, paidAmount: e.target.value })}
                      style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--metro-green)' }}
                    />
                    {formErrors.paidAmount && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: 4 }}>{formErrors.paidAmount}</span>}
                  </div>
                </div>

                <div style={{ borderTop: '2px dashed var(--border)', margin: '20px 0' }}></div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>إجمالي المنتجات (قبل الخصم الكلي):</span>
                    <span style={{ fontWeight: 'bold' }}>{subtotal.toLocaleString()} ج.م</span>
                  </div>
                  
                  {invoiceDiscAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', color: 'var(--metro-red)' }}>
                      <span>الخصم الكلي للفاتورة:</span>
                      <span style={{ fontWeight: 'bold' }}>- {invoiceDiscAmount.toLocaleString()} ج.م</span>
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.4rem', color: 'var(--primary-color)', background: 'var(--bg-elevated)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <strong>الصافي المطلوب:</strong>
                    <strong>{invoiceTotal.toLocaleString()} ج.م</strong>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>المتبقي (الآجل):</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--metro-orange)' }}>{Math.max(0, invoiceTotal - Number(invoiceForm.paidAmount)).toLocaleString()} ج.م</span>
                  </div>
                </div>
                
              </div>
            </section>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AddPurchase;
