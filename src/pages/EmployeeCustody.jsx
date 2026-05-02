import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import '../styles/pages/CustodyPremium.css';

const EmployeeCustody = () => {
    const { toast, confirm } = useGlobalUI();
    const [records, setRecords] = useState([]);
    const [users, setUsers] = useState([]);
    const [fixedAssets, setFixedAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        userId: '', assetName: '', referenceNumber: '', quantity: 1, estimatedValue: 0,
        conditionAtIssue: 'New', issueDate: new Date().toISOString().split('T')[0],
        expectedReturnDate: '', notes: ''
    });

    useEffect(() => { loadData(); }, []);

    const loadData = async (query = '') => {
        setLoading(true);
        try {
            const [custodyRes, usersRes, assetsRes] = await Promise.all([
                Api.getCustody(0, 100, query),
                Api.getUsers(0, 1000),
                Api.getFixedAssets()
            ]);
            setRecords(custodyRes.content || []);
            setUsers(usersRes.items || usersRes.content || []);
            setFixedAssets(Array.isArray(assetsRes) ? assetsRes : (assetsRes.items || assetsRes.content || []));
        } catch (err) { toast(err.message, 'error'); }
        finally { setLoading(false); }
    };

    const handleAssetSelect = (e) => {
        const asset = fixedAssets.find(a => a.id === parseInt(e.target.value));
        if (asset) {
            setFormData({ ...formData, assetName: asset.name, referenceNumber: asset.code || '', estimatedValue: asset.purchasePrice || 0, notes: `أصل ثابت رقم: ${asset.id}` });
            toast('تم تعبئة البيانات', 'info');
        }
    };

    const handleIssue = async (e) => {
        e.preventDefault();
        try {
            await Api.issueCustody({ ...formData, employee: { id: formData.userId } });
            toast('تم الإسناد بنجاح', 'success'); setShowForm(false); loadData();
        } catch (err) { toast(err.message, 'error'); }
    };

    const handleReturn = async (id) => {
        confirm('هل تم استرداد هذه العهدة؟', async () => {
            try { await Api.returnCustody(id, 'تم الإرجاع'); toast('تم التحديث', 'success'); loadData(); }
            catch (err) { toast(err.message, 'error'); }
        });
    };

    const handlePrint = (record) => {
        const printWindow = window.open('', '_blank');
        const content = `
            <html dir="rtl">
            <head>
                <title>إقرار استلام عهدة - ${record.employee.name}</title>
                <style>
                    body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #333; }
                    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
                    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                    .field { border-bottom: 1px dotted #ccc; padding: 10px 0; }
                    .asset-table { width: 100%; border-collapse: collapse; margin: 30px 0; }
                    .asset-table th, .asset-table td { border: 1px solid #ddd; padding: 12px; text-align: center; }
                    .declaration { margin: 40px 0; line-height: 1.6; border: 1px solid #eee; padding: 20px; border-radius: 8px; }
                    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 100px; margin-top: 60px; text-align: center; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="header"><h1>إقرار استلام عهدة شخصية</h1><div>${new Date().toLocaleDateString('ar-EG')}</div></div>
                <div class="details-grid">
                    <div class="field"><b>الموظف:</b> ${record.employee.name}</div>
                    <div class="field"><b>تاريخ الاستلام:</b> ${record.issueDate}</div>
                </div>
                <table class="asset-table">
                    <thead><tr><th>البيان</th><th>العدد</th><th>الحالة</th></tr></thead>
                    <tbody><tr><td>${record.assetName}</td><td>${record.quantity}</td><td>${record.conditionAtIssue}</td></tr></tbody>
                </table>
                <div class="declaration">أقر باستلام العهدة الموضحة أعلاه وأتعهد بالمحافظة عليها وإعادتها عند الطلب أو ترك العمل.</div>
                <div class="signatures"><div>توقيع الموظف<div style="border-top:1px solid #333;margin-top:40px"></div></div><div>توقيع المسؤول<div style="border-top:1px solid #333;margin-top:40px"></div></div></div>
                <div class="no-print" style="text-align:center;margin-top:40px"><button onclick="window.print()">طباعة</button></div>
            </body></html>`;
        printWindow.document.write(content); printWindow.document.close();
    };

    return (
        <div className="custody-container">
            {/* 1. Header */}
            <div className="cus-header-row">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="cus-breadcrumbs">
                        <Link to="/dashboard">الرئيسية</Link> / <span>HR</span>
                    </div>
                    <h1>إدارة العهد الشخصية</h1>
                </div>
                <div className="cus-header-actions">
                    <button className="cus-btn-premium cus-btn-blue" onClick={() => setShowForm(true)}>
                        <i className="fas fa-plus"></i> إسناد عهدة جديدة
                    </button>
                </div>
            </div>

            {/* 2. Stats Grid */}
            <div className="cus-stats-grid">
                <div className="cus-stat-card">
                    <div className="cus-stat-info">
                        <h4>إجمالي العهد</h4>
                        <div className="cus-stat-value">{records.length}</div>
                    </div>
                    <div className="cus-stat-visual"><div className="cus-stat-icon icon-blue"><i className="fas fa-shield-alt"></i></div></div>
                </div>
                <div className="cus-stat-card">
                    <div className="cus-stat-info">
                        <h4>عهد قيد الاستخدام</h4>
                        <div className="cus-stat-value" style={{ color: 'var(--cus-accent-amber)' }}>{records.filter(r => r.status === 'ISSUED').length}</div>
                    </div>
                    <div className="cus-stat-visual"><div className="cus-stat-icon icon-amber"><i className="fas fa-box-open"></i></div></div>
                </div>
                <div className="cus-stat-card">
                    <div className="cus-stat-info">
                        <h4>تم إرجاعها</h4>
                        <div className="cus-stat-value" style={{ color: 'var(--cus-accent-green)' }}>{records.filter(r => r.status === 'RETURNED').length}</div>
                    </div>
                    <div className="cus-stat-visual"><div className="cus-stat-icon icon-green"><i className="fas fa-history"></i></div></div>
                </div>
                <div className="cus-stat-card">
                    <div className="cus-stat-info">
                        <h4>إجمالي القيمة</h4>
                        <div className="cus-stat-value" style={{ fontSize: '1.4rem' }}>{records.reduce((s, r) => s + (r.estimatedValue || 0), 0).toLocaleString('ar-EG')} ج.م</div>
                    </div>
                    <div className="cus-stat-visual"><div className="cus-stat-icon icon-purple"><i className="fas fa-money-bill-wave"></i></div></div>
                </div>
            </div>

            {/* 3. Toolbar (Search) */}
            <div className="cus-toolbar-card">
                <div className="cus-search-container" style={{ flex: 1, maxWidth: '400px' }}>
                    <i className="fas fa-search"></i>
                    <input type="text" className="cus-input" placeholder="بحث باسم الموظف أو العهدة..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); loadData(e.target.value); }} />
                </div>
            </div>

            {/* 4. Table Card */}
            <div className="cus-table-card">
                <div className="cus-table-container">
                    {loading ? (
                        <div style={{ padding: '40px' }}><Loader message="جاري مراجعة العهد..." /></div>
                    ) : (
                        <table className="cus-table">
                            <thead>
                                <tr>
                                    <th>الموظف</th>
                                    <th>البيان (الأصل)</th>
                                    <th>الرقم المرجعي</th>
                                    <th>تاريخ الاستلام</th>
                                    <th>الحالة</th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map(r => (
                                    <tr key={r.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--cus-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{r.employee.name.charAt(0)}</div>
                                                <div><div style={{ fontWeight: 800 }}>{r.employee.name}</div><div style={{ fontSize: '0.7rem', color: 'var(--cus-text-secondary)' }}>{r.employee.email}</div></div>
                                            </div>
                                        </td>
                                        <td><div style={{ fontWeight: 800 }}>{r.assetName}</div><div style={{ fontSize: '0.7rem', color: 'var(--cus-text-secondary)' }}>الكمية: {r.quantity}</div></td>
                                        <td><code>{r.referenceNumber || '—'}</code></td>
                                        <td>{r.issueDate}</td>
                                        <td>
                                            <span className={`cus-type-badge ${r.status === 'ISSUED' ? 'badge-amber' : 'badge-green'}`}>
                                                {r.status === 'ISSUED' ? 'قيد العهدة 🛡️' : 'تم الإرجاع ✓'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="cus-actions">
                                                {r.status === 'ISSUED' && <button className="cus-action-btn" title="إرجاع" onClick={() => handleReturn(r.id)}><i className="fas fa-undo"></i></button>}
                                                <button className="cus-action-btn" title="طباعة" onClick={() => handlePrint(r)}><i className="fas fa-print"></i></button>
                                                <button className="cus-action-btn delete" onClick={() => confirm(`حذف سجل ${r.assetName}؟`, () => Api.deleteCustody(r.id).then(loadData))}><i className="fas fa-trash"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {showForm && (
                <ModalContainer>
                    <div className="cus-modal-overlay" onClick={() => setShowForm(false)}>
                        <div className="cus-modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                            <div className="cus-modal-header">
                                <h3>🛡️ إسناد عهدة جديدة</h3>
                                <button className="cus-modal-close" onClick={() => setShowForm(false)}>✕</button>
                            </div>
                            <div className="cus-modal-body">
                                <form id="cusForm" onSubmit={handleIssue}>
                                    <div className="cus-form-group" style={{ background: 'rgba(99,102,241,0.05)', padding: '15px', borderRadius: '16px', border: '1px solid var(--cus-border)' }}>
                                        <label>🔗 ربط بأصل ثابت</label>
                                        <select className="cus-input" onChange={handleAssetSelect}>
                                            <option value="">-- اختر من الأصول --</option>
                                            {fixedAssets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.assetCode})</option>)}
                                        </select>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                                        <div className="cus-form-group">
                                            <label>الموظف المستلم *</label>
                                            <select className="cus-input" required value={formData.userId} onChange={e => setFormData({...formData, userId: e.target.value})}>
                                                <option value="">-- اختر موظف --</option>
                                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="cus-form-group">
                                            <label>اسم العهدة *</label>
                                            <input className="cus-input" required value={formData.assetName} onChange={e => setFormData({...formData, assetName: e.target.value})} />
                                        </div>
                                        <div className="cus-form-group">
                                            <label>الرقم المرجعي</label>
                                            <input className="cus-input" value={formData.referenceNumber} onChange={e => setFormData({...formData, referenceNumber: e.target.value})} />
                                        </div>
                                        <div className="cus-form-group">
                                            <label>الكمية</label>
                                            <input type="number" className="cus-input" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div className="cus-modal-footer">
                                <button type="button" className="cus-btn-ghost" onClick={() => setShowForm(false)}>إلغاء</button>
                                <button type="submit" form="cusForm" className="cus-btn-primary">حفظ وإصدار إقرار</button>
                            </div>
                        </div>
                    </div>
                </ModalContainer>
            )}
        </div>
    );
};

export default EmployeeCustody;
