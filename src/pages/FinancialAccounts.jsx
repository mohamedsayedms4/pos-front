import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import '../styles/pages/FinancialAccountsPremium.css';

const FinancialAccounts = () => {
  const { toast } = useGlobalUI();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [branches, setBranches] = useState([]);
  const [glAccounts, setGlAccounts] = useState([]);

  const [formData, setFormData] = useState({ name: '', type: 'BANK', bankName: '', accountNumber: '', bankBranch: '', swiftCode: '', balance: 0, branchId: '', glAccountId: '' });
  const [transferData, setTransferData] = useState({ fromAccountId: '', toAccountId: '', amount: 0, fee: 0, notes: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accRes, branchRes, glRes] = await Promise.all([ Api.getTreasuryOverview(), Api.getBranches(), Api.getAccountingAccounts() ]);
      setAccounts([...accRes].sort((a, b) => (b.balance || 0) - (a.balance || 0)));
      setBranches(branchRes);
      setGlAccounts(glRes);
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, glAccount: formData.glAccountId ? { id: formData.glAccountId } : null };
      await Api.createFinancialAccount(payload);
      toast('تم إضافة الحساب بنجاح', 'success');
      setShowForm(false);
      loadData();
    } catch (err) { toast(err.message, 'error'); }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    try {
      await Api.transferBetweenAccounts(transferData);
      toast('تم تحويل المبلغ بنجاح', 'success');
      setShowTransfer(false);
      loadData();
    } catch (err) { toast(err.message, 'error'); }
  };

  const totalLiquidity = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const bankBalance = accounts.filter(a => a.accountType === 'BANK').reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const cashBalance = accounts.filter(a => a.accountType === 'CASH').reduce((sum, acc) => sum + (acc.balance || 0), 0);

  return (
    <div className="financial-accounts-container">
      {/* 1. Header */}
      <div className="fa-header-row">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="fa-breadcrumbs">
            <Link to="/dashboard">الرئيسية</Link> / <span>المالية</span>
          </div>
          <h1>الحسابات المالية</h1>
        </div>
        <div className="fa-header-actions">
          <button className="fa-btn-premium fa-btn-outline" onClick={() => setShowTransfer(true)}>
            <i className="fas fa-exchange-alt"></i> تحويل بين الحسابات
          </button>
          <button className="fa-btn-premium fa-btn-blue" onClick={() => setShowForm(true)}>
            <i className="fas fa-plus"></i> إضافة حساب جديد
          </button>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="fa-stats-grid">
        <div className="fa-stat-card">
          <div className="fa-stat-info">
            <h4>إجمالي السيولة</h4>
            <div className="fa-stat-value">{totalLiquidity.toLocaleString('ar-EG')} <span style={{fontSize: '0.8rem'}}>ج.م</span></div>
          </div>
          <div className="fa-stat-visual">
            <div className="fa-stat-icon icon-blue">
              <i className="fas fa-coins"></i>
            </div>
          </div>
        </div>
        <div className="fa-stat-card">
          <div className="fa-stat-info">
            <h4>رصيد البنوك</h4>
            <div className="fa-stat-value">{bankBalance.toLocaleString('ar-EG')} <span style={{fontSize: '0.8rem'}}>ج.م</span></div>
          </div>
          <div className="fa-stat-visual">
            <div className="fa-stat-icon icon-green">
              <i className="fas fa-university"></i>
            </div>
          </div>
        </div>
        <div className="fa-stat-card">
          <div className="fa-stat-info">
            <h4>رصيد الخزائن</h4>
            <div className="fa-stat-value">{cashBalance.toLocaleString('ar-EG')} <span style={{fontSize: '0.8rem'}}>ج.م</span></div>
          </div>
          <div className="fa-stat-visual">
            <div className="fa-stat-icon icon-amber">
              <i className="fas fa-money-bill-wave"></i>
            </div>
          </div>
        </div>
        <div className="fa-stat-card">
          <div className="fa-stat-info">
            <h4>عدد الحسابات</h4>
            <div className="fa-stat-value">{accounts.length} <span style={{fontSize: '0.8rem'}}>حساب</span></div>
          </div>
          <div className="fa-stat-visual">
            <div className="fa-stat-icon icon-purple">
              <i className="fas fa-file-invoice-dollar"></i>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Table Card */}
      <div className="fa-table-card">
        <div className="fa-table-container">
          {loading ? (
            <div style={{ padding: '40px' }}><Loader message="جاري التحميل..." /></div>
          ) : accounts.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--fa-text-secondary)' }}>
              <i className="fas fa-vault" style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}></i>
              <h3>لا توجد حسابات مالية</h3>
            </div>
          ) : (
            <table className="fa-table">
              <thead>
                <tr>
                  <th>اسم الحساب</th>
                  <th>النوع</th>
                  <th>البنك / الفرع</th>
                  <th>رقم الحساب</th>
                  <th>الحساب المحاسبي (GL)</th>
                  <th>الرصيد الحالي</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(acc => (
                  <tr key={acc.id}>
                    <td>
                      <div style={{ fontWeight: 800 }}>{acc.name}</div>
                      {acc.isCentral && <span className="fa-type-badge badge-blue" style={{fontSize: '0.6rem'}}>رئيسي</span>}
                    </td>
                    <td>
                      <span className={`fa-type-badge ${acc.accountType === 'BANK' ? 'badge-green' : 'badge-blue'}`}>
                        {acc.accountType === 'BANK' ? 'بنك' : acc.accountType === 'CASH' ? 'خزينة' : 'محفظة'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.9rem' }}>{acc.bankName || (acc.branch ? acc.branch.name : '—')}</td>
                    <td><code>{acc.accountNumber || '—'}</code></td>
                    <td>
                      {acc.glAccount ? (
                        <div style={{ fontSize: '0.8rem' }}>
                          <div style={{ fontWeight: 700 }}>{acc.glAccount.code}</div>
                          <div style={{ color: 'var(--fa-text-secondary)' }}>{acc.glAccount.name}</div>
                        </div>
                      ) : <span style={{color: 'var(--fa-text-secondary)'}}>غير مربوط</span>}
                    </td>
                    <td style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--fa-accent-blue)' }}>{(acc.balance || 0).toLocaleString('ar-EG')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showForm && (
        <ModalContainer>
          <div className="fa-modal-overlay" onClick={(e) => { if (e.target.classList.contains('fa-modal-overlay')) setShowForm(false); }}>
            <div className="fa-modal" style={{ maxWidth: '600px' }}>
              <div className="fa-modal-header">
                <h3>إضافة حساب مالي جديد</h3>
                <button className="fa-modal-close" onClick={() => setShowForm(false)}>✕</button>
              </div>
              <div className="fa-modal-body">
                <form id="accForm" onSubmit={handleCreateAccount}>
                  <div className="fa-form-group">
                    <label>اسم الحساب</label>
                    <input className="fa-input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="مثلاً: بنك مصر - الرئيسي" />
                  </div>
                  <div className="fa-form-group">
                    <label>النوع</label>
                    <select className="fa-input" value={formData.accountType} onChange={e => setFormData({ ...formData, accountType: e.target.value })}>
                      <option value="BANK">بنك</option>
                      <option value="CASH">خزينة نقدية</option>
                      <option value="WALLET">محفظة إلكترونية</option>
                    </select>
                  </div>
                  {formData.accountType === 'BANK' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div className="fa-form-group">
                        <label>اسم البنك</label>
                        <input className="fa-input" value={formData.bankName} onChange={e => setFormData({ ...formData, bankName: e.target.value })} />
                      </div>
                      <div className="fa-form-group">
                        <label>رقم الحساب</label>
                        <input className="fa-input" value={formData.accountNumber} onChange={e => setFormData({ ...formData, accountNumber: e.target.value })} />
                      </div>
                    </div>
                  )}
                  <div className="fa-form-group">
                    <label>الرصيد الافتتاحي</label>
                    <input type="number" className="fa-input" value={formData.balance} onChange={e => setFormData({ ...formData, balance: e.target.value })} />
                  </div>
                  <div className="fa-form-group">
                    <label>ربط بالحساب المحاسبي (اليومية)</label>
                    <select className="fa-input" value={formData.glAccountId} onChange={e => setFormData({ ...formData, glAccountId: e.target.value })}>
                      <option value="">-- اختر الحساب من اليومية --</option>
                      {glAccounts.map(ga => <option key={ga.id} value={ga.id}>{ga.code} - {ga.name}</option>)}
                    </select>
                  </div>
                  <div className="fa-form-group">
                    <label>الفرع المرتبط</label>
                    <select className="fa-input" value={formData.branchId} onChange={e => setFormData({ ...formData, branchId: e.target.value })}>
                      <option value="">لا يوجد (مركزي)</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </form>
              </div>
              <div className="fa-modal-footer">
                <button type="button" className="fa-btn-ghost" onClick={() => setShowForm(false)}>إلغاء</button>
                <button type="submit" form="accForm" className="fa-btn-primary">حفظ الحساب</button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {showTransfer && (
        <ModalContainer>
          <div className="fa-modal-overlay" onClick={(e) => { if (e.target.classList.contains('fa-modal-overlay')) setShowTransfer(false); }}>
            <div className="fa-modal" style={{ maxWidth: '500px' }}>
              <div className="fa-modal-header">
                <h3>تحويل بين الحسابات</h3>
                <button className="fa-modal-close" onClick={() => setShowTransfer(false)}>✕</button>
              </div>
              <div className="fa-modal-body">
                <form id="transForm" onSubmit={handleTransfer}>
                  <div className="fa-form-group">
                    <label>من حساب</label>
                    <select className="fa-input" value={transferData.fromAccountId} onChange={e => setTransferData({ ...transferData, fromAccountId: e.target.value })} required>
                      <option value="">-- اختر الحساب المصدر --</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.balance.toLocaleString()} ج.م)</option>)}
                    </select>
                  </div>
                  <div className="fa-form-group">
                    <label>إلى حساب</label>
                    <select className="fa-input" value={transferData.toAccountId} onChange={e => setTransferData({ ...transferData, toAccountId: e.target.value })} required>
                      <option value="">-- اختر الحساب المستهدف --</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div className="fa-form-group">
                    <label>المبلغ</label>
                    <input type="number" className="fa-input" value={transferData.amount} onChange={e => setTransferData({ ...transferData, amount: e.target.value })} required />
                  </div>
                  <div className="fa-form-group">
                    <label>عمولة التحويل (إن وجدت)</label>
                    <input type="number" className="fa-input" value={transferData.fee} onChange={e => setTransferData({ ...transferData, fee: e.target.value })} />
                  </div>
                  <div className="fa-form-group">
                    <label>ملاحظات</label>
                    <textarea className="fa-textarea" rows="2" value={transferData.notes} onChange={e => setTransferData({ ...transferData, notes: e.target.value })} />
                  </div>
                </form>
              </div>
              <div className="fa-modal-footer">
                <button type="button" className="fa-btn-ghost" onClick={() => setShowTransfer(false)}>إلغاء</button>
                <button type="submit" form="transForm" className="fa-btn-primary">إتمام التحويل</button>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}
    </div>
  );
};

export default FinancialAccounts;
