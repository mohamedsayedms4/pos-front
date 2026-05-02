import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import '../styles/pages/FixedAssetsPremium.css';

const CustomSelect = ({ options, value, onChange, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value) || options[0];
  return (
    <div className="ast-custom-select-container">
      <div className={`ast-custom-select-header ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        <i className={`fas ${icon} icon-start`}></i>
        <span className="selected-text">{selectedOption.label}</span>
        <i className="fas fa-chevron-down icon-end"></i>
      </div>
      {isOpen && (
        <>
          <div className="ast-custom-select-overlay" onClick={() => setIsOpen(false)}></div>
          <div className="ast-custom-select-dropdown">
            {options.map(opt => (
              <div key={opt.value} className={`ast-custom-select-item ${opt.value === value ? 'active' : ''}`} onClick={() => { onChange(opt.value); setIsOpen(false); }}>
                {opt.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const FixedAssets = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast, confirm } = useGlobalUI();
  const [searchParams] = useSearchParams();

  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [branches, setBranches] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const isAdmin = Api.isAdminOrBranchManager();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', description: '', purchaseDate: new Date().toISOString().split('T')[0], purchasePrice: '', currentValue: '', depreciationRate: 0, status: 'ACTIVE', branchId: '', warehouseId: '' });

  const statusOptions = [
    { id: 'ACTIVE', label: 'نشط / في الخدمة', icon: 'fa-check-circle', color: '#10b981' },
    { id: 'UNDER_MAINTENANCE', label: 'تحت الصيانة', icon: 'fa-tools', color: '#f59e0b' },
    { id: 'DISPOSED', label: 'تم التخلص منه', icon: 'fa-trash-alt', color: '#f43f5e' },
    { id: 'WRITTEN_OFF', label: 'هالك', icon: 'fa-ban', color: '#94a3b8' }
  ];

  useEffect(() => {
    const user = Api._getUser();
    const branchFromUrl = searchParams.get('branchId');
    if (branchFromUrl) setSelectedBranchId(branchFromUrl);
    else if (user?.branchId) setSelectedBranchId(user.branchId);

    if (isAdmin) Api._request('/branches').then(res => setBranches(res.data || [])).catch(() => {});
  }, [isAdmin, searchParams]);

  useEffect(() => { loadAssets(); }, [selectedBranchId, selectedWarehouseId]);

  useEffect(() => {
    if (selectedBranchId) Api._request(`/branches/${selectedBranchId}/warehouses`).then(res => setWarehouses(res.data || [])).catch(() => {});
    else setWarehouses([]);
  }, [selectedBranchId]);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const res = await Api.getFixedAssets(selectedBranchId, selectedWarehouseId);
      setAssets(res || []);
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form, branchId: form.branchId || selectedBranchId, warehouseId: form.warehouseId || null };
      if (editingId) {
        await Api.updateFixedAsset(editingId, data);
        toast('تم تحديث بيانات الأصل بنجاح', 'success');
      } else {
        await Api.createFixedAsset(data);
        toast('تم إضافة الأصل الثابت بنجاح', 'success');
      }
      setShowModal(false);
      resetForm();
      loadAssets();
    } catch (err) { toast(err.message, 'error'); }
  };

  const handleEdit = (asset) => {
    setEditingId(asset.id);
    setForm({ name: asset.name, code: asset.code, description: asset.description || '', purchaseDate: asset.purchaseDate, purchasePrice: asset.purchasePrice, currentValue: asset.currentValue, depreciationRate: asset.depreciationRate || 0, status: asset.status, branchId: asset.branchId, warehouseId: asset.warehouseId || '' });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    confirm('هل أنت متأكد من حذف هذا الأصل الثابت؟', async () => {
        try {
            await Api.deleteFixedAsset(id);
            toast('تم حذف الأصل بنجاح', 'success');
            loadAssets();
        } catch (err) { toast(err.message, 'error'); }
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: '', code: '', description: '', purchaseDate: new Date().toISOString().split('T')[0], purchasePrice: '', currentValue: '', depreciationRate: 0, status: 'ACTIVE', branchId: selectedBranchId, warehouseId: '' });
  };

  const totalPurchaseValue = assets.reduce((sum, a) => sum + (a.purchasePrice || 0), 0);
  const totalCurrentValue = assets.reduce((sum, a) => sum + (a.currentValue || 0), 0);
  const maintenanceCount = assets.filter(a => a.status === 'UNDER_MAINTENANCE').length;

  return (
    <div className="fixed-assets-container">
      {/* 1. Header */}
      <div className="ast-header-row">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="ast-breadcrumbs">
            <Link to="/dashboard">الرئيسية</Link> / <span>الأصول</span>
          </div>
          <h1>الأصول الثابتة</h1>
        </div>
        <div className="ast-header-actions">
          <button className="ast-btn-premium ast-btn-blue" onClick={() => { resetForm(); setShowModal(true); }}>
            <i className="fas fa-plus"></i> إضافة أصل جديد
          </button>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="ast-stats-grid">
        <div className="ast-stat-card">
          <div className="ast-stat-info">
            <h4>إجمالي قيمة الشراء</h4>
            <div className="ast-stat-value">{totalPurchaseValue.toLocaleString('ar-EG')} <span style={{fontSize: '0.8rem'}}>ج.م</span></div>
          </div>
          <div className="ast-stat-visual">
            <div className="ast-stat-icon icon-blue">
              <i className="fas fa-university"></i>
            </div>
          </div>
        </div>
        <div className="ast-stat-card">
          <div className="ast-stat-info">
            <h4>القيمة الحالية</h4>
            <div className="ast-stat-value">{totalCurrentValue.toLocaleString('ar-EG')} <span style={{fontSize: '0.8rem'}}>ج.م</span></div>
          </div>
          <div className="ast-stat-visual">
            <div className="ast-stat-icon icon-green">
              <i className="fas fa-chart-line"></i>
            </div>
          </div>
        </div>
        <div className="ast-stat-card">
          <div className="ast-stat-info">
            <h4>عدد الأصول</h4>
            <div className="ast-stat-value">{assets.length} <span style={{fontSize: '0.8rem'}}>أصل</span></div>
          </div>
          <div className="ast-stat-visual">
            <div className="ast-stat-icon icon-purple">
              <i className="fas fa-cubes"></i>
            </div>
          </div>
        </div>
        <div className="ast-stat-card">
          <div className="ast-stat-info">
            <h4>تحت الصيانة</h4>
            <div className="ast-stat-value">{maintenanceCount} <span style={{fontSize: '0.8rem'}}>أصل</span></div>
          </div>
          <div className="ast-stat-visual">
            <div className="ast-stat-icon icon-amber">
              <i className="fas fa-tools"></i>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Toolbar */}
      <div className="ast-toolbar-card">
        <div className="ast-toolbar-left">
          {isAdmin && (
            <CustomSelect 
              icon="fa-store"
              value={selectedBranchId}
              onChange={val => { setSelectedBranchId(val); setSelectedWarehouseId(''); }}
              options={[{ value: '', label: 'جميع الفروع' }, ...branches.map(b => ({ value: b.id.toString(), label: b.name }))]}
            />
          )}
          <CustomSelect 
            icon="fa-warehouse"
            value={selectedWarehouseId}
            onChange={setSelectedWarehouseId}
            options={[{ value: '', label: 'جميع المخازن' }, ...warehouses.map(w => ({ value: w.id.toString(), label: w.name }))]}
          />
        </div>
      </div>

      {/* 4. Table Card */}
      <div className="ast-table-card">
        <div className="ast-table-container">
          {loading ? (
            <div style={{ padding: '40px' }}><Loader message="جاري التحميل..." /></div>
          ) : assets.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--ast-text-secondary)' }}>
              <i className="fas fa-cubes" style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}></i>
              <h3>لا توجد أصول مسجلة</h3>
            </div>
          ) : (
            <table className="ast-table">
              <thead>
                <tr>
                  <th>الأصل الثابت</th>
                  <th>تاريخ الشراء</th>
                  <th>سعر الشراء</th>
                  <th>القيمة الحالية</th>
                  <th>الموقع</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {assets.map(asset => {
                  const status = statusOptions.find(s => s.id === asset.status) || statusOptions[0];
                  return (
                    <tr key={asset.id}>
                      <td>
                        <div style={{ fontWeight: 800 }}>{asset.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--ast-text-secondary)' }}>{asset.code}</div>
                      </td>
                      <td>{new Date(asset.purchaseDate).toLocaleDateString('ar-EG')}</td>
                      <td style={{ fontWeight: 700 }}>{asset.purchasePrice?.toLocaleString('ar-EG')} ج.م</td>
                      <td style={{ color: 'var(--ast-accent-green)', fontWeight: 800 }}>{asset.currentValue?.toLocaleString('ar-EG')} ج.m</td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>
                          <div>📍 {asset.branchName}</div>
                          <div style={{ color: 'var(--ast-text-secondary)', fontSize: '0.7rem' }}>{asset.warehouseName || 'أصل عام'}</div>
                        </div>
                      </td>
                      <td>
                        <span className="ast-type-badge" style={{ background: status.color + '15', color: status.color }}>
                          <i className={`fas ${status.icon}`}></i> {status.label}
                        </span>
                      </td>
                      <td>
                        <div className="ast-actions">
                          <button className="ast-action-btn" onClick={() => handleEdit(asset)} title="تعديل"><i className="fas fa-edit"></i></button>
                          <button className="ast-action-btn delete" onClick={() => handleDelete(asset.id)} title="حذف"><i className="fas fa-trash"></i></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <ModalContainer>
          <div className="ast-modal-overlay" onClick={(e) => { if (e.target.classList.contains('ast-modal-overlay')) setShowModal(false); }}>
            <div className="ast-modal" style={{ maxWidth: '800px' }}>
              <div className="ast-modal-header">
                <h3>{editingId ? 'تعديل بيانات أصل' : 'إضافة أصل ثابت جديد'}</h3>
                <button className="ast-modal-close" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <div className="ast-modal-body">
                <form id="assetForm" onSubmit={handleSubmit}>
                  <div className="ast-form-group">
                    <label>اسم الأصل الثابت</label>
                    <input type="text" className="ast-input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="مثال: جهاز تكييف..." />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="ast-form-group">
                      <label>كود الأصل / السيريال</label>
                      <input type="text" className="ast-input" required value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
                    </div>
                    <div className="ast-form-group">
                      <label>الحالة التشغيلية</label>
                      <select className="ast-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                        {statusOptions.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="ast-form-group">
                      <label>تاريخ الشراء</label>
                      <input type="date" className="ast-input" required value={form.purchaseDate} onChange={e => setForm({...form, purchaseDate: e.target.value})} />
                    </div>
                    <div className="ast-form-group">
                      <label>نسبة الإهلاك السنوي (%)</label>
                      <input type="number" step="0.1" className="ast-input" value={form.depreciationRate} onChange={e => setForm({...form, depreciationRate: e.target.value})} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="ast-form-group">
                      <label>سعر الشراء</label>
                      <input type="number" className="ast-input" required value={form.purchasePrice} onChange={e => setForm({...form, purchasePrice: e.target.value})} />
                    </div>
                    <div className="ast-form-group">
                      <label>القيمة الحالية</label>
                      <input type="number" className="ast-input" required value={form.currentValue} onChange={e => setForm({...form, currentValue: e.target.value})} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="ast-form-group">
                      <label>الفرع</label>
                      <select className="ast-input" required value={form.branchId} onChange={e => setForm({...form, branchId: e.target.value, warehouseId: ''})}>
                        <option value="">اختر الفرع...</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div className="ast-form-group">
                      <label>المخزن (اختياري)</label>
                      <select className="ast-input" value={form.warehouseId} onChange={e => setForm({...form, warehouseId: e.target.value})} disabled={!form.branchId}>
                        <option value="">أصل عام بالفرع</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="ast-form-group">
                    <label>ملاحظات إضافية</label>
                    <textarea className="ast-textarea" rows="2" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                  </div>
                </form>
              </div>
              <div className="ast-modal-footer">
                <button type="button" className="ast-btn-ghost" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" form="assetForm" className="ast-btn-primary">{editingId ? 'تحديث البيانات' : 'إضافة الأصل'}</button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default FixedAssets;
