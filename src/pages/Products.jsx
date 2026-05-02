import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import JsBarcode from 'jsbarcode';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import Api, { SERVER_URL } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import ModalContainer from '../components/common/ModalContainer';
import Loader from '../components/common/Loader';
import ScannerModal from '../components/common/ScannerModal';
import { useBranch } from '../context/BranchContext';
import '../styles/pages/ProductsPremium.css';

// Reusable CustomSelect Component for Premium UI
// Reusable CustomSelect Component (Matched with Categories/Suppliers)
const CustomSelect = ({ options, value, onChange, icon, label }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => String(opt.value) === String(value));

  return (
    <div className="prd-custom-select-container" ref={containerRef}>
      <div className={`prd-custom-select-header ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        {icon && <span className="icon-start">{icon}</span>}
        <span className="selected-text">{selectedOption ? selectedOption.label : label}</span>
        <i className={`fas fa-chevron-down icon-end ${isOpen ? 'rotate' : ''}`}></i>
      </div>
      
      {isOpen && (
        <div className="prd-custom-select-dropdown">
          {options.map(option => (
            <div 
              key={option.value} 
              className={`prd-custom-select-item ${String(value) === String(option.value) ? 'active' : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
              {String(value) === String(option.value) && <i className="fas fa-check"></i>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Products = () => {
  const location = useLocation();
  const { toast, confirm } = useGlobalUI();
  const { selectedBranchId: globalBranchId, branches: contextBranches } = useBranch();
  
  const [data, setData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [dailySales, setDailySales] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState('id,desc'); // Default sort
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '', description: '', purchasePrice: '', salePrice: '', stock: '0', productCode: '', categoryId: '', unitName: 'القطعة', showInStore: true,
    units: [] // List of packaging units
  });
  const [images, setImages] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Print Barcode State
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printProduct, setPrintProduct] = useState(null);
  const [printing, setPrinting] = useState(false);

  // Printer Config State
  const [printerConfigModalOpen, setPrinterConfigModalOpen] = useState(false);
  const [printerConfig, setPrinterConfig] = useState(null);
  const [availablePrinters, setAvailablePrinters] = useState([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingPrint, setTestingPrint] = useState(false);

  // Distribution Modal State
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockProduct, setStockProduct] = useState(null);
  const [stockForm, setStockForm] = useState({ warehouseId: '', quantity: '', minQuantity: '', maxQuantity: '' });
  const [savingStock, setSavingStock] = useState(false);
  const [allWarehouses, setAllWarehouses] = useState([]);

  /**
   * Convert a blob: URL to a data: URL (base64-embedded).
   * This ensures the image bytes are fully loaded BEFORE we write the print HTML.
   */
  const _blobUrlToDataUrl = (blobUrl) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('فشل تحميل صورة الباركود'));
      img.src = blobUrl;
    });
  };

  /**
   * Print a barcode label using a hidden iframe.
   * Fixes for XP-370B blank thermal labels:
   *  - Image is a data: URL (fully loaded, no network fetch)
   *  - Uses iframe instead of popup (more reliable with thermal printers)
   *  - NO 'landscape' keyword (it swaps dimensions and confuses thermal drivers)
   *  - @page size: auto — lets the PRINTER DRIVER control actual paper size
   *  - Image sized conservatively to never overflow one label
   */
  const _openPrintWindow = (dataUrl, widthMm, heightMm) => {
    // Remove any previous print iframe
    const oldFrame = document.getElementById('__barcode_print_frame');
    if (oldFrame) oldFrame.remove();

    // Create hidden iframe
    const iframe = document.createElement('iframe');
    iframe.id = '__barcode_print_frame';
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow.document;

    // Conservative image sizing: 4mm less than label to guarantee no overflow
    const sw = widthMm - 4;
    const sh = heightMm - 4;

    // Minified HTML with NO landscape keyword
    doc.open();
    doc.write([
      '<!DOCTYPE html><html><head><meta charset="utf-8">',
      '<style>',
      '@page{size:auto;margin:0}',
      '*{margin:0;padding:0;box-sizing:border-box}',
      `html,body{width:${widthMm}mm;height:${heightMm}mm;overflow:hidden;background:#fff}`,
      `body{display:flex;align-items:center;justify-content:center}`,
      `img{max-width:${sw}mm;max-height:${sh}mm;width:auto;height:auto;display:block;object-fit:contain}`,
      '@media print{html,body{overflow:hidden}img{page-break-inside:avoid;page-break-after:avoid;page-break-before:avoid}}',
      '</style></head>',
      `<body><img src="${dataUrl}"/></body></html>`,
    ].join(''));
    doc.close();

    // Wait for image to render, then print
    const img = doc.querySelector('img');
    const doPrint = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        window.print(); // fallback
      }
      // Cleanup after a delay
      setTimeout(() => {
        const f = document.getElementById('__barcode_print_frame');
        if (f) f.remove();
      }, 2000);
    };

    if (img.complete && img.naturalWidth > 0) {
      setTimeout(doPrint, 100);
    } else {
      img.onload = () => setTimeout(doPrint, 100);
      img.onerror = () => {
        console.error('Failed to load barcode image for print');
        const f = document.getElementById('__barcode_print_frame');
        if (f) f.remove();
      };
    }
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      await Api.exportProductsExcel(debouncedSearch, sort, selectedBranchId);
      toast('تم تصدير ملف الإكسيل بنجاح', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      await Api.exportProductsPdf(debouncedSearch, sort, selectedBranchId);
      toast('تم تصدير ملف PDF بنجاح', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setExportingPdf(false);
    }
  };

  const openPrinterConfig = async () => {
    try {
      const config = await Api.getPrinterConfig();
      setPrinterConfig(config || {
        printerName: 'XP-370B',
        labelWidthMm: 40,
        labelHeightMm: 30,
        marginMm: 1.5,
        nameFontSize: 7,
        priceFontSize: 8,
        barcodeFontSize: 6
      });
      setPrinterConfigModalOpen(true);
      refreshPrinters();
    } catch (err) {
      toast('فشل جلب الإعدادات', 'error');
    }
  };

  const refreshPrinters = async () => {
    setLoadingPrinters(true);
    try {
      const printers = await Api.getAvailablePrinters();
      setAvailablePrinters(printers || []);
    } catch (err) {
      console.error('Failed to fetch printers:', err);
    } finally {
      setLoadingPrinters(false);
    }
  };

  const savePrinterConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await Api.updatePrinterConfig(printerConfig);
      toast('تم حفظ إعدادات الطابعة بنجاح', 'success');
      setPrinterConfigModalOpen(false);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestPrint = async () => {
    setTestingPrint(true);
    try {
      const sampleImageUrl = await Api.getProductBarcodeLabel(data.length > 0 ? data[0].id : 1);
      const width = printerConfig.labelWidthMm || 40;
      const height = printerConfig.labelHeightMm || 30;

      // Pre-load image and convert to data URL to avoid blank pages
      const dataUrl = await _blobUrlToDataUrl(sampleImageUrl);
      _openPrintWindow(dataUrl, width, height);
      toast('تم بدء اختبار الطباعة بالصورة المباشرة', 'success');
    } catch (err) {
      toast('فشل طباعة التجربة: ' + err.message, 'error');
    } finally {
      setTestingPrint(false);
    }
  };

  useEffect(() => {
    const user = Api._getUser();
    const queryParams = new URLSearchParams(location.search);
    const branchFromUrl = queryParams.get('branchId');

    if (branchFromUrl) {
      setSelectedBranchId(branchFromUrl);
    } else if (globalBranchId) {
      setSelectedBranchId(globalBranchId);
    } else if (user && user.branchId) {
      setSelectedBranchId(user.branchId);
    }
    
    if (contextBranches && contextBranches.length > 0) {
      setBranches(contextBranches);
    }
  }, [location.search, globalBranchId, contextBranches]);

  const loadData = async (searchQuery = '', sortOrder = sort, branchId = selectedBranchId) => {
    setLoading(true);
    try {
      const [productsData, categoriesData, statsData, salesData] = await Promise.all([
        Api.getProductsPaged(0, 1000, searchQuery, sortOrder, branchId).then(res => res.items),
        Api.getCategories().catch(() => []),
        Api.getProductStatistics(branchId).catch(() => null),
        Api.getDailySaleStats(7, branchId).catch(() => [])
      ]);
      setData(productsData);
      setCategories(categoriesData);
      setStats(statsData);
      setDailySales(Array.isArray(salesData) ? salesData.map(d => ({
        name: new Date(d.saleDate).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }),
        value: d.dailyTotal || 0
      })).reverse() : []);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScan = (barcode) => {
    if (!barcode) return;
    setSearchTerm(barcode);
    toast(`تم سحب الكود: ${barcode}`, 'info', true);
  };

  useEffect(() => {
    loadData(debouncedSearch, sort, selectedBranchId);
    // Pre-load warehouses for distribution modal
    Api.getAllWarehouses().then(res => setAllWarehouses(res || [])).catch(() => {});
  }, [debouncedSearch, sort, selectedBranchId]);

  const openStockModal = (product) => {
    setStockProduct(product);
    setStockForm({ warehouseId: '', quantity: '', minQuantity: '', maxQuantity: '' });
    setShowStockModal(true);
  };

  const handleUpdateStock = async (e) => {
    e.preventDefault();
    if (!stockForm.warehouseId || stockForm.quantity === '') {
      toast('المخزن والكمية مطلوبان', 'warning');
      return;
    }
    setSavingStock(true);
    try {
      await Api.addOrUpdateWarehouseStock(stockForm.warehouseId, {
        productId: stockProduct.id,
        quantity: parseFloat(stockForm.quantity),
        minQuantity: stockForm.minQuantity ? parseFloat(stockForm.minQuantity) : null,
        maxQuantity: stockForm.maxQuantity ? parseFloat(stockForm.maxQuantity) : null
      });
      toast('تم تحديث المخزون بنجاح', 'success');
      setShowStockModal(false);
      loadData(debouncedSearch, sort, selectedBranchId);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSavingStock(false);
    }
  };

  const openForm = async (product = null) => {
    setEditProduct(product);
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        purchasePrice: product.purchasePrice || '',
        salePrice: product.salePrice || '',
        stock: product.stock || '0',
        productCode: product.productCode || '',
        categoryId: product.categoryId || '',
        unitName: product.unitName || 'القطعة',
        showInStore: product.showInStore !== false,
        units: product.units || []
      });
    } else {
      setFormData({
        name: '', description: '', purchasePrice: '', salePrice: '', stock: '0', productCode: '', categoryId: '', unitName: 'القطعة', showInStore: true,
        units: []
      });
    }
    setImages(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditProduct(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.purchasePrice || !formData.salePrice) {
      toast('يرجى ملء الحقول المطلوبة', 'warning');
      return;
    }

    setSaving(true);
    const apiData = {
      ...formData,
      purchasePrice: parseFloat(formData.purchasePrice),
      salePrice: parseFloat(formData.salePrice),
      stock: parseFloat(formData.stock) || 0,
      showInStore: formData.showInStore,
      categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
    };

    try {
      if (editProduct) {
        await Api.updateProduct(editProduct.id, apiData, images);
      } else {
        await Api.createProduct(apiData, images, selectedBranchId);
      }
      toast(editProduct ? 'تم تحديث المنتج بنجاح' : 'تم إضافة المنتج بنجاح', 'success');
      closeModal();
      loadData();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const addUnitRow = () => {
    setFormData({
      ...formData,
      units: [...formData.units, { unitName: '', conversionFactor: 1, purchasePrice: 0, salePrice: 0 }]
    });
  };

  const removeUnitRow = (index) => {
    const newUnits = [...formData.units];
    newUnits.splice(index, 1);
    setFormData({ ...formData, units: newUnits });
  };

  const updateUnitRow = (index, field, value) => {
    const newUnits = [...formData.units];
    newUnits[index] = { ...newUnits[index], [field]: value };
    setFormData({ ...formData, units: newUnits });
  };

  const handleDelete = async (id, name) => {
    confirm(`سيتم حذف المنتج "${name}" نهائياً`, async () => {
      try {
        await Api.deleteProduct(id);
        toast('تم حذف المنتج بنجاح', 'success');
        loadData();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  };

  const executePrint = async (e) => {
    e.preventDefault();
    setPrinting(true);
    try {
      const imageUrl = await Api.getProductBarcodeLabel(printProduct.id);
      const config = await Api.getPrinterConfig();
      const width = config.labelWidthMm || 40;
      const height = config.labelHeightMm || 30;

      const dataUrl = await _blobUrlToDataUrl(imageUrl);
      _openPrintWindow(dataUrl, width, height);

      setPrintModalOpen(false);
      toast('جاري تحضير ملصق الباركود للطباعة...', 'success');

    } catch (err) {
      toast('فشل تحضير الباركود أو الطباعة: ' + err.message, 'error');
    } finally {
      setPrinting(false);
    }
  };

  const lowStockItems = data.filter(p => Number(p.stock) <= 10).slice(0, 3);
  const filteredItems = useMemo(() => {
    let result = data.filter(p => {
      const matchesSearch = !debouncedSearch || 
        (p.name || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (p.productCode || '').toLowerCase().includes(debouncedSearch.toLowerCase());
      
      const matchesCategory = !categoryFilter || p.categoryId === parseInt(categoryFilter);
      
      const matchesBranch = !selectedBranchId || p.branchId === parseInt(selectedBranchId);
      
      return matchesSearch && matchesCategory && matchesBranch;
    });

    // Sorting
    result.sort((a, b) => {
      const [field, order] = sort.split(',');
      const valA = a[field] ?? '';
      const valB = b[field] ?? '';
      
      if (typeof valA === 'string') {
        const comparison = valA.localeCompare(valB, 'ar');
        return order === 'asc' ? comparison : -comparison;
      } else {
        return order === 'asc' ? valA - valB : valB - valA;
      }
    });

    return result;
  }, [data, debouncedSearch, categoryFilter, selectedBranchId, sort]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const currentItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, categoryFilter, selectedBranchId, sort]);

  return (
    <div className="products-page-container">
      {/* Header Section */}
      <div className="prd-header-container">
        <div className="prd-breadcrumbs">
          <Link to="/">الرئيسية</Link>
          <span>/</span>
          <span>المنتجات</span>
        </div>
        <div className="prd-header-row">
          <h1>المنتجات</h1>
          <div className="prd-header-actions">
            <button className="prd-btn-primary" onClick={() => openForm(null)}>
              <i className="fas fa-plus"></i>
              <span>إضافة منتج</span>
            </button>
            <Link to="/products/analytics" className="prd-btn-ghost" title="تحليلات متقدمة">
              <span>تحليلات</span>
              <i className="fas fa-chart-pie"></i>
            </Link>
            <button className="prd-btn-ghost" onClick={handleExportExcel} title="تصدير إكسيل">
              <span>إكسيل</span>
              <i className="fas fa-file-excel"></i>
            </button>
            <button className="prd-btn-ghost" onClick={handleExportPdf} title="تصدير PDF">
              <span>PDF</span>
              <i className="fas fa-file-pdf"></i>
            </button>
            <button className="prd-btn-ghost" onClick={openPrinterConfig} title="إعدادات الطابعة">
              <span>إعدادات</span>
              <i className="fas fa-cog"></i>
            </button>
          </div>
        </div>
      </div>

      <div className="products-dashboard">
        {/* SUMMARY CARDS */}
        <div className="prd-stats-grid">
          <div className="prd-stat-card">
            <div className="prd-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <i className="fas fa-box"></i>
            </div>
            <div className="prd-stat-info">
              <div className="prd-stat-label">إجمالي المنتجات</div>
              <div className="prd-stat-value">{stats?.totalProducts || 0}</div>
              <div className={`prd-stat-trend ${stats?.totalProductsGrowth >= 0 ? 'prd-trend-up' : 'prd-trend-down'}`}>
                <i className={`fas fa-caret-${stats?.totalProductsGrowth >= 0 ? 'up' : 'down'}`}></i>
                <span>{Math.abs(stats?.totalProductsGrowth || 0).toFixed(1)}% هذا الشهر</span>
              </div>
            </div>
          </div>

          <div className="prd-stat-card">
            <div className="prd-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <i className="fas fa-money-bill-wave"></i>
            </div>
            <div className="prd-stat-info">
              <div className="prd-stat-label">قيمة المخزون</div>
              <div className="prd-stat-value">
                {(stats?.totalInventoryCapital || 0).toLocaleString()}
                <span style={{ fontSize: '0.9rem', marginRight: '4px' }}>ج.م</span>
              </div>
              <div className={`prd-stat-trend ${stats?.totalInventoryCapitalGrowth >= 0 ? 'prd-trend-up' : 'prd-trend-down'}`}>
                <i className={`fas fa-caret-${stats?.totalInventoryCapitalGrowth >= 0 ? 'up' : 'down'}`}></i>
                <span>{Math.abs(stats?.totalInventoryCapitalGrowth || 0).toFixed(1)}% هذا الشهر</span>
              </div>
            </div>
          </div>

          <div className="prd-stat-card">
            <div className="prd-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <i className="fas fa-chart-line"></i>
            </div>
            <div className="prd-stat-info">
              <div className="prd-stat-label">الأرباح المتوقعة</div>
              <div className="prd-stat-value">
                {(stats?.totalExpectedProfit || 0).toLocaleString()}
                <span style={{ fontSize: '0.9rem', marginRight: '4px' }}>ج.م</span>
              </div>
              <div className={`prd-stat-trend ${stats?.totalExpectedProfitGrowth >= 0 ? 'prd-trend-up' : 'prd-trend-down'}`}>
                <i className={`fas fa-caret-${stats?.totalExpectedProfitGrowth >= 0 ? 'up' : 'down'}`}></i>
                <span>{Math.abs(stats?.totalExpectedProfitGrowth || 0).toFixed(1)}% هذا الشهر</span>
              </div>
            </div>
          </div>

          <div className="prd-stat-card">
            <div className="prd-stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
              <i className="fas fa-shopping-cart"></i>
            </div>
            <div className="prd-stat-info">
              <div className="prd-stat-label">إجمالي المبيعات</div>
              <div className="prd-stat-value">
                {dailySales.reduce((acc, curr) => acc + curr.value, 0).toLocaleString()}
                <span style={{ fontSize: '0.9rem', marginRight: '4px' }}>طلب</span>
              </div>
              <div className={`prd-stat-trend ${stats?.totalSalesGrowth >= 0 ? 'prd-trend-up' : 'prd-trend-down'}`}>
                <i className={`fas fa-caret-${stats?.totalSalesGrowth >= 0 ? 'up' : 'down'}`}></i>
                <span>{Math.abs(stats?.totalSalesGrowth || 0).toFixed(1)}% هذا الشهر</span>
              </div>
            </div>
          </div>
        </div>

        {/* ANALYTICS GRID */}
        <div className="prd-analytics-grid">
          <div className="prd-analytics-card">
            <div className="prd-card-title-row">
              <div className="prd-card-title">
                <i className="fas fa-chart-area" style={{ color: 'var(--prd-primary)' }}></i>
                مبيعات آخر 7 أيام
              </div>
              <CustomSelect 
                label="آخر 7 أيام"
                value="7"
                options={[{ label: 'آخر 7 أيام', value: '7' }, { label: 'آخر 30 يوم', value: '30' }]}
                onChange={() => {}}
              />
            </div>
            <div className="prd-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySales}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--prd-primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--prd-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--prd-glass-border)" />
                  <XAxis 
                    dataKey="name" 
                    stroke="var(--prd-text-secondary)" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: 'var(--prd-text-secondary)' }}
                  />
                  <YAxis 
                    stroke="var(--prd-text-secondary)" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}K` : val}
                    tick={{ fill: 'var(--prd-text-secondary)' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'var(--prd-card-bg)', 
                      backdropFilter: 'blur(10px)',
                      border: '1px solid var(--prd-glass-border)', 
                      borderRadius: '12px',
                      boxShadow: 'var(--prd-shadow)',
                      color: 'var(--prd-text-primary)'
                    }}
                    itemStyle={{ color: 'var(--prd-primary)', fontWeight: 700 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="var(--prd-primary)" 
                    strokeWidth={4} 
                    dot={{ r: 5, fill: 'var(--prd-primary)', stroke: '#fff', strokeWidth: 2 }}
                    activeDot={{ r: 8, strokeWidth: 0 }}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="prd-analytics-card">
            <div className="prd-card-title-row">
              <div className="prd-card-title">
                <i className="fas fa-bell" style={{ color: '#ef4444' }}></i>
                تنبيهات المخزون
              </div>
              <button className="prd-btn-ghost" style={{ padding: '6px 10px', fontSize: '0.8rem' }}>عرض الكل</button>
            </div>
            <div className="prd-alerts-list">
              {lowStockItems.length > 0 ? lowStockItems.map(item => (
                <div key={item.id} className="prd-alert-item">
                  <div className="prd-alert-icon">
                    <i className="fas fa-exclamation-triangle"></i>
                  </div>
                  <div className="prd-alert-info">
                    <div className="prd-alert-name">{item.name}</div>
                    <div className="prd-alert-stock">متبقي {item.stock} {item.unitName || 'قطعة'}</div>
                  </div>
                  <button className="prd-action-btn prd-btn-stock" onClick={() => openStockModal(item)}>
                    <i className="fas fa-plus"></i>
                  </button>
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--prd-text-secondary)', opacity: 0.5 }}>
                  <i className="fas fa-check-circle" style={{ fontSize: '2.5rem', marginBottom: '12px', color: '#10b981' }}></i>
                  <p>كل المنتجات متوفرة</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PRODUCTS TABLE CARD */}
        <div className="prd-main-card">
          <div className="prd-toolbar">
            <div className="prd-toolbar-left">
              <CustomSelect 
                label="ترتيب حسب"
                value={sort}
                options={[
                  { label: 'ترتيب: الاسم (أ-ي)', value: 'name,asc' },
                  { label: 'ترتيب: الاسم (ي-أ)', value: 'name,desc' },
                  { label: 'ترتيب: السعر (أقل)', value: 'salePrice,asc' },
                  { label: 'ترتيب: السعر (أعلى)', value: 'salePrice,desc' },
                  { label: 'ترتيب: المخزون', value: 'stock,desc' },
                  { label: 'ترتيب: الأحدث', value: 'id,desc' }
                ]}
                onChange={setSort}
                icon={<i className="fas fa-sort-amount-down"></i>}
              />
              <CustomSelect 
                label="كل الفئات"
                value={categoryFilter}
                options={[
                  { label: 'كل الفئات', value: '' },
                  ...categories.map(c => ({ label: c.name, value: c.id }))
                ]}
                onChange={setCategoryFilter}
                icon={<i className="fas fa-filter"></i>}
              />
              
              {branches.length > 1 && (
                <CustomSelect 
                  label="كل الفروع"
                  value={selectedBranchId}
                  options={[
                    { label: 'كل الفروع', value: '' },
                    ...branches.map(b => ({ label: b.name, value: b.id }))
                  ]}
                  onChange={setSelectedBranchId}
                  icon={<i className="fas fa-building"></i>}
                />
              )}
            </div>

            <div className="prd-toolbar-right">
              <div className="prd-search-box">
                <i className="fas fa-search"></i>
                <input 
                  type="text" 
                  placeholder="ابحث عن منتج بالاسم أو الباركود..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>
            </div>
          </div>

          <div className="prd-table-container">
            {loading ? (
              <Loader message="جاري تحميل المنتجات..." />
            ) : filteredItems.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--prd-text-secondary)' }}>
                <i className="fas fa-box-open" style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}></i>
                <h4>لا توجد منتجات</h4>
                <p>قم بإضافة منتجات جديدة للبدء</p>
              </div>
            ) : (
              <table className="prd-table">
                <thead>
                  <tr>
                    <th>المنتج</th>
                    <th>الفئة</th>
                    <th>الكود</th>
                    <th>سعر الشراء</th>
                    <th>سعر البيع</th>
                    <th>المخزون</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="prd-product-cell">
                          <img 
                            src={p.imageUrls && p.imageUrls.length > 0 
                              ? (p.imageUrls[0].startsWith('http') ? p.imageUrls[0] : `${SERVER_URL}${p.imageUrls[0]}`) 
                              : '/placeholder-product.png'} 
                            className="prd-product-img" 
                            alt={p.name} 
                          />
                          <div className="prd-product-info">
                            <Link to={`/products/${p.id}`} className="prd-product-name">{p.name}</Link>
                            <span className="prd-product-sku">{p.unitName || 'قطعة'}</span>
                          </div>
                        </div>
                      </td>
                      <td>{p.categoryName || '—'}</td>
                      <td><code>{p.productCode || '—'}</code></td>
                      <td>{Number(p.purchasePrice).toFixed(2)}</td>
                      <td style={{ fontWeight: 700 }}>{Number(p.salePrice).toFixed(2)}</td>
                      <td>
                        <span className={`prd-stock-badge ${Number(p.stock) <= 5 ? 'prd-stock-out' : Number(p.stock) <= 15 ? 'prd-stock-low' : 'prd-stock-ok'}`}>
                          {Number(p.stock).toFixed(0)}
                        </span>
                      </td>
                      <td>
                        <div className="prd-actions">
                          <button className="prd-action-btn prd-btn-stock" onClick={() => openStockModal(p)} title="توزيع المخزون">
                            <i className="fas fa-warehouse"></i>
                          </button>
                          <button className="prd-action-btn prd-btn-edit" onClick={() => openForm(p)} title="تعديل">
                            <i className="fas fa-edit"></i>
                          </button>
                          <button className="prd-action-btn prd-btn-delete" onClick={() => handleDelete(p.id, p.name)} title="حذف">
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="prd-pagination">
            <div>عرض {filteredItems.length} من أصل {data.length} منتج</div>
            <div className="prd-page-buttons">
              <button 
                className="prd-page-btn" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
              
              {[...Array(totalPages)].map((_, i) => (
                <button 
                  key={i + 1}
                  className={`prd-page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}

              <button 
                className="prd-page-btn" 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <i className="fas fa-chevron-left"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <ModalContainer>
          <div className="prd-modal-overlay" onClick={(e) => { if (e.target.classList.contains('prd-modal-overlay')) closeModal(); }}>
            <div className="prd-modal">
              <div className="prd-modal-header">
                <h3>{editProduct ? 'تعديل منتج' : 'إضافة منتج جديد'}</h3>
                <button className="prd-modal-close" onClick={closeModal}>✕</button>
              </div>
              <div className="prd-modal-body">
                <form id="productForm" onSubmit={handleSave}>
                  <div className="prd-form-group">
                    <label className="prd-label">اسم المنتج *</label>
                    <input className="prd-input" name="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  
                  <div className="prd-form-group">
                    <label className="prd-label">الوصف</label>
                    <textarea className="prd-input" style={{ minHeight: '80px' }} name="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}></textarea>
                  </div>

                  <div className="prd-form-row">
                    <div className="prd-form-group">
                      <label className="prd-label">سعر الشراء *</label>
                      <input className="prd-input" type="number" step="0.01" name="purchasePrice" value={formData.purchasePrice} onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })} required />
                    </div>
                    <div className="prd-form-group">
                      <label className="prd-label">سعر البيع *</label>
                      <input className="prd-input" type="number" step="0.01" name="salePrice" value={formData.salePrice} onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })} required />
                    </div>
                  </div>

                  <div className="prd-form-row">
                    <div className="prd-form-group">
                      <label className="prd-label">المخزون الحالي</label>
                      <input className="prd-input" type="number" step="0.001" name="stock" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} />
                    </div>
                    <div className="prd-form-group">
                      <label className="prd-label">كود المنتج (باركود)</label>
                      <input className="prd-input" name="productCode" value={formData.productCode} onChange={(e) => setFormData({ ...formData, productCode: e.target.value })} placeholder="اتركه فارغاً للتوليد التلقائي" />
                    </div>
                  </div>

                  <div className="prd-form-row">
                    <div className="prd-form-group">
                      <label className="prd-label">الفئة</label>
                      <select className="prd-input" name="categoryId" value={formData.categoryId} onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}>
                        <option value="">بدون فئة</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="prd-form-group">
                      <label className="prd-label">الوحدة الأساسية (قطاعي) *</label>
                      <input className="prd-input" name="unitName" value={formData.unitName} onChange={(e) => setFormData({ ...formData, unitName: e.target.value })} required placeholder="كيس، قطعة، كيلو..." />
                    </div>
                  </div>

                  <div className="prd-checkbox-group">
                    <input type="checkbox" id="showInStore" checked={formData.showInStore} onChange={(e) => setFormData({ ...formData, showInStore: e.target.checked })} style={{ width: '20px', height: '20px' }} />
                    <label htmlFor="showInStore" style={{ margin: 0, cursor: 'pointer', fontWeight: 600, color: formData.showInStore ? 'var(--prd-primary)' : 'var(--prd-text-secondary)' }}>
                      عرض المنتج في المتجر الإلكتروني (أونلاين)
                    </label>
                  </div>

                  <div className="prd-units-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--prd-text-primary)' }}>
                        <i className="fas fa-boxes" style={{ marginLeft: '8px' }}></i>
                        وحدات الجملة والتعبئة
                      </h4>
                      <button type="button" className="prd-btn-ghost" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={addUnitRow}>
                        + إضافة وحدة
                      </button>
                    </div>

                    {formData.units.length === 0 ? (
                      <div style={{ textAlign: 'center', color: 'var(--prd-text-secondary)', fontSize: '0.85rem', padding: '20px' }}>
                        لا توجد وحدات إضافية (مثل كرتونة، دستة...)
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {formData.units.map((unit, index) => (
                          <div key={index} className="prd-unit-card">
                            <div className="prd-form-group" style={{ marginBottom: 0 }}>
                              <label className="prd-label">اسم الوحدة</label>
                              <input className="prd-input" value={unit.unitName} onChange={(e) => updateUnitRow(index, 'unitName', e.target.value)} placeholder="مثلاً: كرتونة" />
                            </div>
                            <div className="prd-form-group" style={{ marginBottom: 0 }}>
                              <label className="prd-label">المعامل</label>
                              <input className="prd-input" type="number" value={unit.conversionFactor} onChange={(e) => updateUnitRow(index, 'conversionFactor', e.target.value)} placeholder="كم قطعة؟" />
                            </div>
                            <div className="prd-form-group" style={{ marginBottom: 0 }}>
                              <label className="prd-label">شراء</label>
                              <input className="prd-input" type="number" value={unit.purchasePrice} onChange={(e) => updateUnitRow(index, 'purchasePrice', e.target.value)} />
                            </div>
                            <div className="prd-form-group" style={{ marginBottom: 0 }}>
                              <label className="prd-label">بيع</label>
                              <input className="prd-input" type="number" value={unit.salePrice} onChange={(e) => updateUnitRow(index, 'salePrice', e.target.value)} />
                            </div>
                            <button type="button" className="prd-action-btn prd-btn-delete" style={{ marginBottom: '6px' }} onClick={() => removeUnitRow(index)}>
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="prd-form-group" style={{ marginTop: '20px' }}>
                    <label className="prd-label">صور المنتج</label>
                    <input className="prd-input" type="file" name="images" multiple accept="image/*" onChange={(e) => setImages(e.target.files)} />
                  </div>
                </form>
              </div>
              <div className="prd-modal-footer">
                <button type="button" className="prd-btn-ghost" onClick={closeModal}>إلغاء</button>
                <button type="submit" form="productForm" className="prd-btn-primary" disabled={saving}>
                  {saving ? 'جاري الحفظ...' : (editProduct ? 'تحديث المنتج' : 'حفظ المنتج')}
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {printerConfigModalOpen && printerConfig && (
        <ModalContainer>
          <div className="prd-modal-overlay" onClick={(e) => { if (e.target.classList.contains('prd-modal-overlay')) setPrinterConfigModalOpen(false); }}>
            <div className="prd-modal" style={{ maxWidth: '500px' }}>
              <div className="prd-modal-header">
                <h3><i className="fas fa-print" style={{ marginLeft: '12px' }}></i>إعدادات طابعة الباركود</h3>
                <button className="prd-modal-close" onClick={() => setPrinterConfigModalOpen(false)}>✕</button>
              </div>
              <div className="prd-modal-body">
                <form id="printerConfigForm" onSubmit={savePrinterConfig}>
                  <div className="prd-form-group">
                    <label className="prd-label">اختر الطابعة</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select className="prd-input" value={printerConfig.printerName} onChange={(e) => setPrinterConfig({ ...printerConfig, printerName: e.target.value })} required>
                        <option value="">-- اختر طابعة --</option>
                        {availablePrinters.map(name => <option key={name} value={name}>{name}</option>)}
                      </select>
                      <button type="button" className="prd-action-btn" onClick={refreshPrinters} disabled={loadingPrinters}>
                        {loadingPrinters ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sync"></i>}
                      </button>
                    </div>
                  </div>
                  <div className="prd-form-row">
                    <div className="prd-form-group">
                      <label className="prd-label">العرض (مم)</label>
                      <input className="prd-input" type="number" step="0.1" value={printerConfig.labelWidthMm} onChange={(e) => setPrinterConfig({ ...printerConfig, labelWidthMm: parseFloat(e.target.value) })} required />
                    </div>
                    <div className="prd-form-group">
                      <label className="prd-label">الطول (مم)</label>
                      <input className="prd-input" type="number" step="0.1" value={printerConfig.labelHeightMm} onChange={(e) => setPrinterConfig({ ...printerConfig, labelHeightMm: parseFloat(e.target.value) })} required />
                    </div>
                  </div>
                </form>
              </div>
              <div className="prd-modal-footer">
                <button type="button" className="prd-btn-ghost" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--prd-primary)' }} onClick={handleTestPrint} disabled={testingPrint}>
                  {testingPrint ? 'جاري...' : <><i className="fas fa-print" style={{ marginLeft: '8px' }}></i>طباعة تجريبية</>}
                </button>
                <button type="button" className="prd-btn-ghost" onClick={() => setPrinterConfigModalOpen(false)}>إلغاء</button>
                <button type="submit" form="printerConfigForm" className="prd-btn-primary" disabled={savingConfig}>
                  {savingConfig ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {showStockModal && (
        <ModalContainer>
          <div className="prd-modal-overlay" onClick={(e) => { if (e.target.classList.contains('prd-modal-overlay')) setShowStockModal(false); }}>
            <div className="prd-modal" style={{ maxWidth: '500px' }}>
              <div className="prd-modal-header">
                <h3><i className="fas fa-warehouse" style={{ marginLeft: '12px' }}></i>توزيع المخزون: {stockProduct?.name}</h3>
                <button className="prd-modal-close" onClick={() => setShowStockModal(false)}>✕</button>
              </div>
              <div className="prd-modal-body">
                <form id="stockForm" onSubmit={handleUpdateStock}>
                  <div className="prd-form-group">
                    <label className="prd-label">المخزن</label>
                    <select className="prd-input" value={stockForm.warehouseId} onChange={(e) => setStockForm({ ...stockForm, warehouseId: e.target.value })} required>
                      <option value="">-- اختر المخزن --</option>
                      {allWarehouses.map(w => <option key={w.id} value={w.id}>{w.branchName} - {w.name}</option>)}
                    </select>
                  </div>
                  <div className="prd-form-group">
                    <label className="prd-label">الكمية الحالية في هذا المخزن</label>
                    <input className="prd-input" type="number" step="0.001" value={stockForm.quantity} onChange={e => setStockForm({ ...stockForm, quantity: e.target.value })} required />
                  </div>
                  <div className="prd-form-row">
                    <div className="prd-form-group">
                      <label className="prd-label">الحد الأدنى (تنبيه)</label>
                      <input className="prd-input" type="number" step="0.001" value={stockForm.minQuantity}
                        onChange={e => setStockForm({ ...stockForm, minQuantity: e.target.value })} placeholder="اختياري" />
                    </div>
                    <div className="prd-form-group">
                      <label className="prd-label">الحد الأقصى</label>
                      <input className="prd-input" type="number" step="0.001" value={stockForm.maxQuantity}
                        onChange={e => setStockForm({ ...stockForm, maxQuantity: e.target.value })} placeholder="اختياري" />
                    </div>
                  </div>
                </form>
              </div>
              <div className="prd-modal-footer">
                <button type="button" className="prd-btn-ghost" onClick={() => setShowStockModal(false)}>إلغاء</button>
                <button type="submit" form="stockForm" className="prd-btn-primary" disabled={savingStock}>
                  {savingStock ? 'جاري الحفظ...' : 'تحديث المخزون'}
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default Products;