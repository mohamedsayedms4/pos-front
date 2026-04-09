import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Api, { API_BASE } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';

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
  const [editingUnit, setEditingUnit] = useState(null); // null = add mode
  const [unitForm, setUnitForm] = useState({
    unitName: '', conversionFactor: '', purchasePrice: '', salePrice: '',
    isDefaultPurchase: false, isDefaultSale: false
  });
  const [savingUnit, setSavingUnit] = useState(false);

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
    try {
      await Api.deleteProductUnit(id, unitId);
      toast('تم حذف الوحدة', 'success');
      loadUnits();
    } catch (err) {
      toast(err.message, 'error');
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
      // 1. Get Image URL and Config
      const imageUrl = await Api.getProductBarcodeLabel(id);
      const config = await Api.getPrinterConfig();
      const width = config.labelWidthMm || 40;
      const height = config.labelHeightMm || 30;

      // 2. Pre-load image as data URL to avoid blank labels
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

  const badgeColor = Number(product.stock) > 0 ? 'var(--accent-emerald)' : 'var(--metro-red)';
  const badgeText = Number(product.stock) > 0 ? 'متوفر بالمخزن' : 'نفذت الكمية';

  return (
    <div className="page-section">
      <div className="toolbar" style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button className="btn btn-ghost" onClick={() => navigate('/products')}>← عودة للمنتجات</button>
        <div style={{ flex: 1 }}></div>
        <button className="btn" style={{ background: 'var(--metro-blue)', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px', border: 'none', boxShadow: '0 4px 10px rgba(59,130,246,0.2)' }} onClick={() => printCode('barcode')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <rect x="2" y="5" width="3" height="14" /><rect x="7" y="5" width="1" height="14" />
            <rect x="10" y="5" width="3" height="14" /><rect x="15" y="5" width="2" height="14" />
            <rect x="19" y="5" width="3" height="14" />
          </svg>
          طباعة باركود
        </button>
        <button className="btn" style={{ background: 'var(--accent-purple, #8b5cf6)', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px', border: 'none', boxShadow: '0 4px 10px rgba(139,92,246,0.2)' }} onClick={() => printCode('qrcode')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" /><path d="M14 14h7v7h-7z" /><path d="M14 14v-2M14 21v-2M21 14v-2M21 21v-2M21 17h2M18 17h.01" />
          </svg>
          طباعة QR
        </button>
      </div>

      <div className="product-details-grid">
        {/* Gallery */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: (product.imageUrls && product.imageUrls.length > 1) ? '20px' : '0', minHeight: '200px', alignItems: 'center' }}>
            {mainImage
              ? <img src={mainImage} style={{ maxWidth: '100%', height: 'auto', maxHeight: '400px', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} alt="Main Product" />
              : <div style={{ fontSize: '100px', color: 'var(--text-dim)' }}>📦</div>
            }
          </div>
          {product.imageUrls && product.imageUrls.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', width: '100%', paddingTop: '15px', borderTop: '1px solid var(--border-color)' }}>
              {product.imageUrls.map(img => {
                const thumbUrl = img.startsWith('http') ? img : `${API_BASE}/products/images/${img.split('/').pop()}`;
                return (
                  <img
                    key={thumbUrl}
                    src={thumbUrl}
                    alt="thumbnail"
                    onClick={() => setMainImage(thumbUrl)}
                    style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: mainImage === thumbUrl ? '2px solid var(--metro-blue)' : '2px solid var(--border-color)', cursor: 'pointer', background: 'var(--bg-card)' }}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="card">
          <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.8rem', margin: '0 0 10px 0', color: 'var(--text-primary)' }}>
              {product.name}
            </h2>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '0.9rem', flexWrap: 'wrap' }}>
              <span style={{ background: 'var(--bg-card)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>{product.categoryName || 'بدون فئة'}</span>
              <span style={{ color: 'var(--text-muted)' }}>|</span>
              <span style={{ color: 'var(--text-muted)' }}>كود: <strong>{product.productCode || '—'}</strong></span>
              {units && units.length > 0 && (
                <>
                  <span style={{ color: 'var(--text-muted)' }}>|</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {units.map(u => (
                      <span key={u.id} className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-emerald)', border: '1px solid rgba(16,185,129,0.2)', fontSize: '0.75rem' }}>
                        📦 {u.unitName} = {u.conversionFactor} {product.unitName || 'قطعة'}
                      </span>
                    ))}
                  </div>
                </>
              )}
              <span style={{ color: 'var(--text-muted)' }}>|</span>
              <span style={{ color: badgeColor, fontWeight: 600 }}>{badgeText}</span>
            </div>
          </div>

          <div className="card-body no-padding product-info-metrics">
            <div style={{ background: 'var(--bg-card)', padding: '15px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px' }}>سعر البيع</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-emerald-light)' }}>{Number(product.salePrice).toFixed(2)} <span style={{ fontSize: '0.8rem' }}>ج.م</span></div>
            </div>

            <div style={{ background: 'var(--bg-card)', padding: '15px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px' }}>سعر الشراء</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{Number(product.purchasePrice).toFixed(2)} <span style={{ fontSize: '0.8rem' }}>ج.م</span></div>
            </div>

            <div style={{ background: 'var(--bg-card)', padding: '15px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px' }}>المخزون الحالي</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{Number(product.stock).toFixed(2)} <span style={{ fontSize: '0.8rem' }}>{product.unitName || 'القطعة'}</span></div>
            </div>

            <div style={{ background: 'var(--bg-card)', padding: '15px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px' }}>الكمية المتُباعة</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--metro-blue)' }}>{product.soldQuantity != null ? Number(product.soldQuantity).toFixed(2) : '0'} <span style={{ fontSize: '0.8rem' }}>{product.unitName || 'القطعة'}</span></div>
            </div>

            <div style={{ background: 'var(--bg-card)', padding: '15px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px' }}>الربح الفعلي</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-amber)' }}>{product.realizedProfit != null ? Number(product.realizedProfit).toFixed(2) : '0.00'} <span style={{ fontSize: '0.8rem' }}>ج.م</span></div>
            </div>

            <div style={{ background: 'var(--bg-card)', padding: '15px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px' }}>مرات المشاهدة</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>👁️ {product.viewCount || 0}</div>
            </div>

            <div style={{ gridColumn: 'span 3', background: 'var(--bg-card)', padding: '15px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px' }}>الوصف</div>
              <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{product.description || 'لا يوجد وصف متاح لهذا المنتج.'}</div>
            </div>
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
                  <label>سعر البيع بالجملة</label>
                  <input className="form-control" type="number" step="0.01" min="0" placeholder="150.00" value={unitForm.salePrice}
                    onChange={e => setUnitForm({ ...unitForm, salePrice: e.target.value })} />
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
    </div>
  );
};

export default ProductDetails;
