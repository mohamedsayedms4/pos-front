import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import ModalContainer from '../components/common/ModalContainer';
import Loader from '../components/common/Loader';
import StatTile from '../components/common/StatTile';

const Warehouses = () => {
  const { toast, confirm } = useGlobalUI();
  const [data, setData] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState(null); // 'form', 'stock', null
  const [activeWarehouse, setActiveWarehouse] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Stock Management State
  const [stockSearch, setStockSearch] = useState('');
  const [stockProducts, setStockProducts] = useState([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [editingStock, setEditingStock] = useState(null); // {productId, quantity}

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    branchId: '',
    isMain: false
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [whRes, brRes] = await Promise.all([
        Api._request('/warehouses'),
        Api.getBranches()
      ]);
      setData(whRes.data || whRes || []);
      setBranches(brRes || []);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openForm = (wh = null) => {
    setActiveWarehouse(wh);
    if (wh) {
      setFormData({
        name: wh.name || '',
        location: wh.location || '',
        branchId: wh.branchId || '',
        isMain: wh.isMain || false
      });
    } else {
      setFormData({
        name: '',
        location: '',
        branchId: branches.length > 0 ? branches[0].id : '',
        isMain: false
      });
    }
    setModalType('form');
  };

  const closeModal = () => {
    setModalType(null);
    setActiveWarehouse(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.branchId) {
      toast('يرجى اختيار الفرع التابع له المخزن', 'warning');
      return;
    }
    setSaving(true);
    try {
      if (activeWarehouse) {
        await Api._request(`/warehouses/${activeWarehouse.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        toast('تم تحديث المخزن بنجاح', 'success');
      } else {
        await Api._request('/warehouses', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        toast('تم إضافة المخزن بنجاح', 'success');
      }
      closeModal();
      loadData();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const openStockModal = async (wh) => {
    setActiveWarehouse(wh);
    setModalType('stock');
    loadWarehouseStock(wh.id);
  };

  // Debounce stock search
  useEffect(() => {
    if (!activeWarehouse) return;
    const timer = setTimeout(() => {
      loadWarehouseStock(activeWarehouse.id, stockSearch);
    }, 500);
    return () => clearTimeout(timer);
  }, [stockSearch]);

  const loadWarehouseStock = async (whId, search = '') => {
    if (!whId) return;
    setLoadingStock(true);
    try {
      const res = await Api.getWarehouseProducts(whId, 0, 100, search, 'id,desc');
      setStockProducts(res.items || []);
    } catch (err) {
      console.error('Stock load error:', err);
    } finally {
      setLoadingStock(false);
    }
  };

  const handleUpdateStock = async (productId, quantity) => {
    try {
      await Api.updateWarehouseStock(activeWarehouse.id, productId, quantity);
      toast('تم تحديث المخزون', 'success');
      loadWarehouseStock(activeWarehouse.id, stockSearch);
      setEditingStock(null);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="page-section" style={{ direction: 'rtl' }}>
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <StatTile
          id="wh_count"
          label="إجمالي المخازن"
          value={data.length}
          icon="📦"
          defaults={{ color: 'amber', size: 'tile-wd-sm', order: 1 }}
        />
        <StatTile
          id="wh_main"
          label="مخازن رئيسية"
          value={data.filter(w => w.isMain).length}
          icon="⭐"
          defaults={{ color: 'blue', size: 'tile-sq-sm', order: 2 }}
        />
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>📦 إدارة المخازن</h3>
          <button className="btn btn-primary" onClick={() => openForm()}>
            <span>+</span> إضافة مخزن جديد
          </button>
        </div>
        <div className="card-body no-padding">
          <div className="table-wrapper">
            {loading ? (
              <Loader message="جاري تحميل المخازن..." />
            ) : data.length === 0 ? (
              <div className="empty-state">
                <h4>لا توجد مخازن مضافة</h4>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>المخزن</th>
                    <th>الفرع التابع له</th>
                    <th>الموقع</th>
                    <th>رئيسي</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((w, i) => (
                    <tr key={w.id}>
                      <td>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{w.name}</td>
                      <td>{w.branchName || branches.find(b => b.id === w.branchId)?.name || '—'}</td>
                      <td>{w.location || '—'}</td>
                      <td>
                        {w.isMain ? <span className="badge badge-success">نعم</span> : <span className="badge badge-secondary">لا</span>}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-icon btn-ghost" title="إدارة المخزون" onClick={() => openStockModal(w)}>📦</button>
                          <button className="btn btn-icon btn-ghost" title="تعديل" onClick={() => openForm(w)}>✏️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {modalType === 'form' && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModal(); }}>
            <div className="modal">
              <div className="modal-header">
                <h3>{activeWarehouse ? 'تعديل بيانات المخزن' : 'إضافة مخزن جديد'}</h3>
                <button className="modal-close" onClick={closeModal}>✕</button>
              </div>
              <div className="modal-body">
                <form id="warehouseForm" onSubmit={handleSave}>
                  <div className="form-group">
                    <label>اسم المخزن *</label>
                    <input className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>الفرع التابع له *</label>
                    <select className="form-control" value={formData.branchId} onChange={e => setFormData({...formData, branchId: e.target.value})} required>
                      <option value="">-- اختر الفرع --</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>الموقع / العنوان</label>
                    <input className="form-control" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>مخزن رئيسي للفرع</label>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={formData.isMain} onChange={e => setFormData({...formData, isMain: e.target.checked})} />
                      <span className="toggle-slider"></span>
                    </label>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '5px' }}>
                      المخزن الرئيسي هو الذي يتم خصم/إضافة الكميات منه افتراضياً في هذا الفرع.
                    </p>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>إلغاء</button>
                <button type="submit" form="warehouseForm" className="btn btn-primary" disabled={saving}>
                  {saving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {modalType === 'stock' && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModal(); }}>
            <div className="modal" style={{ maxWidth: '800px', width: '90%' }}>
              <div className="modal-header">
                <h3>إدارة بضاعة مخزن: {activeWarehouse?.name}</h3>
                <button className="modal-close" onClick={closeModal}>✕</button>
              </div>
              <div className="modal-body">
                <div className="search-box" style={{ marginBottom: '20px' }}>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="ابحث عن منتج في هذا المخزن..." 
                    value={stockSearch}
                    onChange={(e) => {
                        setStockSearch(e.target.value);
                    }}
                  />
                </div>
                
                {loadingStock ? <Loader /> : (
                    <div className="table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>المنتج</th>
                                    <th>الكمية الحالية</th>
                                    <th>تعديل</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stockProducts.map(p => (
                                    <tr key={p.id}>
                                        <td>{p.name}</td>
                                        <td>
                                            {editingStock?.productId === p.id ? (
                                                <input 
                                                    type="number" 
                                                    className="form-control sm" 
                                                    defaultValue={p.stock} 
                                                    onBlur={(e) => handleUpdateStock(p.id, e.target.value)}
                                                    autoFocus
                                                />
                                            ) : (
                                                <span 
                                                    style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--color-primary)' }}
                                                    onClick={() => setEditingStock({ productId: p.id, quantity: p.stock })}
                                                >
                                                    {p.stock} {p.unitName}
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <button className="btn btn-sm btn-ghost" onClick={() => setEditingStock({ productId: p.id, quantity: p.stock })}>🔢</button>
                                        </td>
                                    </tr>
                                ))}
                                {stockProducts.length === 0 && (
                                    <tr><td colSpan="3" style={{ textAlign: 'center' }}>لا توجد منتجات مطابقة</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                
                <div style={{ marginTop: '20px', padding: '15px', background: 'var(--bg-hover)', borderRadius: '8px' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>
                        💡 <strong>نصيحة:</strong> لإضافة منتج جديد غير موجود في القائمة أعلاه، يرجى التوجه لصفحة "استلام المخزون" لعمل توريد رسمي، أو استخدم صفحة المنتجات.
                    </p>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-primary" onClick={closeModal}>إغلاق</button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default Warehouses;
