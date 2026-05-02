import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import '../styles/pages/EmployeesPremium.css';

const CustomSelect = ({ options, value, onChange, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value) || options[0];
  return (
    <div className="emp-custom-select-container" style={{ minWidth: '160px' }}>
      <div className={`chk-custom-select-header ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        {icon && <i className={`fas ${icon} icon-start`}></i>}
        <span className="selected-text">{selectedOption.label}</span>
        <i className="fas fa-chevron-down icon-end"></i>
      </div>
      {isOpen && (
        <>
          <div className="emp-custom-select-overlay" onClick={() => setIsOpen(false)}></div>
          <div className="emp-custom-select-dropdown">
            {options.map(opt => (
              <div key={opt.value} className={`chk-custom-select-item ${opt.value === value ? 'active' : ''}`} onClick={() => { onChange(opt.value); setIsOpen(false); }}>
                {opt.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const Employees = () => {
  const navigate = useNavigate();
  const { toast, confirm } = useGlobalUI();
  const [data, setData] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const isAdmin = Api.isAdminOrBranchManager();

  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const pageSize = 10;

  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('account');
  const [activeUser, setActiveUser] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '', email: '', password: '', roles: ['ROLE_USER'], enabled: true, jobTitleId: '',
    profile: {
      birthDate: '', gender: 'MALE', maritalStatus: 'SINGLE', bloodType: '',
      mobileNumber: '', alternativeMobileNumber: '', familyContactNumber: '',
      facebookLink: '', twitterLink: '', instagramLink: '', snapchatLink: '', whatsappNumber: '',
      permanentAddress: '', currentAddress: '', accountHolderName: '', accountNumber: '',
      bankName: '', bankIdentifierCode: '', branch: '', taxId: '', joiningDate: '', baseSalary: '', shift: null
    }
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [nationalIdFile, setNationalIdFile] = useState(null);
  const [nationalIdPreview, setNationalIdPreview] = useState(null);

  const [showJobTitlesModal, setShowJobTitlesModal] = useState(false);
  const [jtFormData, setJtFormData] = useState({ name: '', description: '' });
  const [editJobTitle, setEditJobTitle] = useState(null);
  const [jtSaving, setJtSaving] = useState(false);

  const API_BASE_URL = 'https://posapi.digitalrace.net/api/v1';

  const formatDateForInput = (date) => {
    if (!date) return '';
    if (Array.isArray(date)) {
      const [y, m, d] = date;
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return typeof date === 'string' ? date.split('T')[0] : '';
  };

  useEffect(() => {
    const timer = setTimeout(() => loadData(), 500);
    return () => clearTimeout(timer);
  }, [currentPage, searchTerm, selectedBranchId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, titlesRes, rolesRes, shiftsRes, branchesData] = await Promise.all([
        Api.getUsers(currentPage, pageSize, searchTerm, selectedBranchId),
        Api.getJobTitles().catch(() => []),
        Api.getRoles().catch(() => []),
        Api.getShifts().catch(() => []),
        branches.length === 0 ? Api.getBranches().catch(() => []) : Promise.resolve(branches)
      ]);
      setData(usersRes.items || usersRes.content || []);
      setTotalPages(usersRes.totalPages || 0);
      setTotalElements(usersRes.totalItems || usersRes.totalElements || 0);
      setJobTitles(titlesRes || []);
      setRoles(rolesRes || []);
      setShifts(shiftsRes || []);
      if (branches.length === 0) setBranches(branchesData);
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const openForm = (user = null) => {
    if (user) {
      setActiveUser(user);
      setForm({
        name: user.name || '', email: user.email || '', password: '', roles: user.roles || [], enabled: user.enabled ?? true, jobTitleId: user.jobTitle?.id || '',
        profile: {
          ...user.profile,
          birthDate: formatDateForInput(user.profile?.birthDate),
          joiningDate: formatDateForInput(user.profile?.joiningDate),
          shift: user.profile?.shift || null
        }
      });
      if (user.profilePicture) setAvatarPreview(`${API_BASE_URL}/products/images/${user.profilePicture}`);
      if (user.profile?.nationalIdImage) setNationalIdPreview(`${API_BASE_URL}/products/images/${user.profile.nationalIdImage}`);
    } else {
      setActiveUser(null);
      setForm({
        name: '', email: '', password: '', roles: ['ROLE_USER'], enabled: true, jobTitleId: '',
        profile: {
          birthDate: '', gender: 'MALE', maritalStatus: 'SINGLE', bloodType: '',
          mobileNumber: '', alternativeMobileNumber: '', familyContactNumber: '',
          facebookLink: '', twitterLink: '', instagramLink: '', snapchatLink: '', whatsappNumber: '',
          permanentAddress: '', currentAddress: '', accountHolderName: '', accountNumber: '',
          bankName: '', bankIdentifierCode: '', branch: '', taxId: '', joiningDate: '', baseSalary: '', shift: null
        }
      });
      setAvatarPreview(null); setNationalIdPreview(null);
    }
    setAvatarFile(null); setNationalIdFile(null); setActiveTab('account'); setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (activeUser) await Api.updateUser(activeUser.id, form, avatarFile, nationalIdFile);
      else await Api.createUser(form, avatarFile, nationalIdFile);
      toast('تم الحفظ بنجاح', 'success'); setShowModal(false); loadData();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="employees-container">
      {/* 1. Header */}
      <div className="emp-header-row">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="emp-breadcrumbs">
            <Link to="/dashboard">الرئيسية</Link> / <span>HR</span>
          </div>
          <h1>إدارة الموظفين</h1>
        </div>
        <div className="emp-header-actions">
          <button className="emp-btn-premium emp-btn-outline" onClick={() => setShowJobTitlesModal(true)}>
            <i className="fas fa-user-tie"></i> المسميات الوظيفية
          </button>
          <button className="emp-btn-premium emp-btn-blue" onClick={() => openForm()}>
            <i className="fas fa-plus"></i> إضافة موظف جديد
          </button>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="emp-stats-grid">
        <div className="emp-stat-card">
          <div className="emp-stat-info">
            <h4>إجمالي الموظفين</h4>
            <div className="emp-stat-value">{totalElements}</div>
          </div>
          <div className="emp-stat-visual"><div className="emp-stat-icon icon-blue"><i className="fas fa-users"></i></div></div>
        </div>
        <div className="emp-stat-card">
          <div className="emp-stat-info">
            <h4>المسميات الوظيفية</h4>
            <div className="emp-stat-value">{jobTitles.length}</div>
          </div>
          <div className="emp-stat-visual"><div className="emp-stat-icon icon-green"><i className="fas fa-user-tie"></i></div></div>
        </div>
        <div className="emp-stat-card">
          <div className="emp-stat-info">
            <h4>المسؤولين</h4>
            <div className="emp-stat-value">{data.filter(u => u.roles?.includes('ROLE_ADMIN')).length}</div>
          </div>
          <div className="emp-stat-visual"><div className="emp-stat-icon icon-purple"><i className="fas fa-user-shield"></i></div></div>
        </div>
        <div className="emp-stat-card">
          <div className="emp-stat-info">
            <h4>ورديات العمل</h4>
            <div className="emp-stat-value">{shifts.length}</div>
          </div>
          <div className="emp-stat-visual"><div className="emp-stat-icon icon-amber"><i className="fas fa-clock"></i></div></div>
        </div>
      </div>

      {/* 3. Toolbar */}
      <div className="emp-toolbar-card">
        <div className="emp-toolbar-left" style={{ flex: 1 }}>
          <div className="emp-search-container" style={{ flex: 1, minWidth: '250px' }}>
            <i className="fas fa-search"></i>
            <input type="text" className="emp-input" placeholder="بحث باسم الموظف..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          {isAdmin && (
            <CustomSelect
              icon="fa-building"
              value={selectedBranchId}
              onChange={val => setSelectedBranchId(val)}
              options={[{ value: '', label: 'جميع الفروع' }, ...branches.map(b => ({ value: b.id, label: b.name }))]}
            />
          )}
        </div>
      </div>

      {/* 4. Table Card */}
      <div className="emp-table-card">
        <div className="emp-table-container">
          {loading ? (
            <div style={{ padding: '40px' }}><Loader message="جاري التحميل..." /></div>
          ) : (
            <table className="emp-table">
              <thead>
                <tr>
                  <th>الموظف</th>
                  <th>المسمى الوظيفي</th>
                  <th>تاريخ التعيين</th>
                  <th>الموبايل</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {data.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate(`/employees/${u.id}`)}>
                        <div className="emp-avatar-wrapper">
                          {u.profilePicture ? (
                            <img src={`${API_BASE_URL}/products/images/${u.profilePicture}`} className="emp-img-preview" alt="" />
                          ) : (
                            <div className="emp-stat-icon icon-blue" style={{ width: '40px', height: '40px', borderRadius: '12px', fontSize: '1rem' }}>
                              {(u.name || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800 }}>{u.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--emp-text-secondary)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="emp-type-badge badge-blue">{u.jobTitle?.name || '—'}</span></td>
                    <td>{formatDateForInput(u.profile?.joiningDate) || '—'}</td>
                    <td>{u.profile?.mobileNumber || '—'}</td>
                    <td><span className={`emp-type-badge ${u.enabled ? 'badge-green' : 'badge-red'}`}>{u.enabled ? 'نشط' : 'معطل'}</span></td>
                    <td>
                      <div className="emp-actions">
                        <button className="emp-action-btn" onClick={() => navigate(`/employees/${u.id}`)}><i className="fas fa-eye"></i></button>
                        <button className="emp-action-btn" onClick={() => openForm(u)}><i className="fas fa-edit"></i></button>
                        <button className="emp-action-btn delete" onClick={() => confirm(`حذف الموظف ${u.name}؟`, () => Api.deleteUser(u.id).then(() => loadData()))}><i className="fas fa-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modals are kept similar to original but with premium styling injected via CSS */}
      {showModal && (
        <ModalContainer>
          <div className="emp-modal-overlay" onClick={(e) => { if (e.target.classList.contains('emp-modal-overlay')) setShowModal(false); }}>
            <div className="emp-modal" style={{ maxWidth: '900px' }}>
              <div className="emp-modal-header">
                <h3>{activeUser ? `تعديل موظف: ${activeUser.name}` : 'إضافة موظف جديد'}</h3>
                <button className="emp-modal-close" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <div className="emp-tabs-strip">
                <button className={activeTab === 'account' ? 'active' : ''} onClick={() => setActiveTab('account')}>الحساب</button>
                <button className={activeTab === 'personal' ? 'active' : ''} onClick={() => setActiveTab('personal')}>الشخصية</button>
                <button className={activeTab === 'identity' ? 'active' : ''} onClick={() => setActiveTab('identity')}>الهوية</button>
                <button className={activeTab === 'financial' ? 'active' : ''} onClick={() => setActiveTab('financial')}>الراتب</button>
              </div>
              <div className="emp-modal-body">
                <form id="empForm" onSubmit={handleSubmit}>
                  {activeTab === 'account' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div className="emp-form-group">
                        <label>الاسم الكامل *</label>
                        <input className="emp-input" name="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                      </div>
                      <div className="emp-form-group">
                        <label>البريد الإلكتروني *</label>
                        <input className="emp-input" name="email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                      </div>
                      <div className="emp-form-group">
                        <label>كلمة المرور</label>
                        <input className="emp-input" name="password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={activeUser ? 'اتركه فارغاً للحفاظ على الحالية' : ''} />
                      </div>
                      <div className="emp-form-group">
                        <label>المسمى الوظيفي</label>
                        <select className="emp-input" value={form.jobTitleId} onChange={e => setForm({ ...form, jobTitleId: e.target.value })}>
                          <option value="">-- اختر مسمى --</option>
                          {jobTitles.map(jt => <option key={jt.id} value={jt.id}>{jt.name}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                  {activeTab === 'identity' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                      <div className="emp-form-group">
                        <label>صورة الملف الشخصي</label>
                        <div className="emp-upload-zone" onClick={() => document.getElementById('avInput').click()}>
                          {avatarPreview ? <img src={avatarPreview} alt="" /> : <i className="fas fa-camera"></i>}
                          <input id="avInput" type="file" hidden onChange={e => { setAvatarFile(e.target.files[0]); setAvatarPreview(URL.createObjectURL(e.target.files[0])); }} />
                        </div>
                      </div>
                      <div className="emp-form-group">
                        <label>صورة البطاقة</label>
                        <div className="emp-upload-zone" onClick={() => document.getElementById('idInput').click()}>
                          {nationalIdPreview ? <img src={nationalIdPreview} alt="" /> : <i className="fas fa-id-card"></i>}
                          <input id="idInput" type="file" hidden onChange={e => { setNationalIdFile(e.target.files[0]); setNationalIdPreview(URL.createObjectURL(e.target.files[0])); }} />
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === 'financial' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div className="emp-form-group">
                        <label>المرتب الأساسي</label>
                        <input type="number" className="emp-input" value={form.profile.baseSalary} onChange={e => setForm({ ...form, profile: { ...form.profile, baseSalary: e.target.value } })} />
                      </div>
                      <div className="emp-form-group">
                        <label>الوردية (Shift)</label>
                        <select className="emp-input" value={form.profile.shift?.id || ''} onChange={e => {
                          const s = shifts.find(sh => sh.id === parseInt(e.target.value));
                          setForm({ ...form, profile: { ...form.profile, shift: s ? { id: s.id } : null } });
                        }}>
                          <option value="">بدون وردية</option>
                          {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </form>
              </div>
              <div className="emp-modal-footer">
                <button type="button" className="emp-btn-ghost" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" form="empForm" className="emp-btn-primary" disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ الموظف'}</button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {showJobTitlesModal && (
        <ModalContainer>
          <div className="emp-modal-overlay" onClick={(e) => { if (e.target.classList.contains('emp-modal-overlay')) setShowJobTitlesModal(false); }}>
            <div className="emp-modal" style={{ maxWidth: '600px' }}>
              <div className="emp-modal-header">
                <h3>👔 المسميات الوظيفية</h3>
                <button className="emp-modal-close" onClick={() => setShowJobTitlesModal(false)}>✕</button>
              </div>
              <div className="emp-modal-body">
                <form id="jtForm" onSubmit={async (e) => { e.preventDefault(); try { if (editJobTitle) await Api.updateJobTitle(editJobTitle.id, jtFormData); else await Api.createJobTitle(jtFormData); setJtFormData({ name: '', description: '' }); setEditJobTitle(null); const ts = await Api.getJobTitles(); setJobTitles(ts); } catch (err) { toast(err.message, 'error'); } }}>
                  <div className="emp-form-group">
                    <label>الاسم</label>
                    <input className="emp-input" value={jtFormData.name} onChange={e => setJtFormData({ ...jtFormData, name: e.target.value })} required />
                  </div>
                  <button type="submit" className="emp-btn-primary" style={{ width: '100%', marginBottom: '20px' }}>{editJobTitle ? 'تحديث' : 'إضافة'}</button>
                </form>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {jobTitles.map(jt => (
                    <div key={jt.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid var(--emp-border)' }}>
                      <div><b>{jt.name}</b></div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <i className="fas fa-edit" style={{ cursor: 'pointer', color: 'var(--emp-accent-blue)' }} onClick={() => { setEditJobTitle(jt); setJtFormData({ name: jt.name, description: jt.description }); }}></i>
                        <i className="fas fa-trash" style={{ cursor: 'pointer', color: '#f43f5e' }} onClick={() => confirm(`حذف ${jt.name}؟`, () => Api.deleteJobTitle(jt.id).then(() => Api.getJobTitles().then(setJobTitles)))}></i>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .emp-tabs-strip { display: flex; background: rgba(0,0,0,0.1); padding: 5px; border-bottom: 1px solid var(--emp-border); }
        .emp-tabs-strip button { flex: 1; padding: 12px; border: none; background: transparent; color: var(--emp-text-secondary); cursor: pointer; font-weight: 800; transition: all 0.2s; }
        .emp-tabs-strip button.active { color: var(--emp-accent-blue); border-bottom: 2px solid var(--emp-accent-blue); }
        .emp-upload-zone { width: 100%; height: 200px; border: 2px dashed var(--emp-border); border-radius: 16px; display: flex; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; background: var(--emp-bg); }
        .emp-upload-zone img { width: 100%; height: 100%; object-fit: cover; }
        .emp-upload-zone i { fontSize: 3rem; opacity: 0.2; }
      `}} />
    </div>
  );
};

export default Employees;
