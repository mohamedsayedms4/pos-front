import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import ModalContainer from '../components/common/ModalContainer';
import Loader from '../components/common/Loader';
import StatTile from '../components/common/StatTile';

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
            const damaged = await Api.getDamagedProducts(page, 20, search);
            setData({
                items: damaged.content || damaged.items || [],
                totalPages: damaged.totalPages || 0,
                totalElements: damaged.totalElements || 0
            });
            
            // Stats calculation for summary cards
            // Note: In a real app, we might want a dedicated stats endpoint for performance
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
        <div className="page-section">
            {/* Metro Style Stats */}
            {/* Metro Style Stats */}
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                <StatTile
                    id="dmg_loss"
                    label="إجمالي خسائر التوالف (هذه الصفحة)"
                    value={`${Number(totalLossValue).toLocaleString()} ج.م`}
                    icon="📉"
                    defaults={{ color: 'crimson', size: 'tile-wd-sm', order: 1 }}
                />
                <StatTile
                    id="dmg_count"
                    label="عدد العمليات"
                    value={data.totalElements}
                    icon="📋"
                    defaults={{ color: 'deep-purple', size: 'tile-sq-sm', order: 2 }}
                />
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>🗑️ إدارة التوالف والهوالك</h3>
                    <div className="toolbar">
                        <div className="search-input">
                            <span className="search-icon">🔍</span>
                            <input 
                                type="text" 
                                placeholder="بحث في التوالف..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <button className="btn btn-primary" onClick={openCreateModal}>
                            <span>+</span> تسجيل هالك جديد
                        </button>
                    </div>
                </div>

                <div className="card-body no-padding">
                    <div className="table-wrapper">
                        {loading ? (
                            <Loader message="جاري التحميل..." />
                        ) : data.items.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">🗑️</div>
                                <h4>لا يوجد سجل لهوالك</h4>
                                <p>اضغط على تسجيل هالك جديد لإضافة بيانات</p>
                            </div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>التاريخ</th>
                                        <th>المنتج</th>
                                        <th>الكمية</th>
                                        <th>سعر التكلفة</th>
                                        <th>إجمالي الخسارة</th>
                                        <th>السبب</th>
                                        <th>بواسطة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map((item) => (
                                        <tr key={item.id}>
                                            <td>{new Date(item.damagedDate).toLocaleString('ar-EG')}</td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{item.productName}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.productCode}</div>
                                            </td>
                                            <td>
                                                <span className="badge badge-danger">
                                                    {item.quantity} {item.unitName}
                                                </span>
                                            </td>
                                            <td>{Number(item.purchasePrice).toFixed(2)}</td>
                                            <td style={{ fontWeight: 600, color: 'var(--metro-red)' }}>
                                                {Number(item.totalLoss).toFixed(2)}
                                            </td>
                                            <td>{item.reason || <span className="text-muted">—</span>}</td>
                                            <td>{item.recordedBy}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
                
                {data.totalPages > 1 && (
                    <div className="card-footer" style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                        <button 
                            className="btn btn-sm btn-secondary" 
                            disabled={page === 0}
                            onClick={() => setPage(p => p - 1)}
                        >
                            السابق
                        </button>
                        <span style={{ alignSelf: 'center' }}>صفحة {page + 1} من {data.totalPages}</span>
                        <button 
                            className="btn btn-sm btn-secondary" 
                            disabled={page >= data.totalPages - 1}
                            onClick={() => setPage(p => p + 1)}
                        >
                            التالي
                        </button>
                    </div>
                )}
            </div>

            {/* Create Damaged Record Modal */}
            {isModalOpen && (
                <ModalContainer>
                    <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setIsModalOpen(false); }}>
                        <div className="modal" style={{ maxWidth: '500px' }}>
                            <div className="modal-header">
                                <h3>📦 تسجيل هالك / تالف</h3>
                                <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
                            </div>
                            <div className="modal-body">
                                <form id="damagedForm" onSubmit={handleSave}>
                                    <div className="form-group">
                                        <label>المنتج *</label>
                                        <select 
                                            className="form-control"
                                            value={formData.productId}
                                            onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                                            required
                                        >
                                            <option value="">-- اختر المنتج --</option>
                                            {products.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} (المخزن: {p.stock})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>الكمية التالفة *</label>
                                        <input 
                                            type="number" 
                                            step="0.001"
                                            className="form-control"
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>سبب التلف / ملاحظات</label>
                                        <textarea 
                                            className="form-control"
                                            rows="3"
                                            value={formData.reason}
                                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                            placeholder="مثلاً: كسر أثناء النقل، انتهاء صلاحية..."
                                        ></textarea>
                                    </div>
                                    
                                    <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(231, 76, 60, 0.1)', borderRadius: '5px', borderRight: '3px solid var(--metro-red)', fontSize: '0.85rem' }}>
                                        <b>⚠️ تنبيه:</b> سيتم خصم الكمية فوراً من المخزن وتسجيل حركة "سحب" من الخزنة بقيمة التكلفة.
                                    </div>
                                </form>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>إلغاء</button>
                                <button type="submit" form="damagedForm" className="btn btn-primary" style={{ backgroundColor: 'var(--metro-red)' }} disabled={saving}>
                                    {saving ? 'جاري التسجيل...' : 'تأكيد التسجيل'}
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalContainer>
            )}
        </div>
    );
};

export default DamagedProducts;
