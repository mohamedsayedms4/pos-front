import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import JsBarcode from 'jsbarcode';
import Api, { SERVER_URL } from '../services/api';
import StoreApi from '../services/storeApi';
import { useGlobalUI } from '../components/common/GlobalUI';
import ModalContainer from '../components/common/ModalContainer';
import Loader from '../components/common/Loader';
import ScannerModal from '../components/common/ScannerModal';
import StatTile from '../components/common/StatTile';
import { useBranch } from '../context/BranchContext';
import html2pdf from 'html2pdf.js';
import SingleProductPdf from '../components/pdf/SingleProductPdf';
import { useExport } from '../utils/useExport';
import ExportProgressModal from '../components/ExportProgressModal';

const Products = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const getImageUrl = (p) => {
    if (!p) return null;
    const url = p.imageUrl || (p.imageUrls && p.imageUrls.length > 0 ? p.imageUrls[0] : null);
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${SERVER_URL}${url}`;
    return `${SERVER_URL}/api/v1/products/images/${url.split('/').pop()}`;
  };
  const { toast, confirm } = useGlobalUI();
  const { selectedBranchId: globalBranchId, branches: contextBranches } = useBranch();
  const { exportState, triggerExport, closeExportModal } = useExport();

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
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    const user = Api._getUser();
    const isAdmin = (user?.roles || []).some(r => r.includes('ADMIN'));
    return (!isAdmin && user?.branchId) ? user.branchId : '';
  });
  const [categoryFilter, setCategoryFilter] = useState(categoryId || '');

  useEffect(() => {
    setCategoryFilter(categoryId || '');
  }, [categoryId]);

  // Pagination State
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Modal states for add/edit product have been migrated to the standalone AddProduct page.

  // Print Barcode State
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printProduct, setPrintProduct] = useState(null);
  const [printing, setPrinting] = useState(false);

  // Single PDF Export State
  const [pdfProduct, setPdfProduct] = useState(null);
  const pdfRef = React.useRef(null);



  // Distribution Modal State
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockProduct, setStockProduct] = useState(null);
  const [stockForm, setStockForm] = useState({ warehouseId: '', quantity: '', minQuantity: '', maxQuantity: '' });
  const [savingStock, setSavingStock] = useState(false);
  const [allWarehouses, setAllWarehouses] = useState([]);

  // Print Quantity Modal State
  const [printQtyModalOpen, setPrintQtyModalOpen] = useState(false);
  const [printQtyProduct, setPrintQtyProduct] = useState(null);
  const [printQty, setPrintQty] = useState('');
  const [printQtyStock, setPrintQtyStock] = useState(0);

  // Barcode Template State
  const [barcodeTemplate, setBarcodeTemplate] = useState(() => {
    return localStorage.getItem('pos_barcode_template') || '1';
  });

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
  const _openPrintWindow = (dataUrl, widthMm, heightMm, quantity = 1, productData = null, tenantName = '', templateId = '1') => {
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

    let imagesHtml = '';
    for (let i = 0; i < quantity; i++) {
      if (productData) {
        const codeStr = productData.productCode || productData.id || '';
        const priceStr = parseFloat(productData.salePrice || 0).toFixed(2) + ' EGP';
        const nameStr = productData.name || '';
        let templateHtml = '';

        if (templateId === '2') {
          templateHtml = `
                <div class="tenant-name" style="margin-bottom: 2px;">${tenantName}</div>
                <div class="product-name">${nameStr}</div>
                <img src="${dataUrl}" class="barcode-img" />
                <div class="product-code">${codeStr}</div>
                <div class="tenant-name" style="font-size: 8px; font-weight: bold; margin-top: 2px;">${tenantName}</div>
                <div class="product-price" style="margin-top: 2px;">${priceStr}</div>
              `;
        } else if (templateId === '3') {
          templateHtml = `
                <div class="tenant-name" style="font-size: 10px; font-weight: bold;">${tenantName}</div>
                <hr style="width: 80%; border: 0; border-top: 1px solid #000; margin: 2px 0;" />
                <div class="product-name">${nameStr}</div>
                <div class="product-price">${priceStr}</div>
                <img src="${dataUrl}" class="barcode-img" />
                <div class="product-code">${codeStr}</div>
              `;
        } else if (templateId === '4') {
          templateHtml = `
                <div class="product-name" style="margin-bottom: 2px;">${nameStr}</div>
                <div class="product-price" style="margin-bottom: 4px;">${priceStr}</div>
                <img src="${dataUrl}" class="barcode-img" />
                <div class="product-code" style="margin-top: 4px;">${codeStr}</div>
                <div class="tenant-name" style="font-size: 9px; font-weight: bold; margin-top: 2px;">${tenantName}</div>
              `;
        } else if (templateId === '5') {
          templateHtml = `
                <div class="tenant-name" style="margin-bottom: 2px; font-size: 10px;">🏷️ ${tenantName}</div>
                <div class="product-name">${nameStr}</div>
                <div class="product-price">${priceStr}</div>
                <img src="${dataUrl}" class="barcode-img" />
                <div class="product-code">${codeStr}</div>
              `;
        } else if (templateId === '6') {
          templateHtml = `
                <div class="tenant-name" style="font-size: 10px; font-weight: bold;">${tenantName}</div>
                <div class="product-name">${nameStr}</div>
                <div class="product-code" style="margin-bottom: 2px;">SKU: ${codeStr}</div>
                <div class="product-price">${priceStr}</div>
                <img src="${dataUrl}" class="barcode-img" />
              `;
        } else { // Template 1 (Default)
          templateHtml = `
                <div class="product-name">${nameStr}</div>
                <div class="product-price">${priceStr}</div>
                <img src="${dataUrl}" class="barcode-img" />
                <div class="product-code">${codeStr}</div>
                <div class="tenant-name" style="font-size: 9px; font-weight: bold; margin-top: 2px;">${tenantName}</div>
              `;
        }

        imagesHtml += `<div class="page">${templateHtml}</div>`;
      } else {
        imagesHtml += `<div class="page"><img src="${dataUrl}"/></div>`;
      }
    }

    // Minified HTML with NO landscape keyword
    doc.open();
    doc.write([
      '<!DOCTYPE html><html dir="ltr"><head><meta charset="utf-8">',
      '<style>',
      '@page{size:auto;margin:0}',
      '*{margin:0;padding:0;box-sizing:border-box;font-family:sans-serif;}',
      `html,body{background:#fff;margin:0;padding:0;}`,
      `.page{width:${widthMm}mm;height:${heightMm}mm;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;page-break-inside:avoid;padding:0; margin:0 auto; text-align:center;}`,
      `.page:not(:last-child) { page-break-after: always; }`,
      `.product-name { font-size: 11px; font-weight: bold; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: ${sw}mm; line-height: 1.1; margin-bottom: 2px; width: 100%; text-align: center; }`,
      `.product-price { font-size: 13px; font-weight: bold; margin-bottom: 2px; line-height: 1; width: 100%; text-align: center; }`,
      `.barcode-img { max-width:${sw}mm; max-height: 14mm; width:auto; height:auto; display:block; margin: 0 auto; object-fit:contain; }`,
      `.product-code { font-size: 9px; margin-top: 2px; letter-spacing: 1px; line-height: 1; width: 100%; text-align: center; }`,
      `.tenant-name { font-size: 8px; margin-top: 2px; font-weight: bold; line-height: 1; width: 100%; text-align: center; }`,
      '</style></head>',
      `<body>${imagesHtml}</body></html>`,
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
    await triggerExport('PRODUCTS_EXCEL', {
      query: debouncedSearch,
      sort,
      branchId: selectedBranchId,
      categoryId: categoryFilter
    });
  };

  const handleExportPdf = async () => {
    await triggerExport('PRODUCTS_PDF', {
      query: debouncedSearch,
      sort,
      branchId: selectedBranchId,
      categoryId: categoryFilter
    });
  };

  const handleDownloadSinglePdf = (product) => {
    setPdfProduct(product);
    toast('جاري تحضير ملف PDF...', 'success');
    setTimeout(() => {
      if (pdfRef.current) {
        const opt = {
          margin: 0,
          filename: `product_${product.productCode || product.id}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().from(pdfRef.current).set(opt).save().then(() => {
          setPdfProduct(null);
          toast('تم تحميل التقرير بنجاح', 'success');
        });
      }
    }, 500); // Give React time to render the hidden component
  };



  useEffect(() => {
    const user = Api._getUser();
    const queryParams = new URLSearchParams(location.search);
    const branchFromUrl = queryParams.get('branchId');

    if (branchFromUrl) {
      setSelectedBranchId(branchFromUrl);
    } else if (globalBranchId !== undefined && globalBranchId !== null && globalBranchId !== '') {
      setSelectedBranchId(globalBranchId);
    } else if (globalBranchId === null) {
      setSelectedBranchId(''); // Explicitly selected "All Branches"
    } else if (user && user.branchId) {
      setSelectedBranchId(user.branchId);
    }

    if (contextBranches && contextBranches.length > 0) {
      setBranches(contextBranches);
    }
  }, [location.search, globalBranchId, contextBranches]);

  const loadData = async (pageNumber = page, size = pageSize, searchQuery = debouncedSearch, sortOrder = sort, branchId = selectedBranchId, categoryId = categoryFilter) => {
    setLoading(true);
    try {
      const [productsRes, categoriesData, statsData, salesData] = await Promise.all([
        Api.getProductsPaged(pageNumber, size, searchQuery, sortOrder, branchId, categoryId),
        Api.getCategories().catch(() => []),
        Api.getProductStatistics(branchId).catch(() => null),
        Api.getDailySaleStats(7, branchId).catch(() => [])
      ]);
      setData(productsRes.items);
      setTotalPages(productsRes.totalPages);
      setTotalElements(productsRes.totalElements);
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
    const cleaned = barcode.replace(/؛ٌ\]\-/g, '').replace(/\]C1/g, '').replace(/\]ؤ1/g, '');
    setSearchTerm(cleaned);
    toast(`تم سحب الكود: ${cleaned}`, 'info', true);
  };

  // Reset page to 0 when filters change
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, sort, selectedBranchId, categoryFilter]);

  // Load data when page, page size, or filters change
  useEffect(() => {
    loadData(page, pageSize, debouncedSearch, sort, selectedBranchId, categoryFilter);
  }, [page, pageSize, debouncedSearch, sort, selectedBranchId, categoryFilter]);

  // One-time load for warehouses
  useEffect(() => {
    Api.getAllWarehouses().then(res => setAllWarehouses(res || [])).catch(() => { });
  }, []);

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
      loadData(page, pageSize, debouncedSearch, sort, selectedBranchId, categoryFilter);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSavingStock(false);
    }
  };

  // Modal form helper methods have been moved to the standalone AddProduct page.

  const handleDelete = async (id, name) => {
    confirm(`سيتم حذف المنتج "${name}" نهائياً`, async () => {
      try {
        await Api.deleteProduct(id);
        toast('تم حذف المنتج بنجاح', 'success');
        loadData(page, pageSize, debouncedSearch, sort, selectedBranchId, categoryFilter);
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  };

  const executePrint = async (e) => {
    e.preventDefault();
    const quantity = parseInt(printQty, 10);
    if (isNaN(quantity) || quantity < 1) {
      toast('عدد غير صحيح', 'warning');
      return;
    }

    setPrinting(true);
    toast('جاري تحضير ملصق الباركود للطباعة...', 'success');
    try {
      const config = await Api.getPrinterConfig();
      const width = config.labelWidthMm || 40;
      const height = config.labelHeightMm || 30;
      const storeInfoReq = await StoreApi.getStoreInfoAdmin().catch(() => null);
      const tenantName = storeInfoReq?.data?.name || Api._getUser()?.tenantName || Api._getUser()?.name || '';

      const canvas = document.createElement('canvas');
      JsBarcode(canvas, String(printQtyProduct.productCode || printQtyProduct.id), {
        format: "CODE128",
        displayValue: false,
        margin: 0,
        width: 2,
        height: 50
      });

      const dataUrl = await _blobUrlToDataUrl(canvas.toDataURL('image/png'));
      _openPrintWindow(dataUrl, width, height, quantity, printQtyProduct, tenantName, barcodeTemplate);

      setPrintQtyModalOpen(false);
    } catch (err) {
      toast('فشل تحضير الباركود أو الطباعة: ' + err.message, 'error');
    } finally {
      setPrinting(false);
    }
  };

  const handlePrintBarcodeClick = (product) => {
    const stockQty = Math.max(1, Math.floor(product.stock || 1));
    setPrintQtyProduct(product);
    setPrintQtyStock(stockQty);
    setPrintQty(stockQty.toString());
    setPrintQtyModalOpen(true);
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(0, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages - 1, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(0, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(
        <button
          key={i}
          className={page === i ? 'active' : ''}
          onClick={() => setPage(i)}
        >
          {i + 1}
        </button>
      );
    }
    return pages;
  };

  const filteredItems = data.filter(p => !categoryFilter || p.categoryId === parseInt(categoryFilter));

  return (
    <>
      <style>{`
        /* Responsive CSS Overrides for Products Page */
        @media (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
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
          .toolbar-actions {
            width: 100% !important;
            display: flex !important;
            gap: 8px !important;
            flex-wrap: wrap !important;
          }
          .toolbar-actions button {
            flex: 1 1 45% !important;
            justify-content: center !important;
          }
          .toolbar-actions .btn-primary {
            flex: 1 1 100% !important;
          }
          
          .table-wrapper {
            overflow-x: auto !important;
            width: 100% !important;
            -webkit-overflow-scrolling: touch !important;
            border: 1px solid var(--border-subtle) !important;
            border-radius: 8px !important;
          }
          .data-table {
            min-width: 850px !important;
          }
        }

        @media (max-width: 768px) {
          .page-section {
            padding: 12px !important;
          }
          .card {
            padding: 12px !important;
            border-radius: 12px !important;
          }
          .card-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
          .card-header h3 {
            font-size: 1.2rem !important;
            text-align: center !important;
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
          }
          .stats-grid .stat-tile-value {
            font-size: 1.2rem !important;
          }
          .stats-grid .stat-tile-label {
            font-size: 0.75rem !important;
          }
          
          .pagination {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
            padding: 12px !important;
          }
          .pagination > div {
            justify-content: center !important;
            text-align: center !important;
            flex-wrap: wrap !important;
            gap: 10px !important;
          }
          .pagination button {
            flex: 1 !important;
            padding: 8px 10px !important;
            font-size: 0.8rem !important;
          }
        }

        @media (max-width: 360px) {
          .stats-grid {
            grid-template-columns: 1fr !important;
          }
          .toolbar-actions button {
            flex: 1 1 100% !important;
          }
        }
      `}</style>
      <div className="page-section">
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          <StatTile
            id="prod_total"
            label="إجمالي المنتجات"
            value={stats?.totalProducts || 0}
            icon="📦"
            defaults={{ color: 'blue', size: 'tile-wd-sm', order: 1 }}
          />
          <StatTile
            id="prod_capital"
            label="قيمة المخزون (ج.م)"
            value={(stats?.totalInventoryCapital || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            icon="💰"
            defaults={{ color: 'emerald', size: 'tile-wd-sm', order: 2 }}
          />
          <StatTile
            id="prod_profit"
            label="الأرباح المتوقعة"
            value={(stats?.totalExpectedProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            icon="📈"
            defaults={{ color: 'purple', size: 'tile-wd-sm', order: 3 }}
          />
          <StatTile
            id="prod_sales"
            label="إجمالي المبيعات"
            value={(stats?.totalRealizedSales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            icon="🛒"
            defaults={{ color: 'amber', size: 'tile-wd-sm', order: 4 }}
          />
        </div>

        <div className="card">
          <div className="card-header">
            <h3>📦 إدارة المنتجات</h3>
            <div className="toolbar">
              <div className="search-input">

                <input
                  type="text"
                  placeholder="بحث عن منتج..."
                  value={searchTerm}
                  onChange={(e) => {
                    let val = e.target.value;
                    val = val.replace(/؛ٌ\]\-/g, '').replace(/\]C1/g, '').replace(/\]ؤ1/g, '');
                    setSearchTerm(val);
                  }}
                />
                <span className="search-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
              </div>

              {(Api._getUser()?.roles || []).some(r => r.includes('ADMIN')) && (
                <select
                  className="form-control"
                  value={selectedBranchId || ''}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  style={{ width: '180px', height: '40px', padding: '0 10px' }}
                >
                  <option value="">🏢 كل الفروع</option>
                  {branches.map(b => <option key={b.id} value={b.id}>📍 {b.name}</option>)}
                </select>
              )}

              <select
                className="form-control"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ width: '180px', height: '40px', padding: '0 10px' }}
              >
                <option value="">كل الفئات</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <select
                className="form-control"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                style={{ width: '180px', height: '40px', padding: '0 10px' }}
              >
                <option value="id,desc">الأحدث أولاً</option>
                <option value="id,asc">الأقدم أولاً</option>
                <option value="name,asc">الاسم (أ-ي)</option>
                <option value="name,desc">الاسم (ي-أ)</option>
                <option value="salePrice,desc">الأعلى سعراً</option>
                <option value="salePrice,asc">الأقل سعراً</option>
                <option value="stock,desc">الأكثر مخزوناً</option>
                <option value="stock,asc">الأقل مخزوناً</option>
              </select>

              <div className="toolbar-actions" style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary" onClick={handleExportExcel} disabled={exportState.isOpen || data.length === 0}>
                  {exportState.isOpen ? '⏳' : '📊'} إكسيل
                </button>
                <button className="btn btn-secondary" onClick={handleExportPdf} disabled={exportState.isOpen || data.length === 0}>
                  {exportState.isOpen ? '⏳' : '📄'} PDF
                </button>
                <button className="btn btn-secondary" onClick={() => navigate('/settings/print')} title="إعدادات الطباعة والقوالب">
                  ⚙️
                </button>
                {Api.can('PRODUCT_WRITE') && (
                  <button className="btn btn-primary" onClick={() => navigate('/products/add')}>
                    <span>+</span> إضافة منتج
                  </button>
                )}
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
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>صورة</th>
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
                        <td style={{ color: 'var(--text-muted)' }}>{page * pageSize + i + 1}</td>
                        <td>
                          <Link to={`/products/${p.id}`} style={{ display: 'inline-block' }}>
                            {getImageUrl(p) ? (
                              <img src={getImageUrl(p)} alt={p.name} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-subtle)' }} />
                            ) : (
                              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>📦</div>
                            )}
                          </Link>
                        </td>
                        <td>
                          <Link to={`/products/${p.id}`} className="product-title-link">
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>{p.name}</span>
                          </Link>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{p.categoryName || '—'}</td>
                        <td><code style={{ color: 'var(--text-muted)' }}>{p.productCode || '—'}</code></td>
                        <td>{Number(p.purchasePrice).toFixed(2)}</td>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{Number(p.salePrice).toFixed(2)}</td>
                        <td>
                          <span className={`badge ${Number(p.stock) <= 5 ? 'badge-danger' : Number(p.stock) <= 15 ? 'badge-warning' : 'badge-success'}`}>
                            {Number(p.stock).toFixed(0)}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: Number(p.stock) > 0 ? 'var(--metro-green)' : 'var(--metro-red)' }}></div>
                            <span>{Number(p.stock) > 0 ? 'متوفر' : 'منتهي'}</span>
                          </div>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              className="btn btn-icon btn-ghost"
                              onClick={() => handlePrintBarcodeClick(p)}
                              title="طباعة باركود"
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="2" y="5" width="3" height="14" /><rect x="7" y="5" width="1" height="14" />
                                <rect x="10" y="5" width="3" height="14" /><rect x="15" y="5" width="2" height="14" />
                                <rect x="19" y="5" width="3" height="14" />
                              </svg>
                            </button>
                            <button className="btn btn-icon btn-ghost" onClick={() => handleDownloadSinglePdf(p)} title="تنزيل كـ PDF">📄</button>
                            <button className="btn btn-icon btn-ghost" onClick={() => openStockModal(p)} title="توزيع المخزون">🏭</button>
                            {Api.can('PRODUCT_WRITE') && <button className="btn btn-icon btn-ghost" onClick={() => navigate(`/products/edit/${p.id}`)} title="تعديل">✏️</button>}
                            {Api.can('PRODUCT_DELETE') && <button className="btn btn-icon btn-ghost" onClick={() => handleDelete(p.id, p.name)} title="حذف">🗑️</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {!loading && data.length > 0 && (
              <div className="pagination" style={{ borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', flexWrap: 'wrap', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    عرض {data.length} من إجمالي {totalElements} منتج
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>عدد الصفوف:</span>
                    <select
                      className="form-control"
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(0);
                      }}
                      style={{ width: '70px', height: '34px', padding: '0 5px', fontSize: '0.85rem', borderRadius: '0' }}
                    >
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '2px' }}>
                  <button
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                    style={{ width: 'auto', padding: '0 15px', borderRadius: '0' }}
                  >
                    السابق
                  </button>
                  {renderPageNumbers()}
                  <button
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                    style={{ width: 'auto', padding: '0 15px', borderRadius: '0' }}
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>





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

      {printQtyModalOpen && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setPrintQtyModalOpen(false); }}>
            <div className="modal" style={{ maxWidth: '400px' }}>
              <div className="modal-header">
                <h3>🖨️ طباعة ملصقات الباركود</h3>
                <button className="modal-close" onClick={() => setPrintQtyModalOpen(false)}>✕</button>
              </div>
              <div className="modal-body">
                <form id="printQtyForm" onSubmit={executePrint}>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>
                    كم عدد الملصقات التي تريد طباعتها؟ <br />
                    <small>(الكمية المتوفرة: <strong>{printQtyStock}</strong>)</small>
                  </p>
                  <div className="form-group">
                    <label>عدد الملصقات</label>
                    <input
                      type="number"
                      className="form-control"
                      min="1"
                      value={printQty}
                      onChange={(e) => setPrintQty(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setPrintQtyModalOpen(false)}>إلغاء</button>
                <button type="submit" form="printQtyForm" className="btn btn-primary" disabled={printing}>
                  {printing ? 'جاري التحضير...' : 'طباعة الآن'}
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {/* Hidden Container for PDF Generation */}
      <div style={{ display: 'none' }}>
        {pdfProduct && <SingleProductPdf ref={pdfRef} product={pdfProduct} />}
      </div>
      <ExportProgressModal exportState={exportState} onClose={closeExportModal} />
    </>
  );
};

export default Products;