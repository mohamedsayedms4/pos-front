import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import ModalContainer from '../components/common/ModalContainer';
import Loader from '../components/common/Loader';
import StatTile from '../components/common/StatTile';

const Branches = () => {
  const navigate = useNavigate();
  const { toast, confirm } = useGlobalUI();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState(null); // 'form', null
  const [activeBranch, setActiveBranch] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    phone: '',
    type: 'RETAIL',
    enabled: true,
    treasuryLinkType: 'MANUAL'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await Api.getBranches();
      setData(res || []);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openForm = (branch = null) => {
    setActiveBranch(branch);
    if (branch) {
      setFormData({
        code: branch.code || '',
        name: branch.name || '',
        address: branch.address || '',
        phone: branch.phone || '',
        type: branch.type || 'RETAIL',
        enabled: branch.enabled ?? true,
        treasuryLinkType: branch.treasuryLinkType || 'MANUAL'
      });
    } else {
      setFormData({
        code: '',
        name: '',
        address: '',
        phone: '',
        type: 'RETAIL',
        enabled: true,
        treasuryLinkType: 'MANUAL'
      });
    }
    setModalType('form');
  };

  const closeModal = () => {
    setModalType(null);
    setActiveBranch(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (activeBranch) {
        await Api._request(`/branches/${activeBranch.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        toast('تم تحديث الفرع بنجاح', 'success');
      } else {
        await Api._request('/branches', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        toast('تم إضافة الفرع بنجاح', 'success');
      }
      closeModal();
      loadData();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id, name) => {
    confirm(`هل أنت متأكد من حذف الفرع "${name}"؟`, async () => {
      try {
        await Api._request(`/branches/${id}`, { method: 'DELETE' });
        toast('تم حذف الفرع بنجاح', 'success');
        loadData();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  };

  return (
    <div className="page-section" style={{ direction: 'rtl' }}>
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <StatTile
          id="br_count"
          label="إجمالي الفروع"
          value={data.length}
          icon="🏢"
          defaults={{ color: 'blue', size: 'tile-wd-sm', order: 1 }}
        />
        <StatTile
          id="br_retail"
          label="فروع تجزئة"
          value={data.filter(b => b.type === 'RETAIL').length}
          icon="🏪"
          defaults={{ color: 'emerald', size: 'tile-sq-sm', order: 2 }}
        />
        <StatTile
          id="br_online"
          label="المتجر الإلكتروني"
          value={data.filter(b => b.type === 'ONLINE').length}
          icon="🌐"
          defaults={{ color: 'magenta', size: 'tile-sq-sm', order: 3 }}
        />
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>🏢 إدارة الفروع</h3>
          <button className="btn btn-primary" onClick={() => openForm()}>
            <span>+</span> إضافة فرع جديد
          </button>
        </div>
        <div className="card-body no-padding">
          <div className="table-wrapper">
            {loading ? (
              <Loader message="جاري تحميل الفروع..." />
            ) : data.length === 0 ? (
              <div className="empty-state">
                <h4>لا توجد فروع مضافة</h4>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>الفرع</th>
                    <th>النوع</th>
                    <th>العنوان</th>
                    <th>الهاتف</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((b, i) => (
                    <tr key={b.id}>
                      <td>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{b.name}</td>
                      <td>
                        <span className={`badge ${b.type === 'ONLINE' ? 'badge-info' : 'badge-secondary'}`}>
                          {b.type === 'ONLINE' ? 'متجر إلكتروني' : b.type === 'WAREHOUSE_ONLY' ? 'مخزن فقط' : 'فرع تجزئة'}
                        </span>
                      </td>
                      <td>{b.address || '—'}</td>
                      <td>{b.phone || '—'}</td>
                      <td>
                        <span className={`badge ${b.enabled ? 'badge-success' : 'badge-danger'}`}>
                          {b.enabled ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-icon btn-ghost" title="إدارة الفرع" onClick={() => navigate(`/branches/${b.id}/manage`)}>⚙️</button>
                          <button className="btn btn-icon btn-ghost" title="تعديل" onClick={() => openForm(b)}>✏️</button>
                          <button className="btn btn-icon btn-ghost" title="حذف" onClick={() => handleDelete(b.id, b.name)}>🗑️</button>
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
                <h3>{activeBranch ? 'تعديل بيانات الفرع' : 'إضافة فرع جديد'}</h3>
                <button className="modal-close" onClick={closeModal}>✕</button>
              </div>
              <div className="modal-body">
                <form id="branchForm" onSubmit={handleSave}>
                  <div className="form-group">
                    <label>كود الفرع * (فريد)</label>
                    <input className="form-control" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} required placeholder="مثال: BR-001" />
                  </div>
                  <div className="form-group">
                    <label>اسم الفرع *</label>
                    <input className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>نوع الفرع</label>
                    <select className="form-control" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                      <option value="RETAIL">فرع تجزئة (بيع مباشر)</option>
                      <option value="WAREHOUSE_ONLY">مخزن فقط</option>
                      <option value="ONLINE">متجر إلكتروني</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>العنوان</label>
                    <input className="form-control" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>الهاتف</label>
                    <input className="form-control" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>نظام ربط الخزينة</label>
                    <select className="form-control" value={formData.treasuryLinkType} onChange={e => setFormData({...formData, treasuryLinkType: e.target.value})}>
                      <option value="MANUAL">يدوي (يتم توريد المبالغ للمركزية يدوياً)</option>
                      <option value="AUTOMATIC">تلقائي (تسميع فوري في الخزينة المركزية)</option>
                    </select>
                    <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                      النظام التلقائي يعكس كل حركات الفرع في الخزينة الرئيسية لحظياً.
                    </small>
                  </div>
                  <div className="form-group">
                    <label>نشط</label>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={formData.enabled} onChange={e => setFormData({...formData, enabled: e.target.checked})} />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>إلغاء</button>
                <button type="submit" form="branchForm" className="btn btn-primary" disabled={saving}>
                  {saving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default Branches;
