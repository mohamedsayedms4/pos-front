import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Api, { SERVER_URL } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import { useBranch } from '../context/BranchContext';
import Loader from '../components/common/Loader';
import '../styles/pages/SettingsPremium.css';







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

  const [activeSection, setActiveSection] = useState('basic');

  useEffect(() => {
    const sectionIds = ['basic', 'pricing', 'advanced', 'visibility'];
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
    return () => { observers.forEach(o => o?.disconnect()); };
  }, [loading]);

  const scrollTo = (sid) => {
    document.getElementById(sid)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(sid);
  };



  // Steps are defined dynamically in useEffect

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

  const handleSave = async (e, addAnother = false) => {
    if (e) e.preventDefault();
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
        
        if (addAnother) {
          toast('تم الحفظ بنجاح، يمكنك إضافة منتج آخر', 'success');
          setFormData({
            ...formData,
            name: '',
            productCode: '',
            description: '',
            purchasePrice: '',
            salePrice: '',
            stock: '0',
            wholesaleSalePrice: '',
            wholesalePurchasePrice: '',
            wholesaleMinQuantity: '',
            units: [],
            onlineInventory: null
          });
          setImages(null);
          setExistingImages([]);
          if (fileInputRef.current) fileInputRef.current.value = '';
          window.scrollTo(0, 0);
        } else {
          toast('تم إضافة المنتج بنجاح', 'success');
          
          // If in onboarding mode, go back to dashboard!
          if (localStorage.getItem('onboardingStatus')) {
              navigate('/dashboard');
          } else {
              navigate('/products');
          }
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

  const sections = [
    { id: 'basic',      label: 'البيانات الأساسية', icon: 'fa-solid fa-box' },
    { id: 'pricing',    label: 'التسعير والمخزون',   icon: 'fa-solid fa-tags' },
    { id: 'advanced',   label: 'التعبئة والجملة',     icon: 'fa-solid fa-boxes-stacked' },
    { id: 'visibility', label: 'الظهور والحالة',    icon: 'fa-solid fa-eye' },
  ];

  return (
    <div style={{ direction: 'rtl', minHeight: '100vh', paddingBottom: '60px' }}>
      
      {/* Smart Banner for eCommerce */}
      {isEditMode && !isOnlineBranch && !formData.onlineInventory && (
        <div style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '15px 24px', margin: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #ffeeba', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <strong>هذا المنتج غير معروض في المتجر الإلكتروني.</strong> يمكنك إضافته مباشرة لمتجرك الإلكتروني أونلاين وتحديد أسعار خاصة بالبيع للعملاء أونلاين.
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowOnlineModal(true)} style={{ whiteSpace: 'nowrap' }}>
             إضافة إلى المتجر الإلكتروني
          </button>
        </div>
      )}

      {/* ── Sticky Page Header ── */}
      <div className="settings-page-header" style={{ padding: '14px 24px', marginBottom: 0 }}>
        <div>
          <span className="settings-eyebrow">إدارة المنتجات</span>
          <h1 style={{ margin: 0, fontSize: 'clamp(20px,2vw,28px)', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {isEditMode ? (formData.isRawMaterial ? `تعديل مادة خام: ${formData.name}` : `تعديل منتج: ${formData.name}`) : (formData.isRawMaterial ? 'إضافة مادة خام' : 'إضافة منتج جديد')}
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--muted, #697386)', fontSize: 14 }}>
            قم بتهيئة بيانات المنتج، أسعاره، وحداته ومخزونه الأولي.
          </p>
        </div>
        <div className="header-buttons">
          {!isEditMode && (
            <>
              <button type="button" className="btn-seggele btn-seggele--secondary" onClick={handleDownloadTemplate} title="تحميل نموذج إكسيل مفرغ">
                نموذج الاستيراد
              </button>
              <button type="button" className="btn-seggele btn-seggele--secondary" onClick={() => fileInputRef.current.click()} disabled={importingExcel}>
                {importingExcel ? <i className="fa-solid fa-hourglass-half"></i> : <i className="fa-solid fa-file-excel"></i>} استيراد إكسيل
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
          <button
            className="btn-seggele btn-seggele--secondary"
            type="button"
            onClick={() => navigate('/products')}
            disabled={saving || importingExcel}
          >
            <i className="fa-solid fa-arrow-right"></i> إلغاء
          </button>
          {!isEditMode && (
            <button
              className="btn-seggele btn-seggele--secondary"
              type="button"
              onClick={(e) => handleSave(e, true)}
              disabled={saving || importingExcel}
            >
              <i className="fa-solid fa-plus"></i> حفظ وإضافة آخر
            </button>
          )}
          <button
            className="btn-seggele btn-seggele--primary tour-prod-save"
            type="submit"
            form="productForm"
            disabled={saving || importingExcel}
          >
            {saving
              ? <><i className="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...</>
              : <><i className="fa-solid fa-check"></i> {isEditMode ? 'حفظ التعديلات' : (formData.isRawMaterial ? 'إضافة المادة الخام' : 'حفظ المنتج')}</>
            }
          </button>
        </div>
      </div>

      <div className="settings-layout" style={{ maxWidth: 1200, margin: '20px auto 0', padding: '0 24px' }}>
        
        {/* ── Sidebar Nav ── */}
        <aside className="settings-nav">
          <nav>
            {sections.map(({ id: sid, label, icon }) => (
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
            <i className="fa-solid fa-shield-halved" style={{ marginTop: 2 }}></i>
            <div>
              <strong>بياناتك محمية</strong>
              <p>يتم حفظ التغييرات بشكل آمن وتشفير البيانات بالنظام.</p>
            </div>
          </div>
        </aside>

        {/* ── Content ── */}
        <div className="settings-content">
          <form id="productForm" onSubmit={(e) => handleSave(e, false)}>

            {/* ─ 1. Basic Data ─ */}
            <div id="basic" style={{ scrollMarginTop: 120, marginBottom: 40 }}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>البيانات الأساسية</h2>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>المعلومات الرئيسية التي تُعرّف المنتج وتصنيفه.</p>
              </div>
              <section className="settings-card">
                <div className="card-body">
                  <div className="form-grid">
                    
                    {!isEditMode && branches && branches.length > 0 && (
                      <div className="field field--full tour-prod-branch">
                        <label>الفرع المستهدف <span className="required">*</span></label>
                        <div className="select-wrap">
                          <select
                            value={productBranchId}
                            onChange={(e) => setProductBranchId(e.target.value)}
                            required
                          >
                            <option value="" disabled>-- اختر الفرع --</option>
                            {branches.map(b => (
                              <option key={b.id} value={b.id}>
                                {b.name} {b.type === 'ONLINE' ? '(أونلاين)' : ''}
                              </option>
                            ))}
                          </select>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        </div>
                        <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>سيتم إضافة هذا المنتج وتعيين أسعاره ومخزونه الأولي في الفرع المحدد.</small>
                      </div>
                    )}

                    <div className="field field--full tour-prod-name">
                      <label>اسم المنتج <span className="required">*</span></label>
                      <input 
                        value={formData.name} 
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                        required 
                        placeholder="أدخل اسم المنتج بالكامل"
                      />
                      {formErrors.name && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.name}</span>}
                    </div>

                    <div className="field">
                      <label>كود المنتج (الباركود)</label>
                      <input 
                        value={formData.productCode} 
                        onChange={(e) => setFormData({ ...formData, productCode: e.target.value })} 
                        placeholder="اتركه فارغًا للتوليد التلقائي"
                      />
                      {formErrors.productCode && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.productCode}</span>}
                    </div>

                    <div className="field tour-prod-cat">
                      <label>الفئة</label>
                      <div className="select-wrap">
                        <select 
                          value={formData.categoryId} 
                          onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                        >
                          <option value="">بدون فئة</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                      {formErrors.categoryId && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.categoryId}</span>}
                    </div>

                    <div className="field field--full">
                      <label>الوصف</label>
                      <textarea 
                        value={formData.description} 
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="أدخل وصفًا تفصيليًا للمنتج (اختياري)"
                        style={{ minHeight: '80px', resize: 'vertical' }}
                      />
                      {formErrors.description && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.description}</span>}
                    </div>

                    <div className="field field--full">
                      <label>صور المنتج</label>
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        onChange={(e) => setImages(e.target.files)} 
                        style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px', width: '100%' }}
                      />
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
                  </div>
                </div>
              </section>
            </div>

            {/* ─ 2. Pricing and Stock ─ */}
            <div id="pricing" style={{ scrollMarginTop: 120, marginBottom: 40 }}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>التسعير والمخزون</h2>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>أسعار المنتج الأساسية ومخزونه الأولي.</p>
              </div>
              <section className="settings-card">
                <div className="card-body">
                  <div className="form-grid">
                    <div className="field">
                      <label>الوحدة الأساسية (قطاعي) <span className="required">*</span></label>
                      <input 
                        value={formData.unitName} 
                        onChange={(e) => setFormData({ ...formData, unitName: e.target.value })} 
                        required 
                        placeholder="كيس، قطعة، كيلو..." 
                      />
                      {formErrors.unitName && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.unitName}</span>}
                    </div>

                    <div className="field">
                      <label>المخزون الأولي</label>
                      <input 
                        type="number" 
                        step="0.001" 
                        value={formData.stock} 
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })} 
                        placeholder="0"
                      />
                      {formErrors.stock && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.stock}</span>}
                    </div>

                    <div className="field">
                      <label>سعر الشراء (اختياري)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={formData.purchasePrice} 
                        onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })} 
                        placeholder="0.00"
                      />
                      {formErrors.purchasePrice && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.purchasePrice}</span>}
                    </div>

                    {!formData.isRawMaterial && (
                      <div className="field tour-prod-price">
                        <label>سعر البيع الأساسي (قطاعي)</label>
                        <input 
                          type="number" 
                          step="0.01" 
                          value={formData.salePrice} 
                          onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })} 
                          placeholder="0.00"
                        />
                        {formErrors.salePrice && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.salePrice}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>

            {/* ─ 3. Advanced Packaging and Wholesale ─ */}
            <div id="advanced" style={{ scrollMarginTop: 120, marginBottom: 40 }}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>التعبئة والجملة</h2>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>تحديد وحدات البيع الكبرى (كرتونة، صندوق) وأسعار الجملة.</p>
              </div>
              <section className="settings-card">
                <div className="card-body">
                  {!formData.isRawMaterial && (
                    <div className="switch-row" style={{ marginBottom: 24 }}>
                      <div className="switch-copy">
                        <span className="switch-icon" style={{ background: 'var(--metro-purple)', color: 'white' }}><i className="fa-solid fa-tags"></i></span>
                        <div>
                          <strong>تفعيل البيع بالجملة لهذا المنتج</strong>
                          <p>يظهر حقول أسعار الجملة للوحدة الأساسية والوحدات الكبرى.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={enableWholesaleForm}
                        className={`switch-btn ${enableWholesaleForm ? 'switch-btn--active' : ''}`}
                        onClick={() => setEnableWholesaleForm(!enableWholesaleForm)}
                      >
                        <span/>
                      </button>
                    </div>
                  )}

                  {!formData.isRawMaterial && enableWholesaleForm && (
                    <div className="form-grid" style={{ marginBottom: 24, padding: '20px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                      <div className="field">
                        <label>سعر شراء جملة (للقطعة)</label>
                        <input 
                          type="number" step="0.01" 
                          value={formData.wholesalePurchasePrice} 
                          onChange={(e) => setFormData({ ...formData, wholesalePurchasePrice: e.target.value })} 
                        />
                      </div>
                      <div className="field">
                        <label>سعر بيع جملة (للقطعة)</label>
                        <input 
                          type="number" step="0.01" 
                          value={formData.wholesaleSalePrice} 
                          onChange={(e) => setFormData({ ...formData, wholesaleSalePrice: e.target.value })} 
                        />
                      </div>
                      <div className="field">
                        <label>الحد الأدنى لبيع جملة القطعة</label>
                        <input 
                          type="number" step="0.01" 
                          value={formData.wholesaleMinQuantity} 
                          onChange={(e) => setFormData({ ...formData, wholesaleMinQuantity: e.target.value })} 
                          placeholder="مثال: 10"
                        />
                      </div>
                    </div>
                  )}

                  <div className="divider" style={{ margin: '24px 0' }}></div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <strong style={{ fontSize: '1.05rem' }}>وحدات التعبئة الكبرى (كرتونة / صندوق)</strong>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>أضف وحدات أكبر تحتوي على مضاعفات من القطعة الأساسية.</p>
                    </div>
                    <button type="button" className="btn-seggele btn-seggele--secondary" onClick={addUnitRow} style={{ padding: '6px 12px' }}>
                      <i className="fa-solid fa-plus"></i> إضافة وحدة
                    </button>
                  </div>

                  {formData.units.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '20px', background: 'var(--surface-2)', borderRadius: '8px' }}>
                      لم يتم إضافة وحدات كبرى بعد. (يباع المنتج بالوحدة الأساسية فقط)
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {formData.units.map((unit, index) => {
                        const factor = parseFloat(unit.conversionFactor) || 1;
                        const autoPurchase = ((parseFloat(formData.purchasePrice) || 0) * factor).toFixed(2);
                        const autoSale = ((parseFloat(formData.salePrice) || 0) * factor).toFixed(2);
                        const autoWholesale = ((parseFloat(formData.wholesaleSalePrice) || 0) * factor).toFixed(2);

                        return (
                          <div key={index} style={{ background: 'var(--surface-1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                              <div className="field" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.8rem' }}>اسم الوحدة</label>
                                <input value={unit.unitName} onChange={(e) => updateUnitRow(index, 'unitName', e.target.value)} placeholder="كرتونة..." />
                              </div>
                              <div className="field" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.8rem' }}>الكمية بالقطع</label>
                                <input type="number" value={unit.conversionFactor} onChange={(e) => updateUnitRow(index, 'conversionFactor', parseFloat(e.target.value) || 1)} />
                              </div>
                              <div className="field" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.8rem' }}>سعر الشراء</label>
                                <input type="number" value={unit.purchasePrice || ''} onChange={(e) => updateUnitRow(index, 'purchasePrice', e.target.value)} placeholder={`${autoPurchase}`} />
                              </div>
                              <div className="field" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.8rem' }}>سعر البيع</label>
                                <input type="number" value={unit.salePrice || ''} onChange={(e) => updateUnitRow(index, 'salePrice', e.target.value)} placeholder={`${autoSale}`} />
                              </div>
                            </div>
                            
                            {factor === 1 && (
                              <div style={{ color: 'var(--metro-orange)', fontSize: '0.8rem', marginTop: '12px', padding: '8px 12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                <i className="fa-solid fa-triangle-exclamation"></i> <strong>تنبيه:</strong> معامل التحويل (1) مكرر مع الوحدة الأساسية.
                              </div>
                            )}

                            {!formData.isRawMaterial && enableWholesaleForm && (
                              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--border-subtle)' }}>
                                <div className="field" style={{ marginBottom: 0 }}>
                                  <label style={{ fontSize: '0.8rem', color: 'var(--metro-purple)' }}>سعر بيع جملة (للوحدة الكبرى)</label>
                                  <input type="number" value={unit.wholesaleSalePrice || ''} onChange={(e) => updateUnitRow(index, 'wholesaleSalePrice', e.target.value)} placeholder={`${autoWholesale}`} />
                                </div>
                                <div className="field" style={{ marginBottom: 0 }}>
                                  <label style={{ fontSize: '0.8rem', color: 'var(--metro-purple)' }}>الحد الأدنى للجملة (بالوحدة الكبرى)</label>
                                  <input type="number" value={unit.wholesaleMinQuantity || ''} onChange={(e) => updateUnitRow(index, 'wholesaleMinQuantity', e.target.value)} placeholder="5" />
                                </div>
                              </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                              <button type="button" className="btn-seggele btn-seggele--secondary" style={{ color: 'var(--metro-red)', borderColor: 'transparent', padding: '4px 8px', fontSize: '0.85rem' }} onClick={() => removeUnitRow(index)}>
                                <i className="fa-solid fa-trash"></i> إزالة الوحدة
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* ─ 4. Visibility ─ */}
            <div id="visibility" style={{ scrollMarginTop: 120 }}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>الظهور والحالة</h2>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>تحكم في كيفية ظهور المنتج في النظام.</p>
              </div>
              <section className="settings-card">
                <div className="card-body">
                  
                  {!formData.isRawMaterial && (
                    <div className="switch-row">
                      <div className="switch-copy">
                        <span className="switch-icon"><i className="fa-solid fa-store"></i></span>
                        <div>
                          <strong>{isOnlineBranch ? 'عرض المنتج في المتجر الإلكتروني' : 'تفعيل عرض المنتج للعملاء'}</strong>
                          <p>إلغاء التفعيل سيخفي المنتج من شاشة نقطة البيع {isOnlineBranch ? 'والمتجر' : ''}.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={formData.showInStore}
                        className={`switch-btn ${formData.showInStore ? 'switch-btn--active' : ''}`}
                        onClick={() => setFormData({...formData, showInStore: !formData.showInStore})}
                      >
                        <span/>
                      </button>
                    </div>
                  )}

                  <div className="divider"></div>

                  <div className="switch-row">
                    <div className="switch-copy">
                      <span className="switch-icon" style={{ background: 'var(--metro-orange)', color: 'white' }}><i className="fa-solid fa-layer-group"></i></span>
                      <div>
                        <strong>تعيين كـ "مادة خام"</strong>
                        <p>هذا المنتج يُستخدم في التصنيع فقط ولا يُباع مباشرة للعميل النهائي.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={formData.isRawMaterial}
                      className={`switch-btn ${formData.isRawMaterial ? 'switch-btn--active' : ''}`}
                      onClick={() => setFormData({...formData, isRawMaterial: !formData.isRawMaterial})}
                    >
                      <span/>
                    </button>
                  </div>

                </div>
              </section>
            </div>

          </form>
        </div>
      </div>

      {showOnlineModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--bg-card)', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '500px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="fa-solid fa-globe" style={{ color: 'var(--metro-blue)' }}></i> إضافة للمتجر الإلكتروني
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '24px', lineHeight: 1.5 }}>
              هذا المنتج تم إنشاؤه مسبقاً في فرع آخر. يمكنك إضافته الآن إلى متجرك الإلكتروني.
            </p>
            
            <div className="field">
              <label>سعر البيع أونلاين</label>
              <input type="number" step="0.01" value={onlinePricing.salePrice} onChange={e => setOnlinePricing({...onlinePricing, salePrice: e.target.value})} placeholder={formData.salePrice || "0.00"} />
            </div>
            
            <div className="field" style={{ marginBottom: '30px' }}>
              <label>سعر الشراء (للحسابات أونلاين)</label>
              <input type="number" step="0.01" value={onlinePricing.purchasePrice} onChange={e => setOnlinePricing({...onlinePricing, purchasePrice: e.target.value})} placeholder={formData.purchasePrice || "0.00"} />
            </div>

            <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
              <button 
                type="button" 
                className="btn-seggele btn-seggele--primary" 
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
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {addingOnline ? 'جاري الإضافة...' : <><i className="fa-solid fa-plus"></i> إضافة مباشرة (بمخزون 0)</>}
              </button>
              
              <button 
                type="button" 
                className="btn-seggele btn-seggele--secondary" 
                onClick={() => {
                  navigate(`/stock-transfers/new?productId=${id}`);
                }}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <i className="fa-solid fa-truck-moving"></i> طلب نقل مخزون (تعبئة تلقائية)
              </button>

              <button 
                type="button" 
                className="btn-seggele btn-seggele--secondary" 
                onClick={() => setShowOnlineModal(false)}
                style={{ width: '100%', justifyContent: 'center', border: 'none', background: 'transparent' }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AddProduct;
