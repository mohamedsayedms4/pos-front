import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import '../styles/pages/PayrollPremium.css';

const CustomSelect = ({ options, value, onChange, icon })
  => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value) || options[0];
  return (
    <div className="pay-custom-select-container" style={{ minWidth: '140px' }}>
      <div className={`chk-custom-select-header ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        {icon && <i className={`fas ${icon} icon-start`}></i>}
        <span className="selected-text">{selectedOption.label}</span>
        <i className="fas fa-chevron-down icon-end"></i>
      </div>
      {isOpen && (
        <>
          <div className="pay-custom-select-overlay" onClick={() => setIsOpen(false)}></div>
          <div className="pay-custom-select-dropdown">
            {options.map(opt => (
              <div key={opt.value} className={`chk-custom-select-item ${opt.value === value ? 'active' : ''}`} onClick={() => { onChange(opt.value); setIsOpen(false); }}>
                {opt.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

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

  useEffect(() => { loadData(); }, [month, year, selectedBranchId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [payrollData, usersData, branchesData] = await Promise.all([
        Api.getMonthlyPayrolls(month, year, selectedBranchId),
        Api.getUsers(0, 1000),
        branches.length === 0 ? Api.getBranches().catch(() => []) : Promise.resolve(branches)
      ]);
      const userMap = {};
      (usersData.items || usersData.content || []).forEach(u => { userMap[u.id] = u; });
      setUsers(userMap);
      setPayrolls(payrollData || []);
      if (branches.length === 0) setBranches(branchesData);
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const handlePayAll = () => {
    const pending = payrolls.filter(p => p.status === 'PENDING');
    if (pending.length === 0) { toast('لا توجد كشوفات معلقة', 'info'); return; }
    confirm(`هل أنت متأكد من صرف مرتبات ${pending.length} موظف؟`, async () => {
      try {
        for (const p of pending) await Api.payEmployeePayroll(p.id);
        toast('تم الصرف بنجاح', 'success'); loadData();
      } catch (err) { toast(err.message, 'error'); }
    });
  };

  const handleGenerateAll = async () => {
    const employeesToGenerate = Object.values(users).filter(u => u.enabled && !payrolls.some(p => p.userId === u.id));
    if (employeesToGenerate.length === 0) { toast('لا توجد مرتبات جديدة للتوليد', 'info'); return; }
    setGenerating(true);
    try {
      for (const emp of employeesToGenerate) await Api.generateEmployeePayroll(emp.id, month, year);
      toast('تم توليد الكشوفات بنجاح', 'success'); loadData();
    } catch (err) { toast(err.message, 'error'); }
    finally { setGenerating(false); }
  };

  const totalBase = payrolls.reduce((sum, p) => sum + (p.baseSalary || 0), 0);
  const totalBonuses = payrolls.reduce((sum, p) => sum + (p.totalBonuses || 0), 0);
  const totalDeductions = payrolls.reduce((sum, p) => sum + (p.totalDeductions || 0), 0);
  const totalNet = payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);

  const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

  return (
    <div className="payroll-container">
      {/* 1. Header */}
      <div className="pay-header-row">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="pay-breadcrumbs">
            <Link to="/dashboard">الرئيسية</Link> / <span>شؤون الموظفين</span>
          </div>
          <h1>مسير الرواتب</h1>
        </div>
        <div className="pay-header-actions">
          <button className="pay-btn-premium pay-btn-outline" onClick={handleGenerateAll} disabled={generating}>
            <i className="fas fa-bolt"></i> {generating ? 'جاري التوليد...' : 'توليد الشهر'}
          </button>
          <button className="pay-btn-premium pay-btn-blue" onClick={handlePayAll}>
            <i className="fas fa-money-check-alt"></i> صرف الكل
          </button>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="pay-stats-grid">
        <div className="pay-stat-card">
          <div className="pay-stat-info">
            <h4>إجمالي صافي المنصرف</h4>
            <div className="pay-stat-value">{totalNet.toLocaleString('ar-EG')} <span style={{ fontSize: '0.8rem' }}>ج.م</span></div>
          </div>
          <div className="pay-stat-visual"><div className="pay-stat-icon icon-blue"><i className="fas fa-hand-holding-usd"></i></div></div>
        </div>
        <div className="pay-stat-card">
          <div className="pay-stat-info">
            <h4>إجمالي الأساسي</h4>
            <div className="pay-stat-value">{totalBase.toLocaleString('ar-EG')} <span style={{ fontSize: '0.8rem' }}>ج.م</span></div>
          </div>
          <div className="pay-stat-visual"><div className="pay-stat-icon icon-green"><i className="fas fa-file-invoice-dollar"></i></div></div>
        </div>
        <div className="pay-stat-card">
          <div className="pay-stat-info">
            <h4>المكافآت (+)</h4>
            <div className="pay-stat-value" style={{ color: 'var(--pay-accent-green)' }}>{totalBonuses.toLocaleString('ar-EG')} <span style={{ fontSize: '0.8rem' }}>ج.م</span></div>
          </div>
          <div className="pay-stat-visual"><div className="pay-stat-icon icon-amber"><i className="fas fa-gift"></i></div></div>
        </div>
        <div className="pay-stat-card">
          <div className="pay-stat-info">
            <h4>الخصومات (-)</h4>
            <div className="pay-stat-value" style={{ color: '#f43f5e' }}>{totalDeductions.toLocaleString('ar-EG')} <span style={{ fontSize: '0.8rem' }}>ج.م</span></div>
          </div>
          <div className="pay-stat-visual"><div className="pay-stat-icon icon-purple"><i className="fas fa-chart-line"></i></div></div>
        </div>
      </div>

      {/* 3. Toolbar (Filters) */}
      <div className="pay-toolbar-card">
        <div className="pay-toolbar-left" style={{ flexWrap: 'wrap' }}>
          {isAdmin && (
            <CustomSelect
              icon="fa-building"
              value={selectedBranchId}
              onChange={val => setSelectedBranchId(val)}
              options={[{ value: '', label: 'جميع الفروع' }, ...branches.map(b => ({ value: b.id, label: b.name }))]}
            />
          )}
          <CustomSelect
            icon="fa-calendar-alt"
            value={month}
            onChange={val => setMonth(val)}
            options={monthNames.map((m, i) => ({ value: i + 1, label: m }))}
          />
          <CustomSelect
            icon="fa-history"
            value={year}
            onChange={val => setYear(val)}
            options={[2024, 2025, 2026].map(y => ({ value: y, label: String(y) }))}
          />
        </div>
      </div>

      {/* 4. Table Card */}
      <div className="pay-table-card">
        <div className="pay-table-container">
          {loading ? (
            <div style={{ padding: '40px' }}><Loader message="جاري تحليل الرواتب..." /></div>
          ) : payrolls.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--pay-text-secondary)' }}>
              <i className="fas fa-users-slash" style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}></i>
              <h3>لا توجد كشوفات رواتب لهذا الشهر</h3>
            </div>
          ) : (
            <table className="pay-table">
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
                {payrolls.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--pay-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800 }}>
                          {(users[p.userId]?.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800 }}>{users[p.userId]?.name || `موظف #${p.userId}`}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--pay-text-secondary)' }}>ID: {p.userId}</div>
                        </div>
                      </div>
                    </td>
                    <td>{p.baseSalary.toLocaleString('ar-EG')}</td>
                    <td style={{ color: 'var(--pay-accent-green)', fontWeight: 700 }}>+ {p.totalBonuses.toLocaleString('ar-EG')}</td>
                    <td style={{ color: '#f43f5e', fontWeight: 700 }}>- {p.totalDeductions.toLocaleString('ar-EG')}</td>
                    <td style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--pay-accent-blue)' }}>{p.netSalary.toLocaleString('ar-EG')}</td>
                    <td>
                      <span className={`pay-type-badge ${p.status === 'PAID' ? 'badge-green' : 'badge-amber'}`}>
                        {p.status === 'PAID' ? 'تم الصرف ✓' : 'معلق ⏳'}
                      </span>
                    </td>
                    <td>
                      {p.status === 'PENDING' ? (
                        <button className="pay-btn-premium pay-btn-blue" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => Api.payEmployeePayroll(p.id).then(() => { toast('تم الصرف', 'success'); loadData(); })}>
                          صرف الآن
                        </button>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: 'var(--pay-text-secondary)' }}>
                          {new Date(p.paidDate).toLocaleDateString('ar-EG')}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayrollDashboard;
