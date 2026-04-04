import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import ModalContainer from '../components/common/ModalContainer';

const Roles = () => {
  const { toast, confirm } = useGlobalUI();
  const [data, setData] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [activeRole, setActiveRole] = useState(null);
  const [form, setForm] = useState({ name: '', permissions: [] });
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesData, permsData] = await Promise.all([
        Api.getRolesFull(),
        Api.getPermissions()
      ]);
      setData(rolesData);
      setPermissions(permsData);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openForm = (role = null) => {
    if (role) {
      setActiveRole(role);
      setForm({
        name: role.name.replace('ROLE_', ''),
        permissions: role.permissions || []
      });
    } else {
      setActiveRole(null);
      setForm({ name: '', permissions: [] });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setActiveRole(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) {
      toast('يرجى تحديد اسم الدور', 'warning');
      return;
    }

    setSaving(true);
    try {
      if (activeRole) {
        await Api.updateRole(activeRole.id, form);
        toast('تم تحديث الدور بنجاح', 'success');
      } else {
        await Api.createRole(form);
        toast('تم إضافة الدور بنجاح', 'success');
      }
      closeModal();
      loadData();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (role) => {
    if (role.name === 'ROLE_ADMIN') {
        toast('لا يمكن حذف دور المشرف الرئيسي', 'error');
        return;
    }

    confirm(`سيتم حذف الدور "${role.name}" نهائياً. هل أنت متأكد؟`, async () => {
      try {
        await Api.deleteRole(role.id);
        toast('تم حذف الدور بنجاح', 'success');
        loadData();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  };

  const togglePermission = (perm) => {
    const newPerms = form.permissions.includes(perm)
      ? form.permissions.filter(p => p !== perm)
      : [...form.permissions, perm];
    setForm({ ...form, permissions: newPerms });
  };

  return (
    <>
      <div className="page-section">
        <div className="card">
          <div className="card-header">
            <h3>🔑 إدارة الأدوار والصلاحيات</h3>
            <button className="btn btn-primary" onClick={() => openForm()}>
              <span>+</span> إضافة دور جديد
            </button>
          </div>
          <div className="card-body no-padding">
            <div className="table-wrapper">
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>جاري التحميل...</div>
              ) : data.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🔑</div>
                  <h4>لا يوجد أدوار معرفة</h4>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>الدور</th>
                      <th>الصلاحيات المنوطة</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((r, i) => (
                      <tr key={r.id}>
                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className={`badge ${r.name.includes('ADMIN') ? 'badge-primary' : 'badge-info'}`} style={{ fontSize: '0.9rem', padding: '6px 12px' }}>
                              {r.name.replace('ROLE_', '')}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {r.permissions.length > 0 ? (
                              r.permissions.map(p => (
                                <span key={p} className="badge badge-ghost" style={{ fontSize: '0.75rem', opacity: 0.8 }}>{p}</span>
                              ))
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>لا توجد صلاحيات</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button className="btn btn-icon btn-ghost" title="تعديل" onClick={() => openForm(r)}>✏️</button>
                            <button 
                                className="btn btn-icon btn-ghost" 
                                title="حذف" 
                                onClick={() => handleDelete(r)}
                                disabled={r.name === 'ROLE_ADMIN'}
                            >
                                🗑️
                            </button>
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
      </div>

      {showModal && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModal(); }}>
            <div className="modal" style={{ maxWidth: '650px' }}>
              <div className="modal-header">
                <h3>{activeRole ? 'تعديل الدور' : 'إضافة دور جديد'}</h3>
                <button className="modal-close" onClick={closeModal}>✕</button>
              </div>
              <div className="modal-body">
                <form id="roleForm" onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>اسم الدور *</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>ROLE_</span>
                      <input 
                        className="form-control" 
                        placeholder="ADMIN, MANAGER, CASHIER..." 
                        value={form.name} 
                        onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase().replace(/\s+/g, '_') })} 
                        required 
                        disabled={activeRole?.name === 'ROLE_ADMIN'}
                      />
                    </div>
                    <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                      سيتم تحويل الاسم تلقائياً إلى حروف كبيرة وإضافة ROLE_ كبادئة.
                    </small>
                  </div>

                  <div className="form-group">
                    <label>الصلاحيات ({form.permissions.length})</label>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr', 
                        gap: '10px', 
                        maxHeight: '300px', 
                        overflowY: 'auto', 
                        padding: '10px',
                        background: 'rgba(0,0,0,0.02)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)'
                    }}>
                      {permissions.map(p => (
                        <label 
                            key={p} 
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                cursor: 'pointer',
                                padding: '6px',
                                borderRadius: '4px'
                            }}
                            className={form.permissions.includes(p) ? 'bg-primary-light' : ''}
                        >
                          <input 
                            type="checkbox" 
                            checked={form.permissions.includes(p)} 
                            onChange={() => togglePermission(p)}
                            style={{ accentColor: 'var(--accent-primary)' }}
                          />
                          <span style={{ fontSize: '0.85rem' }}>{p}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>إلغاء</button>
                <button type="submit" form="roleForm" className="btn btn-primary" disabled={saving}>
                  {saving ? 'جاري الحفظ...' : activeRole ? 'تحديث الدور' : 'إنشاء الدور'}
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .bg-primary-light {
            background: rgba(52, 152, 219, 0.05);
        }
      `}} />
    </>
  );
};

export default Roles;
