import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import Loader from '../components/common/Loader';
import { useGlobalUI } from '../components/common/GlobalUI';

const TrialBalance = () => {
    const { toast } = useGlobalUI();
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await Api.getTrialBalance();
            setAccounts(data);
        } catch (err) {
            toast('Failed to load trial balance: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const totalAssets = accounts.filter(a => a.type === 'ASSET').reduce((sum, a) => sum + a.currentBalance, 0);
    const totalLiabilities = accounts.filter(a => a.type === 'LIABILITY').reduce((sum, a) => sum + a.currentBalance, 0);

    return (
        <div className="page-section">
            <div className="card">
                <div className="card-header">
                    <h3>⚖️ ميزان المراجعة (Trial Balance)</h3>
                    <p style={{ color: 'var(--text-muted)' }}>حالة الحسابات حتى تاريخه - بناءً على اليومية الأمريكية</p>
                </div>
                <div className="card-body no-padding">
                    {loading ? <Loader /> : (
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>كود الحساب</th>
                                        <th>اسم الحساب</th>
                                        <th>النوع</th>
                                        <th>الرصيد الحالي</th>
                                        <th>الحالة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accounts.map(acc => (
                                        <tr key={acc.id}>
                                            <td><code>{acc.code}</code></td>
                                            <td style={{ fontWeight: '500' }}>{acc.name}</td>
                                            <td><small className="badge">{acc.type}</small></td>
                                            <td style={{ 
                                                fontWeight: 'bold', 
                                                color: acc.currentBalance > 0 ? 'var(--accent-emerald)' : 'inherit' 
                                            }}>
                                                {acc.currentBalance.toLocaleString()}
                                            </td>
                                            <td>
                                                {acc.currentBalance === 0 ? '∅ فارغ' : '⚡ نشط'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ background: 'var(--bg-secondary)', fontWeight: 'bold' }}>
                                        <td colSpan="3" style={{ textAlign: 'left' }}>إجمالي الأصول المكتشفة:</td>
                                        <td style={{ color: 'var(--accent-emerald)' }}>{totalAssets.toLocaleString()}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TrialBalance;
