import React, { useState, useEffect, useRef } from 'react';
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

  // ─── Product Search / Unsaved Draft Product Rows ───────────────────────────
  const [categories, setCategories] = useState([]);

  const createEmptyProductDraftRow = () => ({
    draftId: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    existingProductId: '',
    existingProductObj: null,
    units: [],
    unitId: '',
    name: '',
    productCode: '',
    quantity: 1,
    purchasePrice: '',
    profitMargin: '',
    salePrice: '',
    unitName: 'قطعة',
    discountValue: '',
    discountType: 'FIXED'
  });
  const [productDraftRows, setProductDraftRows] = useState(() => [createEmptyProductDraftRow()]);
  const [activeProductDraftRowId, setActiveProductDraftRowId] = useState(null);
  const [quickProductSuggestions, setQuickProductSuggestions] = useState([]);
  const [quickProductSuggestionsLoading, setQuickProductSuggestionsLoading] = useState(false);
  const [quickProductSuggestionFocused, setQuickProductSuggestionFocused] = useState(false);
  const productDraftNameRefs = useRef({});
  const activeProductDraftRowIdRef = useRef(null);
  const productSuggestionBlurTimerRef = useRef(null);

  const formatMoneyInput = (value) => {
    if (!Number.isFinite(value)) return '';
    return String(Math.round((value + Number.EPSILON) * 100) / 100);
  };

  const calculateSalePrice = (purchasePrice, profitMargin) => {
    const purchase = Number(purchasePrice);
    const margin = Number(profitMargin);
    if (purchasePrice === '' || profitMargin === '' || !Number.isFinite(purchase) || !Number.isFinite(margin)) return '';
    return formatMoneyInput(purchase * (1 + (margin / 100)));
  };

  const updateProductDraftRow = (draftId, updates) => {
    setProductDraftRows(prev => prev.map(row => {
      if (row.draftId !== draftId) return row;
      const nextValues = typeof updates === 'function' ? updates(row) : updates;
      return { ...row, ...nextValues };
    }));
  };

  const handleDraftProductNameChange = (draftId, val) => {
    updateProductDraftRow(draftId, {
      name: val,
      existingProductId: '',
      existingProductObj: null,
      units: [],
      unitId: ''
    });
    setActiveProductDraftRowId(draftId);
    activeProductDraftRowIdRef.current = draftId;
    if (!val.trim()) setQuickProductSuggestions([]);
  };

  const handleDraftProductNameFocus = (draftId) => {
    if (productSuggestionBlurTimerRef.current) {
      clearTimeout(productSuggestionBlurTimerRef.current);
      productSuggestionBlurTimerRef.current = null;
    }
    activeProductDraftRowIdRef.current = draftId;
    setActiveProductDraftRowId(draftId);
    setQuickProductSuggestionFocused(true);
  };

  const handleDraftProductNameBlur = (draftId) => {
    if (productSuggestionBlurTimerRef.current) clearTimeout(productSuggestionBlurTimerRef.current);
    productSuggestionBlurTimerRef.current = setTimeout(() => {
      if (activeProductDraftRowIdRef.current === draftId) {
        setQuickProductSuggestionFocused(false);
      }
    }, 200);
  };

  useEffect(() => () => {
    if (productSuggestionBlurTimerRef.current) clearTimeout(productSuggestionBlurTimerRef.current);
  }, []);

  const activeProductDraftRow = productDraftRows.find(row => row.draftId === activeProductDraftRowId);

  useEffect(() => {
    const query = activeProductDraftRow?.name?.trim() || '';

    if (!quickProductSuggestionFocused || !query || !formSelectedBranchId) {
      setQuickProductSuggestions([]);
      setQuickProductSuggestionsLoading(false);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setQuickProductSuggestionsLoading(true);
      try {
        const response = await Api.getProductsPaged(0, 8, query, 'id,desc', formSelectedBranchId);
        if (cancelled) return;
        const results = response?.items || response?.content || (Array.isArray(response) ? response : []);
        setQuickProductSuggestions(results.slice(0, 8));
      } catch (error) {
        if (!cancelled) {
          console.warn('Failed to load quick product suggestions', error);
          setQuickProductSuggestions([]);
        }
      } finally {
        if (!cancelled) setQuickProductSuggestionsLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeProductDraftRow?.name, activeProductDraftRowId, quickProductSuggestionFocused, formSelectedBranchId]);

  const handleSelectExistingFromDraft = (draftId, prod) => {
    const units = prod.units || [];
    const defaultUnit = units.find(unit => unit.isDefaultPurchase);
    const purchasePrice = defaultUnit?.purchasePrice ?? prod.purchasePrice ?? 0;
    const salePrice = defaultUnit?.salePrice ?? prod.salePrice ?? 0;
    const profitMargin = Number(purchasePrice) > 0
      ? formatMoneyInput(((Number(salePrice) - Number(purchasePrice)) / Number(purchasePrice)) * 100)
      : '';

    updateProductDraftRow(draftId, {
      existingProductId: prod.id,
      existingProductObj: prod,
      units,
      unitId: defaultUnit?.id || '',
      name: prod.name || '',
      productCode: prod.productCode || '',
      unitName: defaultUnit?.unitName || prod.unitName || 'قطعة',
      purchasePrice: formatMoneyInput(Number(purchasePrice)),
      salePrice: formatMoneyInput(Number(salePrice)),
      profitMargin
    });
    setQuickProductSuggestions([]);
    setQuickProductSuggestionFocused(false);
  };

  const handleDraftPurchasePriceChange = (draftId, value) => {
    updateProductDraftRow(draftId, row => ({
      purchasePrice: value,
      salePrice: row.profitMargin === '' ? row.salePrice : calculateSalePrice(value, row.profitMargin)
    }));
  };

  const handleDraftProfitMarginChange = (draftId, value) => {
    updateProductDraftRow(draftId, row => ({
      profitMargin: value,
      salePrice: value === '' ? row.salePrice : calculateSalePrice(row.purchasePrice, value)
    }));
  };

  const handleDraftSalePriceChange = (draftId, value) => {
    updateProductDraftRow(draftId, row => {
      const purchase = Number(row.purchasePrice);
      const sale = Number(value);
      const calculatedMargin = row.purchasePrice !== '' && value !== '' && purchase > 0 && Number.isFinite(sale)
        ? formatMoneyInput(((sale - purchase) / purchase) * 100)
        : row.profitMargin;

      return { salePrice: value, profitMargin: calculatedMargin };
    });
  };

  const addEmptyProductDraftRow = (afterDraftId) => {
    const newRow = createEmptyProductDraftRow();
    setProductDraftRows(prev => {
      const currentIndex = prev.findIndex(row => row.draftId === afterDraftId);
      const nextRows = [...prev];
      nextRows.splice(currentIndex >= 0 ? currentIndex + 1 : nextRows.length, 0, newRow);
      return nextRows;
    });
    setActiveProductDraftRowId(newRow.draftId);
    activeProductDraftRowIdRef.current = newRow.draftId;
    setQuickProductSuggestions([]);
    setQuickProductSuggestionFocused(false);
    setTimeout(() => productDraftNameRefs.current[newRow.draftId]?.focus(), 0);
  };

  const removeProductDraftRow = (draftId) => {
    setProductDraftRows(prev => {
      if (prev.length === 1) return [createEmptyProductDraftRow()];
      return prev.filter(row => row.draftId !== draftId);
    });
    setActiveProductDraftRowId(current => current === draftId ? null : current);
    if (activeProductDraftRowIdRef.current === draftId) activeProductDraftRowIdRef.current = null;
    setQuickProductSuggestions([]);
    setQuickProductSuggestionFocused(false);
  };

  const handleProductDraftKeyDown = (event, draftId) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      addEmptyProductDraftRow(draftId);
    }
  };

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
        setProductDraftRows([createEmptyProductDraftRow()]);
        setActiveProductDraftRowId(null);
        activeProductDraftRowIdRef.current = null;
        setQuickProductSuggestions([]);
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

  const isProductDraftRowEmpty = (row) => !row.existingProductId && [
    row.name,
    row.productCode,
    row.purchasePrice,
    row.profitMargin,
    row.salePrice,
    row.discountValue
  ].every(value => String(value).trim() === '') && Number(row.quantity) === 1;

  const validateProductDraftRow = (row) => {
    const purchasePrice = Number(row.purchasePrice);
    const salePrice = Number(row.salePrice);
    const quantity = Number(row.quantity);
    const discountValue = Number(row.discountValue || 0);

    if (!row.name.trim()) return 'اسم المنتج مطلوب';
    if (row.purchasePrice === '' || !Number.isFinite(purchasePrice) || purchasePrice < 0) {
      return 'أدخل سعر شراء صحيحًا';
    }
    if (!row.existingProductId && (row.salePrice === '' || !Number.isFinite(salePrice) || salePrice <= 0)) {
      return 'أدخل سعر بيع أكبر من صفر';
    }
    if (!row.unitName.trim()) return 'الوحدة الأساسية للمنتج مطلوبة';
    if (!Number.isFinite(quantity) || quantity <= 0) return 'أدخل كمية أكبر من صفر';
    if (!Number.isFinite(discountValue) || discountValue < 0) return 'أدخل خصمًا صحيحًا';
    if (row.discountType === 'PERCENTAGE' && discountValue > 100) {
      return 'نسبة الخصم لا يمكن أن تتجاوز 100%';
    }

    return '';
  };

  const buildProductDraftItem = (row) => {
    const purchasePrice = Number(row.purchasePrice);
    const salePrice = Number(row.salePrice || 0);
    const quantity = Number(row.quantity);
    const discountValue = Number(row.discountValue || 0);

    if (row.existingProductId) {
      return {
        productId: row.existingProductId,
        productObj: row.existingProductObj,
        name: row.name,
        units: row.units || [],
        unitId: row.unitId || '',
        unitName: row.unitName || 'قطعة',
        quantity,
        unitPrice: purchasePrice,
        discountValue,
        discountType: row.discountType || 'FIXED'
      };
    }

    const data = {
      name: row.name.trim(),
      description: '',
      salePrice,
      purchasePrice,
      productCode: row.productCode.trim(),
      categoryId: null,
      unitName: row.unitName.trim(),
      type: 'STANDARD',
      status: 'ACTIVE',
      trackStock: true,
      stock: 0,
      showInStore: true,
      isRawMaterial: false,
      units: []
    };

    // Local-only id: the product is not sent to the API until the invoice is saved.
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const tempProduct = { ...data, id: tempId };

    return {
      productId: tempProduct.id,
      isNewProduct: true,
      productData: data,
      productObj: tempProduct,
      name: tempProduct.name,
      units: [],
      unitId: '',
      unitName: tempProduct.unitName || 'قطعة',
      quantity,
      unitPrice: purchasePrice,
      discountValue,
      discountType: row.discountType || 'FIXED'
    };
  };

  const handleRemoveItem = (index) => {
    setInvoiceItems(prev => prev.filter((_, i) => i !== index));
  };

  // ─── Save Invoice ──────────────────────────────────────────────────────────
  const handleSaveInvoice = async () => {
    const filledDraftRows = productDraftRows.filter(row => !isProductDraftRowEmpty(row));
    const invalidRow = productDraftRows.find(row => !isProductDraftRowEmpty(row) && validateProductDraftRow(row));

    if (invalidRow) {
      const invalidRowNumber = productDraftRows.findIndex(row => row.draftId === invalidRow.draftId) + 1;
      toast(`السطر ${invalidRowNumber}: ${validateProductDraftRow(invalidRow)}`, 'warning');
      document.getElementById(`product-draft-${invalidRow.draftId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => productDraftNameRefs.current[invalidRow.draftId]?.focus(), 350);
      return;
    }

    const itemsToSave = [
      ...filledDraftRows.map(buildProductDraftItem),
      ...invoiceItems
    ];

    if (!formSelectedBranchId || !selectedWarehouseId) {
      toast('يرجى اختيار الفرع والمخزن قبل حفظ الفاتورة', 'warning');
      document.getElementById('basic')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (!invoiceForm.supplierId && !(showQuickAddSupplier && quickSupplierForm.name.trim())) {
      toast('يرجى اختيار المورد أو إدخال بيانات مورد جديد', 'warning');
      document.getElementById('basic')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (itemsToSave.length === 0) {
      toast('يجب إضافة منتج واحد على الأقل للفاتورة', 'warning');
      document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

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
    for (const item of itemsToSave) {
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
      if (invoiceItems.length === 0 && !productDraftRows.some(row => !isProductDraftRowEmpty(row))) {
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
  const savedRowsSubtotal = invoiceItems.reduce((sum, item) => {
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

  const draftRowsSubtotal = productDraftRows.reduce((sum, row) => {
    if (isProductDraftRowEmpty(row)) return sum;
    const quantity = Number(row.quantity);
    const purchasePrice = Number(row.purchasePrice);
    const baseTotal = Number.isFinite(quantity) && quantity > 0 && Number.isFinite(purchasePrice)
      ? quantity * purchasePrice
      : 0;
    const rawDiscount = Number(row.discountValue || 0);
    const safeDiscount = Number.isFinite(rawDiscount) ? rawDiscount : 0;
    const discountAmount = row.discountType === 'PERCENTAGE'
      ? baseTotal * (Math.min(Math.max(safeDiscount, 0), 100) / 100)
      : Math.max(safeDiscount, 0);
    return sum + Math.max(0, baseTotal - discountAmount);
  }, 0);
  const subtotal = savedRowsSubtotal + draftRowsSubtotal;

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

  const productDraftLabelStyle = {
    display: 'block',
    marginBottom: '6px',
    color: 'var(--text-muted)',
    fontSize: '0.76rem',
    fontWeight: 700,
    whiteSpace: 'nowrap'
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
            disabled={saving || (invoiceItems.length === 0 && !productDraftRows.some(row => !isProductDraftRowEmpty(row)))}
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

            <section className="settings-card" style={{ overflow: 'visible' }}>
              <div className="card-body" style={{ overflow: 'visible' }}>
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
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
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
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
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
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
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
                          <div style={{
                            position: 'absolute',
                            top: 'calc(100% + 6px)',
                            left: 0,
                            right: 0,
                            zIndex: 2000,
                            background: 'var(--bg-elevated, #fff)',
                            border: '1px solid var(--border)',
                            borderRadius: '10px',
                            maxHeight: '320px',
                            overflowY: 'auto',
                            boxShadow: '0 14px 34px rgba(15,23,42,0.18)',
                            padding: '6px'
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '10px',
                              padding: '7px 10px',
                              marginBottom: '4px',
                              borderRadius: '7px',
                              background: 'rgba(37,99,235,0.07)',
                              color: 'var(--primary-color)',
                              fontSize: '0.76rem'
                            }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <i className={`fa-solid ${loadingSuppliers ? 'fa-spinner fa-spin' : 'fa-users'}`}></i>
                                <strong>{loadingSuppliers ? 'جاري البحث عن الموردين...' : 'اقتراحات الموردين'}</strong>
                              </span>
                              {!loadingSuppliers && suppliers.length > 0 && (
                                <span style={{ color: 'var(--text-muted)' }}>{suppliers.length} نتائج</span>
                              )}
                            </div>

                            {loadingSuppliers ? (
                              <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                                <i className="fa-solid fa-spinner fa-spin" style={{ marginLeft: '7px' }}></i>
                                جاري تحميل الاقتراحات
                              </div>
                            ) : suppliers.length === 0 ? (
                              <div style={{ padding: '16px 12px', textAlign: 'center' }}>
                                <div style={{ width: 38, height: 38, margin: '0 auto 8px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                                  <i className="fa-solid fa-user-slash"></i>
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginBottom: '10px' }}>
                                  لا يوجد مورد مطابق{supplierSearch.trim() ? ` لـ «${supplierSearch.trim()}»` : ''}
                                </div>
                                <button
                                  type="button"
                                  className="btn-seggele btn-seggele--secondary btn-sm"
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    setQuickSupplierForm(prev => ({ ...prev, name: supplierSearch.trim() }));
                                    setShowQuickAddSupplier(true);
                                    setShowSupplierDropdown(false);
                                  }}
                                >
                                  <i className="fa-solid fa-user-plus"></i> إضافة مورد جديد
                                </button>
                              </div>
                            ) : (
                              suppliers.map(s => (
                                <div
                                  key={s.id}
                                  onMouseDown={(e) => { e.preventDefault(); handleSelectSupplier(s); }}
                                  style={{ padding: '10px 12px', cursor: 'pointer', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '3px', transition: 'background 0.12s ease, transform 0.12s ease' }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'var(--surface-2)';
                                    e.currentTarget.style.transform = 'translateX(-2px)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.transform = 'translateX(0)';
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                    <div style={{ width: 36, height: 36, flex: '0 0 36px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(37,99,235,0.1)', color: 'var(--primary-color)', fontWeight: 800 }}>
                                      {s.name?.trim()?.charAt(0) || <i className="fa-solid fa-user"></i>}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '3px' }}>
                                        {s.phone && <span><i className="fa-solid fa-phone" style={{ marginLeft: '4px' }}></i>{s.phone}</span>}
                                        {s.address && <span><i className="fa-solid fa-location-dot" style={{ marginLeft: '4px' }}></i>{s.address}</span>}
                                        {!s.phone && !s.address && <span>لا توجد بيانات اتصال إضافية</span>}
                                      </div>
                                    </div>
                                  </div>
                                  <span style={{ flexShrink: 0, color: 'var(--metro-green)', fontSize: '0.76rem', fontWeight: 700 }}>
                                    اختيار <i className="fa-solid fa-arrow-left" style={{ marginRight: '4px' }}></i>
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      <button type="button" className="btn-seggele btn-seggele--secondary" style={{ whiteSpace: 'nowrap', height: '46px', margin: 0 }} onClick={() => setShowQuickAddSupplier(!showQuickAddSupplier)}>
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
                        <input type="text" placeholder="مثال: شركة النور" value={quickSupplierForm.name} onChange={e => setQuickSupplierForm({ ...quickSupplierForm, name: e.target.value })} />
                      </div>
                      <div className="field">
                        <label>رقم الهاتف</label>
                        <input type="text" placeholder="01000000000" value={quickSupplierForm.phone} onChange={e => setQuickSupplierForm({ ...quickSupplierForm, phone: e.target.value })} />
                      </div>
                      <div className="field">
                        <label>العنوان</label>
                        <input type="text" placeholder="الفيوم، مصر" value={quickSupplierForm.address} onChange={e => setQuickSupplierForm({ ...quickSupplierForm, address: e.target.value })} />
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
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>ابحث داخل كل سطر عن منتج موجود أو أدخل منتجًا جديدًا، ثم حدّد الكمية والأسعار.</p>
              </div>
            </div>

            <section className="settings-card" style={{ overflow: 'visible' }}>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', overflow: 'visible' }}>

                <div className="field field--full" style={{ display: 'contents' }}>
                  {/* ── Inline Quick Add Product Form (Single Line) ── */}
                  {productDraftRows.map((row, rowIndex) => (
                    <div
                      key={row.draftId}
                      id={`product-draft-${row.draftId}`}
                      onKeyDown={(event) => handleProductDraftKeyDown(event, row.draftId)}
                      style={{
                        order: 3,
                        marginTop: 10,
                        padding: '10px 12px',
                        background: 'rgba(37, 99, 235, 0.04)',
                        border: '1.5px solid rgba(37, 99, 235, 0.15)',
                        borderRadius: '10px',
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'flex-start',
                        animation: 'slideDown 0.2s ease',
                        flexWrap: 'wrap',
                        overflow: 'visible',
                        marginBottom: 25
                      }}>
                      <style>{`@keyframes slideDown { from { opacity:0; transform:translateY(-5px); } to { opacity:1; transform:translateY(0); } }`}</style>

                      <div style={{ flex: '1 0 100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '0 2px 2px' }}>
                        <strong style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.9rem' }}>
                          <i className="fa-solid fa-box-open" style={{ color: 'var(--primary-color)' }}></i>
                          سطر المنتج {rowIndex + 1}
                        </strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '99px',
                            color: row.existingProductId ? 'var(--metro-green)' : isProductDraftRowEmpty(row) ? 'var(--text-muted)' : 'var(--metro-orange)',
                            background: row.existingProductId ? 'rgba(5,150,105,0.1)' : isProductDraftRowEmpty(row) ? 'var(--surface-2)' : 'rgba(245,158,11,0.1)',
                            fontSize: '0.72rem',
                            fontWeight: 700
                          }}>
                            {row.existingProductId ? 'منتج موجود' : isProductDraftRowEmpty(row) ? 'سطر فارغ' : 'منتج جديد'}
                          </span>
                          <button
                            type="button"
                            className="btn btn-icon btn-ghost"
                            onClick={() => removeProductDraftRow(row.draftId)}
                            title="حذف السطر"
                            aria-label={`حذف سطر المنتج ${rowIndex + 1}`}
                            style={{ width: 34, height: 34, color: 'var(--metro-red)', border: '1px solid rgba(239,68,68,0.25)' }}
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      </div>

                      {/* Name with prediction */}
                      <div style={{ position: 'relative', flex: '2', minWidth: '160px' }}>
                        <label style={productDraftLabelStyle}>اسم المنتج <span className="required">*</span></label>
                        <div style={{ position: 'relative' }}>
                          <input
                            ref={element => {
                              if (element) productDraftNameRefs.current[row.draftId] = element;
                              else delete productDraftNameRefs.current[row.draftId];
                            }}
                            type="text"
                            placeholder="ابحث عن منتج موجود أو اكتب اسم منتج جديد *"
                            value={row.name}
                            onChange={e => handleDraftProductNameChange(row.draftId, e.target.value)}
                            onFocus={() => handleDraftProductNameFocus(row.draftId)}
                            onBlur={() => handleDraftProductNameBlur(row.draftId)}
                            autoFocus={rowIndex === 0}
                            style={{
                              width: '100%', height: '40px',
                              paddingRight: 32, paddingLeft: 10,
                              border: activeProductDraftRowId === row.draftId && quickProductSuggestionFocused && row.name.trim() ? '1.5px solid #f59e0b' : '1px solid var(--border-strong)',
                              borderRadius: '8px', fontSize: '0.9rem',
                              boxSizing: 'border-box'
                            }}
                          />
                          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            <i className="fa-solid fa-box"></i>
                          </span>

                          {/* Prediction Dropdown */}
                          {activeProductDraftRowId === row.draftId && quickProductSuggestionFocused && row.name.trim() && (
                            <div style={{
                              position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 9999,
                              width: 'min(430px, calc(100vw - 48px))', minWidth: '300px',
                              maxHeight: '320px', overflowY: 'auto',
                              background: 'var(--bg-elevated, #fff)', border: '1.5px solid #f59e0b', borderRadius: 10,
                              boxShadow: '0 14px 34px rgba(15,23,42,0.2)', padding: 5
                            }}>
                              <div style={{ padding: '6px 10px 5px', fontSize: '0.72rem', color: '#92400e', background: 'rgba(245,158,11,0.08)', borderRadius: 7, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                                <i className={`fa-solid ${quickProductSuggestionsLoading ? 'fa-spinner fa-spin' : 'fa-magnifying-glass'}`}></i>
                                <strong>{quickProductSuggestionsLoading ? 'جاري البحث...' : 'اقتراحات المنتجات'}</strong>
                                {!quickProductSuggestionsLoading && quickProductSuggestions.length > 0 && <span>— اختر منتجًا لإضافته</span>}
                              </div>

                              {quickProductSuggestionsLoading ? (
                                <div style={{ padding: '18px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                  <i className="fa-solid fa-spinner fa-spin" style={{ marginLeft: 7 }}></i>
                                  جاري تحميل الاقتراحات
                                </div>
                              ) : quickProductSuggestions.length === 0 ? (
                                <div style={{ padding: '16px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                  <i className="fa-solid fa-circle-info" style={{ marginLeft: 7 }}></i>
                                  لا توجد منتجات مطابقة — يمكنك متابعة إدخال المنتج الجديد.
                                </div>
                              ) : (
                                quickProductSuggestions.map(p => (
                                  <div
                                    key={p.id}
                                    onMouseDown={(event) => {
                                      event.preventDefault();
                                      handleSelectExistingFromDraft(row.draftId, p);
                                      toast(`تم اختيار "${p.name}" للسطر الحالي`, 'success');
                                    }}
                                    style={{ padding: '9px 12px', cursor: 'pointer', borderRadius: 7, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 2, transition: 'background 0.12s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.08)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                      <div style={{ width: 28, height: 28, flex: '0 0 28px', borderRadius: '50%', background: 'rgba(245,158,11,0.12)', display: 'grid', placeItems: 'center', color: '#d97706', fontSize: '0.75rem' }}>
                                        <i className="fa-solid fa-box"></i>
                                      </div>
                                      <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.87rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>كود: {p.productCode || '—'} • شراء: {p.purchasePrice || 0} ج.م</div>
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', background: 'rgba(37,99,235,0.08)', padding: '2px 8px', borderRadius: 99 }}>{p.salePrice || 0} ج.م</span>
                                      <span style={{ fontSize: '0.72rem', color: '#059669', whiteSpace: 'nowrap' }}>
                                        <i className="fa-solid fa-plus" style={{ marginLeft: 3 }}></i>إضافة للفاتورة
                                      </span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ flex: '1', minWidth: '100px' }}>
                        <label style={productDraftLabelStyle}>الباركود</label>
                        <input type="text" placeholder="اختياري" value={row.productCode}
                          onChange={e => updateProductDraftRow(row.draftId, { productCode: e.target.value })}
                          style={{ width: '100%', height: '40px', padding: '0 10px', border: '1px solid var(--border-strong)', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                      </div>

                      <div style={{ flex: '1', minWidth: '90px' }}>
                        <label style={productDraftLabelStyle}>الوحدة <span className="required">*</span></label>
                        <input type="text" placeholder="قطعة" value={row.unitName}
                          onChange={e => updateProductDraftRow(row.draftId, { unitName: e.target.value, unitId: '' })}
                          style={{ width: '100%', height: '40px', padding: '0 10px', border: '1px solid var(--border-strong)', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                      </div>

                      <div style={{ flex: '0.8', minWidth: '85px' }}>
                        <label style={productDraftLabelStyle}>الكمية <span className="required">*</span></label>
                        <input type="number" step="0.01" min="0.01" placeholder="1" value={row.quantity}
                          onChange={e => updateProductDraftRow(row.draftId, { quantity: e.target.value })}
                          style={{ width: '100%', height: '40px', padding: '0 10px', border: '1px solid var(--border-strong)', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                      </div>

                      <div style={{ flex: '1', minWidth: '100px' }}>
                        <label style={productDraftLabelStyle}>سعر الشراء <span className="required">*</span></label>
                        <input type="number" step="0.01" min="0" placeholder="0.00" value={row.purchasePrice}
                          onChange={e => handleDraftPurchasePriceChange(row.draftId, e.target.value)}
                          style={{ width: '100%', height: '40px', padding: '0 10px', border: '1.5px solid rgba(239,68,68,0.3)', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                      </div>

                      <div style={{ flex: '0.85', minWidth: '100px' }}>
                        <label style={productDraftLabelStyle}>هامش الربح</label>
                        <div style={{ position: 'relative' }}>
                          <input type="number" step="0.01" min="0" placeholder="0" value={row.profitMargin}
                            onChange={e => handleDraftProfitMarginChange(row.draftId, e.target.value)}
                            aria-label="هامش الربح بالنسبة المئوية"
                            style={{ width: '100%', height: '40px', padding: '0 10px 0 28px', border: '1.5px solid rgba(245,158,11,0.38)', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#d97706', fontWeight: 800 }}>%</span>
                        </div>
                      </div>

                      <div style={{ flex: '1', minWidth: '100px' }}>
                        <label style={productDraftLabelStyle}>سعر البيع <span className="required">*</span></label>
                        <input type="number" step="0.01" min="0" placeholder="0.00" value={row.salePrice}
                          onChange={e => handleDraftSalePriceChange(row.draftId, e.target.value)}
                          style={{ width: '100%', height: '40px', padding: '0 10px', border: '1.5px solid rgba(34,197,94,0.35)', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                      </div>

                      <div style={{ flex: '1.25', minWidth: '150px' }}>
                        <label style={productDraftLabelStyle}>الخصم</label>
                        <div style={{ display: 'flex', height: '40px' }}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0"
                            value={row.discountValue}
                            onChange={e => updateProductDraftRow(row.draftId, { discountValue: e.target.value })}
                            style={{ width: 'calc(100% - 56px)', height: '40px', padding: '0 10px', border: '1px solid var(--border-strong)', borderLeft: 0, borderRadius: '0 8px 8px 0', fontSize: '0.9rem', boxSizing: 'border-box' }}
                          />
                          <select
                            aria-label="نوع الخصم"
                            value={row.discountType}
                            onChange={e => updateProductDraftRow(row.draftId, { discountType: e.target.value })}
                            style={{ width: '56px', height: '40px', padding: '0 6px', border: '1px solid var(--border-strong)', borderRadius: '8px 0 0 8px', background: 'var(--bg-elevated)', boxSizing: 'border-box' }}
                          >
                            <option value="FIXED">ج.م</option>
                            <option value="PERCENTAGE">%</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div style={{ order: 3, margin: '-19px 4px 22px', color: 'var(--text-muted)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                    <i className="fa-regular fa-keyboard"></i>
                    جميع السطور غير محفوظة حتى الضغط على «حفظ الفاتورة».
                    <span>استخدم <kbd style={{ padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 5, background: 'var(--surface-2)', fontFamily: 'inherit' }}>Ctrl + Enter</kbd> لإضافة سطر فارغ جديد في أي وقت.</span>
                    <span style={{ color: 'var(--metro-orange)' }}>السطور الفارغة سيتم تجاهلها عند الحفظ.</span>
                  </div>
                </div>

                {/* Items Table */}
                {invoiceItems.length > 0 && (
                  <div className="table-responsive" style={{ order: 2, overflowX: 'auto', marginBottom: 12 }}>
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
                          <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>لا توجد منتجات في الفاتورة. اختر منتجًا من البحث بالأعلى أو أدخل منتجًا جديدًا في النموذج بالأسفل.</td></tr>
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
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
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
                )}

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
                          onChange={e => setInvoiceForm({ ...invoiceForm, discountType: e.target.value })}
                        >
                          <option value="FIXED">مبلغ ثابت</option>
                          <option value="PERCENTAGE">نسبة مئوية</option>
                        </select>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
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
