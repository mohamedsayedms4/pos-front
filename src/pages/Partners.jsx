import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import StatTile from '../components/common/StatTile';

const Partners = () => {
  const navigate = useNavigate();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useGlobalUI();

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState({ show: false, partnerId: null, type: 'CAPITAL' });

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    sharePercentage: '',
    joinDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [actionForm, setActionForm] = useState({
    amount: '',
    description: ''
  });

  const [businessStats, setBusinessStats] = useState({
    totalCapital: 0,
    netProfit: 0,
    totalWithdrawals: 0
  });

  useEffect(() => {
    loadPartners();
  }, []);

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
      
      // Enrich partners with current period profit
      if (plRes && plRes.partnerShares) {
        partnersData.forEach(p => {
          const share = plRes.partnerShares.find(ps => ps.partnerId === p.id);
          if (share) p.currentPeriodProfit = share.profitAmount;
        });
      }

      setPartners(partnersData);
      
      if (partnersData.length > 0) {
        const totalCap = partnersData.reduce((acc, p) => acc + p.capitalInvested, 0);
        const totalWith = partnersData.reduce((acc, p) => acc + p.totalWithdrawn, 0);
        setBusinessStats({
          totalCapital: totalCap,
          netProfit: plRes?.netProfit || 0,
          totalWithdrawals: totalWith
        });
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPartner = async (e) => {
    e.preventDefault();
    try {
      await Api.createPartner(form);
      toast('تم إضافة الشريك بنجاح', 'success');
      setShowAddModal(false);
      setForm({ name: '', phone: '', email: '', sharePercentage: '', joinDate: new Date().toISOString().split('T')[0], notes: '' });
      loadPartners();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handlePartnerAction = async (e) => {
    e.preventDefault();
    const { partnerId, type } = showActionModal;
    try {
      if (type === 'CAPITAL') {
        await Api.addPartnerCapital(partnerId, actionForm);
        toast('تم إيداع رأس المال بنجاح', 'success');
      } else {
        await Api.partnerWithdraw(partnerId, actionForm);
        toast('تم تسجيل عملية السحب بنجاح', 'success');
      }
      setShowActionModal({ show: false, partnerId: null, type: 'CAPITAL' });
      setActionForm({ amount: '', description: '' });
      loadPartners();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="page-section anim-fade-in">
      {/* Metro Style Stats Header */}
      {!loading && partners.length > 0 && (
        <div className="stats-grid mb-4">
          <StatTile
            id="partners_total_capital"
            label="إجمالي رأس المال المودع"
            value={`${businessStats.totalCapital.toLocaleString()} ج.م`}
            icon="🏛️"
            defaults={{ color: 'emerald', size: 'tile-wd-sm' }}
          />
          <StatTile
            id="partners_net_profit"
            label="صافي ربح الصيدلية (الشهر)"
            value={`${businessStats.netProfit.toLocaleString()} ج.م`}
            icon={businessStats.netProfit >= 0 ? '📈' : '📉'}
            defaults={{ color: businessStats.netProfit >= 0 ? 'blue' : 'rose', size: 'tile-wd-sm' }}
            onClick={() => navigate('/profit-loss')}
          />
          <StatTile
            id="partners_withdrawals"
            label="إجمالي مسحوبات الشركاء"
            value={`${businessStats.totalWithdrawals.toLocaleString()} ج.م`}
            icon="💸"
            defaults={{ color: 'amber', size: 'tile-wd-sm' }}
          />
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3>👥 إدارة الشركاء والمساهمين</h3>
          <div className="toolbar">
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={loadPartners}>تحديث</button>
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                <span>+</span> إضافة شريك جديد
              </button>
            </div>
          </div>
        </div>

        <div className="card-body no-padding">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>الشريك</th>
                  <th>الحصة (%)</th>
                  <th>رأس المال المودع</th>
                  <th>ص. الربح (الشهر)</th>
                  <th>إجمالي المسحوبات</th>
                  <th>التاريخ</th>
                  <th style={{ width: '220px' }}>العمليات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" style={{ padding: '80px 0' }}><Loader message="جاري تحليل بيانات الشركاء والأرباح..." /></td></tr>
                ) : partners.length === 0 ? (
                  <tr><td colSpan="7" style={{ padding: '100px 0', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', opacity: 0.2 }}>👥</div>
                    <div style={{ color: 'var(--text-muted)', marginTop: '10px' }}>لا يوجد شركاء مسجلين حتى الآن</div>
                    <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => setShowAddModal(true)}>إضافة شريك جديد</button>
                  </td></tr>
                ) : (
                  partners.map(p => (
                    <tr key={p.id} className="anim-slide-in">
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: '#fff', fontWeight: 'bold' }}>
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <strong>{p.name}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{ background: 'rgba(52, 152, 219, 0.1)', color: 'var(--metro-blue)', border: '1px solid rgba(52, 152, 219, 0.2)' }}>
                          {p.sharePercentage}%
                        </span>
                      </td>
                      <td style={{ fontWeight: 'bold' }}>{p.capitalInvested.toLocaleString()} <small>ج.م</small></td>
                      <td style={{ color: 'var(--accent-emerald)', fontWeight: 'bold' }}>
                        + {(p.currentPeriodProfit || 0).toLocaleString()} <small>ج.م</small>
                      </td>
                      <td style={{ color: 'var(--accent-red)' }}>
                        - {p.totalWithdrawn.toLocaleString()} <small>ج.م</small>
                      </td>
                      <td style={{ fontSize: '0.85rem', opacity: 0.7 }}>{p.joinDate}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn btn-sm" 
                            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                            onClick={() => setShowActionModal({ show: true, partnerId: p.id, type: 'CAPITAL' })}
                          >
                            ➕ إيداع
                          </button>
                          <button 
                            className="btn btn-sm" 
                            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                            onClick={() => setShowActionModal({ show: true, partnerId: p.id, type: 'WITHDRAW' })}
                          >
                            ➖ سحب
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Partner Modal */}
      {showAddModal && (
        <ModalContainer>
          <div 
            className="modal-overlay active" 
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              width: '100vw', 
              height: '100vh', 
              background: 'rgba(0,0,0,0.85)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              zIndex: 999999 
            }}
          >
          <div className="modal-content" style={{ maxWidth: '500px', width: '90%', background: 'var(--bg-elevated)', border: '1px solid var(--border-input)' }}>
            <div className="modal-header">
              <h2>إضافة شريك جديد</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddPartner}>
              <div className="modal-body">
                <div className="form-group">
                  <label>اسم الشريك</label>
                  <input type="text" className="form-control" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>نسبة المشاركة (%)</label>
                  <input type="number" step="0.01" className="form-control" required value={form.sharePercentage} onChange={e => setForm({...form, sharePercentage: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>رقم الهاتف</label>
                  <input type="text" className="form-control" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>تاريخ الانضمام</label>
                  <input type="date" className="form-control" value={form.joinDate} onChange={e => setForm({...form, joinDate: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>ملاحظات</label>
                  <textarea className="form-control" rows="3" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ البيانات</button>
              </div>
            </form>
          </div>
        </div>
        </ModalContainer>
      )}

      {/* Action Modal (Capital/Withdraw) */}
      {showActionModal.show && (
        <ModalContainer>
          <div 
            className="modal-overlay active" 
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              width: '100vw', 
              height: '100vh', 
              background: 'rgba(0,0,0,0.85)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              zIndex: 999999 
            }}
          >
          <div className="modal-content" style={{ maxWidth: '400px', width: '90%', background: 'var(--bg-elevated)', border: '1px solid var(--border-input)' }}>
            <div className="modal-header">
              <h2>{showActionModal.type === 'CAPITAL' ? 'إيداع رأس مال' : 'سحب أموال'}</h2>
              <button className="close-btn" onClick={() => setShowActionModal({ show: false, partnerId: null, type: 'CAPITAL' })}>✕</button>
            </div>
            <form onSubmit={handlePartnerAction}>
              <div className="modal-body">
                <div className="form-group">
                  <label>المبلغ</label>
                  <input type="number" className="form-control" required value={actionForm.amount} onChange={e => setActionForm({...actionForm, amount: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>الوصف / السبب</label>
                  <textarea className="form-control" rows="2" value={actionForm.description} onChange={e => setActionForm({...actionForm, description: e.target.value})}></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowActionModal({ show: false, partnerId: null, type: 'CAPITAL' })}>إلغاء</button>
                <button type="submit" className={`btn ${showActionModal.type === 'CAPITAL' ? 'btn-primary' : 'btn-danger'}`}>
                  {showActionModal.type === 'CAPITAL' ? 'تأكيد الإيداع' : 'تأكيد السحب'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default Partners;
