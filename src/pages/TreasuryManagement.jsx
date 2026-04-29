import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import StatTile from '../components/common/StatTile';

const TreasuryManagement = () => {
  const { toast, confirm } = useGlobalUI();
  const [treasuries, setTreasuries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferData, setTransferData] = useState({
    fromBranchId: '',
    amount: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await Api.getTreasuryOverview();
      setTreasuries(data || []);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <Loader message="جاري تحميل بيانات الخزائن..." />;

  const centralTreasury = treasuries.find(t => t.isCentral);
  const branchTreasuries = treasuries.filter(t => !t.isCentral);
  const totalBalance = treasuries.reduce((sum, t) => sum + (t.balance || 0), 0);

  return (
    <div className="page-section" style={{ direction: 'rtl' }}>
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <StatTile
          id="total_liquidity"
          label="إجمالي السيولة النقدية"
          value={totalBalance.toLocaleString()}
          icon="💰"
          subtitle="في جميع الفروع والمركزية"
          defaults={{ color: 'cobalt', size: 'tile-wd-sm', order: 1 }}
        />
        <StatTile
          id="central_bal"
          label="رصيد الخزينة المركزية"
          value={centralTreasury?.balance?.toLocaleString() || '0'}
          icon="🏛️"
          defaults={{ color: 'emerald', size: 'tile-wd-sm', order: 2 }}
        />
        <StatTile
          id="branches_bal"
          label="رصيد خزائن الفروع"
          value={branchTreasuries.reduce((sum, t) => sum + (t.balance || 0), 0).toLocaleString()}
          icon="🏦"
          defaults={{ color: 'magenta', size: 'tile-wd-sm', order: 3 }}
        />
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>🏛️ إدارة الخزينة المركزية والفروع</h3>
          <button className="btn btn-primary" onClick={() => setShowTransferModal(true)}>
            🔄 تحويل مبالغ للمركزية
          </button>
        </div>
        <div className="card-body no-padding">
          <div className="table-wrapper">
            <table className="data-table">
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
                {/* Central Safe First */}
                {centralTreasury && (
                  <tr style={{ background: 'rgba(16, 185, 129, 0.05)' }}>
                    <td style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>⭐ {centralTreasury.name}</td>
                    <td>— (مركزية)</td>
                    <td>—</td>
                    <td style={{ fontWeight: 800 }}>{Number(centralTreasury.balance).toFixed(2)} ج.م</td>
                    <td><span className="badge badge-success">أساسية</span></td>
                  </tr>
                )}
                {/* Branch Safes */}
                {branchTreasuries.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.name}</td>
                    <td>{t.branch?.name || '—'}</td>
                    <td>
                      <span className={`badge ${t.branch?.treasuryLinkType === 'AUTOMATIC' ? 'badge-info' : 'badge-warning'}`}>
                        {t.branch?.treasuryLinkType === 'AUTOMATIC' ? 'تلقائي (Mirror)' : 'يدوي (Manual)'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{Number(t.balance).toFixed(2)} ج.م</td>
                    <td>
                      {t.balance > 0 ? (
                        <span className="badge badge-success">يوجد سيولة</span>
                      ) : (
                        <span className="badge badge-secondary">صفر</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showTransferModal && (
        <ModalContainer>
          <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setShowTransferModal(false); }}>
            <div className="modal" style={{ maxWidth: '450px' }}>
              <div className="modal-header">
                <h3>🔄 تحويل نقدية للخزينة المركزية</h3>
                <button className="modal-close" onClick={() => setShowTransferModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                <form id="transferForm" onSubmit={handleTransfer}>
                  <div className="form-group">
                    <label>من خزينة فرع:</label>
                    <select 
                      className="form-control" 
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
                    <small style={{ color: 'var(--text-muted)' }}>ملاحظة: تظهر فقط الفروع ذات الربط اليدوي.</small>
                  </div>
                  <div className="form-group">
                    <label>المبلغ المراد تحويله:</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={transferData.amount} 
                      onChange={e => setTransferData({...transferData, amount: e.target.value})}
                      placeholder="0.00"
                      step="0.01"
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>ملاحظات:</label>
                    <textarea 
                      className="form-control" 
                      value={transferData.notes} 
                      onChange={e => setTransferData({...transferData, notes: e.target.value})}
                      placeholder="مثال: توريد إيراد الأسبوع..."
                      rows="2"
                    />
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowTransferModal(false)}>إلغاء</button>
                <button type="submit" form="transferForm" className="btn btn-primary" disabled={isSubmitting}>
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
