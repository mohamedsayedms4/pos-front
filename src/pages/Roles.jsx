import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import { translatePermission, translateRole } from '../utils/permissionTranslations';

const Roles = () => {
  const navigate = useNavigate();
  const { toast, confirm } = useGlobalUI();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const rolesData = await Api.getRolesFull();
      setData(rolesData);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = (role) => {
    if (role.name === 'ROLE_ADMIN') {
        toast('لا يمكن حذف دور المشرف الرئيسي', 'error');
        return;
    }

    confirm(`سيتم حذف الدور "${translateRole(role.name)}" نهائياً. هل أنت متأكد؟`, async () => {
      try {
        await Api.deleteRole(role.id);
        toast('تم حذف الدور بنجاح', 'success');
        loadData();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  };

  return (
    <div className="page-section">
      <div className="card">
        <div className="card-header">
          <h3><i className="fa-solid fa-key"></i> إدارة الأدوار والصلاحيات</h3>
          {Api.can('ROLE_WRITE') && (
            <button className="btn btn-primary" onClick={() => navigate('/roles/add')}>
              <span>+</span> إضافة دور جديد
            </button>
          )}
        </div>
        <div className="card-body no-padding">
          <div className="table-wrapper">
            {loading ? (
              <Loader message="جاري تحميل الأدوار..." />
            ) : data.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><i className="fa-solid fa-key"></i></div>
                <h4>لا يوجد أدوار معرفة</h4>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '5%' }}>#</th>
                    <th style={{ width: '20%' }}>الدور</th>
                    <th style={{ width: '60%' }}>الصلاحيات الممنوحة</th>
                    <th style={{ width: '15%', textAlign: 'center' }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r, i) => {
                    const perms = r.permissions || [];
                    const displayCount = 8;
                    const displayedPerms = perms.slice(0, displayCount);
                    const remaining = perms.length - displayCount;

                    return (
                      <tr key={r.id}>
                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className={`badge ${r.name.includes('ADMIN') ? 'badge-primary' : 'badge-info'}`} style={{ fontSize: '0.9rem', padding: '6px 12px' }}>
                              {translateRole(r.name)}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {perms.length > 0 ? (
                              <>
                                {displayedPerms.map(p => (
                                  <span key={p} className="badge badge-ghost" style={{ fontSize: '0.75rem', opacity: 0.85 }}>
                                    {translatePermission(p)}
                                  </span>
                                ))}
                                {remaining > 0 && (
                                  <span className="badge badge-secondary" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                    و {remaining} صلاحيات أخرى
                                  </span>
                                )}
                              </>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>لا توجد صلاحيات</span>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="table-actions" style={{ justifyContent: 'center' }}>
                            {Api.can('ROLE_WRITE') && (
                              <button className="btn btn-icon btn-ghost" title="تعديل" onClick={() => navigate('/roles/edit/' + r.id)}>
                                <i className="fa-solid fa-pencil"></i>
                              </button>
                            )}
                            {Api.can('ROLE_DELETE') && (
                              <button 
                                  className="btn btn-icon btn-ghost" 
                                  title="حذف" 
                                  onClick={() => handleDelete(r)}
                                  disabled={r.name === 'ROLE_ADMIN'}
                              >
                                  <i className="fa-solid fa-trash"></i>
                              </button>
                            )}
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
      </div>
    </div>
  );
};

export default Roles;
