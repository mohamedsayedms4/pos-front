import React, { useState, useEffect, useCallback } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import '../styles/pages/SuperAdminArticles.css';

// ─── SEO Score Badge ───────────────────────────────────────────────────────────
const SeoBadge = ({ score }) => {
  if (score === null || score === undefined) return <span className="seo-badge seo-badge--na">N/A</span>;
  const cls = score >= 80 ? 'good' : score >= 60 ? 'avg' : 'bad';
  return <span className={`seo-badge seo-badge--${cls}`}>{score}/100</span>;
};

// ─── Status Badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = { PUBLISHED: ['منشور', 'published'], DRAFT: ['مسودة', 'draft'], ARCHIVED: ['مؤرشف', 'archived'] };
  const [label, cls] = map[status] || [status, 'draft'];
  return <span className={`status-badge status-badge--${cls}`}>{label}</span>;
};

// ─── Article Form Modal ────────────────────────────────────────────────────────
const ArticleFormModal = ({ article, onClose, onSave }) => {
  const [form, setForm] = useState({
    title: '', slug: '', excerpt: '', content: '',
    coverImageUrl: '', metaTitle: '', metaDescription: '', metaKeywords: '',
    ogTitle: '', ogDescription: '', ogImage: '',
    authorName: '', authorAvatarUrl: '',
    category: '', tags: '', status: 'DRAFT', featured: false,
    ...article ? {
      ...article,
      tags: (article.tags || []).join(', ')
    } : {}
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('main');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleImageUpload = async (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;

    let customName = window.prompt("هل تود تسمية الصورة باسم مخصص لتحسين السيو؟ (اتركه فارغاً لاستخدام اسم عشوائي)");
    if (customName !== null) {
      customName = customName.trim();
    }

    try {
      const fileName = await Api.uploadSuperAdminArticleImage(file, customName);
      setForm(f => ({ ...f, [fieldName]: fileName }));
    } catch (err) {
      alert(err.message || 'فشل في رفع الصورة');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return alert('العنوان مطلوب');
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      };
      await onSave(payload);
      onClose();
    } catch (err) {
      alert(err.message || 'فشل في الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'main', label: '📝 المحتوى' },
    { id: 'seo', label: '🔍 SEO' },
    { id: 'og', label: '📱 Open Graph' },
    { id: 'meta', label: '⚙️ إعدادات' }
  ];

  // Auto SEO score preview
  const previewScore = (() => {
    let s = 0;
    if (form.title) s += 20;
    if (form.metaDescription) s += 20;
    if (form.metaKeywords) s += 20;
    if (form.coverImageUrl) s += 20;
    if (form.excerpt) s += 20;
    return s;
  })();

  return (
    <div className="sa-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sa-modal sa-modal--wide" dir="rtl">
        <div className="sa-modal-header">
          <h2>{article ? '✏️ تعديل المقال' : '➕ مقال جديد'}</h2>
          <button className="sa-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* SEO Preview Score */}
        <div className="sa-seo-preview">
          <div className="sa-seo-preview__label">SEO Score المتوقع:</div>
          <div className="sa-seo-preview__bar">
            <div
              className="sa-seo-preview__fill"
              style={{
                width: `${previewScore}%`,
                background: previewScore >= 80 ? '#22c55e' : previewScore >= 60 ? '#f59e0b' : '#ef4444'
              }}
            />
          </div>
          <div className="sa-seo-preview__score" style={{ color: previewScore >= 80 ? '#22c55e' : previewScore >= 60 ? '#f59e0b' : '#ef4444' }}>
            {previewScore}/100
          </div>
        </div>

        {/* Tabs */}
        <div className="sa-modal-tabs">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              className={`sa-modal-tab ${activeTab === t.id ? 'sa-modal-tab--active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="sa-modal-form">
          {/* ── Main Tab ── */}
          {activeTab === 'main' && (
            <div className="sa-form-section">
              <div className="sa-form-row sa-form-row--full">
                <label>العنوان *</label>
                <input name="title" value={form.title} onChange={handleChange} placeholder="عنوان المقال" required className="sa-input" />
              </div>
              <div className="sa-form-row sa-form-row--full">
                <label>المقتطف (Excerpt)</label>
                <textarea name="excerpt" value={form.excerpt} onChange={handleChange} placeholder="وصف مختصر يظهر في بطاقات المقالات..." rows={3} className="sa-input sa-textarea" />
              </div>
              <div className="sa-form-row sa-form-row--full">
                <label>المحتوى الكامل (HTML)</label>
                <textarea name="content" value={form.content} onChange={handleChange} placeholder="<h2>عنوان فرعي</h2><p>محتوى المقال بصيغة HTML...</p>" rows={12} className="sa-input sa-textarea sa-textarea--code" />
              </div>
              <div className="sa-form-row">
                <label>صورة الغلاف (Cover Image)</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'coverImageUrl')} className="sa-input" style={{ flex: 1 }} />
                  {form.coverImageUrl && <img src={Api.getImageUrl(form.coverImageUrl)} alt="Cover" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />}
                </div>
              </div>
              <div className="sa-form-row">
                <label>اسم الكاتب</label>
                <input name="authorName" value={form.authorName} onChange={handleChange} placeholder="محمد أحمد" className="sa-input" />
              </div>
              <div className="sa-form-row">
                <label>صورة الكاتب</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'authorAvatarUrl')} className="sa-input" style={{ flex: 1 }} />
                  {form.authorAvatarUrl && <img src={Api.getImageUrl(form.authorAvatarUrl)} alt="Author" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />}
                </div>
              </div>
              <div className="sa-form-row">
                <label>التصنيف</label>
                <input name="category" value={form.category} onChange={handleChange} placeholder="إدارة الأعمال، محاسبة، تقنية..." className="sa-input" />
              </div>
              <div className="sa-form-row">
                <label>الوسوم (Tags) — مفصولة بفاصلة</label>
                <input name="tags" value={form.tags} onChange={handleChange} placeholder="erp, pos, مبيعات" className="sa-input" />
              </div>
            </div>
          )}

          {/* ── SEO Tab ── */}
          {activeTab === 'seo' && (
            <div className="sa-form-section">
              <div className="sa-seo-checklist">
                <h4>✅ عناصر SEO</h4>
                <ul>
                  <li className={form.title ? 'seo-ok' : 'seo-miss'}>
                    {form.title ? '✓' : '✗'} العنوان (Title) — +20 نقطة
                  </li>
                  <li className={form.metaDescription ? 'seo-ok' : 'seo-miss'}>
                    {form.metaDescription ? '✓' : '✗'} Meta Description — +20 نقطة
                  </li>
                  <li className={form.metaKeywords ? 'seo-ok' : 'seo-miss'}>
                    {form.metaKeywords ? '✓' : '✗'} Meta Keywords — +20 نقطة
                  </li>
                  <li className={form.coverImageUrl ? 'seo-ok' : 'seo-miss'}>
                    {form.coverImageUrl ? '✓' : '✗'} صورة الغلاف (Cover Image) — +20 نقطة
                  </li>
                  <li className={form.excerpt ? 'seo-ok' : 'seo-miss'}>
                    {form.excerpt ? '✓' : '✗'} مقتطف الوصف (Excerpt) — +20 نقطة
                  </li>
                </ul>
              </div>

              <div className="sa-form-row sa-form-row--full">
                <label>Meta Title (للمتصفح وجوجل)</label>
                <input name="metaTitle" value={form.metaTitle} onChange={handleChange} placeholder="يُفضل أن يكون 50-60 حرف" className="sa-input" />
                <span className="sa-hint">{form.metaTitle.length}/60 حرف</span>
              </div>
              <div className="sa-form-row sa-form-row--full">
                <label>Meta Description</label>
                <textarea name="metaDescription" value={form.metaDescription} onChange={handleChange} placeholder="وصف تحسين محركات البحث — يُفضل 120-160 حرف" rows={3} className="sa-input sa-textarea" />
                <span className="sa-hint">{form.metaDescription.length}/160 حرف</span>
              </div>
              <div className="sa-form-row sa-form-row--full">
                <label>Meta Keywords</label>
                <input name="metaKeywords" value={form.metaKeywords} onChange={handleChange} placeholder="كلمة1، كلمة2، كلمة3" className="sa-input" />
              </div>
              <div className="sa-form-row sa-form-row--full">
                <label>Slug (الرابط الدائم)</label>
                <input name="slug" value={form.slug} onChange={handleChange} placeholder="my-article-slug (يُولَّد تلقائياً إذا فارغ)" className="sa-input sa-input--ltr" />
                <span className="sa-hint">مثال: /blog/my-article-slug</span>
              </div>
            </div>
          )}

          {/* ── Open Graph Tab ── */}
          {activeTab === 'og' && (
            <div className="sa-form-section">
              <div className="sa-og-info">
                <p>📱 حقول Open Graph تتحكم في مظهر المشاركة على فيسبوك، تويتر، لينكدإن، واتساب.</p>
                <p>إذا تركتها فارغة سيستخدم النظام Meta Title و Meta Description بدلاً منها.</p>
              </div>
              <div className="sa-form-row sa-form-row--full">
                <label>OG Title</label>
                <input name="ogTitle" value={form.ogTitle} onChange={handleChange} placeholder="مثالي للمشاركة على السوشيال ميديا" className="sa-input" />
              </div>
              <div className="sa-form-row sa-form-row--full">
                <label>OG Description</label>
                <textarea name="ogDescription" value={form.ogDescription} onChange={handleChange} placeholder="وصف يظهر عند مشاركة الرابط" rows={3} className="sa-input sa-textarea" />
              </div>
              <div className="sa-form-row sa-form-row--full">
                <label>صورة OG (1200×630 px)</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'ogImage')} className="sa-input" style={{ flex: 1 }} />
                </div>
                {form.ogImage && (
                  <div className="og-preview">
                    <img src={Api.getImageUrl(form.ogImage)} alt="OG Preview" onError={e => e.target.style.display='none'} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Meta/Settings Tab ── */}
          {activeTab === 'meta' && (
            <div className="sa-form-section">
              <div className="sa-form-row">
                <label>الحالة</label>
                <select name="status" value={form.status} onChange={handleChange} className="sa-input sa-select">
                  <option value="DRAFT">🟡 مسودة</option>
                  <option value="PUBLISHED">🟢 منشور</option>
                  <option value="ARCHIVED">⚫ مؤرشف</option>
                </select>
              </div>
              <div className="sa-form-row">
                <label className="sa-checkbox-label">
                  <input type="checkbox" name="featured" checked={form.featured} onChange={handleChange} className="sa-checkbox" />
                  <span>⭐ مقال مميز (يظهر في الصفحة الرئيسية)</span>
                </label>
              </div>
            </div>
          )}

          <div className="sa-modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>إلغاء</button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? 'جاري الحفظ...' : article ? 'حفظ التعديلات' : 'إنشاء المقال'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const SuperAdminArticles = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const { toast: showToast, confirm: showConfirm } = useGlobalUI();

  const fetchArticles = useCallback(async (page = 0) => {
    setLoading(true);
    try {
      const data = await Api.getSuperAdminArticles(page, 10);
      setArticles(data?.articles || []);
      setTotalPages(data?.totalPages || 0);
      setTotalElements(data?.totalElements || 0);
      setCurrentPage(data?.currentPage || 0);
    } catch (e) {
      showToast(e.message || 'فشل في تحميل المقالات', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchArticles(0); }, [fetchArticles]);

  const handleSave = async (formData) => {
    if (editingArticle) {
      await Api.updateSuperAdminArticle(editingArticle.id, formData);
      showToast('تم تحديث المقال بنجاح', 'success');
    } else {
      await Api.createSuperAdminArticle(formData);
      showToast('تم إنشاء المقال بنجاح', 'success');
    }
    fetchArticles(currentPage);
    setEditingArticle(null);
  };

  const handleTogglePublish = async (article) => {
    const action = article.status === 'PUBLISHED' ? 'إلغاء نشر' : 'نشر';
    showConfirm(`هل تريد ${action} مقال "${article.title}"؟`, async () => {
      try {
        await Api.toggleSuperAdminArticlePublish(article.id);
        showToast(`تم ${action} المقال`, 'success');
        fetchArticles(currentPage);
      } catch (e) { showToast(e.message, 'error'); }
    });
  };

  const handleDelete = (article) => {
    showConfirm(`هل أنت متأكد من حذف مقال "${article.title}" نهائياً؟`, async () => {
      try {
        await Api.deleteSuperAdminArticle(article.id);
        showToast('تم حذف المقال', 'success');
        fetchArticles(currentPage);
      } catch (e) { showToast(e.message, 'error'); }
    });
  };

  const handleArchive = async (article) => {
    showConfirm(`هل تريد أرشفة مقال "${article.title}"؟`, async () => {
      try {
        await Api.archiveSuperAdminArticle(article.id);
        showToast('تم أرشفة المقال', 'success');
        fetchArticles(currentPage);
      } catch (e) { showToast(e.message, 'error'); }
    });
  };

  const openCreate = () => { setEditingArticle(null); setModalOpen(true); };
  const openEdit = (a) => { setEditingArticle(a); setModalOpen(true); };

  // Stats
  const published = articles.filter(a => a.status === 'PUBLISHED').length;
  const drafts = articles.filter(a => a.status === 'DRAFT').length;
  const avgSeo = articles.length
    ? Math.round(articles.reduce((s, a) => s + (a.seoScore || 0), 0) / articles.length)
    : 0;

  return (
    <div className="sa-articles-page" dir="rtl">
      {/* Header */}
      <div className="sa-articles-header">
        <div className="sa-articles-title-area">
          <h1>📰 إدارة المقالات</h1>
          <p className="sa-articles-sub">إنشاء وتعديل ونشر المقالات على الموقع العام</p>
        </div>
        <button className="btn-new-article" onClick={openCreate}>
          ➕ مقال جديد
        </button>
      </div>

      {/* Stats Cards */}
      <div className="sa-articles-stats">
        <div className="sa-stat-card">
          <span className="sa-stat-num">{totalElements}</span>
          <span className="sa-stat-label">إجمالي المقالات</span>
        </div>
        <div className="sa-stat-card sa-stat-card--green">
          <span className="sa-stat-num">{published}</span>
          <span className="sa-stat-label">منشور (هذه الصفحة)</span>
        </div>
        <div className="sa-stat-card sa-stat-card--amber">
          <span className="sa-stat-num">{drafts}</span>
          <span className="sa-stat-label">مسودة (هذه الصفحة)</span>
        </div>
        <div className="sa-stat-card sa-stat-card--purple">
          <span className="sa-stat-num">{avgSeo}/100</span>
          <span className="sa-stat-label">متوسط SEO Score</span>
        </div>
      </div>

      {/* Table */}
      <div className="sa-articles-table-wrap">
        {loading ? (
          <div className="sa-loading">جاري التحميل...</div>
        ) : articles.length === 0 ? (
          <div className="sa-empty">
            <div className="sa-empty-icon">📰</div>
            <h3>لا توجد مقالات بعد</h3>
            <p>ابدأ بإنشاء أول مقال الآن</p>
            <button className="btn-new-article" onClick={openCreate}>➕ أنشئ مقالاً</button>
          </div>
        ) : (
          <table className="sa-articles-table">
            <thead>
              <tr>
                <th>المقال</th>
                <th>التصنيف</th>
                <th>الحالة</th>
                <th>SEO</th>
                <th>المشاهدات</th>
                <th>تاريخ النشر</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {articles.map(article => (
                <tr key={article.id}>
                  <td className="sa-col-title">
                    <div className="sa-article-info">
                      {article.coverImageUrl && (
                        <img src={Api.getImageUrl(article.coverImageUrl)} alt={article.title} className="sa-article-thumb" />
                      )}
                      <div>
                        <div className="sa-article-title">{article.title}</div>
                        <div className="sa-article-slug">/{article.slug}</div>
                        {article.featured && <span className="featured-chip">⭐ مميز</span>}
                      </div>
                    </div>
                  </td>
                  <td>
                    {article.category
                      ? <span className="category-chip">{article.category}</span>
                      : <span className="no-value">—</span>
                    }
                  </td>
                  <td><StatusBadge status={article.status} /></td>
                  <td><SeoBadge score={article.seoScore} /></td>
                  <td className="sa-col-views">
                    {(article.viewCount || 0).toLocaleString('ar-EG')}
                  </td>
                  <td className="sa-col-date">
                    {article.publishedAt
                      ? new Date(article.publishedAt).toLocaleDateString('ar-EG')
                      : <span className="no-value">—</span>
                    }
                  </td>
                  <td>
                    <div className="sa-article-actions">
                      <button
                        className="btn-act btn-act--edit"
                        onClick={() => openEdit(article)}
                        title="تعديل"
                      >✏️</button>

                      <button
                        className={`btn-act ${article.status === 'PUBLISHED' ? 'btn-act--unpublish' : 'btn-act--publish'}`}
                        onClick={() => handleTogglePublish(article)}
                        title={article.status === 'PUBLISHED' ? 'إلغاء النشر' : 'نشر'}
                      >
                        {article.status === 'PUBLISHED' ? '🔴' : '🟢'}
                      </button>

                      {article.status !== 'ARCHIVED' && (
                        <button
                          className="btn-act btn-act--archive"
                          onClick={() => handleArchive(article)}
                          title="أرشفة"
                        >📦</button>
                      )}

                      <a
                        className="btn-act btn-act--view"
                        href={`/blog/${article.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="عرض المقال"
                      >👁️</a>

                      <button
                        className="btn-act btn-act--delete"
                        onClick={() => handleDelete(article)}
                        title="حذف نهائي"
                      >🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="sa-pagination">
          <button disabled={currentPage === 0} onClick={() => fetchArticles(currentPage - 1)} className="sa-pag-btn">‹</button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`sa-pag-btn ${i === currentPage ? 'sa-pag-btn--active' : ''}`}
              onClick={() => fetchArticles(i)}
            >{i + 1}</button>
          ))}
          <button disabled={currentPage >= totalPages - 1} onClick={() => fetchArticles(currentPage + 1)} className="sa-pag-btn">›</button>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <ArticleFormModal
          article={editingArticle}
          onClose={() => { setModalOpen(false); setEditingArticle(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default SuperAdminArticles;
