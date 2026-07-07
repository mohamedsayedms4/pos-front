import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Api, { SERVER_URL } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import { useBranch } from '../context/BranchContext';
import Loader from '../components/common/Loader';
import { Joyride, STATUS } from 'react-joyride';

const AutoStartBeacon = () => {
    const beaconRef = React.useRef(null);
    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (beaconRef.current && beaconRef.current.parentElement) {
                beaconRef.current.parentElement.click();
            }
        }, 200);
        return () => clearTimeout(timer);
    }, []);
    return <span ref={beaconRef} style={{ display: 'none' }} />;
};


const AddProduct = () => {
  const { id } = useParams();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const { toast } = useGlobalUI();
  const { selectedBranchId, getSelectedBranch, branches } = useBranch();
  const [productBranchId, setProductBranchId] = useState('');
  
  // Check if query param exists
  const queryParams = new URLSearchParams(window.location.search);
  const defaultIsRawMaterial = queryParams.get('isRawMaterial') === 'true';

  useEffect(() => {
    if (selectedBranchId && !productBranchId) {
      setProductBranchId(selectedBranchId.toString());
    }
  }, [selectedBranchId]);

  const selectedBranch = branches?.find(b => b.id === parseInt(productBranchId));
  const isOnlineBranch = isEditMode
    ? (getSelectedBranch()?.type === 'ONLINE')
    : (selectedBranch?.type === 'ONLINE');

  const fileInputRef = React.useRef(null);
  const [importingExcel, setImportingExcel] = useState(false);
  const [showOnlineModal, setShowOnlineModal] = useState(false);
  const [onlinePricing, setOnlinePricing] = useState({ purchasePrice: '', salePrice: '' });
  const [addingOnline, setAddingOnline] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    purchasePrice: '',
    salePrice: '',
    stock: '0',
    productCode: '',
    categoryId: '',
    unitName: 'القطعة',
    wholesaleSalePrice: '',
    wholesalePurchasePrice: '',
    wholesaleMinQuantity: '',
    showInStore: true,
    isRawMaterial: defaultIsRawMaterial,
    units: [], // Packaging units
    onlineInventory: null
  });

  const [categories, setCategories] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [images, setImages] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [enableWholesaleForm, setEnableWholesaleForm] = useState(false);

  // Tour State
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    const onboardingStr = localStorage.getItem('onboardingStatus');
    if (onboardingStr) {
        try {
            const statusObj = JSON.parse(onboardingStr);
            if (/* statusObj.hasBranch && !statusObj.hasProduct && */ !localStorage.getItem('tour_add_product_v3')) {
                setTimeout(() => {
                    setRunTour(true);
                    localStorage.setItem('tour_add_product_v3', 'true');
                }, 800); 
            }
        } catch(e) {}
    }
  }, []);

  const handleJoyrideCallback = (data) => {
      const { status, type } = data;
      const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
      
      if (finishedStatuses.includes(status) || type === 'tour:end') {
          setRunTour(false);
          localStorage.setItem('tour_add_product_v3', 'true');
      }
  };

  const tourSteps = [
      {
          target: '.tour-prod-branch',
          content: 'أولاً، يجب عليك تحديد الفرع الذي سيتم إضافة هذا المنتج ومخزونه إليه.',
          disableBeacon: true,
          placement: 'bottom',
      },
      {
          target: '.tour-prod-name',
          content: 'أدخل اسم المنتج بوضوح هنا (مثل: تي شيرت قطن, أو كيبورد ميكانيكي).',
          disableBeacon: true,
          placement: 'bottom',
      },
      {
          target: '.tour-prod-price',
          content: 'حدد السعر الذي ستبيع به هذا المنتج للعميل.',
          placement: 'bottom',
      },
      {
          target: '.tour-prod-cat',
          content: 'اختر الفئة التي ينتمي إليها المنتج لتسهيل تنظيمه.',
          placement: 'bottom',
      },
      {
          target: '.tour-prod-save',
          content: 'أخيراً، اضغط هنا لحفظ المنتج. وبذلك تكون قد أضفت أول منتج لك!',
          placement: 'top',
      }
  ];

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportingExcel(true);
    toast('جاري استيراد المنتجات من ملف إكسيل...', 'info');
    try {
      const res = await Api.importProductsExcel(file, selectedBranchId);
      toast(res.data || 'تم استيراد المنتجات بنجاح', 'success');
      navigate('/products');
    } catch (err) {
      toast(err.message || 'فشل استيراد المنتجات', 'error');
    } finally {
      setImportingExcel(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = async () => {
    toast('جاري تحميل نموذج الاستيراد...', 'info');
    try {
      await Api.downloadProductsImportTemplate();
      toast('تم تحميل النموذج بنجاح', 'success');
    } catch (err) {
      toast(err.message || 'فشل تحميل النموذج', 'error');
    }
  };

  useEffect(() => {
    // Fetch categories
    Api.getCategories()
      .then(res => setCategories(res || []))
      .catch(err => console.error('Failed to load categories', err));

    if (isEditMode) {
      setLoading(true);
      Api.getProduct(id)
        .then(product => {
          // Extract pricing/stock from branchInventories for the current branch
          // or from onlineInventory, since ProductDto doesn't have these at the top level
          let branchPurchasePrice = '';
          let branchSalePrice = '';
          let branchWholesaleSalePrice = '';
          let branchWholesalePurchasePrice = '';
          let branchWholesaleMinQuantity = '';
          let branchStock = '0';
          let branchShowInStore = true;

          if (product.onlineInventory) {
            branchPurchasePrice = product.onlineInventory.purchasePrice ?? '';
            branchSalePrice = product.onlineInventory.salePrice ?? '';
            branchStock = product.onlineInventory.stock ?? '0';
            branchShowInStore = product.onlineInventory.showInStore !== false;
          }
          
          if (product.branchInventories && product.branchInventories.length > 0) {
            // Try to find the inventory matching the currently selected branch
            const currentBranchInv = selectedBranchId 
              ? product.branchInventories.find(bi => bi.branchId === selectedBranchId || bi.branchId === parseInt(selectedBranchId))
              : null;
            const inv = currentBranchInv || product.branchInventories[0];
            if (inv) {
              branchPurchasePrice = inv.purchasePrice ?? '';
              branchSalePrice = inv.salePrice ?? '';
              branchWholesaleSalePrice = inv.wholesaleSalePrice ?? '';
              branchWholesalePurchasePrice = inv.wholesalePurchasePrice ?? '';
              branchWholesaleMinQuantity = inv.wholesaleMinQuantity ?? '';
              branchStock = inv.stock ?? '0';
              branchShowInStore = inv.showInStore !== false;
              if (inv.branchId) {
                setProductBranchId(inv.branchId.toString());
              }
            }
          }

          setFormData({
            name: product.name || '',
            description: product.description || '',
            purchasePrice: branchPurchasePrice,
            salePrice: branchSalePrice,
            wholesaleSalePrice: branchWholesaleSalePrice,
            wholesalePurchasePrice: branchWholesalePurchasePrice,
            wholesaleMinQuantity: branchWholesaleMinQuantity,
            stock: branchStock,
            productCode: product.productCode || '',
            categoryId: product.categoryId || '',
            unitName: product.unitName || 'القطعة',
            showInStore: branchShowInStore,
            isRawMaterial: product.isRawMaterial || false,
            units: product.units || [],
            onlineInventory: product.onlineInventory || null
          });
          const hasWholesale = !!branchWholesaleSalePrice || (product.units && product.units.some(u => u.wholesaleSalePrice && parseFloat(u.wholesaleSalePrice) > 0));
          setEnableWholesaleForm(hasWholesale);
          setExistingImages(product.imageUrls || []);
        })
        .catch(err => {
          toast(err.message, 'error');
          navigate('/products');
        })
        .finally(() => setLoading(false));
    }
  }, [id, isEditMode, navigate, toast]);

  const handleSave = async (e) => {
    e.preventDefault();
    setFormErrors({});
    if (!formData.name) {
      toast('يرجى إدخال اسم المنتج', 'warning');
      return;
    }

    setSaving(true);
    
    // Default empty prices to 0 (purchase) and 0.01 (sale) to satisfy backend validations
    const purchaseVal = formData.purchasePrice !== '' && formData.purchasePrice !== null && formData.purchasePrice !== undefined
      ? parseFloat(formData.purchasePrice)
      : 0;
    const saleVal = formData.salePrice !== '' && formData.salePrice !== null && formData.salePrice !== undefined
      ? parseFloat(formData.salePrice)
      : 0.01;

    const apiData = {
      ...formData,
      purchasePrice: purchaseVal,
      salePrice: saleVal,
      wholesaleSalePrice: enableWholesaleForm && formData.wholesaleSalePrice ? parseFloat(formData.wholesaleSalePrice) : null,
      wholesalePurchasePrice: enableWholesaleForm && formData.wholesalePurchasePrice ? parseFloat(formData.wholesalePurchasePrice) : null,
      wholesaleMinQuantity: enableWholesaleForm && formData.wholesaleMinQuantity ? parseFloat(formData.wholesaleMinQuantity) : null,
      stock: parseFloat(formData.stock) || 0,
      showInStore: formData.showInStore,
      isRawMaterial: formData.isRawMaterial,
      categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
      units: formData.units.map(u => {
        const factor = parseFloat(u.conversionFactor) || 1;
        const calcPurchasePrice = u.purchasePrice !== '' && u.purchasePrice !== null && u.purchasePrice !== undefined && parseFloat(u.purchasePrice) > 0
          ? parseFloat(u.purchasePrice)
          : purchaseVal * factor;
        const calcSalePrice = u.salePrice !== '' && u.salePrice !== null && u.salePrice !== undefined && parseFloat(u.salePrice) > 0
          ? parseFloat(u.salePrice)
          : saleVal * factor;
        return {
          ...u,
          purchasePrice: calcPurchasePrice,
          salePrice: calcSalePrice,
          wholesaleSalePrice: enableWholesaleForm && u.wholesaleSalePrice !== '' && u.wholesaleSalePrice !== null ? parseFloat(u.wholesaleSalePrice) : null,
          wholesaleMinQuantity: enableWholesaleForm && u.wholesaleMinQuantity !== '' && u.wholesaleMinQuantity !== null ? parseFloat(u.wholesaleMinQuantity) : null,
        };
      })
    };

    try {
      if (isEditMode) {
        await Api.updateProduct(id, apiData, images, selectedBranchId || productBranchId);
        toast('تم تحديث المنتج بنجاح', 'success');
        navigate('/products');
      } else {
        await Api.createProduct(apiData, images, productBranchId);
        toast('تم إضافة المنتج بنجاح', 'success');
        
        // If in onboarding mode, go back to dashboard!
        if (localStorage.getItem('onboardingStatus')) {
            navigate('/dashboard');
        } else {
            navigate('/products');
        }
      }
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

  const addUnitRow = () => {
    setFormData({
      ...formData,
      units: [...formData.units, { unitName: '', conversionFactor: 1, purchasePrice: 0, salePrice: 0, wholesaleSalePrice: '', wholesaleMinQuantity: '' }]
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

  if (loading) {
    return <Loader message="جاري تحميل تفاصيل المنتج..." />;
  }

  return (
    <>
      <Joyride
          steps={tourSteps}
          run={runTour}
          beaconComponent={AutoStartBeacon}
          continuous={true}
          showProgress={true}
          showSkipButton={true}
          disableOverlayClose={true}
          callback={handleJoyrideCallback}
          styles={{
              options: {
                  primaryColor: '#6A00FF',
                  backgroundColor: 'var(--bg-card, #ffffff)',
                  textColor: 'var(--text-main, #333333)',
                  arrowColor: 'var(--bg-card, #ffffff)',
                  zIndex: 1000,
              },
              tooltipContainer: { textAlign: 'right' },
              buttonNext: { outline: 'none' },
              buttonBack: { marginRight: 10, outline: 'none' }
          }}
          locale={{ back: 'السابق', close: 'إغلاق', last: 'إنهاء', next: 'التالي', skip: 'تخطي' }}
      />
      <style>{`
        /* Responsive CSS Overrides for Add/Edit Product Page */
        @media (max-width: 1024px) {
          .toolbar {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
          .toolbar h2 {
            font-size: 1.4rem !important;
            text-align: center !important;
            margin-bottom: 8px !important;
          }
          .toolbar > div {
            width: 100% !important;
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 8px !important;
          }
          .toolbar > div button {
            flex: 1 1 45% !important;
            justify-content: center !important;
            font-size: 0.85rem !important;
            padding: 10px !important;
          }
          .toolbar > div .btn-ghost {
            flex: 1 1 100% !important;
          }
        }

        @media (max-width: 768px) {
          .page-section {
            padding: 12px !important;
          }
          .card {
            border-radius: 12px !important;
          }
          .card-body {
            padding: 15px !important;
          }
          
          /* Force form grids to stack vertically */
          .grid.grid-2 {
            grid-template-columns: 1fr !important;
            gap: 15px !important;
          }
          
          /* Packaging unit rows responsive rearrangement */
          .packaging-unit-row {
            grid-template-columns: 1fr 1fr !important;
            gap: 12px !important;
            padding: 15px !important;
          }
          .packaging-unit-row > div:nth-child(1) {
            grid-column: span 2 !important;
          }
          .packaging-unit-row > button {
            grid-column: span 2 !important;
            width: 100% !important;
            justify-content: center !important;
            margin-top: 8px !important;
            background: rgba(232, 17, 35, 0.1) !important;
            border: 1px solid var(--metro-red) !important;
            border-radius: 4px !important;
          }
        }

        @media (max-width: 480px) {
          .form-actions {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
          }
          .form-actions button {
            width: 100% !important;
            min-width: 0 !important;
            justify-content: center !important;
            padding: 12px !important;
          }
        }
      `}</style>
      <div className="page-section">
      {/* Smart Banner for eCommerce */}
      {isEditMode && !isOnlineBranch && !formData.onlineInventory && (
        <div style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '15px 20px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #ffeeba', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <strong>هذا المنتج غير معروض في المتجر الإلكتروني.</strong> يمكنك إضافته مباشرة لمتجرك الإلكتروني أونلاين وتحديد أسعار خاصة بالبيع للعملاء أونلاين.
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowOnlineModal(true)} style={{ whiteSpace: 'nowrap' }}>
            🌐 إضافة إلى المتجر الإلكتروني
          </button>
        </div>
      )}

      {/* Page Title & Back Button */}
      <div className="toolbar" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
          {isEditMode ? (formData.isRawMaterial ? `✏️ تعديل مادة خام: ${formData.name}` : `✏️ تعديل المنتج: ${formData.name}`) : (formData.isRawMaterial ? '🧱 إضافة مادة خام' : '📦 إضافة منتج جديد')}
        </h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {!isEditMode && (
            <>
              <button type="button" className="btn btn-secondary" onClick={handleDownloadTemplate} title="تحميل نموذج إكسيل مفرغ">
                📄 نموذج الاستيراد
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current.click()} disabled={importingExcel}>
                {importingExcel ? '⏳' : '📥'} استيراد إكسيل
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImportExcel} 
                accept=".xlsx, .xls" 
                style={{ display: 'none' }} 
              />
            </>
          )}
          <button className="btn btn-ghost" onClick={() => navigate('/products')}>
            ← العودة للمنتجات
          </button>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
          <h3>📋 تفاصيل بيانات المنتج</h3>
        </div>
        <div className="card-body" style={{ padding: '25px' }}>
          <form onSubmit={handleSave} id="productForm">
            {/* Branch Selection (Only in Add Mode) */}
            {!isEditMode && branches && branches.length > 0 && (
              <div className="form-group tour-prod-branch" style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>الفرع المستهدف *</label>
                <select
                  className="form-control"
                  value={productBranchId}
                  onChange={(e) => setProductBranchId(e.target.value)}
                  required
                >
                  <option value="" disabled>-- اختر الفرع --</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.type === 'ONLINE' ? '🌐 ' : '🏢 '} {b.name}
                    </option>
                  ))}
                </select>
                <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  سيتم إضافة هذا المنتج وتعيين أسعاره ومخزونه الأولي في الفرع المحدد.
                </small>
              </div>
            )}

            {/* Name */}
            <div className="form-group tour-prod-name" style={{ marginBottom: '20px' }}>
              <label style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>اسم المنتج *</label>
              <input 
                className="form-control" 
                name="name" 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                required 
                placeholder="أدخل اسم المنتج بالكامل"
              />
              {formErrors.name && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.name}</span>}
            </div>

            {/* Description */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>الوصف</label>
              <textarea 
                className="form-control" 
                name="description" 
                value={formData.description} 
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="3"
                placeholder="أدخل وصفًا تفصيليًا للمنتج (اختياري)"
              ></textarea>
              {formErrors.description && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.description}</span>}
            </div>

            {/* Prices Grid */}
            <div className="grid grid-2 gap-15" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>سعر الشراء (اختياري)</label>
                <input 
                  className="form-control" 
                  type="number" 
                  step="0.01" 
                  name="purchasePrice" 
                  value={formData.purchasePrice} 
                  onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })} 
                  placeholder="0.00"
                />
                {formErrors.purchasePrice && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.purchasePrice}</span>}
              </div>
              {!formData.isRawMaterial && (
                <div className="form-group tour-prod-price">
                  <label style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>سعر البيع (اختياري)</label>
                  <input 
                    className="form-control" 
                    type="number" 
                    step="0.01" 
                    name="salePrice" 
                    value={formData.salePrice} 
                    onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })} 
                    placeholder="0.00"
                  />
                  {formErrors.salePrice && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.salePrice}</span>}
                </div>
              )}
            </div>

            {/* Wholesale Enable Toggle */}
            {!formData.isRawMaterial && (
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-hover)', padding: '12px 15px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                <input 
                  type="checkbox" 
                  id="enableWholesaleForm" 
                  checked={enableWholesaleForm} 
                  onChange={(e) => setEnableWholesaleForm(e.target.checked)} 
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }} 
                />
                <label htmlFor="enableWholesaleForm" style={{ margin: 0, cursor: 'pointer', fontWeight: 600, color: enableWholesaleForm ? 'var(--metro-blue)' : 'var(--text-muted)' }}>
                  ✓ تفعيل البيع بالجملة لهذا المنتج (يظهر حقول أسعار الجملة للقطعة والعلب)
                </label>
              </div>
            )}

            {/* Wholesale Prices Grid */}
            {!formData.isRawMaterial && enableWholesaleForm && (
              <div className="grid grid-2 gap-15" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px', background: 'var(--bg-elevated)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>سعر شراء جملة (للقطعة الأساسية)</label>
                  <input 
                    className="form-control" 
                    type="number" 
                    step="0.01" 
                    name="wholesalePurchasePrice" 
                    value={formData.wholesalePurchasePrice} 
                    onChange={(e) => setFormData({ ...formData, wholesalePurchasePrice: e.target.value })} 
                    placeholder="0.00"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>سعر بيع جملة (للقطعة الأساسية)</label>
                  <input 
                    className="form-control" 
                    type="number" 
                    step="0.01" 
                    name="wholesaleSalePrice" 
                    value={formData.wholesaleSalePrice} 
                    onChange={(e) => setFormData({ ...formData, wholesaleSalePrice: e.target.value })} 
                    placeholder="0.00"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>الحد الأدنى لبيع جملة القطعة</label>
                  <input 
                    className="form-control" 
                    type="number" 
                    step="0.01" 
                    name="wholesaleMinQuantity" 
                    value={formData.wholesaleMinQuantity} 
                    onChange={(e) => setFormData({ ...formData, wholesaleMinQuantity: e.target.value })} 
                    placeholder="10"
                  />
                </div>
              </div>
            )}

            {/* Stock & Product Code */}
            <div className="grid grid-2 gap-15" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>المخزون الأولي</label>
                <input 
                  className="form-control" 
                  type="number" 
                  step="0.001" 
                  name="stock" 
                  value={formData.stock} 
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })} 
                  placeholder="0"
                />
                {formErrors.stock && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.stock}</span>}
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>كود المنتج (الباركود)</label>
                <input 
                  className="form-control" 
                  name="productCode" 
                  value={formData.productCode} 
                  onChange={(e) => setFormData({ ...formData, productCode: e.target.value })} 
                  placeholder="اتركه فارغًا للتوليد التلقائي"
                />
                {formErrors.productCode && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.productCode}</span>}
              </div>
            </div>

            {/* Category & Unit */}
            <div className="grid grid-2 gap-15" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="form-group tour-prod-cat">
                <label style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>الفئة</label>
                <select 
                  className="form-control" 
                  name="categoryId" 
                  value={formData.categoryId} 
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                >
                  <option value="">بدون فئة</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {formErrors.categoryId && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.categoryId}</span>}
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>الوحدة الأساسية (قطاعي) *</label>
                <input 
                  className="form-control" 
                  name="unitName" 
                  value={formData.unitName} 
                  onChange={(e) => setFormData({ ...formData, unitName: e.target.value })} 
                  required 
                  placeholder="كيس، قطعة، كيلو..." 
                />
                {formErrors.unitName && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.unitName}</span>}
              </div>
            </div>

            {/* Store Visibility */}
            {!formData.isRawMaterial && (
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-hover)', padding: '15px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '25px' }}>
                <input 
                  type="checkbox" 
                  id="showInStore" 
                  checked={formData.showInStore} 
                  onChange={(e) => setFormData({ ...formData, showInStore: e.target.checked })} 
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
                />
                <label htmlFor="showInStore" style={{ margin: 0, cursor: 'pointer', fontWeight: 600, color: formData.showInStore ? 'var(--metro-blue)' : 'var(--text-muted)' }}>
                  {isOnlineBranch ? '🌐 عرض المنتج في المتجر الإلكتروني للعملاء (أونلاين)' : '✓ تفعيل عرض المنتج للعملاء (نشط)'}
                </label>
              </div>
            )}

            {/* Is Raw Material */}
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-hover)', padding: '15px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '25px' }}>
              <input 
                type="checkbox" 
                id="isRawMaterial" 
                checked={formData.isRawMaterial} 
                onChange={(e) => setFormData({ ...formData, isRawMaterial: e.target.checked })} 
                style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
              />
              <label htmlFor="isRawMaterial" style={{ margin: 0, cursor: 'pointer', fontWeight: 600, color: formData.isRawMaterial ? 'var(--metro-orange)' : 'var(--text-muted)' }}>
                🧱 هذا المنتج عبارة عن "مادة خام" (يستخدم في التصنيع ولا يظهر للعميل النهائي)
              </label>
            </div>

            {/* Wholesale Units */}
            <div style={{ marginTop: '25px', padding: '20px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '25px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>📦 وحدات التعبئة والتجزئة الكبرى (كرتونة / شكارة / دستة)</h4>
                <button type="button" className="btn btn-sm btn-secondary" onClick={addUnitRow}>
                  + إضافة وحدة
                </button>
              </div>

              {formData.units.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '15px' }}>
                  لم يتم إضافة وحدات كبرى (مثلاً: كرتونة)
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {formData.units.map((unit, index) => {
                    const factor = parseFloat(unit.conversionFactor) || 1;
                    const autoPurchase = ((parseFloat(formData.purchasePrice) || 0) * factor).toFixed(2);
                    const autoSale = ((parseFloat(formData.salePrice) || 0) * factor).toFixed(2);
                    const autoWholesale = ((parseFloat(formData.wholesaleSalePrice) || 0) * factor).toFixed(2);

                    return (
                      <div key={index} style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                        <div className="packaging-unit-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '10px', alignItems: 'end' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block' }}>اسم الوحدة</label>
                            <input 
                              className="form-control form-control-sm" 
                              value={unit.unitName} 
                              onChange={(e) => updateUnitRow(index, 'unitName', e.target.value)} 
                              placeholder="كرتونة، علبة..." 
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block' }}>الكمية بالقطع</label>
                            <input 
                              className="form-control form-control-sm" 
                              type="number" 
                              value={unit.conversionFactor} 
                              onChange={(e) => updateUnitRow(index, 'conversionFactor', parseFloat(e.target.value) || 1)} 
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block' }}>سعر الشراء</label>
                            <input 
                              className="form-control form-control-sm" 
                              type="number" 
                              value={unit.purchasePrice || ''} 
                              onChange={(e) => updateUnitRow(index, 'purchasePrice', e.target.value)} 
                              placeholder={`تلقائي: ${autoPurchase}`}
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block' }}>سعر البيع</label>
                            <input 
                              className="form-control form-control-sm" 
                              type="number" 
                              value={unit.salePrice || ''} 
                              onChange={(e) => updateUnitRow(index, 'salePrice', e.target.value)} 
                              placeholder={`تلقائي: ${autoSale}`}
                            />
                          </div>
                        </div>
                        {factor === 1 && (
                          <div style={{ color: '#f59e0b', fontSize: '0.8rem', marginTop: '8px', padding: '6px 10px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                            💡 <strong>تنبيه:</strong> معامل التحويل (1) يعني أن هذه الوحدة هي نفس الوحدة الأساسية (القطعة). لتعريف أسعار الجملة للقطعة، يرجى استخدام الحقول في الأعلى مباشرة دون إضافة وحدة جديدة هنا.
                          </div>
                        )}
                        {!formData.isRawMaterial && enableWholesaleForm && (
                          <div className="packaging-unit-wholesale-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 40px', gap: '10px', marginTop: '10px', alignItems: 'end' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block' }}>سعر بيع جملة (للوحدة الكبرى - كالكرتونة مثلاً)</label>
                              <input 
                                className="form-control form-control-sm" 
                                type="number" 
                                value={unit.wholesaleSalePrice || ''} 
                                onChange={(e) => updateUnitRow(index, 'wholesaleSalePrice', e.target.value)} 
                                placeholder={`تلقائي: ${autoWholesale}`}
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block' }}>الحد الأدنى لبيع جملة الوحدة الكبرى</label>
                              <input 
                                className="form-control form-control-sm" 
                                type="number" 
                                value={unit.wholesaleMinQuantity || ''} 
                                onChange={(e) => updateUnitRow(index, 'wholesaleMinQuantity', e.target.value)} 
                                placeholder="5"
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                              <button 
                                type="button" 
                                className="btn btn-icon btn-sm" 
                                style={{ color: 'var(--metro-red)', height: '36px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                                onClick={() => removeUnitRow(index)}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        )}
                        {(!enableWholesaleForm || formData.isRawMaterial) && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <button 
                              type="button" 
                              className="btn btn-sm btn-ghost" 
                              style={{ color: 'var(--metro-red)', padding: '2px 8px' }} 
                              onClick={() => removeUnitRow(index)}
                            >
                              ✕ حذف الوحدة
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Images Upload */}
            <div className="form-group" style={{ marginBottom: '30px' }}>
              <label style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>صور المنتج</label>
              <input 
                className="form-control" 
                type="file" 
                name="images" 
                multiple 
                accept="image/*" 
                onChange={(e) => setImages(e.target.files)} 
                style={{ padding: '8px 12px' }}
              />
              
              {/* Display existing images if in Edit Mode */}
              {isEditMode && existingImages.length > 0 && (
                <div style={{ marginTop: '15px' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>الصور الحالية المرفوعة:</p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {existingImages.map((imgUrl, idx) => {
                      const filename = imgUrl.split('/').pop();
                      const fullUrl = imgUrl.startsWith('http') ? imgUrl : `${SERVER_URL}/api/v1/products/images/${filename}`;
                      return (
                        <div key={idx} style={{ position: 'relative', width: '70px', height: '70px', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                          <img src={fullUrl} alt={`Product thumbnail ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={() => navigate('/products')}
                disabled={saving}
              >
                إلغاء
              </button>
              <button 
                type="submit" 
                className="btn btn-primary tour-prod-save" 
                disabled={saving}
                style={{ minWidth: '150px' }}
              >
                {saving ? 'جاري الحفظ...' : (isEditMode ? 'حفظ التعديلات' : (formData.isRawMaterial ? 'إضافة المادة الخام' : 'إضافة المنتج'))}
              </button>
            </div>
          </form>
        </div>
      </div>
      </div>

      {showOnlineModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '12px', width: '90%', maxWidth: '500px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: 'var(--text-primary)' }}>🌐 إضافة للمتجر الإلكتروني</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
              لقد اشتريت هذا المنتج من قبل ولديه مخزون متوفر في فروع أخرى. اختر طريقة الإضافة للمتجر الإلكتروني:
            </p>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>سعر البيع أونلاين</label>
              <input type="number" step="0.01" className="form-control" value={onlinePricing.salePrice} onChange={e => setOnlinePricing({...onlinePricing, salePrice: e.target.value})} placeholder={formData.salePrice || "0.00"} />
            </div>
            
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>سعر الشراء (للحسابات أونلاين)</label>
              <input type="number" step="0.01" className="form-control" value={onlinePricing.purchasePrice} onChange={e => setOnlinePricing({...onlinePricing, purchasePrice: e.target.value})} placeholder={formData.purchasePrice || "0.00"} />
            </div>

            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              <button 
                type="button" 
                className="btn btn-primary" 
                disabled={addingOnline}
                onClick={async () => {
                  setAddingOnline(true);
                  try {
                    await Api.addProductToOnlineStore(id, parseFloat(onlinePricing.purchasePrice) || 0, parseFloat(onlinePricing.salePrice) || 0.01);
                    toast('تم الإضافة للمتجر الإلكتروني بنجاح', 'success');
                    setShowOnlineModal(false);
                    setFormData({...formData, onlineInventory: {}});
                  } catch (err) {
                    toast(err.message, 'error');
                  } finally {
                    setAddingOnline(false);
                  }
                }}
              >
                {addingOnline ? 'جاري الإضافة...' : '➕ إضافة مباشرة (بمخزون 0)'}
              </button>
              
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  navigate(`/stock-transfers/new?productId=${id}`);
                }}
              >
                🚚 طلب نقل مخزون (تعبئة تلقائية)
              </button>

              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={() => setShowOnlineModal(false)}
                style={{ marginTop: '10px' }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddProduct;
