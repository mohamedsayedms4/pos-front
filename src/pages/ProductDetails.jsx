import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Api, { API_BASE } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import '../styles/pages/ProductDetailsPremium.css';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useGlobalUI();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mainImage, setMainImage] = useState(null);

  // ─── Unit management ───────────────────────────────────────────────────────
  const [units, setUnits] = useState([]);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
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

  const loadUnits = async () => {
    try {
      const data = await Api.getProductUnits(id);
      setUnits(data || []);
    } catch { /* ignore */ }
  };

  const openAddUnit = () => {
    setEditingUnit(null);
    setUnitForm({ unitName: '', conversionFactor: '', purchasePrice: '', salePrice: '', isDefaultPurchase: false, isDefaultSale: false });
    setShowUnitForm(true);
  };

  const openEditUnit = (u) => {
    setEditingUnit(u);
    setUnitForm({
      unitName: u.unitName,
      conversionFactor: u.conversionFactor,
      purchasePrice: u.purchasePrice,
      salePrice: u.salePrice,
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
    if (!window.confirm('هل أنت متأكد من حذف هذه الوحدة؟')) return;
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
      const prod = await Api.getProduct(id);
      setProduct(prod);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSavingStock(false);
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

  const printCode = async (type) => {
    if (type === 'qrcode') {
      const base64Data = await Api.getProductQrCode(id);
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
          <html dir="rtl">
            <head>
              <title>QR Code</title>
              <style>
                body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
                img { max-width: 150px; }
              </style>
            </head>
            <body onload="window.print(); window.close();">
              <img src="data:image/png;base64,${base64Data}" />
            </body>
          </html>
        `);
      return;
    }

    try {
      const imageUrl = await Api.getProductBarcodeLabel(id);
      const config = await Api.getPrinterConfig();
      const width = config.labelWidthMm || 40;
      const height = config.labelHeightMm || 30;

      const dataUrl = await new Promise((resolve, reject) => {
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
        img.src = imageUrl;
      });

      const oldFrame = document.getElementById('__barcode_print_frame');
      if (oldFrame) oldFrame.remove();

      const iframe = document.createElement('iframe');
      iframe.id = '__barcode_print_frame';
      iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;';
      document.body.appendChild(iframe);

      const idoc = iframe.contentDocument || iframe.contentWindow.document;
      const sw = width - 4;
      const sh = height - 4;

      idoc.open();
      idoc.write([
        '<!DOCTYPE html><html><head><meta charset="utf-8">',
        '<style>',
        '@page{size:auto;margin:0}',
        '*{margin:0;padding:0;box-sizing:border-box}',
        `html,body{width:${width}mm;height:${height}mm;overflow:hidden;background:#fff}`,
        `body{display:flex;align-items:center;justify-content:center}`,
        `img{max-width:${sw}mm;max-height:${sh}mm;width:auto;height:auto;display:block;object-fit:contain}`,
        '@media print{html,body{overflow:hidden}img{page-break-inside:avoid;page-break-after:avoid;page-break-before:avoid}}',
        '</style></head>',
        `<body><img src="${dataUrl}"/></body></html>`,
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
    } catch (err) {
      toast('فشل في الطباعة: ' + err.message, 'error');
    }
  };

  if (loading) return <Loader message="جاري تحميل تفاصيل المنتج..." />;

  if (error || !product) {
    return (
      <div className="details-page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="det-info-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⚠️</div>
          <h2>{error ? 'حدث خطأ' : 'لم يتم العثور على المنتج'}</h2>
          <p style={{ color: 'var(--det-text-secondary)', marginBottom: '30px' }}>{error || 'رقم المنتج غير صحيح أو مفقود'}</p>
          <button className="det-btn-back" style={{ margin: '0 auto' }} onClick={() => navigate('/products')}>العودة للمنتجات</button>
        </div>
      </div>
    );
  }

  const stockColor = Number(product.stock) > 0 ? '#10b981' : '#ef4444';
  const stockText = Number(product.stock) > 0 ? 'متوفر بالمخزن' : 'نفذت الكمية';

  return (
    <div className="details-page-container">
      <div className="det-toolbar">
        <button className="det-btn-back" onClick={() => navigate('/products')}>
          <i className="fas fa-arrow-right"></i>
          <span>العودة للمنتجات</span>
        </button>
        <div className="det-actions">
          <button className="det-btn-action" style={{ background: '#3b82f6', color: '#fff' }} onClick={() => printCode('barcode')}>
            <i className="fas fa-barcode"></i>
            <span>طباعة باركود</span>
          </button>
          <button className="det-btn-action" style={{ background: '#8b5cf6', color: '#fff' }} onClick={() => printCode('qrcode')}>
            <i className="fas fa-qrcode"></i>
            <span>طباعة QR</span>
          </button>
        </div>
      </div>

      <div className="det-main-grid">
        {/* Gallery Section */}
        <div className="det-gallery-card">
          <div className="det-main-img-wrapper">
            {mainImage
              ? <img src={mainImage} className="det-main-img" alt={product.name} />
              : <div style={{ fontSize: '80px' }}>📦</div>
            }
          </div>
          {product.imageUrls && product.imageUrls.length > 0 && (
            <div className="det-thumbnails">
              {product.imageUrls.map(img => {
                const thumbUrl = img.startsWith('http') ? img : `${API_BASE}/products/images/${img.split('/').pop()}`;
                return (
                  <img
                    key={thumbUrl}
                    src={thumbUrl}
                    className={`det-thumb ${mainImage === thumbUrl ? 'active' : ''}`}
                    alt="thumbnail"
                    onClick={() => setMainImage(thumbUrl)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="det-info-card">
          <div className="det-product-header">
            <h2>{product.name}</h2>
            <div className="det-meta-row">
              <span className="det-badge">{product.categoryName || 'بدون فئة'}</span>
              <span style={{ color: 'var(--det-text-secondary)' }}>|</span>
              <span style={{ color: 'var(--det-text-secondary)' }}>كود: <strong>{product.productCode || '—'}</strong></span>
              <span style={{ color: 'var(--det-text-secondary)' }}>|</span>
              <span style={{ color: stockColor, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: stockColor }}></span>
                {stockText}
              </span>
            </div>
          </div>

          <div className="det-metrics-grid">
            <div className="det-metric-item">
              <div className="det-metric-label"><i className="fas fa-tag"></i> سعر البيع</div>
              <div className="det-metric-value" style={{ color: '#10b981' }}>{Number(product.salePrice).toLocaleString()} <small>ج.م</small></div>
            </div>
            <div className="det-metric-item">
              <div className="det-metric-label"><i className="fas fa-shopping-basket"></i> سعر الشراء</div>
              <div className="det-metric-value">{Number(product.purchasePrice).toLocaleString()} <small>ج.م</small></div>
            </div>
            <div className="det-metric-item">
              <div className="det-metric-label"><i className="fas fa-boxes"></i> المخزون</div>
              <div className="det-metric-value">{Number(product.stock).toLocaleString()} <small>{product.unitName || 'قطعة'}</small></div>
            </div>
            <div className="det-metric-item">
              <div className="det-metric-label"><i className="fas fa-chart-line"></i> الكمية المباعة</div>
              <div className="det-metric-value" style={{ color: '#3b82f6' }}>{Number(product.soldQuantity || 0).toLocaleString()}</div>
            </div>
            <div className="det-metric-item">
              <div className="det-metric-label"><i className="fas fa-hand-holding-usd"></i> الربح الفعلي</div>
              <div className="det-metric-value" style={{ color: '#f59e0b' }}>{Number(product.realizedProfit || 0).toLocaleString()} <small>ج.م</small></div>
            </div>
            <div className="det-metric-item">
              <div className="det-metric-label"><i className="fas fa-eye"></i> المشاهدات</div>
              <div className="det-metric-value">{product.viewCount || 0}</div>
            </div>
            <div className="det-metric-item det-full-width">
              <div className="det-metric-label"><i className="fas fa-info-circle"></i> الوصف</div>
              <div style={{ color: 'var(--det-text-secondary)', lineHeight: 1.6 }}>{product.description || 'لا يوجد وصف متاح لهذا المنتج.'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Units Management */}
      <div className="det-section-card">
        <div className="det-section-header">
          <h3><i className="fas fa-layer-group" style={{ color: '#8b5cf6' }}></i> وحدات التغليف والكميات الجملة</h3>
          <button className="det-btn-action" style={{ background: 'var(--det-glass)', border: '1px solid var(--det-glass-border)', color: 'var(--det-text-primary)' }} onClick={openAddUnit}>
            <i className="fas fa-plus"></i> إضافة وحدة
          </button>
        </div>

        {showUnitForm && (
          <div className="det-info-card" style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.1)' }}>
            <form onSubmit={handleSaveUnit}>
               <h4 style={{ marginBottom: '20px' }}>{editingUnit ? 'تعديل الوحدة' : 'إضافة وحدة جديدة'}</h4>
               <div className="ana-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>اسم الوحدة</label>
                    <input className="form-control" style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--det-bg-dark)', border: '1px solid var(--det-glass-border)', color: '#fff' }}
                      value={unitForm.unitName} onChange={e => setUnitForm({ ...unitForm, unitName: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>معامل التحويل</label>
                    <input className="form-control" type="number" step="0.001" style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--det-bg-dark)', border: '1px solid var(--det-glass-border)', color: '#fff' }}
                      value={unitForm.conversionFactor} onChange={e => setUnitForm({ ...unitForm, conversionFactor: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>سعر الشراء</label>
                    <input className="form-control" type="number" step="0.01" style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--det-bg-dark)', border: '1px solid var(--det-glass-border)', color: '#fff' }}
                      value={unitForm.purchasePrice} onChange={e => setUnitForm({ ...unitForm, purchasePrice: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>سعر البيع</label>
                    <input className="form-control" type="number" step="0.01" style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--det-bg-dark)', border: '1px solid var(--det-glass-border)', color: '#fff' }}
                      value={unitForm.salePrice} onChange={e => setUnitForm({ ...unitForm, salePrice: e.target.value })} />
                  </div>
               </div>
               <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={unitForm.isDefaultPurchase} onChange={e => setUnitForm({ ...unitForm, isDefaultPurchase: e.target.checked })} /> افتراضي شراء
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={unitForm.isDefaultSale} onChange={e => setUnitForm({ ...unitForm, isDefaultSale: e.target.checked })} /> افتراضي بيع
                  </label>
               </div>
               <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="submit" className="det-btn-action" style={{ background: '#3b82f6', color: '#fff' }} disabled={savingUnit}>
                    {savingUnit ? 'جاري الحفظ...' : 'حفظ الوحدة'}
                  </button>
                  <button type="button" className="det-btn-action" style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444' }} onClick={() => setShowUnitForm(false)}>إلغاء</button>
               </div>
            </form>
          </div>
        )}

        <div className="det-table-wrapper">
          <table className="det-table units">
            <thead>
              <tr>
                <th>اسم الوحدة</th>
                <th>معامل التحويل</th>
                <th>سعر الشراء</th>
                <th>سعر البيع</th>
                <th>افتراضي</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {units.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--det-text-secondary)' }}>لا توجد وحدات إضافية</td></tr>
              ) : (
                units.map(u => (
                  <tr key={u.id}>
                    <td data-label="اسم الوحدة" style={{ fontWeight: 700 }}>{u.unitName}</td>
                    <td data-label="معامل التحويل">×{u.conversionFactor} {product.unitName || 'قطعة'}</td>
                    <td data-label="سعر الشراء">{Number(u.purchasePrice || 0).toLocaleString()}</td>
                    <td data-label="سعر البيع">{Number(u.salePrice || 0).toLocaleString()}</td>
                    <td data-label="افتراضي">{u.isDefaultPurchase ? '📥 ' : ''} {u.isDefaultSale ? '📤' : ''}</td>
                    <td data-label="إجراءات">
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="det-btn-action" style={{ padding: '6px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }} onClick={() => openEditUnit(u)}><i className="fas fa-edit"></i></button>
                        <button className="det-btn-action" style={{ padding: '6px', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }} onClick={() => handleDeleteUnit(u.id)}><i className="fas fa-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Distribution */}
      <div className="det-section-card">
        <div className="det-section-header">
          <h3><i className="fas fa-warehouse" style={{ color: '#3b82f6' }}></i> توزيع المخزون على الفروع</h3>
          <button className="det-btn-action" style={{ background: 'var(--det-glass)', border: '1px solid var(--det-glass-border)', color: 'var(--det-text-primary)' }} onClick={() => { setStockForm({ warehouseId: '', quantity: '', minQuantity: '', maxQuantity: '' }); setShowStockModal(true); }}>
            <i className="fas fa-sync"></i> تحديث المخزون
          </button>
        </div>

        <div className="det-table-wrapper">
          <table className="det-table stock">
            <thead>
              <tr>
                <th>الفرع / المخزن</th>
                <th>الكمية المتوفرة</th>
                <th>الحد الأدنى</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {distribution.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--det-text-secondary)' }}>غير متوفر في أي مخزن حالياً</td></tr>
              ) : (
                distribution.map((item, idx) => {
                  const isLow = item.minQuantity != null && Number(item.quantity) <= Number(item.minQuantity);
                  return (
                    <tr key={idx}>
                      <td data-label="الفرع / المخزن">
                         <div style={{ fontWeight: 700 }}>{item.warehouseName}</div>
                         <div style={{ fontSize: '0.8rem', color: 'var(--det-text-secondary)' }}>{item.branchName}</div>
                      </td>
                      <td data-label="الكمية المتوفرة" style={{ fontSize: '1.1rem', fontWeight: 800 }}>{Number(item.quantity).toLocaleString()}</td>
                      <td data-label="الحد الأدنى">{item.minQuantity || '—'}</td>
                      <td data-label="الحالة">
                        <span className="det-badge" style={{ background: isLow ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: isLow ? '#ef4444' : '#10b981', border: 'none' }}>
                          {isLow ? '⚠️ منخفض' : '✅ جيد'}
                        </span>
                      </td>
                      <td data-label="إجراءات">
                         <button className="det-btn-action" style={{ padding: '6px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }} onClick={() => { setStockForm({ warehouseId: item.warehouseId, quantity: item.quantity, minQuantity: item.minQuantity || '', maxQuantity: item.maxQuantity || '' }); setShowStockModal(true); }}><i className="fas fa-edit"></i></button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Modal */}
      {showStockModal && (
        <div className="det-modal-overlay" onClick={() => setShowStockModal(false)}>
          <div className="det-modal" onClick={e => e.stopPropagation()}>
            <div className="det-modal-header">
              <h3>توزيع المخزون</h3>
              <button style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setShowStockModal(false)}>✕</button>
            </div>
            <div className="det-modal-body">
               <form id="stockForm" onSubmit={handleUpdateStock}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px' }}>المخزن المستهدف</label>
                    <select className="form-control" style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--det-bg-dark)', border: '1px solid var(--det-glass-border)', color: '#fff' }}
                      value={stockForm.warehouseId} onChange={e => setStockForm({ ...stockForm, warehouseId: e.target.value })} required>
                      <option value="">اختر المخزن...</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.branchName} - {w.name}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px' }}>الكمية الحالية</label>
                    <input className="form-control" type="number" step="0.001" style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--det-bg-dark)', border: '1px solid var(--det-glass-border)', color: '#fff' }}
                      value={stockForm.quantity} onChange={e => setStockForm({ ...stockForm, quantity: e.target.value })} required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px' }}>الحد الأدنى</label>
                      <input className="form-control" type="number" step="0.001" style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--det-bg-dark)', border: '1px solid var(--det-glass-border)', color: '#fff' }}
                        value={stockForm.minQuantity} onChange={e => setStockForm({ ...stockForm, minQuantity: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px' }}>الحد الأقصى</label>
                      <input className="form-control" type="number" step="0.001" style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--det-bg-dark)', border: '1px solid var(--det-glass-border)', color: '#fff' }}
                        value={stockForm.maxQuantity} onChange={e => setStockForm({ ...stockForm, maxQuantity: e.target.value })} />
                    </div>
                  </div>
               </form>
            </div>
            <div className="det-modal-footer">
               <button className="det-btn-action" style={{ background: 'transparent', color: 'var(--det-text-secondary)' }} onClick={() => setShowStockModal(false)}>إلغاء</button>
               <button type="submit" form="stockForm" className="det-btn-action" style={{ background: '#3b82f6', color: '#fff' }} disabled={savingStock}>
                 {savingStock ? 'جاري الحفظ...' : 'حفظ التغييرات'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetails;
