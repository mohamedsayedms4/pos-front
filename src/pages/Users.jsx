import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import StatTile from '../components/common/StatTile';

const Users = () => {
  const { toast, confirm } = useGlobalUI();
  const [data, setData] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const isAdmin = Api.isAdminOrBranchManager();

  // Pagination & Search state
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const pageSize = 10;

  // Modal State
  const [modalType, setModalType] = useState(null); // 'form', 'access', null
  const [activeUser, setActiveUser] = useState(null);

  // Add/Edit User Form
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', roles: [], enabled: true, profilePicture: '', branchId: '' });

  // Access Form
  const [accessForm, setAccessForm] = useState({ roles: [], permissions: [] });

  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const API_BASE_URL = 'https://posapi.digitalrace.net/api/v1'; // Standard base for image serving 

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadData(currentPage, pageSize, debouncedSearch, selectedBranchId);
  }, [currentPage, debouncedSearch, selectedBranchId]);

  const loadData = async (page = currentPage, size = pageSize, query = debouncedSearch, branchId = selectedBranchId) => {
    setLoading(true);
    try {
      const [usersRes, rolesData, permsData, branchesData] = await Promise.all([
        Api.getUsers(page, size, query, branchId),
        roles.length === 0 ? Api.getRoles().catch(() => []) : Promise.resolve(roles),
        permissions.length === 0 ? Api.getPermissions().catch(() => []) : Promise.resolve(permissions),
        branches.length === 0 ? Api.getBranches().catch(() => []) : Promise.resolve(branches)
      ]);

      setData(usersRes.items || usersRes.content || []);
      setTotalPages(usersRes.totalPages || 0);
      setTotalElements(usersRes.totalItems || usersRes.totalElements || 0);
      setCurrentPage(usersRes.currentPage ?? usersRes.number ?? 0);

      if (roles.length === 0) setRoles(rolesData);
      if (permissions.length === 0) setPermissions(permsData);
      if (branches.length === 0) setBranches(branchesData);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const openForm = () => {
    setUserForm({ name: '', email: '', password: '', roles: [], enabled: true, profilePicture: '', branchId: '' });
    setActiveUser(null);
    setModalType('form');
  };

  const openEditForm = (user) => {
    setUserForm({
      name: user.name,
      email: user.email,
      password: '', // Keep empty for security, only change if provided
      roles: user.roles || [],
      enabled: user.enabled,
      profilePicture: user.profilePicture || '',
      branchId: user.branchId || ''
    });
    setActiveUser(user);
    setModalType('form');
  };

  const openAccessForm = async (user) => {
    setSaving(true);
    try {
      const fullUser = await Api.getUser(user.id);
      setActiveUser(fullUser);
      setAccessForm({
        roles: fullUser.roles || [],
        permissions: fullUser.permissions || []
      });
      setModalType('access');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    setModalType(null);
    setActiveUser(null);
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email || (!activeUser && !userForm.password)) {
      toast('يرجى ملء جميع الحقول المطلوبة', 'warning');
      return;
    }

    setSaving(true);
    try {
      if (activeUser) {
        // Update
        const updateData = { ...userForm };
        if (!updateData.password) delete updateData.password; // Don't send empty password
        await Api.updateUser(activeUser.id, updateData, selectedFile);
        toast('تم تحديث بيانات المستخدم بنجاح', 'success');
      } else {
        // Create
        await Api.createUser(userForm, selectedFile);
        toast('تم إضافة المستخدم بنجاح', 'success');
      }
      closeModal();
      loadData();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAccess = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await Api.updateUserAccess(activeUser.id, accessForm);
      toast('تم تحديث الصلاحيات بنجاح', 'success');
      closeModal();
      loadData();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (id, enabled) => {
    try {
      await Api.setUserEnabled(id, enabled);
      loadData();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleDelete = (id, name) => {
    confirm(`سيتم حذف المستخدم "${name}" نهائياً`, async () => {
      try {
        await Api.deleteUser(id);
        toast('تم حذف المستخدم بنجاح', 'success');
        loadData();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  };

  return (
    <>
      <div className="page-section">
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          <StatTile
            id="usr_count"
            label="المستخدمين"
            value={totalElements}
            icon="👥"
            defaults={{ color: 'blue', size: 'tile-wd-sm', order: 1 }}
          />
          <StatTile
            id="usr_admins"
            label="مسؤول / مدير فرع"
            value={data.filter(u => u.roles && u.roles.some(r => r.includes('ADMIN') || r.includes('BRANCH_MANAGER'))).length}
            icon="🛡️"
            defaults={{ color: 'magenta', size: 'tile-sq-sm', order: 2 }}
          />
          <StatTile
            id="usr_active"
            label="نشط"
            value={data.filter(u => u.enabled).length}
            icon="✅"
            defaults={{ color: 'teal', size: 'tile-sq-sm', order: 3 }}
          />
        </div>

        <div className="card">
          <div className="card-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>👥 إدارة المستخدمين</h3>
            <div className="header-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', flex: '1 1 100%', justifyContent: 'flex-end', alignItems: 'center' }}>
              {isAdmin && (
                <select className="form-control" value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)} style={{ width: '150px', height: '40px' }}>
                  <option value="">جميع الفروع</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              )}
              <div className="search-input" style={{ flex: '1 1 200px', minWidth: '200px', maxWidth: '350px' }}>
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="بحث بالاسم أو البريد..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(0);
                  }}
                />
              </div>
              {Api.can('USER_WRITE') && (
                <button className="btn btn-primary" onClick={openForm}>
                  <span>+</span> إضافة مستخدم
                </button>
              )}
            </div>
          </div>
          <div className="card-body no-padding">
            <div className="table-wrapper">
              {loading ? (
                <Loader message="جاري تحميل قائمة المستخدمين..." />
              ) : data.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">👥</div>
                  <h4>لا يوجد مستخدمين</h4>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>المستخدم</th>
                      <th>البريد</th>
                      <th>الأدوار</th>
                      <th>الحالة</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((u, i) => (
                      <tr key={u.id}>
                        <td style={{ color: 'var(--text-muted)' }}>{(currentPage * pageSize) + i + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="user-avatar-wrapper">
                              {u.profilePicture ? (
                                <img src={`${API_BASE_URL}/products/images/${u.profilePicture}`} alt={u.name} className="user-avatar-img" />
                              ) : (
                                <div className="user-avatar-placeholder" style={{ background: (u.roles || []).some(r => r.includes('ADMIN')) ? 'var(--gradient-primary)' : (u.roles || []).some(r => r.includes('BRANCH_MANAGER')) ? 'linear-gradient(135deg,#d97706,#f59e0b)' : 'var(--gradient-emerald)' }}>
                                  {(u.name || 'U').charAt(0).toUpperCase()}
                                </div>
                              )}
                              {(u.roles || []).some(r => r.includes('ADMIN')) && <span className="admin-badge-dot" title="مسؤول النظام">⭐</span>}
                              {!(u.roles || []).some(r => r.includes('ADMIN')) && (u.roles || []).some(r => r.includes('BRANCH_MANAGER')) && <span className="admin-badge-dot" title="مدير فرع" style={{ background: '#d97706' }}>🏢</span>}
                            </div>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</span>
                          </div>
                        </td>
                        <td>{u.email}</td>
                        <td>
                          {(u.roles || []).map(r => (
                            <span key={r} className="badge badge-info" style={{ margin: '1px' }}>{r.replace('ROLE_', '')}</span>
                          ))}
                        </td>
                        <td>
                          <span className={`badge ${u.enabled ? 'badge-success' : 'badge-danger'}`}>
                            {u.enabled ? 'نشط' : 'معطل'}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            {Api.can('USER_WRITE') && <button className="btn btn-icon btn-ghost" title="تعديل البيانات" onClick={() => openEditForm(u)}>✏️</button>}
                            {Api.can('USER_WRITE') && (
                              <button className="btn btn-icon btn-ghost" title={u.enabled ? 'تعطيل' : 'تفعيل'} onClick={() => toggleEnabled(u.id, !u.enabled)}>
                                {u.enabled ? '🔒' : '🔓'}
                              </button>
                            )}
                            {Api.can('ROLE_WRITE') && <button className="btn btn-icon btn-ghost" title="الأدوار والصلاحيات" onClick={() => openAccessForm(u)}>🔑</button>}
                            {Api.can('USER_DELETE') && <button className="btn btn-icon btn-ghost" title="حذف" onClick={() => handleDelete(u.id, u.name)}>🗑️</button>}
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

        {totalPages > 1 && (
          <div className="pagination" style={{ marginTop: '10px' }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ width: 'auto', padding: '0 15px' }}
              disabled={currentPage === 0}
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              السابق
            </button>
            <button className="active">{currentPage + 1}</button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ width: 'auto', padding: '0 15px' }}
              disabled={currentPage >= totalPages - 1}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              التالي
            </button>
          </div>
        )}
      </div>

      {modalType === 'form' && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModal(); }}>
            <div className="modal">
              <div className="modal-header">
                <h3>{activeUser ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}</h3>
                <button className="modal-close" onClick={closeModal}>✕</button>
              </div>
              <div className="modal-body">
                <form id="userForm" onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>الاسم *</label>
                    <input className="form-control" name="name" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>البريد الإلكتروني *</label>
                    <input className="form-control" name="email" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>صورة الملف الشخصي</label>
                    <div className="avatar-upload-container">
                      <div className="avatar-preview-box">
                        {previewUrl ? (
                          <img src={previewUrl} alt="Preview" />
                        ) : userForm.profilePicture ? (
                          <img src={`${API_BASE_URL}/products/images/${userForm.profilePicture}`} alt="Current" />
                        ) : (
                          <div className="avatar-preview-placeholder">📷</div>
                        )}
                      </div>
                      <div className="upload-btn-wrapper">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => document.getElementById('avatarInput').click()}>
                          {previewUrl || userForm.profilePicture ? 'تغيير الصورة' : 'اختيار صورة'}
                        </button>
                        <input id="avatarInput" type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                      </div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>الفرع (مكان العمل)</label>
                    <select className="form-control" name="branchId" value={userForm.branchId} onChange={(e) => setUserForm({ ...userForm, branchId: e.target.value })}>
                      <option value="">-- اختر الفرع --</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>كلمة المرور {activeUser ? '(اتركه فارغاً للإبقاء على الحالية)' : '*'}</label>
                    <input className="form-control" name="password" type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required={!activeUser} />
                  </div>
                  <div className="form-group">
                    <label>الأدوار</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                      {roles.map(r => (
                        <label key={r} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                          <input type="checkbox" name="roles" value={r} checked={userForm.roles.includes(r)} onChange={(e) => {
                            const newRoles = e.target.checked ? [...userForm.roles, r] : userForm.roles.filter(role => role !== r);
                            setUserForm({ ...userForm, roles: newRoles });
                          }} style={{ accentColor: 'var(--accent-primary)' }} />
                          {r.replace('ROLE_', '')}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>نشط</label>
                    <label className="toggle-switch">
                      <input type="checkbox" name="enabled" checked={userForm.enabled} onChange={(e) => setUserForm({ ...userForm, enabled: e.target.checked })} />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>إلغاء</button>
                <button type="submit" form="userForm" className="btn btn-primary" disabled={saving}>
                  {saving ? 'جاري الحفظ...' : (activeUser ? 'تحديث البيانات' : 'إنشاء المستخدم')}
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {modalType === 'access' && activeUser && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModal(); }}>
            <div className="modal">
              <div className="modal-header">
                <h3>صلاحيات — {activeUser.name}</h3>
                <button className="modal-close" onClick={closeModal}>✕</button>
              </div>
              <div className="modal-body">
                <form id="accessForm" onSubmit={handleUpdateAccess}>
                  <div className="form-group">
                    <label>الأدوار</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                      {roles.map(r => (
                        <label key={r} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                          <input type="checkbox" name="roles" value={r} checked={accessForm.roles.includes(r)} onChange={(e) => {
                            const newRoles = e.target.checked ? [...accessForm.roles, r] : accessForm.roles.filter(role => role !== r);
                            setAccessForm({ ...accessForm, roles: newRoles });
                          }} style={{ accentColor: 'var(--accent-primary)' }} />
                          {r.replace('ROLE_', '')}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>الصلاحيات الإضافية</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                      {permissions.map(p => (
                        <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer', minWidth: '140px' }}>
                          <input type="checkbox" name="permissions" value={p} checked={accessForm.permissions.includes(p)} onChange={(e) => {
                            const newPerms = e.target.checked ? [...accessForm.permissions, p] : accessForm.permissions.filter(perm => perm !== p);
                            setAccessForm({ ...accessForm, permissions: newPerms });
                          }} style={{ accentColor: 'var(--accent-emerald)' }} />
                          {p}
                        </label>
                      ))}
                    </div>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>إلغاء</button>
                <button type="submit" form="accessForm" className="btn btn-primary" disabled={saving}>
                  {saving ? 'جاري الحفظ...' : 'حفظ الصلاحيات'}
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </>
  );
};

export default Users;
