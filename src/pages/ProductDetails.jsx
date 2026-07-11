import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Api, { API_BASE } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import { useBranch } from '../context/BranchContext';
import html2pdf from 'html2pdf.js';
import SingleProductPdf from '../components/pdf/SingleProductPdf';
import ReactDOM from 'react-dom';
import ModalContainer from '../components/common/ModalContainer';
import ProductVariantsTab from '../components/products/ProductVariantsTab';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useGlobalUI();
  const { selectedBranchId, branches } = useBranch();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mainImage, setMainImage] = useState(null);
  const pdfRef = React.useRef(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'variants'

  // ─── Print Quantity Modal State ──────────────────────────────────────────────
  const [printQtyModalOpen, setPrintQtyModalOpen] = useState(false);
  const [printQtyType, setPrintQtyType] = useState('barcode');
  const [printQty, setPrintQty] = useState('');
  const [printQtyStock, setPrintQtyStock] = useState(0);
  const [printing, setPrinting] = useState(false);

  // ─── Online Store States ───────────────────────────────────────────────────
  const [showAddToStoreModal, setShowAddToStoreModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [storePrices, setStorePrices] = useState({ purchasePrice: '', salePrice: '' });
  const [addingToStore, setAddingToStore] = useState(false);

  // ─── Unit management ───────────────────────────────────────────────────────
  const [units, setUnits] = useState([]);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null); // null = add mode
  const [unitForm, setUnitForm] = useState({
    unitName: '', conversionFactor: '', purchasePrice: '', salePrice: '',
    isDefaultPurchase: false, isDefaultSale: false
  });
  const [savingUnit, setSavingUnit] = useState(false);
  const [distribution, setDistribution] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockForm, setStockForm] = useState({ warehouseId: '', quantity: '', minQuantity: '', maxQuantity: '' });
  const [savingStock, setSavingStock] = useState(false);

  // --- Edit Branch Price States ---
  const [showEditBranchPriceModal, setShowEditBranchPriceModal] = useState(false);
  const [editingBranchInventory, setEditingBranchInventory] = useState(null);
  const [branchPriceForm, setBranchPriceForm] = useState({
    purchasePrice: '',
    salePrice: '',
    showInStore: true
  });
  const [savingBranchPrice, setSavingBranchPrice] = useState(false);

  // --- Admin Branch Actions ---
  const [showAdminTransferModal, setShowAdminTransferModal] = useState(false);
  const [adminTransferForm, setAdminTransferForm] = useState({
    fromBranchId: '',
    fromBranchName: '',
    toBranchId: '',
    quantity: '',
    notes: ''
  });
  const [adminTransferring, setAdminTransferring] = useState(false);

  const handleAdminDelete = async (bi) => {
    if (!window.confirm(`هل أنت متأكد من مسح المنتج من فرع ${bi.branchName}؟ (ستتمكن من استعادته لاحقاً)`)) return;
    try {
      await Api.adminRemoveProductFromBranch(id, bi.branchId);
      toast('تم الحذف بنجاح (Soft Delete)', 'success');
      const prod = await Api.getProduct(id);
      setProduct(prod);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const openAdminTransfer = (bi) => {
    setAdminTransferForm({
      fromBranchId: bi.branchId,
      fromBranchName: bi.branchName,
      toBranchId: '',
      quantity: '',
      notes: ''
    });
    setShowAdminTransferModal(true);
  };

  const submitAdminTransfer = async (e) => {
    e.preventDefault();
    if (!adminTransferForm.toBranchId || !adminTransferForm.quantity) {
      toast('يجب تحديد الفرع الوجهة والكمية', 'warning');
      return;
    }
    setAdminTransferring(true);
    try {
      await Api.adminTransferProductBetweenBranches(id, {
        fromBranchId: adminTransferForm.fromBranchId,
        toBranchId: adminTransferForm.toBranchId,
        quantity: parseFloat(adminTransferForm.quantity),
        notes: adminTransferForm.notes
      });
      toast('تم إنشاء طلب النقل بنجاح', 'success');
      setShowAdminTransferModal(false);
      const prod = await Api.getProduct(id);
      setProduct(prod);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setAdminTransferring(false);
    }
  };

  const loadUnits = async () => {
    try {
      const data = await Api.getProductUnits(id);
      setUnits(data || []);
    } catch { /* ignore */ }
  };

  const openAddUnit = () => {
    setEditingUnit(null);
    setUnitForm({ unitName: '', conversionFactor: '', purchasePrice: '', salePrice: '', wholesaleSalePrice: '', isDefaultPurchase: false, isDefaultSale: false });
    setShowUnitForm(true);
  };

  const openEditUnit = (u) => {
    setEditingUnit(u);
    setUnitForm({
      unitName: u.unitName,
      conversionFactor: u.conversionFactor,
      purchasePrice: u.purchasePrice,
      salePrice: u.salePrice,
      wholesaleSalePrice: u.wholesaleSalePrice || '',
      isDefaultPurchase: !!u.isDefaultPurchase,
      isDefaultSale: !!u.isDefaultSale,
    });
    setShowUnitForm(true);
  };

  const handleSaveUnit = async (e) => {
    e.preventDefault();
    if (!unitForm.unitName || !unitForm.conversionFactor) {
      toast('اسم الوحدة ومعامل التحويل مطلوبان', 'warning');
      return;
    }
    setSavingUnit(true);
    try {
      const payload = {
        unitName: unitForm.unitName,
        conversionFactor: parseFloat(unitForm.conversionFactor),
        purchasePrice: parseFloat(unitForm.purchasePrice) || 0,
        salePrice: parseFloat(unitForm.salePrice) || 0,
        wholesaleSalePrice: unitForm.wholesaleSalePrice !== '' ? parseFloat(unitForm.wholesaleSalePrice) : null,
        isDefaultPurchase: unitForm.isDefaultPurchase,
        isDefaultSale: unitForm.isDefaultSale,
      };
      if (editingUnit) {
        await Api.updateProductUnit(id, editingUnit.id, payload);
        toast('تم تعديل الوحدة بنجاح', 'success');
      } else {
        await Api.addProductUnit(id, payload);
        toast('تم إضافة الوحدة بنجاح', 'success');
      }
      setShowUnitForm(false);
      loadUnits();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSavingUnit(false);
    }
  };

  const handleDeleteUnit = async (unitId) => {
    try {
      await Api.deleteProductUnit(id, unitId);
      toast('تم حذف الوحدة', 'success');
      loadUnits();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const loadDistribution = async () => {
    try {
      const data = await Api.getProductStockDistribution(id);
      setDistribution(data || []);
    } catch { /* ignore */ }
  };

  const loadWarehouses = async () => {
    try {
      const data = await Api.getAllWarehouses();
      setWarehouses(data || []);
    } catch { /* ignore */ }
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
        productId: id,
        quantity: parseFloat(stockForm.quantity),
        minQuantity: stockForm.minQuantity ? parseFloat(stockForm.minQuantity) : null,
        maxQuantity: stockForm.maxQuantity ? parseFloat(stockForm.maxQuantity) : null
      });
      toast('تم تحديث المخزون بنجاح', 'success');
      setShowStockModal(false);
      loadDistribution();
      // Also reload product to update global stock
      const prod = await Api.getProduct(id);
      setProduct(prod);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSavingStock(false);
    }
  };

  const openEditBranchPriceModal = (bi) => {
    setEditingBranchInventory(bi);
    setBranchPriceForm({
      purchasePrice: bi.purchasePrice ?? '',
      salePrice: bi.salePrice ?? '',
      showInStore: bi.showInStore !== false
    });
    setShowEditBranchPriceModal(true);
  };

  const handleUpdateBranchPrice = async (e) => {
    e.preventDefault();
    if (branchPriceForm.purchasePrice === '' || branchPriceForm.salePrice === '') {
      toast('سعر الشراء وسعر البيع مطلوبان', 'warning');
      return;
    }
    setSavingBranchPrice(true);
    try {
      await Api.updateBranchInventory(id, editingBranchInventory.branchId, {
        purchasePrice: parseFloat(branchPriceForm.purchasePrice),
        salePrice: parseFloat(branchPriceForm.salePrice),
        showInStore: branchPriceForm.showInStore
      });
      toast('تم تحديث أسعار الفرع بنجاح', 'success');
      setShowEditBranchPriceModal(false);

      // Reload product details to show updated prices
      const prod = await Api.getProduct(id);
      setProduct(prod);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSavingBranchPrice(false);
    }
  };

  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true);
      try {
        const [prod] = await Promise.all([
          Api.getProduct(id),
          Api.incrementProductView(id).catch(() => { })
        ]);
        setProduct(prod);
        if (prod.imageUrls && prod.imageUrls.length > 0) {
          setMainImage(`${API_BASE}/products/images/${prod.imageUrls[0].split('/').pop()}`);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadProduct();
      loadUnits();
      loadDistribution();
      loadWarehouses();
    }
  }, [id]);

  const handlePrintClick = (type) => {
    const branchList = product.branchInventories || [];
    const totalStock = branchList.reduce((sum, bi) => sum + Number(bi.stock || 0), 0);
    const stockQty = Math.max(1, Math.floor(totalStock || 1));
    setPrintQtyType(type);
    setPrintQtyStock(stockQty);
    setPrintQty(stockQty.toString());
    setPrintQtyModalOpen(true);
  };

  const executePrintCode = async (e) => {
    if (e) e.preventDefault();
    const quantity = parseInt(printQty, 10);
    if (isNaN(quantity) || quantity < 1) {
      toast('عدد غير صحيح', 'warning');
      return;
    }
    setPrintQtyModalOpen(false);
    setPrinting(true);

    try {
      const config = await Api.getPrinterConfig();
      const width = config.labelWidthMm || 40;
      const height = config.labelHeightMm || 30;

      const tenantName = Api._getUser()?.tenantName || Api._getUser()?.name || '';

      const canvas = document.createElement('canvas');
      import('jsbarcode').then((JsBarcodeModule) => {
        const JsBarcode = JsBarcodeModule.default || JsBarcodeModule;
        JsBarcode(canvas, String(product.productCode || product.id), {
          format: "CODE128",
          displayValue: false,
          margin: 0,
          width: 2,
          height: 50
        });
        const dataUrl = canvas.toDataURL('image/png');

        // 3. Print using hidden iframe (no landscape, size:auto)
        const oldFrame = document.getElementById('__barcode_print_frame');
        if (oldFrame) oldFrame.remove();

        const iframe = document.createElement('iframe');
        iframe.id = '__barcode_print_frame';
        iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;';
        document.body.appendChild(iframe);

        const idoc = iframe.contentDocument || iframe.contentWindow.document;
        const sw = width - 4;
        const sh = height - 4;

        let imagesHtml = '';
        const codeStr = product.productCode || product.id || '';
        const priceStr = parseFloat(product.salePrice || 0).toFixed(2) + ' EGP';
        const nameStr = product.name || '';

        for (let i = 0; i < quantity; i++) {
          imagesHtml += `
            <div class="page">
              <div class="product-name">${nameStr}</div>
              <div class="product-price">${priceStr}</div>
              <img src="${dataUrl}" class="barcode-img" />
              <div class="product-code">${codeStr}</div>
              <div class="tenant-name">${tenantName}</div>
            </div>
          `;
        }

        idoc.open();
        idoc.write([
          '<!DOCTYPE html><html dir="ltr"><head><meta charset="utf-8">',
          '<style>',
          '@page{size:auto;margin:0}',
          '*{margin:0;padding:0;box-sizing:border-box;font-family:sans-serif;}',
          `html,body{background:#fff;margin:0;padding:0;}`,
          `.page{width:${width}mm;height:${height}mm;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;page-break-inside:avoid;padding:0; margin:0 auto; text-align:center;}`,
          `.page:not(:last-child) { page-break-after: always; }`,
          `.product-name { font-size: 11px; font-weight: bold; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: ${sw}mm; line-height: 1.1; margin-bottom: 2px; width: 100%; text-align: center; }`,
          `.product-price { font-size: 13px; font-weight: bold; margin-bottom: 2px; line-height: 1; width: 100%; text-align: center; }`,
          `.barcode-img { max-width:${sw}mm; max-height: 14mm; width:auto; height:auto; display:block; margin: 0 auto; object-fit:contain; }`,
          `.product-code { font-size: 9px; margin-top: 2px; letter-spacing: 1px; line-height: 1; width: 100%; text-align: center; }`,
          `.tenant-name { font-size: 8px; margin-top: 2px; font-weight: bold; line-height: 1; width: 100%; text-align: center; }`,
          '</style></head>',
          `<body>${imagesHtml}</body></html>`,
        ].join(''));
        idoc.close();

        const printImg = idoc.querySelector('img');
        const doPrint = () => {
          try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          } catch (e) { window.print(); }
          setTimeout(() => {
            const f = document.getElementById('__barcode_print_frame');
            if (f) f.remove();
          }, 2000);
        };

        if (printImg.complete && printImg.naturalWidth > 0) {
          setTimeout(doPrint, 100);
        } else {
          printImg.onload = () => setTimeout(doPrint, 100);
          printImg.onerror = () => {
            const f = document.getElementById('__barcode_print_frame');
            if (f) f.remove();
          };
        }

        toast('جاري تحضير ملصق الباركود...', 'success');
      }).catch(err => {
        toast('فشل في الطباعة: ' + err.message, 'error');
      }).finally(() => setPrinting(false));

    } catch (err) {
      toast('فشل في الطباعة: ' + err.message, 'error');
      setPrinting(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!product) return;
    setGeneratingPdf(true);
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
          setGeneratingPdf(false);
          toast('تم تحميل التقرير بنجاح', 'success');
        }).catch(() => setGeneratingPdf(false));
      } else {
        setGeneratingPdf(false);
      }
    }, 500);
  };

  if (loading) {
    return <Loader message="جاري تحميل تفاصيل المنتج..." />;
  }

  if (error || !product) {
    return (
      <div className="page-section empty-state">
        <div className="empty-icon">⚠️</div>
        <h4>{error ? 'حدث خطأ' : 'لم يتم العثور على المنتج'}</h4>
        <p>{error || 'رقم المنتج غير صحيح أو مفقود'}</p>
        <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => navigate('/products')}>العودة للمنتجات</button>
      </div>
    );
  }

  const branchList = product.branchInventories || [];
  const totalStock = branchList.reduce((sum, bi) => sum + Number(bi.stock || 0), 0);
  const totalSoldQuantity = branchList.reduce((sum, bi) => sum + Number(bi.soldQuantity || 0), 0);
  const totalRealizedProfit = branchList.reduce((sum, bi) => sum + Number(bi.realizedProfit || 0), 0);

  // Find active or default branch prices
  const activeInventory = branchList.find(bi => Number(bi.branchId) === Number(selectedBranchId)) || branchList[0] || {};
  const currentPurchasePrice = activeInventory.purchasePrice ?? 0;
  const currentSalePrice = activeInventory.salePrice ?? 0;

  const badgeColor = totalStock > 0 ? 'var(--accent-emerald)' : 'var(--metro-red)';
  const badgeText = totalStock > 0 ? 'متوفر بالمخزن' : 'نفذت الكمية';

  // Online Store Detection and Logic
  const onlineBranch = (branches || []).find(b => b.type === 'ONLINE');
  const onlineInventory = product.onlineInventory;
  const isLinkedToOnline = !!onlineInventory;

  const otherBranchesWithStock = branchList.filter(bi => Number(bi.branchId) !== Number(onlineBranch?.id) && Number(bi.stock) > 0);
  const totalOtherStock = otherBranchesWithStock.reduce((sum, bi) => sum + Number(bi.stock || 0), 0);
  const hasStockElsewhere = totalOtherStock > 0;

  const handleAddToStoreClick = () => {
    // Pre-fill prices from default/active branch if available
    const defaultPurchasePrice = currentPurchasePrice || product.purchasePrice || '';
    const defaultSalePrice = currentSalePrice || product.salePrice || '';
    setStorePrices({
      purchasePrice: defaultPurchasePrice,
      salePrice: defaultSalePrice
    });

    if (hasStockElsewhere) {
      setShowWarningModal(true);
    } else {
      setShowAddToStoreModal(true);
    }
  };

  const confirmAddToStore = async () => {
    setAddingToStore(true);
    try {
      await Api.addProductToBranch(id, {
        branchId: onlineBranch.id,
        stock: 0,
        purchasePrice: parseFloat(storePrices.purchasePrice),
        salePrice: parseFloat(storePrices.salePrice),
        showInStore: true
      });
      toast('تم إضافة المنتج للمتجر الإلكتروني بنجاح', 'success');
      setShowAddToStoreModal(false);
      setShowWarningModal(false);

      // Reload product details
      const prod = await Api.getProduct(id);
      setProduct(prod);
    } catch (err) {
      toast(err.message || 'فشل إضافة المنتج للمتجر', 'error');
    } finally {
      setAddingToStore(false);
    }
  };

  const handleSaveToStore = async (e) => {
    e.preventDefault();
    if (!storePrices.purchasePrice || !storePrices.salePrice) {
      toast('يرجى تحديد أسعار الشراء والبيع للمتجر', 'warning');
      return;
    }
    confirmAddToStore();
  };

  return (
    <div className="page-section">
      <div className="toolbar" style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button className="btn btn-ghost" onClick={() => navigate('/products')}>← عودة للمنتجات</button>
        <div style={{ flex: 1 }}></div>
        {Api.can('PRODUCT_WRITE') && (
          <button className="btn" style={{ background: 'var(--metro-orange)', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px', border: 'none', boxShadow: '0 4px 10px rgba(255,140,0,0.2)' }} onClick={() => navigate(`/products/edit/${id}`)}>
            ✏️ تعديل المنتج
          </button>
        )}
        {onlineBranch && !isLinkedToOnline && (
          <button
            className="btn"
            style={{
              background: 'var(--accent-emerald)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: 'none',
              boxShadow: '0 4px 10px rgba(16,185,129,0.2)'
            }}
            onClick={handleAddToStoreClick}
          >
            🌐 إضافة إلى المتجر الإلكتروني
          </button>
        )}
        <button className="btn" style={{ background: 'var(--metro-blue)', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px', border: 'none', boxShadow: '0 4px 10px rgba(59,130,246,0.2)' }} onClick={() => handlePrintClick('barcode')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <rect x="2" y="5" width="3" height="14" /><rect x="7" y="5" width="1" height="14" />
            <rect x="10" y="5" width="3" height="14" /><rect x="15" y="5" width="2" height="14" />
            <rect x="19" y="5" width="3" height="14" />
          </svg>
          طباعة باركود
        </button>
        <button className="btn" style={{ background: 'var(--accent-purple, #8b5cf6)', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px', border: 'none', boxShadow: '0 4px 10px rgba(139,92,246,0.2)' }} onClick={() => handlePrintClick('qrcode')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" /><path d="M14 14h7v7h-7z" /><path d="M14 14v-2M14 21v-2M21 14v-2M21 21v-2M21 17h2M18 17h.01" />
          </svg>
          طباعة QR
        </button>
        <button className="btn" style={{ background: '#e74c3c', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px', border: 'none', boxShadow: '0 4px 10px rgba(231,76,60,0.2)' }} onClick={handleDownloadPdf} disabled={generatingPdf}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z" />
            <path d="M9.5 17.5l1.5-3 1.5 3 1.5-3 1.5 3" stroke="currentColor" strokeWidth="1" fill="none" />
          </svg>
          {generatingPdf ? 'جاري التحضير...' : 'تنزيل PDF'}
        </button>
      </div>

      {onlineBranch && !isLinkedToOnline && (
        <div
          className="card"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px dashed var(--accent-emerald)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '15px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '2.5rem' }}>🌐</span>
            <div style={{ direction: 'rtl', textAlign: 'right' }}>
              <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-primary)', fontSize: '1.1rem' }}>هذا المنتج غير معروض في المتجر الإلكتروني</h4>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                يمكنك إضافته مباشرة لمتجرك الإلكتروني أونلاين وتحديد أسعار خاصة بالبيع للعملاء أونلاين.
              </p>
            </div>
          </div>
          <button
            className="btn btn-primary"
            style={{ background: 'var(--accent-emerald)', border: 'none', padding: '10px 20px', fontSize: '0.95rem', boxShadow: '0 4px 10px rgba(16,185,129,0.2)' }}
            onClick={handleAddToStoreClick}
          >
            إضافة إلى المتجر الإلكتروني
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
        {/* Gallery - Takes about 35% on large screens */}
        <div className="card" style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', padding: '24px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: (product.imageUrls && product.imageUrls.length > 1) ? '20px' : '0', minHeight: '300px', background: 'var(--bg-body)', borderRadius: '12px', padding: '16px', alignItems: 'center' }}>
            {mainImage
              ? <img src={mainImage} style={{ width: '100%', height: 'auto', maxHeight: '400px', objectFit: 'contain', borderRadius: '8px' }} alt="Main Product" />
              : <div style={{ fontSize: '80px', color: 'var(--text-dim)', opacity: 0.5 }}>📦</div>
            }
          </div>
          {product.imageUrls && product.imageUrls.length > 0 && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', width: '100%', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
              {product.imageUrls.map(img => {
                const thumbUrl = img.startsWith('http') ? img : `${API_BASE}/products/images/${img.split('/').pop()}`;
                return (
                  <img
                    key={thumbUrl}
                    src={thumbUrl}
                    alt="thumbnail"
                    onClick={() => setMainImage(thumbUrl)}
                    style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '10px', border: mainImage === thumbUrl ? '3px solid var(--accent-emerald)' : '2px solid transparent', cursor: 'pointer', background: 'var(--bg-body)', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Details - Takes remaining space */}
        <div className="card" style={{ flex: '2 1 500px', padding: '32px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '24px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '2.2rem', margin: '0 0 16px 0', color: 'var(--text-primary)', fontWeight: 800 }}>
              {product.name}
            </h2>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '0.95rem', flexWrap: 'wrap' }}>
              <span style={{ background: 'var(--accent-emerald-light)', color: 'var(--accent-emerald)', padding: '6px 14px', borderRadius: '8px', fontWeight: 700 }}>
                {product.categoryName || 'بدون فئة'}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>|</span>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fas fa-barcode"></i> <strong>{product.productCode || '—'}</strong>
              </span>
              {units && units.length > 0 && (
                <>
                  <span style={{ color: 'var(--text-muted)' }}>|</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {units.map(u => (
                      <span key={u.id} style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--metro-blue)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                        📦 {u.unitName} = {u.conversionFactor} {product.unitName || 'قطعة'}
                      </span>
                    ))}
                  </div>
                </>
              )}
              <span style={{ color: 'var(--text-muted)' }}>|</span>
              <span style={{ color: badgeColor, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                {totalStock > 0 ? <i className="fas fa-check-circle"></i> : <i className="fas fa-times-circle"></i>} {badgeText}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'var(--bg-body)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px', transition: 'transform 0.2s' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}><i className="fas fa-tag"></i> سعر البيع</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>{Number(currentSalePrice).toFixed(2)} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>ج.م</span></div>
            </div>

            <div style={{ background: 'var(--bg-body)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}><i className="fas fa-shopping-cart"></i> سعر الشراء</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{Number(currentPurchasePrice).toFixed(2)} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>ج.م</span></div>
            </div>

            <div style={{ background: 'var(--bg-body)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}><i className="fas fa-cubes"></i> إجمالي المخزون</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{Number(totalStock).toFixed(2)} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{product.unitName || 'القطعة'}</span></div>
            </div>

            <div style={{ background: 'var(--bg-body)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}><i className="fas fa-chart-line"></i> إجمالي المبيعات</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--metro-blue)' }}>{Number(totalSoldQuantity).toFixed(2)} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{product.unitName || 'القطعة'}</span></div>
            </div>

            <div style={{ background: 'var(--bg-body)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}><i className="fas fa-money-bill-wave"></i> إجمالي الأرباح</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-amber)' }}>{Number(totalRealizedProfit).toFixed(2)} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>ج.م</span></div>
            </div>

            <div style={{ background: 'var(--bg-body)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}><i className="fas fa-eye"></i> مرات المشاهدة</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{product.viewCount || 0}</div>
            </div>

            <div style={{ gridColumn: '1 / -1', background: 'var(--bg-body)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-align-right"></i> الوصف التفصيلي
              </div>
              <div style={{ fontSize: '1rem', color: 'var(--text-primary)', lineHeight: 1.7, opacity: product.description ? 1 : 0.6 }}>
                {product.description || 'لا يوجد وصف متاح لهذا المنتج حتى الآن.'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Tab Navigation ══════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', gap: '4px', marginTop: '24px', borderBottom: '2px solid var(--border-color)', paddingBottom: '0' }}>
        {[
          { key: 'details', label: '📋 تفاصيل المخزون والفروع' },
          { key: 'variants', label: '🎨 المتغيرات (مقاسات / ألوان)' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 22px',
              border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid #6366f1' : '3px solid transparent',
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '14px',
              fontWeight: activeTab === tab.key ? '700' : '500',
              color: activeTab === tab.key ? '#6366f1' : 'var(--text-muted)',
              transition: 'all 0.2s',
              marginBottom: '-2px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'variants' && (
        <div style={{ marginTop: '20px' }}>
          <ProductVariantsTab
            productId={id}
            productSalePrice={currentSalePrice}
            productPurchasePrice={currentPurchasePrice}
          />
        </div>
      )}

      {activeTab === 'details' && (
      <div style={{ marginTop: '20px' }}>
      {/* ═══ Branch Inventories Section ══════════════════════════════════════════ */}
      <div className="card">
        <div className="card-header">
          <h3>📍 أسعار ومخزون الفروع التفصيلية</h3>
        </div>
        <div className="card-body no-padding">
          <div className="table-wrapper">
            {(!product.branchInventories || product.branchInventories.length === 0) ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                لا توجد بيانات فروع متوفرة لهذا المنتج.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الفرع</th>
                    <th>سعر الشراء</th>
                    <th>سعر البيع</th>
                    <th>المخزون</th>
                    <th>الكمية المباعة</th>
                    <th>الربح الفعلي</th>
                    <th>المتجر الإلكتروني</th>
                    {Api.can('PRODUCT_WRITE') && <th>الإجراءات</th>}
                  </tr>
                </thead>
                <tbody>
                  {product.branchInventories.map((bi) => {
                    const isCurrent = Number(bi.branchId) === Number(selectedBranchId);
                    return (
                      <tr key={bi.branchId} style={{ background: isCurrent ? 'var(--bg-hover)' : 'transparent', borderLeft: isCurrent ? '4px solid var(--metro-blue)' : 'none' }}>
                        <td style={{ fontWeight: 600 }}>
                          📍 {bi.branchName} {isCurrent && <span style={{ fontSize: '0.75rem', color: 'var(--metro-blue)', marginRight: '5px' }}>(الفرع النشط الحالي)</span>}
                        </td>
                        <td>{Number(bi.purchasePrice).toFixed(2)} ج.م</td>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{Number(bi.salePrice).toFixed(2)} ج.م</td>
                        <td>
                          <span className={`badge ${Number(bi.stock) <= 5 ? 'badge-danger' : Number(bi.stock) <= 15 ? 'badge-warning' : 'badge-success'}`}>
                            {Number(bi.stock).toFixed(0)}
                          </span>
                        </td>
                        <td>{Number(bi.soldQuantity).toFixed(0)}</td>
                        <td style={{ fontWeight: 600, color: 'var(--accent-amber)' }}>{Number(bi.realizedProfit).toFixed(2)} ج.م</td>
                        <td>
                          <span className={`badge ${bi.showInStore ? 'badge-success' : 'badge-secondary'}`}>
                            {bi.showInStore ? '🌐 معروض أونلاين' : '🔒 مخفي'}
                          </span>
                        </td>
                        {Api.can('PRODUCT_WRITE') && (
                          <td>
                            <button
                              className="btn btn-icon btn-ghost"
                              title="تعديل السعر"
                              onClick={() => openEditBranchPriceModal(bi)}
                            >
                              ✏️
                            </button>
                            {Api.isAdmin() && (
                              <>
                                <button
                                  className="btn btn-icon btn-ghost"
                                  title="مسح من الفرع (أدمن)"
                                  style={{ color: 'var(--metro-red)' }}
                                  onClick={() => handleAdminDelete(bi)}
                                >
                                  🗑️
                                </button>
                                <button
                                  className="btn btn-icon btn-ghost"
                                  title="نقل مخزون (أدمن)"
                                  style={{ color: 'var(--accent-purple)' }}
                                  onClick={() => openAdminTransfer(bi)}
                                >
                                  🚚
                                </button>
                              </>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Unit Management Section ══════════════════════════════════════════ */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <h3>📦 وحدات التغليف والكميات الجملة</h3>
          <button className="btn btn-primary btn-sm" onClick={openAddUnit}>+ إضافة وحدة</button>
        </div>
        <div className="card-body">

          {/* Unit Form */}
          {showUnitForm && (
            <form onSubmit={handleSaveUnit} style={{
              background: 'var(--bg-elevated)', borderRadius: '8px',
              padding: '20px', marginBottom: '20px', border: '1px solid var(--border-color)'
            }}>
              <h4 style={{ marginBottom: '16px' }}>{editingUnit ? 'تعديل الوحدة' : 'إضافة وحدة جديدة'}</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>اسم الوحدة *</label>
                  <input className="form-control" placeholder="كرتونة، شكارة، دستة..." value={unitForm.unitName}
                    onChange={e => setUnitForm({ ...unitForm, unitName: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>معامل التحويل * <small style={{ color: 'var(--text-muted)' }}>(كم وحدة أساسية بداخلها)</small></label>
                  <input className="form-control" type="number" step="0.001" min="0.001" placeholder="12، 10، 6..." value={unitForm.conversionFactor}
                    onChange={e => setUnitForm({ ...unitForm, conversionFactor: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>سعر الشراء</label>
                  <input className="form-control" type="number" step="0.01" min="0" placeholder="120.00" value={unitForm.purchasePrice}
                    onChange={e => setUnitForm({ ...unitForm, purchasePrice: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>سعر البيع (القطاعي)</label>
                  <input className="form-control" type="number" step="0.01" min="0" placeholder="150.00" value={unitForm.salePrice}
                    onChange={e => setUnitForm({ ...unitForm, salePrice: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>سعر البيع بالجملة</label>
                  <input className="form-control" type="number" step="0.01" min="0" placeholder="140.00" value={unitForm.wholesaleSalePrice}
                    onChange={e => setUnitForm({ ...unitForm, wholesaleSalePrice: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={unitForm.isDefaultPurchase}
                    onChange={e => setUnitForm({ ...unitForm, isDefaultPurchase: e.target.checked })} />
                  الوحدة الافتراضية للشراء
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={unitForm.isDefaultSale}
                    onChange={e => setUnitForm({ ...unitForm, isDefaultSale: e.target.checked })} />
                  الوحدة الافتراضية للبيع
                </label>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary" disabled={savingUnit}>
                  {savingUnit ? 'جاري الحفظ...' : (editingUnit ? 'حفظ التعديل' : 'إضافة الوحدة')}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowUnitForm(false)}>إلغاء</button>
              </div>
            </form>
          )}

          {/* Units Table */}
          {units.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
              لا توجد وحدات جملة محددة — المنتج يُباع ويُشترى بالوحدة الأساسية ({product.unitName || 'قطعة'})
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>اسم الوحدة</th>
                    <th>معامل التحويل</th>
                    <th>= كم وحدة أساسية</th>
                    <th>سعر الشراء</th>
                    <th>سعر البيع القطاعي</th>
                    <th>سعر البيع الجملة</th>
                    <th>افتراضي شراء</th>
                    <th>افتراضي بيع</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.unitName}</td>
                      <td>×{u.conversionFactor}</td>
                      <td style={{ color: 'var(--accent-emerald)' }}>
                        1 {u.unitName} = <strong>{u.conversionFactor}</strong> {product.unitName || 'قطعة'}
                      </td>
                      <td>{u.purchasePrice ? Number(u.purchasePrice).toFixed(2) : '—'}</td>
                      <td>{u.salePrice ? Number(u.salePrice).toFixed(2) : '—'}</td>
                      <td>{u.wholesaleSalePrice ? Number(u.wholesaleSalePrice).toFixed(2) : '—'}</td>
                      <td style={{ textAlign: 'center' }}>{u.isDefaultPurchase ? '✅' : '—'}</td>
                      <td style={{ textAlign: 'center' }}>{u.isDefaultSale ? '✅' : '—'}</td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-icon btn-ghost" title="تعديل" onClick={() => openEditUnit(u)}>✏️</button>
                          <button className="btn btn-icon btn-ghost" title="حذف" style={{ color: 'var(--metro-red)' }} onClick={() => handleDeleteUnit(u.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {/* ═══ Stock Distribution Section ══════════════════════════════════════════ */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>🏭 توزيع المخزون على الفروع والمخازن</h3>
          <button className="btn btn-primary btn-sm" onClick={() => {
            setStockForm({ warehouseId: '', quantity: '', minQuantity: '', maxQuantity: '' });
            setShowStockModal(true);
          }}>+ إضافة/تعديل مخزون</button>
        </div>
        <div className="card-body no-padding">
          <div className="table-wrapper">
            {distribution.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                هذا المنتج غير موجود حالياً في أي مخزن.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الفرع</th>
                    <th>المخزن</th>
                    <th>الكمية المتوفرة</th>
                    <th>الحد الأدنى</th>
                    <th>الحالة</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {distribution.map((item, idx) => {
                    const isLow = item.minQuantity != null && Number(item.quantity) <= Number(item.minQuantity);
                    return (
                      <tr key={`${item.warehouseId}-${idx}`}>
                        <td>📍 {item.branchName}</td>
                        <td style={{ fontWeight: 600 }}>🏭 {item.warehouseName}</td>
                        <td>{Number(item.quantity).toFixed(2)} {product.unitName || 'قطعة'}</td>
                        <td>{item.minQuantity != null ? Number(item.minQuantity).toFixed(2) : '—'}</td>
                        <td>
                          {isLow ? (
                            <span className="badge badge-danger">⚠️ مخزون منخفض</span>
                          ) : (
                            <span className="badge badge-success">✅ متوفر</span>
                          )}
                        </td>
                        <td>
                          <button className="btn btn-icon btn-ghost" title="تعديل" onClick={() => {
                            setStockForm({
                              warehouseId: item.warehouseId,
                              quantity: item.quantity,
                              minQuantity: item.minQuantity || '',
                              maxQuantity: item.maxQuantity || ''
                            });
                            setShowStockModal(true);
                          }}>✏️</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      </div>
      )} {/* end activeTab === 'details' wrapper div */}

      {/* Stock Management Modal */}
      {showStockModal && ReactDOM.createPortal(
        <div className="modal-overlay active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="modal" style={{ width: '100%', maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>توزيع المخزون</h3>
              <button className="modal-close" onClick={() => setShowStockModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form id="stockForm" onSubmit={handleUpdateStock}>
                <div className="form-group">
                  <label>المخزن المستهدف *</label>
                  <select className="form-control" value={stockForm.warehouseId}
                    onChange={e => setStockForm({ ...stockForm, warehouseId: e.target.value })} required>
                    <option value="">اختر المخزن...</option>
                    {warehouses.map(w => (
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
                {savingStock ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Hidden PDF Renderer */}
      {product && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
          <div ref={pdfRef}>
            <SingleProductPdf product={product} />
          </div>
        </div>
      )}

      {/* Warning Modal for Stock in Other Branches */}
      {showWarningModal && ReactDOM.createPortal(
        <div className="modal-overlay active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="modal" style={{ width: '100%', maxWidth: '550px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <h3>⚠️ تنبيه: مخزون متوفر في فروع أخرى</h3>
              <button className="modal-close" onClick={() => setShowWarningModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ direction: 'rtl', textAlign: 'right', padding: '20px' }}>
              <p style={{ fontSize: '1rem', lineHeight: 1.6, marginBottom: '15px', color: 'var(--text-primary)' }}>
                لقد اشتريت هذا المنتج من قبل ولديه مخزون متوفر في فروع أخرى (إجمالي المخزون المتاح: <strong>{totalOtherStock}</strong> {product.unitName || 'قطعة'}).
              </p>
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
                <ul style={{ margin: 0, paddingRight: '20px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  {otherBranchesWithStock.map(bi => (
                    <li key={bi.branchId} style={{ marginBottom: '5px' }}>
                      فرع <strong>{bi.branchName}</strong>: {bi.stock} {product.unitName || 'قطعة'}
                    </li>
                  ))}
                </ul>
              </div>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                هل تفضل إضافة المنتج مباشرة إلى المتجر الإلكتروني (بمخزون 0) أم ترغب في طلب نقل مخزون من أحد الفروع إلى المتجر الإلكتروني؟
              </p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-start', direction: 'rtl' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowWarningModal(false);
                  setShowAddToStoreModal(true);
                }}
              >
                🌐 إضافة مباشرة (بمخزون 0)
              </button>
              <button
                className="btn"
                style={{ background: 'var(--accent-purple, #8b5cf6)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
                onClick={() => {
                  setShowWarningModal(false);
                  navigate('/stock-transfers', {
                    state: {
                      prefill: {
                        transferType: 'BRANCH_TO_BRANCH',
                        fromBranchId: otherBranchesWithStock[0]?.branchId || '',
                        toBranchId: onlineBranch.id,
                        productId: product.id,
                        productName: product.name,
                        quantity: totalOtherStock,
                        unitName: product.unitName || 'قطعة'
                      }
                    }
                  });
                }}
              >
                🚚 طلب نقل مخزون
              </button>
              <button className="btn btn-ghost" onClick={() => setShowWarningModal(false)}>إلغاء</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add to Store Prices Modal */}
      {showAddToStoreModal && ReactDOM.createPortal(
        <div className="modal-overlay active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="modal" style={{ width: '100%', maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>🌐 إضافة المنتج للمتجر الإلكتروني</h3>
              <button className="modal-close" onClick={() => setShowAddToStoreModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ direction: 'rtl', textAlign: 'right' }}>
              <form id="addToStoreForm" onSubmit={handleSaveToStore}>
                <div style={{ marginBottom: '15px' }}>
                  <label className="form-label">الفرع المستهدف</label>
                  <input className="form-control" value={onlineBranch?.name || 'المتجر الإلكتروني'} disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">سعر الشراء للمتجر الإلكتروني (ج.م) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    value={storePrices.purchasePrice}
                    onChange={e => setStorePrices({ ...storePrices, purchasePrice: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">سعر البيع للمتجر الإلكتروني (ج.م) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    value={storePrices.salePrice}
                    onChange={e => setStorePrices({ ...storePrices, salePrice: e.target.value })}
                    required
                  />
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '10px' }}>
                  * سيتم إدراج هذا المنتج في المتجر الإلكتروني بمخزون مبدئي (0). يمكنك تعديل المخزون لاحقاً أو طلب نقل مخزون.
                </p>
              </form>
            </div>
            <div className="modal-footer" style={{ direction: 'rtl', display: 'flex', gap: '10px', justifyContent: 'flex-start' }}>
              <button type="submit" form="addToStoreForm" className="btn btn-primary" disabled={addingToStore}>
                {addingToStore ? 'جاري الإضافة...' : 'تأكيد الإضافة'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAddToStoreModal(false)}>إلغاء</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Branch Price Modal */}
      {showEditBranchPriceModal && editingBranchInventory && ReactDOM.createPortal(
        <div className="modal-overlay active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="modal" style={{ width: '100%', maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>✏️ تعديل سعر ومواصفات الفرع</h3>
              <button className="modal-close" onClick={() => setShowEditBranchPriceModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ direction: 'rtl', textAlign: 'right' }}>
              <form id="branchPriceForm" onSubmit={handleUpdateBranchPrice}>
                <div style={{ marginBottom: '15px' }}>
                  <label className="form-label">الفرع</label>
                  <input className="form-control" value={editingBranchInventory.branchName || ''} disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">سعر الشراء (ج.م) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    value={branchPriceForm.purchasePrice}
                    onChange={e => setBranchPriceForm({ ...branchPriceForm, purchasePrice: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">سعر البيع (ج.م) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    value={branchPriceForm.salePrice}
                    onChange={e => setBranchPriceForm({ ...branchPriceForm, salePrice: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '15px', marginBottom: '15px' }}>
                  <input
                    type="checkbox"
                    id="branchShowInStore"
                    checked={branchPriceForm.showInStore}
                    onChange={e => setBranchPriceForm({ ...branchPriceForm, showInStore: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', margin: 0 }}
                  />
                  <label htmlFor="branchShowInStore" style={{ margin: 0, cursor: 'pointer', fontWeight: 600, display: 'inline-block', color: 'var(--text-primary)' }}>
                    عرض المنتج في هذا الفرع/المتجر
                  </label>
                </div>
              </form>
            </div>
            <div className="modal-footer" style={{ direction: 'rtl', display: 'flex', gap: '10px', justifyContent: 'flex-start' }}>
              <button type="submit" form="branchPriceForm" className="btn btn-primary" disabled={savingBranchPrice}>
                {savingBranchPrice ? 'جاري الحفظ...' : 'تأكيد الحفظ'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowEditBranchPriceModal(false)}>إلغاء</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Admin Transfer Modal */}
      {showAdminTransferModal && ReactDOM.createPortal(
        <div className="modal-overlay active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="modal" style={{ width: '100%', maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>🚚 طلب نقل منتج (صلاحية أدمن)</h3>
              <button className="modal-close" onClick={() => setShowAdminTransferModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ direction: 'rtl', textAlign: 'right' }}>
              <form id="adminTransferForm" onSubmit={submitAdminTransfer}>
                <div style={{ marginBottom: '15px' }}>
                  <label className="form-label">الفرع المصدر</label>
                  <input className="form-control" value={adminTransferForm.fromBranchName || ''} disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">الفرع الوجهة *</label>
                  <select
                    className="form-control"
                    value={adminTransferForm.toBranchId}
                    onChange={e => setAdminTransferForm({ ...adminTransferForm, toBranchId: e.target.value })}
                    required
                  >
                    <option value="">اختر الفرع...</option>
                    {branches && branches.filter(b => b.id != adminTransferForm.fromBranchId && b.type !== 'ONLINE').map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">الكمية للنقل *</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    className="form-control"
                    value={adminTransferForm.quantity}
                    onChange={e => setAdminTransferForm({ ...adminTransferForm, quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">ملاحظات النقل</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={adminTransferForm.notes}
                    onChange={e => setAdminTransferForm({ ...adminTransferForm, notes: e.target.value })}
                  />
                </div>
              </form>
            </div>
            <div className="modal-footer" style={{ direction: 'rtl', display: 'flex', gap: '10px', justifyContent: 'flex-start' }}>
              <button type="submit" form="adminTransferForm" className="btn btn-primary" disabled={adminTransferring}>
                {adminTransferring ? 'جاري الإنشاء...' : 'إنشاء طلب النقل'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAdminTransferModal(false)}>إلغاء</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ProductDetails;
