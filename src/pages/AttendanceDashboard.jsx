import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';

const AttendanceDashboard = () => {
  const { toast } = useGlobalUI();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shifts, setShifts] = useState([]);
  const [selectedShift, setSelectedShift] = useState('');

  useEffect(() => {
    fetchData();
  }, [date, selectedShift]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, shiftRes] = await Promise.all([
        Api.getUsers(0, 1000),
        Api.getShifts()
      ]);
      
      const allEmps = empRes.items || empRes.content || [];
      setShifts(shiftRes);
      
      // Filter by shift if selected
      const filtered = selectedShift 
        ? allEmps.filter(e => e.profile?.shift?.id === parseInt(selectedShift))
        : allEmps;

      setEmployees(filtered);
    } catch (err) {
      toast('فشل في تحميل البيانات: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (userId, action) => {
    try {
      if (action === 'checkIn') {
        const res = await Api.checkInEmployee(userId);
        toast(`تم تسجيل حضور ${res.user?.name || ''} بنجاح`, 'success');
      } else if (action === 'checkOut') {
        const res = await Api.checkOutEmployee(userId);
        toast(`تم تسجيل انصراف ${res.user?.name || ''} بنجاح`, 'success');
      } else if (action === 'absent') {
        await Api.markEmployeeAbsent(userId, date);
        toast('تم تسجيل الغياب', 'warning');
      }
      fetchData();
    } catch (err) {
      if (err.message.includes('Already checked in')) {
        toast('الموظف سجل حضوره بالفعل لهذا اليوم', 'info');
      } else {
        toast(err.message, 'error');
      }
    }
  };

  const getRandomColor = (name) => {
    const colors = ['#0078D7', '#107C10', '#D83B01', '#881798', '#00B294', '#E3008C'];
    const charCode = name.charCodeAt(0);
    return colors[charCode % colors.length];
  };

  if (loading && employees.length === 0) return <Loader />;

  return (
    <div className="page-section anim-fade-in">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px' }}>
            <span style={{ fontSize: '2.5rem' }}>📅</span>
            <h1 className="page-title" style={{ margin: 0 }}>لوحة تحكم الحضور</h1>
          </div>
          <p className="text-dim" style={{ fontSize: '1.1rem', fontWeight: '300' }}>
            {new Date(date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '15px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '5px', display: 'block' }}>تاريخ كشف الحضور</label>
            <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} style={{ width: '200px', height: '48px' }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '5px', display: 'block' }}>تصفية حسب الوردية</label>
            <select className="form-control" value={selectedShift} onChange={e => setSelectedShift(e.target.value)} style={{ width: '180px', height: '48px' }}>
              <option value="">جميع الورديات</option>
              {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
        {employees.length === 0 && !loading ? (
             <div className="card empty-state" style={{ gridColumn: '1 / -1', padding: '100px', textAlign: 'center' }}>
                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>👥</div>
                <h3>لا يوجد موظفين في هذه الوردية</h3>
             </div>
        ) : employees.map(emp => (
          <div key={emp.id} className="card employee-attendance-card anim-slide-in" style={{ 
            borderLeft: `6px solid ${emp.enabled ? 'var(--metro-blue)' : 'var(--text-dim)'}`,
            background: 'var(--bg-dark)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div className="card-body" style={{ padding: '30px', display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div className="avatar-wrapper" style={{ position: 'relative' }}>
                <div className="avatar" style={{ 
                  width: '70px', 
                  height: '70px', 
                  borderRadius: '50%', 
                  background: getRandomColor(emp.name), 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '2rem', 
                  fontWeight: '800',
                  color: '#fff',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                }}>
                  {emp.name.charAt(0)}
                </div>
                {emp.enabled && <div style={{ position: 'absolute', bottom: '0', right: '0', width: '15px', height: '15px', background: 'var(--metro-green)', borderRadius: '50%', border: '3px solid var(--bg-dark)' }}></div>}
              </div>
              
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>{emp.name}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{emp.jobTitle?.title || emp.jobTitle?.name || 'موظف بالفريق'}</div>
                <span className="badge badge-info" style={{ fontSize: '0.65rem', borderRadius: '4px' }}>
                   {emp.profile?.shift?.name || 'بدون وردية ثابتة'}
                </span>
              </div>
            </div>
            
            <div className="card-footer" style={{ 
              background: 'rgba(255,255,255,0.02)', 
              padding: '15px 25px', 
              display: 'flex', 
              gap: '12px',
              borderTop: '1px solid var(--border-subtle)'
            }}>
              <button 
                className="btn btn-success" 
                style={{ flex: 1.5, height: '42px', gap: '8px', fontSize: '0.9rem' }} 
                onClick={() => handleAction(emp.id, 'checkIn')}
              >
                <span>📍</span> حضور
              </button>
              <button 
                className="btn btn-danger" 
                style={{ flex: 1.5, height: '42px', gap: '8px', fontSize: '0.9rem' }} 
                onClick={() => handleAction(emp.id, 'checkOut')}
              >
                <span>🏃</span> انصراف
              </button>
              <button 
                className="btn btn-ghost" 
                style={{ flex: 1, height: '42px', padding: 0 }} 
                title="تسجيل غياب"
                onClick={() => handleAction(emp.id, 'absent')}
              >
                ❌ غياب
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttendanceDashboard;
