import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import '../styles/pages/TreasuryManagementPremium.css';

const TreasuryManagement = () => {
  const { toast } = useGlobalUI();
  const [treasuries, setTreasuries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferData, setTransferData] = useState({ fromBranchId: '', amount: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await Api.getTreasuryOverview();
      setTreasuries(data || []);
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!transferData.fromBranchId || !transferData.amount) {
      toast('يرجى اختيار الفرع وتحديد المبلغ', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await Api.transferToCentral(transferData);
      toast('تم تحويل المبلغ بنجاح', 'success');
      setShowTransferModal(false);
      setTransferData({ fromBranchId: '', amount: '', notes: '' });
      loadData();
    } catch (err) { toast(err.message, 'error'); }
    finally { setIsSubmitting(false); }
  };

  const centralTreasury = treasuries.find(t => t.isCentral);
  const branchTreasuries = treasuries.filter(t => !t.isCentral);
  const totalBalance = treasuries.reduce((sum, t) => sum + (t.balance || 0), 0);

  return (
    <div className="treasury-management-container">
      {/* 1. Header */}
      <div className="tm-header-row">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="tm-breadcrumbs">
            <Link to="/dashboard">الرئيسية</Link> / <span>المالية</span>
          </div>
          <h1>إدارة الخزائن</h1>
        </div>
        <div className="tm-header-actions">
          <button className="tm-btn-premium tm-btn-blue" onClick={() => setShowTransferModal(true)}>
            <i className="fas fa-exchange-alt"></i> تحويل مبالغ للمركزية
          </button>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="tm-stats-grid">
        <div className="tm-stat-card">
          <div className="tm-stat-info">
            <h4>إجمالي السيولة</h4>
            <div className="tm-stat-value">{totalBalance.toLocaleString('ar-EG')} <span style={{fontSize: '0.8rem'}}>ج.م</span></div>
          </div>
          <div className="tm-stat-visual">
            <div className="tm-stat-icon icon-purple">
              <i className="fas fa-coins"></i>
            </div>
          </div>
        </div>
        <div className="tm-stat-card">
          <div className="tm-stat-info">
            <h4>الخزينة المركزية</h4>
            <div className="tm-stat-value">{centralTreasury?.balance?.toLocaleString('ar-EG') || '0'} <span style={{fontSize: '0.8rem'}}>ج.م</span></div>
          </div>
          <div className="tm-stat-visual">
            <div className="tm-stat-icon icon-green">
              <i className="fas fa-landmark"></i>
            </div>
          </div>
        </div>
        <div className="tm-stat-card">
          <div className="tm-stat-info">
            <h4>خزائن الفروع</h4>
            <div className="tm-stat-value">{branchTreasuries.reduce((sum, t) => sum + (t.balance || 0), 0).toLocaleString('ar-EG')} <span style={{fontSize: '0.8rem'}}>ج.م</span></div>
          </div>
          <div className="tm-stat-visual">
            <div className="tm-stat-icon icon-blue">
              <i className="fas fa-store"></i>
            </div>
          </div>
        </div>
        <div className="tm-stat-card">
          <div className="tm-stat-info">
            <h4>عدد الخزائن</h4>
            <div className="tm-stat-value">{treasuries.length} <span style={{fontSize: '0.8rem'}}>خزينة</span></div>
          </div>
          <div className="tm-stat-visual">
            <div className="tm-stat-icon icon-amber">
              <i className="fas fa-vault"></i>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Table Card */}
      <div className="tm-table-card">
        <div className="tm-table-container">
          {loading ? (
            <div style={{ padding: '40px' }}><Loader message="جاري التحميل..." /></div>
          ) : treasuries.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--tm-text-secondary)' }}>
              <i className="fas fa-vault" style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}></i>
              <h3>لا توجد بيانات خزائن</h3>
            </div>
          ) : (
            <table className="tm-table">
              <thead>
                <tr>
                  <th>اسم الخزينة</th>
                  <th>الفرع التابع</th>
                  <th>نوع الربط</th>
                  <th>الرصيد الحالي</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {centralTreasury && (
                  <tr style={{ background: 'rgba(16, 185, 129, 0.03)' }}>
                    <td>
                      <div style={{ fontWeight: 800, color: 'var(--tm-accent-green)' }}>🏛️ {centralTreasury.name}</div>
                    </td>
                    <td>— (مركزية)</td>
                    <td>—</td>
                    <td style={{ fontWeight: 800 }}>{Number(centralTreasury.balance).toLocaleString('ar-EG')} ج.م</td>
                    <td><span className="tm-type-badge badge-green">أساسية</span></td>
                  </tr>
                )}
                {branchTreasuries.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{t.name}</div>
                    </td>
                    <td>{t.branch?.name || '—'}</td>
                    <td>
                      <span className={`tm-type-badge ${t.branch?.treasuryLinkType === 'AUTOMATIC' ? 'badge-blue' : 'badge-amber'}`}>
                        {t.branch?.treasuryLinkType === 'AUTOMATIC' ? 'تلقائي' : 'يدوي'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 800 }}>{Number(t.balance).toLocaleString('ar-EG')} ج.م</td>
                    <td>
                      <span className={`tm-type-badge ${t.balance > 0 ? 'badge-green' : 'badge-blue'}`}>
                        {t.balance > 0 ? 'يوجد سيولة' : 'صفر'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showTransferModal && (
        <ModalContainer>
          <div className="tm-modal-overlay" onClick={(e) => { if (e.target.classList.contains('tm-modal-overlay')) setShowTransferModal(false); }}>
            <div className="tm-modal" style={{ maxWidth: '500px' }}>
              <div className="tm-modal-header">
                <h3>تحويل نقدية للمركزية</h3>
                <button className="tm-modal-close" onClick={() => setShowTransferModal(false)}>✕</button>
              </div>
              <div className="tm-modal-body">
                <form id="transferForm" onSubmit={handleTransfer}>
                  <div className="tm-form-group">
                    <label>من خزينة فرع:</label>
                    <select 
                      className="tm-input" 
                      value={transferData.fromBranchId} 
                      onChange={e => setTransferData({...transferData, fromBranchId: e.target.value})}
                      required
                    >
                      <option value="">اختر الفرع...</option>
                      {branchTreasuries.filter(t => t.branch?.treasuryLinkType === 'MANUAL').map(t => (
                        <option key={t.branch.id} value={t.branch.id}>
                          {t.branch.name} (الرصيد: {Number(t.balance).toFixed(2)})
                        </option>
                      ))}
                    </select>
                    <small style={{ color: 'var(--tm-text-secondary)', marginTop: '4px', display: 'block' }}>ملاحظة: تظهر فقط الفروع ذات الربط اليدوي.</small>
                  </div>
                  <div className="tm-form-group">
                    <label>المبلغ المراد تحويله:</label>
                    <input 
                      type="number" 
                      className="tm-input" 
                      value={transferData.amount} 
                      onChange={e => setTransferData({...transferData, amount: e.target.value})}
                      placeholder="0.00"
                      step="0.01"
                      required 
                    />
                  </div>
                  <div className="tm-form-group">
                    <label>ملاحظات:</label>
                    <textarea 
                      className="tm-textarea" 
                      value={transferData.notes} 
                      onChange={e => setTransferData({...transferData, notes: e.target.value})}
                      placeholder="مثال: توريد إيراد الأسبوع..."
                      rows="3"
                    />
                  </div>
                </form>
              </div>
              <div className="tm-modal-footer">
                <button type="button" className="tm-btn-ghost" onClick={() => setShowTransferModal(false)}>إلغاء</button>
                <button type="submit" form="transferForm" className="tm-btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'جاري التحويل...' : 'تأكيد التحويل'}
                </button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default TreasuryManagement;
