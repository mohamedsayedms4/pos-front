import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import Api, { API_BASE } from '../services/api';
import Loader from '../components/common/Loader';
import { useGlobalUI } from '../components/common/GlobalUI';

const PAGE_SIZE = 24;
const WS_URL = API_BASE.replace('/api/v1', '') + '/ws';

/* ─── Product Card for Customers ─── */
const CustomerProductCard = ({ product, onSelect }) => {
  const imageUrl = product.imageUrls && product.imageUrls.length > 0 && product.imageUrls[0].startsWith('http')
    ? product.imageUrls[0]
    : product.imageUrls && product.imageUrls.length > 0 
      ? `${API_BASE}/products/images/${product.imageUrls[0].split('/').pop()}`
      : null;

  return (
    <div className="customer-product-card" onClick={() => onSelect(product)}>
      <div className="product-image-container">
        {imageUrl ? (
          <img src={imageUrl} alt={product.name} />
        ) : (
          <div className="placeholder">📦</div>
        )}
      </div>
      <div className="product-details">
        <h3>{product.name}</h3>
        <div className="price">{Number(product.salePrice).toFixed(2)} <span>ج.م</span></div>
      </div>
      <button className="add-btn">+</button>
    </div>
  );
};

const CustomerOrder = () => {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const { toast } = useGlobalUI();
  const socketClientRef = useRef(null);
  const observerTarget = useRef(null);

  // 1. WebSocket Connection
  useEffect(() => {
    const token = localStorage.getItem('pos_access_token');
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        console.log('Connected to order sync socket');
      },
      onStompError: (frame) => console.error('Socket error:', frame)
    });

    client.activate();
    socketClientRef.current = client;
    return () => client.deactivate();
  }, []);

  // 2. Data Loading
  const loadProducts = useCallback(async (p, q, append = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await Api.getProductsPaged(p, PAGE_SIZE, q);
      setProducts(prev => append ? [...prev, ...res.items] : res.items);
      setTotalPages(res.totalPages);
      setPage(res.page);
    } catch (err) {
      toast('فشل تحميل المنتجات', 'error');
    } finally {
      setLoading(false);
    }
  }, [loading, toast]);

  useEffect(() => {
    loadProducts(0, search, false);
  }, [search]);

  // 3. Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loading && page < totalPages - 1) {
          loadProducts(page + 1, search, true);
        }
      },
      { threshold: 1.0 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [loading, page, totalPages, search, loadProducts]);

  // 4. Selection Event
  const handleSelect = (product) => {
    if (!socketClientRef.current || !socketClientRef.current.connected) {
      toast('فشل الاتصال اللحظي - جاري المحاولة', 'warning');
      return;
    }

    // Send selection to backend
    socketClientRef.current.publish({
      destination: '/app/customer-select',
      body: JSON.stringify(product)
    });

    toast(`تمت إضافة ${product.name}`, 'success');
  };

  return (
    <div className="customer-order-page">
      <header className="customer-header">
        <div className="brand">مهلهل جروب - شاشة الاختيار</div>
        <div className="search-bar">
          <input 
            type="text" 
            placeholder="ابحث عن منتج..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <div className="customer-grid">
        {products.map(p => (
          <CustomerProductCard key={p.id} product={p} onSelect={handleSelect} />
        ))}
        {/* Sentinel */}
        <div ref={observerTarget} style={{ height: '20px', width: '100%' }}></div>
        {loading && <div className="grid-loader">جاري التحميل...</div>}
      </div>

      <style>{`
        .customer-order-page {
          background: #0a0a0a;
          color: #fff;
          min-height: 100vh;
          direction: rtl;
          font-family: inherit;
        }
        .customer-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: #111;
          padding: 20px 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #222;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        }
        .customer-header .brand {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--metro-blue, #0078d4);
        }
        .customer-header .search-bar input {
          background: #1a1a1a;
          border: 1px solid #333;
          color: #fff;
          padding: 12px 25px;
          border-radius: 30px;
          width: 300px;
          font-size: 1rem;
          transition: all 0.3s;
        }
        .customer-header .search-bar input:focus {
          border-color: var(--metro-blue);
          width: 400px;
          outline: none;
        }
        .customer-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 25px;
          padding: 40px;
        }
        .customer-product-card {
          background: #151515;
          border: 1px solid #222;
          border-radius: 15px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        .customer-product-card:hover {
          transform: translateY(-10px) scale(1.02);
          border-color: var(--metro-blue);
          box-shadow: 0 15px 35px rgba(0,120,255,0.2);
        }
        .product-image-container {
          width: 100%;
          aspect-ratio: 1/1;
          background: #0d0d0d;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .product-image-container img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .product-image-container .placeholder {
          font-size: 4rem;
          color: #333;
        }
        .product-details {
          padding: 15px;
          text-align: center;
        }
        .product-details h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #eee;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .product-details .price {
          color: var(--metro-blue);
          font-size: 1.3rem;
          font-weight: 800;
          margin-top: 8px;
        }
        .product-details .price span {
          font-size: 0.8rem;
          color: #666;
        }
        .add-btn {
          position: absolute;
          bottom: 15px;
          left: 15px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--metro-blue);
          color: #fff;
          border: none;
          font-size: 1.5rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          opacity: 0;
          transform: scale(0.5);
          transition: all 0.3s;
        }
        .customer-product-card:hover .add-btn {
          opacity: 1;
          transform: scale(1);
        }
        .grid-loader {
          grid-column: 1 / -1;
          text-align: center;
          padding: 20px;
          color: #666;
        }
      `}</style>
    </div>
  );
};

export default CustomerOrder;
