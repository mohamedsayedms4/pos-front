import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import '../styles/pages/RecurringInvoices.css';

const RecurringInvoices = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const { toast } = useGlobalUI();

    const [customers, setCustomers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    
    const [formData, setFormData] = useState({
        customerId: '',
        branchId: '',
        warehouseId: '',
        frequency: 'MONTHLY',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        items: []
    });

    const [newItem, setNewItem] = useState({ productId: '', quantity: 1, unitPrice: 0 });

    const getBranchInventory = (product, branchId) => {
        if (!product || !product.branchInventories || product.branchInventories.length === 0) return null;
        if (branchId) {
            const inv = product.branchInventories.find(i => String(i.branchId) === String(branchId));
            if (inv) return inv;
        }
        return product.branchInventories[0];
    };

    useEffect(() => {
        fetchTemplates();
        loadMetadata();
    }, []);

    const fetchTemplates = async () => {
        try {
            const data = await Api.getRecurringInvoices();
            setTemplates(data || []);
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadMetadata = async () => {
        try {
            const [c, b, w, p] = await Promise.all([
                Api.getCustomers(0, 1000),
                Api.getBranches(),
                Api.getWarehouses(),
                Api.getProducts(0, 1000)
            ]);
            
            const extractData = (res) => {
                if (Array.isArray(res)) return res;
                if (res && (res.items || res.content)) return res.items || res.content;
                return [];
            };

            setCustomers(extractData(c));
            setBranches(extractData(b));
            setWarehouses(extractData(w));
            setProducts(extractData(p));
        } catch (e) {
            console.error("Metadata load failed", e);
        }
    };

    const handleManualProcess = async () => {
        try {
            await Api.processRecurringInvoicesManual();
            toast('تم معالجة الفواتير المستحقة بنجاح', 'success');
            fetchTemplates();
        } catch (err) {
            toast(err.message, 'error');
        }
    };

    const handleAddItem = () => {
        if (!newItem.productId || newItem.quantity <= 0) return;
        const prod = products.find(p => p.id === parseInt(newItem.productId));
        const item = {
            ...newItem,
            productName: prod?.name,
            productId: parseInt(newItem.productId)
        };
        setFormData({ ...formData, items: [...formData.items, item] });
        setNewItem({ productId: '', quantity: 1, unitPrice: 0 });
    };

    const removeItem = (idx) => {
        const newItems = [...formData.items];
        newItems.splice(idx, 1);
        setFormData({ ...formData, items: newItems });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.items.length === 0) return toast('يرجى إضافة صنف واحد على الأقل', 'error');
        try {
            await Api.createRecurringInvoice(formData);
            toast('تم حفظ نموذج الفاتورة الدورية', 'success');
            setShowModal(false);
            fetchTemplates();
        } catch (err) {
            toast(err.message, 'error');
        }
    };

    if (loading) return <Loader message="جاري التحميل..." />;

    return (
        <div className="recurring-container">
            <header className="rec-header">
                <div className="rec-title">
                    <h1>الفواتير الدورية</h1>
                    <p>أتمتة المبيعات والاشتراكات المتكررة بشكل ذكي</p>
                </div>
                <div className="rec-actions">
                    <button className="btn-premium btn-outline-premium" onClick={handleManualProcess}>
                        <i className="fas fa-sync-alt"></i>
                        تشغيل يدوي
                    </button>
                    <button className="btn-premium btn-primary-gradient" onClick={() => setShowModal(true)}>
                        <i className="fas fa-plus"></i>
                        إنشاء نموذج جديد
                    </button>
                </div>
            </header>

            <div className="rec-table-card">
                <table className="rec-table">
                    <thead>
                        <tr>
                            <th>العميل</th>
                            <th>التكرار</th>
                            <th>المبلغ الإجمالي</th>
                            <th>تاريخ البدء</th>
                            <th>آخر إصدار</th>
                            <th>الحالة</th>
                        </tr>
                    </thead>
                    <tbody>
                        {templates.map(ri => (
                            <tr key={ri.id}>
                                <td style={{ fontWeight: 700 }}>{ri.customer?.name}</td>
                                <td>
                                    <span className="badge-premium" style={{ background: 'rgba(165, 180, 252, 0.1)', color: '#a5b4fc' }}>
                                        {ri.frequency === 'MONTHLY' ? 'شهري' : ri.frequency === 'DAILY' ? 'يومي' : ri.frequency}
                                    </span>
                                </td>
                                <td style={{ fontWeight: 800 }}>{Number(ri.totalAmount).toLocaleString()} ج.م</td>
                                <td>{ri.startDate}</td>
                                <td>{ri.lastGeneratedDate || '---'}</td>
                                <td>
                                    <span className={`badge-premium ${ri.status === 'ACTIVE' ? 'badge-active' : 'badge-paused'}`}>
                                        {ri.status === 'ACTIVE' ? 'نشط' : 'متوقف'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {templates.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                                    <i className="fas fa-history" style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem', opacity: 0.2 }}></i>
                                    لا توجد نماذج فواتير دورية حالياً
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <ModalContainer>
                    <div className="rec-modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="rec-modal-card" onClick={e => e.stopPropagation()}>
                            <div className="rec-modal-header">
                                <h3>إنشاء نموذج فاتورة دورية</h3>
                                <button className="rec-close-btn" onClick={() => setShowModal(false)}><i className="fa-solid fa-times"></i></button>
                            </div>
                            
                            <form onSubmit={handleSubmit}>
                                <div className="rec-form-grid">
                                    <div className="rec-form-group">
                                        <label>العميل المستهدف</label>
                                        <select required className="rec-input" value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})}>
                                            <option value="">اختر عميل...</option>
                                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="rec-form-group">
                                        <label>الفرع</label>
                                        <select required className="rec-input" value={formData.branchId} onChange={e => setFormData({...formData, branchId: e.target.value})}>
                                            <option value="">اختر فرع...</option>
                                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="rec-form-group">
                                        <label>المخزن لخصم الكميات</label>
                                        <select required className="rec-input" value={formData.warehouseId} onChange={e => setFormData({...formData, warehouseId: e.target.value})}>
                                            <option value="">اختر مخزن...</option>
                                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="rec-form-group">
                                        <label>دورية التكرار</label>
                                        <select className="rec-input" value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value})}>
                                            <option value="DAILY">يومي</option>
                                            <option value="WEEKLY">أسبوعي</option>
                                            <option value="MONTHLY">شهري</option>
                                            <option value="YEARLY">سنوي</option>
                                        </select>
                                    </div>
                                    <div className="rec-form-group">
                                        <label>تاريخ أول إصدار</label>
                                        <input type="date" required className="rec-input" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                                    </div>
                                    <div className="rec-form-group">
                                        <label>تاريخ الانتهاء</label>
                                        <input type="date" className="rec-input" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                                    </div>
                                </div>

                                <div className="rec-items-section">
                                    <h4 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>إضافة الأصناف للفاتورة</h4>
                                    <div className="rec-item-add-row">
                                        <select className="rec-input" value={newItem.productId} onChange={e => {
                                            const p = products.find(x => x.id === parseInt(e.target.value));
                                            const inv = getBranchInventory(p, formData.branchId);
                                            setNewItem({...newItem, productId: e.target.value, unitPrice: inv?.salePrice || 0})
                                        }}>
                                            <option value="">اختر صنف...</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <input type="number" placeholder="الكمية" className="rec-input" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value)})} />
                                        <input type="number" placeholder="السعر" className="rec-input" value={newItem.unitPrice} onChange={e => setNewItem({...newItem, unitPrice: parseFloat(e.target.value)})} />
                                        <button type="button" className="btn-premium btn-primary-gradient" style={{ padding: '0 1rem' }} onClick={handleAddItem}>
                                            <i className="fas fa-plus"></i>
                                        </button>
                                    </div>
                                    
                                    <div className="rec-items-list">
                                        {formData.items.map((it, idx) => (
                                            <div key={idx} className="rec-item-row">
                                                <div>
                                                    <span className="rec-item-name">{it.productName}</span>
                                                    <span style={{ color: '#94a3b8', margin: '0 10px' }}>×</span>
                                                    <span>{it.quantity}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                    <span className="rec-item-price">{Number(it.unitPrice * it.quantity).toLocaleString()} ج.م</span>
                                                    <button type="button" onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                    <button type="button" className="btn-premium btn-outline-premium" onClick={() => setShowModal(false)}>إلغاء</button>
                                    <button type="submit" className="btn-premium btn-primary-gradient">حفظ وتفعيل النموذج</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalContainer>
            )}
        </div>
    );
};

export default RecurringInvoices;
