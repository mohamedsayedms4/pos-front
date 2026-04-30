import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import JsBarcode from 'jsbarcode';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import ModalContainer from '../components/common/ModalContainer';
import Loader from '../components/common/Loader';
import ScannerModal from '../components/common/ScannerModal';
import { useBranch } from '../context/BranchContext';
import './Products.css';

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
  const filteredItems = data.filter(p => !categoryFilter || p.categoryId === parseInt(categoryFilter));

  return (
    <div className="products-page-container">
      <div className="products-dashboard">
        {/* SUMMARY CARDS */}
        <div className="summary-cards">
          <div className="summary-card">
            <div className="card-icon-wrapper icon-blue">🛒</div>
            <div className="card-info">
              <div className="card-label">إجمالي المنتجات</div>
              <div className="card-value">
                {stats?.totalProducts || 0}
                <span className="card-unit">منتج</span>
              </div>
              <div className="card-trend trend-up">
                <span>↑ 2+ هذا الشهر</span>
              </div>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-icon-wrapper icon-green">$</div>
            <div className="card-info">
              <div className="card-label">قيمة المخزون (ج.م)</div>
              <div className="card-value">
                {(stats?.totalInventoryCapital || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="card-trend trend-up">
                <span>↑ 8.5%+ هذا الشهر</span>
              </div>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-icon-wrapper icon-amber">📦</div>
            <div className="card-info">
              <div className="card-label">الأرباح المتوقعة</div>
              <div className="card-value">
                {(stats?.totalExpectedProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="card-trend trend-up">
                <span>↑ 15.3%+ هذا الشهر</span>
              </div>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-icon-wrapper icon-purple">📈</div>
            <div className="card-info">
              <div className="card-label">إجمالي المبيعات</div>
              <div className="card-value">
                {dailySales.reduce((acc, curr) => acc + curr.value, 0).toLocaleString()}
                <span className="card-unit">طلب</span>
              </div>
              <div className="card-trend trend-up">
                <span>↑ 9+ هذا الشهر</span>
              </div>
            </div>
          </div>
        </div>

        {/* ANALYTICS GRID */}
        <div className="analytics-grid">
          <div className="analytics-card">
            <div className="card-title-row">
              <div className="card-title">المبيعات آخر 7 أيام</div>
              <select className="filter-select" style={{ padding: '4px 8px' }}>
                <option>آخر 7 أيام</option>
              </select>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySales}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}K` : val}
                  />
                  <Tooltip 
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#3b82f6' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#fff', stroke: '#3b82f6', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="analytics-card">
            <div className="card-title-row">
              <div className="card-title">تنبيهات المخزون</div>
              <button className="btn-modern btn-ghost-modern" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>عرض الكل</button>
            </div>
            <div className="alerts-list">
              {lowStockItems.length > 0 ? lowStockItems.map(item => (
                <div key={item.id} className="alert-item">
                  <div className="alert-icon">⚠️</div>
                  <div className="product-img"></div>
                  <div className="alert-info">
                    <div className="alert-name">{item.name}</div>
                    <div className="alert-desc">المخزون منخفض ({item.stock} فقط)</div>
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>لا توجد تنبيهات</div>
              )}
            </div>
          </div>
        </div>

        {/* PRODUCTS TABLE CARD */}
        <div className="table-card">
          <div className="table-header-row">
            <div className="table-actions">
              <div className="dropdown">
                <button className="btn-modern btn-blue" onClick={() => openForm(null)}>
                  <span>+</span> إضافة منتج
                </button>
              </div>
              <button className="btn-modern btn-ghost-modern" onClick={handleExportExcel}>📊 إكسيل</button>
              <button className="btn-modern btn-ghost-modern" onClick={handleExportPdf}>📄 PDF</button>
              <button className="btn-modern btn-ghost-modern" onClick={openPrinterConfig}>⚙️</button>
            </div>

            <div className="table-actions">
              <select 
                className="filter-select" 
                value={categoryFilter} 
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">كل الفئات</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button className="btn-modern btn-ghost-modern">🔍 فلتر</button>
              <div className="search-wrapper">
                <input 
                  type="text" 
                  placeholder="بحث عن منتج..." 
                  className="search-input-modern"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <span className="search-icon-modern">🔍</span>
              </div>
            </div>
          </div>

          <div className="card-body no-padding">
            <div className="table-wrapper">
              {loading ? (
                <Loader message="جاري تحميل المنتجات..." />
              ) : filteredItems.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📦</div>
                  <h4>لا توجد منتجات</h4>
                  <p>قم بإضافة منتجات جديدة للبدء</p>
                </div>
              ) : (
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>المنتج</th>
                      <th>الفئة</th>
                      <th>الكود</th>
                      <th>سعر الشراء</th>
                      <th>سعر البيع</th>
                      <th>المخزون</th>
                      <th>الحالة</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((p, i) => (
                      <tr key={p.id}>
                        <td style={{ color: '#64748b' }}>{i + 1}</td>
                        <td>
                          <div className="product-cell">
                            <div className="product-img"></div>
                            <Link to={`/products/${p.id}`} style={{ fontWeight: 600, color: '#f8fafc' }}>{p.name}</Link>
                          </div>
                        </td>
                        <td>{p.categoryName || '—'}</td>
                        <td><code style={{ color: '#94a3b8' }}>{p.productCode || '—'}</code></td>
                        <td>{Number(p.purchasePrice).toFixed(2)}</td>
                        <td style={{ fontWeight: 700 }}>{Number(p.salePrice).toFixed(2)}</td>
                        <td>
                          <span className={`stock-badge ${Number(p.stock) <= 5 ? 'stock-out' : Number(p.stock) <= 15 ? 'stock-low' : 'stock-ok'}`}>
                            {Number(p.stock).toFixed(0)}
                          </span>
                        </td>
                        <td>
                          <div className="status-indicator">
                            <div className={`dot ${Number(p.stock) > 0 ? 'dot-green' : 'dot-red'}`}></div>
                            <span>{Number(p.stock) > 0 ? 'متوفر' : 'منتهي'}</span>
                          </div>
                        </td>
                        <td>
                          <div className="action-group">
                            <button className="action-btn btn-more" onClick={() => openStockModal(p)} title="توزيع المخزون">🏭</button>
                            <button className="action-btn btn-edit" onClick={() => openForm(p)} title="تعديل">✏️</button>
                            <button className="action-btn btn-delete" onClick={() => handleDelete(p.id, p.name)} title="حذف">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="pagination-modern">
            <div>عرض 1 إلى {filteredItems.length} من {data.length} منتج</div>
            <div className="page-controls">
              <button className="page-btn">{'<'}</button>
              <button className="page-btn active">1</button>
              <button className="page-btn">2</button>
              <button className="page-btn">3</button>
              <button className="page-btn">4</button>
              <button className="page-btn">5</button>
              <button className="page-btn">{'>'}</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>عدد العناصر في الصفحة</span>
              <select className="filter-select" style={{ padding: '4px 8px' }}>
                <option>10</option>
                <option>20</option>
                <option>50</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModal(); }}>
            <div className="modal">
              <div className="modal-header">
                <h3>{editProduct ? 'تعديل منتج' : 'إضافة منتج جديد'}</h3>
                <button className="modal-close" onClick={closeModal}>✕</button>
              </div>
              <div className="modal-body">
                <form id="productForm" onSubmit={handleSave}>
                  <div className="form-group">
                    <label>اسم المنتج *</label>
                    <input className="form-control" name="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>الوصف</label>
                    <textarea className="form-control" name="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}></textarea>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>سعر الشراء *</label>
                      <input className="form-control" type="number" step="0.01" name="purchasePrice" value={formData.purchasePrice} onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>سعر البيع *</label>
                      <input className="form-control" type="number" step="0.01" name="salePrice" value={formData.salePrice} onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })} required />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>المخزون</label>
                      <input className="form-control" type="number" step="0.001" name="stock" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>كود المنتج</label>
                      <input className="form-control" name="productCode" value={formData.productCode} onChange={(e) => setFormData({ ...formData, productCode: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>الفئة</label>
                      <select className="form-control" name="categoryId" value={formData.categoryId} onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}>
                        <option value="">بدون فئة</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>الوحدة الأساسية (قطاعي) *</label>
                      <input className="form-control" name="unitName" value={formData.unitName} onChange={(e) => setFormData({ ...formData, unitName: e.target.value })} required placeholder="كيس، قطعة، كيلو..." />
                    </div>
                  </div>

                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-elevated)', padding: '10px', borderRadius: '5px', border: '1px solid var(--border-primary)' }}>
                    <input type="checkbox" id="showInStore" checked={formData.showInStore} onChange={(e) => setFormData({ ...formData, showInStore: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                    <label htmlFor="showInStore" style={{ margin: 0, cursor: 'pointer', fontWeight: 600, color: formData.showInStore ? 'var(--metro-blue)' : 'var(--text-muted)' }}>
                      🌐 عرض المنتج في المتجر الإلكتروني للعملاء (أونلاين)
                    </label>
                  </div>

                  <div style={{ marginTop: '20px', padding: '15px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem' }}>📦 وحدات الجملة/التعبئة (اختياري)</h4>
                      <button type="button" className="btn btn-sm btn-secondary" onClick={addUnitRow}>+ إضافة وحدة جملة</button>
                    </div>

                    {formData.units.length === 0 ? (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '10px' }}>
                        لم يتم إضافة وحدات جملة (مثلاً: كرتونة)
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {formData.units.map((unit, index) => (
                          <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 40px', gap: '8px', alignItems: 'end', background: 'var(--bg-card)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: '0.7rem' }}>اسم الوحدة (كرتونة)</label>
                              <input className="form-control form-control-sm" value={unit.unitName} onChange={(e) => updateUnitRow(index, 'unitName', e.target.value)} placeholder="مثلاً: كرتونة" />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: '0.7rem' }}>فيها كام قطعة؟</label>
                              <input className="form-control form-control-sm" type="number" value={unit.conversionFactor} onChange={(e) => updateUnitRow(index, 'conversionFactor', e.target.value)} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: '0.7rem' }}>سعر الشراء</label>
                              <input className="form-control form-control-sm" type="number" value={unit.purchasePrice} onChange={(e) => updateUnitRow(index, 'purchasePrice', e.target.value)} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: '0.7rem' }}>سعر البيع</label>
                              <input className="form-control form-control-sm" type="number" value={unit.salePrice} onChange={(e) => updateUnitRow(index, 'salePrice', e.target.value)} />
                            </div>
                            <button type="button" className="btn btn-icon btn-sm" style={{ color: 'var(--metro-red)', marginBottom: '5px' }} onClick={() => removeUnitRow(index)}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="form-group" style={{ marginTop: '20px' }}>
                    <label>الصور</label>
                    <input className="form-control" type="file" name="images" multiple accept="image/*" onChange={(e) => setImages(e.target.files)} />
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>إلغاء</button>
                <button type="submit" form="productForm" className="btn btn-primary" disabled={saving}>
                  {saving ? 'جاري الحفظ...' : (editProduct ? 'حفظ التعديلات' : 'إضافة المنتج')}
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {printerConfigModalOpen && printerConfig && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setPrinterConfigModalOpen(false); }}>
            <div className="modal" style={{ maxWidth: '500px' }}>
              <div className="modal-header">
                <h3>⚙️ إعدادات طابعة الباركود</h3>
                <button className="modal-close" onClick={() => setPrinterConfigModalOpen(false)}>✕</button>
              </div>
              <div className="modal-body">
                <form id="printerConfigForm" onSubmit={savePrinterConfig}>
                  <div className="form-group">
                    <label>اختر الطابعة</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select className="form-control" value={printerConfig.printerName} onChange={(e) => setPrinterConfig({ ...printerConfig, printerName: e.target.value })} required>
                        <option value="">-- اختر طابعة --</option>
                        {availablePrinters.map(name => <option key={name} value={name}>{name}</option>)}
                      </select>
                      <button type="button" className="btn btn-icon" onClick={refreshPrinters} disabled={loadingPrinters}>
                        {loadingPrinters ? '⏳' : '🔄'}
                      </button>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>العرض (مم)</label>
                      <input className="form-control" type="number" step="0.1" value={printerConfig.labelWidthMm} onChange={(e) => setPrinterConfig({ ...printerConfig, labelWidthMm: parseFloat(e.target.value) })} required />
                    </div>
                    <div className="form-group">
                      <label>الطول (مم)</label>
                      <input className="form-control" type="number" step="0.1" value={printerConfig.labelHeightMm} onChange={(e) => setPrinterConfig({ ...printerConfig, labelHeightMm: parseFloat(e.target.value) })} required />
                    </div>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleTestPrint} disabled={testingPrint}>
                  {testingPrint ? 'جاري...' : '🖨️ طباعة تجريبية'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setPrinterConfigModalOpen(false)}>إلغاء</button>
                <button type="submit" form="printerConfigForm" className="btn btn-primary" disabled={savingConfig}>
                  {savingConfig ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {showStockModal && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setShowStockModal(false); }}>
            <div className="modal" style={{ maxWidth: '500px' }}>
              <div className="modal-header">
                <h3>📦 توزيع المنتج: {stockProduct?.name}</h3>
                <button className="modal-close" onClick={() => setShowStockModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                <form id="stockForm" onSubmit={handleUpdateStock}>
                  <div className="form-group">
                    <label>المخزن المستهدف *</label>
                    <select className="form-control" value={stockForm.warehouseId} onChange={e => setStockForm({ ...stockForm, warehouseId: e.target.value })} required>
                      <option value="">اختر المخزن...</option>
                      {allWarehouses.map(w => <option key={w.id} value={w.id}>{w.branchName} - {w.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>الكمية الحالية في هذا المخزن *</label>
                    <input className="form-control" type="number" step="0.001" value={stockForm.quantity} onChange={e => setStockForm({ ...stockForm, quantity: e.target.value })} required />
                  </div>
                  <div className="grid grid-2 gap-15">
                    <div className="form-group">
                      <label>الحد الأدنى (تنبيه)</label>
                      <input className="form-control" type="number" step="0.001" value={stockForm.minQuantity}
                        onChange={e => setStockForm({ ...stockForm, minQuantity: e.target.value })} placeholder="اختياري" />
                    </div>
                    <div className="form-group">
                      <label>الحد الأقصى</label>
                      <input className="form-control" type="number" step="0.001" value={stockForm.maxQuantity}
                        onChange={e => setStockForm({ ...stockForm, maxQuantity: e.target.value })} placeholder="اختياري" />
                    </div>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowStockModal(false)}>إلغاء</button>
                <button type="submit" form="stockForm" className="btn btn-primary" disabled={savingStock}>
                  {savingStock ? 'جاري الحفظ...' : 'حفظ التوزيع'}
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