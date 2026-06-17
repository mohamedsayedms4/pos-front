import React, { useState, useEffect } from 'react';
import { 
    searchInventoryChecks, 
    createInventoryCheck,
    getBranches,
    getWarehouses
} from '../services/inventoryCheckApi';
import { useNavigate } from 'react-router-dom';
import { useGlobalUI } from '../components/common/GlobalUI';
import ModalContainer from '../components/common/ModalContainer';
import Loader from '../components/common/Loader';
import Api from '../services/api';

const InventoryChecks = () => {
    const [checks, setChecks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [query, setQuery] = useState('');
    
    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [formData, setFormData] = useState({
        target: 'PRODUCT',
        type: 'DAILY',
        branchId: '',
        warehouseId: '',
        voucherNumber: '',
        attachmentUrl: '',
        notes: ''
    });

    const [branches, setBranches] = useState([]);
    const [warehouses, setWarehouses] = useState([]);

    const navigate = useNavigate();
    const { toast } = useGlobalUI();

    useEffect(() => {
        fetchChecks();
    }, [page, query]);

    useEffect(() => {
        loadLocations();
    }, []);

    const loadLocations = async () => {
        try {
            const [bRes, wRes] = await Promise.all([getBranches(), getWarehouses()]);
            setBranches(bRes.data || []);
            setWarehouses(wRes.data || []);
        } catch (e) {
            console.error('Error loading locations', e);
        }
    };

    const fetchChecks = async () => {
        setLoading(true);
        try {
            const res = await searchInventoryChecks({ page, size: 10, query });
            setChecks(res.data?.content || []);
            setTotalPages(res.data?.totalPages || 0);
        } catch (error) {
            toast('فشل في جلب الجرود', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        
        if (!formData.branchId && !formData.warehouseId) {
            toast('يجب اختيار فرع أو مخزن', 'error');
            return;
        }

        setCreating(true);
        try {
            const dataToSubmit = { ...formData };
            if (!dataToSubmit.branchId) delete dataToSubmit.branchId;
            if (!dataToSubmit.warehouseId) delete dataToSubmit.warehouseId;
            
            const res = await createInventoryCheck(dataToSubmit);
            toast('تم بدء الجرد بنجاح', 'success');
            setShowModal(false);
            navigate('/inventory-checks/' + res.data.id);
        } catch (error) {
            toast(error?.response?.data?.message || 'خطأ في بدء الجرد', 'error');
        } finally {
            setCreating(false);
        }
    };

    const getStatusText = (status) => {
        switch(status) {
            case 'DRAFT': return <span className="badge badge-warning">مسودة</span>;
            case 'PENDING_APPROVAL': return <span className="badge badge-warning">بانتظار الاعتماد</span>;
            case 'COMPLETED': return <span className="badge badge-success">مكتمل</span>;
            case 'CANCELLED': return <span className="badge badge-danger">ملغي</span>;
            default: return <span className="badge">{status}</span>;
        }
    };

    return (
        <div className="page-section" dir="rtl">
            <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>📝 عمليات الجرد والتسوية (Reconciliation)</h3>
                    <div className="toolbar" style={{ display: 'flex', gap: '10px' }}>
                        <div className="search-input" style={{ position: 'relative' }}>
                            <input 
                                type="text"
                                className="form-control"
                                placeholder="بحث برقم الجرد أو السند..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                            <span className="search-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
                        </div>
                        {Api.can('INVENTORY_CREATE') && (
                            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                                + بدء جرد جديد
                            </button>
                        )}
                    </div>
                </div>

                <div className="card-body no-padding">
                    <div className="table-wrapper">
                        {loading ? (
                            <Loader message="جاري التحميل..." />
                        ) : checks.length === 0 ? (
                            <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                                <h4>لا توجد عمليات جرد</h4>
                            </div>
                        ) : (
                            <table className="data-table" style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th>رقم الجرد</th>
                                        <th>النوع</th>
                                        <th>الفرع/المخزن</th>
                                        <th>رقم السند</th>
                                        <th>تاريخ البدء</th>
                                        <th>الحالة</th>
                                        <th>الموظف</th>
                                        <th>إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {checks.map(c => (
                                        <tr key={c.id}>
                                            <td><strong>{c.checkNumber}</strong></td>
                                            <td>{c.type}</td>
                                            <td>{c.branchName || c.warehouseName}</td>
                                            <td>{c.voucherNumber || '-'}</td>
                                            <td>{new Date(c.startedAt).toLocaleString('ar-EG')}</td>
                                            <td>{getStatusText(c.status)}</td>
                                            <td>{c.createdBy}</td>
                                            <td>
                                                <button 
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => navigate('/inventory-checks/' + c.id)}
                                                >
                                                    عرض / متابعة
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {showModal && (
                <ModalContainer>
                    <div className="modal-overlay active" onClick={(e) => { if (e.target.className.includes('modal-overlay')) setShowModal(false) }}>
                        <div className="modal">
                            <div className="modal-header">
                                <h3>بدء عملية جرد جديدة</h3>
                                <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                            </div>
                            <div className="modal-body">
                                <form onSubmit={handleCreate}>
                                    <div className="form-group mb-3">
                                        <label>نوع الجرد</label>
                                        <select 
                                            className="form-control"
                                            value={formData.type}
                                            onChange={(e) => setFormData({...formData, type: e.target.value})}
                                            required
                                        >
                                            <option value="DAILY">يومي</option>
                                            <option value="MONTHLY">شهري</option>
                                            <option value="YEARLY">سنوي</option>
                                            <option value="PARTIAL">جزئي (تصنيفات محددة)</option>
                                        </select>
                                    </div>

                                    <div className="form-group mb-3">
                                        <label>الهدف من الجرد</label>
                                        <select 
                                            className="form-control"
                                            value={formData.target}
                                            onChange={(e) => setFormData({...formData, target: e.target.value})}
                                            required
                                        >
                                            <option value="PRODUCT">منتجات</option>
                                            <option value="FIXED_ASSET">أصول ثابتة</option>
                                        </select>
                                    </div>

                                    <div style={{ display: 'flex', gap: '15px' }} className="mb-3">
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>الفرع</label>
                                            <select 
                                                className="form-control"
                                                value={formData.branchId}
                                                onChange={(e) => setFormData({...formData, branchId: e.target.value, warehouseId: ''})}
                                                disabled={!!formData.warehouseId}
                                            >
                                                <option value="">اختر فرع...</option>
                                                {branches.map(b => (
                                                    <option key={b.id} value={b.id}>{b.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>المخزن (بدلاً من الفرع)</label>
                                            <select 
                                                className="form-control"
                                                value={formData.warehouseId}
                                                onChange={(e) => setFormData({...formData, warehouseId: e.target.value, branchId: ''})}
                                                disabled={!!formData.branchId}
                                            >
                                                <option value="">اختر مخزن...</option>
                                                {warehouses.map(w => (
                                                    <option key={w.id} value={w.id}>{w.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-group mb-3">
                                        <label>رقم السند (اختياري)</label>
                                        <input 
                                            type="text"
                                            className="form-control"
                                            placeholder="رقم المرجع أو السند الورقي"
                                            value={formData.voucherNumber}
                                            onChange={(e) => setFormData({...formData, voucherNumber: e.target.value})}
                                        />
                                    </div>

                                    <div className="form-group mb-3">
                                        <label>ملاحظات</label>
                                        <textarea 
                                            className="form-control"
                                            rows={2}
                                            value={formData.notes}
                                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                        />
                                    </div>
                                    
                                    <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
                                        <button type="submit" className="btn btn-primary" disabled={creating}>
                                            {creating ? 'جاري البدء...' : 'بدء الجرد الآن'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </ModalContainer>
            )}
        </div>
    );
};

export default InventoryChecks;
