import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import ModalContainer from '../components/common/ModalContainer';

const Products = () => {
  const { toast, confirm } = useGlobalUI();
  const [data, setData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '', description: '', purchasePrice: '', salePrice: '', stock: '0', productCode: '', categoryId: '', unitName: 'القطعة'
  });
  const [images, setImages] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsData, categoriesData, statsData] = await Promise.all([
        Api.getProducts().catch(() => []),
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
    loadData();
  }, []);

  const getFilteredData = () => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(p =>
      (p.name || '').toLowerCase().includes(term) ||
      (p.productCode || '').toLowerCase().includes(term) ||
      (p.categoryName || '').toLowerCase().includes(term)
    );
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
        unitName: product.unitName || 'القطعة'
      });
    } else {
      setFormData({
        name: '', description: '', purchasePrice: '', salePrice: '', stock: '0', productCode: '', categoryId: '', unitName: 'القطعة'
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

  const items = getFilteredData();

  return (
    <>
      <div className="page-section">
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '25px' }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--metro-blue)' }}>📦</div>
            <div className="stat-value">{stats.totalProducts}</div>
            <div className="stat-label">إجمالي المنتجات</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-emerald)' }}>💰</div>
            <div className="stat-value">{Number(stats.totalExpectedSales).toLocaleString('en-US')}</div>
            <div className="stat-label">المبيعات المتوقعة (ج.م)</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--metro-red)' }}>⚠️</div>
            <div className="stat-value">{stats.outOfStockCount}</div>
            <div className="stat-label">منتجات نفذت</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--accent-amber)' }}>📉</div>
            <div className="stat-value">{stats.lowStockCount}</div>
            <div className="stat-label">منتجات منخفضة المخزون</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3>📦 إدارة المنتجات</h3>
          <div className="toolbar">
            <div className="search-input">
              <span className="search-icon">🔍</span>
              <input type="text" placeholder="بحث عن منتج..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            {Api.can('PRODUCT_WRITE') && (
              <button className="btn btn-primary" onClick={() => openForm(null)}>
                <span>+</span> إضافة منتج
              </button>
            )}
          </div>
        </div>
        <div className="card-body no-padding">
          <div className="table-wrapper">
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>جاري التحميل...</div>
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
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.unitName || ''}</div>
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
            <div className="modal" style={{ maxWidth: '600px' }}>
              <div className="modal-header">
                <h3>{editProduct ? 'تعديل منتج' : 'إضافة منتج جديد'}</h3>
                <button className="modal-close" onClick={closeModal}>✕</button>
              </div>
              <div className="modal-body">
                <form id="productForm" onSubmit={handleSave}>
                  <div className="form-group">
                    <label>اسم المنتج *</label>
                    <input className="form-control" name="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>الوصف</label>
                    <textarea className="form-control" name="description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}></textarea>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>سعر الشراء *</label>
                      <input className="form-control" type="number" step="0.01" name="purchasePrice" value={formData.purchasePrice} onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})} required />
                    </div>
                    <div className="form-group">
                      <label>سعر البيع *</label>
                      <input className="form-control" type="number" step="0.01" name="salePrice" value={formData.salePrice} onChange={(e) => setFormData({...formData, salePrice: e.target.value})} required />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>المخزون</label>
                      <input className="form-control" type="number" step="0.001" name="stock" value={formData.stock} onChange={(e) => setFormData({...formData, stock: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>كود المنتج</label>
                      <input className="form-control" name="productCode" value={formData.productCode} onChange={(e) => setFormData({...formData, productCode: e.target.value})} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>الفئة</label>
                      <select className="form-control" name="categoryId" value={formData.categoryId} onChange={(e) => setFormData({...formData, categoryId: e.target.value})}>
                        <option value="">بدون فئة</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>الوحدة</label>
                      <input className="form-control" name="unitName" value={formData.unitName} onChange={(e) => setFormData({...formData, unitName: e.target.value})} />
                    </div>
                  </div>
                  <div className="form-group">
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
