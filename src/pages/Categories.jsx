import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import ModalContainer from '../components/common/ModalContainer';

const Categories = () => {
  const { toast, confirm } = useGlobalUI();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', parentId: '' });
  const [saving, setSaving] = useState(false);

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
    let result = [];
    for (const cat of cats) {
      result.push({ ...cat, level });
      if (cat.children && cat.children.length) {
        result = result.concat(flattenCategories(cat.children, level + 1));
      }
    }
    return result;
  };

  const openForm = async (category = null) => {
    setEditCategory(category);
    if (category) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        parentId: category.parentId || ''
      });
    } else {
      setFormData({ name: '', description: '', parentId: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditCategory(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
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

    try {
      if (editCategory) {
        await Api.updateCategory(editCategory.id, apiData);
      } else {
        await Api.createCategory(apiData);
      }
      toast(editCategory ? 'تم تحديث الفئة بنجاح' : 'تم إضافة الفئة بنجاح', 'success');
      closeModal();
      loadData();
    } catch (err) {
      toast(err.message, 'error');
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

  return (
    <>
      <div className="page-section">
      <div className="card">
        <div className="card-header">
          <h3>📂 إدارة الفئات</h3>
          {Api.can('CATEGORY_WRITE') && (
            <button className="btn btn-primary" onClick={() => openForm(null)}>
              <span>+</span> إضافة فئة
            </button>
          )}
        </div>
        <div className="card-body no-padding">
          <div className="table-wrapper">
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>جاري التحميل...</div>
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
                    <th>الفئة</th>
                    <th>الوصف</th>
                    <th>الفئة الأم</th>
                    <th>عدد المنتجات</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {flatData.map((c, i) => (
                    <tr key={c.id}>
                      <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td>
                        <div style={{ paddingLeft: `${c.level * 24}px`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{c.level > 0 ? '↳' : '📁'}</span>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{c.description || '—'}</td>
                      <td>{c.parentName || <span className="text-muted">—</span>}</td>
                      <td><span className="badge badge-info">{c.productCount || 0}</span></td>
                      <td>
                        <div className="table-actions">
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
                    <input className="form-control" name="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>الوصف</label>
                    <textarea className="form-control" name="description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}></textarea>
                  </div>
                  <div className="form-group">
                    <label>الفئة الأم (اختياري)</label>
                    <select className="form-control" name="parentId" value={formData.parentId} onChange={(e) => setFormData({...formData, parentId: e.target.value})}>
                      <option value="">بدون فئة أم</option>
                      {flatData.filter(c => c.id !== editCategory?.id).map(c => (
                        <option key={c.id} value={c.id}>
                          {'—'.repeat(c.level)} {c.name}
                        </option>
                      ))}
                    </select>
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
