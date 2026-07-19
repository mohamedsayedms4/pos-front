import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import ModalContainer from '../components/common/ModalContainer';
import Loader from '../components/common/Loader';
import StatTile from '../components/common/StatTile';
import useProductSearchSelect from '../utils/useProductSearchSelect';

const DamagedProducts = () => {
    const { toast } = useGlobalUI();
    const [data, setData] = useState({ items: [], totalPages: 0, totalElements: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    
    // Branch Selection State
    const [branches, setBranches] = useState([]);
    const [selectedBranchId, setSelectedBranchId] = useState(() => {
        const user = Api._getUser();
        const isAdmin = (user?.roles || []).some(r => r.includes('ADMIN'));
        if (isAdmin) return '';
        return user?.branchId ? user.branchId.toString() : '';
    });
    const [currentUserBranchId, setCurrentUserBranchId] = useState(() => {
        const user = Api._getUser();
        return user?.branchId ? user.branchId.toString() : null;
    });

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        productId: '',
        quantity: '',
        reason: ''
    });

    // Product search select — managed by custom hook
    const {
        productSearch,
        setProductSearch,
        selectedProductId,
        selectedProductName,
        isDropdownOpen,
        setIsDropdownOpen,
        products: selectProducts,
        page: selectProductsPage,
        setPage: setSelectProductsPage,
        totalPages: selectProductsTotalPages,
        loading: selectProductsLoading,
        selectProduct: handleSelectProduct,
        clearSelection,
        reset: resetProductSelect
    } = useProductSearchSelect(selectedBranchId, isModalOpen);

    const loadData = async () => {
        setLoading(true);
        try {
            const damaged = await Api.getDamagedProducts(page, 20, search, selectedBranchId);
            setData({
                items: damaged.content || damaged.items || [],
                totalPages: damaged.totalPages || 0,
                totalElements: damaged.totalElements || 0
            });
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchProductsForSelect = async (query = '', pageNum = 0) => {
        setSelectProductsLoading(true);
        try {
            const branchToUse = selectedBranchId || currentUserBranchId;
            const res = await Api.getProductsPaged(pageNum, 10, query, 'id,desc', branchToUse);
            setSelectProducts(res.items || []);
            setSelectProductsTotalPages(res.totalPages || 0);
            setSelectProductsPage(res.page || 0);
        } catch (err) {
            console.error('Failed to fetch paged products', err);
        } finally {
            setSelectProductsLoading(false);
        }
    };

    // Load branches
    useEffect(() => {
        Api.getBranches()
            .then(data => setBranches(data || []))
            .catch(err => console.error('Failed to load branches', err));
    }, []);

    useEffect(() => {
        loadData();
    }, [page, search, selectedBranchId]);

    // Reset product selection when branch changes
    useEffect(() => {
        clearSelection();
        setFormData(prev => ({ ...prev, productId: '' }));
    }, [selectedBranchId]);

    const openCreateModal = () => {
        setFormData({ productId: '', quantity: '', reason: '' });
        resetProductSelect();
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!selectedProductId || !formData.quantity) {
            toast('يرجى اختيار المنتج والكمية', 'warning');
            return;
        }

        setSaving(true);
        try {
            await Api.recordDamagedProduct({
                productId: selectedProductId,
                quantity: parseFloat(formData.quantity),
                reason: formData.reason,
                branchId: selectedBranchId ? parseInt(selectedBranchId) : null
            });
            toast('تم تسجيل الهالك بنجاح', 'success');
            setIsModalOpen(false);
            loadData();
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
                    icon={<i className="fa-solid fa-calculator"></i>}
                    defaults={{ color: 'crimson', size: 'tile-wd-sm', order: 1 }}
                />
                <StatTile
                    id="dmg_count"
                    label="عدد العمليات"
                    value={data.totalElements}
                    icon={<i className="fa-solid fa-calculator"></i>}
                    defaults={{ color: 'deep-purple', size: 'tile-sq-sm', order: 2 }}
                />
            </div>

            <div className="card">
                <div className="card-header">
                    <h3><i className="fa-solid fa-trash"></i> إدارة التوالف والهوالك</h3>
                    <div className="toolbar" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {Api.isAdminOrBranchManager() && (
                            <select 
                                className="form-control"
                                value={selectedBranchId}
                                onChange={(e) => { setSelectedBranchId(e.target.value); setPage(0); }}
                                style={{ width: '180px', height: '40px', padding: '0 10px', margin: 0 }}
                            >
                                {Api.isAdmin() && <option value="">كل الفروع <i className="fa-solid fa-building"></i></option>}
                                {branches.map(b => (
                                    <option key={b.id} value={b.id.toString()}><i className="fa-solid fa-building"></i> {b.name}</option>
                                ))}
                            </select>
                        )}
                        <div className="search-input">
                            <input 
                                type="text" 
                                placeholder="بحث في التوالف..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <span className="search-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
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
                                <div className="empty-icon"><i className="fa-solid fa-trash"></i></div>
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
                                                <Link to={`/products/${item.productId}`} style={{ fontWeight: 600, color: 'var(--accent-azure)', textDecoration: 'none', cursor: 'pointer' }} className="hover-underline">
                                                    {item.productName}
                                                </Link>
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
                                <h3><i className="fa-solid fa-box"></i> تسجيل هالك / تالف</h3>
                                <button className="modal-close" onClick={() => setIsModalOpen(false)}><i className="fa-solid fa-times"></i></button>
                            </div>
                            <div className="modal-body">
                                <form id="damagedForm" onSubmit={handleSave}>
                                    <div className="form-group" style={{ position: 'relative' }}>
                                        <label>المنتج *</label>
                                        <div style={{ position: 'relative' }}>
                                            <input 
                                                type="text"
                                                className="form-control"
                                                style={{ paddingLeft: formData.productId ? '30px' : '10px' }}
                                                placeholder=" ابحث بالاسم أو كود المنتج..."
                                                value={productSearch}
                                                onChange={(e) => {
                                                    setProductSearch(e.target.value);
                                                    setSelectProductsPage(0);
                                                    setIsDropdownOpen(true);
                                                    if (e.target.value === '') {
                                                        setFormData(prev => ({ ...prev, productId: '' }));
                                                        setSelectedProductName('');
                                                    }
                                                }}
                                                onFocus={() => setIsDropdownOpen(true)}
                                                onBlur={() => {
                                                    setTimeout(() => {
                                                        setIsDropdownOpen(false);
                                                        if (formData.productId && selectedProductName) {
                                                            setProductSearch(selectedProductName);
                                                        } else {
                                                            setProductSearch('');
                                                        }
                                                    }, 200);
                                                }}
                                                required
                                            />
                                            {formData.productId && (
                                                <button 
                                                    type="button"
                                                    style={{
                                                        position: 'absolute',
                                                        left: '10px',
                                                        top: '50%',
                                                        transform: 'translateY(-50%)',
                                                        background: 'none',
                                                        border: 'none',
                                                        color: 'var(--text-muted)',
                                                        cursor: 'pointer',
                                                        fontSize: '1rem',
                                                        padding: '2px 5px'
                                                    }}
                                                    onClick={() => {
                                                        setFormData(prev => ({ ...prev, productId: '' }));
                                                        setProductSearch('');
                                                        setSelectedProductName('');
                                                    }}
                                                >
                                                    <i className="fa-solid fa-times"></i>
                                                </button>
                                            )}
                                            
                                            {isDropdownOpen && (
                                                <div 
                                                    className="searchable-select-dropdown" 
                                                    style={{
                                                        position: 'absolute',
                                                        top: '100%',
                                                        left: 0,
                                                        right: 0,
                                                        zIndex: 1000,
                                                        backgroundColor: 'var(--bg-modal, #121212)',
                                                        border: '1px solid var(--border-input, #333)',
                                                        borderRadius: '4px',
                                                        marginTop: '5px',
                                                        boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                                                        scrollbarWidth: 'thin'
                                                    }}
                                                >
                                                    {selectProductsLoading ? (
                                                        <div style={{ padding: '20px', color: 'var(--text-muted, #888)', textAlign: 'center' }}>
                                                            جاري جلب المنتجات...
                                                        </div>
                                                    ) : selectProducts.length === 0 ? (
                                                        <div style={{ padding: '20px', color: 'var(--text-muted, #888)', textAlign: 'center' }}>
                                                            لا توجد منتجات مطابقة
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                                                                {selectProducts.map(p => (
                                                                    <div 
                                                                        key={p.id}
                                                                        className="searchable-select-item"
                                                                        style={{
                                                                            padding: '10px 15px',
                                                                            cursor: 'pointer',
                                                                            borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.05))',
                                                                            display: 'flex',
                                                                            justifyContent: 'space-between',
                                                                            alignItems: 'center',
                                                                            backgroundColor: formData.productId === p.id ? 'var(--metro-blue)' : 'transparent',
                                                                            color: formData.productId === p.id ? '#ffffff' : 'var(--text-white)'
                                                                        }}
                                                                        onMouseDown={(e) => {
                                                                            e.preventDefault();
                                                                            setFormData(prev => ({ ...prev, productId: p.id }));
                                                                            setProductSearch(p.name);
                                                                            setSelectedProductName(p.name);
                                                                            setIsDropdownOpen(false);
                                                                        }}
                                                                    >
                                                                        <div>
                                                                            <div style={{ fontWeight: 600, color: formData.productId === p.id ? '#ffffff' : 'var(--text-white)' }}>{p.name}</div>
                                                                            {p.productCode && <div style={{ fontSize: '0.75rem', color: formData.productId === p.id ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>{p.productCode}</div>}
                                                                        </div>
                                                                        <span 
                                                                            style={{ 
                                                                                fontSize: '0.8rem', 
                                                                                padding: '2px 8px', 
                                                                                borderRadius: '10px', 
                                                                                backgroundColor: p.stock > 0 ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)',
                                                                                color: p.stock > 0 ? '#2ecc71' : '#e74c3c'
                                                                            }}
                                                                        >
                                                                            المخزن: {p.stock}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            {selectProductsTotalPages > 1 && (
                                                                <div style={{
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                    padding: '8px 12px',
                                                                    borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.05))',
                                                                    backgroundColor: 'var(--bg-elevated, #1a1a1a)',
                                                                    fontSize: '0.8rem'
                                                                }}
                                                                onMouseDown={(e) => e.preventDefault()}
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-secondary"
                                                                        style={{ padding: '2px 8px', fontSize: '0.75rem', height: 'auto', minWidth: '0' }}
                                                                        disabled={selectProductsPage === 0 || selectProductsLoading}
                                                                        onClick={() => setSelectProductsPage(p => p - 1)}
                                                                    >
                                                                        السابق
                                                                    </button>
                                                                    <span style={{ color: 'var(--text-muted)' }}>
                                                                        صفحة {selectProductsPage + 1} من {selectProductsTotalPages}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-secondary"
                                                                        style={{ padding: '2px 8px', fontSize: '0.75rem', height: 'auto', minWidth: '0' }}
                                                                        disabled={selectProductsPage >= selectProductsTotalPages - 1 || selectProductsLoading}
                                                                        onClick={() => setSelectProductsPage(p => p + 1)}
                                                                    >
                                                                        التالي
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <style>{`
                                            .searchable-select-item:hover {
                                                background-color: var(--bg-hover-tile, rgba(255, 255, 255, 0.08)) !important;
                                            }
                                            .searchable-select-dropdown::-webkit-scrollbar {
                                                width: 6px;
                                            }
                                            .searchable-select-dropdown::-webkit-scrollbar-track {
                                                background: transparent;
                                            }
                                            .searchable-select-dropdown::-webkit-scrollbar-thumb {
                                                background: var(--border-input, rgba(255, 255, 255, 0.2));
                                                border-radius: 3px;
                                            }
                                            .searchable-select-dropdown::-webkit-scrollbar-thumb:hover {
                                                background: rgba(255, 255, 255, 0.4);
                                            }
                                        `}</style>
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
                                        <b><i className="fa-solid fa-triangle-exclamation"></i> تنبيه:</b> سيتم خصم الكمية فوراً من المخزن وتسجيل حركة "سحب" من الخزنة بقيمة التكلفة.
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
