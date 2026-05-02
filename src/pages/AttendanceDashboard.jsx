import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import '../styles/pages/AttendancePremium.css';

const CustomSelect = ({ options, value, onChange, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value) || options[0];
  return (
    <div className="att-custom-select-container" style={{ minWidth: '160px' }}>
      <div className={`att-custom-select-header ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        {icon && <i className={`fas ${icon} icon-start`}></i>}
        <span className="selected-text">{selectedOption.label}</span>
        <i className="fas fa-chevron-down icon-end"></i>
      </div>
      {isOpen && (
        <>
          <div className="att-custom-select-overlay" onClick={() => setIsOpen(false)}></div>
          <div className="att-custom-select-dropdown">
            {options.map(opt => (
              <div key={opt.value} className={`att-custom-select-item ${opt.value === value ? 'active' : ''}`} onClick={() => { onChange(opt.value); setIsOpen(false); }}>
                {opt.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const AttendanceDashboard = () => {
  const { toast } = useGlobalUI();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shifts, setShifts] = useState([]);
  const [selectedShift, setSelectedShift] = useState('');
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const isAdmin = Api.isAdminOrBranchManager();

  useEffect(() => { fetchData(); }, [date, selectedShift, selectedBranchId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, shiftRes, branchesData] = await Promise.all([
        Api.getUsers(0, 1000, '', selectedBranchId),
        Api.getShifts(),
        branches.length === 0 ? Api.getBranches().catch(() => []) : Promise.resolve(branches)
      ]);
      const allEmps = empRes.items || empRes.content || [];
      setShifts(shiftRes || []);
      if (branches.length === 0) setBranches(branchesData);
      const filtered = selectedShift ? allEmps.filter(e => e.profile?.shift?.id === parseInt(selectedShift)) : allEmps;
      setEmployees(filtered);
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleAction = async (userId, action) => {
    try {
      if (action === 'checkIn') await Api.checkInEmployee(userId);
      else if (action === 'checkOut') await Api.checkOutEmployee(userId);
      else if (action === 'absent') await Api.markEmployeeAbsent(userId, date);
      toast('تم تنفيذ الإجراء بنجاح', 'success'); fetchData();
    } catch (err) { toast(err.message, 'error'); }
  };

  return (
    <div className="attendance-container">
      {/* 1. Header */}
      <div className="att-header-row">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="att-breadcrumbs">
            <Link to="/dashboard">الرئيسية</Link> / <span>HR</span>
          </div>
          <h1>الحضور والانصراف</h1>
        </div>
        <div className="att-header-actions">
          <input type="date" className="att-input" value={date} onChange={e => setDate(e.target.value)} style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--att-border)', background: 'var(--att-card-bg)', color: 'var(--att-text-primary)' }} />
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="att-stats-grid">
        <div className="att-stat-card">
          <div className="att-stat-info">
            <h4>إجمالي الموظفين</h4>
            <div className="att-stat-value">{employees.length}</div>
          </div>
          <div className="att-stat-visual"><div className="att-stat-icon icon-blue"><i className="fas fa-users"></i></div></div>
        </div>
        <div className="att-stat-card">
          <div className="att-stat-info">
            <h4>الحاضرين اليوم</h4>
            <div className="att-stat-value">0</div> {/* Placeholder as backend might not return stats directly here */}
          </div>
          <div className="att-stat-visual"><div className="att-stat-icon icon-green"><i className="fas fa-user-check"></i></div></div>
        </div>
        <div className="att-stat-card">
          <div className="att-stat-info">
            <h4>المتأخرين</h4>
            <div className="att-stat-value">0</div>
          </div>
          <div className="att-stat-visual"><div className="att-stat-icon icon-amber"><i className="fas fa-user-clock"></i></div></div>
        </div>
        <div className="att-stat-card">
          <div className="att-stat-info">
            <h4>الغائبين</h4>
            <div className="att-stat-value">0</div>
          </div>
          <div className="att-stat-visual"><div className="att-stat-icon icon-purple"><i className="fas fa-user-times"></i></div></div>
        </div>
      </div>

      {/* 3. Toolbar (Filters) */}
      <div className="att-toolbar-card">
        <div className="att-toolbar-left" style={{ flex: 1 }}>
          {isAdmin && (
            <CustomSelect 
              icon="fa-building"
              value={selectedBranchId}
              onChange={val => setSelectedBranchId(val)}
              options={[{ value: '', label: 'جميع الفروع' }, ...branches.map(b => ({ value: b.id, label: b.name }))]}
            />
          )}
          <CustomSelect 
            icon="fa-clock"
            value={selectedShift}
            onChange={val => setSelectedShift(val)}
            options={[{ value: '', label: 'جميع الورديات' }, ...shifts.map(s => ({ value: s.id, label: s.name }))]}
          />
        </div>
      </div>

      {/* 4. Attendance Grid */}
      <div className="att-grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', marginTop: '20px' }}>
        {loading ? (
          <div style={{ gridColumn: '1/-1', padding: '100px' }}><Loader message="جاري التحقق من سجلات الحضور..." /></div>
        ) : employees.length === 0 ? (
          <div style={{ gridColumn: '1/-1', padding: '100px', textAlign: 'center', color: 'var(--att-text-secondary)' }}>
            <i className="fas fa-user-slash" style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}></i>
            <h3>لا يوجد موظفين في هذه القائمة</h3>
          </div>
        ) : employees.map(emp => (
          <div key={emp.id} className="att-employee-card" style={{ background: 'var(--att-card-bg)', border: '1px solid var(--att-border)', borderRadius: '24px', padding: '24px', position: 'relative', overflow: 'hidden', transition: 'all 0.3s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--att-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 900 }}>
                {(emp.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{emp.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--att-text-secondary)' }}>{emp.jobTitle?.name || 'موظف'}</div>
                <span className="att-type-badge badge-blue" style={{ fontSize: '0.65rem', marginTop: '4px' }}>{emp.profile?.shift?.name || 'بدون وردية'}</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="att-btn-premium att-btn-blue" style={{ flex: 1, padding: '10px' }} onClick={() => handleAction(emp.id, 'checkIn')}>
                <i className="fas fa-map-marker-alt"></i> حضور
              </button>
              <button className="att-btn-premium att-btn-outline" style={{ flex: 1, padding: '10px', color: '#f43f5e', borderColor: 'rgba(244, 63, 94, 0.2)' }} onClick={() => handleAction(emp.id, 'checkOut')}>
                <i className="fas fa-walking"></i> انصراف
              </button>
              <button className="att-btn-premium att-btn-ghost" style={{ padding: '10px' }} title="غياب" onClick={() => handleAction(emp.id, 'absent')}>
                <i className="fas fa-times" style={{ color: '#f43f5e' }}></i>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttendanceDashboard;
