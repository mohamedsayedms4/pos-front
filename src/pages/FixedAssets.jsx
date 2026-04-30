import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import StatTile from '../components/common/StatTile';

const FixedAssets = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast, confirm } = useGlobalUI();
  const [searchParams] = useSearchParams();

  // Branch & Warehouse Selection
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [branches, setBranches] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const isAdmin = Api.isAdminOrBranchManager();

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: '',
    currentValue: '',
    depreciationRate: 0,
    status: 'ACTIVE',
    branchId: '',
    warehouseId: ''
  });

  const statusOptions = [
    { id: 'ACTIVE', label: 'نشط / في الخدمة', color: 'var(--metro-green)' },
    { id: 'UNDER_MAINTENANCE', label: 'تحت الصيانة', color: 'var(--metro-orange)' },
    { id: 'DISPOSED', label: 'تم التخلص منه', color: 'var(--metro-rose)' },
    { id: 'WRITTEN_OFF', label: 'هالك / خارج القيمة', color: 'var(--text-dim)' }
  ];

  useEffect(() => {
    const user = Api._getUser();
    const branchFromUrl = searchParams.get('branchId');

    if (branchFromUrl) {
      setSelectedBranchId(branchFromUrl);
    } else if (user?.branchId) {
      setSelectedBranchId(user.branchId);
    }

    loadInitialData();
  }, []);

  useEffect(() => {
    loadAssets();
  }, [selectedBranchId, selectedWarehouseId]);

  useEffect(() => {
    if (selectedBranchId) {
        Api._request(`/branches/${selectedBranchId}/warehouses`).then(res => setWarehouses(res.data || [])).catch(() => {});
    } else {
        setWarehouses([]);
    }
  }, [selectedBranchId]);

  const loadInitialData = async () => {
    if (isAdmin) {
      try {
        const res = await Api._request('/branches');
        setBranches(res.data || []);
      } catch (err) {}
    }
  };

  const loadAssets = async () => {
    setLoading(true);
    try {
      const res = await Api.getFixedAssets(selectedBranchId, selectedWarehouseId);
      setAssets(res || []);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { 
          ...form, 
          branchId: form.branchId || selectedBranchId,
          warehouseId: form.warehouseId || null
      };
      
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
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleEdit = (asset) => {
    setEditingId(asset.id);
    setForm({
      name: asset.name,
      code: asset.code,
      description: asset.description || '',
      purchaseDate: asset.purchaseDate,
      purchasePrice: asset.purchasePrice,
      currentValue: asset.currentValue,
      depreciationRate: asset.depreciationRate || 0,
      status: asset.status,
      branchId: asset.branchId,
      warehouseId: asset.warehouseId || ''
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    confirm('هل أنت متأكد من حذف هذا الأصل الثابت؟ لا يمكن التراجع عن هذا الإجراء.', async () => {
        try {
            await Api.deleteFixedAsset(id);
            toast('تم حذف الأصل بنجاح', 'success');
            loadAssets();
        } catch (err) {
            toast(err.message, 'error');
        }
    });
  };

  const resetForm = () => {
      setEditingId(null);
      setForm({
          name: '',
          code: '',
          description: '',
          purchaseDate: new Date().toISOString().split('T')[0],
          purchasePrice: '',
          currentValue: '',
          depreciationRate: 0,
          status: 'ACTIVE',
          branchId: selectedBranchId,
          warehouseId: ''
      });
  };

  const totalPurchaseValue = assets.reduce((sum, a) => sum + (a.purchasePrice || 0), 0);
  const totalCurrentValue = assets.reduce((sum, a) => sum + (a.currentValue || 0), 0);

  return (
    <div className="page-section anim-fade-in">
      <div className="stats-grid mb-4">
        <StatTile
          id="assets_total_purchase"
          label="إجمالي قيمة الشراء"
          value={`${totalPurchaseValue.toLocaleString()} ج.م`}
          icon="🏦"
          defaults={{ color: 'blue', size: 'tile-wd-sm' }}
        />
        <StatTile
          id="assets_total_current"
          label="القيمة الحالية الدفترية"
          value={`${totalCurrentValue.toLocaleString()} ج.م`}
          icon="📈"
          defaults={{ color: 'emerald', size: 'tile-wd-sm' }}
        />
        <StatTile
          id="assets_count"
          label="عدد الأصول"
          value={`${assets.length} أصل`}
          icon="📦"
          defaults={{ color: 'purple', size: 'tile-sq-sm' }}
        />
      </div>

      <div className="card">
        <div className="card-header">
          <h3>🏢 إدارة الأصول الثابتة</h3>
          <div className="toolbar">
            <div style={{ display: 'flex', gap: '10px' }}>
              {isAdmin && (
                  <select className="form-control" value={selectedBranchId} onChange={(e) => { setSelectedBranchId(e.target.value); setSelectedWarehouseId(''); }} style={{ width: '150px', height: '40px' }}>
                    <option value="">جميع الفروع</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
              )}
              <select className="form-control" value={selectedWarehouseId} onChange={(e) => setSelectedWarehouseId(e.target.value)} style={{ width: '150px', height: '40px' }} disabled={!selectedBranchId}>
                <option value="">جميع المخازن</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
                <span>+</span> إضافة أصل جديد
              </button>
            </div>
          </div>
        </div>

        <div className="card-body no-padding">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>الكود</th>
                  <th>اسم الأصل</th>
                  <th style={{ width: '120px' }}>تاريخ الشراء</th>
                  <th style={{ width: '130px' }}>سعر الشراء</th>
                  <th style={{ width: '130px' }}>القيمة الحالية</th>
                  <th style={{ width: '150px' }}>الموقع</th>
                  <th style={{ width: '140px' }}>الحالة</th>
                  <th style={{ width: '120px' }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" style={{ padding: '80px 0' }}><Loader message="جاري تحميل سجل الأصول..." /></td></tr>
                ) : assets.length === 0 ? (
                  <tr><td colSpan="8" style={{ padding: '100px 0', textAlign: 'center' }}>
                      <div style={{ fontSize: '3rem', opacity: 0.2 }}>🔍</div>
                      <div style={{ color: 'var(--text-muted)', marginTop: '10px' }}>لا توجد أصول مسجلة حالياً</div>
                  </td></tr>
                ) : (
                  assets.map(asset => {
                    const status = statusOptions.find(s => s.id === asset.status) || { label: asset.status, color: 'var(--text-dim)' };
                    return (
                        <tr key={asset.id} className="anim-slide-in">
                            <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{asset.code}</td>
                            <td>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{asset.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{asset.description}</div>
                                </div>
                            </td>
                            <td>{new Date(asset.purchaseDate).toLocaleDateString('ar-EG')}</td>
                            <td style={{ fontWeight: 'bold' }}>{asset.purchasePrice?.toLocaleString()} ج.م</td>
                            <td style={{ color: 'var(--metro-green)', fontWeight: 'bold' }}>{asset.currentValue?.toLocaleString()} ج.م</td>
                            <td>
                                <div style={{ fontSize: '0.85rem' }}>
                                    <div>📍 {asset.branchName}</div>
                                    {asset.warehouseName && <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>🏠 {asset.warehouseName}</div>}
                                </div>
                            </td>
                            <td>
                                <span className="badge" style={{ background: status.color + '22', color: status.color, border: '1px solid ' + status.color + '44' }}>
                                    {status.label}
                                </span>
                            </td>
                            <td>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <button className="btn btn-sm btn-ghost" onClick={() => handleEdit(asset)}>تعديل</button>
                                    <button className="btn btn-sm btn-ghost-danger" onClick={() => handleDelete(asset.id)}>حذف</button>
                                </div>
                            </td>
                        </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <ModalContainer>
          <div className="modal-overlay active anim-fade-in" onClick={() => setShowModal(false)} style={{ zIndex: 100000 }}>
            <div className="modal-content anim-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                <div className="modal-header">
                    <h2>{editingId ? '📝 تعديل بيانات أصل' : '🏗️ إضافة أصل ثابت جديد'}</h2>
                    <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body" style={{ padding: '25px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>اسم الأصل الثابت</label>
                            <input type="text" className="form-control" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="مثال: جهاز تكييف، شاحنة نقل، مكتب خشبي..." />
                        </div>
                        
                        <div className="form-group">
                            <label>كود الأصل / السيريال</label>
                            <input type="text" className="form-control" required value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="ASSET-001" />
                        </div>

                        <div className="form-group">
                            <label>الحالة التشغيلية</label>
                            <select className="form-control" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                                {statusOptions.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>تاريخ الشراء</label>
                            <input type="date" className="form-control" required value={form.purchaseDate} onChange={e => setForm({...form, purchaseDate: e.target.value})} />
                        </div>

                        <div className="form-group">
                            <label>نسبة الإهلاك السنوي (%)</label>
                            <input type="number" step="0.1" className="form-control" value={form.depreciationRate} onChange={e => setForm({...form, depreciationRate: e.target.value})} />
                        </div>

                        <div className="form-group">
                            <label>سعر الشراء الاصلي</label>
                            <input type="number" className="form-control" required value={form.purchasePrice} onChange={e => setForm({...form, purchasePrice: e.target.value})} placeholder="0.00" />
                        </div>

                        <div className="form-group">
                            <label>القيمة الحالية التقديرية</label>
                            <input type="number" className="form-control" required value={form.currentValue} onChange={e => setForm({...form, currentValue: e.target.value})} placeholder="0.00" />
                        </div>

                        <div className="form-group">
                            <label>الفرع</label>
                            <select className="form-control" required value={form.branchId} onChange={e => setForm({...form, branchId: e.target.value, warehouseId: ''})}>
                                <option value="">اختر الفرع...</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>المخزن (اختياري)</label>
                            <select className="form-control" value={form.warehouseId} onChange={e => setForm({...form, warehouseId: e.target.value})} disabled={!form.branchId}>
                                <option value="">أصل عام بالفرع</option>
                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>ملاحظات إضافية</label>
                            <textarea className="form-control" rows="2" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="أدخل أي تفاصيل إضافية عن الأصل هنا..."></textarea>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>إلغاء</button>
                        <button type="submit" className="btn btn-primary">{editingId ? 'تحديث البيانات' : 'إضافة الأصل'}</button>
                    </div>
                </form>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default FixedAssets;
