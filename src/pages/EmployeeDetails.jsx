import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Api, { API_BASE } from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';

const EmployeeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, confirm } = useGlobalUI();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showIdModal, setShowIdModal] = useState(false);

  const API_IMAGE_BASE = 'http://localhost:8080/api/v1/products/images';

  useEffect(() => {
    loadEmployee();
  }, [id]);

  const loadEmployee = async () => {
    setLoading(true);
    try {
      const data = await Api.getUser(id);
      setEmployee(data);
    } catch (err) {
      toast('فشل في تحميل بيانات الموظف: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async () => {
    try {
      await Api.setUserEnabled(employee.id, !employee.enabled);
      setEmployee({ ...employee, enabled: !employee.enabled });
      toast(employee.enabled ? 'تم تعطيل الموظف' : 'تم تفعيل الموظف', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleDelete = () => {
    confirm(`هل أنت متأكد من حذف الموظف "${employee.name}"؟`, async () => {
      try {
        await Api.deleteUser(employee.id);
        toast('تم الحذف بنجاح', 'success');
        navigate('/employees');
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  };

  if (loading) return <Loader message="جاري جلب ملف الموظف..." />;
  if (!employee) return (
    <div className="page-section empty-state">
      <div className="empty-icon">👤</div>
      <h4>الموظف غير موجود</h4>
      <button className="btn btn-primary" onClick={() => navigate('/employees')}>العودة للقائمة</button>
    </div>
  );

  const profile = employee.profile || {};
  const isAdmin = (employee.roles || []).includes('ROLE_ADMIN');

  return (
    <>
      <div className="page-section anim-fade-in">
        {/* Header Toolbar */}
        <div className="toolbar" style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/employees')}>← عودة للموظفين</button>
          <div style={{ flex: 1 }}></div>
          <button className="btn btn-ghost" onClick={toggleStatus}>
            {employee.enabled ? '🔒 تعطيل الحساب' : '🔓 تفعيل الحساب'}
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>🗑️ حذف الموظف</button>
        </div>

        {/* Profile Header Card */}
        <div className="card profile-header-card" style={{ marginBottom: '20px', padding: '0', overflow: 'hidden' }}>
          <div className="profile-cover" style={{ height: '120px', background: 'var(--gradient-primary)', opacity: 0.8 }}></div>
          <div className="profile-header-content" style={{ padding: '0 30px 30px', marginTop: '-60px', display: 'flex', alignItems: 'flex-end', gap: '25px', flexWrap: 'wrap' }}>
            <div className="profile-avatar-large" style={{ width: '150px', height: '150px', borderRadius: '4px', border: '5px solid var(--bg-card)', background: 'var(--bg-elevated)', overflow: 'hidden', boxShadow: '0 8px 25px rgba(0,0,0,0.3)', flexShrink: 0 }}>
              {employee.profilePicture ? (
                <img src={`${API_IMAGE_BASE}/${employee.profilePicture}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '60px', background: 'var(--metro-blue)', color: '#fff' }}>
                  {(employee.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="profile-main-info" style={{ flex: 1, paddingBottom: '10px' }}>
              <h1 style={{ fontSize: '2.5rem', marginBottom: '5px' }}>{employee.name}</h1>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="badge badge-info" style={{ fontSize: '1rem', padding: '5px 15px' }}>{employee.jobTitle?.title || 'موظف'}</span>
                <span className={`badge ${employee.enabled ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.8rem' }}>
                  {employee.enabled ? 'نشط' : 'معطل'}
                </span>
                {isAdmin && <span className="badge" style={{ background: 'var(--metro-purple)', color: '#fff' }}>مسؤول نظام ⭐</span>}
                <span style={{ color: 'var(--text-muted)' }}>|</span>
                <span style={{ color: 'var(--text-muted)' }}>{employee.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="details-grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>

          {/* Account & Job Info */}
          <div className="card">
            <div className="card-header"><h3>💼 بيانات العمل والحساب</h3></div>
            <div className="card-body">
              <div className="detail-item">
                <label>المسمى الوظيفي:</label>
                <span>{employee.jobTitle?.title || '—'}</span>
              </div>
              <div className="detail-item">
                <label>البريد الإلكتروني:</label>
                <span>{employee.email}</span>
              </div>
              <div className="detail-item">
                <label>الأدوار:</label>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {(employee.roles || []).map(r => <span key={r} className="badge badge-info">{r.replace('ROLE_', '')}</span>)}
                </div>
              </div>
              <div className="detail-item">
                <label>تاريخ الانضمام:</label>
                <span title={profile.joiningDate ? `Raw: ${profile.joiningDate}` : 'No manual date'}>
                  {profile.joiningDate
                    ? (typeof profile.joiningDate === 'string'
                      ? profile.joiningDate
                      : (Array.isArray(profile.joiningDate)
                        ? `${profile.joiningDate[0]}-${profile.joiningDate[1]}-${profile.joiningDate[2]}`
                        : new Date(profile.joiningDate).toLocaleDateString('ar-EG')))
                    : (employee.createdAt
                      ? new Date(employee.createdAt).toLocaleDateString('ar-EG')
                      : '—')}
                </span>
              </div>
            </div>
          </div>

          {/* Personal Details */}
          <div className="card">
            <div className="card-header"><h3>👤 البيانات الشخصية</h3></div>
            <div className="card-body">
              <div className="form-grid-2">
                <div className="detail-item">
                  <label>تاريخ الميلاد:</label>
                  <span>
                    {profile.birthDate
                      ? (Array.isArray(profile.birthDate)
                        ? `${profile.birthDate[0]}-${profile.birthDate[1]}-${profile.birthDate[2]}`
                        : profile.birthDate)
                      : '—'}
                  </span>
                </div>
                <div className="detail-item">
                  <label>النوع:</label>
                  <span>{profile.gender === 'MALE' ? 'ذكر' : profile.gender === 'FEMALE' ? 'أنثى' : '—'}</span>
                </div>
                <div className="detail-item">
                  <label>الحالة الاجتماعية:</label>
                  <span>{profile.maritalStatus || '—'}</span>
                </div>
                <div className="detail-item">
                  <label>فصيلة الدم:</label>
                  <span style={{ color: 'var(--metro-red)', fontWeight: 'bold' }}>{profile.bloodType || '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="card">
            <div className="card-header"><h3>📞 بيانات الاتصال</h3></div>
            <div className="card-body">
              <div className="detail-item">
                <label>رقم الموبايل:</label>
                <span style={{ fontSize: '1.2rem', color: 'var(--metro-blue)' }}>{profile.mobileNumber || '—'}</span>
              </div>
              <div className="detail-item">
                <label>رقم بديل:</label>
                <span>{profile.alternativeMobileNumber || '—'}</span>
              </div>
              <div className="detail-item">
                <label>طوارئ (العائلة):</label>
                <span>{profile.familyContactNumber || '—'}</span>
              </div>
              <div className="detail-item" style={{ marginTop: '10px' }}>
                <label>التواصل الاجتماعي:</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  {profile.facebookLink && <a href={profile.facebookLink} target="_blank" rel="noreferrer" style={{ background: '#1877F2', color: '#fff', padding: '8px', borderRadius: '4px', textAlign: 'center', textDecoration: 'none', fontSize: '0.8rem' }}>Facebook</a>}
                  {profile.twitterLink && <a href={profile.twitterLink} target="_blank" rel="noreferrer" style={{ background: '#1DA1F2', color: '#fff', padding: '8px', borderRadius: '4px', textAlign: 'center', textDecoration: 'none', fontSize: '0.8rem' }}>Twitter</a>}
                  {profile.instagramLink && <a href={profile.instagramLink} target="_blank" rel="noreferrer" style={{ background: '#E4405F', color: '#fff', padding: '8px', borderRadius: '4px', textAlign: 'center', textDecoration: 'none', fontSize: '0.8rem' }}>Instagram</a>}
                  {profile.snapchatLink && <a href={profile.snapchatLink} target="_blank" rel="noreferrer" style={{ background: '#FFFC00', color: '#000', padding: '8px', borderRadius: '4px', textAlign: 'center', textDecoration: 'none', fontSize: '0.8rem' }}>Snapchat</a>}
                  {profile.whatsappNumber && <a href={`https://wa.me/${profile.whatsappNumber}`} target="_blank" rel="noreferrer" style={{ background: '#25D366', color: '#fff', padding: '8px', borderRadius: '4px', textAlign: 'center', textDecoration: 'none', fontSize: '0.8rem', gridColumn: 'span 2' }}>WhatsApp: {profile.whatsappNumber}</a>}
                </div>
              </div>
            </div>
          </div>

          {/* Identity Section */}
          <div className="card">
            <div className="card-header"><h3>🆔 الهوية الوطنية</h3></div>
            <div className="card-body" style={{ textAlign: 'center' }}>
              {profile.nationalIdImage ? (
                <div className="id-card-preview" onClick={() => setShowIdModal(true)} style={{ cursor: 'pointer', position: 'relative' }}>
                  <img src={`${API_IMAGE_BASE}/${profile.nationalIdImage}`} style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #333' }} alt="National ID" />
                  <div className="overlay-hint" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', opacity: 0, transition: '0.3s', color: '#fff', borderRadius: '8px' }}>
                    <span>🔍 انقر للتكبير</span>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '40px', color: 'var(--text-dim)', border: '2px dashed #333', borderRadius: '8px' }}>
                  صورة البطاقة غير مرفوعة
                </div>
              )}
            </div>
          </div>

          {/* Address Cards */}
          <div className="card">
            <div className="card-header"><h3>📍 العناوين</h3></div>
            <div className="card-body">
              <div className="detail-item">
                <label>العنوان الدائم:</label>
                <p style={{ color: 'var(--text-light)', marginTop: '5px' }}>{profile.permanentAddress || 'غير مسجل'}</p>
              </div>
              <div className="detail-item" style={{ marginTop: '15px' }}>
                <label>العنوان الحالي:</label>
                <p style={{ color: 'var(--text-light)', marginTop: '5px' }}>{profile.currentAddress || 'غير مسجل'}</p>
              </div>
            </div>
          </div>

          {/* Banking & Taxes */}
          <div className="card teal">
            <div className="card-header"><h3>💰 البيانات المالية والضريبية</h3></div>
            <div className="card-body">
              <div className="detail-item">
                <label>اسم الحساب:</label>
                <span>{profile.accountHolderName || '—'}</span>
              </div>
              <div className="detail-item">
                <label>رقم الحساب:</label>
                <span style={{ fontFamily: 'monospace', letterSpacing: '1px' }}>{profile.accountNumber || '—'}</span>
              </div>
              <div className="detail-item">
                <label>البنك / الفرع:</label>
                <span>{profile.bankName} {profile.branch ? `/ ${profile.branch}` : ''}</span>
              </div>
              <div className="detail-item">
                <label>الرقم الضريبي:</label>
                <span>{profile.taxId || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ID Image Modal */}
        {showIdModal && (
          <div className="modal-overlay active" onClick={() => setShowIdModal(false)} style={{ background: 'rgba(0,0,0,0.95)' }}>
            <div className="modal modal-xl" onClick={e => e.stopPropagation()} style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
              <div className="modal-header" style={{ border: 'none', background: 'transparent' }}>
                <button onClick={() => setShowIdModal(false)} style={{ color: '#fff', fontSize: '2rem' }}>✕</button>
              </div>
              <div className="modal-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <img src={`${API_IMAGE_BASE}/${profile.nationalIdImage}`} style={{ maxWidth: '100%', maxHeight: '80vh', border: '5px solid #fff', borderRadius: '5px' }} alt="" />
              </div>
            </div>
          </div>
        )}

        <style>{`
        .detail-item {
          margin-bottom: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          padding-bottom: 8px;
        }
        .detail-item label {
          display: block;
          font-size: 0.75rem;
          color: var(--text-dim);
          margin-bottom: 2px;
        }
        .detail-item span {
          font-weight: 400;
          color: var(--text-white);
        }
        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }
        .id-card-preview:hover .overlay-hint {
          opacity: 1 !important;
        }
        .card.teal .card-header { background: var(--metro-teal); }
        .card.teal .card-header h3 { color: #fff; }
      `}</style>
      </div>
    </>
  );
};

export default EmployeeDetails;
