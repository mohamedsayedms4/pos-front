import React, { useState, useEffect } from 'react';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';


const InstallmentCalendar = () => {
  const { toast } = useGlobalUI();
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [installments, setInstallments] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [filter, setFilter] = useState('ALL'); // ALL, RECEIVABLE, PAYABLE

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const fetchData = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const monthNum = currentDate.getMonth() + 1;
      const monthStr = String(monthNum).padStart(2, '0');
      const start = `${year}-${monthStr}-01`;
      const lastDay = daysInMonth(year, currentDate.getMonth());
      const end = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
      
      const data = await Api.getCalendarInstallments(start, end);
      setInstallments(data);
    } catch (err) {
      toast(err.message || 'خطأ في تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const filteredInstallments = installments.filter(inst => {
    if (filter === 'ALL') return true;
    return inst.debt?.type === filter;
  });

  const getDayInstallments = (day) => {
    return filteredInstallments.filter(inst => {
      if (!inst.dueDate) return false;
      const parts = inst.dueDate.split('-');
      if (parts.length !== 3) return false;
      
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1; // 0-based month
      const d = parseInt(parts[2], 10);
      
      return d === day && 
             m === currentDate.getMonth() && 
             y === currentDate.getFullYear();
    });
  };

  const renderHeader = () => {
    const monthNames = [
      "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
      "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];
    return (
      <div className="calendar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', padding: '10px 0' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button className="cal-nav-btn" onClick={prevMonth}>&#8249;</button>
          <h2 style={{ margin: 0, minWidth: '160px', textAlign: 'center', fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-main)' }}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button className="cal-nav-btn" onClick={nextMonth}>&#8250;</button>
        </div>
        <div className="filter-tabs" style={{ display: 'flex', background: 'var(--bg-elevated)', padding: '6px', borderRadius: '12px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <button 
            className={`tab-btn ${filter === 'ALL' ? 'active' : ''}`} 
            onClick={() => setFilter('ALL')}
            style={filter === 'ALL' ? activeTabStyle : tabStyle}
          >الكل</button>
          <button 
            className={`tab-btn ${filter === 'RECEIVABLE' ? 'active' : ''}`} 
            onClick={() => setFilter('RECEIVABLE')}
            style={filter === 'RECEIVABLE' ? { ...activeTabStyle, color: '#10b981' } : tabStyle}
          >لنا (+)</button>
          <button 
            className={`tab-btn ${filter === 'PAYABLE' ? 'active' : ''}`} 
            onClick={() => setFilter('PAYABLE')}
            style={filter === 'PAYABLE' ? { ...activeTabStyle, color: '#ef4444' } : tabStyle}
          >علينا (-)</button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    return (
      <div className="calendar-grid-header" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', marginBottom: '12px' }}>
        {days.map(d => (
          <div key={d} style={{ textAlign: 'center', fontWeight: '800', color: 'var(--text-secondary)', fontSize: '0.95rem', padding: '10px 0', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>{d}</div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);
    const cells = [];

    // Empty cells for alignment
    for (let i = 0; i < startDay; i++) {
      cells.push(<div key={`empty-${i}`} className="calendar-cell empty" style={{ background: 'transparent' }}></div>);
    }

    // Actual days
    for (let d = 1; d <= totalDays; d++) {
      const dayInsts = getDayInstallments(d);
      const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
      
      cells.push(
        <div 
          key={d} 
          className={`calendar-cell ${isToday ? 'today' : ''} ${selectedDay === d ? 'selected' : ''}`}
          style={{
            background: 'var(--bg-elevated)',
            borderRadius: '12px',
            padding: '12px',
            minHeight: '120px',
            position: 'relative',
            cursor: 'pointer',
            border: isToday ? '2px solid var(--metro-blue)' : selectedDay === d ? '2px solid var(--text-main)' : '1px solid var(--border-subtle)',
            boxShadow: (isToday || selectedDay === d) ? 'var(--shadow-md)' : 'var(--shadow-sm)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={() => setSelectedDay(d)}
        >
          <span style={{ fontSize: '1.1rem', fontWeight: isToday ? '900' : '700', marginBottom: '8px', color: isToday ? 'var(--metro-blue)' : 'var(--text-main)', display: 'inline-block', background: isToday ? 'rgba(0, 120, 215, 0.1)' : 'transparent', width: 'fit-content', padding: '2px 8px', borderRadius: '8px' }}>{d}</span>
          
          {/* List view (Desktop) */}
          <div className="inst-banner-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {dayInsts.slice(0, 3).map((inst, idx) => (
              <div 
                key={inst.id} 
                className="inst-banner"
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  background: inst.debt?.type === 'RECEIVABLE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: inst.debt?.type === 'RECEIVABLE' ? '#10b981' : '#ef4444',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  borderRight: `4px solid ${inst.debt?.type === 'RECEIVABLE' ? '#10b981' : '#ef4444'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span style={{ fontWeight: '800' }}>{inst.amount}</span> - <span>{inst.debt?.entityName || 'جهة مجهولة'}</span>
              </div>
            ))}
            {dayInsts.length > 3 && (
              <div className="inst-banner" style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', textAlign: 'center', background: 'var(--bg-app)', padding: '4px', borderRadius: '6px' }}>
                +{dayInsts.length - 3} المزيد
              </div>
            )}
          </div>

          {/* Dot view (Mobile - Hidden on Desktop via CSS) */}
          <div className="inst-dot-container" style={{ display: 'none' }}>
            {dayInsts.map(inst => (
              <div 
                key={inst.id} 
                className="inst-dot" 
                style={{ background: inst.debt?.type === 'RECEIVABLE' ? '#10b981' : '#ef4444' }}
              />
            ))}
          </div>
        </div>
      );
    }

    return cells;
  };

  const renderDetails = () => {
    if (!selectedDay) return null;
    const dayInsts = getDayInstallments(selectedDay);
    
    return (
      <div className="day-details" style={{ marginTop: '30px', padding: '20px', background: 'var(--bg-secondary)', borderRadius: '15px', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>تفاصيل يوم {selectedDay}</h3>
          <button className="btn-close" onClick={() => setSelectedDay(null)}>✕</button>
        </div>
        {dayInsts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>لا توجد أقساط مستحقة في هذا اليوم</div>
        ) : (
          <div className="details-list" style={{ display: 'grid', gap: '10px' }}>
            {dayInsts.map(inst => (
              <div key={inst.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-app)', borderRadius: '10px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{inst.debt?.entityName || 'جهة مجهولة'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{inst.debt?.reason || 'لا توجد ملاحظات'}</div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 'bold', color: inst.debt?.type === 'RECEIVABLE' ? '#10b981' : '#ef4444' }}>
                    {inst.debt?.type === 'RECEIVABLE' ? '+' : '-'}{inst.amount} ج.م
                  </div>
                  <div style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: inst.status === 'OVERDUE' ? '#fee2e2' : '#fef3c7', color: inst.status === 'OVERDUE' ? '#ef4444' : '#d97706', display: 'inline-block' }}>
                    {inst.status === 'OVERDUE' ? 'متأخر' : 'منتظر'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderStats = () => {
    const totalRec = filteredInstallments.filter(i => i.debt?.type === 'RECEIVABLE').reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const totalPay = filteredInstallments.filter(i => i.debt?.type === 'PAYABLE').reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    return (
      <div className="cal-stats-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="cal-stat-card cal-stat-rec">
          <div className="cal-stat-icon">💵</div>
          <div className="cal-stat-info">
            <span className="cal-stat-label">إجمالي المستحقات (لنا)</span>
            <span className="cal-stat-value">{totalRec.toLocaleString()} <small>ج.م</small></span>
          </div>
        </div>
        
        <div className="cal-stat-card cal-stat-pay">
          <div className="cal-stat-icon">💸</div>
          <div className="cal-stat-info">
            <span className="cal-stat-label">إجمالي الالتزامات (علينا)</span>
            <span className="cal-stat-value">{totalPay.toLocaleString()} <small>ج.م</small></span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page-container installment-calendar-page" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <style>{`
        .cal-stat-card {
          display: flex;
          align-items: center;
          padding: 24px;
          border-radius: 20px;
          color: #fff;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          position: relative;
        }
        .cal-stat-card::after {
          content: '';
          position: absolute;
          top: 0; right: 0; bottom: 0; left: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%);
          pointer-events: none;
        }
        .cal-stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(0,0,0,0.15);
        }
        .cal-stat-rec {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }
        .cal-stat-pay {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        }
        .cal-stat-icon {
          font-size: 3rem;
          margin-left: 20px;
          opacity: 0.8;
          display: flex;
        }
        .cal-stat-info {
          display: flex;
          flex-direction: column;
          z-index: 1;
        }
        .cal-stat-label {
          font-size: 1.05rem;
          font-weight: 600;
          opacity: 0.9;
          margin-bottom: 4px;
        }
        .cal-stat-value {
          font-size: 2.2rem;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .cal-stat-value small {
          font-size: 1rem;
          font-weight: 600;
          opacity: 0.8;
        }
        
        .cal-nav-btn {
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          color: var(--text-main);
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: var(--shadow-sm);
        }
        .cal-nav-btn:hover {
          background: var(--metro-blue);
          color: #fff;
          border-color: var(--metro-blue);
          transform: scale(1.05);
        }
        
        .calendar-cell:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--border-input) !important;
        }
        .calendar-cell.today:hover {
          border-color: var(--metro-blue) !important;
        }
        
        @media (max-width: 768px) {
          /* Page Layout */
          .installment-calendar-page { padding: 8px !important; }
          .calendar-main-container { padding: 10px !important; border-radius: 14px !important; }
          
          /* Page Header */
          .page-header { margin-bottom: 15px !important; }
          .page-header h1 { font-size: 1.3rem !important; }
          .page-header p { font-size: 0.85rem !important; display: none; }
          
          /* Stats Cards */
          .cal-stats-container { grid-template-columns: 1fr 1fr !important; gap: 10px !important; margin-bottom: 16px !important; }
          .cal-stat-card { padding: 14px !important; border-radius: 14px !important; flex-direction: column; text-align: center; align-items: center; }
          .cal-stat-icon { font-size: 1.8rem !important; margin-left: 0 !important; margin-bottom: 6px; }
          .cal-stat-label { font-size: 0.75rem !important; }
          .cal-stat-value { font-size: 1.3rem !important; }
          .cal-stat-value small { font-size: 0.75rem !important; }
          
          /* Calendar Header */
          .calendar-header { flex-direction: column !important; gap: 10px !important; align-items: stretch !important; margin-bottom: 14px !important; padding: 0 !important; }
          .calendar-header > div:first-child { justify-content: center !important; }
          .filter-tabs { justify-content: center !important; }
          .cal-nav-btn { width: 36px !important; height: 36px !important; font-size: 1.2rem; }

          /* Days Header */
          .calendar-grid-header { gap: 3px !important; margin-bottom: 4px !important; }
          .calendar-grid-header > div { font-size: 0.6rem !important; padding: 6px 2px !important; border-radius: 6px !important; font-weight: 700; letter-spacing: -0.3px; }
          
          /* Calendar Grid */
          .calendar-grid { gap: 3px !important; }
          .calendar-cell { min-height: 56px !important; padding: 5px 4px !important; border-radius: 8px !important; }
          .calendar-cell > span { font-size: 0.8rem !important; margin-bottom: 3px !important; padding: 1px 5px !important; }
          
          /* Hide banners, show dots on mobile */
          .inst-banner { display: none !important; }
          .inst-banner-container { display: none !important; }
          .inst-dot-container { display: flex !important; flex-wrap: wrap; gap: 3px; margin-top: auto; justify-content: center; padding: 2px; }
          .inst-dot { width: 7px !important; height: 7px !important; border-radius: 50%; }
          
          /* Day Details Panel */
          .day-details { margin-top: 15px !important; padding: 14px !important; border-radius: 12px !important; }
          .day-details h3 { font-size: 1rem !important; }
          .details-list > div { flex-direction: column; align-items: flex-start !important; gap: 8px; }
          .details-list > div > div:last-child { width: 100%; border-top: 1px solid var(--border-subtle); padding-top: 8px; display: flex; justify-content: space-between; align-items: center; }
        }
        
        @media (max-width: 400px) {
          .cal-stats-container { grid-template-columns: 1fr !important; }
          .calendar-grid-header > div { font-size: 0.55rem !important; padding: 4px 1px !important; }
          .calendar-cell { min-height: 46px !important; }
          .calendar-cell > span { font-size: 0.72rem !important; }
        }
      `}</style>
      
      <div className="page-header" style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ background: 'var(--bg-elevated)', padding: '15px', borderRadius: '15px', boxShadow: 'var(--shadow-sm)', fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          📅
        </div>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', margin: '0 0 5px 0', color: 'var(--text-main)' }}>تقويم الأقساط</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1rem' }}>متابعة المواعيد القادمة والمتأخرة للأقساط غير المسددة</p>
        </div>
      </div>

      {renderStats()}
      
      <div className="calendar-main-container" style={{ background: 'var(--bg-app)', padding: '24px', borderRadius: '24px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-subtle)', position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.1)', backdropFilter: 'blur(4px)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <Loader message="جاري التحميل..." />
          </div>
        )}
        {renderHeader()}
        {renderDays()}
        <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>
          {renderCells()}
        </div>
      </div>

      {renderDetails()}
    </div>
  );
};

const tabStyle = {
  padding: '8px 20px',
  border: 'none',
  background: 'transparent',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 'bold',
  color: 'var(--text-muted)',
  transition: 'all 0.2s'
};

const activeTabStyle = {
  ...tabStyle,
  background: 'var(--bg-app)',
  color: 'var(--metro-blue)',
  boxShadow: 'var(--shadow-md)',
  border: '1px solid var(--border-subtle)'
};

export default InstallmentCalendar;
