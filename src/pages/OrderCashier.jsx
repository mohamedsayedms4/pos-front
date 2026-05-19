import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import Api, { API_BASE } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';

const WS_URL = API_BASE.replace('/api/v1', '') + '/ws';

const OrderCashier = () => {
    const [cart, setCart] = useState([]);
    const [connected, setConnected] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [discount, setDiscount] = useState(0);
    const [paidAmount, setPaidAmount] = useState(0);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const { toast } = useGlobalUI();
    const soundRef = useRef(null);

    useEffect(() => {
        Api.getCustomers(0, 100).then(data => {
            setCustomers(data.items || data.content || []);
        }).catch(() => {});
        soundRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==');
    }, []);

    // WebSocket
    useEffect(() => {
        const token = localStorage.getItem('pos_access_token');
        const client = new Client({
            webSocketFactory: () => new SockJS(WS_URL),
            connectHeaders: { Authorization: `Bearer ${token}` },
            reconnectDelay: 5000,
            onConnect: () => {
                setConnected(true);
                client.subscribe('/user/queue/pos-updates', (msg) => {
                    const product = JSON.parse(msg.body);
                    setCart(prev => {
                        const existing = prev.find(i => i.id === product.id);
                        if (existing) {
                            return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
                        }
                        return [...prev, {
                            id: product.id, name: product.name,
                            price: Number(product.salePrice), qty: 1,
                            stock: product.stock || 999, unitName: product.unitName || ''
                        }];
                    });
                    if (soundRef.current) { soundRef.current.currentTime = 0; soundRef.current.play().catch(() => {}); }
                });
            },
            onDisconnect: () => setConnected(false),
        });
        client.activate();
        return () => client.deactivate();
    }, []);

    const updateQty = (id, newQty) => {
        if (newQty <= 0) { removeFromCart(id); return; }
        setCart(prev => prev.map(i => i.id === id ? { ...i, qty: newQty } : i));
    };
    const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));

    const subtotal = cart.reduce((s, i) => s + (i.price * i.qty), 0);
    const total = subtotal - discount;
    const change = paidAmount - total;

    useEffect(() => {
        if (cart.length > 0) setPaidAmount(total);
        else setPaidAmount(0);
    }, [total]);

    const handleCheckout = async () => {
        if (cart.length === 0) { toast('السلة فارغة', 'warning'); return; }
        setCheckoutLoading(true);
        try {
            await Api.createSale({
                customerId: selectedCustomerId || null, discount, paidAmount,
                items: cart.map(item => ({ productId: item.id, quantity: item.qty, unitPrice: item.price }))
            });
            toast('تمت عملية البيع بنجاح ✓', 'success');
            setCart([]); setDiscount(0); setPaidAmount(0); setSelectedCustomerId('');
        } catch (err) { toast(err.message || 'فشل في إتمام العملية', 'error'); }
        finally { setCheckoutLoading(false); }
    };

    return (
        <div className="pos-container no-sidebar-layout">
            {/* ─── Left: Cart (same as POS) ─── */}
            <div className="pos-main">

                {/* Connection Status */}
                <div className="card" style={{ marginBottom: '0', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>⚡ شاشة الكاشير - استقبال الطلبات</h3>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: connected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: connected ? '#10b981' : '#ef4444',
                        padding: '5px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600,
                        border: `1px solid ${connected ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
                    }}>
                        <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: connected ? '#10b981' : '#ef4444',
                            boxShadow: connected ? '0 0 8px #10b981' : 'none'
                        }} />
                        {connected ? 'متصل بالعميل' : 'غير متصل'}
                    </div>
                </div>

                {/* Cart Table */}
                <div className="card pos-cart" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div className="card-header">
                        <h3>🛒 سلة المشتريات ({cart.length})</h3>
                        <button className="btn btn-danger btn-sm" onClick={() => setCart([])}>مسح السلة</button>
                    </div>
                    <div className="table-wrapper" style={{ flex: 1 }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>المنتج</th>
                                    <th style={{ textAlign: 'center' }}>السعر</th>
                                    <th style={{ textAlign: 'center' }}>الكمية</th>
                                    <th style={{ textAlign: 'center' }}>الإجمالي</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {cart.length === 0 ? (
                                    <tr><td colSpan="5" className="empty-state" style={{ padding: '80px' }}>
                                        <div className="empty-icon">📡</div>
                                        <h4>بانتظار اختيارات العميل...</h4>
                                        <p>بمجرد أن يختار العميل منتج من شاشته، سيظهر هنا فوراً</p>
                                    </td></tr>
                                ) : cart.map(item => (
                                    <tr key={item.id}>
                                        <td>
                                            <div style={{ fontWeight: 600, color: 'var(--text-white)' }}>{item.name}</div>
                                            {item.unitName && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.unitName}</div>}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>{item.price.toFixed(2)}</td>
                                        <td style={{ textAlign: 'center', width: '150px' }}>
                                            <div className="qty-control" style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #333', background: '#000' }}>
                                                <button className="btn btn-ghost btn-sm" style={{ border: 'none', padding: '5px 10px' }} onClick={() => updateQty(item.id, item.qty - 1)}>-</button>
                                                <input type="number" className="form-control" value={item.qty}
                                                    style={{ width: '50px', background: 'transparent', border: 'none', textAlign: 'center', padding: '0' }}
                                                    onChange={(e) => updateQty(item.id, parseFloat(e.target.value) || 0)} />
                                                <button className="btn btn-ghost btn-sm" style={{ border: 'none', padding: '5px 10px' }} onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-white)' }}>{(item.price * item.qty).toFixed(2)}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--metro-red)', border: 'none' }} onClick={() => removeFromCart(item.id)}>✕</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ─── Right: Checkout Panel (same as POS) ─── */}
            <div className="pos-sidebar">
                <div className="card pos-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px' }}>
                        <div className="form-group mb-4">
                            <label>العميل (اختياري)</label>
                            <select className="form-control" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
                                <option value="">عميل نقدي (Cash)</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>)}
                            </select>
                        </div>

                        <div className="pos-summary" style={{ background: '#0d0d0d', padding: '16px', border: '1px solid #222', marginBottom: '20px' }}>
                            <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>الإجمالي الفرعي</span>
                                <span style={{ fontWeight: 600 }}>{subtotal.toFixed(2)} ج.م</span>
                            </div>
                            <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #222', paddingTop: '12px', marginTop: '12px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>الخصم</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input type="number" className="form-control"
                                        style={{ width: '80px', padding: '4px 8px', textAlign: 'center' }}
                                        value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} />
                                    <span style={{ fontSize: '0.8rem' }}>ج.م</span>
                                </div>
                            </div>
                        </div>

                        <div className="total-display" style={{ textAlign: 'left', marginBottom: '24px' }}>
                            <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>الإجمالي النهائي</label>
                            <div style={{ fontSize: '3rem', fontWeight: 200, color: 'var(--metro-blue)', lineHeight: 1 }}>
                                {total.toFixed(2)} <span style={{ fontSize: '1rem' }}>ج.م</span>
                            </div>
                        </div>

                        <div className="pos-payment card" style={{ padding: '16px', background: '#111', border: '1px solid #222' }}>
                            <div className="form-group mb-3">
                                <label>المبلغ المدفوع</label>
                                <div className="d-flex align-items-center gap-2">
                                    <input type="number" className="form-control"
                                        style={{ fontSize: '1.5rem', fontWeight: 700, textAlign: 'left', border: '1px solid #444' }}
                                        value={paidAmount} onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)} placeholder="0.00" />
                                    <button className="btn btn-ghost" style={{ padding: '0 12px', height: '48px' }} onClick={() => setPaidAmount(total)}>كل المبلغ</button>
                                </div>
                            </div>
                            <div className="change-display" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '10px' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>الباقي للعميل:</label>
                                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: change >= 0 ? 'var(--metro-green)' : 'var(--metro-red)' }}>
                                    {change.toFixed(2)} ج.م
                                </span>
                            </div>
                        </div>

                        <button className="btn btn-primary btn-block btn-lg mt-auto"
                            style={{ padding: '24px', fontSize: '1.1rem', fontWeight: 700, marginTop: '20px' }}
                            disabled={checkoutLoading || cart.length === 0} onClick={handleCheckout}>
                            {checkoutLoading ? 'جاري الحفظ...' : '🖥️ إتمام العملية (CHECK OUT)'}
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                .pos-container { display: flex; gap: 20px; height: calc(100vh - 20px); padding: 10px; overflow: hidden; }
                .pos-main { flex: 1; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; overflow-x: hidden; padding-right: 4px; }
                .pos-sidebar { width: 400px; overflow-y: auto; }
            `}</style>
        </div>
    );
};

export default OrderCashier;
