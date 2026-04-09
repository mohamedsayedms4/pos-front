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
      const month = currentDate.getMonth();
      const start = new Date(year, month, 1).toISOString().split('T')[0];
      const end = new Date(year, month, daysInMonth(year, month)).toISOString().split('T')[0];
      
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
      const dueDate = new Date(inst.dueDate);
      return dueDate.getDate() === day && 
             dueDate.getMonth() === currentDate.getMonth() && 
             dueDate.getFullYear() === currentDate.getFullYear();
    });
  };

  const renderHeader = () => {
    const monthNames = [
      "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
      "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];
    return (
      <div className="calendar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="btn-secondary" onClick={prevMonth}>◄</button>
          <h2 style={{ margin: 0, minWidth: '150px', textAlign: 'center' }}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button className="btn-secondary" onClick={nextMonth}>►</button>
        </div>
        <div className="filter-tabs" style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '5px', borderRadius: '10px' }}>
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
      <div className="calendar-grid-header" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', marginBottom: '10px' }}>
        {days.map(d => (
          <div key={d} style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '14px' }}>{d}</div>
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
      cells.push(<div key={`empty-${i}`} className="calendar-cell empty"></div>);
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
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            padding: '10px',
            minHeight: '100px',
            position: 'relative',
            cursor: 'pointer',
            border: isToday ? '2px solid var(--accent-primary)' : '2px solid transparent',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={() => setSelectedDay(d)}
        >
          <span style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '5px' }}>{d}</span>
          
          {/* List view (Desktop) */}
          <div className="inst-banner-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {dayInsts.slice(0, 3).map((inst, idx) => (
              <div 
                key={inst.id} 
                className="inst-banner"
                style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: inst.debt?.type === 'RECEIVABLE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: inst.debt?.type === 'RECEIVABLE' ? '#10b981' : '#ef4444',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  borderRight: `3px solid ${inst.debt?.type === 'RECEIVABLE' ? '#10b981' : '#ef4444'}`
                }}
              >
                {inst.amount} - {inst.debt?.entityName || 'جهر مجهولة'}
              </div>
            ))}
            {dayInsts.length > 3 && (
              <div className="inst-banner" style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>
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
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', display: 'grid', gap: '5px', marginBottom: '24px' }}>
        <div className="stat-card emerald">
          <div className="stat-icon">💰</div>
          <div className="stat-value" style={{ fontSize: '2.5rem' }}>{totalRec.toLocaleString()} <small style={{ fontSize: '1rem' }}>ج.م</small></div>
          <div className="stat-label">إجمالي المستحقات (لنا) هذا الشهر</div>
        </div>
        <div className="stat-card magenta">
          <div className="stat-icon">💸</div>
          <div className="stat-value" style={{ fontSize: '2.5rem' }}>{totalPay.toLocaleString()} <small style={{ fontSize: '1rem' }}>ج.م</small></div>
          <div className="stat-label">إجمالي الالتزامات (علينا) هذا الشهر</div>
        </div>
      </div>
    );
  };

  return (
    <div className="page-container installment-calendar-page" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <style>{`
        @media (max-width: 768px) {
          .installment-calendar-page { padding: 10px !important; }
          .calendar-header { flex-direction: column; gap: 15px; align-items: stretch !important; }
          .calendar-header div { justify-content: center; }
          .calendar-stats { grid-template-columns: 1fr !important; gap: 10px !important; }
          .stat-card { padding: 15px !important; }
          .stat-card div:last-child { font-size: 20px !important; }
          .calendar-grid-header { font-size: 12px !important; gap: 5px !important; }
          .calendar-grid { gap: 5px !important; }
          .calendar-cell { min-height: 60px !important; padding: 5px !important; border-radius: 8px !important; }
          .calendar-cell span { font-size: 14px !important; }
          .inst-banner { display: none !important; }
          .inst-dot-container { display: flex !important; flex-wrap: wrap; gap: 2px; margin-top: auto; justify-content: center; }
          .inst-dot { width: 6px; height: 6px; border-radius: 50%; }
          .page-header h1 { font-size: 22px !important; }
          .day-details h3 { font-size: 18px !important; }
          .details-list > div { flex-direction: column; align-items: flex-start !important; gap: 10px; }
          .details-list > div > div:last-child { text-align: right !important; width: 100%; border-top: 1px solid var(--border-subtle); pt: 10px; }
        }
      `}</style>
      
      <div className="page-header" style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '10px' }}>📅 تقويم الأقساط</h1>
        <p style={{ color: 'var(--text-muted)' }}>متابعة المواعيد القادمة والمتأخرة للأقساط غير المسددة</p>
      </div>

      {renderStats()}
      
      <div className="calendar-main-container" style={{ background: 'var(--bg-app)', padding: '20px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.05)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <Loader message="جاري التحميل..." />
          </div>
        )}
        {renderHeader()}
        {renderDays()}
        <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
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
  color: 'var(--accent-primary)',
  boxShadow: 'var(--shadow-sm)'
};

export default InstallmentCalendar;
