import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';

const ProductSearchSelect = ({ value, onChange, placeholder = "اختر المنتج...", required = false, isRawMaterial = null }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [products, setProducts] = useState([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [selectedName, setSelectedName] = useState('');
    const wrapperRef = useRef(null);
    const listRef = useRef(null);

    useEffect(() => {
        if (isOpen && products.length === 0) fetchProducts('', 0);
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!value) setSelectedName('');
    }, [value]);

    const fetchProducts = async (query, pageNum) => {
        if (loading) return;
        setLoading(true);
        try {
            const res = await api.getProductsPaged(pageNum, 15, query, 'id,desc', null, null, isRawMaterial);
            const items = res.items || [];
            if (pageNum === 0) setProducts(items);
            else setProducts(prev => [...prev, ...items]);
            setHasMore(pageNum < (res.totalPages - 1));
        } catch (err) {
            console.error('Error fetching products for search:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => {
            setPage(0);
            fetchProducts(search, 0);
        }, 300);
        return () => clearTimeout(timer);
    }, [search, isOpen]);

    const handleScroll = () => {
        if (listRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = listRef.current;
            if (scrollHeight - scrollTop <= clientHeight + 10 && hasMore && !loading) {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchProducts(search, nextPage);
            }
        }
    };

    const handleSelect = (prod) => {
        setSelectedName(prod.name);
        onChange(prod.id, prod.name);
        setIsOpen(false);
        setSearch('');
    };

    return (
        <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
            <div 
                className="form-control" 
                style={{ 
                    cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)',
                    color: selectedName ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{selectedName || placeholder}</span>
                <span>▼</span>
            </div>

            {isOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000, background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: '8px', marginTop: '5px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                    <div style={{ padding: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                        <input type="text" className="form-control" placeholder="بحث بالاسم أو الكود..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-body)', color: 'var(--text-primary)' }} />
                    </div>
                    <ul ref={listRef} style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '200px', overflowY: 'auto' }} onScroll={handleScroll}>
                        {products.map(p => (
                            <li key={p.id} onClick={() => handleSelect(p)} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <span style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.productCode || ''}</span>
                            </li>
                        ))}
                        {loading && <li style={{ padding: '10px', textAlign: 'center', color: 'var(--text-muted)' }}>جاري التحميل...</li>}
                        {!loading && products.length === 0 && <li style={{ padding: '10px', textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد نتائج</li>}
                    </ul>
                </div>
            )}
        </div>
    );
};

const BomManagement = () => {
    const [boms, setBoms] = useState([]);
    const [formData, setFormData] = useState({ name: '', finishedProductId: '', quantity: 1, items: [] });
    const [newItem, setNewItem] = useState({ rawMaterialId: '', rawMaterialName: '', quantity: '' });

    useEffect(() => {
        fetchBoms();
    }, []);

    const fetchBoms = async () => {
        try {
            const response = await api.get('/manufacturing/boms');
            const bomsData = Array.isArray(response) ? response : (response?.data || []);
            setBoms(bomsData);
        } catch (error) {
            console.error('Error fetching BOMs', error);
        }
    };

    const addItem = () => {
        if (newItem.rawMaterialId && newItem.quantity) {
            setFormData({ ...formData, items: [...formData.items, newItem] });
            setNewItem({ rawMaterialId: '', rawMaterialName: '', quantity: '' });
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.finishedProductId) {
            alert('يرجى اختيار المنتج النهائي');
            return;
        }

        try {
            const payload = {
                name: formData.name,
                quantity: formData.quantity,
                finishedProduct: { id: formData.finishedProductId },
                items: formData.items.map(item => ({
                    rawMaterial: { id: item.rawMaterialId },
                    quantity: item.quantity
                }))
            };
            
            await api.post('/manufacturing/boms', payload);
            fetchBoms();
            setFormData({ name: '', finishedProductId: '', quantity: 1, items: [] });
        } catch (error) {
            console.error('Error saving BOM', error);
            alert('حدث خطأ أثناء حفظ قائمة المواد');
        }
    };

    return (
        <div className="page-section">
            <div className="card mb-4">
                <div className="card-header">
                    <h3>➕ إنشاء قائمة مواد (BOM)</h3>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSave}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                            <div>
                                <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>اسم القائمة</label>
                                <input className="form-control" type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)' }} />
                            </div>
                            <div>
                                <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>المنتج النهائي</label>
                                <ProductSearchSelect 
                                    value={formData.finishedProductId} 
                                    onChange={(id) => setFormData({...formData, finishedProductId: id})}
                                    placeholder="اختر المنتج النهائي..."
                                    isRawMaterial={false}
                                />
                            </div>
                            <div>
                                <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>الكمية الأساسية (للإنتاج)</label>
                                <input className="form-control" type="number" min="1" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)' }} />
                            </div>
                        </div>

                        <div style={{ padding: '15px', background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: '8px', marginBottom: '20px' }}>
                            <h5 style={{ marginBottom: '15px', color: 'var(--text-primary)' }}>المواد الخام المطلوبة</h5>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                <div style={{ flex: '1', minWidth: '200px' }}>
                                    <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>المادة الخام</label>
                                    <ProductSearchSelect 
                                        value={newItem.rawMaterialId} 
                                        onChange={(id, name) => setNewItem({...newItem, rawMaterialId: id, rawMaterialName: name})}
                                        placeholder="ابحث عن مادة خام..."
                                        isRawMaterial={true}
                                    />
                                </div>
                                <div style={{ flex: '1', minWidth: '150px' }}>
                                    <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>الكمية المطلوبة</label>
                                    <input className="form-control" type="number" placeholder="الكمية المطلوبة" value={newItem.quantity} onChange={(e) => setNewItem({...newItem, quantity: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)' }} />
                                </div>
                                <div>
                                    <button type="button" className="btn btn-secondary" onClick={addItem} style={{ padding: '10px 15px', borderRadius: '8px' }}>إضافة المادة</button>
                                </div>
                            </div>

                            {formData.items.length > 0 && (
                                <div style={{ marginTop: '15px' }}>
                                    <table className="data-table" style={{ marginTop: '10px' }}>
                                        <thead>
                                            <tr>
                                                <th>المادة الخام</th>
                                                <th>الكمية</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {formData.items.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td>{item.rawMaterialName}</td>
                                                    <td>{item.quantity}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px', borderRadius: '8px' }}>حفظ القائمة</button>
                    </form>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>📋 قوائم المواد (BOMs)</h3>
                </div>
                <div className="card-body no-padding">
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>اسم القائمة</th>
                                    <th>المنتج النهائي</th>
                                    <th>الكمية المنتجة</th>
                                    <th>عدد المواد المكونة</th>
                                    <th>الحالة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {boms.map(bom => (
                                    <tr key={bom.id}>
                                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{bom.name}</td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{bom.finishedProduct?.name || '—'}</td>
                                        <td>{bom.quantity || 1}</td>
                                        <td>
                                            <span className="badge badge-info" style={{ borderRadius: '4px' }}>
                                                {bom.items?.length || 0}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${bom.active ? 'badge-success' : 'badge-secondary'}`}>
                                                {bom.active ? 'فعال' : 'غير فعال'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {boms.length === 0 && (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>لا يوجد قوائم مواد مضافة بعد.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BomManagement;
