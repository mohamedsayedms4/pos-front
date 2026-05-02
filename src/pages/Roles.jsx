import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import '../styles/pages/RolesPremium.css';

const Roles = () => {
  const { toast, confirm } = useGlobalUI();
  const [data, setData] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [activeRole, setActiveRole] = useState(null);
  const [form, setForm] = useState({ name: '', permissions: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesData, permsData] = await Promise.all([Api.getRolesFull(), Api.getPermissions()]);
      setData(rolesData); setPermissions(permsData);
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const openForm = (role = null) => {
    if (role) {
      setActiveRole(role);
      setForm({ name: role.name.replace('ROLE_', ''), permissions: role.permissions || [] });
    } else {
      setActiveRole(null); setForm({ name: '', permissions: [] });
    }
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setActiveRole(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (activeRole) { await Api.updateRole(activeRole.id, form); toast('تم التحديث بنجاح', 'success'); }
      else { await Api.createRole(form); toast('تم الإضافة بنجاح', 'success'); }
      closeModal(); loadData();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = (role) => {
    if (role.name === 'ROLE_ADMIN') return toast('لا يمكن حذف دور المشرف الرئيسي', 'error');
    confirm(`حذف دور "${role.name}"؟`, async () => {
      try { await Api.deleteRole(role.id); toast('تم الحذف', 'success'); loadData(); }
      catch (err) { toast(err.message, 'error'); }
    });
  };

  const togglePermission = (perm) => {
    const newPerms = form.permissions.includes(perm) ? form.permissions.filter(p => p !== perm) : [...form.permissions, perm];
    setForm({ ...form, permissions: newPerms });
  };

  return (
    <div className="roles-container">
      {/* 1. Header */}
      <div className="rol-header-row">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="rol-breadcrumbs">
            <Link to="/dashboard">الرئيسية</Link> / <span>الأمان</span>
          </div>
          <h1>الأدوار والصلاحيات</h1>
        </div>
        <div className="rol-header-actions">
          <button className="rol-btn-premium rol-btn-blue" onClick={() => openForm()}>
            <i className="fas fa-plus-circle"></i> إضافة دور جديد
          </button>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="rol-stats-grid">
        <div className="rol-stat-card">
          <div className="rol-stat-info">
            <h4>إجمالي الأدوار</h4>
            <div className="rol-stat-value">{data.length}</div>
          </div>
          <div className="rol-stat-visual"><div className="rol-stat-icon icon-blue"><i className="fas fa-key"></i></div></div>
        </div>
        <div className="rol-stat-card">
          <div className="rol-stat-info">
            <h4>صلاحيات النظام</h4>
            <div className="rol-stat-value" style={{ color: 'var(--rol-accent-purple)' }}>{permissions.length}</div>
          </div>
          <div className="rol-stat-visual"><div className="rol-stat-icon icon-purple"><i className="fas fa-user-shield"></i></div></div>
        </div>
        <div className="rol-stat-card">
          <div className="rol-stat-info">
            <h4>أدوار مخصصة</h4>
            <div className="rol-stat-value" style={{ color: 'var(--rol-accent-amber)' }}>{data.filter(r => !r.name.includes('ADMIN')).length}</div>
          </div>
          <div className="rol-stat-visual"><div className="rol-stat-icon icon-amber"><i className="fas fa-users-cog"></i></div></div>
        </div>
        <div className="rol-stat-card">
          <div className="rol-stat-info">
            <h4>أدوار إدارية</h4>
            <div className="rol-stat-value" style={{ color: 'var(--rol-accent-green)' }}>{data.filter(r => r.name.includes('ADMIN')).length}</div>
          </div>
          <div className="rol-stat-visual"><div className="rol-stat-icon icon-green"><i className="fas fa-crown"></i></div></div>
        </div>
      </div>

      {/* 3. Table Card */}
      <div className="rol-table-card">
        <div className="rol-table-container">
          {loading ? (
            <div style={{ padding: '60px' }}><Loader message="جاري جلب الأدوار..." /></div>
          ) : (
            <table className="rol-table">
              <thead>
                <tr>
                  <th>الدور</th>
                  <th>الصلاحيات</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {data.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: r.name.includes('ADMIN') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)', color: r.name.includes('ADMIN') ? 'var(--rol-accent-green)' : 'var(--rol-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}><i className={r.name.includes('ADMIN') ? 'fas fa-shield-alt' : 'fas fa-user-tag'}></i></div>
                        <div><div style={{ fontWeight: 800 }}>{r.name.replace('ROLE_', '')}</div><div style={{ fontSize: '0.7rem', color: 'var(--rol-text-secondary)' }}># {r.id}</div></div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '600px' }}>
                        {r.permissions.map(p => (
                          <span key={p} className="rol-type-badge badge-blue" style={{ fontSize: '0.6rem' }}>{p}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="rol-actions">
                        <button className="rol-action-btn" title="تعديل" onClick={() => openForm(r)}><i className="fas fa-edit"></i></button>
                        <button className="rol-action-btn delete" title="حذف" disabled={r.name === 'ROLE_ADMIN'} onClick={() => handleDelete(r)}><i className="fas fa-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <ModalContainer>
          <div className="rol-modal-overlay" onClick={closeModal}>
            <div className="rol-modal" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
              <div className="rol-modal-header">
                <h3>{activeRole ? 'تعديل الدور' : 'إضافة دور جديد'}</h3>
                <button className="rol-modal-close" onClick={closeModal}>✕</button>
              </div>
              <div className="rol-modal-body">
                <form id="rolForm" onSubmit={handleSubmit}>
                   <div className="rol-form-group">
                      <label>اسم الدور (English Only) *</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, color: 'var(--rol-text-secondary)' }}>ROLE_</span>
                        <input className="rol-input" required placeholder="MANAGER, CASHIER..." value={form.name} onChange={e => setForm({...form, name: e.target.value.toUpperCase().replace(/\s+/g, '_')})} disabled={activeRole?.name === 'ROLE_ADMIN'} />
                      </div>
                   </div>
                   <div className="rol-form-group" style={{ marginTop: '24px' }}>
                      <label>تعيين الصلاحيات ({form.permissions.length})</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', maxHeight: '300px', overflowY: 'auto', padding: '15px', background: 'rgba(99,102,241,0.05)', borderRadius: '16px', border: '1px solid var(--rol-border)' }}>
                        {permissions.map(p => (
                          <label key={p} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '6px', borderRadius: '8px', background: form.permissions.includes(p) ? 'rgba(99, 102, 241, 0.1)' : 'transparent' }}>
                            <input type="checkbox" checked={form.permissions.includes(p)} onChange={() => togglePermission(p)} hidden />
                            <i className={form.permissions.includes(p) ? 'fas fa-check-square' : 'far fa-square'} style={{ color: form.permissions.includes(p) ? 'var(--rol-accent-blue)' : 'inherit' }}></i>
                            {p}
                          </label>
                        ))}
                      </div>
                   </div>
                </form>
              </div>
              <div className="rol-modal-footer">
                <button type="button" className="rol-btn-ghost" onClick={closeModal}>إلغاء</button>
                <button type="submit" form="rolForm" className="rol-btn-primary" disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ الدور'}</button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default Roles;
