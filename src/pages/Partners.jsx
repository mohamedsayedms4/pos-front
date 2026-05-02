import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import '../styles/pages/PartnersPremium.css';

const Partners = () => {
  const navigate = useNavigate();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useGlobalUI();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState({ show: false, partnerId: null, type: 'CAPITAL' });

  const [form, setForm] = useState({ name: '', phone: '', email: '', sharePercentage: '', joinDate: new Date().toISOString().split('T')[0], notes: '' });
  const [actionForm, setActionForm] = useState({ amount: '', description: '' });
  const [businessStats, setBusinessStats] = useState({ totalCapital: 0, netProfit: 0, totalWithdrawals: 0 });

  useEffect(() => { loadPartners(); }, []);

  const loadPartners = async () => {
    setLoading(true);
    try {
      const [partnersRes, plRes] = await Promise.all([
        Api.getPartners(),
        Api.getProfitLossReport(
          new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0] + 'T00:00:00',
          new Date().toISOString().split('T')[0] + 'T23:59:59'
        ).catch(() => null)
      ]);

      const partnersData = partnersRes || [];
      if (plRes?.partnerShares) {
        partnersData.forEach(p => {
          const share = plRes.partnerShares.find(ps => ps.partnerId === p.id);
          if (share) p.currentPeriodProfit = share.profitAmount;
        });
      }
      setPartners(partnersData);
      
      const totalCap = partnersData.reduce((acc, p) => acc + (p.capitalInvested || 0), 0);
      const totalWith = partnersData.reduce((acc, p) => acc + (p.totalWithdrawn || 0), 0);
      setBusinessStats({ totalCapital: totalCap, netProfit: plRes?.netProfit || 0, totalWithdrawals: totalWith });
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleAddPartner = async (e) => {
    e.preventDefault();
    try {
      await Api.createPartner(form);
      toast('تم إضافة الشريك بنجاح', 'success');
      setShowAddModal(false);
      setForm({ name: '', phone: '', email: '', sharePercentage: '', joinDate: new Date().toISOString().split('T')[0], notes: '' });
      loadPartners();
    } catch (err) { toast(err.message, 'error'); }
  };

  const handlePartnerAction = async (e) => {
    e.preventDefault();
    const { partnerId, type } = showActionModal;
    try {
      if (type === 'CAPITAL') await Api.addPartnerCapital(partnerId, actionForm);
      else await Api.partnerWithdraw(partnerId, actionForm);
      toast(type === 'CAPITAL' ? 'تم إيداع رأس المال بنجاح' : 'تم تسجيل عملية السحب بنجاح', 'success');
      setShowActionModal({ show: false, partnerId: null, type: 'CAPITAL' });
      setActionForm({ amount: '', description: '' });
      loadPartners();
    } catch (err) { toast(err.message, 'error'); }
  };

  return (
    <div className="partners-container">
      {/* 1. Header */}
      <div className="prt-header-row">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="prt-breadcrumbs">
            <Link to="/dashboard">الرئيسية</Link> / <span>الإدارة</span>
          </div>
          <h1>الشركاء والمساهمين</h1>
        </div>
        <div className="prt-header-actions">
          <button className="prt-btn-premium prt-btn-blue" onClick={() => setShowAddModal(true)}>
            <i className="fas fa-user-plus"></i> إضافة شريك جديد
          </button>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="prt-stats-grid">
        <div className="prt-stat-card">
          <div className="prt-stat-info">
            <h4>إجمالي رأس المال</h4>
            <div className="prt-stat-value">{businessStats.totalCapital.toLocaleString('ar-EG')} <span style={{fontSize: '0.8rem'}}>ج.م</span></div>
          </div>
          <div className="prt-stat-visual">
            <div className="prt-stat-icon icon-green">
              <i className="fas fa-vault"></i>
            </div>
          </div>
        </div>
        <div className="prt-stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/profit-loss')}>
          <div className="prt-stat-info">
            <h4>صافي ربح الشهر</h4>
            <div className="prt-stat-value" style={{ color: businessStats.netProfit >= 0 ? 'var(--prt-accent-blue)' : '#f43f5e' }}>
              {businessStats.netProfit.toLocaleString('ar-EG')} <span style={{fontSize: '0.8rem'}}>ج.م</span>
            </div>
          </div>
          <div className="prt-stat-visual">
            <div className="prt-stat-icon icon-blue">
              <i className={`fas ${businessStats.netProfit >= 0 ? 'fa-chart-line' : 'fa-chart-bar'}`}></i>
            </div>
          </div>
        </div>
        <div className="prt-stat-card">
          <div className="prt-stat-info">
            <h4>إجمالي المسحوبات</h4>
            <div className="prt-stat-value" style={{ color: '#f59e0b' }}>{businessStats.totalWithdrawals.toLocaleString('ar-EG')} <span style={{fontSize: '0.8rem'}}>ج.م</span></div>
          </div>
          <div className="prt-stat-visual">
            <div className="prt-stat-icon icon-amber">
              <i className="fas fa-hand-holding-usd"></i>
            </div>
          </div>
        </div>
        <div className="prt-stat-card">
          <div className="prt-stat-info">
            <h4>عدد الشركاء</h4>
            <div className="prt-stat-value">{partners.length} <span style={{fontSize: '0.8rem'}}>شريك</span></div>
          </div>
          <div className="prt-stat-visual">
            <div className="prt-stat-icon icon-purple">
              <i className="fas fa-users"></i>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Table Card */}
      <div className="prt-table-card">
        <div className="prt-table-container">
          {loading ? (
            <div style={{ padding: '40px' }}><Loader message="جاري تحليل بيانات الشركاء..." /></div>
          ) : partners.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--prt-text-secondary)' }}>
              <i className="fas fa-users" style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}></i>
              <h3>لا يوجد شركاء مسجلين</h3>
            </div>
          ) : (
            <table className="prt-table">
              <thead>
                <tr>
                  <th>الشريك</th>
                  <th>الحصة (%)</th>
                  <th>رأس المال المودع</th>
                  <th>أرباح الفترة</th>
                  <th>إجمالي المسحوبات</th>
                  <th>تاريخ الانضمام</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {partners.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--prt-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800 }}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ fontWeight: 800 }}>{p.name}</div>
                      </div>
                    </td>
                    <td><span className="prt-type-badge badge-blue">{p.sharePercentage}%</span></td>
                    <td style={{ fontWeight: 700 }}>{p.capitalInvested.toLocaleString('ar-EG')} ج.م</td>
                    <td style={{ color: 'var(--prt-accent-green)', fontWeight: 800 }}>+ {(p.currentPeriodProfit || 0).toLocaleString('ar-EG')}</td>
                    <td style={{ color: '#f43f5e', fontWeight: 800 }}>- {p.totalWithdrawn.toLocaleString('ar-EG')}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--prt-text-secondary)' }}>{p.joinDate}</td>
                    <td>
                      <div className="prt-actions">
                        <button className="prt-btn-premium prt-btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setShowActionModal({ show: true, partnerId: p.id, type: 'CAPITAL' })}>
                          <i className="fas fa-plus"></i> إيداع
                        </button>
                        <button className="prt-btn-premium prt-btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setShowActionModal({ show: true, partnerId: p.id, type: 'WITHDRAW' })}>
                          <i className="fas fa-minus"></i> سحب
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

      {showAddModal && (
        <ModalContainer>
          <div className="prt-modal-overlay" onClick={(e) => { if (e.target.classList.contains('prt-modal-overlay')) setShowAddModal(false); }}>
            <div className="prt-modal" style={{ maxWidth: '600px' }}>
              <div className="prt-modal-header">
                <h3>إضافة شريك جديد</h3>
                <button className="prt-modal-close" onClick={() => setShowAddModal(false)}>✕</button>
              </div>
              <div className="prt-modal-body">
                <form id="partnerForm" onSubmit={handleAddPartner}>
                  <div className="prt-form-group">
                    <label>اسم الشريك</label>
                    <input type="text" className="prt-input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="prt-form-group">
                      <label>نسبة المشاركة (%)</label>
                      <input type="number" step="0.01" className="prt-input" required value={form.sharePercentage} onChange={e => setForm({...form, sharePercentage: e.target.value})} />
                    </div>
                    <div className="prt-form-group">
                      <label>تاريخ الانضمام</label>
                      <input type="date" className="prt-input" value={form.joinDate} onChange={e => setForm({...form, joinDate: e.target.value})} />
                    </div>
                  </div>
                  <div className="prt-form-group">
                    <label>رقم الهاتف</label>
                    <input type="text" className="prt-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                  </div>
                  <div className="prt-form-group">
                    <label>ملاحظات</label>
                    <textarea className="prt-textarea" rows="3" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                  </div>
                </form>
              </div>
              <div className="prt-modal-footer">
                <button type="button" className="prt-btn-ghost" onClick={() => setShowAddModal(false)}>إلغاء</button>
                <button type="submit" form="partnerForm" className="prt-btn-primary">حفظ الشريك</button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {showActionModal.show && (
        <ModalContainer>
          <div className="prt-modal-overlay" onClick={(e) => { if (e.target.classList.contains('prt-modal-overlay')) setShowActionModal({ show: false, partnerId: null, type: 'CAPITAL' }); }}>
            <div className="prt-modal" style={{ maxWidth: '450px' }}>
              <div className="prt-modal-header">
                <h3>{showActionModal.type === 'CAPITAL' ? 'إيداع رأس مال' : 'سحب أموال'}</h3>
                <button className="prt-modal-close" onClick={() => setShowActionModal({ show: false, partnerId: null, type: 'CAPITAL' })}>✕</button>
              </div>
              <div className="prt-modal-body">
                <form id="actionForm" onSubmit={handlePartnerAction}>
                  <div className="prt-form-group">
                    <label>المبلغ (ج.م)</label>
                    <input type="number" className="prt-input" required value={actionForm.amount} onChange={e => setActionForm({...actionForm, amount: e.target.value})} style={{ fontSize: '1.2rem', fontWeight: 800 }} />
                  </div>
                  <div className="prt-form-group">
                    <label>الوصف / السبب</label>
                    <textarea className="prt-textarea" rows="2" value={actionForm.description} onChange={e => setActionForm({...actionForm, description: e.target.value})} />
                  </div>
                </form>
              </div>
              <div className="prt-modal-footer">
                <button type="button" className="prt-btn-ghost" onClick={() => setShowActionModal({ show: false, partnerId: null, type: 'CAPITAL' })}>إلغاء</button>
                <button type="submit" form="actionForm" className={`prt-btn-primary ${showActionModal.type === 'WITHDRAW' ? 'btn-danger' : ''}`} style={showActionModal.type === 'WITHDRAW' ? {background: '#f43f5e'} : {}}>
                  {showActionModal.type === 'CAPITAL' ? 'تأكيد الإيداع' : 'تأكيد السحب'}
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default Partners;
