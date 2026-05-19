import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import ModalContainer from '../components/common/ModalContainer';
import CheckPrintTemplate from '../components/CheckPrintTemplate';

const CheckManagement = () => {
    const { toast, confirm } = useGlobalUI();
    const [checks, setChecks] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showEndorseModal, setShowEndorseModal] = useState(false);
    const [selectedCheck, setSelectedCheck] = useState(null);
    const [endorseeName, setEndorseeName] = useState('');
    const [printingCheck, setPrintingCheck] = useState(null);

    const [formData, setFormData] = useState({
        checkNumber: '',
        dueDate: new Date().toISOString().split('T')[0],
        amount: 0,
        bankName: '',
        beneficiary: '',
        checkType: 'RECEIVABLE',
        accountId: '',
        notes: ''
    });

    const [filters, setFilters] = useState({
        status: 'ALL',
        type: 'ALL',
        dateFrom: '',
        dateTo: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [checkRes, accRes] = await Promise.all([
                Api.getChecks(),
                Api.getTreasuryOverview()
            ]);
            setChecks(checkRes.content || []);
            
            const bankAccounts = (accRes || []).filter(a => 
                a.accountType === 'BANK' || a.accountType === 'bank'
            );
            if (bankAccounts.length === 0 && accRes && accRes.length > 0) {
                setAccounts(accRes);
            } else {
                setAccounts(bankAccounts);
            }
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Analytics Calculations
    const stats = React.useMemo(() => {
        return {
            totalReceivable: checks.filter(c => c.checkType === 'RECEIVABLE').reduce((sum, c) => sum + c.amount, 0),
            totalPayable: checks.filter(c => c.checkType === 'PAYABLE').reduce((sum, c) => sum + c.amount, 0),
            pendingAmount: checks.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + c.amount, 0),
            collectedAmount: checks.filter(c => c.status === 'COLLECTED').reduce((sum, c) => sum + c.amount, 0),
        };
    }, [checks]);

    // Filtering Logic
    const filteredChecks = React.useMemo(() => {
        return checks.filter(c => {
            const matchStatus = filters.status === 'ALL' || c.status === filters.status;
            const matchType = filters.type === 'ALL' || c.checkType === filters.type;
            const matchFrom = !filters.dateFrom || new Date(c.dueDate) >= new Date(filters.dateFrom);
            const matchTo = !filters.dateTo || new Date(c.dueDate) <= new Date(filters.dateTo);
            return matchStatus && matchType && matchFrom && matchTo;
        });
    }, [checks, filters]);

    const handleExport = () => {
        const headers = ["رقم الشيك", "تاريخ الاستحقاق", "المبلغ", "النوع", "المستفيد", "البنك", "الحالة"];
        const rows = filteredChecks.map(c => [
            c.checkNumber,
            c.dueDate,
            c.amount,
            c.checkType === 'RECEIVABLE' ? 'قبض' : 'دفع',
            c.beneficiary,
            c.bankName,
            c.status
        ]);

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `checks_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const data = { ...formData, account: { id: formData.accountId } };
            await Api.registerCheck(data);
            toast('تم تسجيل الشيك بنجاح', 'success');
            setShowForm(false);
            loadData();
        } catch (err) {
            toast(err.message, 'error');
        }
    };

    const handleEndorse = async (e) => {
        e.preventDefault();
        try {
            await Api.endorseCheck(selectedCheck.id, endorseeName);
            toast('تم تجيير الشيك بنجاح', 'success');
            setShowEndorseModal(false);
            setEndorseeName('');
            loadData();
        } catch (err) {
            toast(err.message, 'error');
        }
    };

    const updateStatus = async (id, status, statusText) => {
        confirm(`هل أنت متأكد من تغيير حالة الشيك إلى: ${statusText}؟`, async () => {
            try {
                await Api.updateCheckStatus(id, status);
                toast('تم تحديث حالة الشيك', 'success');
                loadData();
            } catch (err) {
                toast(err.message, 'error');
            }
        });
    };

    const handlePrint = (check) => {
        setPrintingCheck(check);
        setTimeout(() => {
            window.print();
            setPrintingCheck(null);
        }, 500);
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PENDING': return <span className="badge badge-info">تحت التحصيل</span>;
            case 'DEPOSITED': return <span className="badge badge-primary">تم الإيداع</span>;
            case 'COLLECTED': return <span className="badge badge-success">تم التحصيل</span>;
            case 'REJECTED': return <span className="badge badge-danger">مرفوض</span>;
            case 'CANCELLED': return <span className="badge badge-neutral">ملغي</span>;
            case 'ENDORSED': return <span className="badge" style={{ backgroundColor: 'var(--accent-indigo)', color: 'white' }}>تم التجيير</span>;
            default: return <span className="badge">{status}</span>;
        }
    };

    if (printingCheck) {
        return <CheckPrintTemplate check={printingCheck} />;
    }

    return (
        <div className="page-section">
            {/* Phase 4: Analytics Cards */}
            <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
                <div className="card" style={{ borderLeft: '4px solid var(--accent-emerald)', padding: '15px' }}>
                    <small style={{ color: 'var(--text-muted)' }}>📥 إجمالي أوراق القبض</small>
                    <h2 style={{ margin: '5px 0' }}>{stats.totalReceivable.toLocaleString()}</h2>
                </div>
                <div className="card" style={{ borderLeft: '4px solid var(--accent-danger)', padding: '15px' }}>
                    <small style={{ color: 'var(--text-muted)' }}>📤 إجمالي أوراق الدفع</small>
                    <h2 style={{ margin: '5px 0' }}>{stats.totalPayable.toLocaleString()}</h2>
                </div>
                <div className="card" style={{ borderLeft: '4px solid var(--accent-amber)', padding: '15px' }}>
                    <small style={{ color: 'var(--text-muted)' }}>⏳ مبالغ تحت التحصيل</small>
                    <h2 style={{ margin: '5px 0' }}>{stats.pendingAmount.toLocaleString()}</h2>
                </div>
                <div className="card" style={{ borderLeft: '4px solid var(--accent-indigo)', padding: '15px' }}>
                    <small style={{ color: 'var(--text-muted)' }}>✅ مبالغ تم تحصيلها</small>
                    <h2 style={{ margin: '5px 0' }}>{stats.collectedAmount.toLocaleString()}</h2>
                </div>
            </div>

            <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <h3>📑 سجل الشيكات والتقارير</h3>
                        <button className="btn btn-sm btn-outline" onClick={handleExport}>📊 تصدير Excel</button>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ تسجيل شيك جديد</button>
                </div>

                {/* Phase 4: Filter Bar */}
                <div className="card-body" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', padding: '15px' }}>
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                            <label><small>الحالة</small></label>
                            <select className="form-control btn-sm" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
                                <option value="ALL">كل الحالات</option>
                                <option value="PENDING">تحت التحصيل</option>
                                <option value="COLLECTED">تم التحصيل</option>
                                <option value="REJECTED">مرفوض</option>
                                <option value="ENDORSED">مجير</option>
                            </select>
                        </div>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                            <label><small>النوع</small></label>
                            <select className="form-control btn-sm" value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
                                <option value="ALL">كل الأنواع</option>
                                <option value="RECEIVABLE">قبض</option>
                                <option value="PAYABLE">دفع</option>
                            </select>
                        </div>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                            <label><small>من تاريخ استحقاق</small></label>
                            <input type="date" className="form-control btn-sm" value={filters.dateFrom} onChange={e => setFilters({...filters, dateFrom: e.target.value})} />
                        </div>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                            <label><small>إلى تاريخ استحقاق</small></label>
                            <input type="date" className="form-control btn-sm" value={filters.dateTo} onChange={e => setFilters({...filters, dateTo: e.target.value})} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button className="btn btn-sm btn-ghost" onClick={() => setFilters({status: 'ALL', type: 'ALL', dateFrom: '', dateTo: ''})}>🧹 مسح</button>
                        </div>
                    </div>
                </div>

                <div className="card-body no-padding">
                    {loading ? <Loader /> : (
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>رقم الشيك</th>
                                        <th>تاريخ الاستحقاق</th>
                                        <th>المبلغ</th>
                                        <th>النوع</th>
                                        <th>المستفيد / البنك</th>
                                        <th>الحالة</th>
                                        <th>الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredChecks.length === 0 ? (
                                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>لا توجد بيانات مطابقة للفلترة الحالية</td></tr>
                                    ) : filteredChecks.map(c => (
                                        <tr key={c.id}>
                                            <td><code>{c.checkNumber}</code></td>
                                            <td style={{ color: new Date(c.dueDate) <= new Date() && c.status === 'PENDING' ? 'var(--accent-danger)' : 'inherit' }}>
                                                {c.dueDate} {new Date(c.dueDate) <= new Date() && c.status === 'PENDING' && '⚠️'}
                                            </td>
                                            <td style={{ fontWeight: 'bold' }}>{c.amount.toLocaleString()}</td>
                                            <td>
                                                <span style={{ color: c.checkType === 'RECEIVABLE' ? 'var(--accent-emerald)' : 'var(--accent-danger)' }}>
                                                    {c.checkType === 'RECEIVABLE' ? '📥 قبض' : '📤 دفع'}
                                                </span>
                                            </td>
                                            <td>
                                                {c.beneficiary} 
                                                {c.status === 'ENDORSED' && <><br/><small style={{ color: 'var(--accent-indigo)' }}>↪️ مجير لـ: {c.endorsee}</small></>}
                                                <br/><small style={{ color: 'var(--text-muted)' }}>{c.bankName}</small>
                                            </td>
                                            <td>{getStatusBadge(c.status)}</td>
                                            <td>
                                                <div className="table-actions">
                                                    {c.status === 'PENDING' && (
                                                        <>
                                                            <button className="btn btn-sm btn-ghost" onClick={() => updateStatus(c.id, 'COLLECTED', 'تم التحصيل')}>✅ تحصيل</button>
                                                            <button className="btn btn-sm btn-ghost" onClick={() => {
                                                                setSelectedCheck(c);
                                                                setShowEndorseModal(true);
                                                            }}>↪️ تجيير</button>
                                                            <button className="btn btn-sm btn-ghost" onClick={() => updateStatus(c.id, 'REJECTED', 'مرفوض')}>❌ مرفوض</button>
                                                        </>
                                                    )}
                                                    <button className="btn btn-sm btn-ghost" onClick={() => handlePrint(c)}>🖨️ طباعة</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {showForm && (
                <ModalContainer>
                    <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setShowForm(false); }}>
                        <div className="modal">
                            <div className="modal-header">
                                <h3>تسجيل شيك جديد</h3>
                                <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
                            </div>
                            <div className="modal-body">
                                <form id="checkForm" onSubmit={handleRegister}>
                                    <div className="form-group">
                                        <label>رقم الشيك</label>
                                        <input className="form-control" value={formData.checkNumber} onChange={e => setFormData({ ...formData, checkNumber: e.target.value })} required />
                                    </div>
                                    <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div>
                                            <label>تاريخ الاستحقاق</label>
                                            <input type="date" className="form-control" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} required />
                                        </div>
                                        <div>
                                            <label>المبلغ</label>
                                            <input type="number" className="form-control" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>النوع</label>
                                        <select className="form-control" value={formData.checkType} onChange={e => setFormData({ ...formData, checkType: e.target.value })}>
                                            <option value="RECEIVABLE">قبض (من عميل)</option>
                                            <option value="PAYABLE">دفع (لمورد)</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>المستفيد / الساحب</label>
                                        <input className="form-control" value={formData.beneficiary} onChange={e => setFormData({ ...formData, beneficiary: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>البنك</label>
                                        <input className="form-control" value={formData.bankName} onChange={e => setFormData({ ...formData, bankName: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>الحساب المالي المرتبط</label>
                                        <select className="form-control" value={formData.accountId} onChange={e => setFormData({ ...formData, accountId: e.target.value })} required>
                                            <option value="">-- اختر البنك --</option>
                                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </select>
                                    </div>
                                </form>
                            </div>
                            <div className="modal-footer">
                                <button type="submit" form="checkForm" className="btn btn-primary">تسجيل الشيك</button>
                            </div>
                        </div>
                    </div>
                </ModalContainer>
            )}

            {showEndorseModal && (
                <ModalContainer>
                    <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setShowEndorseModal(false); }}>
                        <div className="modal">
                            <div className="modal-header">
                                <h3>تجيير الشيك (تظهير لطرف ثالث)</h3>
                                <button className="modal-close" onClick={() => setShowEndorseModal(false)}>✕</button>
                            </div>
                            <div className="modal-body">
                                <p style={{ marginBottom: '15px' }}>
                                    أنت بصدد تجيير الشيك رقم <code>{selectedCheck?.checkNumber}</code> بمبلغ <b>{selectedCheck?.amount.toLocaleString()}</b>
                                </p>
                                <form id="endorseForm" onSubmit={handleEndorse}>
                                    <div className="form-group">
                                        <label>اسم المجير له (المستفيد الجديد)</label>
                                        <input 
                                            className="form-control" 
                                            value={endorseeName} 
                                            onChange={e => setEndorseeName(e.target.value)} 
                                            placeholder="مثال: شركة التوريدات العمومية"
                                            required 
                                        />
                                    </div>
                                </form>
                            </div>
                            <div className="modal-footer">
                                <button type="submit" form="endorseForm" className="btn btn-primary">تأكيد التجيير</button>
                            </div>
                        </div>
                    </div>
                </ModalContainer>
            )}
        </div>
    );
};

export default CheckManagement;
