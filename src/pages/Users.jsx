import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import '../styles/pages/UsersPremium.css';

const Users = () => {
  const { toast, confirm } = useGlobalUI();
  const [data, setData] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const isAdmin = Api.isAdminOrBranchManager();

  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const pageSize = 10;

  const [modalType, setModalType] = useState(null);
  const [activeUser, setActiveUser] = useState(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', roles: [], enabled: true, profilePicture: '', branchId: '' });
  const [accessForm, setAccessForm] = useState({ roles: [], permissions: [] });
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const API_BASE_URL = 'https://posapi.digitalrace.net/api/v1';

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
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
      if (roles.length === 0) setRoles(rolesData);
      if (permissions.length === 0) setPermissions(permsData);
      if (branches.length === 0) setBranches(branchesData);
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const openForm = () => {
    setUserForm({ name: '', email: '', password: '', roles: [], enabled: true, profilePicture: '', branchId: '' });
    setActiveUser(null); setModalType('form');
  };

  const openEditForm = (user) => {
    setUserForm({ name: user.name, email: user.email, password: '', roles: user.roles || [], enabled: user.enabled, profilePicture: user.profilePicture || '', branchId: user.branchId || '' });
    setActiveUser(user); setModalType('form');
  };

  const openAccessForm = async (user) => {
    setSaving(true);
    try {
      const fullUser = await Api.getUser(user.id);
      setActiveUser(fullUser);
      setAccessForm({ roles: fullUser.roles || [], permissions: fullUser.permissions || [] });
      setModalType('access');
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const closeModal = () => {
    setModalType(null); setActiveUser(null); setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) { setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file)); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (activeUser) {
        const updateData = { ...userForm }; if (!updateData.password) delete updateData.password;
        await Api.updateUser(activeUser.id, updateData, selectedFile);
        toast('تم التحديث بنجاح', 'success');
      } else {
        await Api.createUser(userForm, selectedFile);
        toast('تم الإضافة بنجاح', 'success');
      }
      closeModal(); loadData();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleUpdateAccess = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await Api.updateUserAccess(activeUser.id, accessForm);
      toast('تم تحديث الصلاحيات', 'success'); closeModal(); loadData();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="users-container">
      {/* 1. Header */}
      <div className="usr-header-row">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="usr-breadcrumbs">
            <Link to="/dashboard">الرئيسية</Link> / <span>الأمان</span>
          </div>
          <h1>إدارة المستخدمين</h1>
        </div>
        <div className="usr-header-actions">
          {Api.can('USER_WRITE') && (
            <button className="usr-btn-premium usr-btn-blue" onClick={openForm}>
              <i className="fas fa-user-plus"></i> إضافة مستخدم
            </button>
          )}
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="usr-stats-grid">
        <div className="usr-stat-card">
          <div className="usr-stat-info">
            <h4>إجمالي المستخدمين</h4>
            <div className="usr-stat-value">{totalElements}</div>
          </div>
          <div className="usr-stat-visual"><div className="usr-stat-icon icon-blue"><i className="fas fa-users"></i></div></div>
        </div>
        <div className="usr-stat-card">
          <div className="usr-stat-info">
            <h4>المسؤولين</h4>
            <div className="usr-stat-value" style={{ color: 'var(--usr-accent-purple)' }}>{data.filter(u => u.roles?.some(r => r.includes('ADMIN'))).length}</div>
          </div>
          <div className="usr-stat-visual"><div className="usr-stat-icon icon-purple"><i className="fas fa-shield-alt"></i></div></div>
        </div>
        <div className="usr-stat-card">
          <div className="usr-stat-info">
            <h4>المستخدمين النشطين</h4>
            <div className="usr-stat-value" style={{ color: 'var(--usr-accent-green)' }}>{data.filter(u => u.enabled).length}</div>
          </div>
          <div className="usr-stat-visual"><div className="usr-stat-icon icon-green"><i className="fas fa-user-check"></i></div></div>
        </div>
        <div className="usr-stat-card">
          <div className="usr-stat-info">
            <h4>فروع نشطة</h4>
            <div className="usr-stat-value">{branches.length}</div>
          </div>
          <div className="usr-stat-visual"><div className="usr-stat-icon icon-amber"><i className="fas fa-building"></i></div></div>
        </div>
      </div>

      {/* 3. Toolbar */}
      <div className="usr-toolbar-card">
        <div className="usr-search-box" style={{ flex: 1, maxWidth: '400px' }}>
          <i className="fas fa-search"></i>
          <input type="text" className="usr-input" placeholder="بحث باسم المستخدم أو البريد الإلكتروني..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(0); }} />
        </div>
        {isAdmin && (
          <select className="usr-input" style={{ width: '200px' }} value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)}>
            <option value="">جميع الفروع</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
      </div>

      {/* 4. Table Card */}
      <div className="usr-table-card">
        <div className="usr-table-container">
          {loading ? (
            <div style={{ padding: '60px' }}><Loader message="جاري جلب المستخدمين..." /></div>
          ) : data.length === 0 ? (
            <div style={{ padding: '80px', textAlign: 'center', color: 'var(--usr-text-secondary)' }}>
              <i className="fas fa-user-slash" style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}></i>
              <h3>لا يوجد مستخدمين مسجلين حالياً</h3>
            </div>
          ) : (
            <>
              <table className="usr-table">
                <thead>
                  <tr>
                    <th>المستخدم</th>
                    <th>البريد الإلكتروني</th>
                    <th>الأدوار</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="usr-avatar-wrapper">
                            {u.profilePicture ? (
                              <img src={`${API_BASE_URL}/products/images/${u.profilePicture}`} alt="" style={{ width: '40px', height: '40px', borderRadius: '12px', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--usr-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{(u.name || 'U').charAt(0).toUpperCase()}</div>
                            )}
                          </div>
                          <div><div style={{ fontWeight: 800 }}>{u.name}</div><div style={{ fontSize: '0.7rem', color: 'var(--usr-text-secondary)' }}># {u.id}</div></div>
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {(u.roles || []).map(r => (
                            <span key={r} className="usr-type-badge badge-blue" style={{ fontSize: '0.65rem' }}>{r.replace('ROLE_', '')}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className={`usr-type-badge ${u.enabled ? 'badge-green' : 'badge-red'}`}>
                          {u.enabled ? 'نشط ✓' : 'معطل ✗'}
                        </span>
                      </td>
                      <td>
                        <div className="usr-actions">
                          {Api.can('USER_WRITE') && <button className="usr-action-btn" title="تعديل" onClick={() => openEditForm(u)}><i className="fas fa-edit"></i></button>}
                          {Api.can('ROLE_WRITE') && <button className="usr-action-btn" title="الصلاحيات" onClick={() => openAccessForm(u)}><i className="fas fa-key"></i></button>}
                          {Api.can('USER_DELETE') && <button className="usr-action-btn delete" title="حذف" onClick={() => confirm(`حذف ${u.name}؟`, () => Api.deleteUser(u.id).then(loadData))}><i className="fas fa-trash"></i></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="usr-pagination">
                <div className="usr-pagination-info">الصفحة {currentPage + 1} من {totalPages}</div>
                <div className="usr-pagination-btns">
                  <button className="usr-page-btn" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}><i className="fas fa-chevron-right"></i></button>
                  <button className="usr-page-btn active">{currentPage + 1}</button>
                  <button className="usr-page-btn" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)}><i className="fas fa-chevron-left"></i></button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {modalType === 'form' && (
        <ModalContainer>
          <div className="usr-modal-overlay" onClick={closeModal}>
            <div className="usr-modal" onClick={e => e.stopPropagation()}>
              <div className="usr-modal-header">
                <h3>{activeUser ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}</h3>
                <button className="usr-modal-close" onClick={closeModal}>✕</button>
              </div>
              <div className="usr-modal-body">
                <form id="userForm" onSubmit={handleSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="usr-form-group">
                      <label>الاسم بالكامل *</label>
                      <input className="usr-input" required value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} />
                    </div>
                    <div className="usr-form-group">
                      <label>البريد الإلكتروني *</label>
                      <input className="usr-input" type="email" required value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} />
                    </div>
                  </div>
                  <div className="usr-form-group" style={{ marginTop: '20px' }}>
                    <label>صورة الملف الشخصي</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(99,102,241,0.05)', padding: '15px', borderRadius: '16px' }}>
                      <div style={{ width: '80px', height: '80px', borderRadius: '20px', border: '2px dashed var(--usr-border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {previewUrl ? <img src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <i className="fas fa-camera" style={{ fontSize: '1.5rem', opacity: 0.3 }}></i>}
                      </div>
                      <button type="button" className="usr-btn-premium usr-btn-outline" onClick={() => document.getElementById('avatarIn').click()}>اختيار صورة</button>
                      <input id="avatarIn" type="file" hidden onChange={handleFileChange} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                    <div className="usr-form-group">
                      <label>كلمة المرور {activeUser && '(اختياري)'}</label>
                      <input className="usr-input" type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} placeholder={activeUser ? 'اتركه فارغاً للحفاظ على الحالية' : ''} />
                    </div>
                    <div className="usr-form-group">
                      <label>الفرع</label>
                      <select className="usr-input" value={userForm.branchId} onChange={e => setUserForm({ ...userForm, branchId: e.target.value })}>
                        <option value="">-- اختر فرع العمل --</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  </div>
                </form>
              </div>
              <div className="usr-modal-footer">
                <button type="button" className="usr-btn-ghost" onClick={closeModal}>إلغاء</button>
                <button type="submit" form="userForm" className="usr-btn-primary" disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ البيانات'}</button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {modalType === 'access' && (
        <ModalContainer>
          <div className="usr-modal-overlay" onClick={closeModal}>
            <div className="usr-modal" onClick={e => e.stopPropagation()}>
              <div className="usr-modal-header">
                <h3>🔑 إدارة صلاحيات {activeUser?.name}</h3>
                <button className="usr-modal-close" onClick={closeModal}>✕</button>
              </div>
              <div className="usr-modal-body">
                <form id="accessForm" onSubmit={handleUpdateAccess}>
                  <label style={{ fontWeight: 800, marginBottom: '12px', display: 'block' }}>الأدوار الوظيفية</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '24px' }}>
                    {roles.map(r => (
                      <label key={r} style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--usr-border)', background: accessForm.roles.includes(r) ? 'rgba(99, 102, 241, 0.1)' : 'transparent', color: accessForm.roles.includes(r) ? 'var(--usr-accent-blue)' : 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" checked={accessForm.roles.includes(r)} onChange={e => setAccessForm({ ...accessForm, roles: e.target.checked ? [...accessForm.roles, r] : accessForm.roles.filter(x => x !== r) })} hidden />
                        {r.replace('ROLE_', '')}
                      </label>
                    ))}
                  </div>
                  <label style={{ fontWeight: 800, marginBottom: '12px', display: 'block' }}>الصلاحيات الدقيقة</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px', maxHeight: '250px', overflowY: 'auto', padding: '4px' }}>
                    {permissions.map(p => (
                      <label key={p} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={accessForm.permissions.includes(p)} onChange={e => setAccessForm({ ...accessForm, permissions: e.target.checked ? [...accessForm.permissions, p] : accessForm.permissions.filter(x => x !== p) })} />
                        {p}
                      </label>
                    ))}
                  </div>
                </form>
              </div>
              <div className="usr-modal-footer">
                <button type="button" className="usr-btn-ghost" onClick={closeModal}>إلغاء</button>
                <button type="submit" form="accessForm" className="usr-btn-primary" disabled={saving}>تحديث الصلاحيات</button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default Users;
