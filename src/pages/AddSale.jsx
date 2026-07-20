import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import { useBranch } from '../context/BranchContext';
import '../styles/pages/SettingsPremium.css';

const AddSale = () => {
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
  
  const [formSelectedBranchId, setFormSelectedBranchId] = useState('');
  

  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [invoiceForm, setInvoiceForm] = useState({
    customerId: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    paidAmount: 0,
    discount: 0,
    discountType: 'FIXED'
  });

  const [invoiceItems, setInvoiceItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // ─── Quick Add Customer State ─────────────────────────────────────────────
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [quickCustomerForm, setQuickCustomerForm] = useState({ name: '', phone: '', address: '' });
  const [savingQuickCustomer, setSavingQuickCustomer] = useState(false);

  // ─── Quick Add Product State ───────────────────────────────────────────────
  const [showQuickAddProduct, setShowQuickAddProduct] = useState(false);
  const [quickProductForm, setQuickProductForm] = useState({
    name: '', productCode: '', purchasePrice: '', salePrice: '', unitName: 'قطعة'
  });
  const [quickProductSuggestions, setQuickProductSuggestions] = useState([]);
  const [savingQuickProduct, setSavingQuickProduct] = useState(false);
  const [quickProductSuggestionFocused, setQuickProductSuggestionFocused] = useState(false);

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

  const addNewProductRow = () => {
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const newItem = {
      productId: tempId,
      isNewProduct: true,
      name: '',
      productCode: '',
      unitName: 'قطعة',
      quantity: 1,
      unitPrice: '',
      otherPrice: '',
      discountValue: 0,
      discountType: 'FIXED',
      units: []
    };
    setInvoiceItems(prev => [newItem, ...prev]);
  };

  const [cachedProducts, setCachedProducts] = useState([]);

  useEffect(() => {
    if (!formSelectedBranchId) {
      setCachedProducts([]);
      return;
    }
    const fetchCache = async () => {
      try {
        const prodList = await Api.getProducts(0, 2000, formSelectedBranchId);
        setCachedProducts(prodList || []);
      } catch (err) {
        console.error("Failed to load products cache", err);
      }
    };
    fetchCache();
  }, [formSelectedBranchId]);

  const [inlineSuggestions, setInlineSuggestions] = useState([]);
  const [inlineActiveIndex, setInlineActiveIndex] = useState(null);
  const [inlineLoading, setInlineLoading] = useState(false);

  const handleInlineNameChange = (index, value) => {
    const newItems = [...invoiceItems];
    newItems[index].name = value;
    setInvoiceItems(newItems);

    if (!value.trim()) {
      setInlineSuggestions([]);
      return;
    }

    setInlineActiveIndex(index);
    
    // Filter locally to find similar products by name or code
    const matching = cachedProducts.filter(p => 
      p.name?.toLowerCase().includes(value.toLowerCase()) || 
      p.productCode?.toLowerCase().includes(value.toLowerCase())
    ).slice(0, 8);

    setInlineSuggestions(matching);
  };

  const handleSelectInlineSuggestion = (index, product) => {
    const units = product.units || [];
    const defaultUnit = units?.find(u => u.isDefaultPurchase);
    const unitId = defaultUnit ? defaultUnit.id : '';
    const unitPrice = defaultUnit ? (defaultUnit.salePrice || product.salePrice || 0) : (product.salePrice || 0);
    
    const newItems = [...invoiceItems];
    newItems[index] = {
      ...newItems[index],
      productId: product.id,
      isNewProduct: false,
      productObj: product,
      name: product.name,
      units: units,
      unitId: unitId,
      unitName: product.unitName || 'قطعة',
      unitPrice: unitPrice,
      otherPrice: product.purchasePrice || 0,
      productCode: product.productCode || ''
    };
    setInvoiceItems(newItems);
    setInlineActiveIndex(null);
    setInlineSuggestions([]);
  };

  // ─── Quick Add Product Handlers ────────────────────────────────────────────
  const handleQuickProductNameChange = (value) => {
    setQuickProductForm(prev => ({ ...prev, name: value }));
    if (!value.trim()) {
      setQuickProductSuggestions([]);
      return;
    }
    const matching = cachedProducts.filter(p =>
      p.name?.toLowerCase().includes(value.toLowerCase()) ||
      p.productCode?.toLowerCase().includes(value.toLowerCase())
    ).slice(0, 6);
    setQuickProductSuggestions(matching);
  };

  const handleSelectExistingFromQuickPanel = (product) => {
    const units = product.units || [];
    const defaultUnit = units?.find(u => u.isDefaultPurchase);
    const unitId = defaultUnit ? defaultUnit.id : '';
    const unitPrice = defaultUnit ? (defaultUnit.salePrice || product.salePrice || 0) : (product.salePrice || 0);
    const newItem = {
      productId: product.id,
      productObj: product,
      name: product.name,
      units: units,
      unitId: unitId,
      unitName: product.unitName || 'قطعة',
      quantity: 1,
      unitPrice: unitPrice,
      discountValue: 0,
      discountType: 'FIXED'
    };
    setInvoiceItems(prev => [newItem, ...prev]);
    setShowQuickAddProduct(false);
    setQuickProductForm({ name: '', productCode: '', purchasePrice: '', salePrice: '', unitName: 'قطعة' });
    setQuickProductSuggestions([]);
  };

  const handleSaveQuickProduct = async () => {
    if (!quickProductForm.name.trim()) {
      toast('اسم المنتج مطلوب', 'warning');
      return;
    }
    if (!quickProductForm.salePrice) {
      toast('سعر البيع مطلوب', 'warning');
      return;
    }
    if (!quickProductForm.purchasePrice) {
      toast('سعر الشراء مطلوب', 'warning');
      return;
    }
    // Check exact name match first
    const exactMatch = cachedProducts.find(
      p => p.name?.trim().toLowerCase() === quickProductForm.name.trim().toLowerCase()
    );
    if (exactMatch) {
      handleSelectExistingFromQuickPanel(exactMatch);
      toast(`تم إضافة المنتج الموجود "${exactMatch.name}" للفاتورة`, 'info');
      return;
    }
    setSavingQuickProduct(true);
    try {
      const productData = {
        name: quickProductForm.name.trim(),
        description: '',
        salePrice: parseFloat(quickProductForm.salePrice) || 0.01,
        purchasePrice: parseFloat(quickProductForm.purchasePrice) || 0,
        productCode: quickProductForm.productCode || '',
        categoryId: null,
        unitName: quickProductForm.unitName || 'قطعة',
        type: 'STANDARD',
        status: 'ACTIVE',
        trackStock: true,
        stock: 0,
        showInStore: true,
        isRawMaterial: false,
        units: []
      };
      const newProduct = await Api.createProduct(productData, null, formSelectedBranchId);
      setCachedProducts(prev => [...prev, newProduct]);
      // Add to invoice items
      const newItem = {
        productId: newProduct.id,
        productObj: newProduct,
        name: newProduct.name,
        units: [],
        unitId: '',
        unitName: quickProductForm.unitName || 'قطعة',
        quantity: 1,
        unitPrice: parseFloat(quickProductForm.salePrice) || 0,
        discountValue: 0,
        discountType: 'FIXED'
      };
      setInvoiceItems(prev => [newItem, ...prev]);
      toast(`تم إنشاء المنتج "${newProduct.name}" وإضافته للفاتورة`, 'success');
      setShowQuickAddProduct(false);
      setQuickProductForm({ name: '', productCode: '', purchasePrice: '', salePrice: '', unitName: 'قطعة' });
      setQuickProductSuggestions([]);
    } catch (err) {
      toast(err.message || 'فشل إنشاء المنتج', 'error');
    } finally {
      setSavingQuickProduct(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        addNewProductRow();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ─── Initialization ────────────────────────────────────────────────────────
  useEffect(() => {
    const initData = async () => {
      const user = Api._getUser();
      const initialBranchId = searchParams.get('branchId') || globalBranchId || user?.branchId || '';
      
      setAvailableBranches(contextBranches || []);
      setFormSelectedBranchId(initialBranchId);

      try {
        const cats = await Api.getCategories();
        setCategories(cats || []);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    initData();
  }, [searchParams, globalBranchId, contextBranches]);

  const handleBranchChange = async (branchId) => {
    setFormSelectedBranchId(branchId);
    if (branchId) {
      setProducts([]);
      setProductSearchQuery('');
      setSelectedProductObj(null);
      setCustomers([]);
      setCustomerSearch('');
      setInvoiceForm(prev => ({ ...prev, customerId: '' }));
    }
  };

  useEffect(() => {
    if (invoiceForm.customerId) return;

    const timer = setTimeout(async () => {
      setLoadingCustomers(true);
      try {
        const res = await Api.getCustomers(0, 5, customerSearch, '', formSelectedBranchId);
        const supsArray = res.content || res.items || (Array.isArray(res) ? res : []);
        setCustomers(supsArray);
      } catch (err) {
        console.error('Failed to search customers', err);
      } finally {
        setLoadingCustomers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerSearch, formSelectedBranchId, invoiceForm.customerId]);

  const handleSelectCustomer = (customer) => {
    setInvoiceForm(prev => ({ ...prev, customerId: customer.id }));
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
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
    const unitPrice = defaultUnit ? (defaultUnit.salePrice || prod.salePrice || 0) : (prod.salePrice || 0);

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



  const handleRemoveItem = (index) => {
    setInvoiceItems(prev => prev.filter((_, i) => i !== index));
  };

  // ─── Save Invoice ──────────────────────────────────────────────────────────
  const handleSaveInvoice = async () => {
    setSaving(true);
    setFormErrors({});

    let finalCustomerId = invoiceForm.customerId;
    
    if (showQuickAddCustomer && quickCustomerForm.name) {
       try {
         const newCustomer = await Api.createCustomer(quickCustomerForm);
         finalCustomerId = newCustomer.id;
         setShowQuickAddCustomer(false);
         setQuickCustomerForm({ name: '', phone: '', address: '' });
       } catch (err) {
         toast('فشل إنشاء العميل الجديد', 'error');
         setSaving(false);
         return;
       }
    }

    const processedItems = [];
    const updatedInvoiceItems = [...invoiceItems];
    for (let i = 0; i < updatedInvoiceItems.length; i++) {
      const item = updatedInvoiceItems[i];
      let finalProductId = item.productId;
      if (item.isNewProduct) {
        // Double check if name matches an existing product in cachedProducts
        const exactMatch = cachedProducts.find(p => p.name?.trim().toLowerCase() === item.name?.trim().toLowerCase());
        if (exactMatch) {
          finalProductId = exactMatch.id;
          updatedInvoiceItems[i] = {
            ...item,
            isNewProduct: false,
            productId: finalProductId,
            productObj: exactMatch
          };
        } else {
          if (!item.name) {
            toast('اسم المنتج مطلوب لجميع المنتجات الجديدة', 'warning');
            setSaving(false);
            return;
          }
          if (!item.unitName) {
            toast('الوحدة الأساسية مطلوبة لجميع المنتجات الجديدة', 'warning');
            setSaving(false);
            return;
          }
          if (!item.unitPrice) {
            toast('سعر البيع مطلوب للمنتج الجديد', 'warning');
            setSaving(false);
            return;
          }
          if (!item.otherPrice) {
            toast('سعر الشراء مطلوب للمنتج الجديد', 'warning');
            setSaving(false);
            return;
          }
          try {
            const productDataWithStock = {
              name: item.name,
              description: '',
              salePrice: parseFloat(item.unitPrice) || 0.01,
              purchasePrice: parseFloat(item.otherPrice) || 0,
              productCode: item.productCode || '',
              categoryId: null,
              unitName: item.unitName || 'قطعة',
              type: 'STANDARD',
              status: 'ACTIVE',
              trackStock: true,
              stock: parseFloat(item.quantity) || 0,
              showInStore: true,
              isRawMaterial: false,
              units: []
            };
            const newProduct = await Api.createProduct(productDataWithStock, null, formSelectedBranchId);
            finalProductId = newProduct.id;
            updatedInvoiceItems[i] = {
              ...item,
              isNewProduct: false,
              productId: finalProductId,
              productObj: newProduct
            };
            // Also append newly created product to cachedProducts list
            setCachedProducts(prev => [...prev, newProduct]);
          } catch (err) {
            toast(`فشل إنشاء المنتج: ${item.name}`, 'error');
            setInvoiceItems(updatedInvoiceItems);
            setSaving(false);
            return;
          }
        }
      }
      processedItems.push({
        ...updatedInvoiceItems[i],
        productId: finalProductId
      });
    }
    setInvoiceItems(updatedInvoiceItems);

    for (const item of processedItems) {
      const qty = parseFloat(item.quantity);
      if (!qty || qty <= 0) {
        toast(`المنتج (${item.name || 'غير مسمى'}): كمية المنتجات يجب أن تكون أكبر من صفر`, 'warning');
        setSaving(false);
        return;
      }
    }

    const payload = {
      customerId: parseInt(finalCustomerId),
      branchId: parseInt(formSelectedBranchId),
      
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
      await Api.createSale(payload);
      toast('تم إضافة الفاتورة بنجاح', 'success');
      navigate('/sales');
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
      if (!formSelectedBranchId) {
        toast('يرجى اختيار الفرع', 'warning');
        return;
      }
      if (!invoiceForm.customerId && !(showQuickAddCustomer && quickCustomerForm.name)) {
        toast('يرجى اختيار العميل أو تعبئة بيانات عميل جديد', 'warning');
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
          <span className="settings-eyebrow">المبيعات</span>
          <h1 style={{ margin: 0, fontSize: 'clamp(20px,2vw,28px)', fontWeight: 800, letterSpacing: '-0.02em' }}>
            إنشاء فاتورة مبيعات جديدة
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--muted, #697386)', fontSize: 14 }}>
            قم بإضافة منتجاتك وتحديد العميل لإتمام العملية.
          </p>
        </div>
        <div className="header-buttons">
          <button
            className="btn-seggele btn-seggele--secondary"
            type="button"
            onClick={() => navigate('/sales')}
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
              <p>يمكنك استخدام البحث السريع لإضافة العميلين والمنتجات فوراً للفاتورة دون مغادرة الصفحة.</p>
            </div>
          </div>
        </aside>

        {/* ── Content ── */}
        <div className="settings-content">

          {/* ─ 1. Basic Data ─ */}
          <div id="basic" style={{ scrollMarginTop: 120, marginBottom: 40 }}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>البيانات الأساسية</h2>
              <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>تحديد الفرع والعميل.</p>
            </div>
            
            <section className="settings-card" style={{ overflow: 'visible' }}>
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
                    <label>العميل <span className="required">*</span></label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div className="searchable-select-wrapper" style={{ position: 'relative', flex: 1 }}>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            placeholder="🔍 ابحث عن عميل بالاسم أو رقم الهاتف..."
                            value={customerSearch}
                            onFocus={() => setShowCustomerDropdown(true)}
                            onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                            onChange={(e) => {
                              setCustomerSearch(e.target.value);
                              setInvoiceForm(prev => ({ ...prev, customerId: '' }));
                            }}
                            required={!invoiceForm.customerId}
                            style={{
                              paddingRight: '38px',
                              paddingLeft: invoiceForm.customerId ? '40px' : '15px',
                              border: invoiceForm.customerId ? '1.5px solid var(--metro-green)' : '1px solid var(--border-strong)',
                              boxShadow: invoiceForm.customerId ? '0 0 0 3px rgba(34, 197, 94, 0.08)' : 'none',
                              transition: 'all 0.2s ease',
                              fontWeight: invoiceForm.customerId ? '600' : 'normal'
                            }}
                          />
                          <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                            <i className="fa-solid fa-search"></i>
                          </span>
                          {invoiceForm.customerId ? (
                            <div 
                              onClick={() => {
                                setCustomerSearch('');
                                setInvoiceForm(prev => ({ ...prev, customerId: '' }));
                              }}
                              style={{ 
                                position: 'absolute', 
                                left: '12px', 
                                top: '50%', 
                                transform: 'translateY(-50%)', 
                                cursor: 'pointer', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px',
                                background: 'rgba(34, 197, 94, 0.1)',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                color: 'var(--metro-green)', 
                                fontSize: '0.8rem',
                                fontWeight: 'bold'
                              }}
                            >
                              <span>مختار</span>
                              <i className="fa-solid fa-times-circle"></i>
                            </div>
                          ) : customerSearch && (
                            <span 
                              onClick={() => setCustomerSearch('')}
                              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-muted)' }}
                            >
                              <i className="fa-solid fa-circle-xmark"></i>
                            </span>
                          )}
                        </div>
                        {showCustomerDropdown && (
                          <div style={{ 
                            position: 'absolute', 
                            top: '105%', 
                            left: 0, 
                            right: 0, 
                            background: 'rgba(255, 255, 255, 0.98)', 
                            backdropFilter: 'blur(8px)',
                            border: '1px solid var(--border-strong)', 
                            borderRadius: '12px', 
                            maxHeight: '260px', 
                            overflowY: 'auto', 
                            marginTop: '4px', 
                            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
                            zIndex: 1000,
                            padding: '6px'
                          }}>
                            {loadingCustomers ? (
                              <div style={{ padding: '15px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.9rem' }}>
                                <i className="fa-solid fa-spinner spin-anim" style={{ marginLeft: '8px' }}></i> جاري البحث...
                              </div>
                            ) : customers.length === 0 ? (
                              <div style={{ padding: '15px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.9rem' }}>
                                <i className="fa-solid fa-circle-info" style={{ marginLeft: '8px' }}></i> لا توجد نتائج للبحث
                              </div>
                            ) : (
                              customers.map(s => (
                                <div
                                  key={s.id}
                                  onMouseDown={(e) => { e.preventDefault(); handleSelectCustomer(s); }}
                                  style={{ 
                                    padding: '10px 14px', 
                                    cursor: 'pointer', 
                                    borderRadius: '8px',
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '4px',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'var(--primary-soft)';
                                    e.currentTarget.style.color = 'var(--primary)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = 'inherit';
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(37, 99, 235, 0.1)', display: 'grid', placeItems: 'center', color: 'var(--primary)' }}>
                                      <i className="fa-solid fa-user"></i>
                                    </div>
                                    <span style={{ fontWeight: '600', fontSize: '0.92rem' }}>{s.name}</span>
                                  </div>
                                  {s.phone && (
                                    <span style={{ 
                                      fontSize: '0.8rem', 
                                      color: 'var(--muted)',
                                      background: 'var(--surface-2)',
                                      padding: '3px 8px',
                                      borderRadius: '99px',
                                      border: '1px solid var(--border)'
                                    }}>
                                      <i className="fa-solid fa-phone" style={{ marginLeft: '5px', fontSize: '0.7rem' }}></i> {s.phone}
                                    </span>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      <button type="button" className="btn-seggele btn-seggele--secondary" style={{ whiteSpace: 'nowrap' }} onClick={() => setShowQuickAddCustomer(!showQuickAddCustomer)}>
                        <i className="fa-solid fa-user-plus"></i> عميل جديد
                      </button>
                    </div>
                    {formErrors.customerId && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: 4 }}>{formErrors.customerId}</span>}
                  </div>

                </div>

                {showQuickAddCustomer && (
                  <div style={{ marginTop: '20px', padding: '20px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-user-plus"></i> إضافة عميل سريع
                      </h4>
                      <button type="button" className="btn btn-icon btn-ghost" onClick={() => setShowQuickAddCustomer(false)}><i className="fa-solid fa-times"></i></button>
                    </div>
                    <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                      <div className="field">
                        <label>اسم العميل *</label>
                        <input type="text" placeholder="مثال: شركة النور" value={quickCustomerForm.name} onChange={e => setQuickCustomerForm({...quickCustomerForm, name: e.target.value})} />
                      </div>
                      <div className="field">
                        <label>رقم الهاتف</label>
                        <input type="text" placeholder="01000000000" value={quickCustomerForm.phone} onChange={e => setQuickCustomerForm({...quickCustomerForm, phone: e.target.value})} />
                      </div>
                      <div className="field">
                        <label>العنوان</label>
                        <input type="text" placeholder="الفيوم، مصر" value={quickCustomerForm.address} onChange={e => setQuickCustomerForm({...quickCustomerForm, address: e.target.value})} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ─ 2. Products ─ */}
          <div id="products" style={{ scrollMarginTop: 120, marginBottom: 40 }}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>المنتجات</h2>
              <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>ابحث عن منتج موجود أو أضف منتجات جديدة مباشرة للفاتورة.</p>
            </div>
            
            <section className="settings-card" style={{ overflow: 'visible' }}>
              <div className="card-body">
                


                <div className="field field--full" style={{ position: 'relative', zIndex: 40, marginBottom: showQuickAddProduct ? 0 : 25 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ marginBottom: 0 }}>البحث عن منتج وإضافته مباشرة للفاتورة</label>
                    <button
                      type="button"
                      className={`btn-seggele btn-sm ${showQuickAddProduct ? 'btn-seggele--primary' : 'btn-seggele--secondary'}`}
                      onClick={() => {
                        setShowQuickAddProduct(!showQuickAddProduct);
                        setQuickProductForm({ name: '', productCode: '', purchasePrice: '', salePrice: '', unitName: 'قطعة' });
                        setQuickProductSuggestions([]);
                      }}
                      style={{ padding: '5px 12px', fontSize: '0.82rem' }}
                    >
                      <i className={`fa-solid ${showQuickAddProduct ? 'fa-times' : 'fa-plus'}`} style={{ marginLeft: 5 }}></i>
                      {showQuickAddProduct ? 'إلغاء' : 'إضافة منتج جديد'}
                    </button>
                  </div>
                  <div className="searchable-select-container" ref={productDropdownRef} style={{ position: 'relative' }}>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="🔍 ابحث عن منتج بالاسم أو الباركود..." 
                        value={productSearchQuery}
                        onFocus={() => setShowProductDropdown(true)}
                        onChange={e => setProductSearchQuery(e.target.value)}
                        style={{
                          height: '46px',
                          paddingRight: '38px',
                          paddingLeft: '15px',
                          border: '1.5px solid var(--border-strong)',
                          borderRadius: '10px',
                          transition: 'all 0.2s ease',
                          fontSize: '0.95rem'
                        }}
                      />
                      <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                        <i className="fa-solid fa-search"></i>
                      </span>
                      {productSearchQuery && (
                        <span 
                          onClick={() => setProductSearchQuery('')}
                          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-muted)' }}
                        >
                          <i className="fa-solid fa-circle-xmark"></i>
                        </span>
                      )}
                    </div>
                    
                    {showProductDropdown && (
                      <div className="pos-select-dropdown" style={{ 
                        position: 'absolute', 
                        top: '105%', 
                        left: 0, 
                        right: 0, 
                        zIndex: 1000, 
                        background: 'rgba(255, 255, 255, 0.98)', 
                        backdropFilter: 'blur(8px)',
                        border: '1px solid var(--border-strong)', 
                        borderRadius: '12px', 
                        marginTop: '4px', 
                        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
                        padding: '6px'
                      }}>
                        <div className="dropdown-options-list" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                          {productLoading && productPage === 0 ? (
                            <div style={{ padding: '15px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.9rem' }}>
                              <i className="fa-solid fa-spinner spin-anim" style={{ marginLeft: '8px' }}></i> جاري التحميل...
                            </div>
                          ) : products.length === 0 ? (
                            <div style={{ padding: '15px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.9rem' }}>
                              <i className="fa-solid fa-circle-info" style={{ marginLeft: '8px' }}></i> لا توجد نتائج، يمكنك إضافة منتج جديد من الزر بالأعلى
                            </div>
                          ) : (
                            <>
                              {products.map(p => (
                                <div 
                                  key={p.id} 
                                  className="dropdown-option"
                                  onMouseDown={(e) => { e.preventDefault(); handleProductChange(p.id, p); }}
                                  style={{ 
                                    padding: '10px 14px', 
                                    cursor: 'pointer', 
                                    borderRadius: '8px',
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '4px',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'var(--primary-soft)';
                                    e.currentTarget.style.color = 'var(--primary)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = 'inherit';
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(37, 99, 235, 0.1)', display: 'grid', placeItems: 'center', color: 'var(--primary)' }}>
                                      <i className="fa-solid fa-box"></i>
                                    </div>
                                    <div>
                                      <div style={{ fontWeight: '600', fontSize: '0.92rem' }}>{p.name}</div>
                                      <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                                        الكود: <span style={{ direction: 'ltr', display: 'inline-block' }}>{p.productCode || '-'}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ 
                                      fontSize: '0.8rem', 
                                      fontWeight: '600',
                                      background: 'var(--surface-2)',
                                      padding: '4px 10px',
                                      borderRadius: '6px',
                                      border: '1px solid var(--border)',
                                      color: 'var(--primary)'
                                    }}>
                                      السعر: {p.salePrice} ج.م
                                    </span>
                                    <span style={{ 
                                      fontSize: '0.8rem', 
                                      fontWeight: 'bold',
                                      background: p.stock <= 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                      color: p.stock <= 0 ? 'var(--metro-red)' : 'var(--metro-green)',
                                      padding: '4px 10px',
                                      borderRadius: '6px'
                                    }}>
                                      المخزون: {p.stock}
                                    </span>
                                  </div>
                                </div>
                              ))}
                              {productLoading && (
                                <div style={{ padding: '10px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
                                  جاري تحميل المزيد...
                                </div>
                              )}
                              <div ref={productObserverTarget} style={{ height: '1px' }}></div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Inline Quick Add Product Form (Single Line) ── */}
                  {showQuickAddProduct && (
                    <div style={{
                      marginTop: 10,
                      padding: '10px 12px',
                      background: 'rgba(37, 99, 235, 0.04)',
                      border: '1.5px solid rgba(37, 99, 235, 0.15)',
                      borderRadius: '10px',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start',
                      animation: 'slideDown 0.2s ease',
                      flexWrap: 'nowrap',
                      overflowX: 'auto'
                    }}>
                      <style>{`@keyframes slideDown { from { opacity:0; transform:translateY(-5px); } to { opacity:1; transform:translateY(0); } }`}</style>
                      
                      {/* Name with prediction */}
                      <div style={{ position: 'relative', flex: '2', minWidth: '160px' }}>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            placeholder="اسم المنتج *"
                            value={quickProductForm.name}
                            onChange={e => handleQuickProductNameChange(e.target.value)}
                            onFocus={() => setQuickProductSuggestionFocused(true)}
                            onBlur={() => setTimeout(() => setQuickProductSuggestionFocused(false), 200)}
                            autoFocus
                            style={{
                              width: '100%', height: '40px',
                              paddingRight: 32, paddingLeft: 10,
                              border: quickProductSuggestions.length > 0 ? '1.5px solid #f59e0b' : '1px solid var(--border-strong)',
                              borderRadius: '8px', fontSize: '0.9rem',
                              boxSizing: 'border-box'
                            }}
                          />
                          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            <i className="fa-solid fa-box"></i>
                          </span>

                          {/* Prediction Dropdown */}
                          {quickProductSuggestionFocused && quickProductSuggestions.length > 0 && (
                            <div style={{
                              position: 'absolute', top: '105%', right: 0, zIndex: 9999, minWidth: '280px',
                              background: '#fff', border: '1.5px solid #f59e0b', borderRadius: 10,
                              boxShadow: '0 10px 28px rgba(245,158,11,0.2)', padding: 5
                            }}>
                              <div style={{ padding: '6px 10px 5px', fontSize: '0.72rem', color: '#92400e', background: 'rgba(245,158,11,0.08)', borderRadius: 7, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                                <i className="fa-solid fa-triangle-exclamation"></i>
                                <strong>منتجات مشابهة موجودة</strong> — اختر أحدها
                              </div>
                              {quickProductSuggestions.map(p => (
                                <div
                                  key={p.id}
                                  onMouseDown={() => { handleSelectExistingFromQuickPanel(p); toast(`تم إضافة "${p.name}" للفاتورة`, 'success'); }}
                                  style={{ padding: '9px 12px', cursor: 'pointer', borderRadius: 7, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2, transition: 'background 0.12s' }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.08)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(245,158,11,0.12)', display: 'grid', placeItems: 'center', color: '#d97706', fontSize: '0.75rem' }}>
                                      <i className="fa-solid fa-box"></i>
                                    </div>
                                    <div>
                                      <div style={{ fontWeight: 600, fontSize: '0.87rem' }}>{p.name}</div>
                                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>كود: {p.productCode || '—'}</div>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', background: 'rgba(37,99,235,0.08)', padding: '2px 8px', borderRadius: 99 }}>{p.salePrice} ج.م</span>
                                    <span style={{ fontSize: '0.72rem', color: '#059669', background: 'rgba(5,150,105,0.08)', padding: '2px 7px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                                      <i className="fa-solid fa-check" style={{ marginLeft: 2 }}></i>إضافة
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <input type="text" placeholder="الباركود" value={quickProductForm.productCode}
                        onChange={e => setQuickProductForm(prev => ({ ...prev, productCode: e.target.value }))}
                        style={{ height: '40px', flex: '1', minWidth: '80px', padding: '0 10px', border: '1px solid var(--border-strong)', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                      
                      <input type="text" placeholder="الوحدة *" value={quickProductForm.unitName}
                        onChange={e => setQuickProductForm(prev => ({ ...prev, unitName: e.target.value }))}
                        style={{ height: '40px', flex: '1', minWidth: '70px', padding: '0 10px', border: '1px solid var(--border-strong)', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }} />

                      <input type="number" step="0.01" min="0" placeholder="شراء *" value={quickProductForm.purchasePrice}
                        onChange={e => setQuickProductForm(prev => ({ ...prev, purchasePrice: e.target.value }))}
                        style={{ height: '40px', flex: '1', minWidth: '80px', padding: '0 10px', border: '1.5px solid rgba(239,68,68,0.3)', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }} />

                      <input type="number" step="0.01" min="0" placeholder="بيع *" value={quickProductForm.salePrice}
                        onChange={e => setQuickProductForm(prev => ({ ...prev, salePrice: e.target.value }))}
                        style={{ height: '40px', flex: '1', minWidth: '80px', padding: '0 10px', border: '1.5px solid rgba(34,197,94,0.35)', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }} />

                      <button type="button" onClick={handleSaveQuickProduct} disabled={savingQuickProduct || !quickProductForm.name.trim()}
                        className="btn-seggele btn-seggele--primary"
                        style={{ height: '40px', padding: '0 16px', fontSize: '0.85rem', whiteSpace: 'nowrap', minWidth: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {savingQuickProduct ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-plus"></i>}
                        حفظ
                      </button>
                    </div>
                  )}
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
                               {item.isNewProduct ? (
                                 <>
                                   <td style={{ position: inlineActiveIndex === index ? 'relative' : 'static', zIndex: inlineActiveIndex === index ? 99 : 1 }}>
                                     <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '220px' }}>
                                       <div style={{ position: 'relative' }}>
                                         <input 
                                           type="text" 
                                           className="form-control" 
                                           placeholder="اسم المنتج الجديد *" 
                                           value={item.name} 
                                           onFocus={() => setInlineActiveIndex(index)}
                                           onBlur={() => setTimeout(() => setInlineActiveIndex(null), 250)}
                                           onChange={(e) => handleInlineNameChange(index, e.target.value)} 
                                           style={{ height: '34px', fontSize: '0.9rem', border: '1px dashed var(--primary-color)' }}
                                         />
                                         {inlineActiveIndex === index && inlineSuggestions.length > 0 && (
                                           <div style={{ 
                                             position: 'absolute', 
                                             top: '105%', 
                                             left: 0, 
                                             minWidth: '280px', 
                                             background: '#ffffff', 
                                             border: '1.5px solid var(--border-strong)', 
                                             borderRadius: '10px', 
                                             boxShadow: '0 10px 25px rgba(0,0,0,0.2)', 
                                             zIndex: 99999, 
                                             maxHeight: '220px', 
                                             overflowY: 'auto',
                                             padding: '4px'
                                           }}>
                                             {inlineSuggestions.map(p => (
                                               <div
                                                 key={p.id}
                                                 onMouseDown={() => handleSelectInlineSuggestion(index, p)}
                                                 style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}
                                                 onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-soft)'}
                                                 onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                               >
                                                 <span style={{ fontWeight: '600' }}>{p.name} (موجود مسبقاً)</span>
                                                 <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>السعر: {p.salePrice} | الكود: {p.productCode || '-'}</span>
                                               </div>
                                             ))}
                                           </div>
                                         )}
                                       </div>
                                       <div style={{ display: 'flex', gap: '6px' }}>
                                         <input 
                                           type="text" 
                                           className="form-control" 
                                           placeholder="الباركود" 
                                           value={item.productCode} 
                                           onChange={(e) => {
                                             const newItems = [...invoiceItems];
                                             newItems[index].productCode = e.target.value;
                                             setInvoiceItems(newItems);
                                           }} 
                                           style={{ height: '30px', fontSize: '0.8rem', flex: 1 }}
                                         />
                                         <input 
                                           type="number" 
                                           className="form-control" 
                                           placeholder="سعر الشراء *" 
                                           value={item.otherPrice} 
                                           onChange={(e) => {
                                             const newItems = [...invoiceItems];
                                             newItems[index].otherPrice = e.target.value;
                                             setInvoiceItems(newItems);
                                           }} 
                                           style={{ height: '30px', fontSize: '0.8rem', flex: 1, border: '1px dashed var(--primary-color)' }}
                                         />
                                       </div>
                                     </div>
                                   </td>
                                   <td>
                                     <input 
                                       type="text" 
                                       className="form-control" 
                                       placeholder="الوحدة *" 
                                       value={item.unitName} 
                                       onChange={(e) => {
                                         const newItems = [...invoiceItems];
                                         newItems[index].unitName = e.target.value;
                                         setInvoiceItems(newItems);
                                       }} 
                                       style={{ height: '34px', fontSize: '0.9rem', border: '1px dashed var(--primary-color)' }}
                                     />
                                   </td>
                                 </>
                               ) : (
                                 <>
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
                                           if (selectedUnit) newItems[index].unitPrice = selectedUnit.salePrice || newItems[index].productObj?.salePrice || 0;
                                           else newItems[index].unitPrice = newItems[index].productObj?.salePrice || 0;
                                           setInvoiceItems(newItems);
                                         }}
                                       >
                                         <option value="">{item.productObj?.unitName || 'الأساسية'}</option>
                                         {(item.units || []).map(u => <option key={u.id} value={u.id}>{u.unitName} ({u.conversionFactor})</option>)}
                                       </select>
                                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                     </div>
                                   </td>
                                 </>
                               )}
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

export default AddSale;
