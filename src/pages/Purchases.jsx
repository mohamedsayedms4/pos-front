import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import ModalContainer from '../components/common/ModalContainer';
import Loader from '../components/common/Loader';
import { useExport } from '../utils/useExport';
import ExportProgressModal from '../components/ExportProgressModal';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useBranch } from '../context/BranchContext';

const Purchases = () => {
  const { toast } = useGlobalUI();
  const navigate = useNavigate();
  const { supplierName } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { selectedBranchId: globalBranchId, branches: contextBranches } = useBranch();
  
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState(supplierName || '');
  const [debouncedSearch, setDebouncedSearch] = useState(supplierName || '');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [sort, setSort] = useState('id,desc');
  const fileInputRef = React.useRef(null);
  const [importingExcel, setImportingExcel] = useState(false);
  const { exportState, triggerExport, closeExportModal } = useExport();

  useEffect(() => {
    const handleOutsideClick = (e) => {
      const menu = document.getElementById('importPurchasesDropdownMenu');
      if (menu && menu.style.display === 'block' && !e.target.closest('.dropdown-import-container')) {
        menu.style.display = 'none';
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);
  
  // Analytics State
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    Api.getCategories()
      .then(res => setCategories(res || []))
      .catch(err => console.error('Failed to load categories', err));
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Modal State
  const [modalType, setModalType] = useState(null); // 'form', 'payment', 'details', 'cancel'
  const [activePurchase, setActivePurchase] = useState(null);
  const [editingPurchaseId, setEditingPurchaseId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!selectedBranchId) {
      toast('يرجى اختيار الفرع والمخزن أولاً لتحديد وجهة الاستيراد', 'warning');
      return;
    }

    setImportingExcel(true);
    toast('جاري استيراد الفواتير من ملف إكسيل...', 'info');
    try {
      const whs = await Api.getWarehousesByBranch(selectedBranchId);
      if (whs.length === 0) {
        throw new Error('لا يوجد مخازن معرفة في هذا الفرع لاستلام البضاعة');
      }
      const targetWarehouseId = whs[0].id;
      const res = await Api.importPurchasesExcel(file, selectedBranchId, targetWarehouseId);
      toast(res.data || res.message || 'تم استيراد فواتير المشتريات بنجاح', 'success');
      loadData();
      loadAnalytics(selectedBranchId);
    } catch (err) {
      toast(err.message || 'فشل استيراد فواتير المشتريات', 'error');
    } finally {
      setImportingExcel(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = async () => {
    toast('جاري تحميل نموذج الاستيراد...', 'info');
    try {
      await Api.downloadPurchasesImportTemplate();
      toast('تم تحميل النموذج بنجاح', 'success');
    } catch (err) {
      toast(err.message || 'فشل تحميل النموذج', 'error');
    }
  };

  const handleExportExcel = async () => {
    await triggerExport('PURCHASES_EXCEL', {
      query: debouncedSearch,
      branchId: selectedBranchId
    });
  };

  // Form State (New Invoice)
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [invoiceForm, setInvoiceForm] = useState({
    supplierId: '', invoiceDate: new Date().toISOString().split('T')[0], paidAmount: 0, discount: 0, discountType: 'FIXED'
  });
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  // Quick Add State
  const [showQuickAddSupplier, setShowQuickAddSupplier] = useState(false);
  const [quickSupplierForm, setQuickSupplierForm] = useState({ name: '', phone: '', address: '' });
  const [savingQuickSupplier, setSavingQuickSupplier] = useState(false);

  const [showQuickAddProduct, setShowQuickAddProduct] = useState(false);
  const [quickProductForm, setQuickProductForm] = useState({ name: '', purchasePrice: 0, salePrice: 0, productCode: '', categoryId: '', unitName: 'قطعة' });
  const [savingQuickProduct, setSavingQuickProduct] = useState(false);

  // Product Search/Pagination State
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [productPage, setProductPage] = useState(0);
  const [productTotalPages, setProductTotalPages] = useState(1);
  const [productLoading, setProductLoading] = useState(false);
  const productDropdownRef = useRef(null);
  const productObserverTarget = useRef(null);
  const [selectedProductObj, setSelectedProductObj] = useState(null);

  const handleSelectSupplier = (supplier) => {
    setInvoiceForm(prev => ({ ...prev, supplierId: supplier.id }));
    setSupplierSearch(supplier.name);
    setShowSupplierDropdown(false);
  };
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [availableBranches, setAvailableBranches] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [formSelectedBranchId, setFormSelectedBranchId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');

  // Item form — includes unit selection
  const [itemForm, setItemForm] = useState({
    productId: '', unitId: '', quantity: 1, unitPrice: 0, discountValue: 0, discountType: 'FIXED'
  });
  const [availableUnits, setAvailableUnits] = useState([]); // units of selected product
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Payment State
  const [paymentAmount, setPaymentAmount] = useState('');

  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  // Debounced supplier search
  useEffect(() => {
    if (modalType !== 'form' || invoiceForm.supplierId) return;

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
  }, [supplierSearch, formSelectedBranchId, invoiceForm.supplierId, modalType]);

  const loadProductPage = useCallback(async (page, search, append = false, branchId = formSelectedBranchId) => {
    if (modalType !== 'form' || !branchId) return;
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
  }, [formSelectedBranchId, modalType]);

  useEffect(() => {
    if (modalType !== 'form') return;
    const delayDebounceFn = setTimeout(() => {
      loadProductPage(0, productSearchQuery, false, formSelectedBranchId);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [productSearchQuery, formSelectedBranchId, modalType, loadProductPage]);

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

  // ─── Data Loading ─────────────────────────────────────────────────────────
  useEffect(() => {
    const user = Api._getUser();
    const branchFromUrl = searchParams.get('branchId');
    
    if (branchFromUrl) {
      setSelectedBranchId(branchFromUrl);
    } else if (globalBranchId) {
      setSelectedBranchId(globalBranchId);
    } else if (user && user.branchId) {
      setSelectedBranchId(user.branchId);
    }

    if (contextBranches && contextBranches.length > 0) {
      setBranches(contextBranches);
      setAvailableBranches(contextBranches);
    }
  }, [location.search, globalBranchId, contextBranches]);

  const loadData = async (page = 0, size = 10, query = debouncedSearch, sortParam = sort, branchId = selectedBranchId) => {
    setLoading(true);
    try {
      const res = await Api.getPurchasesSummary(page, size, query, branchId, sortParam);
      // Support both PaginatedResponse and direct content
      const itemsArray = res.items || res.content || (Array.isArray(res) ? res : []);
      setData(itemsArray);
      setTotalPages(res.totalPages || 0);
      setTotalElements(res.totalItems || res.totalElements || 0);
      setCurrentPage(res.currentPage ?? res.number ?? 0);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async (branchId = selectedBranchId) => {
    setLoadingAnalytics(true);
    try {
      const res = await Api.getPurchaseAnalytics(branchId);
      setAnalytics(res);
    } catch (err) {
      console.error('Failed to load purchase analytics', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    loadData(currentPage, pageSize, debouncedSearch, sort, selectedBranchId);
    if (currentPage === 0 && !debouncedSearch) {
      loadAnalytics(selectedBranchId);
    }
  }, [currentPage, debouncedSearch, sort, selectedBranchId]);

  useEffect(() => {
    if (supplierName) {
      setSearchTerm(supplierName);
      setDebouncedSearch(supplierName);
    }
  }, [supplierName]);

  // ─── Form Open ────────────────────────────────────────────────────────────
  const openForm = async () => {
    setFormErrors({});
    setEditingPurchaseId(null);
    try {
      const user = Api._getUser();
      const initialBranchId = selectedBranchId || user?.branchId || '';
      setFormSelectedBranchId(initialBranchId);

      setSuppliers([]); // Start empty, useEffect will populate with size 5
      setProducts([]);
      setProductSearchQuery('');
      setSelectedProductObj(null);

      if (initialBranchId) {
        const whs = await Api.getWarehousesByBranch(initialBranchId);
        setWarehouses(whs);
        if (whs.length > 0) setSelectedWarehouseId(whs[0].id);
      } else {
        setWarehouses([]);
        setSelectedWarehouseId('');
      }

      setInvoiceForm({ supplierId: '', invoiceDate: new Date().toISOString().split('T')[0], paidAmount: 0, discount: 0, discountType: 'FIXED' });
      setInvoiceItems([]);
      setItemForm({ productId: '', unitId: '', quantity: 1, unitPrice: 0 });
      setAvailableUnits([]);
      setSupplierSearch('');
      setShowSupplierDropdown(false);
      setModalType('form');
    } catch (err) {
      toast('فشل في جلب البيانات الأساسية', 'error');
    }
  };

  const openEdit = async (purchase) => {
    setFormErrors({});
    setLoading(true);
    try {
      const full = await Api.getPurchaseById(purchase.id);
      setEditingPurchaseId(full.id);
      setFormSelectedBranchId(full.branchId || selectedBranchId || '');

      if (full.branchId) {
        const whs = await Api.getWarehousesByBranch(full.branchId);
        setWarehouses(whs);
        if (full.warehouseId) setSelectedWarehouseId(full.warehouseId);
        else if (whs.length > 0) setSelectedWarehouseId(whs[0].id);
      }

      setInvoiceForm({
        supplierId: full.supplierId,
        invoiceDate: full.invoiceDate ? full.invoiceDate.split('T')[0] : new Date().toISOString().split('T')[0],
        paidAmount: full.paidAmount || 0,
        discount: full.discountValue || 0,
        discountType: full.discountType || 'FIXED'
      });
      setSupplierSearch(full.supplierName || '');

      setInvoiceItems((full.items || []).map(item => ({
        productId: item.productId,
        unitId: item.unitId || null,
        name: item.productName,
        unitLabel: item.unitName || 'قطعة',
        unitName: item.unitName || 'قطعة',
        packagingDesc: item.unitName || 'قطاعي',
        quantity: item.quantity,
        factor: item.conversionFactor || 1,
        qtyInBase: item.quantityInBaseUnit || item.quantity,
        unitPrice: item.unitPrice,
        discountValue: item.discountValue || 0,
        discountType: item.discountType || 'FIXED',
        discountAmount: item.discountAmount || 0,
        totalPrice: item.totalPrice
      })));

      setModalType('form');
    } catch (err) {
      toast(err.message || 'فشل تحميل بيانات الفاتورة للتعديل', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBranchChange = async (branchId) => {
    setFormSelectedBranchId(branchId);
    if (branchId) {
      try {
        const whs = await Api.getWarehousesByBranch(branchId);
        setWarehouses(whs);
        if (whs.length > 0) setSelectedWarehouseId(whs[0].id);
        else setSelectedWarehouseId('');

        if (modalType === 'form') {
          // Reset products and load via useEffect
          setProducts([]);
          setProductSearchQuery('');
          setSelectedProductObj(null);
          
          // Clearing search and ID triggers the useEffect to fetch 5 suppliers for the new branch
          setSuppliers([]);
          setSupplierSearch('');
          setInvoiceForm(prev => ({ ...prev, supplierId: '' }));
        }

      } catch (err) {
        setWarehouses([]);
        setSelectedWarehouseId('');
      }
    } else {
      setWarehouses([]);
      setSelectedWarehouseId('');
    }
  };

  const openPayment = (purchase) => {
    setFormErrors({});
    setActivePurchase(purchase);
    setPaymentAmount(purchase.remainingAmount);
    setModalType('payment');
  };

  const openDetails = async (purchase) => {
    setLoading(true);
    try {
      const fullPurchase = await Api.getPurchaseById(purchase.id);
      setActivePurchase(fullPurchase);
      setModalType('details');
    } catch (err) {
      toast(err.message || 'فشل في جلب تفاصيل الفاتورة', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCancelModal = (purchase) => {
    setActivePurchase(purchase);
    setCancelReason('');
    setModalType('cancel');
  };

  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    if (!activePurchase) return;
    setCancelling(true);
    try {
      await Api.cancelPurchaseInvoice(activePurchase.id, cancelReason);
      toast('تم إلغاء فاتورة الشراء بنجاح', 'success');
      closeModal();
      loadData();
    } catch (err) {
      toast(err.message || 'فشل إلغاء الفاتورة', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const openDeleteModal = (purchase) => {
    setActivePurchase(purchase);
    setDeleteReason('');
    setModalType('delete');
  };

  const handleConfirmDelete = async (e) => {
    e.preventDefault();
    if (!activePurchase) return;
    setDeleting(true);
    try {
      await Api.deletePurchaseInvoice(activePurchase.id, deleteReason);
      toast('تم حذف فاتورة الشراء بنجاح', 'success');
      closeModal();
      loadData();
    } catch (err) {
      toast(err.message || 'فشل حذف الفاتورة', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const closeModal = () => {
    setFormErrors({});
    setModalType(null);
    setActivePurchase(null);
    setEditingPurchaseId(null);
    setCancelReason('');
    setDeleteReason('');
  };

  // ─── Quick Add Handlers ──────────────────────────────────────────────────
  const handleSaveQuickSupplier = async (e) => {
    e.preventDefault();
    setSavingQuickSupplier(true);
    try {
      const data = { ...quickSupplierForm, type: 'LOCAL', status: 'ACTIVE' };
      const newSupplier = await Api.createSupplier(data, formSelectedBranchId);
      toast('تم إضافة المورد السريع بنجاح', 'success');
      setSuppliers(prev => [newSupplier, ...prev]);
      setSupplierSearch(newSupplier.name);
      setInvoiceForm(prev => ({ ...prev, supplierId: newSupplier.id }));
      setShowQuickAddSupplier(false);
      setQuickSupplierForm({ name: '', phone: '', address: '' });
    } catch (err) {
      toast(err.message || 'فشل إضافة المورد', 'error');
    } finally {
      setSavingQuickSupplier(false);
    }
  };

  const handleSaveQuickProduct = async (e) => {
    e.preventDefault();
    setSavingQuickProduct(true);
    try {
      const data = {
        name: quickProductForm.name,
        price: quickProductForm.salePrice,
        purchasePrice: quickProductForm.purchasePrice,
        productCode: quickProductForm.productCode,
        categoryId: quickProductForm.categoryId ? parseInt(quickProductForm.categoryId) : null,
        unitName: quickProductForm.unitName || 'قطعة',
        type: 'STANDARD',
        status: 'ACTIVE',
        trackStock: true
      };
      const newProduct = await Api.createProduct(data, null, formSelectedBranchId);
      toast('تم إضافة المنتج السريع بنجاح', 'success');
      setProducts(prev => [newProduct, ...prev]);
      handleProductChange(newProduct.id, newProduct);
      setShowQuickAddProduct(false);
      setQuickProductForm({ name: '', purchasePrice: 0, salePrice: 0, productCode: '', categoryId: '', unitName: 'قطعة' });
    } catch (err) {
      toast(err.message || 'فشل إضافة المنتج', 'error');
    } finally {
      setSavingQuickProduct(false);
    }
  };

  // ─── Product Selection → load units ───────────────────────────────────────
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
    setItemForm(prev => ({ ...prev, productId, unitId: '', unitPrice: prod.purchasePrice || 0 }));

    // Fetch units for this product
    setLoadingUnits(true);
    try {
      const units = prod.units || [];
      setAvailableUnits(units);

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
      const prod = products.find(p => p.id == itemForm.productId) || selectedProductObj;
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
  const handleAddItem = async () => {
    let finalProductId = itemForm.productId;
    let finalProductObj = products.find(p => p.id == itemForm.productId) || selectedProductObj;
    
    if (showQuickAddProduct && quickProductForm.name) {
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
        const newProduct = await Api.createProduct(data, null, formSelectedBranchId);
        finalProductId = newProduct.id;
        finalProductObj = newProduct;
        setProducts(prev => [newProduct, ...prev]);
        setShowQuickAddProduct(false);
        setQuickProductForm({ name: '', purchasePrice: 0, salePrice: 0, productCode: '', categoryId: '', unitName: 'قطعة' });
      } catch (err) {
        toast('فشل إنشاء المنتج: ' + (err.message || ''), 'error');
        return;
      }
    }

    if (!finalProductId) { toast('يرجى اختيار المنتج أو إضافة بيانات منتج جديد', 'warning'); return; }

    const qty = parseFloat(itemForm.quantity);
    let price = parseFloat(itemForm.unitPrice);
    
    if (finalProductObj && (isNaN(price) || price === 0)) {
       price = parseFloat(finalProductObj.purchasePrice || 0);
    }

    if (isNaN(qty) || qty <= 0) { toast('الكمية غير صحيحة', 'warning'); return; }
    if (isNaN(price) || price < 0) { toast('السعر غير صحيح', 'warning'); return; }

    const unit = availableUnits.find(u => u.id == itemForm.unitId);
    const factor = unit ? parseFloat(unit.conversionFactor) : 1;
    const qtyInBase = qty * factor;

    const unitLabel = unit
      ? `${unit.unitName} (تحتوي على ${unit.conversionFactor} ${finalProductObj?.unitName || 'قطعة'})`
      : (finalProductObj?.unitName || 'الوحدة الأساسية');

    let baseTotal = qtyInBase * price;
    let itemDiscVal = parseFloat(itemForm.discountValue) || 0;
    let itemDiscType = itemForm.discountType || 'FIXED';
    let itemDiscAmount = 0;
    if (itemDiscVal > 0) {
        if (itemDiscType === 'PERCENTAGE') itemDiscAmount = baseTotal * (itemDiscVal / 100);
        else itemDiscAmount = itemDiscVal;
    }
    let finalItemTotal = baseTotal - itemDiscAmount;
    if (finalItemTotal < 0) finalItemTotal = 0;

    setInvoiceItems(prev => [...prev, {
      productId: parseInt(finalProductId),
      unitId: itemForm.unitId ? parseInt(itemForm.unitId) : null,
      name: finalProductObj?.name,
      unitLabel,
      unitName: finalProductObj?.unitName || 'قطعة',
      packagingDesc: unit ? `1 ${unit.unitName} = ${unit.conversionFactor} ${finalProductObj?.unitName || 'قطعة'}` : 'قطاعي',
      quantity: qty,
      factor,
      qtyInBase,
      unitPrice: price,
      discountValue: itemDiscVal,
      discountType: itemDiscType,
      discountAmount: itemDiscAmount,
      totalPrice: finalItemTotal
    }]);

    // Reset item form but keep product for quick multi-unit entry
    setItemForm(prev => ({ ...prev, quantity: 1, discountValue: 0, discountType: 'FIXED' }));
  };

  const handleRemoveItem = (index) => {
    setInvoiceItems(prev => prev.filter((_, i) => i !== index));
  };

  // ─── Save Invoice ──────────────────────────────────────────────────────────
  const handleSaveInvoice = async (e) => {
    e.preventDefault();
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

    if (!finalSupplierId) { toast('يرجى اختيار المورد أو تعبئة بيانات مورد جديد', 'warning'); setSaving(false); return; }
    if (invoiceItems.length === 0) { toast('يجب إضافة منتج واحد على الأقل', 'warning'); setSaving(false); return; }

    if (!formSelectedBranchId || !selectedWarehouseId) {
      toast('يرجى اختيار الفرع والمخزن', 'warning');
      setSaving(false);
      return;
    }

    const payload = {
      supplierId: parseInt(finalSupplierId),
      branchId: parseInt(formSelectedBranchId),
      warehouseId: parseInt(selectedWarehouseId),
      invoiceDate: new Date(invoiceForm.invoiceDate).toISOString(),
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
      if (editingPurchaseId) {
        await Api.updatePurchaseInvoice(editingPurchaseId, payload);
        toast('تم تعديل الفاتورة بنجاح', 'success');
      } else {
        await Api.createPurchase(payload);
        toast('تم إضافة الفاتورة بنجاح', 'success');
      }
      closeModal();
      loadData();
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
    setFormErrors({});
    try {
      await Api.payPurchaseInvoice(activePurchase.id, amount);
      toast('تم تسجيل الدفعة بنجاح', 'success');
      closeModal();
      loadData();
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
  const items = data;
  const filteredSuppliers = suppliers || [];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        /* Responsive CSS Overrides for Purchases Page */
        @media (max-width: 1024px) {
          .toolbar {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
            display: flex !important;
          }
          .toolbar select, 
          .toolbar .search-input,
          .toolbar .search-input input {
            width: 100% !important;
            max-width: 100% !important;
            height: 40px !important;
          }
        }
      `}</style>
      <div className="page-section" style={{ direction: 'rtl' }}>
        {/* Analytics Dashboard */}
        {!loadingAnalytics && analytics && (
          <div className="analytics-section" style={{ marginBottom: '24px' }}>
            <div className="analytics-dashboard-grid">
              {/* Status Distribution - Circular Chart */}
              <div className="card" style={{ margin: 0, padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                  <span style={{ fontSize: '1.2rem' }}><i className="fa-solid fa-chart-column"></i></span>
                  <h4 style={{ fontSize: '0.9rem', margin: 0, fontWeight: 700 }}>توزيع المديونيات</h4>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
                  <div style={{ width: '180px', height: '180px' }}>
                    {(() => {
                      const pieData = ['PAID', 'PARTIAL', 'UNPAID'].map(status => {
                        const stat = analytics.statusStats.find(s => s.status === status) || { count: 0, totalAmount: 0 };
                        return {
                          name: status === 'PAID' ? 'مدفوع' : status === 'PARTIAL' ? 'جزئي' : 'غير مدفوع',
                          value: Number(stat.totalAmount) || 0,
                          count: stat.count,
                          color: status === 'PAID' ? '#10b981' : status === 'PARTIAL' ? '#f59e0b' : '#f43f5e'
                        };
                      }).filter(d => d.value > 0);

                      return (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                              formatter={(value) => [`${value.toLocaleString()} ج.م`, 'الإجمالي']}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', minWidth: '150px' }}>
                    {['PAID', 'PARTIAL', 'UNPAID'].map(status => {
                      const stat = analytics.statusStats.find(s => s.status === status) || { count: 0, totalAmount: 0 };
                      const config = {
                        PAID: { label: 'مدفوعة بالكامل', color: '#10b981' },
                        PARTIAL: { label: 'مدفوعة جزئياً', color: '#f59e0b' },
                        UNPAID: { label: 'غير مدفوعة', color: '#f43f5e' }
                      }[status];
                      const totalAll = analytics.statusStats.reduce((sum, s) => sum + Number(s.totalAmount), 0);
                      const percent = totalAll > 0 ? ((stat.totalAmount / totalAll) * 100).toFixed(1) : 0;

                      return (
                        <div key={status} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: config.color, marginTop: '4px' }} />
                          <div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
                              {config.label}
                              <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{percent}%</span>
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: 700 }}>{Number(stat.totalAmount).toLocaleString()}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Top Suppliers Card */}
              <div className="card" style={{ margin: 0, padding: '15px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}><i className="fa-solid fa-trophy"></i></span>
                  <h4 style={{ fontSize: '0.9rem', margin: 0, fontWeight: 700 }}>أهم الموردين</h4>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {analytics.topSuppliers.length > 0 ? (
                    analytics.topSuppliers.slice(0, 3).map((sup, idx) => {
                      const maxVal = analytics.topSuppliers[0].totalAmount || 1;
                      const percent = (sup.totalAmount / maxVal) * 100;
                      return (
                        <div key={idx} style={{ position: 'relative' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', position: 'relative', zIndex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ 
                                width: '18px', height: '18px', borderRadius: '50%', 
                                background: idx === 0 ? 'var(--metro-yellow)' : idx === 1 ? '#C0C0C0' : '#CD7F32',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '10px', fontWeight: 800
                              }}>{idx + 1}</span>
                              <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-light)', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sup.name}</span>
                            </div>
                            <span style={{ color: 'var(--accent-emerald)', fontWeight: 700, fontSize: '0.85rem' }}>{Number(sup.totalAmount).toLocaleString()}</span>
                          </div>
                          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${percent}%`, height: '100%', background: 'var(--metro-blue)', transition: 'width 1s ease-out' }} />
                          </div>
                        </div>
                      );
                    })
                  ) : <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-dim)', padding: '10px' }}>لا توجد بيانات</div>}
                </div>
              </div>
            </div>

            {/* Daily Trend Chart */}
            <div className="card" style={{ padding: '15px' }}>
              <div className="card-header" style={{ padding: '0 0 10px 0', border: 'none' }}>
                <h4 style={{ fontSize: '0.9rem', margin: 0 }}><i className="fa-solid fa-arrow-trend-up"></i> إجمالي المشتريات اليومية (أخر 30 يوم)</h4>
              </div>
              <div style={{ height: '200px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <ComposedChart data={analytics.dailyTrend.map(d => ({
                    date: new Date(d.statDate).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
                    total: d.totalPurchases
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#777', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#777', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(val) => [`${Number(val).toLocaleString()} ج.م`, 'إجمالي الشراء']}
                    />
                    <Bar dataKey="total" fill="var(--metro-blue)" radius={[4, 4, 0, 0]} barSize={30} opacity={0.8} />
                    <Line type="monotone" dataKey="total" stroke="var(--accent-emerald)" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <h3><i className="fa-solid fa-cart-shopping"></i> إدارة المشتريات</h3>
            <div className="toolbar">
              <div className="search-input">
                <input
                  type="text"
                  placeholder="بحث برقم الفاتورة أو المورد..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(0);
                  }}
                />
                <span className="search-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
              </div>

              <select 
                className="form-control" 
                value={selectedBranchId} 
                onChange={(e) => setSelectedBranchId(e.target.value)}
                style={{ width: '180px', height: '40px', padding: '0 10px' }}
                disabled={!Api.can('ROLE_ADMIN')}
              >
                <option value="">كل الفروع</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>

              <select 
                className="form-control" 
                value={sort} 
                onChange={(e) => {
                  setSort(e.target.value);
                  setCurrentPage(0);
                }}
                style={{ width: '180px', height: '40px', padding: '0 10px' }}
              >
                <option value="id,desc">الأحدث أولاً</option>
                <option value="id,asc">الأقدم أولاً</option>
                <option value="totalAmount,desc">الأعلى سعراً</option>
                <option value="totalAmount,asc">الأقل سعراً</option>
              </select>

              <div className="toolbar-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImportExcel} 
                  accept=".xlsx, .xls" 
                  style={{ display: 'none' }} 
                />

                {Api.can('PURCHASE_READ') && (
                  <button
                    className="btn btn-secondary"
                    onClick={handleExportExcel}
                    disabled={exportState.isOpen || items.length === 0}
                  >
                    تصدير إكسيل
                  </button>
                )}

                {Api.can('PURCHASE_WRITE') && (
                  <>
                    <div className="dropdown-import-container" style={{ position: 'relative', display: 'inline-block' }}>
                       <button
                         type="button"
                         className="btn btn-secondary"
                         onClick={() => {
                           const menu = document.getElementById('importPurchasesDropdownMenu');
                           if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                         }}
                         disabled={importingExcel}
                       >
                         {importingExcel ? ' جاري الاستيراد...' : ' استيراد'}
                       </button>
                       <div 
                         id="importPurchasesDropdownMenu" 
                         style={{ 
                           display: 'none', 
                           position: 'absolute', 
                           background: 'var(--bg-elevated, #1a1a1a)', 
                           minWidth: '200px', 
                           boxShadow: '0px 8px 24px rgba(0,0,0,0.3)', 
                           zIndex: 100, 
                           right: 0, 
                           borderRadius: '8px', 
                           border: '1px solid var(--border-subtle, #333)',
                           marginTop: '8px',
                           overflow: 'hidden'
                         }}
                       >
                         <button 
                           type="button"
                           onClick={() => {
                             const menu = document.getElementById('importPurchasesDropdownMenu');
                             if (menu) menu.style.display = 'none';
                             if (fileInputRef.current) fileInputRef.current.click();
                           }}
                           style={{ 
                             color: 'var(--text-main, #ffffff)', 
                             padding: '12px 16px', 
                             textDecoration: 'none', 
                             display: 'flex', 
                             alignItems: 'center',
                             justifyContent: 'flex-start',
                             gap: '10px',
                             width: '100%', 
                             border: 'none', 
                             background: 'transparent', 
                             textAlign: 'right', 
                             fontSize: '0.9rem', 
                             cursor: 'pointer',
                             transition: 'background-color 0.2s'
                           }}
                           onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover-tile, #2a2a2a)'}
                           onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                         >
                           <span style={{ fontSize: '1.1rem' }}><i className="fa-solid fa-folder-open"></i></span>
                           <span style={{ color: 'var(--text-main, #ffffff)' }}>رفع ملف إكسيل</span>
                         </button>
                         <button 
                           type="button"
                           onClick={() => {
                             const menu = document.getElementById('importPurchasesDropdownMenu');
                             if (menu) menu.style.display = 'none';
                             handleDownloadTemplate();
                           }}
                           style={{ 
                             color: 'var(--text-main, #ffffff)', 
                             padding: '12px 16px', 
                             textDecoration: 'none', 
                             display: 'flex', 
                             alignItems: 'center',
                             justifyContent: 'flex-start',
                             gap: '10px',
                             width: '100%', 
                             border: 'none', 
                             background: 'transparent', 
                             textAlign: 'right', 
                             fontSize: '0.9rem', 
                             cursor: 'pointer',
                             borderTop: '1px solid var(--border-subtle, #333)',
                             transition: 'background-color 0.2s'
                           }}
                           onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover-tile, #2a2a2a)'}
                           onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                         >
                           <span style={{ fontSize: '1.1rem' }}><i className="fa-solid fa-clipboard-list"></i></span>
                           <span style={{ color: 'var(--text-main, #ffffff)' }}>تحميل نموذج فارغ</span>
                         </button>
                       </div>
                    </div>

                    <button className="btn btn-primary" onClick={() => navigate('/purchases/add')}>
                      <span>+</span> إضافة فاتورة
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="card-body no-padding">
            <div className="table-wrapper">
              {loading ? (
                <Loader message="جاري تحميل فواتير المشتريات..." />
              ) : items.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon"><i className="fa-solid fa-cart-shopping"></i></div>
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
                        <td style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                          {(currentPage * pageSize) + i + 1}
                        </td>
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
                          <span className={`badge ${p.status === 'PAID' ? 'badge-success' : p.status === 'PARTIAL' ? 'badge-warning' : p.status === 'CANCELLED' ? 'badge-danger' : 'badge-danger'}`} style={p.status === 'CANCELLED' ? { opacity: 0.7, textDecoration: 'line-through' } : {}}>
                            {p.status === 'PAID' ? 'مدفوعة' : p.status === 'PARTIAL' ? 'جزئي' : p.status === 'CANCELLED' ? 'ملغاة' : 'غير مدفوعة'}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button className="btn btn-icon btn-ghost" title="تفاصيل الفاتورة" onClick={() => openDetails(p)}><i className="fa-solid fa-eye"></i></button>
                            {p.status !== 'CANCELLED' && Api.can('PURCHASE_WRITE') && (
                              <button className="btn btn-icon btn-ghost" title="تعديل الفاتورة" onClick={() => openEdit(p)}><i className="fa-solid fa-pen-to-square"></i></button>
                            )}
                            {p.status !== 'PAID' && p.status !== 'CANCELLED' && Api.can('PURCHASE_WRITE') && (
                              <button className="btn btn-icon btn-ghost" title="تسديد دفعة" onClick={() => openPayment(p)}><i className="fa-solid fa-sack-dollar"></i></button>
                            )}
                            {p.status !== 'CANCELLED' && Api.can('PURCHASE_WRITE') && (
                              <button className="btn btn-icon btn-ghost text-danger" title="إلغاء الفاتورة" onClick={() => openCancelModal(p)} style={{ color: 'var(--metro-red)' }}><i className="fa-solid fa-ban"></i></button>
                            )}
                            {Api.can('PURCHASE_WRITE') && (
                              <button className="btn btn-icon btn-ghost text-danger" title="حذف الفاتورة" onClick={() => openDeleteModal(p)} style={{ color: 'var(--metro-red)' }}><i className="fa-solid fa-trash"></i></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
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
        </div>
      </div>
      {/* ═══ Modal: New Invoice ═══════════════════════════════════════════════ */}
      {modalType === 'form' && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModal(); }}>
            <div className="modal" style={{ maxWidth: '860px' }}>
              <div className="modal-header">
                <h3>إنشاء فاتورة مشتريات جديدة</h3>
                <button className="modal-close" onClick={closeModal}><i className="fa-solid fa-times"></i></button>
              </div>
              <div className="modal-body">
                <form id="purchaseForm" onSubmit={handleSaveInvoice}>

                  <div className="form-row">
                    <div className="form-group">
                      <label>الفرع *</label>
                      <select 
                        className="form-control" 
                        value={formSelectedBranchId} 
                        onChange={(e) => handleBranchChange(e.target.value)}
                        disabled={!Api.can('ROLE_ADMIN')}
                        required
                      >
                        <option value="">-- اختر الفرع --</option>
                        {availableBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                      {formErrors.branchId && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.branchId}</span>}
                    </div>
                    <div className="form-group">
                      <label>المخزن (المستلم) *</label>
                      <select 
                        className="form-control" 
                        value={selectedWarehouseId} 
                        onChange={(e) => setSelectedWarehouseId(e.target.value)}
                        required
                      >
                        <option value="">-- اختر المخزن --</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                      {formErrors.warehouseId && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.warehouseId}</span>}
                    </div>
                  </div>

                  {/* Header fields */}
                  <div className="form-row">
                    <div className="form-group" style={{ position: 'relative' }}>
                      <label>المورد *</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div className="searchable-select-wrapper" style={{ position: 'relative', flex: 1 }}>
                          <input
                            type="text"
                            className="form-control"
                          placeholder="ابحث عن مورد بالاسم أو الهاتف..."
                          value={supplierSearch}
                          onFocus={() => setShowSupplierDropdown(true)}
                          onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 200)}
                          onChange={(e) => {
                            setSupplierSearch(e.target.value);
                            setInvoiceForm(prev => ({ ...prev, supplierId: '' }));
                          }}
                          required={!invoiceForm.supplierId}
                          style={{ paddingLeft: invoiceForm.supplierId ? '30px' : '12px' }}
                        />
                        {invoiceForm.supplierId && (
                          <span 
                            style={{ 
                              position: 'absolute', 
                              left: '12px', 
                              top: '50%', 
                              transform: 'translateY(-50%)', 
                              cursor: 'pointer', 
                              color: 'var(--text-muted, #888)',
                              fontSize: '0.9rem',
                              fontWeight: 'bold',
                              zIndex: 5
                            }}
                            onClick={() => {
                              setSupplierSearch('');
                              setInvoiceForm(prev => ({ ...prev, supplierId: '' }));
                              setShowSupplierDropdown(true);
                            }}
                          >
                            <i className="fa-solid fa-times"></i>
                          </span>
                        )}
                        {showSupplierDropdown && (
                          <div 
                            style={{ 
                              position: 'absolute', 
                              top: '100%', 
                              left: 0, 
                              right: 0, 
                              background: 'var(--bg-elevated, #1a1a1a)', 
                              border: '1px solid var(--border-color, #333)', 
                              borderRadius: '8px', 
                              maxHeight: '200px', 
                              overflowY: 'auto', 
                              zIndex: 1000, 
                              marginTop: '4px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                            }}
                          >
                            {loadingSuppliers ? (
                              <div style={{ padding: '10px', color: 'var(--text-muted, #888)', textAlign: 'center' }}>جاري البحث...</div>
                            ) : filteredSuppliers.length === 0 ? (
                              <div style={{ padding: '10px', color: 'var(--text-muted, #888)', textAlign: 'center' }}>لا توجد نتائج</div>
                            ) : (
                              filteredSuppliers.map(s => (
                                <div
                                  key={s.id}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelectSupplier(s);
                                  }}
                                  style={{
                                    padding: '10px 15px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid var(--border-subtle, #2a2a2a)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    backgroundColor: invoiceForm.supplierId === s.id ? 'var(--bg-hover, rgba(255,255,255,0.05))' : 'transparent',
                                    color: 'var(--text-main, #fff)'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(255,255,255,0.05))'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = invoiceForm.supplierId === s.id ? 'var(--bg-hover, rgba(255,255,255,0.05))' : 'transparent'}
                                >
                                  <span style={{ fontWeight: 600 }}>{s.name}</span>
                                  {s.phone && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #888)' }}>{s.phone}</span>}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                        </div>
                        <button 
                          type="button" 
                          className="btn btn-outline-primary" 
                          style={{ padding: '0 15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="إضافة مورد سريع"
                          onClick={() => setShowQuickAddSupplier(true)}
                        >
                          +
                        </button>
                      </div>
                      {formErrors.supplierId && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.supplierId}</span>}
                    </div>
                    {showQuickAddSupplier && (
                      <div style={{ gridColumn: '1 / -1', marginTop: '10px', padding: '15px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-color)', width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                          <h4 style={{ margin: 0, fontSize: '1rem' }}><i className="fa-solid fa-plus"></i> مورد جديد (سريع) <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal', marginRight: '5px' }}>(يُحفظ تلقائياً مع الفاتورة)</span></h4>
                          <button type="button" className="btn btn-icon btn-ghost" onClick={() => setShowQuickAddSupplier(false)}><i className="fa-solid fa-times"></i></button>
                        </div>
                        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                          <div className="form-group mb-0">
                            <input className="form-control" type="text" placeholder="اسم المورد *" value={quickSupplierForm.name} onChange={e => setQuickSupplierForm({...quickSupplierForm, name: e.target.value})} />
                          </div>
                          <div className="form-group mb-0">
                            <input className="form-control" type="text" placeholder="رقم الهاتف" value={quickSupplierForm.phone} onChange={e => setQuickSupplierForm({...quickSupplierForm, phone: e.target.value})} />
                          </div>
                          <div className="form-group mb-0">
                            <input className="form-control" type="text" placeholder="العنوان" value={quickSupplierForm.address} onChange={e => setQuickSupplierForm({...quickSupplierForm, address: e.target.value})} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="form-group">
                      <label>تاريخ الفاتورة *</label>
                      <input
                        className="form-control"
                        type="date"
                        value={invoiceForm.invoiceDate}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })}
                        required
                      />
                      {formErrors.invoiceDate && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.invoiceDate}</span>}
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
                    </div>
                  </div>

                  {/* Items section */}
                  <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    <h4 style={{ marginBottom: '15px' }}><i className="fa-solid fa-box"></i> إضافة منتجات للفاتورة</h4>
                    
                    {/* Quick Add Product Inline Form */}
                    {showQuickAddProduct && (
                      <div style={{ marginTop: '10px', padding: '15px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '15px', width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                          <h4 style={{ margin: 0, fontSize: '1rem' }}><i className="fa-solid fa-plus"></i> منتج جديد (سريع) <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal', marginRight: '5px' }}>(يُحفظ تلقائياً عند النقر على + إضافة)</span></h4>
                          <button type="button" className="btn btn-icon btn-ghost" onClick={() => setShowQuickAddProduct(false)}><i className="fa-solid fa-times"></i></button>
                        </div>
                        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                          <div className="form-group mb-0">
                            <label>اسم المنتج *</label>
                            <input className="form-control" type="text" placeholder="اسم المنتج *" value={quickProductForm.name} onChange={e => setQuickProductForm({...quickProductForm, name: e.target.value})} />
                          </div>
                          <div className="form-group mb-0">
                            <label>سعر الشراء *</label>
                            <input className="form-control" type="number" step="0.01" placeholder="سعر الشراء *" value={quickProductForm.purchasePrice || ''} onChange={e => setQuickProductForm({...quickProductForm, purchasePrice: e.target.value})} />
                          </div>
                          <div className="form-group mb-0">
                            <label>سعر البيع *</label>
                            <input className="form-control" type="number" step="0.01" placeholder="سعر البيع *" value={quickProductForm.salePrice || ''} onChange={e => setQuickProductForm({...quickProductForm, salePrice: e.target.value})} />
                          </div>
                        </div>
                        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                          <div className="form-group mb-0">
                            <label>الباركود</label>
                            <input className="form-control" type="text" placeholder="الباركود (اختياري)" value={quickProductForm.productCode} onChange={e => setQuickProductForm({...quickProductForm, productCode: e.target.value})} />
                          </div>
                          <div className="form-group mb-0">
                            <label>الوحدة الأساسية *</label>
                            <input className="form-control" type="text" placeholder="الوحدة الأساسية *" value={quickProductForm.unitName} onChange={e => setQuickProductForm({...quickProductForm, unitName: e.target.value})} />
                          </div>
                          <div className="form-group mb-0">
                            <label>التصنيف</label>
                            <select className="form-control" value={quickProductForm.categoryId} onChange={e => setQuickProductForm({...quickProductForm, categoryId: e.target.value})}>
                              <option value="">بدون تصنيف</option>
                              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}


                    {/* Item add row */}
                    <div className="form-row" style={{ alignItems: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>

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
                                    onClick={() => {
                                      handleProductChange('');
                                      setShowProductDropdown(false);
                                    }}
                                  >
                                    -- اختر --
                                  </div>
                                  {products.map(p => (
                                    <div 
                                      key={p.id} 
                                      className="dropdown-option"
                                      style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle, #eee)', backgroundColor: itemForm.productId === p.id ? 'var(--bg-hover, #f5f5f5)' : 'transparent' }}
                                      onClick={() => {
                                        handleProductChange(p.id, p);
                                        setShowProductDropdown(false);
                                      }}
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
                          <button 
                            type="button" 
                            className="btn btn-outline-primary" 
                            style={{ padding: '0 15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="إضافة منتج سريع"
                            onClick={() => setShowQuickAddProduct(!showQuickAddProduct)}
                          >
                            +
                          </button>
                        </div>
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
                          <i className="fa-solid fa-box"></i> استلام: {qty} {unit.unitName} (كل {unit.unitName} فيها {unit.conversionFactor} {prod?.unitName || 'قطعة'})
                          <br/>
                          <i className="fa-solid fa-arrow-trend-down"></i> سيتم إضافة <strong>{inBase.toFixed(3)} {prod?.unitName || 'وحدة'}</strong> للمخزون
                        </div>
                      );
                    })()}

                    {/* Items table */}
                    <div className="table-wrapper">
                      <table className="data-table" style={{ marginTop: '10px' }}>
                        <thead>
                          <tr>
                            <th>المنتج</th>
                            <th>الوحدة</th>
                            <th>الكمية</th>
                            <th>= عدد القطع</th>
                            <th>السعر</th>
                            <th>الخصم</th>
                            <th>الإجمالي</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceItems.length === 0 ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>لا توجد أصناف مضافة</td></tr>
                          ) : invoiceItems.map((item, idx) => (
                            <tr key={idx}>
                              <td>{item.name}</td>
                              <td><small>{item.unitLabel}</small></td>
                              <td>{item.quantity}</td>
                              <td>{item.qtyInBase} {item.unitName}</td>
                              <td>{item.unitPrice.toFixed(2)}</td>
                              <td>
                                 {item.discountValue > 0 ? (
                                    item.discountType === 'PERCENTAGE' ? `${item.discountValue}%` : item.discountValue
                                 ) : '-'}
                              </td>
                              <td style={{ fontWeight: 600 }}>{item.totalPrice.toFixed(2)}</td>
                              <td>
                                <button type="button" className="btn btn-icon btn-ghost" onClick={() => handleRemoveItem(idx)}><i className="fa-solid fa-trash"></i></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: 'var(--bg-elevated)', fontWeight: 800 }}>
                            <td colSpan="6" style={{ textAlign: 'left' }}>الإجمالي قبل الخصم:</td>
                            <td style={{ color: 'var(--metro-blue)', fontSize: '1.1rem' }}>{subtotal.toFixed(2)}</td>
                            <td></td>
                          </tr>
                          {discountVal > 0 && (
                            <tr style={{ background: 'var(--bg-elevated)', fontWeight: 800 }}>
                              <td colSpan="6" style={{ textAlign: 'left' }}>الخصم ({discountType === 'PERCENTAGE' ? `${discountVal}%` : `$${discountVal}`}):</td>
                              <td style={{ color: 'var(--metro-red)', fontSize: '1.1rem' }}>- {invoiceDiscAmount.toFixed(2)}</td>
                              <td></td>
                            </tr>
                          )}
                          <tr style={{ background: 'var(--bg-elevated)', fontWeight: 800 }}>
                            <td colSpan="6" style={{ textAlign: 'left' }}>الصافي:</td>
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
      {modalType === 'payment' && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModal(); }}>
            <div className="modal" style={{ maxWidth: '450px' }}>
              <div className="modal-header">
                <h3>تسجيل دفعة للمورد — {activePurchase.supplierName}</h3>
                <button className="modal-close" onClick={closeModal}><i className="fa-solid fa-times"></i></button>
              </div>
              <div className="modal-body">
                <p style={{ marginBottom: '15px' }}>رقم الفاتورة: <strong>{activePurchase.invoiceNumber}</strong></p>
                <p style={{ marginBottom: '15px' }}>المتبقي: <strong style={{ color: 'var(--metro-red)' }}>{Number(activePurchase.remainingAmount).toFixed(2)} ج.م</strong></p>
                
                <form id="paymentForm" onSubmit={handleSavePayment}>
                  <div className="form-group">
                    <label>المبلغ المدفوع *</label>
                    <input
                      className="form-control"
                      type="number"
                      step="0.01"
                      max={activePurchase.remainingAmount}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      required
                    />
                    {formErrors.amount && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.amount}</span>}
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>إلغاء</button>
                <button type="submit" form="paymentForm" className="btn btn-success" disabled={saving}>
                  {saving ? 'جاري الحفظ...' : 'تأكيد الدفع'}
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {/* ═══ Modal: Details ══════════════════════════════════════════════════ */}
      {modalType === 'details' && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModal(); }}>
            <div className="modal" style={{ maxWidth: '700px' }}>
              <div className="modal-header">
                <h3>تفاصيل فاتورة المشتريات</h3>
                <button className="modal-close" onClick={closeModal}><i className="fa-solid fa-times"></i></button>
              </div>
              <div className="modal-body">
                <div className="invoice-header-info" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px', padding: '15px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                  <div>
                    <p>رقم الفاتورة: <strong>{activePurchase.invoiceNumber}</strong></p>
                    <p>المورد: <strong>{activePurchase.supplierName}</strong></p>
                    <p>الفرع: <strong>{activePurchase.branchName || '—'}</strong></p>
                  </div>
                  <div>
                    <p>التاريخ: <strong>{new Date(activePurchase.invoiceDate).toLocaleDateString('ar-EG')}</strong></p>
                    <p>المخزن: <strong>{activePurchase.warehouseName || '—'}</strong></p>
                    <p>الحالة: <strong>{activePurchase.status === 'PAID' ? 'مدفوعة' : 'آجلة/جزئي'}</strong></p>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>المنتج</th>
                        <th>الكمية</th>
                        <th>سعر الوحدة</th>
                        <th>الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activePurchase.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.productName}</td>
                          <td>{item.quantity} {item.unitName}</td>
                          <td>{item.unitPrice.toFixed(2)}</td>
                          <td style={{ fontWeight: 600 }}>{item.totalPrice.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <td colSpan="3" style={{ textAlign: 'left' }}>إجمالي الفاتورة:</td>
                        <td style={{ fontWeight: 800, fontSize: '1.1rem' }}>{Number(activePurchase.totalAmount).toFixed(2)} ج.م</td>
                      </tr>
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'left' }}>المدفوع:</td>
                        <td style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>{Number(activePurchase.paidAmount).toFixed(2)} ج.م</td>
                      </tr>
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'left' }}>المتبقي:</td>
                        <td style={{ color: 'var(--metro-red)', fontWeight: 800 }}>{Number(activePurchase.remainingAmount).toFixed(2)} ج.م</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={closeModal}>إغلاق</button>
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    closeModal();
                    navigate(`/purchases/view/${activePurchase.id}`);
                  }}
                >
                  عرض التفاصيل الكاملة <i className="fa-solid fa-file-lines"></i>
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {/* ═══ Modal: Cancel Purchase ══════════════════════════════════════════ */}
      {modalType === 'cancel' && activePurchase && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModal(); }}>
            <div className="modal" style={{ maxWidth: '480px' }}>
              <div className="modal-header">
                <h3>إلغاء فاتورة شراء — {activePurchase.invoiceNumber}</h3>
                <button className="modal-close" onClick={closeModal}><i className="fa-solid fa-times"></i></button>
              </div>
              <div className="modal-body">
                <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', marginBottom: '15px' }}>
                  <p style={{ color: 'var(--metro-red)', fontWeight: 600, margin: 0, fontSize: '0.9rem' }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ marginLeft: '6px' }}></i>
                    تحذير: إلغاء الفاتورة سيعكس الكميات المتاحة في المخزن ويخصم المبالغ من المورد والخزنة دون حذف السجلات المالية بشكل نهائي.
                  </p>
                </div>

                <form id="cancelPurchaseForm" onSubmit={handleConfirmCancel}>
                  <div className="form-group">
                    <label>سبب الإلغاء (اختياري)</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="أدخل سبب إلغاء الفاتورة..."
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                    ></textarea>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>إلغاء</button>
                <button type="submit" form="cancelPurchaseForm" className="btn btn-danger" disabled={cancelling} style={{ background: 'var(--metro-red)' }}>
                  {cancelling ? 'جاري الإلغاء...' : 'تأكيد إلغاء الفاتورة'}
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {/* ═══ Modal: Delete Purchase ══════════════════════════════════════════ */}
      {modalType === 'delete' && activePurchase && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModal(); }}>
            <div className="modal" style={{ maxWidth: '480px' }}>
              <div className="modal-header">
                <h3>حذف فاتورة شراء — {activePurchase.invoiceNumber}</h3>
                <button className="modal-close" onClick={closeModal}><i className="fa-solid fa-times"></i></button>
              </div>
              <div className="modal-body">
                <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', marginBottom: '15px' }}>
                  <p style={{ color: 'var(--metro-red)', fontWeight: 600, margin: 0, fontSize: '0.9rem' }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ marginLeft: '6px' }}></i>
                    تحذير: سيتم حذف الفاتورة وعكس كل تأثيراتها — خصم الكميات من المخزون، تعديل مديونية المورد، وإلغاء حركات الخزنة المرتبطة بها.
                    إذا كان جزء من الكمية المشتراة قد تم بيعه أو صرفه بالفعل، سيتم تصفير المخزون المتبقي منها فقط دون رفض عملية الحذف.
                    لن يتم حذف السجل نهائيًا من قاعدة البيانات (حذف آمن يمكن الرجوع لتفاصيله لاحقًا لأغراض المراجعة).
                  </p>
                </div>

                <form id="deletePurchaseForm" onSubmit={handleConfirmDelete}>
                  <div className="form-group">
                    <label>سبب الحذف (اختياري)</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="أدخل سبب حذف الفاتورة..."
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                    ></textarea>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>تراجع</button>
                <button type="submit" form="deletePurchaseForm" className="btn btn-danger" disabled={deleting} style={{ background: 'var(--metro-red)' }}>
                  {deleting ? 'جاري الحذف...' : 'تأكيد حذف الفاتورة'}
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      <ExportProgressModal exportState={exportState} onClose={closeExportModal} />
    </>
  );
};

export default Purchases;
