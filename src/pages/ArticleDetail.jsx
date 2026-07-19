import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Api from '../services/api';
import '../styles/pages/ArticleDetail.css';
import PublicNavbar from '../components/layout/PublicNavbar';

// ─── SEO Hook ─────────────────────────────────────────────────────────────────
const useSEO = ({ title, description, keywords, ogTitle, ogDescription, ogImage, canonical, publishedAt, authorName }) => {
  useEffect(() => {
    document.title = title;
    const setMeta = (name, content, property = false) => {
      if (!content) return;
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };

    // Standard SEO
    setMeta('description', description);
    if (keywords) setMeta('keywords', keywords);
    setMeta('robots', 'index, follow');
    setMeta('author', authorName);

    // Open Graph
    setMeta('og:title', ogTitle || title, true);
    setMeta('og:description', ogDescription || description, true);
    setMeta('og:type', 'article', true);
    setMeta('og:url', canonical || window.location.href, true);
    if (ogImage) setMeta('og:image', ogImage, true);
    if (publishedAt) setMeta('article:published_time', new Date(publishedAt).toISOString(), true);

    // Twitter Card
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', ogTitle || title);
    setMeta('twitter:description', ogDescription || description);
    if (ogImage) setMeta('twitter:image', ogImage);

    // Canonical
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
    link.href = canonical || window.location.href;

    return () => { document.title = 'سجل ERP'; };
  }, [title, description, keywords, ogTitle, ogDescription, ogImage, canonical, publishedAt, authorName]);
};

// ─── JSON-LD Article Schema ────────────────────────────────────────────────────
const ArticleSchema = ({ article }) => {
  if (!article) return null;
  const origin = window.location.origin;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.metaDescription || article.excerpt || '',
    url: `${origin}/blog/${article.slug}`,
    image: article.ogImage || article.coverImageUrl ? Api.getImageUrl(article.ogImage || article.coverImageUrl) : undefined,
    author: { '@type': 'Person', name: article.authorName || 'سجل ERP' },
    publisher: {
      '@type': 'Organization',
      name: 'سجل ERP',
      logo: { '@type': 'ImageObject', url: `${origin}/favicon.ico` }
    },
    datePublished: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
    dateModified: article.updatedAt ? new Date(article.updatedAt).toISOString() : undefined,
    keywords: article.metaKeywords || (article.tags || []).join(', '),
    articleSection: article.category || 'عام',
    wordCount: article.content ? article.content.replace(/<[^>]+>/g, '').split(/\s+/).length : 0
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: origin },
      { '@type': 'ListItem', position: 2, name: 'المدونة', item: `${origin}/blog` },
      { '@type': 'ListItem', position: 3, name: article.title, item: `${origin}/blog/${article.slug}` }
    ]
  };

  return (
    <>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
      <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
    </>
  );
};



// ─── Article Detail Component ──────────────────────────────────────────────────
const ArticleDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await Api.getPublicArticleBySlug(slug);
        setData(res);
      } catch (e) {
        setError(e.message || 'المقال غير موجود');
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
    window.scrollTo(0, 0);
  }, [slug]);

  const article = data?.article;
  const related = data?.related || [];

  useSEO({
    title: article ? `${article.metaTitle || article.title} | سجل ERP` : 'جاري التحميل...',
    description: article?.metaDescription || article?.excerpt || '',
    keywords: article?.metaKeywords || (article?.tags || []).join(', '),
    ogTitle: article?.ogTitle || article?.title,
    ogDescription: article?.ogDescription || article?.metaDescription || article?.excerpt,
    ogImage: article?.ogImage ? Api.getImageUrl(article.ogImage) : article?.coverImageUrl ? Api.getImageUrl(article.coverImageUrl) : undefined,
    canonical: article ? `${window.location.origin}/blog/${article.slug}` : undefined,
    publishedAt: article?.publishedAt,
    authorName: article?.authorName || 'سجل ERP'
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="article-detail-page" dir="rtl">
        <div className="article-detail-skeleton container">
          <div className="skeleton-cover-full" />
          <div className="skeleton-body-wide">
            <div className="skeleton-line skeleton-line--title" />
            <div className="skeleton-line skeleton-line--wide" />
            <div className="skeleton-line" />
            <div className="skeleton-line skeleton-line--wide" />
            <div className="skeleton-line" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="article-detail-page" dir="rtl">
        <div className="article-not-found container">
          <div className="not-found-icon"><i className="fa-solid fa-file-lines"></i></div>
          <h1>المقال غير موجود</h1>
          <p>{error || 'لم يتم العثور على المقال المطلوب'}</p>
          <button className="btn-back-blog" onClick={() => navigate('/blog')}>← العودة للمدونة</button>
        </div>
      </div>
    );
  }

  const pubDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const coverSrc = article.coverImageUrl ? Api.getImageUrl(article.coverImageUrl) : null;

  return (
    <div className="article-detail-page" dir="rtl" style={{ paddingTop: '85px' }}>
      <PublicNavbar />
      <ArticleSchema article={article} />

      {/* ── Breadcrumb ── */}
      <nav className="article-breadcrumb" aria-label="مسار التنقل">
        <div className="container article-breadcrumb__inner">
          <Link to="/">الرئيسية</Link>
          <span className="breadcrumb-sep">›</span>
          <Link to="/blog">المدونة</Link>
          {article.category && (
            <>
              <span className="breadcrumb-sep">›</span>
              <Link to={`/blog?category=${encodeURIComponent(article.category)}`}>{article.category}</Link>
            </>
          )}
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-current" aria-current="page">{article.title}</span>
        </div>
      </nav>

      {/* ── Cover Image ── */}
      {coverSrc && (
        <div className="article-cover-container">
          <div className="article-cover-gradient" />
          <img src={coverSrc} alt={article.title} className="article-cover-img" />
        </div>
      )}

      {/* ── Article Body ── */}
      <div className="container article-detail-container">
        <div className="article-detail-main">

          {/* Header */}
          <header className="article-header">
            <div className="article-header__badges">
              {article.category && (
                <Link to={`/blog?category=${encodeURIComponent(article.category)}`} className="article-category-badge">
                  {article.category}
                </Link>
              )}
              {article.featured && <span className="article-featured-badge"><i className="fa-solid fa-star"></i> مقال مميز</span>}
            </div>

            <h1 className="article-header__title">{article.title}</h1>

            {article.excerpt && (
              <p className="article-header__excerpt">{article.excerpt}</p>
            )}

            {/* Author + Meta Row */}
            <div className="article-header__meta">
              <div className="article-author">
                {article.authorAvatarUrl
                  ? <img src={Api.getImageUrl(article.authorAvatarUrl)} alt={article.authorName} className="author-avatar" />
                  : <div className="author-avatar-placeholder">{(article.authorName || 'س').charAt(0)}</div>
                }
                <div className="author-info">
                  <span className="author-name">{article.authorName || 'سجل ERP'}</span>
                  {pubDate && <span className="article-pub-date">{pubDate}</span>}
                </div>
              </div>

              <div className="article-meta-chips">
                {article.readingTime && (
                  <span className="meta-chip">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {article.readingTime} دقيقة قراءة
                  </span>
                )}
                <span className="meta-chip">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  {(article.viewCount || 0).toLocaleString('ar-EG')} مشاهدة
                </span>
              </div>
            </div>

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="article-tags">
                {article.tags.map(tag => (
                  <Link key={tag} to={`/blog?search=${encodeURIComponent(tag)}`} className="article-tag">
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </header>

          {/* ── Divider ── */}
          <div className="article-divider" />

          {/* ── Article Content ── */}
          <article
            className="article-prose"
            dangerouslySetInnerHTML={{ __html: article.content || '<p>لا يوجد محتوى بعد.</p>' }}
          />

          {/* ── Share Section ── */}
          <div className="article-share">
            <h3 className="article-share__title">شارك هذا المقال</h3>
            <div className="article-share__buttons">
              <a
                className="share-btn share-btn--whatsapp"
                href={`https://wa.me/?text=${encodeURIComponent(article.title + ' ' + window.location.href)}`}
                target="_blank" rel="noopener noreferrer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                واتساب
              </a>
              <a
                className="share-btn share-btn--facebook"
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                target="_blank" rel="noopener noreferrer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                فيسبوك
              </a>
              <a
                className="share-btn share-btn--linkedin"
                href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent(article.title)}`}
                target="_blank" rel="noopener noreferrer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                لينكدإن
              </a>
              <button className="share-btn share-btn--copy" onClick={handleCopyLink}>
                {copyFeedback ? ' تم النسخ!' : ' نسخ الرابط'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <aside className="article-detail-sidebar">
          {/* Author Card */}
          {article.authorName && (
            <div className="sidebar-author-card">
              {article.authorAvatarUrl
                ? <img src={Api.getImageUrl(article.authorAvatarUrl)} alt={article.authorName} className="sidebar-author-avatar" />
                : <div className="sidebar-author-initials">{article.authorName.charAt(0)}</div>
              }
              <h4 className="sidebar-author-name">{article.authorName}</h4>
              <p className="sidebar-author-label">كاتب المحتوى</p>
            </div>
          )}

          {/* Article Info */}
          <div className="sidebar-info-card">
            <h4>معلومات المقال</h4>
            <ul className="sidebar-info-list">
              {pubDate && <li><span><i className="fa-solid fa-calendar-days"></i> تاريخ النشر</span><span>{pubDate}</span></li>}
              {article.readingTime && <li><span><i className="fa-solid fa-stopwatch"></i> وقت القراءة</span><span>{article.readingTime} دقيقة</span></li>}
              {article.category && <li><span><i className="fa-solid fa-folder-open"></i> التصنيف</span><span>{article.category}</span></li>}
              <li><span><i className="fa-solid fa-eye"></i>️ المشاهدات</span><span>{(article.viewCount || 0).toLocaleString('ar-EG')}</span></li>
            </ul>

          </div>

          {/* CTA Card */}
          <div className="sidebar-cta-card">
            <div className="sidebar-cta-icon"><i className="fa-solid fa-rocket"></i></div>
            <h4>جرب سجل ERP مجاناً</h4>
            <p>نظام متكامل لإدارة أعمالك</p>
            <Link to="/register" className="btn-sidebar-cta">ابدأ الآن</Link>
          </div>
        </aside>
      </div>

      {/* ── Related Articles ── */}
      {related.length > 0 && (
        <section className="related-articles">
          <div className="container">
            <h2 className="related-articles__title">مقالات ذات صلة</h2>
            <div className="related-articles__grid">
              {related.map(rel => {
                const relCover = rel.coverImageUrl ? Api.getImageUrl(rel.coverImageUrl) : null;
                return (
                  <Link key={rel.id} to={`/blog/${rel.slug}`} className="related-card">
                    <div className="related-card__cover">
                      {relCover
                        ? <img src={relCover} alt={rel.title} loading="lazy" />
                        : <div className="related-card__cover-ph"><i className="fa-solid fa-file-lines"></i></div>
                      }
                    </div>
                    <div className="related-card__body">
                      {rel.category && <span className="related-card__cat">{rel.category}</span>}
                      <h3 className="related-card__title">{rel.title}</h3>
                      {rel.readingTime && <span className="related-card__time"><i className="fa-solid fa-stopwatch"></i> {rel.readingTime} دقيقة</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Back to Blog ── */}
      <div className="article-back-row container">
        <Link to="/blog" className="btn-back-blog">← العودة لجميع المقالات</Link>
      </div>
    </div>
  );
};

export default ArticleDetail;
