import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import Api, { API_BASE } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';

const PAGE_SIZE = 24;
const WS_URL = API_BASE.replace('/api/v1', '') + '/ws';

const OrderCustomer = () => {
    const [products, setProducts] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [connected, setConnected] = useState(false);
    const [selections, setSelections] = useState([]); // سجل الاختيارات
    const { toast } = useGlobalUI();
    const socketClientRef = useRef(null);
    const observerTarget = useRef(null);

    // WebSocket
    useEffect(() => {
        const token = localStorage.getItem('pos_access_token');
        const client = new Client({
            webSocketFactory: () => new SockJS(WS_URL),
            connectHeaders: { Authorization: `Bearer ${token}` },
            reconnectDelay: 5000,
            onConnect: () => { 
                console.log('STOMP CONNECTED'); 
                setConnected(true); 
                // Listen for completion from POS
                client.subscribe('/user/queue/order-status', (msg) => {
                    const statusData = JSON.parse(msg.body);
                    if (statusData.status === 'COMPLETED') {
                        setSelections([]);
                        toast('تم إتمام طلبك بنجاح. شكراً لك! ✓', 'success');
                    }
                });
            },
            onStompError: () => setConnected(false),
            onDisconnect: () => setConnected(false),
        });
        client.activate();
        socketClientRef.current = client;
        return () => client.deactivate();
    }, []);

    // Load Data
    const loadProducts = useCallback(async (p, q, append = false) => {
        if (loading) return;
        setLoading(true);
        try {
            const res = await Api.getProductsPaged(p, PAGE_SIZE, q);
            setProducts(prev => append ? [...prev, ...res.items] : res.items);
            setTotalPages(res.totalPages);
            setPage(res.page);
        } catch { toast('خطأ في تحميل المنتجات', 'error'); }
        finally { setLoading(false); }
    }, [loading, toast]);

    useEffect(() => { loadProducts(0, search, false); }, [search]);

    // Infinite Scroll
    useEffect(() => {
        const obs = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && !loading && page < totalPages - 1)
                    loadProducts(page + 1, search, true);
            },
            { threshold: 0.1 }
        );
        if (observerTarget.current) obs.observe(observerTarget.current);
        return () => obs.disconnect();
    }, [loading, page, totalPages, search, loadProducts]);

    // Real-time: كل ضغطة ترسل فوراً
    const handleSelect = (product) => {
        if (!socketClientRef.current?.connected) {
            toast('غير متصل بالسرفر...', 'warning');
            return;
        }
        socketClientRef.current.publish({
            destination: '/app/customer-select',
            body: JSON.stringify(product)
        });
        // أضف للسجل المحلي
        setSelections(prev => [
            { ...product, _ts: Date.now(), _id: Math.random() },
            ...prev
        ]);
        toast(`تم إرسال ${product.name}`, 'success');
    };

    const removeSelection = (selId) => {
        setSelections(prev => prev.filter(s => s._id !== selId));
    };

    const selTotal = selections.reduce((s, i) => s + Number(i.salePrice || 0), 0);

    const getImg = (p) => {
        if (!p.imageUrls?.[0]) return null;
        return p.imageUrls[0].startsWith('http') ? p.imageUrls[0]
            : `${API_BASE}/products/images/${p.imageUrls[0].split('/').pop()}`;
    };

    return (
        <div className="oc-root">
            {/* ──────── HEADER ──────── */}
            <header className="oc-header">
                <div className="oc-brand">
                    <span className="oc-brand-icon">🛍️</span>
                    <span>اختر منتجاتك</span>
                </div>
                <div className="oc-search-wrap">
                    <svg className="oc-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input className="oc-search" type="text" placeholder="بحث عن منتج..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className={`oc-status ${connected ? 'on' : 'off'}`}>
                    <div className="oc-status-dot" />
                    {connected ? 'متصل' : 'غير متصل'}
                </div>
            </header>

            <div className="oc-layout">
                {/* ──────── PRODUCT GRID ──────── */}
                <main className="oc-main">
                    <div className="oc-grid">
                        {products.map(p => {
                            const img = getImg(p);
                            return (
                                <div key={p.id} className="oc-card" onClick={() => handleSelect(p)}>
                                    <div className="oc-card-img">
                                        {img ? <img src={img} alt={p.name} /> : <div className="oc-card-ph">📦</div>}
                                    </div>
                                    <div className="oc-card-body">
                                        <div className="oc-card-name">{p.name}</div>
                                        <div className="oc-card-price">{Number(p.salePrice).toFixed(2)} <small>ج.م</small></div>
                                    </div>
                                    <div className="oc-card-overlay"><span>+ إضافة</span></div>
                                </div>
                            );
                        })}
                        <div ref={observerTarget} style={{ height: 40, width: '100%', gridColumn: '1/-1' }} />
                        {loading && <div className="oc-loader"><div className="spinner" /> جاري التحميل...</div>}
                    </div>
                </main>

                {/* ──────── SELECTIONS PANEL ──────── */}
                <aside className="oc-panel">
                    <div className="oc-panel-head">
                        <h2>🧾 اختياراتك</h2>
                        <span className="oc-panel-count">{selections.length}</span>
                    </div>

                    {selections.length === 0 ? (
                        <div className="oc-panel-empty">
                            <div className="oc-panel-empty-icon">👆</div>
                            <p>اضغط على أي منتج لإضافته</p>
                        </div>
                    ) : (
                        <div className="oc-panel-list">
                            {selections.map(item => (
                                <div key={item._id} className="oc-sel-item">
                                    <div className="oc-sel-img">
                                        {getImg(item) ? <img src={getImg(item)} alt="" /> : <span>📦</span>}
                                    </div>
                                    <div className="oc-sel-info">
                                        <div className="oc-sel-name">{item.name}</div>
                                        <div className="oc-sel-price">{Number(item.salePrice).toFixed(2)} ج.م</div>
                                    </div>
                                    <button className="oc-sel-del" onClick={() => removeSelection(item._id)}>✕</button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="oc-panel-footer">
                        <div className="oc-panel-total">
                            <span>الإجمالي</span>
                            <span className="oc-panel-total-val">{selTotal.toFixed(2)} <small>ج.م</small></span>
                        </div>
                    </div>
                </aside>
            </div>

            <style>{`
                .oc-root {
                    background: #060611; color: #eaeaea; min-height: 100vh;
                    direction: rtl; font-family: 'Segoe UI', 'Cairo', sans-serif;
                    display: flex; flex-direction: column;
                }

                /* ─── HEADER ─── */
                .oc-header {
                    position: sticky; top: 0; z-index: 200;
                    display: flex; align-items: center; gap: 15px;
                    padding: 14px 30px;
                    background: rgba(6,6,17,0.88); backdrop-filter: blur(20px);
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                }
                .oc-brand { display: flex; align-items: center; gap: 10px; font-size: 1.3rem; font-weight: 800; }
                .oc-brand-icon { font-size: 1.5rem; }
                .oc-brand span:last-child {
                    background: linear-gradient(135deg, #6366f1, #a78bfa);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                }
                .oc-search-wrap { flex: 1; max-width: 450px; position: relative; margin: 0 auto; }
                .oc-search-icon { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); width: 16px; color: #555; }
                .oc-search {
                    width: 100%; padding: 10px 44px 10px 16px;
                    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 12px; color: #fff; font-size: 0.95rem; transition: all 0.3s;
                }
                .oc-search:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 15px rgba(99,102,241,0.12); }
                .oc-search::placeholder { color: #444; }

                .oc-status {
                    display: flex; align-items: center; gap: 6px;
                    padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 600;
                }
                .oc-status.on { background: rgba(16,185,129,0.1); color: #10b981; border: 1px solid rgba(16,185,129,0.2); }
                .oc-status.off { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
                .oc-status-dot { width: 7px; height: 7px; border-radius: 50%; }
                .oc-status.on .oc-status-dot { background: #10b981; box-shadow: 0 0 6px #10b981; }
                .oc-status.off .oc-status-dot { background: #ef4444; }

                /* ─── LAYOUT ─── */
                .oc-layout { display: grid; grid-template-columns: 1fr 340px; flex: 1; overflow: hidden; }

                /* ─── GRID ─── */
                .oc-main { padding: 25px; overflow-y: auto; height: calc(100vh - 60px); }
                .oc-grid {
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 18px;
                }
                .oc-card {
                    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 16px; overflow: hidden; cursor: pointer;
                    transition: all 0.3s ease; position: relative;
                }
                .oc-card:hover {
                    transform: translateY(-6px); border-color: rgba(99,102,241,0.4);
                    box-shadow: 0 16px 40px rgba(99,102,241,0.1);
                }
                .oc-card:active { transform: scale(0.97); }
                .oc-card-img {
                    width: 100%; aspect-ratio: 1; background: #0a0a18;
                    display: flex; align-items: center; justify-content: center; overflow: hidden;
                }
                .oc-card-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
                .oc-card:hover .oc-card-img img { transform: scale(1.06); }
                .oc-card-ph { font-size: 3rem; color: #1a1a2e; }
                .oc-card-body { padding: 12px 14px; }
                .oc-card-name { font-size: 0.9rem; font-weight: 600; color: #bbb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .oc-card-price {
                    margin-top: 4px; font-size: 1.15rem; font-weight: 800;
                    background: linear-gradient(135deg, #6366f1, #a78bfa);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                }
                .oc-card-price small { font-size: 0.7rem; }
                .oc-card-overlay {
                    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
                    background: rgba(99,102,241,0.7); backdrop-filter: blur(3px);
                    opacity: 0; transition: opacity 0.25s; font-weight: 700; color: #fff; font-size: 1rem;
                }
                .oc-card:hover .oc-card-overlay { opacity: 1; }

                .oc-loader { grid-column: 1/-1; text-align: center; padding: 25px; color: #444; display: flex; align-items: center; justify-content: center; gap: 8px; }
                .spinner { width: 18px; height: 18px; border: 2px solid #333; border-top-color: #6366f1; border-radius: 50%; animation: spin 0.7s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }

                /* ─── SELECTIONS PANEL ─── */
                .oc-panel {
                    background: #0b0b1a; border-right: 1px solid rgba(255,255,255,0.06);
                    display: flex; flex-direction: column; height: calc(100vh - 60px);
                }
                .oc-panel-head {
                    padding: 20px 24px; display: flex; align-items: center; justify-content: space-between;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                }
                .oc-panel-head h2 { margin: 0; font-size: 1.2rem; font-weight: 700; }
                .oc-panel-count {
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: #fff; width: 28px; height: 28px; border-radius: 9px;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 0.8rem; font-weight: 800;
                }

                .oc-panel-empty {
                    flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #333;
                }
                .oc-panel-empty-icon { font-size: 3.5rem; margin-bottom: 12px; }
                .oc-panel-empty p { margin: 0; color: #444; font-size: 0.95rem; }

                .oc-panel-list { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }

                .oc-sel-item {
                    display: flex; align-items: center; gap: 12px;
                    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
                    padding: 10px 14px; border-radius: 12px;
                    animation: fadeSlide 0.3s ease;
                }
                @keyframes fadeSlide { from { opacity: 0; transform: translateX(15px); } to { opacity: 1; transform: translateX(0); } }

                .oc-sel-img {
                    width: 42px; height: 42px; border-radius: 8px; background: #0a0a15;
                    overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
                }
                .oc-sel-img img { width: 100%; height: 100%; object-fit: cover; }
                .oc-sel-info { flex: 1; min-width: 0; }
                .oc-sel-name { font-size: 0.85rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .oc-sel-price { font-size: 0.75rem; color: #8b5cf6; margin-top: 1px; }
                .oc-sel-del {
                    background: none; border: none; color: #333; cursor: pointer;
                    font-size: 0.9rem; padding: 4px; transition: color 0.2s;
                }
                .oc-sel-del:hover { color: #ef4444; }

                .oc-panel-footer {
                    padding: 18px 24px; border-top: 1px solid rgba(255,255,255,0.06);
                    background: rgba(255,255,255,0.02);
                }
                .oc-panel-total { display: flex; justify-content: space-between; align-items: center; }
                .oc-panel-total span:first-child { color: #666; font-size: 0.9rem; }
                .oc-panel-total-val { font-size: 1.4rem; font-weight: 800; color: #fff; }
                .oc-panel-total-val small { color: #8b5cf6; }

                /* ─── RESPONSIVE ─── */
                @media (max-width: 900px) {
                    .oc-layout { grid-template-columns: 1fr; }
                    .oc-panel { position: fixed; bottom: 0; left: 0; right: 0; height: auto; max-height: 45vh;
                        border-top: 1px solid rgba(255,255,255,0.1); border-right: none;
                        z-index: 300; border-radius: 20px 20px 0 0;
                    }
                    .oc-main { height: calc(100vh - 60px - 80px); }
                }
                @media (max-width: 600px) {
                    .oc-header { padding: 10px 14px; }
                    .oc-brand span:last-child { display: none; }
                    .oc-main { padding: 14px; }
                    .oc-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
                }
            `}</style>
        </div>
    );
};

export default OrderCustomer;
