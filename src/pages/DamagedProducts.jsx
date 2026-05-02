import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import ModalContainer from '../components/common/ModalContainer';
import Loader from '../components/common/Loader';
import '../styles/pages/DamagedProductsPremium.css';

const DamagedProducts = () => {
    const { toast } = useGlobalUI();
    const [data, setData] = useState({ items: [], totalPages: 0, totalElements: 0 });
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        productId: '',
        quantity: '',
        reason: ''
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await Api.getDamagedProducts(page, 20, search);
            // Handle both Page object directly or wrapped in ApiResponse.data
            const pageObj = res.content ? res : (res.data || res);
            
            setData({
                items: pageObj.content || pageObj.items || [],
                totalPages: pageObj.totalPages || 0,
                totalElements: pageObj.totalElements || 0
            });
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadProducts = async () => {
        try {
            const result = await Api.getProducts(0, 5000);
            setProducts(result || []);
        } catch (err) {
            console.error('Failed to load products', err);
        }
    };

    useEffect(() => {
        loadData();
    }, [page, search]);

    useEffect(() => {
        loadProducts();
    }, []);

    const openCreateModal = () => {
        setFormData({ productId: '', quantity: '', reason: '' });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.productId || !formData.quantity) {
            toast('يرجى اختيار المنتج والكمية', 'warning');
            return;
        }

        setSaving(true);
        try {
            await Api.recordDamagedProduct({
                ...formData,
                quantity: parseFloat(formData.quantity)
            });
            toast('تم تسجيل الهالك بنجاح', 'success');
            setIsModalOpen(false);
            loadData();
            loadProducts();
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const totalLossValue = data.items.reduce((sum, item) => sum + (item.totalLoss || 0), 0);

    return (
        <div className="damaged-page-container">
            {/* Header & Search */}
            <div className="dmg-header-toolbar">
                <div className="dmg-title-area">
                    <h1>إدارة التوالف والهوالك</h1>
                </div>
                <div className="dmg-search-wrapper">
                    <i className="fas fa-search dmg-search-icon"></i>
                    <input 
                        type="text" 
                        className="dmg-search-input"
                        placeholder="بحث في التوالف..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button className="det-btn-action" style={{ background: '#ef4444', color: '#fff' }} onClick={openCreateModal}>
                    <i className="fas fa-plus"></i> تسجيل هالك جديد
                </button>
            </div>

            {/* KPI Cards */}
            <div className="dmg-kpi-grid">
                <div className="dmg-kpi-card">
                    <div className="dmg-kpi-icon" style={{ color: '#ef4444' }}><i className="fas fa-chart-line"></i></div>
                    <div className="dmg-kpi-info">
                        <div className="label">إجمالي خسائر التوالف (الصفحة)</div>
                        <div className="value">{Number(totalLossValue).toLocaleString()} <small>ج.م</small></div>
                    </div>
                </div>
                <div className="dmg-kpi-card">
                    <div className="dmg-kpi-icon" style={{ color: '#8b5cf6' }}><i className="fas fa-list-ol"></i></div>
                    <div className="dmg-kpi-info">
                        <div className="label">عدد العمليات المسجلة</div>
                        <div className="value">{data.totalElements}</div>
                    </div>
                </div>
            </div>

            <div className="dmg-main-card">
                {loading ? (
                    <div style={{ padding: '60px 0' }}><Loader message="جاري تحميل سجل الهوالك..." /></div>
                ) : data.items.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🗑️</div>
                        <h3>لا يوجد سجل للهوالك</h3>
                        <p style={{ color: 'var(--dmg-text-secondary)' }}>اضغط على تسجيل هالك جديد لإضافة بيانات</p>
                    </div>
                ) : (
                    <>
                        <div className="dmg-table-wrapper">
                            <table className="dmg-table">
                                <thead>
                                    <tr>
                                        <th>التاريخ</th>
                                        <th>المنتج</th>
                                        <th>الكمية</th>
                                        <th>التكلفة</th>
                                        <th>الخسارة</th>
                                        <th>السبب</th>
                                        <th>بواسطة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map((item) => (
                                        <tr key={item.id}>
                                            <td data-label="التاريخ" style={{ fontSize: '0.85rem' }}>{new Date(item.damagedDate).toLocaleString('ar-EG')}</td>
                                            <td data-label="المنتج">
                                                <div style={{ fontWeight: 700 }}>{item.productName}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--dmg-text-secondary)' }}>{item.productCode}</div>
                                            </td>
                                            <td data-label="الكمية">
                                                <span className="det-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none' }}>
                                                    {item.quantity} {item.unitName}
                                                </span>
                                            </td>
                                            <td data-label="التكلفة">{Number(item.purchasePrice).toLocaleString()}</td>
                                            <td data-label="الخسارة" style={{ fontWeight: 800, color: '#ef4444' }}>
                                                {Number(item.totalLoss).toLocaleString()}
                                            </td>
                                            <td data-label="السبب">{item.reason || <span style={{ color: 'var(--dmg-text-secondary)' }}>—</span>}</td>
                                            <td data-label="بواسطة">{item.recordedBy}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {data.totalPages > 1 && (
                            <div className="int-pagination">
                                <button className="int-btn-page" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                                    <i className="fas fa-chevron-right"></i>
                                </button>
                                <span style={{ fontWeight: 600 }}>صفحة {page + 1} من {data.totalPages}</span>
                                <button className="int-btn-page" disabled={page >= data.totalPages - 1} onClick={() => setPage(p => p + 1)}>
                                    <i className="fas fa-chevron-left"></i>
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Create Damaged Record Modal */}
            {isModalOpen && (
                <div className="det-modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="det-modal" style={{ maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
                        <div className="det-modal-header">
                            <h3><i className="fas fa-trash-alt" style={{ color: '#ef4444', marginLeft: '10px' }}></i> تسجيل هالك / تالف</h3>
                            <button style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setIsModalOpen(false)}>✕</button>
                        </div>
                        <div className="det-modal-body">
                            <form id="damagedForm" onSubmit={handleSave}>
                                <div className="dmg-form-group">
                                    <label className="dmg-label">المنتج المستهدف *</label>
                                    <select 
                                        className="dmg-select"
                                        value={formData.productId} 
                                        onChange={(e) => setFormData({ ...formData, productId: e.target.value })} 
                                        required 
                                    >
                                        <option value="">-- اختر المنتج من المخزن --</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} (المخزن الحالي: {p.stock})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="dmg-form-group">
                                    <label className="dmg-label">الكمية التالفة *</label>
                                    <input 
                                        type="number" 
                                        step="0.001" 
                                        className="dmg-input"
                                        value={formData.quantity} 
                                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} 
                                        required 
                                    />
                                </div>
                                <div className="dmg-form-group">
                                    <label className="dmg-label">سبب التلف / ملاحظات</label>
                                    <textarea 
                                        className="dmg-textarea" 
                                        rows="3"
                                        value={formData.reason} 
                                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })} 
                                        placeholder="مثلاً: كسر أثناء النقل، انتهاء صلاحية..." 
                                    />
                                </div>
                                
                                <div className="dmg-alert-warning">
                                    <i className="fas fa-exclamation-triangle"></i>
                                    <div>
                                        <strong>تنبيه هام:</strong> سيتم خصم الكمية فوراً من المخزن وتسجيل حركة "سحب" من الخزنة بقيمة التكلفة الإجمالية للهالك.
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="det-modal-footer">
                            <button type="button" className="det-btn-action" style={{ background: 'transparent', color: 'var(--dmg-text-secondary)' }} onClick={() => setIsModalOpen(false)}>إلغاء</button>
                            <button type="submit" form="damagedForm" className="det-btn-action" style={{ background: '#ef4444', color: '#fff' }} disabled={saving}>
                                {saving ? 'جاري التسجيل...' : 'تأكيد التسجيل'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DamagedProducts;
