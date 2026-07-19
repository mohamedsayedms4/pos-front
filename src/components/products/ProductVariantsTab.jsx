import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

/**
 * مكون إدارة متغيرات المنتج (المقاسات، الألوان، ...)
 * يُضاف كـ Tab داخل صفحة تفاصيل المنتج
 */
const ProductVariantsTab = ({ productId, productSalePrice, productPurchasePrice }) => {
  const [variants, setVariants] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [editVariant, setEditVariant] = useState(null);

  // حالة نموذج إضافة قالب جديد
  const [templateForm, setTemplateForm] = useState({ name: '', valuesStr: '' });

  // حالة نموذج إضافة متغير
  const [variantForm, setVariantForm] = useState({
    sku: '',
    stock: 0,
    purchasePrice: productPurchasePrice || 0,
    salePrice: productSalePrice || 0,
    isActive: true,
    selectedValues: {} // { templateId: valueId }
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [variantsData, templatesData] = await Promise.all([
        api.getProductVariants(productId),
        api.getAttributeTemplates()
      ]);
      setVariants(Array.isArray(variantsData) ? variantsData : []);
      setTemplates(Array.isArray(templatesData) ? templatesData : []);
    } catch (e) {
      console.error('Error loading variants:', e);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── إضافة قالب خاصية جديد ──
  const handleCreateTemplate = async () => {
    if (!templateForm.name.trim()) return;
    const values = templateForm.valuesStr
      .split(',')
      .map(v => v.trim())
      .filter(v => v);
    try {
      await api.createAttributeTemplate(templateForm.name.trim(), values);
      setTemplateForm({ name: '', valuesStr: '' });
      setShowAddTemplate(false);
      await loadData();
    } catch (e) {
      alert('خطأ في إضافة الخاصية: ' + (e.message || ''));
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الخاصية وجميع قيمها؟')) return;
    try {
      await api.deleteAttributeTemplate(templateId);
      await loadData();
    } catch (e) {
      alert('فشل الحذف: ' + (e.message || ''));
    }
  };

  // ── إضافة / تعديل متغير ──
  const handleSaveVariant = async () => {
    const attributeValueIds = Object.values(variantForm.selectedValues).filter(Boolean);
    const payload = {
      sku: variantForm.sku || null,
      stock: parseFloat(variantForm.stock) || 0,
      purchasePrice: parseFloat(variantForm.purchasePrice) || null,
      salePrice: parseFloat(variantForm.salePrice) || null,
      isActive: variantForm.isActive,
      attributeValueIds
    };
    try {
      if (editVariant) {
        await api.updateProductVariant(productId, editVariant.id, payload);
      } else {
        await api.createProductVariant(productId, payload);
      }
      resetVariantForm();
      await loadData();
    } catch (e) {
      alert('خطأ في حفظ المتغير: ' + (e.message || ''));
    }
  };

  const handleDeleteVariant = async (variantId) => {
    if (!window.confirm('حذف هذا المتغير؟')) return;
    try {
      await api.deleteProductVariant(productId, variantId);
      await loadData();
    } catch (e) {
      alert('فشل الحذف');
    }
  };

  const openEditVariant = (variant) => {
    const selectedValues = {};
    if (variant.attributes) {
      variant.attributes.forEach(attr => {
        if (attr.templateId) selectedValues[attr.templateId] = attr.valueId;
      });
    }
    setVariantForm({
      sku: variant.sku || '',
      stock: variant.stock || 0,
      purchasePrice: variant.purchasePrice || productPurchasePrice || 0,
      salePrice: variant.salePrice || productSalePrice || 0,
      isActive: variant.isActive !== false,
      selectedValues
    });
    setEditVariant(variant);
    setShowAddVariant(true);
  };

  const resetVariantForm = () => {
    setVariantForm({
      sku: '', stock: 0,
      purchasePrice: productPurchasePrice || 0,
      salePrice: productSalePrice || 0,
      isActive: true, selectedValues: {}
    });
    setEditVariant(null);
    setShowAddVariant(false);
  };

  // ── Styles ──
  const styles = {
    container: {
      direction: 'rtl',
      fontFamily: "'Tajawal', sans-serif",
      padding: '0',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      flexWrap: 'wrap',
      gap: '10px'
    },
    title: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#1e293b',
      margin: 0
    },
    btnPrimary: {
      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      color: '#fff',
      border: 'none',
      borderRadius: '10px',
      padding: '8px 18px',
      cursor: 'pointer',
      fontFamily: 'inherit',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'opacity 0.2s',
    },
    btnSecondary: {
      background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
      color: '#fff',
      border: 'none',
      borderRadius: '10px',
      padding: '8px 18px',
      cursor: 'pointer',
      fontFamily: 'inherit',
      fontSize: '14px',
      fontWeight: '600',
    },
    btnDanger: {
      background: '#fee2e2',
      color: '#dc2626',
      border: 'none',
      borderRadius: '8px',
      padding: '5px 12px',
      cursor: 'pointer',
      fontFamily: 'inherit',
      fontSize: '13px',
    },
    btnEdit: {
      background: '#e0e7ff',
      color: '#4f46e5',
      border: 'none',
      borderRadius: '8px',
      padding: '5px 12px',
      cursor: 'pointer',
      fontFamily: 'inherit',
      fontSize: '13px',
      marginLeft: '6px'
    },
    section: {
      background: '#f8fafc',
      borderRadius: '14px',
      padding: '20px',
      marginBottom: '24px',
      border: '1px solid #e2e8f0'
    },
    sectionTitle: {
      fontSize: '15px',
      fontWeight: '700',
      color: '#374151',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    templateChip: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      background: '#ede9fe',
      color: '#6d28d9',
      borderRadius: '20px',
      padding: '4px 14px',
      fontSize: '13px',
      fontWeight: '600',
      margin: '4px',
    },
    valueChip: {
      display: 'inline-block',
      background: '#fff',
      border: '1px solid #c4b5fd',
      color: '#5b21b6',
      borderRadius: '12px',
      padding: '2px 10px',
      fontSize: '12px',
      margin: '3px',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '14px'
    },
    th: {
      background: '#f1f5f9',
      color: '#475569',
      padding: '10px 12px',
      textAlign: 'right',
      fontWeight: '600',
      borderBottom: '2px solid #e2e8f0',
      whiteSpace: 'nowrap'
    },
    td: {
      padding: '10px 12px',
      borderBottom: '1px solid #f1f5f9',
      color: '#1e293b',
      verticalAlign: 'middle'
    },
    modal: {
      background: '#fff',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px',
      border: '2px solid #e0e7ff',
      boxShadow: '0 4px 24px rgba(99,102,241,0.1)'
    },
    formGroup: {
      marginBottom: '16px'
    },
    label: {
      display: 'block',
      fontSize: '13px',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '6px'
    },
    input: {
      width: '100%',
      padding: '9px 12px',
      borderRadius: '8px',
      border: '1px solid #d1d5db',
      fontSize: '14px',
      fontFamily: 'inherit',
      outline: 'none',
      boxSizing: 'border-box',
      direction: 'rtl'
    },
    select: {
      width: '100%',
      padding: '9px 12px',
      borderRadius: '8px',
      border: '1px solid #d1d5db',
      fontSize: '14px',
      fontFamily: 'inherit',
      background: '#fff',
      direction: 'rtl'
    },
    row: { display: 'flex', gap: '16px', flexWrap: 'wrap' },
    col: { flex: 1, minWidth: '140px' },
    badge: (active) => ({
      display: 'inline-block',
      background: active ? '#d1fae5' : '#fee2e2',
      color: active ? '#065f46' : '#991b1b',
      borderRadius: '20px',
      padding: '2px 10px',
      fontSize: '12px',
      fontWeight: '600'
    }),
    empty: {
      textAlign: 'center',
      color: '#94a3b8',
      padding: '40px',
      fontSize: '15px'
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}><i className="fa-solid fa-hourglass-half"></i></div>
        جاري التحميل...
      </div>
    );
  }

  return (
    <div style={styles.container}>

      {/* ── قسم قوالب الخصائص ── */}
      <div style={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={styles.sectionTitle}>
            <i className="fa-solid fa-tag"></i> خصائص المنتج (المقاس، اللون...)
          </div>
          <button style={styles.btnSecondary} onClick={() => setShowAddTemplate(!showAddTemplate)}>
            {showAddTemplate ? ' إلغاء' : '+ إضافة خاصية'}
          </button>
        </div>

        {showAddTemplate && (
          <div style={{ ...styles.modal, marginBottom: '16px' }}>
            <div style={styles.row}>
              <div style={styles.col}>
                <label style={styles.label}>اسم الخاصية (بالعربي)</label>
                <input
                  style={styles.input}
                  placeholder="مثال: المقاس، اللون، الخامة..."
                  value={templateForm.name}
                  onChange={e => setTemplateForm(p => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div style={{ flex: 2, minWidth: '200px' }}>
                <label style={styles.label}>القيم (مفصولة بفاصلة)</label>
                <input
                  style={styles.input}
                  placeholder="مثال: S, M, L, XL    أو   أحمر, أبيض, أسود"
                  value={templateForm.valuesStr}
                  onChange={e => setTemplateForm(p => ({ ...p, valuesStr: e.target.value }))}
                />
              </div>
            </div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
              <button style={styles.btnPrimary} onClick={handleCreateTemplate}><i className="fa-solid fa-floppy-disk"></i> حفظ الخاصية</button>
              <button style={{ ...styles.btnDanger, background: '#f1f5f9', color: '#64748b' }}
                onClick={() => setShowAddTemplate(false)}>إلغاء</button>
            </div>
          </div>
        )}

        {templates.length === 0 ? (
          <div style={styles.empty}>لا توجد خصائص بعد. أضف خاصية جديدة مثل "المقاس" أو "اللون"</div>
        ) : (
          <div>
            {templates.map(t => (
              <div key={t.id} style={{ marginBottom: '12px', background: '#fff', borderRadius: '10px', padding: '12px 16px', border: '1px solid #e0e7ff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={styles.templateChip}><i className="fa-solid fa-tag"></i> {t.name}</span>
                  <button style={styles.btnDanger} onClick={() => handleDeleteTemplate(t.id)}><i className="fa-solid fa-trash"></i> حذف</button>
                </div>
                <div>
                  {t.values && t.values.map(v => (
                    <span key={v.id} style={styles.valueChip}>{v.value}</span>
                  ))}
                  {(!t.values || t.values.length === 0) && (
                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>لا توجد قيم</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── قسم المتغيرات ── */}
      <div style={styles.section}>
        <div style={styles.header}>
          <div style={styles.sectionTitle}><i className="fa-solid fa-box"></i> المتغيرات المتاحة (SKU)</div>
          <button style={styles.btnPrimary} onClick={() => { resetVariantForm(); setShowAddVariant(true); }}>
            + إضافة متغير
          </button>
        </div>

        {/* نموذج إضافة/تعديل متغير */}
        {showAddVariant && (
          <div style={styles.modal}>
            <h4 style={{ margin: '0 0 16px', color: '#4f46e5', fontSize: '16px' }}>
              {editVariant ? ' تعديل المتغير' : ' إضافة متغير جديد'}
            </h4>

            {/* اختيار قيم الخصائص */}
            {templates.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <label style={styles.label}>تحديد الخصائص</label>
                <div style={styles.row}>
                  {templates.map(t => (
                    <div key={t.id} style={styles.col}>
                      <label style={{ ...styles.label, color: '#6d28d9' }}>{t.name}</label>
                      <select
                        style={styles.select}
                        value={variantForm.selectedValues[t.id] || ''}
                        onChange={e => setVariantForm(p => ({
                          ...p,
                          selectedValues: { ...p.selectedValues, [t.id]: e.target.value ? Number(e.target.value) : null }
                        }))}
                      >
                        <option value=''>-- اختر {t.name} --</option>
                        {t.values && t.values.map(v => (
                          <option key={v.id} value={v.id}>{v.value}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={styles.row}>
              <div style={styles.col}>
                <label style={styles.label}>كود SKU (اختياري)</label>
                <input style={styles.input} placeholder="تلقائي إذا تُرك فارغاً"
                  value={variantForm.sku}
                  onChange={e => setVariantForm(p => ({ ...p, sku: e.target.value }))} />
              </div>
              <div style={styles.col}>
                <label style={styles.label}>المخزون</label>
                <input style={styles.input} type="number" min="0"
                  value={variantForm.stock}
                  onChange={e => setVariantForm(p => ({ ...p, stock: e.target.value }))} />
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.col}>
                <label style={styles.label}>سعر الشراء</label>
                <input style={styles.input} type="number" min="0" step="0.01"
                  value={variantForm.purchasePrice}
                  onChange={e => setVariantForm(p => ({ ...p, purchasePrice: e.target.value }))} />
              </div>
              <div style={styles.col}>
                <label style={styles.label}>سعر البيع</label>
                <input style={styles.input} type="number" min="0" step="0.01"
                  value={variantForm.salePrice}
                  onChange={e => setVariantForm(p => ({ ...p, salePrice: e.target.value }))} />
              </div>
              <div style={styles.col}>
                <label style={styles.label}>الحالة</label>
                <select style={styles.select}
                  value={variantForm.isActive ? 'true' : 'false'}
                  onChange={e => setVariantForm(p => ({ ...p, isActive: e.target.value === 'true' }))}>
                  <option value="true"><i className="fa-solid fa-check"></i> نشط</option>
                  <option value="false"><i className="fa-solid fa-ban"></i> موقوف</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
              <button style={styles.btnPrimary} onClick={handleSaveVariant}>
                {editVariant ? ' حفظ التعديلات' : ' إضافة المتغير'}
              </button>
              <button style={{ ...styles.btnDanger, background: '#f1f5f9', color: '#64748b' }}
                onClick={resetVariantForm}>إلغاء</button>
            </div>
          </div>
        )}

        {/* جدول المتغيرات */}
        {variants.length === 0 ? (
          <div style={styles.empty}>
            <i className="fa-solid fa-palette"></i> لا توجد متغيرات بعد.<br />
            <small style={{ color: '#b0bec5' }}>أضف متغيرات مثل (L + أحمر) أو (XL + أبيض)...</small>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>الخصائص</th>
                  <th style={styles.th}>SKU</th>
                  <th style={styles.th}>المخزون</th>
                  <th style={styles.th}>سعر الشراء</th>
                  <th style={styles.th}>سعر البيع</th>
                  <th style={styles.th}>الحالة</th>
                  <th style={styles.th}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {variants.map(v => (
                  <tr key={v.id} style={{ transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8f9ff'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {v.attributes && v.attributes.map((attr, i) => (
                          <span key={i} style={styles.valueChip}>
                            <span style={{ color: '#9ca3af', fontSize: '11px' }}>{attr.templateName}: </span>
                            {attr.value}
                          </span>
                        ))}
                        {(!v.attributes || v.attributes.length === 0) && (
                          <span style={{ color: '#94a3b8', fontSize: '13px' }}>—</span>
                        )}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <code style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', fontSize: '12px' }}>
                        {v.sku || '—'}
                      </code>
                    </td>
                    <td style={styles.td}>
                      <strong style={{ color: v.stock <= 0 ? '#dc2626' : '#059669' }}>
                        {v.stock ?? 0}
                      </strong>
                    </td>
                    <td style={styles.td}>{v.purchasePrice ?? '—'}</td>
                    <td style={styles.td}><strong>{v.salePrice ?? '—'}</strong></td>
                    <td style={styles.td}>
                      <span style={styles.badge(v.isActive !== false)}>
                        {v.isActive !== false ? 'نشط' : 'موقوف'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button style={styles.btnEdit} onClick={() => openEditVariant(v)}><i className="fa-solid fa-pencil"></i> تعديل</button>
                      <button style={styles.btnDanger} onClick={() => handleDeleteVariant(v.id)}><i className="fa-solid fa-trash"></i></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductVariantsTab;
