import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import StatTile from '../components/common/StatTile';

const PayrollDashboard = () => {
  const { toast, confirm } = useGlobalUI();
  const [payrolls, setPayrolls] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const isAdmin = Api.isAdminOrBranchManager();

  useEffect(() => {
    loadData();
  }, [month, year, selectedBranchId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [payrollData, usersData, branchesData] = await Promise.all([
        Api.getMonthlyPayrolls(month, year, selectedBranchId),
        Api.getUsers(0, 1000), // Get all users to map names
        branches.length === 0 ? Api.getBranches().catch(() => []) : Promise.resolve(branches)
      ]);
      
      const userMap = {};
      const items = usersData.items || usersData.content || [];
      items.forEach(u => {
        userMap[u.id] = u;
      });
      
      setUsers(userMap);
      setPayrolls(payrollData);
      if (branches.length === 0) setBranches(branchesData);
    } catch (err) {
      toast('فشل في تحميل البيانات: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePayAll = () => {
    const pending = payrolls.filter(p => p.status === 'PENDING');
    if (pending.length === 0) {
      toast('لا توجد كشوفات معلقة للصرف', 'info');
      return;
    }

    confirm(`هل أنت متأكد من صرف مرتبات ${pending.length} موظف؟ سيتم خصم المبلغ من الخزينة.`, async () => {
      try {
        for (const p of pending) {
          await Api.payEmployeePayroll(p.id);
        }
        toast('تم صرف جميع المرتبات المختارة بنجاح', 'success');
        loadData();
      } catch (err) {
        toast('حدث خطأ أثناء الصرف: ' + err.message, 'error');
      }
    });
  };

  const handlePaySingle = async (id) => {
    try {
      await Api.payEmployeePayroll(id);
      toast('تم صرف المرتب بنجاح', 'success');
      loadData();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleGenerateAll = async () => {
    const employeesToGenerate = Object.values(users).filter(u => 
      u.enabled && !payrolls.some(p => p.userId === u.id)
    );

    if (employeesToGenerate.length === 0) {
      toast('لا توجد مرتبات جديدة للتوليد بهذا الشهر', 'info');
      return;
    }

    setGenerating(true);
    let successCount = 0;
    try {
      for (const emp of employeesToGenerate) {
        try {
          await Api.generateEmployeePayroll(emp.id, month, year);
          successCount++;
        } catch (err) {
          if (!err.message.includes('Already generated')) {
             console.error(`Failed to generate for ${emp.name}:`, err);
          }
        }
      }
      toast(`تم توليد ${successCount} كشوف مرتبات جديدة`, 'success');
      loadData();
    } catch (err) {
      toast('حدث خطأ أثناء التوليد الجماعي: ' + err.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-EG', { 
      style: 'currency', 
      currency: 'EGP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculations for Tiles
  const totalBase = payrolls.reduce((sum, p) => sum + (p.baseSalary || 0), 0);
  const totalBonuses = payrolls.reduce((sum, p) => sum + (p.totalBonuses || 0), 0);
  const totalDeductions = payrolls.reduce((sum, p) => sum + (p.totalDeductions || 0), 0);
  const totalNet = payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);

  return (
    <div className="page-section anim-fade-in">
      <div className="section-header" style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '5px' }}>💸 مسير الرواتب (Payroll)</h1>
          <p className="text-dim">عرض وإدارة مستحقات الموظفين الشهرية</p>
        </div>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
          {isAdmin && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.8rem' }}>الفرع</label>
              <select className="form-control" value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)}>
                <option value="">جميع الفروع</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.8rem' }}>الشهر</label>
            <select className="form-control" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
              {['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'].map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.8rem' }}>السنة</label>
            <select className="form-control" value={year} onChange={e => setYear(parseInt(e.target.value))}>
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={handleGenerateAll} 
            disabled={generating}
            style={{ height: '48px', background: 'var(--metro-purple)', borderColor: 'var(--metro-purple)' }}
          >
            {generating ? 'جاري التوليد...' : '⚡ توليد الشهر'}
          </button>
          <button className="btn btn-success" onClick={handlePayAll} style={{ height: '48px' }}>💰 صرف الكل</button>
        </div>
      </div>

      {/* Metro Stats Grid */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <StatTile 
          id="pay_net"
          label="إجمالي صافي المنصرف"
          value={formatCurrency(totalNet)}
          subtitle="صافي ما سيتم خصمه من الخزينة"
          icon="💰"
          defaults={{ color: 'cobalt', size: 'tile-wd-md', order: 1 }}
        />
        <StatTile 
          id="pay_base"
          label="إجمالي الأساسي"
          value={formatCurrency(totalBase)}
          icon="📑"
          defaults={{ color: 'azure', size: 'tile-wd-sm', order: 2 }}
        />
        <StatTile 
          id="pay_bonus"
          label="المكافآت"
          value={formatCurrency(totalBonuses)}
          icon="🎁"
          defaults={{ color: 'emerald', size: 'tile-sq-sm', order: 3 }}
        />
        <StatTile 
          id="pay_deduct"
          label="الخصومات"
          value={formatCurrency(totalDeductions)}
          icon="📉"
          defaults={{ color: 'rose', size: 'tile-sq-sm', order: 4 }}
        />
      </div>

      <div className="card anim-slide-in">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>الموظف</th>
                <th>مرتب أساسي</th>
                <th>مكافآت (+)</th>
                <th>خصومات (-)</th>
                <th>صافي الراتب</th>
                <th>الحالة</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center' }}><Loader /></td></tr>
              ) : payrolls.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '100px' }}>
                  <div className="empty-state">
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>😴</div>
                    <h3>لا توجد بيانات لهذا الشهر</h3>
                    <p className="text-dim">قم بإضافة رواتب أو مكافآت للموظفين لتظهر هنا</p>
                  </div>
                </td></tr>
              ) : payrolls.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="avatar-circle" style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '50%', 
                        background: 'var(--bg-tile)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        border: '1px solid var(--border-main)',
                        fontWeight: 'bold',
                        color: 'var(--metro-blue)'
                      }}>
                        {(users[p.userId]?.name || 'U').charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600' }}>{users[p.userId]?.name || `موظف #${p.userId}`}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>ID: {p.userId}</div>
                      </div>
                    </div>
                  </td>
                  <td>{formatCurrency(p.baseSalary)}</td>
                  <td style={{ color: 'var(--metro-green)' }}>+ {formatCurrency(p.totalBonuses)}</td>
                  <td style={{ color: 'var(--metro-red)' }}>- {formatCurrency(p.totalDeductions)}</td>
                  <td style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--text-white)' }}>{formatCurrency(p.netSalary)}</td>
                  <td>
                    <span 
                      className={`badge ${p.status === 'PAID' ? 'badge-success' : 'badge-warning'}`}
                      style={{ fontSize: '0.7rem' }}
                    >
                      {p.status === 'PAID' ? 'مدفوع ✓' : 'معلق ⏳'}
                    </span>
                  </td>
                  <td>
                    {p.status === 'PENDING' ? (
                      <button className="btn btn-sm btn-primary" onClick={() => handlePaySingle(p.id)}>
                        💵 صرف الآن
                      </button>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem' }}>
                        <span className="text-dim">بتاريخ:</span>
                        <span>{new Date(p.paidDate).toLocaleDateString('ar-EG')}</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PayrollDashboard;
