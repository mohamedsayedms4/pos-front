import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import '../styles/pages/BranchesPremium.css';

const Branches = () => {
  const navigate = useNavigate();
  const { toast, confirm } = useGlobalUI();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState(null); 
  const [activeBranch, setActiveBranch] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({ code: '', name: '', address: '', phone: '', type: 'RETAIL', enabled: true, treasuryLinkType: 'MANUAL' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try { const res = await Api.getBranches(); setData(res || []); }
    catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const openForm = (branch = null) => {
    setActiveBranch(branch);
    if (branch) setFormData({ code: branch.code || '', name: branch.name || '', address: branch.address || '', phone: branch.phone || '', type: branch.type || 'RETAIL', enabled: branch.enabled ?? true, treasuryLinkType: branch.treasuryLinkType || 'MANUAL' });
    else setFormData({ code: '', name: '', address: '', phone: '', type: 'RETAIL', enabled: true, treasuryLinkType: 'MANUAL' });
    setModalType('form');
  };

  const closeModal = () => { setModalType(null); setActiveBranch(null); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = activeBranch ? 'PUT' : 'POST';
      const url = activeBranch ? `/branches/${activeBranch.id}` : '/branches';
      await Api._request(url, { method, body: JSON.stringify(formData) });
      toast('تم الحفظ بنجاح', 'success'); closeModal(); loadData();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="branches-container">
      {/* 1. Header */}
      <div className="bra-header-row">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="bra-breadcrumbs">
            <Link to="/dashboard">الرئيسية</Link> / <span>الإعدادات</span>
          </div>
          <h1>إدارة الفروع والمواقع</h1>
        </div>
        <div className="bra-header-actions">
          <button className="bra-btn-premium bra-btn-blue" onClick={() => openForm()}>
            <i className="fas fa-plus-circle"></i> إضافة فرع جديد
          </button>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="bra-stats-grid">
        <div className="bra-stat-card">
          <div className="bra-stat-info">
            <h4>إجمالي الفروع</h4>
            <div className="bra-stat-value">{data.length}</div>
          </div>
          <div className="bra-stat-visual"><div className="bra-stat-icon icon-blue"><i className="fas fa-building"></i></div></div>
        </div>
        <div className="bra-stat-card">
          <div className="bra-stat-info">
            <h4>فروع التجزئة</h4>
            <div className="bra-stat-value" style={{ color: 'var(--bra-accent-amber)' }}>{data.filter(b => b.type === 'RETAIL').length}</div>
          </div>
          <div className="bra-stat-visual"><div className="bra-stat-icon icon-amber"><i className="fas fa-store"></i></div></div>
        </div>
        <div className="bra-stat-card">
          <div className="bra-stat-info">
            <h4>المتجر الإلكتروني</h4>
            <div className="bra-stat-value" style={{ color: 'var(--bra-accent-purple)' }}>{data.filter(b => b.type === 'ONLINE').length}</div>
          </div>
          <div className="bra-stat-visual"><div className="bra-stat-icon icon-purple"><i className="fas fa-globe"></i></div></div>
        </div>
        <div className="bra-stat-card">
          <div className="bra-stat-info">
            <h4>الفروع النشطة</h4>
            <div className="bra-stat-value" style={{ color: 'var(--bra-accent-green)' }}>{data.filter(b => b.enabled).length}</div>
          </div>
          <div className="bra-stat-visual"><div className="bra-stat-icon icon-green"><i className="fas fa-check-circle"></i></div></div>
        </div>
      </div>

      {/* 3. Table Card */}
      <div className="bra-table-card">
        <div className="bra-table-container">
          {loading ? (
            <div style={{ padding: '60px' }}><Loader message="جاري جلب بيانات الفروع..." /></div>
          ) : data.length === 0 ? (
            <div style={{ padding: '80px', textAlign: 'center', color: 'var(--bra-text-secondary)' }}>
              <i className="fas fa-city" style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}></i>
              <h3>لا توجد فروع مسجلة حالياً</h3>
            </div>
          ) : (
            <table className="bra-table">
              <thead>
                <tr>
                  <th>الفرع</th>
                  <th>النوع</th>
                  <th>العنوان</th>
                  <th>الهاتف</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {data.map(b => (
                  <tr key={b.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--bra-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 900 }}>{b.name.charAt(0)}</div>
                        <div><div style={{ fontWeight: 800 }}>{b.name}</div><div style={{ fontSize: '0.7rem', color: 'var(--bra-text-secondary)' }}>كود: {b.code}</div></div>
                      </div>
                    </td>
                    <td>
                      <span className={`bra-type-badge ${b.type === 'ONLINE' ? 'badge-purple' : b.type === 'WAREHOUSE_ONLY' ? 'badge-amber' : 'badge-blue'}`}>
                        {b.type === 'ONLINE' ? 'متجر إلكتروني' : b.type === 'WAREHOUSE_ONLY' ? 'مخزن فقط' : 'فرع تجزئة'}
                      </span>
                    </td>
                    <td>{b.address || '—'}</td>
                    <td>{b.phone || '—'}</td>
                    <td>
                       <span className={`bra-type-badge ${b.enabled ? 'badge-green' : 'badge-red'}`}>
                        {b.enabled ? 'نشط ✓' : 'معطل ✗'}
                      </span>
                    </td>
                    <td>
                      <div className="bra-actions">
                        <button className="bra-action-btn" title="الإعدادات" onClick={() => navigate(`/branches/${b.id}/manage`)}><i className="fas fa-cog"></i></button>
                        <button className="bra-action-btn" title="تعديل" onClick={() => openForm(b)}><i className="fas fa-edit"></i></button>
                        <button className="bra-action-btn delete" title="حذف" onClick={() => confirm(`حذف فرع ${b.name}؟`, () => Api._request(`/branches/${b.id}`, {method:'DELETE'}).then(loadData))}><i className="fas fa-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalType === 'form' && (
        <ModalContainer>
          <div className="bra-modal-overlay" onClick={closeModal}>
            <div className="bra-modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
              <div className="bra-modal-header">
                <h3>{activeBranch ? 'تعديل بيانات الفرع' : 'إضافة فرع جديد'}</h3>
                <button className="bra-modal-close" onClick={closeModal}>✕</button>
              </div>
              <div className="bra-modal-body">
                <form id="braForm" onSubmit={handleSave}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="bra-form-group">
                      <label>كود الفرع *</label>
                      <input className="bra-input" required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="BR-01" />
                    </div>
                    <div className="bra-form-group">
                      <label>اسم الفرع *</label>
                      <input className="bra-input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                  </div>
                  <div className="bra-form-group" style={{ marginTop: '20px' }}>
                    <label>نوع الفرع</label>
                    <select className="bra-input" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                      <option value="RETAIL">فرع تجزئة (بيع مباشر)</option>
                      <option value="WAREHOUSE_ONLY">مخزن فقط</option>
                      <option value="ONLINE">متجر إلكتروني</option>
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                    <div className="bra-form-group">
                      <label>العنوان</label>
                      <input className="bra-input" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                    </div>
                    <div className="bra-form-group">
                      <label>الهاتف</label>
                      <input className="bra-input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    </div>
                  </div>
                  <div className="bra-form-group" style={{ marginTop: '20px' }}>
                    <label>نظام ربط الخزينة</label>
                    <select className="bra-input" value={formData.treasuryLinkType} onChange={e => setFormData({...formData, treasuryLinkType: e.target.value})}>
                      <option value="MANUAL">يدوي (يتم توريد المبالغ للمركزية يدوياً)</option>
                      <option value="AUTOMATIC">تلقائي (تسميع فوري في الخزينة المركزية)</option>
                    </select>
                  </div>
                </form>
              </div>
              <div className="bra-modal-footer">
                <button type="button" className="bra-btn-ghost" onClick={closeModal}>إلغاء</button>
                <button type="submit" form="braForm" className="bra-btn-primary" disabled={saving}>حفظ البيانات</button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default Branches;
