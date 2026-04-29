import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import JsBarcode from 'jsbarcode';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import ModalContainer from '../components/common/ModalContainer';
import Loader from '../components/common/Loader';
import ScannerModal from '../components/common/ScannerModal';
import StatTile from '../components/common/StatTile';
import { useBranch } from '../context/BranchContext';

const Products = () => {
  const location = useLocation();
  const { toast, confirm } = useGlobalUI();
  const { selectedBranchId: globalBranchId, branches: contextBranches } = useBranch();
  
  const [data, setData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState('id,desc'); // Default sort
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');

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
      const [productsData, categoriesData, statsData] = await Promise.all([
        Api.getProductsPaged(0, 1000, searchQuery, sortOrder, branchId).then(res => res.items),
        Api.getCategories().catch(() => []),
        Api.getProductStatistics(branchId).catch(() => null)
      ]);
      setData(productsData);
      setCategories(categoriesData);
      setStats(statsData);
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

  const items = data;

  return (
    <>
      <div className="page-section">

        {/* KPI TILES GRID */}
        {stats && (
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
            <StatTile
              id="prod_total"
              label="إجمالي المنتجات"
              value={stats.totalProducts}
              icon="📦"
              to="/products/analytics"
              defaults={{ color: 'blue', size: 'tile-wd-sm', order: 1 }}
            />

            <StatTile
              id="prod_capital"
              label="قيمة المخزون (شراء)"
              value={`${Number(stats.totalInventoryCapital || 0).toLocaleString()} ج.م`}
              icon="💰"
              to="/products/analytics"
              defaults={{ color: 'emerald', size: 'tile-wd-sm', order: 2 }}
            />

            <StatTile
              id="prod_profit"
              label="الأرباح المتوقعة"
              value={Number(stats.totalExpectedProfit || 0).toLocaleString()}
              icon="📈"
              to="/products/analytics"
              defaults={{ color: 'amber', size: 'tile-sq-sm', order: 3 }}
            />

            <StatTile
              id="prod_outofstock"
              label="نفدت"
              value={stats.outOfStockCount}
              icon="📉"
              to="/products/analytics"
              defaults={{ color: 'blue', size: 'tile-sq-sm', order: 4 }}
            />

            <StatTile
              id="prod_cart"
              label="إضافة للسلة"
              value={stats.totalCartCount || 0}
              icon="🛒"
              to="/products/analytics"
              defaults={{ color: 'purple', size: 'tile-sq-sm', order: 5 }}
            />

            <StatTile
              id="prod_fav"
              label="في المفضلة"
              value={stats.totalFavoriteCount || 0}
              icon="❤️"
              to="/products/analytics"
              defaults={{ color: 'pink', size: 'tile-sq-sm', order: 6 }}
            />
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <h3>📦 إدارة المنتجات</h3>
            <div className="toolbar">
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

              <div className="search-input">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="بحث سريع..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select 
                className="form-control" 
                value={sort} 
                onChange={(e) => setSort(e.target.value)}
                style={{ width: '180px', height: '40px', padding: '0 10px' }}
              >
                <option value="id,desc">الأحدث</option>
                <option value="id,asc">الأقدم</option>
                <option value="name,asc">أ - ي</option>
                <option value="salePrice,asc">السعر ↑</option>
                <option value="salePrice,desc">السعر ↓</option>
              </select>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary" onClick={handleExportExcel} disabled={exportingExcel}>
                  {exportingExcel ? '⏳' : '📊'} إكسيل
                </button>
                <button className="btn btn-secondary" onClick={handleExportPdf} disabled={exportingPdf}>
                  {exportingPdf ? '⏳' : '📄'} PDF
                </button>
                <button className="btn btn-secondary" onClick={openPrinterConfig} title="إعدادات الطابعة">⚙️</button>
                
                {Api.can('PRODUCT_WRITE') && (
                  <button className="btn btn-primary" onClick={() => openForm(null)}>
                    <span>+</span> إضافة منتج
                  </button>
                )}
                <Link to="/products/analytics" className="btn btn-ghost stats-btn-desktop">📈 إحصائيات</Link>
              </div>
            </div>
          </div>
          <div className="card-body no-padding">
            <div className="table-wrapper">
              {loading ? (
                <Loader message="جاري تحميل المنتجات..." />
              ) : items.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📦</div>
                  <h4>لا توجد منتجات</h4>
                  <p>قم بإضافة منتجات جديدة للبدء</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>المنتج</th>
                      <th>الكود</th>
                      <th>الفئة</th>
                      <th>سعر الشراء</th>
                      <th>سعر البيع</th>
                      <th>المخزون</th>
                      <th>التفاعل</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p, i) => (
                      <tr key={p.id}>
                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                              📦
                            </div>
                            <div>
                              <Link to={`/products/${p.id}`} style={{ fontWeight: 600, color: 'var(--metro-blue)', textDecoration: 'none' }}>{p.name}</Link>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '2px' }}>
                                <span>{p.unitName || 'قطعة'}</span>
                                {p.units && p.units.length > 0 && p.units.map(u => (
                                  <span key={u.id} style={{ background: 'var(--bg-card)', padding: '0 5px', borderRadius: '3px', border: '1px solid var(--border-color)', color: 'var(--accent-emerald)' }}>
                                    {u.unitName}: {u.conversionFactor} {p.unitName}
                                  </span>
                                ))}
                                {p.showInStore === false ? (
                                  <span style={{ background: 'var(--metro-red)', color: 'white', padding: '0 5px', borderRadius: '3px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '3px' }}>🚫 مخفي من المتجر</span>
                                ) : (
                                  <span style={{ background: 'var(--accent-emerald)', color: 'white', padding: '0 5px', borderRadius: '3px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '3px' }}>🌐 متاح بالمتجر</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td><code style={{ background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{p.productCode || '—'}</code></td>
                        <td>{p.categoryName || <span className="text-muted">—</span>}</td>
                        <td>{Number(p.purchasePrice).toFixed(2)}</td>
                        <td style={{ fontWeight: 600, color: 'var(--accent-emerald-light)' }}>{Number(p.salePrice).toFixed(2)}</td>
                        <td>
                          <span className={`badge ${Number(p.stock) > 0 ? 'badge-success' : 'badge-danger'}`}>
                            {Number(p.stock).toFixed(1)}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>👁️ {p.viewCount || 0}</span>
                              <span>🛒 {p.cartCount || 0}</span>
                              <span>❤️ {p.favoriteCount || 0}</span>
                            </div>
                            <div className="progress" style={{ height: '4px', width: '60px', background: 'var(--bg-elevated)', borderRadius: '2px' }}>
                              <div className="progress-bar" style={{ width: `${Math.min(100, ((p.cartCount || 0) + (p.favoriteCount || 0)) * 2)}%`, background: 'var(--metro-blue)' }} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="table-actions" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <button className="btn btn-sm btn-ghost" title="توزيع المخزون" onClick={() => openStockModal(p)} style={{ border: '1px solid var(--border-color)', color: 'var(--accent-amber)' }}>🏭 توزيع</button>
                            <button className="btn btn-sm btn-secondary" title="طباعة باركود (PDF)" onClick={() => { setPrintProduct(p); setPrintModalOpen(true); }} style={{ whiteSpace: 'nowrap' }}>🖨️ طباعة P</button>
                            {Api.can('PRODUCT_WRITE') && <button className="btn btn-icon btn-ghost" title="تعديل" onClick={() => openForm(p)}>✏️</button>}
                            {Api.can('PRODUCT_DELETE') && <button className="btn btn-icon btn-ghost" title="حذف" onClick={() => handleDelete(p.id, p.name)}>🗑️</button>}
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

                  {/* Packaging Units Section */}
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

      {printModalOpen && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setPrintModalOpen(false); }}>
            <div className="modal" style={{ maxWidth: '400px' }}>
              <div className="modal-header">
                <h3>🖨️ طباعة ملصق باركود مباشرة (صورة)</h3>
                <button className="modal-close" onClick={() => setPrintModalOpen(false)}>✕</button>
              </div>
              <div className="modal-body" style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)' }}>تم تحسين الطباعة لتناسب طابعة <b>XP-370B</b> والاتصال المباشر بالورق.</p>
                <div style={{ background: 'rgba(52, 152, 219, 0.1)', padding: '10px', borderRadius: '5px', borderRight: '3px solid var(--metro-blue)', marginTop: '20px', textAlign: 'right' }}>
                  <h5 style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: 'var(--metro-blue)' }}>✅ تعليمات الضبط (مرة واحدة):</h5>
                  <ul style={{ margin: 0, paddingRight: '20px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <li>الهوامش (Margins): اختر <b>None</b> أو <b>بلا</b></li>
                    <li>المقياس (Scale): اختر <b>Actual Size</b> أو <b>الحجم الفعلي (100%)</b></li>
                    <li>حجم الورق: اضبطه من <b>إعدادات الطابعة (Printer Properties)</b> ليطابق حجم الليبل</li>
                    <li>إلغاء تحديد <b>Headers/Footers</b> إن وجد</li>
                  </ul>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setPrintModalOpen(false)}>إلغاء</button>
                <button type="button" onClick={executePrint} className="btn btn-primary" disabled={printing}>
                  {printing ? 'جاري التحضير...' : 'ابدأ الطباعة المباشرة'}
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {/* Printer Config Modal */}
      {printerConfigModalOpen && printerConfig && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setPrinterConfigModalOpen(false); }}>
            <div className="modal" style={{ maxWidth: '500px' }}>
              <div className="modal-header">
                <h3>⚙️ إعدادات طابعة الباركود ديناميكياً</h3>
                <button className="modal-close" onClick={() => setPrinterConfigModalOpen(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div style={{ marginBottom: '20px', padding: '15px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <h5 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>📍 قوالب سريعة للمقاسات:</h5>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                      { label: 'كبير (50×25 مم)', w: 50, h: 25, m: 1, nf: 32, pf: 42 },
                      { label: 'صغير (40×15 مم)', w: 40, h: 15, m: 0.5, nf: 28, pf: 36 },
                      { label: 'قياسي (38×25 مم)', w: 38, h: 25, m: 1, nf: 32, pf: 42 }
                    ].map(p => (
                      <button
                        key={p.label}
                        type="button"
                        className="btn btn-sm btn-ghost"
                        style={{ border: '1px solid var(--metro-blue)', color: 'var(--metro-blue)', padding: '5px 12px' }}
                        onClick={() => setPrinterConfig({
                          ...printerConfig,
                          labelWidthMm: p.w,
                          labelHeightMm: p.h,
                          marginMm: p.m,
                          nameFontSize: p.nf,
                          priceFontSize: p.pf
                        })}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <form id="printerConfigForm" onSubmit={savePrinterConfig}>
                  <div className="form-group">
                    <label>اختر الطابعة المثبتة على الجهاز</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        className="form-control"
                        value={printerConfig.printerName}
                        onChange={(e) => setPrinterConfig({ ...printerConfig, printerName: e.target.value })}
                        required
                        disabled={loadingPrinters}
                      >
                        <option value="">-- اختر طابعة --</option>
                        {availablePrinters.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                      <button type="button" className="btn btn-icon" onClick={refreshPrinters} disabled={loadingPrinters} title="تحديث قائمة الطابعات">
                        {loadingPrinters ? '⏳' : '🔄'}
                      </button>
                    </div>
                  </div>

                  <h5 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '5px', color: 'var(--metro-blue)' }}>المقاسات بالـ ملم (mm)</h5>
                  <div className="form-row">
                    <div className="form-group">
                      <label>العرض (Width)</label>
                      <input className="form-control" type="number" step="0.1" value={printerConfig.labelWidthMm} onChange={(e) => setPrinterConfig({ ...printerConfig, labelWidthMm: parseFloat(e.target.value) })} required />
                    </div>
                    <div className="form-group">
                      <label>الطول (Height)</label>
                      <input className="form-control" type="number" step="0.1" value={printerConfig.labelHeightMm} onChange={(e) => setPrinterConfig({ ...printerConfig, labelHeightMm: parseFloat(e.target.value) })} required />
                    </div>
                    <div className="form-group">
                      <label>الهامش (Margin)</label>
                      <input className="form-control" type="number" step="0.1" value={printerConfig.marginMm} onChange={(e) => setPrinterConfig({ ...printerConfig, marginMm: parseFloat(e.target.value) })} required />
                    </div>
                  </div>

                  <h5 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '5px', marginTop: '15px', color: 'var(--metro-blue)' }}>أحجام الخطوط (Font Size)</h5>
                  <div className="form-row">
                    <div className="form-group">
                      <label>الاسم (Name)</label>
                      <input className="form-control" type="number" step="0.1" value={printerConfig.nameFontSize} onChange={(e) => setPrinterConfig({ ...printerConfig, nameFontSize: parseFloat(e.target.value) })} required />
                    </div>
                    <div className="form-group">
                      <label>السعر (Price)</label>
                      <input className="form-control" type="number" step="0.1" value={printerConfig.priceFontSize} onChange={(e) => setPrinterConfig({ ...printerConfig, priceFontSize: parseFloat(e.target.value) })} required />
                    </div>
                  </div>
                </form>
              </div>
              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                <div>
                  <button type="button" className="btn btn-secondary" onClick={handleTestPrint} disabled={testingPrint} style={{ backgroundColor: 'var(--accent-purple)' }}>
                    {testingPrint ? 'جاري...' : '🖨️ طباعة تجريبية'}
                  </button>
                </div>
                <div>
                  <button type="button" className="btn btn-ghost" onClick={() => setPrinterConfigModalOpen(false)}>إلغاء</button>
                  <button type="submit" form="printerConfigForm" className="btn btn-primary" disabled={savingConfig}>
                    {savingConfig ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
      {/* Barcode Scanner Modal */}
      {/* 
      <ScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScan}
      />
      */}
      <style>{`
        .products-header-premium { padding: 15px; display: flex; flex-direction: column; gap: 12px; border-bottom: 1px solid var(--border-subtle); }
        .row-premium { display: flex; gap: 8px; width: 100%; align-items: stretch; }
        .title-row { justify-content: space-between; align-items: center; }
        
        .split-btn { flex: 1; padding: 12px 0; font-weight: 700; text-align: center; }
        .stats-btn-mobile { border: 1px solid var(--border-input); background: var(--bg-elevated); color: var(--text-white); }
        .stats-btn-desktop { border: 1px solid var(--metro-blue); color: var(--metro-blue); padding: 5px 15px; }

        .search-wrap-new { flex: 1; display: flex; align-items: center; background: var(--bg-input); border: 1px solid var(--border-input); min-width: 0; }
        .search-wrap-new .search-icon { padding: 0 10px; color: var(--text-dim); }
        .search-wrap-new input { flex: 1; background: transparent; border: none; padding: 10px 0; color: #fff; outline: none; width: 100%; }
        .camera-btn-new { width: 50px; flex-shrink: 0; background: var(--bg-tile); border: 1px solid var(--border-input); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; }

        .compact-row { height: 34px !important; }
        .sort-wrap-new { flex: 1; height: 100%; }
        .sort-wrap-new select { width: 100%; height: 100%; background: var(--bg-input); border: 1px solid var(--border-input); color: #fff; padding: 0 8px; font-size: 0.9rem; }
        .tools-wrap-new { display: flex; gap: 5px; height: 100%; }
        .tool-btn-new { width: 34px !important; height: 34px !important; background: var(--bg-elevated); border: 1px solid var(--border-input); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.8rem; }

        @media (max-width: 768px) {
          .mobile-only { display: flex !important; }
          .desktop-only { display: none !important; }
        }
      `}</style>
      {/* Stock Management Modal */}
      {showStockModal && (
        <ModalContainer>
          <div className="modal-overlay active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
            <div className="modal" style={{ width: '100%', maxWidth: '500px' }}>
              <div className="modal-header">
                <h3>📦 توزيع المنتج: {stockProduct?.name}</h3>
                <button className="modal-close" onClick={() => setShowStockModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                <form id="stockForm" onSubmit={handleUpdateStock}>
                  <div className="form-group">
                    <label>المخزن المستهدف *</label>
                    <select className="form-control" value={stockForm.warehouseId} 
                      onChange={e => setStockForm({ ...stockForm, warehouseId: e.target.value })} required>
                      <option value="">اختر المخزن...</option>
                      {allWarehouses.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.branchName} - {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>الكمية الحالية في هذا المخزن *</label>
                    <input className="form-control" type="number" step="0.001" value={stockForm.quantity}
                      onChange={e => setStockForm({ ...stockForm, quantity: e.target.value })} required />
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
    </>
  );
};

export default Products;