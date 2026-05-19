import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import StatTile from '../components/common/StatTile';

const FinancialAccounts = () => {
    const { toast, confirm } = useGlobalUI();
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showTransfer, setShowTransfer] = useState(false);
    const [branches, setBranches] = useState([]);
    const [glAccounts, setGlAccounts] = useState([]);

    const [formData, setFormData] = useState({
        name: '',
        type: 'BANK',
        bankName: '',
        accountNumber: '',
        bankBranch: '',
        swiftCode: '',
        balance: 0,
        branchId: '',
        glAccountId: ''
    });

    const [transferData, setTransferData] = useState({
        fromAccountId: '',
        toAccountId: '',
        amount: 0,
        fee: 0,
        notes: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [accRes, branchRes, glRes] = await Promise.all([
                Api.getTreasuryOverview(),
                Api.getBranches(),
                Api.getAccountingAccounts()
            ]);
            // Sort by balance desc (Analytical view)
            const sortedAccs = [...accRes].sort((a, b) => (b.balance || 0) - (a.balance || 0));
            setAccounts(sortedAccs);
            setBranches(branchRes);
            setGlAccounts(glRes);
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAccount = async (e) => {
        e.preventDefault();
        try {
            const payload = { 
                ...formData, 
                glAccount: formData.glAccountId ? { id: formData.glAccountId } : null 
            };
            await Api.createFinancialAccount(payload);
            toast('تم إضافة الحساب بنجاح', 'success');
            setShowForm(false);
            loadData();
        } catch (err) {
            toast(err.message, 'error');
        }
    };

    const handleTransfer = async (e) => {
        e.preventDefault();
        try {
            await Api.transferBetweenAccounts(transferData);
            toast('تم تحويل المبلغ بنجاح', 'success');
            setShowTransfer(false);
            loadData();
        } catch (err) {
            toast(err.message, 'error');
        }
    };

    return (
        <div className="page-section">
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px', marginBottom: '25px' }}>
                <StatTile
                    label="إجمالي السيولة (نقدية + بنوك)"
                    value={accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0).toFixed(2)}
                    icon="💰"
                    defaults={{ color: 'blue' }}
                />
                <StatTile
                    label="رصيد البنوك"
                    value={accounts.filter(a => a.accountType === 'BANK').reduce((sum, acc) => sum + (acc.balance || 0), 0).toFixed(2)}
                    icon="🏦"
                    defaults={{ color: 'emerald' }}
                />
                <StatTile
                    label="رصيد الخزائن النقدية"
                    value={accounts.filter(a => a.accountType === 'CASH').reduce((sum, acc) => sum + (acc.balance || 0), 0).toFixed(2)}
                    icon="💵"
                    defaults={{ color: 'amber' }}
                />
            </div>

            <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>🏦 إدارة الحسابات المالية والبنوك</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn btn-secondary" onClick={() => setShowTransfer(true)}>↔️ تحويل بين الحسابات</button>
                        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ إضافة حساب جديد</button>
                    </div>
                </div>
                <div className="card-body no-padding">
                    {loading ? <Loader /> : (
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>اسم الحساب</th>
                                        <th>النوع</th>
                                        <th>البنك / الفرع</th>
                                        <th>رقم الحساب</th>
                                        <th>الحساب المحاسبي (GL)</th>
                                        <th>الرصيد الحالي</th>
                                        <th>العملة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accounts.map(acc => (
                                        <tr key={acc.id} style={{ borderLeft: acc.accountType === 'BANK' ? '4px solid var(--accent-emerald)' : '4px solid var(--accent-amber)' }}>
                                            <td><strong>{acc.name}</strong> {acc.isCentral && <span className="badge badge-info">رئيسي</span>}</td>
                                            <td>
                                                <span className={`badge ${acc.accountType === 'BANK' ? 'badge-success' : 'badge-neutral'}`}>
                                                    {acc.accountType === 'BANK' ? 'بنك' : acc.accountType === 'CASH' ? 'خزينة نقدية' : 'محفظة'}
                                                </span>
                                            </td>
                                            <td>{acc.bankName || (acc.branch ? acc.branch.name : '—')}</td>
                                            <td><code>{acc.accountNumber || '—'}</code></td>
                                            <td>
                                                {acc.glAccount ? (
                                                    <small className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-main)' }}>
                                                        {acc.glAccount.code} - {acc.glAccount.name}
                                                    </small>
                                                ) : <small style={{ color: 'var(--text-muted)' }}>غير مربوط</small>}
                                            </td>
                                            <td style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>{(acc.balance || 0).toLocaleString()}</td>
                                            <td>{acc.currency}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal for adding account */}
            {showForm && (
                <ModalContainer>
                    <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setShowForm(false); }}>
                        <div className="modal">
                            <div className="modal-header">
                                <h3>إضافة حساب مالي جديد</h3>
                                <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
                            </div>
                            <div className="modal-body">
                                <form id="accForm" onSubmit={handleCreateAccount}>
                                    <div className="form-group">
                                        <label>اسم الحساب (مثلاً: بنك مصر - الرئيسي)</label>
                                        <input className="form-control" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                    </div>
                                    <div className="form-group">
                                        <label>النوع</label>
                                        <select className="form-control" value={formData.accountType} onChange={e => setFormData({ ...formData, accountType: e.target.value })}>
                                            <option value="BANK">بنك</option>
                                            <option value="CASH">خزينة نقدية</option>
                                            <option value="WALLET">محفظة إلكترونية</option>
                                        </select>
                                    </div>
                                    {formData.accountType === 'BANK' && (
                                        <>
                                            <div className="form-group">
                                                <label>اسم البنك</label>
                                                <input className="form-control" value={formData.bankName} onChange={e => setFormData({ ...formData, bankName: e.target.value })} />
                                            </div>
                                            <div className="form-group">
                                                <label>رقم الحساب</label>
                                                <input className="form-control" value={formData.accountNumber} onChange={e => setFormData({ ...formData, accountNumber: e.target.value })} />
                                            </div>
                                        </>
                                    )}
                                    <div className="form-group">
                                        <label>الرصيد الافتتاحي</label>
                                        <input type="number" className="form-control" value={formData.balance} onChange={e => setFormData({ ...formData, balance: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>ربط بالحساب المحاسبي (اليومية الأمريكية)</label>
                                        <select className="form-control" value={formData.glAccountId} onChange={e => setFormData({ ...formData, glAccountId: e.target.value })}>
                                            <option value="">-- اختر الحساب من اليومية --</option>
                                            {glAccounts.map(ga => <option key={ga.id} value={ga.id}>{ga.code} - {ga.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>الفرع المرتبط</label>
                                        <select className="form-control" value={formData.branchId} onChange={e => setFormData({ ...formData, branchId: e.target.value })}>
                                            <option value="">لا يوجد (مركزي)</option>
                                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                </form>
                            </div>
                            <div className="modal-footer">
                                <button type="submit" form="accForm" className="btn btn-primary">حفظ الحساب</button>
                            </div>
                        </div>
                    </div>
                </ModalContainer>
            )}

            {/* Modal for Transfer */}
            {showTransfer && (
                <ModalContainer>
                    <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setShowTransfer(false); }}>
                        <div className="modal">
                            <div className="modal-header">
                                <h3>تحويل بين الحسابات</h3>
                                <button className="modal-close" onClick={() => setShowTransfer(false)}>✕</button>
                            </div>
                            <div className="modal-body">
                                <form id="transForm" onSubmit={handleTransfer}>
                                    <div className="form-group">
                                        <label>من حساب</label>
                                        <select className="form-control" value={transferData.fromAccountId} onChange={e => setTransferData({ ...transferData, fromAccountId: e.target.value })} required>
                                            <option value="">-- اختر الحساب المصدر --</option>
                                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (رصيد: {a.balance})</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>إلى حساب</label>
                                        <select className="form-control" value={transferData.toAccountId} onChange={e => setTransferData({ ...transferData, toAccountId: e.target.value })} required>
                                            <option value="">-- اختر الحساب المستهدف --</option>
                                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>المبلغ</label>
                                        <input type="number" className="form-control" value={transferData.amount} onChange={e => setTransferData({ ...transferData, amount: e.target.value })} required />
                                    </div>
                                    <div className="form-group">
                                        <label>عمولة التحويل (إن وجدت)</label>
                                        <input type="number" className="form-control" value={transferData.fee} onChange={e => setTransferData({ ...transferData, fee: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>ملاحظات</label>
                                        <input className="form-control" value={transferData.notes} onChange={e => setTransferData({ ...transferData, notes: e.target.value })} />
                                    </div>
                                </form>
                            </div>
                            <div className="modal-footer">
                                <button type="submit" form="transForm" className="btn btn-primary">إتمام التحويل</button>
                            </div>
                        </div>
                    </div>
                </ModalContainer>
            )}
        </div>
    );
};

export default FinancialAccounts;
