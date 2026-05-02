import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import '../styles/pages/CalendarPremium.css';

const InstallmentCalendar = () => {
  const { toast } = useGlobalUI();
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [installments, setInstallments] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [filter, setFilter] = useState('ALL');

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const fetchData = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const monthStr = String(currentDate.getMonth() + 1).padStart(2, '0');
      const start = `${year}-${monthStr}-01`;
      const end = `${year}-${monthStr}-${String(daysInMonth(year, currentDate.getMonth())).padStart(2, '0')}`;
      const data = await Api.getCalendarInstallments(start, end);
      setInstallments(data || []);
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [currentDate]);

  const filteredInstallments = installments.filter(inst => filter === 'ALL' || inst.debt?.type === filter);

  const getDayInstallments = (day) => {
    return filteredInstallments.filter(inst => {
      const d = new Date(inst.dueDate);
      return d.getDate() === day && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    });
  };

  const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const weekDays = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

  const totalRec = filteredInstallments.filter(i => i.debt?.type === 'RECEIVABLE').reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const totalPay = filteredInstallments.filter(i => i.debt?.type === 'PAYABLE').reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  const renderCells = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);
    const cells = [];
    for (let i = 0; i < startDay; i++) cells.push(<div key={`empty-${i}`} className="cal-cell empty"></div>);
    for (let d = 1; d <= totalDays; d++) {
      const dayInsts = getDayInstallments(d);
      const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
      cells.push(
        <div key={d} className={`cal-cell ${isToday ? 'today' : ''} ${selectedDay === d ? 'selected' : ''}`} onClick={() => setSelectedDay(d)}>
          <span className="cal-day-num">{d}</span>
          <div className="cal-inst-list">
            {dayInsts.slice(0, 2).map(inst => (
              <div key={inst.id} className={`cal-inst-item ${inst.debt?.type === 'RECEIVABLE' ? 'rec' : 'pay'}`}>
                {inst.amount.toLocaleString('ar-EG')}
              </div>
            ))}
            {dayInsts.length > 2 && <div className="cal-more">+{dayInsts.length - 2}</div>}
          </div>
          <div className="cal-dots">
            {dayInsts.map(inst => <div key={inst.id} className={`cal-dot ${inst.debt?.type === 'RECEIVABLE' ? 'rec' : 'pay'}`}></div>)}
          </div>
        </div>
      );
    }
    return cells;
  };

  return (
    <div className="calendar-container">
      {/* 1. Header */}
      <div className="cal-header-row">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="cal-breadcrumbs">
            <Link to="/dashboard">الرئيسية</Link> / <span>المالية</span>
          </div>
          <h1>تقويم الأقساط</h1>
        </div>
        <div className="cal-header-actions">
          <div className="cal-month-nav">
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}><i className="fas fa-chevron-right"></i></button>
            <span style={{ minWidth: '140px', textAlign: 'center', fontWeight: 800, fontSize: '1.2rem' }}>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}><i className="fas fa-chevron-left"></i></button>
          </div>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="cal-stats-grid">
        <div className="cal-stat-card">
          <div className="cal-stat-info">
            <h4>إجمالي المستحقات (لنا)</h4>
            <div className="cal-stat-value" style={{ color: 'var(--cal-accent-green)' }}>{totalRec.toLocaleString('ar-EG')} <span style={{fontSize: '0.8rem'}}>ج.م</span></div>
          </div>
          <div className="cal-stat-visual"><div className="cal-stat-icon icon-green"><i className="fas fa-hand-holding-usd"></i></div></div>
        </div>
        <div className="cal-stat-card">
          <div className="cal-stat-info">
            <h4>إجمالي الالتزامات (علينا)</h4>
            <div className="cal-stat-value" style={{ color: '#f43f5e' }}>{totalPay.toLocaleString('ar-EG')} <span style={{fontSize: '0.8rem'}}>ج.م</span></div>
          </div>
          <div className="cal-stat-visual"><div className="cal-stat-icon icon-amber"><i className="fas fa-file-invoice-dollar"></i></div></div>
        </div>
      </div>

      {/* 3. Toolbar (Tabs) */}
      <div className="cal-toolbar-card">
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(99, 102, 241, 0.05)', padding: '4px', borderRadius: '12px' }}>
          <button className={`cal-btn-premium ${filter === 'ALL' ? 'cal-btn-blue' : 'cal-btn-ghost'}`} onClick={() => setFilter('ALL')}>الكل</button>
          <button className={`cal-btn-premium ${filter === 'RECEIVABLE' ? 'cal-btn-blue' : 'cal-btn-ghost'}`} onClick={() => setFilter('RECEIVABLE')}>لنا (+)</button>
          <button className={`cal-btn-premium ${filter === 'PAYABLE' ? 'cal-btn-amber' : 'cal-btn-ghost'}`} onClick={() => setFilter('PAYABLE')}>علينا (-)</button>
        </div>
      </div>

      {/* 4. Calendar Card */}
      <div className="cal-main-card">
        <div className="cal-grid-weekdays">
          {weekDays.map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="cal-grid-cells">
          {loading ? <div className="cal-loader-overlay"><Loader message="جاري التحميل..." /></div> : renderCells()}
        </div>
      </div>

      {/* 5. Day Details Modal/Sidebar (Optional integration or use current style) */}
      {selectedDay && (
        <div className="cal-details-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontWeight: 800 }}>تفاصيل يوم {selectedDay} {monthNames[currentDate.getMonth()]}</h3>
            <button className="cal-action-btn" onClick={() => setSelectedDay(null)}><i className="fas fa-times"></i></button>
          </div>
          <div className="cal-details-list">
            {getDayInstallments(selectedDay).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--cal-text-secondary)' }}>لا توجد أقساط في هذا اليوم</div>
            ) : (
              getDayInstallments(selectedDay).map(inst => (
                <div key={inst.id} className="cal-detail-item">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800 }}>{inst.debt?.entityName || 'جهة مجهولة'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--cal-text-secondary)' }}>{inst.debt?.reason || 'لا توجد ملاحظات'}</div>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 900, fontSize: '1.1rem', color: inst.debt?.type === 'RECEIVABLE' ? 'var(--cal-accent-green)' : '#f43f5e' }}>
                      {inst.debt?.type === 'RECEIVABLE' ? '+' : '-'}{inst.amount.toLocaleString('ar-EG')}
                    </div>
                    <span className={`cal-type-badge ${inst.status === 'OVERDUE' ? 'badge-red' : 'badge-amber'}`} style={{fontSize: '0.6rem'}}>
                      {inst.status === 'OVERDUE' ? 'متأخر' : 'منتظر'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .cal-main-card { background: var(--cal-card-bg); border: 1px solid var(--cal-border); border-radius: 20px; overflow: hidden; box-shadow: var(--cal-shadow); }
        .cal-grid-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); background: var(--cal-bg); padding: 12px 0; border-bottom: 1px solid var(--cal-border); text-align: center; font-weight: 800; font-size: 0.8rem; color: var(--cal-text-secondary); }
        .cal-grid-cells { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: var(--cal-border); position: relative; }
        .cal-cell { background: var(--cal-card-bg); min-height: 120px; padding: 12px; cursor: pointer; transition: all 0.2s; position: relative; display: flex; flexDirection: column; }
        .cal-cell:hover:not(.empty) { background: var(--cal-row-hover); z-index: 5; }
        .cal-cell.today { background: rgba(99, 102, 241, 0.05); }
        .cal-cell.today .cal-day-num { background: var(--cal-accent-blue); color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .cal-cell.selected { border: 2px solid var(--cal-accent-blue); }
        .cal-day-num { font-weight: 800; font-size: 1rem; margin-bottom: 8px; }
        .cal-inst-list { flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .cal-inst-item { font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; border-right: 3px solid transparent; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cal-inst-item.rec { background: rgba(16, 185, 129, 0.1); color: var(--cal-accent-green); border-right-color: var(--cal-accent-green); }
        .cal-inst-item.pay { background: rgba(244, 63, 94, 0.1); color: #f43f5e; border-right-color: #f43f5e; }
        .cal-dots { display: none; gap: 2px; margin-top: auto; justify-content: center; }
        .cal-dot { width: 6px; height: 6px; border-radius: 50%; }
        .cal-dot.rec { background: var(--cal-accent-green); }
        .cal-dot.pay { background: #f43f5e; }
        .cal-loader-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.2); z-index: 100; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
        .cal-details-card { margin-top: 24px; background: var(--cal-card-bg); border: 1px solid var(--cal-border); border-radius: 20px; padding: 24px; box-shadow: var(--cal-shadow); }
        .cal-detail-item { display: flex; justify-content: space-between; padding: 16px; background: var(--cal-bg); border-radius: 12px; margin-bottom: 12px; align-items: center; border: 1px solid var(--cal-border); }
        
        @media (max-width: 768px) {
          .cal-cell { min-height: 80px; padding: 6px; }
          .cal-inst-list { display: none; }
          .cal-dots { display: flex; }
          .cal-grid-weekdays { font-size: 0.6rem; }
          .cal-day-num { font-size: 0.8rem; }
        }
      `}} />
    </div>
  );
};

export default InstallmentCalendar;
