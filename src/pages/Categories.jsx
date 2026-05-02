import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Api, { SERVER_URL } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import ModalContainer from '../components/common/ModalContainer';
import Loader from '../components/common/Loader';
import '../styles/pages/Categories.css';

const Categories = () => {
  const { toast, confirm } = useGlobalUI();
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('name,asc');
  const [typeFilter, setTypeFilter] = useState('all');
  const [stats, setStats] = useState({ totalCount: 0, mainCount: 0, subCount: 0, totalTrend: 0, mainTrend: 0, subTrend: 0 });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', parentId: '' });
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [categoriesData, statsData] = await Promise.all([
        Api.getCategories(true),
        Api.getCategoryStatistics()
      ]);
      setData(categoriesData);
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

  const flattenCategories = (cats, level = 0) => {
    if (!cats) return [];
    
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

  const openForm = (category = null) => {
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
    setImageFile(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditCategory(null);
    setImageFile(null);
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

  // Custom Dropdown Component
  const CustomSelect = ({ options, value, onChange, icon }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(o => o.value === value) || options[0];

    return (
      <div className="cat-custom-select-container">
        <div className={`cat-custom-select-header ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
          <i className={`fas ${icon} icon-start`}></i>
          <span className="selected-text">{selectedOption.label}</span>
          <i className={`fas fa-chevron-down icon-end ${isOpen ? 'rotate' : ''}`}></i>
        </div>
        {isOpen && (
          <>
            <div className="cat-custom-select-overlay" onClick={() => setIsOpen(false)}></div>
            <div className="cat-custom-select-dropdown">
              {options.map(opt => (
                <div 
                  key={opt.value} 
                  className={`cat-custom-select-item ${opt.value === value ? 'active' : ''}`}
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                >
                  {opt.label}
                  {opt.value === value && <i className="fas fa-check"></i>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  const flatData = flattenCategories(data);
  const filteredData = flatData.filter(c => {
    const matchesSearch = !searchTerm || 
      (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || 
      (typeFilter === 'main' && c.level === 0) || 
      (typeFilter === 'sub' && c.level > 0);
      
    return matchesSearch && matchesType;
  });

  // Simple SVG Trend Chart Component
  const TrendChart = ({ color }) => (
    <svg className="cat-stat-chart" viewBox="0 0 100 40">
      <path
        d="M0 35 Q 25 10, 50 25 T 100 5"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );

  return (
    <div className="categories-container">
      {/* 1. Breadcrumbs & Header */}
      <div className="cat-header-row">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="cat-breadcrumbs">
                  <Link to="/dashboard">الرئيسية</Link> / <Link to="/products">المنتجات</Link> / <span>الفئات</span>
              </div>
              <h1>الفئات</h1>
          </div>
          <div className="cat-header-actions">
              {Api.can('CATEGORY_WRITE') && (
                  <button className="cat-btn-premium cat-btn-blue" onClick={() => openForm(null)}>
                      <i className="fas fa-plus"></i> <span style={{ marginRight: '8px' }}>إضافة فئة</span>
                  </button>
              )}
              <div className="desktop-only" style={{ display: 'flex', gap: '10px' }}>
                  <button className="cat-btn-premium cat-btn-outline" onClick={handleExportExcel} disabled={exportingExcel}>
                      <i className="fas fa-file-excel"></i> إكسل
                  </button>
                  <button className="cat-btn-premium cat-btn-outline" onClick={handleExportPdf} disabled={exportingPdf}>
                      <i className="fas fa-file-pdf"></i> PDF
                  </button>
              </div>
          </div>
      </div>

      {/* 2. KPI Stats Grid */}
      <div className="cat-stats-grid">
          <div className="cat-stat-card">
              <div className="cat-stat-info">
                  <h4>إجمالي الفئات</h4>
                  <div className="cat-stat-value">{stats.totalCount}</div>
                  <div className="cat-stat-trend" style={{ color: stats.totalTrend >= 0 ? 'var(--cat-accent-green)' : '#ef4444' }}>
                      <i className={`fas fa-arrow-${stats.totalTrend >= 0 ? 'up' : 'down'}`}></i> {Math.abs(stats.totalTrend).toFixed(0)}% هذا الشهر
                  </div>
              </div>
              <div className="cat-stat-visual">
                  <div className="cat-stat-icon icon-blue">
                      <i className="fas fa-layer-group"></i>
                  </div>
                  <TrendChart color="var(--cat-accent-blue)" />
              </div>
          </div>

          <div className="cat-stat-card">
              <div className="cat-stat-info">
                  <h4>الفئات الرئيسية</h4>
                  <div className="cat-stat-value">{stats.mainCount}</div>
                  <div className="cat-stat-trend" style={{ color: stats.mainTrend >= 0 ? 'var(--cat-accent-green)' : '#ef4444' }}>
                      <i className={`fas fa-arrow-${stats.mainTrend >= 0 ? 'up' : 'down'}`}></i> {Math.abs(stats.mainTrend).toFixed(0)}% هذا الشهر
                  </div>
              </div>
              <div className="cat-stat-visual">
                  <div className="cat-stat-icon icon-green">
                      <i className="fas fa-folder"></i>
                  </div>
                  <TrendChart color="var(--cat-accent-green)" />
              </div>
          </div>

          <div className="cat-stat-card">
              <div className="cat-stat-info">
                  <h4>الفئات الفرعية</h4>
                  <div className="cat-stat-value">{stats.subCount}</div>
                  <div className="cat-stat-trend" style={{ color: stats.subTrend === 0 ? 'var(--cat-text-secondary)' : stats.subTrend > 0 ? 'var(--cat-accent-green)' : '#ef4444' }}>
                      {stats.subTrend === 0 ? 'لا توجد تغييرات' : (
                          <>
                            <i className={`fas fa-arrow-${stats.subTrend > 0 ? 'up' : 'down'}`}></i> {Math.abs(stats.subTrend).toFixed(0)}% هذا الشهر
                          </>
                      )}
                  </div>
              </div>
              <div className="cat-stat-visual">
                  <div className="cat-stat-icon icon-amber">
                      <i className="fas fa-folder-open"></i>
                  </div>
                  <TrendChart color="var(--cat-accent-amber)" />
              </div>
          </div>
      </div>

      {/* 3. Main Content Card (Toolbar + Table) */}
      <div className="cat-toolbar-card">
          <div className="cat-toolbar-left">
              <CustomSelect 
                icon="fa-sort-amount-down"
                value={sort}
                onChange={setSort}
                options={[
                  { value: 'createdAt,desc', label: 'ترتيب: الأحدث' },
                  { value: 'name,asc', label: 'ترتيب: الاسم (أ-ي)' },
                  { value: 'productCount,desc', label: 'ترتيب: الأكثر منتجات' }
                ]}
              />
              <CustomSelect 
                icon="fa-filter"
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: 'all', label: 'كل الفئات' },
                  { value: 'main', label: 'رئيسية فقط' },
                  { value: 'sub', label: 'فرعية فقط' }
                ]}
              />
          </div>

          <div className="cat-toolbar-right">
              <div className="cat-search-box">
                  <i className="fas fa-search"></i>
                  <input 
                    type="text" 
                    placeholder="ابحث عن فئة..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                  />
              </div>
          </div>
      </div>

      <div className="cat-table-card">
          <div className="cat-table-container">
              {loading ? (
                  <div style={{ padding: '40px' }}><Loader message="جاري التحميل..." /></div>
              ) : (
                  <table className="cat-table">
                      <thead>
                          <tr>
                              <th>#</th>
                              <th>الصورة</th>
                              <th>اسم الفئة</th>
                              <th>النوع</th>
                              <th>الوصف</th>
                              <th>عدد المنتجات</th>
                              <th>تاريخ الإنشاء</th>
                              <th>الإجراءات</th>
                          </tr>
                      </thead>
                      <tbody>
                          {filteredData.map((c, idx) => (
                              <tr key={c.id}>
                                  <td>{idx + 1}</td>
                                  <td>
                                      {c.imageUrl ? (
                                          <img src={SERVER_URL + c.imageUrl} alt={c.name} className="cat-img-preview" />
                                      ) : (
                                          <div className="cat-img-preview" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', background: 'var(--cat-bg)' }}>
                                              <i className="far fa-folder"></i>
                                          </div>
                                      )}
                                  </td>
                                  <td>
                                      <div style={{ paddingRight: `${c.level * 20}px`, fontWeight: 700 }}>
                                          {c.level > 0 && <span style={{ marginLeft: '8px', color: 'var(--cat-text-secondary)' }}>↳</span>}
                                          {c.name}
                                          <div style={{ fontSize: '0.7rem', color: 'var(--cat-text-secondary)', fontWeight: 400 }}>معرف: CAT-{String(c.id).padStart(5, '0')}</div>
                                      </div>
                                  </td>
                                  <td>
                                      <span className={`cat-type-badge ${c.level === 0 ? 'badge-green' : 'badge-blue'}`}>
                                          <i className={`fas ${c.level === 0 ? 'fa-circle' : 'fa-info-circle'}`} style={{ fontSize: '0.5rem' }}></i>
                                          {c.level === 0 ? 'رئيسية' : 'فرعية'}
                                      </span>
                                  </td>
                                  <td>{c.description || '—'}</td>
                                  <td>
                                      <span className="cat-product-count">{c.productCount || 0}</span>
                                  </td>
                                  <td>{c.createdAt ? new Date(c.createdAt).toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</td>
                                  <td>
                                      <div className="cat-actions">
                                          <button className="cat-action-btn" title="خيارات إضافية"><i className="fas fa-ellipsis-h"></i></button>
                                          {Api.can('CATEGORY_WRITE') && (
                                              <button className="cat-action-btn" onClick={() => openForm(c)} title="تعديل"><i className="fas fa-pen"></i></button>
                                          )}
                                          {Api.can('CATEGORY_DELETE') && (
                                              <button className="cat-action-btn delete" onClick={() => handleDelete(c.id, c.name)} title="حذف"><i className="fas fa-trash"></i></button>
                                          )}
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              )}
          </div>

          <div className="cat-pagination">
              <div className="cat-pagination-info">
                  عرض {filteredData.length} إلى {filteredData.length} من {flatData.length} نتيجة
              </div>
              <div className="cat-pagination-btns">
                  <button className="cat-page-btn" disabled>السابق</button>
                  <button className="cat-page-btn active">1</button>
                  <button className="cat-page-btn" disabled>التالي</button>
              </div>
          </div>
      </div>

      {/* 5. Modal Container */}
      {isModalOpen && (
        <ModalContainer>
          <div className="cat-modal-overlay" onClick={(e) => { if (e.target.classList.contains('cat-modal-overlay')) closeModal(); }}>
            <div className="cat-modal">
              <div className="cat-modal-header">
                <h3>{editCategory ? 'تعديل الفئة' : 'إضافة فئة جديدة'}</h3>
                <button className="cat-modal-close" onClick={closeModal}>✕</button>
              </div>
              <div className="cat-modal-body">
                <form id="categoryForm" onSubmit={handleSave}>
                  <div className="cat-form-group">
                    <label>اسم الفئة *</label>
                    <input 
                      className="cat-input" 
                      name="name" 
                      placeholder="أدخل اسم الفئة..."
                      value={formData.name} 
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                      required 
                    />
                  </div>
                  
                  <div className="cat-form-group">
                    <label>الوصف</label>
                    <textarea 
                      className="cat-textarea" 
                      name="description" 
                      placeholder="اكتب وصفاً مختصراً للفئة..."
                      value={formData.description} 
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    ></textarea>
                  </div>

                  <div className="cat-form-group">
                    <label>صورة الفئة</label>
                    <div className="cat-file-input-wrapper">
                      <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
                      <div className="cat-file-info">
                        <i className="fas fa-cloud-upload-alt"></i>
                        <span>{imageFile ? imageFile.name : 'اضغط لرفع صورة أو اسحبها هنا'}</span>
                        <small>PNG, JPG (الحد الأقصى 2MB)</small>
                      </div>
                    </div>
                    {editCategory?.imageUrl && !imageFile && (
                      <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img src={SERVER_URL + editCategory.imageUrl} alt={editCategory.name} style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--cat-border)' }} />
                        <span style={{ fontSize: '0.85rem', color: 'var(--cat-text-secondary)' }}>الصورة الحالية</span>
                      </div>
                    )}
                  </div>

                  <div className="cat-form-group">
                    <label>الفئة الأم</label>
                    <select 
                      className="cat-input" 
                      name="parentId" 
                      value={formData.parentId} 
                      onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                    >
                      <option value="">-- فئة رئيسية (بدون أب) --</option>
                      {flatData.filter(c => c.id !== editCategory?.id).map(c => (
                        <option key={c.id} value={c.id}>
                          {'—'.repeat(c.level)} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </form>
              </div>
              <div className="cat-modal-footer">
                <button type="button" className="cat-btn-ghost" onClick={closeModal}>إلغاء</button>
                <button type="submit" form="categoryForm" className="cat-btn-primary" disabled={saving}>
                  {saving ? (
                    <><i className="fas fa-spinner fa-spin" style={{ marginLeft: '8px' }}></i> جاري الحفظ...</>
                  ) : (editCategory ? 'حفظ التعديلات' : 'إضافة الفئة')}
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default Categories;
