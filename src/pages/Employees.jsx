import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import StatTile from '../components/common/StatTile';

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

  // Pagination & Search state
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const pageSize = 10;

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('account'); // account, personal, contact, identity, address, bank
  const [activeUser, setActiveUser] = useState(null);
  const [saving, setSaving] = useState(false);

  // Forms
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    roles: ['ROLE_USER'],
    enabled: true,
    jobTitleId: '',
    profile: {
      birthDate: '',
      gender: 'MALE',
      maritalStatus: 'SINGLE',
      bloodType: '',
      mobileNumber: '',
      alternativeMobileNumber: '',
      familyContactNumber: '',
      facebookLink: '',
      twitterLink: '',
      socialMedia1: '',
      socialMedia2: '',
      permanentAddress: '',
      currentAddress: '',
      accountHolderName: '',
      accountNumber: '',
      bankName: '',
      bankIdentifierCode: '',
      branch: '',
      taxId: '',
      joiningDate: '',
      instagramLink: '',
      snapchatLink: '',
      whatsappNumber: '',
      baseSalary: '',
      shift: null
    }
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [nationalIdFile, setNationalIdFile] = useState(null);
  const [nationalIdPreview, setNationalIdPreview] = useState(null);

  // Job Title Management State
  const [showJobTitlesModal, setShowJobTitlesModal] = useState(false);
  const [jtFormData, setJtFormData] = useState({ name: '', description: '' });
  const [editJobTitle, setEditJobTitle] = useState(null);
  const [jtSaving, setJtSaving] = useState(false);

  const API_BASE_URL = 'https://posapi.digitalrace.net/api/v1';

  // Helper to format date for HTML5 date input (handles [y,m,d] array, ISO string, or null)
  const formatDateForInput = (date) => {
    if (!date) return '';
    if (Array.isArray(date)) {
      const [y, m, d] = date;
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    if (typeof date === 'string') return date.split('T')[0];
    return '';
  };

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
      const [usersRes, titlesRes, rolesRes, shiftsRes, branchesData] = await Promise.all([
        Api.getUsers(page, size, query, branchId),
        Api.getJobTitles().catch(() => []),
        Api.getRoles().catch(() => []),
        Api.getShifts().catch(() => []),
        branches.length === 0 ? Api.getBranches().catch(() => []) : Promise.resolve(branches)
      ]);

      setData(usersRes.items || usersRes.content || []);
      setTotalPages(usersRes.totalPages || 0);
      setTotalElements(usersRes.totalItems || usersRes.totalElements || 0);
      setCurrentPage(usersRes.currentPage ?? usersRes.number ?? 0);
      setJobTitles(titlesRes);
      setRoles(rolesRes);
      setShifts(shiftsRes);
      if (branches.length === 0) setBranches(branchesData);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const openForm = (user = null) => {
    if (user) {
      setActiveUser(user);
      setForm({
        name: user.name || '',
        email: user.email || '',
        password: '',
        roles: user.roles || [],
        enabled: user.enabled ?? true,
        jobTitleId: user.jobTitle?.id || '',
        profile: {
          birthDate: formatDateForInput(user.profile?.birthDate),
          gender: user.profile?.gender || 'MALE',
          maritalStatus: user.profile?.maritalStatus || 'SINGLE',
          bloodType: user.profile?.bloodType || '',
          mobileNumber: user.profile?.mobileNumber || '',
          alternativeMobileNumber: user.profile?.alternativeMobileNumber || '',
          familyContactNumber: user.profile?.familyContactNumber || '',
          facebookLink: user.profile?.facebookLink || '',
          twitterLink: user.profile?.twitterLink || '',
          socialMedia1: user.profile?.socialMedia1 || '',
          socialMedia2: user.profile?.socialMedia2 || '',
          permanentAddress: user.profile?.permanentAddress || '',
          currentAddress: user.profile?.currentAddress || '',
          accountHolderName: user.profile?.accountHolderName || '',
          accountNumber: user.profile?.accountNumber || '',
          bankName: user.profile?.bankName || '',
          bankIdentifierCode: user.profile?.bankIdentifierCode || '',
          branch: user.profile?.branch || '',
          taxId: user.profile?.taxId || '',
          joiningDate: formatDateForInput(user.profile?.joiningDate),
          instagramLink: user.profile?.instagramLink || '',
          snapchatLink: user.profile?.snapchatLink || '',
          whatsappNumber: user.profile?.whatsappNumber || '',
          baseSalary: user.profile?.baseSalary || '',
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
          facebookLink: '', twitterLink: '', socialMedia1: '', socialMedia2: '',
          permanentAddress: '', currentAddress: '',
          accountHolderName: '', accountNumber: '', bankName: '', bankIdentifierCode: '', branch: '',
          taxId: '',
          joiningDate: '',
          instagramLink: '',
          snapchatLink: '',
          whatsappNumber: '',
          baseSalary: '',
          shift: null
        }
      });
      setAvatarPreview(null);
      setNationalIdPreview(null);
    }
    setAvatarFile(null);
    setNationalIdFile(null);
    setActiveTab('account');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setActiveUser(null);
    setAvatarPreview(null);
    setNationalIdPreview(null);
  };

  const handleInputChange = (e, isProfile = false) => {
    const { name, value } = e.target;
    if (isProfile) {
      setForm(prev => ({ ...prev, profile: { ...prev.profile, [name]: value } }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (type === 'avatar') {
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
      } else {
        setNationalIdFile(file);
        setNationalIdPreview(URL.createObjectURL(file));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || (!activeUser && !form.password)) {
      toast('يرجى ملء الحقول الأساسية المطلوبة', 'warning');
      setActiveTab('account');
      return;
    }

    setSaving(true);
    try {
      if (activeUser) {
        const updateData = { ...form };
        if (!updateData.password) delete updateData.password;
        await Api.updateUser(activeUser.id, updateData, avatarFile, nationalIdFile);
        toast('تم تحديث بيانات الموظف بنجاح', 'success');
      } else {
        await Api.createUser(form, avatarFile, nationalIdFile);
        toast('تم إضافة الموظف بنجاح', 'success');
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
    confirm(`سيتم حذف الموظف "${name}" نهائياً من النظام`, async () => {
      try {
        await Api.deleteUser(id);
        toast('تم حذف الموظف بنجاح', 'success');
        loadData();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  };

  // Job Title Management Methods
  const handleSaveJobTitle = async (e) => {
    e.preventDefault();
    if (!jtFormData.name) {
      toast('يرجى إدخال اسم المسمى الوظيفي', 'warning');
      return;
    }
    setJtSaving(true);
    try {
      if (editJobTitle) {
        await Api.updateJobTitle(editJobTitle.id, jtFormData);
        toast('تم تحديث المسمى الوظيفي بنجاح', 'success');
      } else {
        await Api.createJobTitle(jtFormData);
        toast('تم إضافة المسمى الوظيفي بنجاح', 'success');
      }
      setJtFormData({ name: '', description: '' });
      setEditJobTitle(null);
      // Reload job titles
      const titles = await Api.getJobTitles();
      setJobTitles(titles);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setJtSaving(false);
    }
  };

  const handleDeleteJobTitle = async (id, name) => {
    confirm(`هل أنت متأكد من حذف المسمى الوظيفي "${name}"؟`, async () => {
      try {
        await Api.deleteJobTitle(id);
        toast('تم الحذف بنجاح', 'success');
        const titles = await Api.getJobTitles();
        setJobTitles(titles);
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  };

  return (
    <div className="page-section">
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <StatTile
          id="emp_count"
          label="إجمالي الموظفين"
          value={totalElements}
          icon="👥"
          defaults={{ color: 'blue', size: 'tile-wd-sm', order: 1 }}
        />
        <StatTile
          id="emp_titles"
          label="المسميات الوظيفية"
          value={jobTitles.length}
          icon="👔"
          defaults={{ color: 'teal', size: 'tile-sq-sm', order: 2 }}
        />
        <StatTile
          id="emp_admins"
          label="مسؤولين"
          value={data.filter(u => (u.roles || []).includes('ROLE_ADMIN')).length}
          icon="🛡️"
          defaults={{ color: 'magenta', size: 'tile-sq-sm', order: 3 }}
        />
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>👤 إدارة شؤون الموظفين</h3>
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
                placeholder="بحث باسم الموظف..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(0); }}
              />
            </div>
            <div style={{ display: 'flex', gap: '15px', flex: '1 1 100%' }}>
              <button className="btn btn-secondary" style={{ flex: 1, margin: '0 2px' }} onClick={() => setShowJobTitlesModal(true)}>
                👔 المسميات الوظيفية
              </button>
              <button className="btn btn-primary" style={{ flex: 1, margin: '0 2px' }} onClick={() => openForm()}>
                <span>+</span> إضافة موظف جديد
              </button>
            </div>
          </div>
        </div>
        <div className="card-body no-padding">
          <div className="table-wrapper">
            {loading ? <Loader message="جاري جلب بيانات الموظفين..." /> : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>الموظف</th>
                    <th>المسمى الوظيفي</th>
                    <th>تاريخ التعيين</th>
                    <th>رقم الموبايل</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((u, i) => (
                    <tr key={u.id}>
                      <td>{(currentPage * pageSize) + i + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navigate(`/employees/${u.id}`)}>
                          <div className="user-avatar-wrapper">
                            {u.profilePicture ? (
                              <img src={`${API_BASE_URL}/products/images/${u.profilePicture}`} className="user-avatar-img" alt="" />
                            ) : (
                              <div className="user-avatar-placeholder" style={{ background: 'var(--metro-blue)' }}>
                                {(u.name || 'U').charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--metro-blue)' }}>{u.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-info">{u.jobTitle?.name || 'غير محدد'}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem' }}>
                          {u.profile?.joiningDate
                            ? (Array.isArray(u.profile.joiningDate)
                              ? `${u.profile.joiningDate[0]}-${u.profile.joiningDate[1]}-${u.profile.joiningDate[2]}`
                              : u.profile.joiningDate)
                            : '—'}
                        </span>
                      </td>
                      <td>{u.profile?.mobileNumber || '—'}</td>
                      <td>
                        <span className={`badge ${u.enabled ? 'badge-success' : 'badge-danger'}`}>
                          {u.enabled ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-icon btn-ghost" title="عرض التفاصيل والماليات" onClick={() => navigate(`/employees/${u.id}`)}>👁️</button>
                          <button className="btn btn-icon btn-ghost" title="تعديل سريع (الراتب/الوردية)" onClick={() => { openForm(u); setActiveTab('financial_edit'); }}>💰</button>
                          <button className="btn btn-icon btn-ghost" title="سجل حضور/انصراف" onClick={() => navigate(`/employees/${u.id}?tab=attendance`)}>📅</button>
                          <button className="btn btn-icon btn-ghost" title="تعديل البيانات" onClick={() => openForm(u)}>✏️</button>
                          <button className="btn btn-icon btn-ghost" title="حذف" onClick={() => handleDelete(u.id, u.name)}>🗑️</button>
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

      {showModal && (
        <ModalContainer>
          <div className="modal-overlay active">
            <div className="modal modal-xl">
              <div className="modal-header">
                <h3>{activeUser ? `تعديل موظف: ${activeUser.name}` : 'إضافة موظف جديد'}</h3>
                <button className="modal-close" onClick={closeModal}>✕</button>
              </div>

              <div className="modal-tabs" style={{ display: 'flex', background: '#222', borderBottom: '1px solid #333', overflowX: 'auto', whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch' }}>
                <button className={`tab-btn ${activeTab === 'account' ? 'active' : ''}`} onClick={() => setActiveTab('account')}>الحساب</button>
                <button className={`tab-btn ${activeTab === 'personal' ? 'active' : ''}`} onClick={() => setActiveTab('personal')}>البيانات الشخصية</button>
                <button className={`tab-btn ${activeTab === 'contact' ? 'active' : ''}`} onClick={() => setActiveTab('contact')}>الاتصال</button>
                <button className={`tab-btn ${activeTab === 'identity' ? 'active' : ''}`} onClick={() => setActiveTab('identity')}>الهوية</button>
                <button className={`tab-btn ${activeTab === 'financial_edit' ? 'active' : ''}`} onClick={() => setActiveTab('financial_edit')}>الراتب والوردية ⭐</button>
                <button className={`tab-btn ${activeTab === 'address' ? 'active' : ''}`} onClick={() => setActiveTab('address')}>العناوين</button>
                <button className={`tab-btn ${activeTab === 'bank' ? 'active' : ''}`} onClick={() => setActiveTab('bank')}>البنك والضرائب</button>
              </div>

              <div className="modal-body">
                <form id="employeeForm" onSubmit={handleSubmit}>
                  {activeTab === 'account' && (
                    <div className="tab-pane active anim-fade-in">
                      <div className="form-grid-2">
                        <div className="form-group">
                          <label>الاسم الكامل *</label>
                          <input className="form-control" name="name" value={form.name} onChange={handleInputChange} required />
                        </div>
                        <div className="form-group">
                          <label>البريد الإلكتروني *</label>
                          <input className="form-control" name="email" type="email" value={form.email} onChange={handleInputChange} required />
                        </div>
                        <div className="form-group">
                          <label>كلمة المرور {activeUser ? '(اتركه فارغاً للإبقاء على الحالية)' : '*'}</label>
                          <input className="form-control" name="password" type="password" value={form.password} onChange={handleInputChange} required={!activeUser} />
                        </div>
                        <div className="form-group">
                          <label>المسمى الوظيفي</label>
                          <select className="form-control" name="jobTitleId" value={form.jobTitleId} onChange={handleInputChange}>
                            <option value="">-- اختر مسمى وظيفي --</option>
                            {jobTitles.map(jt => <option key={jt.id} value={jt.id}>{jt.name}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>تاريخ الانضمام</label>
                          <input className="form-control" name="joiningDate" type="date" value={form.profile.joiningDate} onChange={(e) => handleInputChange(e, true)} />
                        </div>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                          <label>الأدوار والصلاحيات</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '8px' }}>
                            {roles.map(r => (
                              <label key={r} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={form.roles.includes(r)} onChange={(e) => {
                                  const newRoles = e.target.checked ? [...form.roles, r] : form.roles.filter(x => x !== r);
                                  setForm({ ...form, roles: newRoles });
                                }} />
                                {r.replace('ROLE_', '')}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'personal' && (
                    <div className="tab-pane active anim-fade-in">
                      <div className="form-grid-2">
                        <div className="form-group">
                          <label>تاريخ الميلاد</label>
                          <input className="form-control" name="birthDate" type="date" value={form.profile.birthDate} onChange={(e) => handleInputChange(e, true)} />
                        </div>
                        <div className="form-group">
                          <label>النوع</label>
                          <select className="form-control" name="gender" value={form.profile.gender} onChange={(e) => handleInputChange(e, true)}>
                            <option value="MALE">ذكر</option>
                            <option value="FEMALE">أنثى</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>الحالة الاجتماعية</label>
                          <select className="form-control" name="maritalStatus" value={form.profile.maritalStatus} onChange={(e) => handleInputChange(e, true)}>
                            <option value="SINGLE">أعزب</option>
                            <option value="MARRIED">متزوج</option>
                            <option value="DIVORCED">مطلق</option>
                            <option value="WIDOWED">أرمل</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>فصيلة الدم</label>
                          <input className="form-control" name="bloodType" value={form.profile.bloodType} onChange={(e) => handleInputChange(e, true)} placeholder="مثال: O+" />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'contact' && (
                    <div className="tab-pane active anim-fade-in">
                      <div className="form-grid-2">
                        <div className="form-group">
                          <label>رقم الموبايل</label>
                          <input className="form-control" name="mobileNumber" value={form.profile.mobileNumber} onChange={(e) => handleInputChange(e, true)} />
                        </div>
                        <div className="form-group">
                          <label>رقم موبايل بديل</label>
                          <input className="form-control" name="alternativeMobileNumber" value={form.profile.alternativeMobileNumber} onChange={(e) => handleInputChange(e, true)} />
                        </div>
                        <div className="form-group">
                          <label>رقم الاتصال بالعائلة (طوارئ)</label>
                          <input className="form-control" name="familyContactNumber" value={form.profile.familyContactNumber} onChange={(e) => handleInputChange(e, true)} />
                        </div>
                        <div className="form-group">
                          <label>رابط فيسبوك</label>
                          <input className="form-control" name="facebookLink" value={form.profile.facebookLink} onChange={(e) => handleInputChange(e, true)} />
                        </div>
                        <div className="form-group">
                          <label>رابط تويتر</label>
                          <input className="form-control" name="twitterLink" value={form.profile.twitterLink} onChange={(e) => handleInputChange(e, true)} />
                        </div>
                        <div className="form-group">
                          <label>رابط إنستقرام</label>
                          <input className="form-control" name="instagramLink" value={form.profile.instagramLink} onChange={(e) => handleInputChange(e, true)} />
                        </div>
                        <div className="form-group">
                          <label>رابط سناب شات</label>
                          <input className="form-control" name="snapchatLink" value={form.profile.snapchatLink} onChange={(e) => handleInputChange(e, true)} />
                        </div>
                        <div className="form-group">
                          <label>رقم الواتساب</label>
                          <input className="form-control" name="whatsappNumber" value={form.profile.whatsappNumber} onChange={(e) => handleInputChange(e, true)} />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'identity' && (
                    <div className="tab-pane active anim-fade-in">
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                        <div className="form-group">
                          <label>صورة الملف الشخصي</label>
                          <div className="image-upload-zone" onClick={() => document.getElementById('avatarInput').click()} style={{ height: '200px', border: '2px dashed #444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
                            {avatarPreview ? <img src={avatarPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <span>انقر هنا لاختيار صورة</span>}
                            <input id="avatarInput" type="file" hidden onChange={(e) => handleFileChange(e, 'avatar')} />
                          </div>
                        </div>
                        <div className="form-group">
                          <label>صورة البطاقة الرقم القومي</label>
                          <div className="image-upload-zone" onClick={() => document.getElementById('nationalIdInput').click()} style={{ height: '200px', border: '2px dashed #444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
                            {nationalIdPreview ? <img src={nationalIdPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <span>انقر هنا لرفع صورة البطاقة</span>}
                            <input id="nationalIdInput" type="file" hidden onChange={(e) => handleFileChange(e, 'nationalId')} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'financial_edit' && (
                    <div className="tab-pane active anim-fade-in">
                      <div className="form-grid-2">
                        <div className="form-group">
                          <label>المرتب الأساسي (شهري)</label>
                          <input type="number" className="form-control" name="baseSalary" value={form.profile.baseSalary} onChange={(e) => handleInputChange(e, true)} placeholder="0.00" />
                        </div>
                        <div className="form-group">
                          <label>الوردية (Shift)</label>
                          <select className="form-control" name="shiftId" value={form.profile.shift?.id || ''} onChange={(e) => {
                            const selectedShift = shifts.find(s => s.id === parseInt(e.target.value));
                            setForm(prev => ({ ...prev, profile: { ...prev.profile, shift: selectedShift ? { id: selectedShift.id } : null } }));
                          }}>
                            <option value="">بدون وردية</option>
                            {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'address' && (
                    <div className="tab-pane active anim-fade-in">
                      <div className="form-group">
                        <label>العنوان الدائم (كما في البطاقة)</label>
                        <textarea className="form-control" name="permanentAddress" value={form.profile.permanentAddress} onChange={(e) => handleInputChange(e, true)} rows="3"></textarea>
                      </div>
                      <div className="form-group">
                        <label>العنوان الحالي (السكن الحالي)</label>
                        <textarea className="form-control" name="currentAddress" value={form.profile.currentAddress} onChange={(e) => handleInputChange(e, true)} rows="3"></textarea>
                      </div>
                    </div>
                  )}

                  {activeTab === 'bank' && (
                    <div className="tab-pane active anim-fade-in">
                      <div className="form-grid-2">
                        <div className="form-group">
                          <label>اسم صاحب الحساب</label>
                          <input className="form-control" name="accountHolderName" value={form.profile.accountHolderName} onChange={(e) => handleInputChange(e, true)} />
                        </div>
                        <div className="form-group">
                          <label>رقم الحساب / IBAN</label>
                          <input className="form-control" name="accountNumber" value={form.profile.accountNumber} onChange={(e) => handleInputChange(e, true)} />
                        </div>
                        <div className="form-group">
                          <label>اسم البنك</label>
                          <input className="form-control" name="bankName" value={form.profile.bankName} onChange={(e) => handleInputChange(e, true)} />
                        </div>
                        <div className="form-group">
                          <label>فرع البنك</label>
                          <input className="form-control" name="branch" value={form.profile.branch} onChange={(e) => handleInputChange(e, true)} />
                        </div>
                        <div className="form-group">
                          <label>الرمز التعريفي (SWIFT/BIC)</label>
                          <input className="form-control" name="bankIdentifierCode" value={form.profile.bankIdentifierCode} onChange={(e) => handleInputChange(e, true)} />
                        </div>
                        <div className="form-group">
                          <label>الرقم التعريفي لدافع الضرائب</label>
                          <input className="form-control" name="taxId" value={form.profile.taxId} onChange={(e) => handleInputChange(e, true)} />
                        </div>
                      </div>
                    </div>
                  )}
                </form>
              </div>

              <div className="modal-footer">
                <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
                    <span className="toggle-slider"></span>
                  </label>
                  <span>موظف نشط</span>
                </div>
                <button type="button" className="btn btn-ghost" onClick={closeModal}>إلغاء</button>
                <button type="submit" form="employeeForm" className="btn btn-primary" disabled={saving}>
                  {saving ? 'جاري الحفظ...' : (activeUser ? 'تحديث البيانات' : 'إنشاء سجل الموظف')}
                </button>
              </div>
            </div>
          </div>

          <style>{`
            .modal-tabs .tab-btn {
              flex: 1;
              padding: 12px 10px;
              background: transparent;
              border: none;
              color: #888;
              font-size: 0.85rem;
              cursor: pointer;
              transition: all 0.2s;
              border-bottom: 2px solid transparent;
              white-space: nowrap;
            }
            .modal-tabs .tab-btn:hover {
              color: #eee;
              background: rgba(255,255,255,0.05);
            }
            .modal-tabs .tab-btn.active {
              color: var(--metro-blue);
              border-bottom-color: var(--metro-blue);
              background: rgba(0, 120, 215, 0.1);
            }
            .form-grid-2 {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 20px;
            }
            .anim-fade-in {
              animation: fadeIn 0.3s ease;
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(5px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .header-action-btns {
              display: flex;
              gap: 10px;
            }
            @media (max-width: 768px) {
              .header-action-btns {
                flex: 1 1 100%;
                justify-content: space-between;
              }
              .header-action-btns .btn-split {
                flex: 1;
                justify-content: center;
                padding: 10px 5px;
                font-size: 0.9rem;
              }
              .header-action-btns .btn-split:first-child {
                margin-left: 10px !important;
                margin-inline-end: 10px !important;
              }
            }
          `}</style>
        </ModalContainer>
      )}

      {/* Job Title Management Modal */}
      {showJobTitlesModal && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setShowJobTitlesModal(false); }}>
            <div className="modal" style={{ maxWidth: '800px' }}>
              <div className="modal-header">
                <h3>👔 إدارة المسميات الوظيفية</h3>
                <button className="modal-close" onClick={() => setShowJobTitlesModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px' }}>
                  {/* Form section */}
                  <div className="card" style={{ boxShadow: 'none', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
                    <div className="card-header"><h4>{editJobTitle ? 'تعديل مسمى' : 'إضافة مسمى جديد'}</h4></div>
                    <div className="card-body">
                      <form id="jtForm" onSubmit={handleSaveJobTitle}>
                        <div className="form-group">
                          <label>اسم المسمى *</label>
                          <input
                            className="form-control"
                            value={jtFormData.name}
                            onChange={(e) => setJtFormData({ ...jtFormData, name: e.target.value })}
                            placeholder="مثل: محاسب، مندوب..."
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>الوصف</label>
                          <textarea
                            className="form-control"
                            value={jtFormData.description}
                            onChange={(e) => setJtFormData({ ...jtFormData, description: e.target.value })}
                            style={{ height: '80px' }}
                            placeholder="وصف مختصر لمسؤوليات المسمى..."
                          ></textarea>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                          <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={jtSaving}>
                            {jtSaving ? '⏳ جاري الحفظ...' : (editJobTitle ? 'حفظ التعديلات' : 'إضافة المسمى')}
                          </button>
                          {editJobTitle && (
                            <button type="button" className="btn btn-ghost" onClick={() => { setEditJobTitle(null); setJtFormData({ name: '', description: '' }); }}>إلغاء</button>
                          )}
                        </div>
                      </form>
                    </div>
                  </div>

                  {/* List section */}
                  <div>
                    <h4 style={{ marginBottom: '15px' }}>قائمة المسميات الحالية ({jobTitles.length})</h4>
                    <div className="table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border-subtle)' }}>
                      <table className="data-table small">
                        <thead>
                          <tr>
                            <th>المسمى</th>
                            <th>الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {jobTitles.map(jt => (
                            <tr key={jt.id} className={editJobTitle?.id === jt.id ? 'active-row' : ''} style={editJobTitle?.id === jt.id ? { background: 'rgba(0, 120, 215, 0.1)' } : {}}>
                              <td>
                                <div style={{ fontWeight: 600, color: 'var(--metro-blue)' }}>{jt.name}</div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{jt.description || 'لا يوجد وصف'}</div>
                              </td>
                              <td>
                                <div className="table-actions">
                                  <button className="btn btn-icon btn-ghost" title="تعديل" onClick={() => { setEditJobTitle(jt); setJtFormData({ name: jt.name, description: jt.description || '' }); }}>✏️</button>
                                  <button className="btn btn-icon btn-ghost" title="حذف" onClick={() => handleDeleteJobTitle(jt.id, jt.name)}>🗑️</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {jobTitles.length === 0 && (
                            <tr><td colSpan="2" style={{ textAlign: 'center', padding: '20px' }}>لا توجد مسميات حالياً</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setShowJobTitlesModal(false)}>إغلاق</button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default Employees;
