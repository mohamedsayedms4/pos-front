import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Api from '../services/api';
import '../styles/pages/Articles.css';
import PublicNavbar from '../components/layout/PublicNavbar';

// ─── SEO Hook ────────────────────────────────────────────────────────────────
const useSEO = ({ title, description, keywords, canonical }) => {
  useEffect(() => {
    document.title = title;
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', description);
    if (keywords) setMeta('keywords', keywords);
    setMeta('robots', 'index, follow');
    setMeta('og:title', title, true);
    setMeta('og:description', description, true);
    setMeta('og:type', 'website', true);
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
    link.href = canonical || window.location.href;
    return () => { document.title = 'سجل ERP'; };
  }, [title, description, keywords, canonical]);
};

// ─── JSON-LD Schema for Article List ─────────────────────────────────────────
const ArticleListSchema = ({ articles, url }) => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'مقالات سجل ERP',
    url,
    itemListElement: articles.map((a, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${window.location.origin}/blog/${a.slug}`,
      name: a.title
    }))
  };
  return <script type="application/ld+json">{JSON.stringify(schema)}</script>;
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const ArticleIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
  </svg>
);

// ─── Article Card ──────────────────────────────────────────────────────────────
const ArticleCard = ({ article, featured = false }) => {
  const coverSrc = article.coverImageUrl ? Api.getImageUrl(article.coverImageUrl) : null;
  const pubDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <Link to={`/blog/${article.slug}`} className={`article-card ${featured ? 'article-card--featured' : ''}`}>
      <div className="article-card__cover">
        {coverSrc
          ? <img src={coverSrc} alt={article.title} loading="lazy" />
          : <div className="article-card__cover-placeholder"><ArticleIcon /></div>
        }
        {article.featured && <span className="article-badge article-badge--featured">مميز ⭐</span>}
        {article.category && <span className="article-badge article-badge--cat">{article.category}</span>}
      </div>

      <div className="article-card__body">
        <h2 className="article-card__title">{article.title}</h2>
        {article.excerpt && <p className="article-card__excerpt">{article.excerpt}</p>}

        <div className="article-card__meta">
          {article.authorName && (
            <div className="article-meta-author">
              {article.authorAvatarUrl
                ? <img src={Api.getImageUrl(article.authorAvatarUrl)} alt={article.authorName} className="meta-avatar" />
                : <div className="meta-avatar-placeholder">{article.authorName.charAt(0)}</div>
              }
              <span>{article.authorName}</span>
            </div>
          )}
          <div className="article-meta-stats">
            {article.readingTime && (
              <span className="meta-stat"><ClockIcon />{article.readingTime} دقيقة</span>
            )}
            <span className="meta-stat"><EyeIcon />{(article.viewCount || 0).toLocaleString('ar-EG')}</span>
          </div>
        </div>

        {pubDate && <div className="article-card__date">{pubDate}</div>}
      </div>
    </Link>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Articles = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const searchRef = useRef(null);

  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '0', 10);

  useSEO({
    title: `المدونة والمقالات | سجل ERP — نظام إدارة الأعمال`,
    description: 'اقرأ أحدث المقالات والأدلة حول إدارة الأعمال، المحاسبة، المبيعات، والمخازن من خبراء سجل ERP.',
    keywords: 'مقالات erp, إدارة أعمال, محاسبة, مبيعات, مخازن, نقطة بيع',
    canonical: `${window.location.origin}/blog`
  });

  const fetchCategories = useCallback(async () => {
    try {
      const cats = await Api.getPublicArticleCategories();
      setCategories(Array.isArray(cats) ? cats : []);
    } catch { setCategories([]); }
  }, []);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await Api.getPublicArticles(page, 9, search, category);
      setArticles(data?.articles || []);
      setTotalPages(data?.totalPages || 0);
      setTotalElements(data?.totalElements || 0);
      setCurrentPage(data?.currentPage || 0);
    } catch (e) {
      setError(e.message || 'فشل في تحميل المقالات');
    } finally {
      setLoading(false);
    }
  }, [page, search, category]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchArticles(); }, [fetchArticles]);
  useEffect(() => { setSearchInput(search); }, [search]);

  // Scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => e.isIntersecting && e.target.classList.add('is-visible')),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  });

  const handleSearch = (e) => {
    e.preventDefault();
    const params = {};
    if (searchInput.trim()) params.search = searchInput.trim();
    if (category) params.category = category;
    setSearchParams(params);
  };

  const handleCategoryClick = (cat) => {
    const params = {};
    if (cat) params.category = cat;
    if (search) params.search = search;
    setSearchParams(params);
  };

  const handlePageChange = (p) => {
    const params = {};
    if (search) params.search = search;
    if (category) params.category = category;
    if (p > 0) params.page = String(p);
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="articles-page" dir="rtl" style={{ paddingTop: '85px' }}>
      <PublicNavbar />
      {articles.length > 0 && (
        <ArticleListSchema articles={articles} url={`${window.location.origin}/blog`} />
      )}

      {/* ── Hero ── */}
      <section className="articles-hero">
        <div className="articles-hero__bg-blobs">
          <div className="hero-blob hero-blob--1" />
          <div className="hero-blob hero-blob--2" />
          <div className="hero-blob hero-blob--3" />
        </div>
        <div className="articles-hero__content">
          <p className="articles-hero__eyebrow">المدونة والمقالات</p>
          <h1 className="articles-hero__title">
            أحدث المقالات و<span className="articles-hero__highlight">أدلة الأعمال</span>
          </h1>
          <p className="articles-hero__sub">
            رؤى وخبرات من متخصصين في إدارة الأعمال، المحاسبة، ونقاط البيع
          </p>

          {/* Search Bar */}
          <form className="articles-search" onSubmit={handleSearch}>
            <div className="articles-search__inner">
              <span className="articles-search__icon"><SearchIcon /></span>
              <input
                ref={searchRef}
                type="text"
                className="articles-search__input"
                placeholder="ابحث في المقالات..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                id="articles-search-input"
                aria-label="بحث في المقالات"
              />
              {searchInput && (
                <button type="button" className="articles-search__clear" onClick={() => { setSearchInput(''); setSearchParams(category ? { category } : {}); }}>✕</button>
              )}
              <button type="submit" className="articles-search__btn">بحث</button>
            </div>
          </form>

          {/* Stats */}
          <div className="articles-hero__stats">
            <div className="hero-stat">
              <span className="hero-stat__num">{totalElements.toLocaleString('ar-EG')}</span>
              <span className="hero-stat__label">مقال</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat__num">{categories.length}</span>
              <span className="hero-stat__label">تصنيف</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Content Area ── */}
      <div className="articles-layout container">

        {/* Sidebar */}
        <aside className="articles-sidebar">
          <div className="sidebar-card">
            <h3 className="sidebar-card__title">📂 التصنيفات</h3>
            <ul className="sidebar-cats">
              <li>
                <button
                  className={`sidebar-cat-btn ${!category ? 'sidebar-cat-btn--active' : ''}`}
                  onClick={() => handleCategoryClick('')}
                >
                  <span>جميع المقالات</span>
                  <span className="cat-count">{totalElements}</span>
                </button>
              </li>
              {categories.map(cat => (
                <li key={cat}>
                  <button
                    className={`sidebar-cat-btn ${category === cat ? 'sidebar-cat-btn--active' : ''}`}
                    onClick={() => handleCategoryClick(cat)}
                  >
                    <span>{cat}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Articles Grid */}
        <main className="articles-main">
          {/* Active Filters */}
          {(search || category) && (
            <div className="articles-filters-bar">
              {search && (
                <span className="filter-chip">
                  🔍 نتائج: <strong>{search}</strong>
                  <button onClick={() => { setSearchInput(''); setSearchParams(category ? { category } : {}); }}>✕</button>
                </span>
              )}
              {category && (
                <span className="filter-chip">
                  📂 <strong>{category}</strong>
                  <button onClick={() => handleCategoryClick('')}>✕</button>
                </span>
              )}
              <span className="filter-results-count">{totalElements} نتيجة</span>
            </div>
          )}

          {loading ? (
            <div className="articles-skeleton-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="article-skeleton">
                  <div className="skeleton-cover" />
                  <div className="skeleton-body">
                    <div className="skeleton-line skeleton-line--wide" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line skeleton-line--short" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="articles-empty">
              <div className="articles-empty__icon">⚠️</div>
              <h3>{error}</h3>
              <button className="btn-retry" onClick={fetchArticles}>إعادة المحاولة</button>
            </div>
          ) : articles.length === 0 ? (
            <div className="articles-empty">
              <div className="articles-empty__icon"><ArticleIcon /></div>
              <h3>لا توجد مقالات {search ? 'لهذا البحث' : category ? 'في هذا التصنيف' : 'بعد'}</h3>
              <p>كن أول من يقرأ مقالاتنا القادمة!</p>
              {(search || category) && (
                <button className="btn-retry" onClick={() => setSearchParams({})}>عرض كل المقالات</button>
              )}
            </div>
          ) : (
            <div className="articles-grid animate-on-scroll fade-up">
              {articles.map((article, i) => (
                <ArticleCard key={article.id} article={article} featured={i === 0 && !search && !category && page === 0} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="articles-pagination" aria-label="صفحات المقالات">
              <button
                className="pagination-btn"
                disabled={currentPage === 0}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                ‹ السابق
              </button>
              <div className="pagination-pages">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    className={`pagination-page ${i === currentPage ? 'pagination-page--active' : ''}`}
                    onClick={() => handlePageChange(i)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                className="pagination-btn"
                disabled={currentPage >= totalPages - 1}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                التالي ›
              </button>
            </nav>
          )}
        </main>
      </div>

      {/* Footer CTA */}
      <section className="articles-cta">
        <div className="container articles-cta__inner">
          <h2>استعد لتطوير أعمالك مع سجل</h2>
          <p>نظام ERP سحابي متكامل لإدارة كل جوانب عملك</p>
          <Link to="/register" className="btn-articles-cta">ابدأ مجاناً الآن</Link>
        </div>
      </section>
    </div>
  );
};

export default Articles;
