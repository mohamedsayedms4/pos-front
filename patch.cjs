const fs = require('fs');
const file = "e:/pos/src/main/resources/react-app copy/src/pages/AddPurchase.jsx";
let content = fs.readFileSync(file, 'utf8');

const s1 = `  const [quickProductForms, setQuickProductForms] = useState([]);

  const addQuickProductForm = () => {
    setQuickProductForms(prev => [
      ...prev,
      { id: Date.now() + Math.random(), name: '', purchasePrice: 0, salePrice: 0, productCode: '', categoryId: '', unitName: 'قطعة' }
    ]);
  };
  const updateQuickProductForm = (id, field, value) => {
    setQuickProductForms(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const [savingQuickProduct, setSavingQuickProduct] = useState(false);`;

const r1 = `  const [showQuickAddProduct, setShowQuickAddProduct] = useState(false);
  const [quickProductForm, setQuickProductForm] = useState({ name: '', productCode: '', purchasePrice: '', salePrice: '', unitName: 'قطعة' });
  const [quickProductSuggestions, setQuickProductSuggestions] = useState([]);
  const [quickProductSuggestionFocused, setQuickProductSuggestionFocused] = useState(false);
  const [savingQuickProduct, setSavingQuickProduct] = useState(false);

  const handleQuickProductNameChange = (val) => {
    setQuickProductForm(prev => ({ ...prev, name: val }));
    if (!val.trim()) { setQuickProductSuggestions([]); return; }
    const q = val.toLowerCase().trim();
    const suggestions = products.filter(p => p.name.toLowerCase().includes(q) || (p.productCode && p.productCode.toLowerCase().includes(q))).slice(0, 5);
    setQuickProductSuggestions(suggestions);
  };

  const handleSelectExistingFromQuickPanel = (prod) => {
    handleProductChange(prod.id, prod);
    setShowQuickAddProduct(false);
    setQuickProductForm({ name: '', productCode: '', purchasePrice: '', salePrice: '', unitName: 'قطعة' });
    setQuickProductSuggestions([]);
  };`;

const s2 = `  const handleSaveQuickProduct = async (formId, quickProductForm) => {
    if (!quickProductForm.name) return;
    if (!quickProductForm.unitName) { toast('الوحدة الأساسية للمنتج السريع مطلوبة', 'warning'); return; }
    try {
      const data = {
        name: quickProductForm.name,
        description: '',
        salePrice: quickProductForm.salePrice ? parseFloat(quickProductForm.salePrice) : 0.01,
        purchasePrice: quickProductForm.purchasePrice ? parseFloat(quickProductForm.purchasePrice) : 0,
        productCode: quickProductForm.productCode || '',
        categoryId: quickProductForm.categoryId ? parseInt(quickProductForm.categoryId) : null,
        unitName: quickProductForm.unitName || 'قطعة',
        type: 'STANDARD',
        status: 'ACTIVE',
        trackStock: true,
        stock: 0,
        showInStore: true,
        isRawMaterial: false,
        units: []
      };
      
      const tempId = \`temp-\${Date.now()}\`;
      const tempProduct = { ...data, id: tempId };
      
      const newItem = {
        productId: tempProduct.id,
        isNewProduct: true,
        productData: data,
        productObj: tempProduct,
        name: tempProduct.name,
        units: tempProduct.units || [],
        unitId: '',
        unitName: tempProduct.unitName || 'قطعة',
        quantity: 1,
        unitPrice: tempProduct.purchasePrice || 0,
        discountValue: 0,
        discountType: 'FIXED'
      };

      setInvoiceItems(prev => [newItem, ...prev]);
      setQuickProductForms(prev => prev.filter(f => f.id !== formId));
      toast('تم إضافة المنتج للفاتورة بشكل مؤقت وسيتم حفظه معها', 'success');
    } catch (err) {
      toast('حدث خطأ أثناء إضافة المنتج المؤقت', 'error');
    }
  };`;

const r2 = `  const handleSaveQuickProduct = async () => {
    if (!quickProductForm.name.trim()) return;
    if (!quickProductForm.purchasePrice) { toast('سعر الشراء مطلوب', 'warning'); return; }
    if (!quickProductForm.salePrice) { toast('سعر البيع مطلوب', 'warning'); return; }
    if (!quickProductForm.unitName) { toast('الوحدة الأساسية للمنتج السريع مطلوبة', 'warning'); return; }
    
    setSavingQuickProduct(true);
    try {
      const data = {
        name: quickProductForm.name,
        description: '',
        salePrice: quickProductForm.salePrice ? parseFloat(quickProductForm.salePrice) : 0.01,
        purchasePrice: quickProductForm.purchasePrice ? parseFloat(quickProductForm.purchasePrice) : 0,
        productCode: quickProductForm.productCode || '',
        categoryId: null,
        unitName: quickProductForm.unitName || 'قطعة',
        type: 'STANDARD',
        status: 'ACTIVE',
        trackStock: true,
        stock: 0,
        showInStore: true,
        isRawMaterial: false,
        units: []
      };
      
      const tempId = \`temp-\${Date.now()}\`;
      const tempProduct = { ...data, id: tempId };
      
      const newItem = {
        productId: tempProduct.id,
        isNewProduct: true,
        productData: data,
        productObj: tempProduct,
        name: tempProduct.name,
        units: tempProduct.units || [],
        unitId: '',
        unitName: tempProduct.unitName || 'قطعة',
        quantity: 1,
        unitPrice: tempProduct.purchasePrice || 0,
        discountValue: 0,
        discountType: 'FIXED'
      };

      setInvoiceItems(prev => [newItem, ...prev]);
      setShowQuickAddProduct(false);
      setQuickProductForm({ name: '', productCode: '', purchasePrice: '', salePrice: '', unitName: 'قطعة' });
      setQuickProductSuggestions([]);
      toast('تم إنشاء المنتج وإضافته إلى الفاتورة بنجاح', 'success');
    } catch (err) {
      toast('حدث خطأ أثناء إضافة المنتج المؤقت', 'error');
    } finally {
      setSavingQuickProduct(false);
    }
  };`;

const s3 = `              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>المنتجات</h2>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>أضف المنتجات وقم بتحديد الكميات والأسعار.</p>
              </div>
              <button type="button" className="btn-seggele btn-seggele--secondary btn-sm" onClick={addQuickProductForm}>
                <i className="fa-solid fa-plus"></i> منتج جديد سريع
              </button>
            </div>
            
            <section className="settings-card" style={{ overflow: 'visible' }}>
              <div className="card-body">
                
                {quickProductForms.map((formState) => (
                  <div key={formState.id} style={{ padding: '20px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px dashed var(--primary-color)', marginBottom: '20px' }}>
                    <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 15 }}>
                      <div className="field">
                        <label>اسم المنتج *</label>
                        <input type="text" value={formState.name} onChange={e => updateQuickProductForm(formState.id, 'name', e.target.value)} />
                      </div>
                      <div className="field">
                        <label>سعر الشراء *</label>
                        <input type="number" step="0.01" value={formState.purchasePrice === 0 ? '' : formState.purchasePrice} onChange={e => updateQuickProductForm(formState.id, 'purchasePrice', e.target.value)} />
                      </div>
                      <div className="field">
                        <label>سعر البيع *</label>
                        <input type="number" step="0.01" value={formState.salePrice === 0 ? '' : formState.salePrice} onChange={e => updateQuickProductForm(formState.id, 'salePrice', e.target.value)} />
                      </div>
                      <div className="field">
                        <label>الباركود</label>
                        <input type="text" value={formState.productCode} onChange={e => updateQuickProductForm(formState.id, 'productCode', e.target.value)} />
                      </div>
                      <div className="field">
                        <label>الوحدة الأساسية *</label>
                        <input type="text" value={formState.unitName} onChange={e => updateQuickProductForm(formState.id, 'unitName', e.target.value)} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <button type="button" className="btn-seggele btn-seggele--secondary" onClick={() => setQuickProductForms(prev => prev.filter(f => f.id !== formState.id))}>إلغاء</button>
                      <button type="button" className="btn-seggele btn-seggele--primary" onClick={() => handleSaveQuickProduct(formState.id, formState)}>حفظ وإضافة للفاتورة</button>
                    </div>
                  </div>
                ))}

                <div className="field field--full" style={{ position: 'relative', zIndex: 40, marginBottom: 25 }}>
                  <label>البحث عن منتج وإضافته مباشرة للفاتورة</label>`;

const r3 = `              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>المنتجات</h2>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>أضف المنتجات وقم بتحديد الكميات والأسعار.</p>
              </div>
            </div>
            
            <section className="settings-card" style={{ overflow: 'visible' }}>
              <div className="card-body">

                <div className="field field--full" style={{ position: 'relative', zIndex: 40, marginBottom: showQuickAddProduct ? 0 : 25 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ marginBottom: 0 }}>البحث عن منتج وإضافته مباشرة للفاتورة</label>
                    <button
                      type="button"
                      className={\`btn-seggele btn-sm \${showQuickAddProduct ? 'btn-seggele--primary' : 'btn-seggele--secondary'}\`}
                      onClick={() => {
                        setShowQuickAddProduct(!showQuickAddProduct);
                        if (showQuickAddProduct) {
                          setQuickProductForm({ name: '', productCode: '', purchasePrice: '', salePrice: '', unitName: 'قطعة' });
                          setQuickProductSuggestions([]);
                        }
                      }}
                      style={{ padding: '5px 12px', fontSize: '0.82rem' }}
                    >
                      <i className={\`fa-solid \${showQuickAddProduct ? 'fa-times' : 'fa-plus'}\`} style={{ marginLeft: 5 }}></i>
                      {showQuickAddProduct ? 'إلغاء' : 'إضافة منتج جديد'}
                    </button>
                  </div>`;

const s4 = `                  </div>
                </div>

                {/* Items Table */}`;

const r4 = `                  </div>

                  {/* ── Inline Quick Add Product Form (Single Line) ── */}
                  {showQuickAddProduct && (
                    <div style={{
                      marginTop: 10,
                      padding: '10px 12px',
                      background: 'rgba(37, 99, 235, 0.04)',
                      border: '1.5px solid rgba(37, 99, 235, 0.15)',
                      borderRadius: '10px',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start',
                      animation: 'slideDown 0.2s ease',
                      flexWrap: 'nowrap',
                      overflowX: 'auto',
                      marginBottom: 25
                    }}>
                      <style>{\`@keyframes slideDown { from { opacity:0; transform:translateY(-5px); } to { opacity:1; transform:translateY(0); } }\`}</style>
                      
                      {/* Name with prediction */}
                      <div style={{ position: 'relative', flex: '2', minWidth: '160px' }}>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            placeholder="اسم المنتج *"
                            value={quickProductForm.name}
                            onChange={e => handleQuickProductNameChange(e.target.value)}
                            onFocus={() => setQuickProductSuggestionFocused(true)}
                            onBlur={() => setTimeout(() => setQuickProductSuggestionFocused(false), 200)}
                            autoFocus
                            style={{
                              width: '100%', height: '40px',
                              paddingRight: 32, paddingLeft: 10,
                              border: quickProductSuggestions.length > 0 ? '1.5px solid #f59e0b' : '1px solid var(--border-strong)',
                              borderRadius: '8px', fontSize: '0.9rem',
                              boxSizing: 'border-box'
                            }}
                          />
                          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            <i className="fa-solid fa-box"></i>
                          </span>

                          {/* Prediction Dropdown */}
                          {quickProductSuggestionFocused && quickProductSuggestions.length > 0 && (
                            <div style={{
                              position: 'absolute', top: '105%', right: 0, zIndex: 9999, minWidth: '280px',
                              background: '#fff', border: '1.5px solid #f59e0b', borderRadius: 10,
                              boxShadow: '0 10px 28px rgba(245,158,11,0.2)', padding: 5
                            }}>
                              <div style={{ padding: '6px 10px 5px', fontSize: '0.72rem', color: '#92400e', background: 'rgba(245,158,11,0.08)', borderRadius: 7, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                                <i className="fa-solid fa-triangle-exclamation"></i>
                                <strong>منتجات مشابهة موجودة</strong> — اختر أحدها
                              </div>
                              {quickProductSuggestions.map(p => (
                                <div
                                  key={p.id}
                                  onMouseDown={() => { handleSelectExistingFromQuickPanel(p); toast(\`تم إضافة "\${p.name}" للفاتورة\`, 'success'); }}
                                  style={{ padding: '9px 12px', cursor: 'pointer', borderRadius: 7, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2, transition: 'background 0.12s' }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.08)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(245,158,11,0.12)', display: 'grid', placeItems: 'center', color: '#d97706', fontSize: '0.75rem' }}>
                                      <i className="fa-solid fa-box"></i>
                                    </div>
                                    <div>
                                      <div style={{ fontWeight: 600, fontSize: '0.87rem' }}>{p.name}</div>
                                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>كود: {p.productCode || '—'}</div>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', background: 'rgba(37,99,235,0.08)', padding: '2px 8px', borderRadius: 99 }}>{p.salePrice} ج.م</span>
                                    <span style={{ fontSize: '0.72rem', color: '#059669', background: 'rgba(5,150,105,0.08)', padding: '2px 7px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                                      <i className="fa-solid fa-check" style={{ marginLeft: 2 }}></i>إضافة
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <input type="text" placeholder="الباركود" value={quickProductForm.productCode}
                        onChange={e => setQuickProductForm(prev => ({ ...prev, productCode: e.target.value }))}
                        style={{ height: '40px', flex: '1', minWidth: '80px', padding: '0 10px', border: '1px solid var(--border-strong)', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                      
                      <input type="text" placeholder="الوحدة *" value={quickProductForm.unitName}
                        onChange={e => setQuickProductForm(prev => ({ ...prev, unitName: e.target.value }))}
                        style={{ height: '40px', flex: '1', minWidth: '70px', padding: '0 10px', border: '1px solid var(--border-strong)', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }} />

                      <input type="number" step="0.01" min="0" placeholder="شراء *" value={quickProductForm.purchasePrice}
                        onChange={e => setQuickProductForm(prev => ({ ...prev, purchasePrice: e.target.value }))}
                        style={{ height: '40px', flex: '1', minWidth: '80px', padding: '0 10px', border: '1.5px solid rgba(239,68,68,0.3)', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }} />

                      <input type="number" step="0.01" min="0" placeholder="بيع *" value={quickProductForm.salePrice}
                        onChange={e => setQuickProductForm(prev => ({ ...prev, salePrice: e.target.value }))}
                        style={{ height: '40px', flex: '1', minWidth: '80px', padding: '0 10px', border: '1.5px solid rgba(34,197,94,0.35)', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }} />

                      <button type="button" onClick={handleSaveQuickProduct} disabled={savingQuickProduct || !quickProductForm.name.trim()}
                        className="btn-seggele btn-seggele--primary"
                        style={{ height: '40px', padding: '0 16px', fontSize: '0.85rem', whiteSpace: 'nowrap', minWidth: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {savingQuickProduct ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-plus"></i>}
                        حفظ
                      </button>
                    </div>
                  )}
                </div>

                {/* Items Table */}`;

if (!content.includes(s1)) throw new Error("s1 not found");
if (!content.includes(s2)) throw new Error("s2 not found");
if (!content.includes(s3)) throw new Error("s3 not found");
if (!content.includes(s4)) throw new Error("s4 not found");

content = content.replace(s1, r1);
content = content.replace(s2, r2);
content = content.replace(s3, r3);
content = content.replace(s4, r4);

fs.writeFileSync(file, content);
console.log("Successfully patched AddPurchase.jsx");
