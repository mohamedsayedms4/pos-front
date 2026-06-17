import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Api, { SERVER_URL } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import ModalContainer from '../components/common/ModalContainer';
import Loader from '../components/common/Loader';
import StatTile from '../components/common/StatTile';

const Categories = () => {
  const { toast, confirm } = useGlobalUI();
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('name,asc');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', parentId: '' });
  const [formErrors, setFormErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCompExcel, setExportingCompExcel] = useState(false);
  const [exportingCompPdf, setExportingCompPdf] = useState(false);

  // Dropdown states
  const [showExcelDropdown, setShowExcelDropdown] = useState(false);
  const [showPdfDropdown, setShowPdfDropdown] = useState(false);

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      await Api.exportCategoriesExcel();
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
      await Api.exportCategoriesPdf();
      toast('تم تصدير ملف PDF بنجاح', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportCompExcel = async () => {
    setExportingCompExcel(true);
    try {
      await Api.exportComprehensiveCategoriesExcel();
      toast('تم تصدير تقرير الجرد الشامل بنجاح', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setExportingCompExcel(false);
    }
  };

  const handleExportCompPdf = async () => {
    setExportingCompPdf(true);
    try {
      await Api.exportComprehensiveCategoriesPdf();
      toast('تم تصدير تقرير الجرد الشامل بنجاح', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setExportingCompPdf(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const categoriesData = await Api.getCategories(true);
      setData(categoriesData);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const flattenCategories = (cats, level = 0) => {
    if (!cats) return [];
    
    // Create a copy to sort
    const sortedCats = [...cats].sort((a, b) => {
      const [field, direction] = sort.split(',');
      const factor = direction === 'desc' ? -1 : 1;
      
      if (field === 'name') {
        return factor * (a.name || '').localeCompare(b.name || '');
      } else if (field === 'productCount') {
        return factor * ((a.productCount || 0) - (b.productCount || 0));
      } else if (field === 'createdAt') {
        return factor * (new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      }
      return 0;
    });

    let result = [];
    for (const cat of sortedCats) {
      result.push({ ...cat, level });
      if (cat.children && cat.children.length) {
        result = result.concat(flattenCategories(cat.children, level + 1));
      }
    }
    return result;
  };

  const openForm = async (category = null) => {
    setEditCategory(category);
    setFormErrors({});
    if (category) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        parentId: category.parentId || ''
      });
    } else {
      setFormData({ name: '', description: '', parentId: '' });
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditCategory(null);
    setImageFile(null);
    setFormErrors({});
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormErrors({});
    if (!formData.name) {
      toast('يرجى إدخال اسم الفئة', 'warning');
      return;
    }

    setSaving(true);
    const apiData = {
      name: formData.name,
      description: formData.description || null,
      parentId: formData.parentId ? parseInt(formData.parentId) : null,
    };

    const formDataPayload = new FormData();
    formDataPayload.append('category', new Blob([JSON.stringify(apiData)], { type: 'application/json' }));
    if (imageFile) {
      formDataPayload.append('image', imageFile);
    }

    try {
      if (editCategory) {
        await Api.updateCategory(editCategory.id, formDataPayload);
      } else {
        await Api.createCategory(formDataPayload);
      }
      toast(editCategory ? 'تم تحديث الفئة بنجاح' : 'تم إضافة الفئة بنجاح', 'success');
      closeModal();
      loadData();
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

  const handleDelete = async (id, name) => {
    confirm(`سيتم حذف الفئة "${name}" نهائياً`, async () => {
      try {
        await Api.deleteCategory(id);
        toast('تم حذف الفئة بنجاح', 'success');
        loadData();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  };

  const flatData = flattenCategories(data);
  const filteredData = flatData.filter(c => 
    !searchTerm || 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <style>{`
        /* Responsive CSS Overrides for Categories Page */
        @media (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(3, 1fr) !important;
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
          .toolbar-actions > div {
            flex: 1 1 45% !important;
          }
          .toolbar-actions button {
            width: 100% !important;
            justify-content: center !important;
          }
          .toolbar-actions > .btn-primary {
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
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr !important;
          }
          .toolbar-actions > div {
            flex: 1 1 100% !important;
          }
        }
      `}</style>
      <div className="page-section">
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          <StatTile
            id="cat_total"
            label="إجمالي الفئات"
            value={flatData.length}
            icon="📂"
            defaults={{ color: 'blue', size: 'tile-wd-sm', order: 1 }}
          />
          <StatTile
            id="cat_main"
            label="رئيسية"
            value={flatData.filter(c => c.level === 0).length}
            icon="📁"
            defaults={{ color: 'emerald', size: 'tile-sq-sm', order: 2 }}
          />
          <StatTile
            id="cat_sub"
            label="فرعية"
            value={flatData.filter(c => c.level > 0).length}
            icon="↳"
            defaults={{ color: 'amber', size: 'tile-sq-sm', order: 3 }}
          />
        </div>

        <div className="card">
          <div className="card-header">
            <h3>📂 إدارة الفئات</h3>
            <div className="toolbar">
              <div className="search-input">
                <input type="text" placeholder="بحث عن فئة..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <span className="search-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
              </div>

              <select 
                className="form-control" 
                value={sort} 
                onChange={(e) => setSort(e.target.value)}
                style={{ width: '180px', height: '40px', padding: '0 10px' }}
              >
                <option value="name,asc">الاسم (أ-ي)</option>
                <option value="name,desc">الاسم (ي-أ)</option>
                <option value="productCount,desc">الأكثر منتجات 🔥</option>
                <option value="productCount,asc">الأقل منتجات</option>
                <option value="createdAt,desc">الأحدث 🆕</option>
                <option value="createdAt,asc">الأقدم</option>
              </select>

              <div className="toolbar-actions" style={{ display: 'flex', gap: '8px' }}>
                {/* Excel Dropdown */}
                <div style={{ position: 'relative' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => { setShowExcelDropdown(!showExcelDropdown); setShowPdfDropdown(false); }}
                    disabled={exportingExcel || exportingCompExcel || data.length === 0}
                  >
                    {exportingExcel || exportingCompExcel ? '⏳' : '📊'} إكسيل
                  </button>
                  {showExcelDropdown && (
                    <div style={{ 
                      position: 'absolute', top: '100%', right: 0, zIndex: 100, 
                      backgroundColor: 'var(--bg-elevated)', borderRadius: '0', 
                      boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                      marginTop: '4px', minWidth: '180px', overflow: 'hidden', 
                      border: '1px solid var(--metro-blue)'
                    }}>
                      <div 
                        onClick={() => { handleExportExcel(); setShowExcelDropdown(false); }}
                        className="metro-dropdown-item"
                        style={{ 
                          padding: '12px 16px', cursor: 'pointer', fontSize: '0.9rem', 
                          color: 'var(--text-white)', display: 'flex', alignItems: 'center', gap: '10px',
                          borderBottom: '1px solid var(--border-subtle)'
                        }}
                      >
                        <span style={{ fontSize: '1.1rem' }}>📂</span> قائمة الفئات
                      </div>
                      <div 
                        onClick={() => { handleExportCompExcel(); setShowExcelDropdown(false); }}
                        className="metro-dropdown-item"
                        style={{ 
                          padding: '12px 16px', cursor: 'pointer', fontSize: '0.9rem', 
                          color: 'var(--text-white)', display: 'flex', alignItems: 'center', gap: '10px'
                        }}
                      >
                        <span style={{ fontSize: '1.1rem' }}>📋</span> جرد شامل (منتجات)
                      </div>
                    </div>
                  )}
                </div>

                {/* PDF Dropdown */}
                <div style={{ position: 'relative' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => { setShowPdfDropdown(!showPdfDropdown); setShowExcelDropdown(false); }}
                    disabled={exportingPdf || exportingCompPdf || data.length === 0}
                  >
                    {exportingPdf || exportingCompPdf ? '⏳' : '📄'} PDF
                  </button>
                  {showPdfDropdown && (
                    <div style={{ 
                      position: 'absolute', top: '100%', right: 0, zIndex: 100, 
                      backgroundColor: 'var(--bg-elevated)', borderRadius: '0', 
                      boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                      marginTop: '4px', minWidth: '180px', overflow: 'hidden', 
                      border: '1px solid var(--metro-blue)'
                    }}>
                      <div 
                        onClick={() => { handleExportPdf(); setShowPdfDropdown(false); }}
                        className="metro-dropdown-item"
                        style={{ 
                          padding: '12px 16px', cursor: 'pointer', fontSize: '0.9rem', 
                          color: 'var(--text-white)', display: 'flex', alignItems: 'center', gap: '10px',
                          borderBottom: '1px solid var(--border-subtle)'
                        }}
                      >
                        <span style={{ fontSize: '1.1rem' }}>📄</span> تقرير الفئات
                      </div>
                      <div 
                        onClick={() => { handleExportCompPdf(); setShowPdfDropdown(false); }}
                        className="metro-dropdown-item"
                        style={{ 
                          padding: '12px 16px', cursor: 'pointer', fontSize: '0.9rem', 
                          color: 'var(--text-white)', display: 'flex', alignItems: 'center', gap: '10px'
                        }}
                      >
                        <span style={{ fontSize: '1.1rem' }}>📋</span> جرد شامل (منتجات)
                      </div>
                    </div>
                  )}
                </div>

                {Api.can('CATEGORY_WRITE') && (
                  <button className="btn btn-primary" onClick={() => openForm(null)}>
                    <span>+</span> إضافة فئة
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="card-body no-padding">
            <div className="table-wrapper">
              {loading ? (
                <Loader message="جاري تحميل الفئات..." />
              ) : flatData.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📂</div>
                  <h4>لا توجد فئات</h4>
                  <p>قم بإضافة فئات لتنظيم المنتجات</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>صورة</th>
                      <th>الفئة</th>
                      <th>الوصف</th>
                      <th>الفئة الأم</th>
                      <th>عدد المنتجات</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((c, i) => (
                      <tr key={c.id}>
                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td>
                          {c.imageUrl ? (
                            <img src={SERVER_URL + c.imageUrl} alt={c.name} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-subtle)' }} />
                          ) : (
                            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>📁</div>
                          )}
                        </td>
                        <td>
                          <div style={{ paddingLeft: `${c.level * 24}px`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{c.level > 0 ? '↳' : ''}</span>
                            <Link to={`/categories/${c.id}`} style={{ fontWeight: 600, color: 'var(--accent-azure)', textDecoration: 'none', cursor: 'pointer' }} className="hover-underline">
                              {c.name}
                            </Link>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{c.description || '—'}</td>
                        <td>{c.parentName || <span className="text-muted">—</span>}</td>
                        <td><span className="badge badge-info">{c.productCount || 0}</span></td>
                        <td>
                          <div className="table-actions">
                            <Link className="btn btn-icon btn-ghost" title="تفاصيل الفئة" to={`/categories/${c.id}`}>👁️</Link>
                            <Link className="btn btn-icon btn-ghost" title="عرض المنتجات" to={`/categories/${c.id}/products`}>📦</Link>
                            {Api.can('CATEGORY_WRITE') && <button className="btn btn-icon btn-ghost" title="تعديل" onClick={() => openForm(c)}>✏️</button>}
                            {Api.can('CATEGORY_DELETE') && <button className="btn btn-icon btn-ghost" title="حذف" onClick={() => handleDelete(c.id, c.name)}>🗑️</button>}
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
            <div className="modal" style={{ maxWidth: '500px' }}>
              <div className="modal-header">
                <h3>{editCategory ? 'تعديل فئة' : 'إضافة فئة جديدة'}</h3>
                <button className="modal-close" onClick={closeModal}>✕</button>
              </div>
              <div className="modal-body">
                <form id="categoryForm" onSubmit={handleSave}>
                  <div className="form-group">
                    <label>اسم الفئة *</label>
                    <input className="form-control" name="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                    {formErrors.name && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.name}</span>}
                  </div>
                  <div className="form-group">
                    <label>الوصف</label>
                    <textarea className="form-control" name="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}></textarea>
                    {formErrors.description && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.description}</span>}
                  </div>
                  <div className="form-group">
                    <label>صورة الفئة (اختياري)</label>
                    <input type="file" className="form-control" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
                    {formErrors.image && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.image}</span>}
                    {editCategory?.imageUrl && !imageFile && (
                      <div style={{ marginTop: '10px' }}>
                        <img src={SERVER_URL + editCategory.imageUrl} alt={editCategory.name} style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} />
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label>الفئة الأم (اختياري)</label>
                    <select className="form-control" name="parentId" value={formData.parentId} onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}>
                      <option value="">بدون فئة أم</option>
                      {flatData.filter(c => c.id !== editCategory?.id).map(c => (
                        <option key={c.id} value={c.id}>
                          {'—'.repeat(c.level)} {c.name}
                        </option>
                      ))}
                    </select>
                    {formErrors.parentId && <span style={{ color: 'var(--metro-red)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{formErrors.parentId}</span>}
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>إلغاء</button>
                <button type="submit" form="categoryForm" className="btn btn-primary" disabled={saving}>
                  {saving ? 'جاري الحفظ...' : (editCategory ? 'حفظ التعديلات' : 'إضافة الفئة')}
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </>
  );
};

export default Categories;
