import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import Api, { API_BASE } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';

const PAGE_SIZE = 24;
const WS_URL = API_BASE.replace('/api/v1', '') + '/ws';

/* ──────────────────────────────────────────────
   Product Card
────────────────────────────────────────────── */
const CustomerProductCard = ({ product, onSelect }) => {
  const imageUrl =
    product.imageUrls &&
    product.imageUrls.length > 0 &&
    product.imageUrls[0].startsWith('http')
      ? product.imageUrls[0]
      : product.imageUrls && product.imageUrls.length > 0
        ? `${API_BASE}/products/images/${product.imageUrls[0].split('/').pop()}`
        : null;

  return (
    <div className="customer-product-card" >
      <div className="card-glow" />

      <div className="product-image-container">
        {imageUrl ? (
          <img src={imageUrl} alt={product.name} loading="lazy" />
        ) : (
          <div className="placeholder-box">
            <div className="placeholder-icon">📦</div>
            <span>لا توجد صورة</span>
          </div>
        )}
      </div>

      <div className="product-details">
        <h3 title={product.name}>{product.name}</h3>

        <div className="product-meta">
          <span className="product-badge">متوفر</span>
        </div>

        <div className="price-row">
          <div className="price">
            {Number(product.salePrice || 0).toFixed(2)}
            <span>ج.م</span>
          </div>

          <button
            className="add-btn"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(product);
            }}
            aria-label={`إضافة ${product.name}`}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────
   Page
────────────────────────────────────────────── */
const CustomerOrder = () => {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [initialLoading, setInitialLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const { toast } = useGlobalUI();

  const socketClientRef = useRef(null);
  const observerTarget = useRef(null);
  const loadingRef = useRef(false);

  /* 1) WebSocket */
  useEffect(() => {
    const token = localStorage.getItem('pos_access_token');

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        console.log('Connected to order sync socket');
      },
      onStompError: (frame) => console.error('Socket error:', frame),
    });

    client.activate();
    socketClientRef.current = client;

    return () => client.deactivate();
  }, []);

  /* 2) Load Products */
  const loadProducts = useCallback(
    async (p, q, append = false) => {
      if (loadingRef.current) return;

      loadingRef.current = true;

      if (append) {
        setLoadingMore(true);
      } else {
        setInitialLoading(true);
      }

      try {
        const res = await Api.getProductsPaged(p, PAGE_SIZE, q);

        const items = Array.isArray(res?.items) ? res.items : [];
        const nextPage = typeof res?.page === 'number' ? res.page : p;
        const nextTotalPages = typeof res?.totalPages === 'number' ? res.totalPages : 1;

        setProducts((prev) => {
          if (!append) return items;

          const existingIds = new Set(prev.map((item) => item.id));
          const uniqueNewItems = items.filter((item) => !existingIds.has(item.id));
          return [...prev, ...uniqueNewItems];
        });

        setPage(nextPage);
        setTotalPages(nextTotalPages);
      } catch (err) {
        toast('فشل تحميل المنتجات', 'error');
      } finally {
        loadingRef.current = false;
        setInitialLoading(false);
        setLoadingMore(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    setProducts([]);
    setPage(0);
    setTotalPages(1);
    loadProducts(0, search, false);
  }, [search, loadProducts]);

  /* 3) Infinite Scroll */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];

        if (!first?.isIntersecting) return;
        if (loadingRef.current) return;
        if (page >= totalPages - 1) return;

        loadProducts(page + 1, search, true);
      },
      {
        root: null,
        rootMargin: '250px 0px',
        threshold: 0,
      }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);

    return () => observer.disconnect();
  }, [page, totalPages, search, loadProducts]);

  /* 4) Select Product */
  const handleSelect = (product) => {
    if (!socketClientRef.current || !socketClientRef.current.connected) {
      toast('فشل الاتصال اللحظي - جاري المحاولة', 'warning');
      return;
    }

    socketClientRef.current.publish({
      destination: '/app/customer-select',
      body: JSON.stringify(product),
    });

    toast(`تمت إضافة ${product.name}`, 'success');
  };

  return (
    <div className="customer-order-page">
      <div className="background-orb orb-1" />
      <div className="background-orb orb-2" />

      <header className="customer-header">
        <div className="header-content">
          <div className="brand-block">
            <div className="brand-badge">POS</div>
            <div className="brand-text">
              <h1>مهلهل جروب</h1>
              <p>شاشة اختيار المنتجات</p>
            </div>
          </div>

          <div className="search-section">
            <div className="search-box">
              <span className="search-icon">⌕</span>
              <input
                type="text"
                placeholder="ابحث عن منتج..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </header>

      <section className="page-topbar">
        <div className="topbar-left">
          <h2>المنتجات</h2>
          <p>اختر المنتج المطلوب لإضافته مباشرة</p>
        </div>

        <div className="topbar-stats">
          <div className="mini-stat">
            <span className="mini-stat-label">عدد المنتجات</span>
            <strong>{products.length}</strong>
          </div>
        </div>
      </section>

      <main className="content-area">
        {initialLoading && products.length === 0 ? (
          <div className="grid-loader">
            <div className="loader-dot" />
            <span>جاري تحميل المنتجات...</span>
          </div>
        ) : products.length === 0 && !initialLoading && !loadingMore ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>لا توجد منتجات</h3>
            <p>جرّب البحث باسم منتج آخر أو أعد تحميل البيانات</p>
          </div>
        ) : (
          <div className="customer-grid">
            {products.map((product) => (
              <CustomerProductCard
                key={product.id}
                product={product}
                onSelect={handleSelect}
              />
            ))}

            <div ref={observerTarget} className="observer-sentinel" />

            {loadingMore && (
              <div className="grid-loader">
                <div className="loader-dot" />
                <span>جاري تحميل المزيد...</span>
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        :root {
          --bg-main: #06090f;
          --bg-surface: rgba(12, 16, 24, 0.92);
          --bg-card: rgba(11, 15, 22, 0.96);
          --bg-card-2: rgba(17, 24, 34, 0.96);
          --border-soft: rgba(255, 255, 255, 0.07);
          --border-strong: rgba(0, 180, 255, 0.2);
          --text-main: #f7fafc;
          --text-muted: #94a3b8;
          --text-soft: #64748b;
          --brand: #00a6ff;
          --brand-2: #26d0ff;
          --success: #22c55e;
          --shadow-blue: 0 10px 40px rgba(0, 166, 255, 0.16);
        }

        * {
          box-sizing: border-box;
        }

        .customer-order-page {
          position: relative;
          min-height: 100vh;
          direction: rtl;
          color: var(--text-main);
          font-family: inherit;
          background:
            radial-gradient(circle at top right, rgba(0, 166, 255, 0.08), transparent 24%),
            radial-gradient(circle at left bottom, rgba(38, 208, 255, 0.05), transparent 18%),
            linear-gradient(180deg, #05070c 0%, #070b12 100%);
          overflow-x: hidden;
        }

        .background-orb {
          position: fixed;
          border-radius: 999px;
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
        }

        .orb-1 {
          top: -80px;
          right: -60px;
          width: 240px;
          height: 240px;
          background: rgba(0, 166, 255, 0.14);
        }

        .orb-2 {
          bottom: 60px;
          left: -80px;
          width: 260px;
          height: 260px;
          background: rgba(38, 208, 255, 0.08);
        }

        .customer-header {
          position: sticky;
          top: 0;
          z-index: 50;
          backdrop-filter: blur(18px);
          background: rgba(7, 10, 16, 0.82);
          border-bottom: 1px solid var(--border-soft);
        }

        .header-content {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 18px 28px;
        }

        .brand-block {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .brand-badge {
          width: 52px;
          height: 52px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--brand), var(--brand-2));
          color: #fff;
          font-weight: 900;
          font-size: 0.95rem;
          box-shadow: var(--shadow-blue);
          flex-shrink: 0;
        }

        .brand-text h1 {
          margin: 0;
          font-size: 1.55rem;
          font-weight: 900;
          color: #f8fbff;
          line-height: 1.1;
        }

        .brand-text p {
          margin: 6px 0 0;
          color: var(--brand-2);
          font-size: 0.95rem;
          font-weight: 700;
        }

        .search-section {
          width: min(100%, 430px);
          flex-shrink: 0;
        }

        .search-box {
          position: relative;
          width: 100%;
        }

        .search-box .search-icon {
          position: absolute;
          top: 50%;
          right: 16px;
          transform: translateY(-50%);
          color: var(--text-soft);
          font-size: 1rem;
          pointer-events: none;
        }

        .search-box input {
          width: 100%;
          height: 50px;
          border-radius: 18px;
          border: 1px solid rgba(0, 166, 255, 0.28);
          background: rgba(9, 14, 22, 0.95);
          color: #fff;
          padding: 0 48px 0 18px;
          font-size: 0.98rem;
          outline: none;
          transition: all 0.25s ease;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
        }

        .search-box input::placeholder {
          color: #6b7280;
        }

        .search-box input:focus {
          border-color: var(--brand);
          box-shadow:
            0 0 0 3px rgba(0, 166, 255, 0.12),
            0 12px 32px rgba(0, 166, 255, 0.12);
          background: rgba(11, 17, 26, 0.98);
        }

        .page-topbar {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          padding: 24px 28px 10px;
        }

        .topbar-left h2 {
          margin: 0;
          font-size: 1.45rem;
          font-weight: 900;
          color: #fff;
        }

        .topbar-left p {
          margin: 8px 0 0;
          color: var(--text-muted);
          font-size: 0.95rem;
        }

        .topbar-stats {
          display: flex;
          gap: 12px;
        }

        .mini-stat {
          min-width: 130px;
          padding: 12px 16px;
          border-radius: 18px;
          background: rgba(12, 18, 28, 0.9);
          border: 1px solid var(--border-soft);
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        .mini-stat-label {
          display: block;
          font-size: 0.82rem;
          color: var(--text-muted);
          margin-bottom: 6px;
        }

        .mini-stat strong {
          font-size: 1.2rem;
          color: #fff;
        }

        .content-area {
          position: relative;
          z-index: 1;
          padding: 10px 28px 32px;
        }

        .customer-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
          gap: 18px;
        }

        .customer-product-card {
          position: relative;
          overflow: hidden;
          border-radius: 22px;
          border: 1px solid var(--border-soft);
          background:
            linear-gradient(180deg, rgba(11, 15, 22, 0.98) 0%, rgba(8, 12, 18, 0.98) 100%);
          cursor: pointer;
          transition: transform 0.28s ease, border-color 0.28s ease, box-shadow 0.28s ease;
          box-shadow: 0 8px 25px rgba(0,0,0,0.22);
        }

        .customer-product-card:hover {
          transform: translateY(-6px);
          border-color: rgba(0, 166, 255, 0.35);
          box-shadow:
            0 16px 35px rgba(0,0,0,0.3),
            0 10px 30px rgba(0, 166, 255, 0.12);
        }

        .card-glow {
          position: absolute;
          inset: auto auto -70px -70px;
          width: 150px;
          height: 150px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(0,166,255,0.12), transparent 65%);
          pointer-events: none;
        }

        .product-image-container {
          width: 100%;
          aspect-ratio: 1 / 1;
          background:
            linear-gradient(180deg, rgba(8, 11, 17, 1) 0%, rgba(10, 13, 20, 1) 100%);
          border-bottom: 1px solid rgba(255,255,255,0.04);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .product-image-container img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.35s ease;
        }

        .customer-product-card:hover .product-image-container img {
          transform: scale(1.04);
        }

        .placeholder-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: #4b5563;
        }

        .placeholder-icon {
          font-size: 3.5rem;
          line-height: 1;
        }

        .placeholder-box span {
          font-size: 0.85rem;
          color: #6b7280;
        }

        .product-details {
          padding: 14px 14px 16px;
        }

        .product-details h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 800;
          color: #f8fafc;
          line-height: 1.55;
          min-height: 48px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .product-meta {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          margin-top: 10px;
          min-height: 24px;
        }

        .product-badge {
          display: inline-flex;
          align-items: center;
          height: 24px;
          padding: 0 10px;
          border-radius: 999px;
          font-size: 0.74rem;
          font-weight: 700;
          color: #86efac;
          background: rgba(34, 197, 94, 0.12);
          border: 1px solid rgba(34, 197, 94, 0.16);
        }

        .price-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 14px;
        }

        .price {
          display: flex;
          align-items: baseline;
          gap: 6px;
          font-size: 1.35rem;
          font-weight: 900;
          color: var(--brand);
          letter-spacing: -0.02em;
        }

        .price span {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-weight: 700;
        }

        .add-btn {
          width: 44px;
          height: 44px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--brand), var(--brand-2));
          color: #fff;
          font-size: 1.6rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.22s ease, box-shadow 0.22s ease, opacity 0.22s ease;
          box-shadow: 0 10px 22px rgba(0, 166, 255, 0.25);
          opacity: 0.95;
          flex-shrink: 0;
        }

        .add-btn:hover {
          transform: scale(1.06);
          box-shadow: 0 14px 30px rgba(0, 166, 255, 0.32);
        }

        .empty-state {
          min-height: 60vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          border-radius: 24px;
          border: 1px solid var(--border-soft);
          background: rgba(10, 15, 23, 0.75);
          padding: 40px 20px;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 14px;
        }

        .empty-state h3 {
          margin: 0;
          font-size: 1.4rem;
          font-weight: 900;
          color: #fff;
        }

        .empty-state p {
          margin: 10px 0 0;
          color: var(--text-muted);
          max-width: 420px;
          line-height: 1.8;
        }

        .observer-sentinel {
          width: 100%;
          height: 20px;
        }

        .grid-loader {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 18px;
          color: var(--text-muted);
          font-size: 0.95rem;
          border-radius: 16px;
          border: 1px dashed var(--border-soft);
          background: rgba(11, 15, 22, 0.6);
        }

        .loader-dot {
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: var(--brand);
          box-shadow: 0 0 0 0 rgba(0, 166, 255, 0.55);
          animation: pulse-dot 1.2s infinite;
        }

        @keyframes pulse-dot {
          0% {
            transform: scale(0.9);
            box-shadow: 0 0 0 0 rgba(0, 166, 255, 0.55);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 12px rgba(0, 166, 255, 0);
          }
          100% {
            transform: scale(0.9);
            box-shadow: 0 0 0 0 rgba(0, 166, 255, 0);
          }
        }

        @media (max-width: 1100px) {
          .header-content {
            flex-direction: column;
            align-items: stretch;
          }

          .search-section {
            width: 100%;
          }

          .page-topbar {
            flex-direction: column;
            align-items: stretch;
          }

          .topbar-stats {
            justify-content: flex-start;
          }
        }

        @media (max-width: 768px) {
          .header-content,
          .page-topbar,
          .content-area {
            padding-left: 16px;
            padding-right: 16px;
          }

          .customer-grid {
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 14px;
          }

          .brand-text h1 {
            font-size: 1.2rem;
          }

          .brand-text p {
            font-size: 0.85rem;
          }

          .product-details h3 {
            font-size: 0.92rem;
            min-height: 44px;
          }

          .price {
            font-size: 1.15rem;
          }

          .add-btn {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            font-size: 1.4rem;
          }
        }

        @media (max-width: 480px) {
          .customer-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .mini-stat {
            width: 100%;
          }

          .topbar-stats {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default CustomerOrder;