import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import { translatePermission } from '../utils/permissionTranslations';

const PERMISSION_MODULES = [
  {
    id: 'system',
    label: 'إدارة النظام والمستخدمين',
    icon: 'fa-solid fa-gear',
    keywords: ['USER_', 'ROLE_', 'AUDIT_', 'SETTINGS_', 'CHAT_']
  },
  {
    id: 'branches',
    label: 'الفروع والمستودعات',
    icon: 'fa-solid fa-building',
    keywords: ['BRANCH_', 'WAREHOUSE_']
  },
  {
    id: 'products',
    label: 'المنتجات والتصنيفات',
    icon: 'fa-solid fa-box',
    keywords: ['PRODUCT_', 'CATEGORY_']
  },
  {
    id: 'parties',
    label: 'جهات التعامل',
    icon: 'fa-solid fa-users',
    keywords: ['CUSTOMER_', 'SUPPLIER_', 'PARTNER_']
  },
  {
    id: 'sales_purchases',
    label: 'المبيعات والمشتريات',
    icon: 'fa-solid fa-cart-shopping',
    keywords: ['SALE_', 'PURCHASE_', 'OFFER_']
  },
  {
    id: 'inventory',
    label: 'المخزون والجرد',
    icon: 'fa-solid fa-boxes-stacked',
    keywords: ['STOCK_', 'INVENTORY_', 'DAMAGED_GOODS_']
  },
  {
    id: 'finance',
    label: 'المالية والحسابات',
    icon: 'fa-solid fa-vault',
    keywords: ['TREASURY_', 'EXPENSE_', 'FIXED_ASSET_', 'PROFIT_LOSS_']
  },
  {
    id: 'hr',
    label: 'الموارد البشرية (HR)',
    icon: 'fa-solid fa-user-tie',
    keywords: ['ATTENDANCE_', 'LEAVE_', 'SHIFT_', 'JOB_TITLE_', 'PAYROLL_']
  },
  {
    id: 'other',
    label: 'صلاحيات أخرى',
    icon: 'fa-solid fa-ellipsis',
    keywords: [] // Catch-all
  }
];

const RoleForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useGlobalUI();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({ name: '', permissions: [] });
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [groupedPermissions, setGroupedPermissions] = useState({});
  const [activeSection, setActiveSection] = useState('basic');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const perms = await Api.getPermissions();
        setAvailablePermissions(perms);

        // Group permissions
        const grouped = {};
        PERMISSION_MODULES.forEach(m => grouped[m.id] = []);
        
        perms.forEach(p => {
          let placed = false;
          for (const mod of PERMISSION_MODULES) {
            if (mod.keywords.length > 0 && mod.keywords.some(kw => p.startsWith(kw))) {
              grouped[mod.id].push(p);
              placed = true;
              break;
            }
          }
          if (!placed) {
            grouped['other'].push(p);
          }
        });
        setGroupedPermissions(grouped);

        if (id) {
          // Fetch Role
          // Actually getRolesFull gets all, we can filter or maybe there is a getRole
          const roles = await Api.getRolesFull();
          const role = roles.find(r => String(r.id) === String(id));
          if (role) {
            setFormData({
              name: role.name.replace('ROLE_', ''),
              permissions: role.permissions || []
            });
          } else {
            toast('لم يتم العثور على الدور', 'error');
            navigate('/roles');
          }
        }
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // ScrollSpy
  useEffect(() => {
    const sectionIds = ['basic', ...PERMISSION_MODULES.map(m => m.id)];
    const observers = sectionIds.map((sid) => {
      const el = document.getElementById(sid);
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(sid); },
        { rootMargin: '-20% 0px -60% 0px', threshold: 0.01 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach(o => o?.disconnect());
  }, [loading]);

  const scrollTo = (sid) => {
    document.getElementById(sid)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(sid);
  };

  const handleSave = async (e, addAnother = false) => {
    if (e) e.preventDefault();
    if (!formData.name) {
      toast('يرجى تحديد اسم الدور', 'warning');
      return;
    }
    
    setSaving(true);
    try {
      if (id) {
        await Api.updateRole(id, formData);
        toast('تم تحديث الدور بنجاح', 'success');
      } else {
        await Api.createRole(formData);
        toast('تم إضافة الدور بنجاح', 'success');
      }
      
      if (addAnother && !id) {
         setFormData({ name: '', permissions: [] });
         window.scrollTo(0, 0);
         return;
      }
      navigate('/roles');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (perm) => {
    const newPerms = formData.permissions.includes(perm)
      ? formData.permissions.filter(p => p !== perm)
      : [...formData.permissions, perm];
    setFormData({ ...formData, permissions: newPerms });
  };

  const toggleModulePermissions = (moduleId) => {
    const modPerms = groupedPermissions[moduleId];
    const allSelected = modPerms.every(p => formData.permissions.includes(p));
    
    if (allSelected) {
      setFormData({ ...formData, permissions: formData.permissions.filter(p => !modPerms.includes(p)) });
    } else {
      const newPerms = [...new Set([...formData.permissions, ...modPerms])];
      setFormData({ ...formData, permissions: newPerms });
    }
  };

  if (loading) return <Loader message="جاري التحميل..." />;

  const isSystemAdmin = formData.name.toUpperCase() === 'ADMIN';

  return (
    <div style={{ direction: 'rtl', minHeight: '100vh', paddingBottom: '60px' }}>
      {/* ── Sticky Page Header ── */}
      <div className="settings-page-header" style={{ padding: '14px 24px', marginBottom: 0 }}>
        <div>
          <span className="settings-eyebrow">إدارة الأدوار</span>
          <h1 style={{ margin: 0, fontSize: 'clamp(20px,2vw,28px)', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {id ? 'تعديل بيانات الصلاحيات والدور' : 'إضافة دور جديد'}
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--muted, #697386)', fontSize: 14 }}>
            حدد اسم الدور والصلاحيات الممنوحة له.
          </p>
        </div>
        <div className="header-buttons">
          <button
            className="btn-seggele btn-seggele--secondary"
            type="button"
            onClick={() => navigate('/roles')}
            disabled={saving}
          >
            <i className="fa-solid fa-arrow-right"></i> إلغاء
          </button>
          {!id && (
            <button
              className="btn-seggele btn-seggele--secondary"
              type="button"
              onClick={(e) => handleSave(e, true)}
              disabled={saving}
            >
              <i className="fa-solid fa-plus"></i> حفظ وإضافة آخر
            </button>
          )}
          <button
            className="btn-seggele btn-seggele--primary"
            type="submit"
            form="roleForm"
            disabled={saving || isSystemAdmin}
          >
            {saving
              ? <><i className="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...</>
              : <><i className="fa-solid fa-check"></i> {id ? 'حفظ التعديلات' : 'حفظ الدور'}</>
            }
          </button>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="settings-layout" style={{ padding: '24px' }}>
        {/* ── Sidebar Nav ── */}
        <aside className="settings-nav">
          <nav>
            <button
              type="button"
              className={`section-link ${activeSection === 'basic' ? 'active' : ''}`}
              onClick={() => scrollTo('basic')}
            >
              <i className="fa-solid fa-id-card"></i>
              <span>البيانات الأساسية</span>
              {activeSection === 'basic' && <span className="active-dot" />}
            </button>
            <div style={{ marginTop: 12, marginBottom: 8, padding: '0 12px', fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>
              الموديولات
            </div>
            {PERMISSION_MODULES.filter(m => groupedPermissions[m.id]?.length > 0).map(({ id: sid, label, icon }) => (
              <button
                key={sid}
                type="button"
                className={`section-link ${activeSection === sid ? 'active' : ''}`}
                onClick={() => scrollTo(sid)}
              >
                <i className={icon}></i>
                <span>{label}</span>
                {activeSection === sid && <span className="active-dot" />}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Content ── */}
        <div className="settings-content">
          <form id="roleForm" onSubmit={(e) => handleSave(e, false)}>
            
            {/* ─ 1. Basic Data ─ */}
            <div id="basic" style={{ scrollMarginTop: 120, marginBottom: 40 }}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>البيانات الأساسية</h2>
              </div>
              <section className="settings-card">
                <div className="card-body">
                  <div className="form-group">
                    <label>اسم الدور <span className="required">*</span></label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>ROLE_</span>
                      <input 
                        className="form-control" 
                        placeholder="ADMIN, MANAGER, CASHIER..." 
                        value={formData.name} 
                        onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase().replace(/\s+/g, '_') })} 
                        required 
                        disabled={isSystemAdmin}
                      />
                    </div>
                    <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                      سيتم تحويل الاسم تلقائياً إلى حروف كبيرة وإضافة ROLE_ كبادئة.
                    </small>
                  </div>
                </div>
              </section>
            </div>

            {/* ─ Modules ─ */}
            <div style={{ marginBottom: 16, marginTop: 40 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>الصلاحيات الممنوحة ({formData.permissions.length})</h2>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>يمكنك تفعيل وإلغاء تفعيل الصلاحيات بحسب الموديول.</p>
            </div>

            {PERMISSION_MODULES.filter(m => groupedPermissions[m.id]?.length > 0).map(module => {
              const modPerms = groupedPermissions[module.id];
              const allSelected = modPerms.every(p => formData.permissions.includes(p));
              const someSelected = modPerms.some(p => formData.permissions.includes(p)) && !allSelected;

              return (
                <div id={module.id} key={module.id} style={{ scrollMarginTop: 120, marginBottom: 24 }}>
                  <section className="settings-card" style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', background: 'var(--surface-2, #f8fafc)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <i className={module.icon} style={{ color: 'var(--primary, #3b82f6)', fontSize: 18 }}></i>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{module.label}</h3>
                      </div>
                      <button 
                        type="button" 
                        className="btn btn-ghost" 
                        onClick={() => toggleModulePermissions(module.id)}
                        disabled={isSystemAdmin}
                        style={{ fontSize: 13, padding: '4px 12px' }}
                      >
                        {allSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                      </button>
                    </div>
                    <div className="card-body">
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
                        gap: '12px'
                      }}>
                        {modPerms.map(p => (
                          <label 
                            key={p} 
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '10px', 
                                cursor: isSystemAdmin ? 'not-allowed' : 'pointer',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                background: formData.permissions.includes(p) ? 'rgba(59, 130, 246, 0.05)' : 'rgba(0,0,0,0.01)',
                                border: formData.permissions.includes(p) ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid var(--border)',
                                transition: 'all 0.2s'
                            }}
                          >
                            <input 
                              type="checkbox" 
                              checked={formData.permissions.includes(p)} 
                              onChange={() => togglePermission(p)}
                              disabled={isSystemAdmin}
                              style={{ 
                                accentColor: 'var(--primary)',
                                width: 16, height: 16
                              }}
                            />
                            <span style={{ fontSize: '0.9rem', fontWeight: formData.permissions.includes(p) ? 600 : 400, color: formData.permissions.includes(p) ? 'var(--primary)' : 'inherit' }}>
                              {translatePermission(p)}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </section>
                </div>
              );
            })}

          </form>
        </div>
      </div>
    </div>
  );
};

export default RoleForm;
