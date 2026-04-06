import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import ModalContainer from '../components/common/ModalContainer';
import Loader from '../components/common/Loader';

const Products = () => {
  const { toast, confirm } = useGlobalUI();
  const [data, setData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState('id,desc'); // Default sort
  const [loading, setLoading] = useState(true);

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
    name: '', description: '', purchasePrice: '', salePrice: '', stock: '0', productCode: '', categoryId: '', unitName: 'القطعة',
    units: [] // List of packaging units
  });
  const [images, setImages] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      await Api.exportProductsExcel(debouncedSearch, sort);
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
      await Api.exportProductsPdf(debouncedSearch, sort);
      toast('تم تصدير ملف PDF بنجاح', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setExportingPdf(false);
    }
  };

  const loadData = async (searchQuery = '', sortOrder = sort) => {
    setLoading(true);
    try {
      const [productsData, categoriesData, statsData] = await Promise.all([
        Api.getProductsPaged(0, 1000, searchQuery, sortOrder).then(res => res.items).catch(() => []),
        Api.getCategories().catch(() => []),
        Api.getProductStatistics().catch(() => null)
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

  useEffect(() => {
    loadData(debouncedSearch, sort);
  }, [debouncedSearch, sort]);

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
        units: product.units || []
      });
    } else {
      setFormData({
        name: '', description: '', purchasePrice: '', salePrice: '', stock: '0', productCode: '', categoryId: '', unitName: 'القطعة',
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
      categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
    };

    try {
      if (editProduct) {
        await Api.updateProduct(editProduct.id, apiData, images);
      } else {
        await Api.createProduct(apiData, images);
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

  const items = data;

  return (
    <>
      <div className="page-section">

        {/* KPI TILES GRID — Metro Style 6-Column Grid */}
        {stats && (
          <div className="stats-grid">
            {/* Row 1 — 2+4 = 6 columns */}
            <Link to="/products/analytics" className="stat-card azure tile-sq-sm" style={{ textDecoration: 'none' }}>
              <div className="stat-value" style={{ fontSize: '1.4rem' }}>{stats.totalProducts}</div>
              <div className="stat-label">إجمالي المنتجات</div>
              <div className="stat-icon">▨</div>
            </Link>

            <Link to="/products/analytics" className="stat-card forest tile-wd-sm" style={{ textDecoration: 'none' }}>
              <div className="stat-value" style={{ fontSize: '1.4rem' }}>{Number(stats.totalInventoryCapital || 0).toLocaleString()} <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>ج.م</span></div>
              <div className="stat-label">قيمة المخزون (شراء)</div>
              <div className="stat-icon">▧</div>
            </Link>

            {/* Row 2 — 2+4 = 6 columns */}
            <Link to="/products/analytics" className="stat-card deep-purple tile-sq-sm" style={{ textDecoration: 'none' }}>
              <div className="stat-value" style={{ fontSize: '1.4rem' }}>{Number(stats.totalExpectedProfit || 0).toLocaleString()} <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>ج.م</span></div>
              <div className="stat-label">الأرباح المتوقعة</div>
              <div className="stat-icon">◈</div>
            </Link>

            <Link to="/products/analytics" className="stat-card sky tile-wd-sm" style={{ textDecoration: 'none' }}>
              <div className="stat-value" style={{ fontSize: '1.4rem' }}>{Number(stats.totalRealizedProfit || 0).toLocaleString()} <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>ج.م</span></div>
              <div className="stat-label">الأرباح المحققة</div>
              <div className="stat-icon">▤</div>
            </Link>

            {/* Row 3 — Small alerts */}
            <Link to="/products/analytics" className="stat-card crimson tile-sq-sm" style={{ textDecoration: 'none' }}>
              <div className="stat-value" style={{ fontSize: '1.5rem' }}>{stats.outOfStockCount}</div>
              <div className="stat-label">منتجات نفدت</div>
              <div className="stat-icon">⚠</div>
            </Link>

            <Link to="/products/analytics" className="stat-card gold tile-sq-sm" style={{ textDecoration: 'none' }}>
              <div className="stat-value" style={{ fontSize: '1.5rem' }}>{stats.lowStockCount}</div>
              <div className="stat-label">مخزون منخفض</div>
              <div className="stat-icon">⚠</div>
            </Link>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <h3>📦 إدارة المنتجات</h3>
            <div className="toolbar">
              <Link to="/products/analytics" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                📊 الإحصائيات
              </Link>
              <div className="search-input">
                <span className="search-icon">🔍</span>
                <input type="text" placeholder="بحث عن منتج..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>

              <select
                className="form-control"
                style={{ width: '180px', height: '40px', padding: '0 10px' }}
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="id,desc">الأحدث أولاً</option>
                <option value="id,asc">الأقدم أولاً</option>
                <option value="name,asc">الاسم (أ-ي)</option>
                <option value="name,desc">الاسم (ي-أ)</option>
                <option value="salePrice,asc">السعر (الأقل)</option>
                <option value="salePrice,desc">السعر (الأعلى)</option>
                <option value="stock,asc">المخزون (الأقل)</option>
                <option value="stock,desc">المخزون (الأعلى)</option>
                <option value="soldQuantity,desc">الأكثر مبيعاً 🔥</option>
                <option value="viewCount,desc">الأكثر مشاهدة 👀</option>
              </select>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleExportExcel}
                  disabled={exportingExcel || items.length === 0}
                  title="تصدير إلى إكسيل"
                >
                  {exportingExcel ? '⏳' : '📊'} إكسيل
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleExportPdf}
                  disabled={exportingPdf || items.length === 0}
                  title="تصدير إلى PDF"
                >
                  {exportingPdf ? '⏳' : '📄'} PDF
                </button>
                {Api.can('PRODUCT_WRITE') && (
                  <button className="btn btn-primary" onClick={() => openForm(null)}>
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
                          <div className="table-actions">
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
    </>
  );
};

export default Products;
