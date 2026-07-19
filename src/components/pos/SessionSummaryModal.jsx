import React, { useState, useEffect } from 'react';
import Api from '../../services/api';
import { useGlobalUI } from '../common/GlobalUI';

const SessionSummaryModal = ({ sessionId, onClose }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useGlobalUI();

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await Api.getSessionSummary(sessionId);
        setSummary(res);
      } catch (err) {
        toast(err.message || 'حدث خطأ أثناء تحميل التقرير', 'error');
        onClose();
      } finally {
        setLoading(false);
      }
    };
    if (sessionId) fetchSummary();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="session-modal-overlay">
        <div className="session-modal-content summary-content" style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
          <span style={{ color: '#fff' }}>جاري التحميل...</span>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="session-modal-overlay" onClick={onClose}>
      <div className="session-modal-content summary-content" onClick={e => e.stopPropagation()}>
        <div className="session-modal-header">
          <h2 className="session-modal-title" style={{ margin: 0 }}>تقرير الوردية #{summary.session?.id}</h2>
          <button onClick={onClose} className="session-modal-close-btn"><i className="fa-solid fa-times"></i></button>
        </div>
        
        <div className="session-summary-list">
          <div className="summary-item">
            <span>العهدة الافتتاحية:</span>
            <strong>{summary.session?.openingCash} ج.م</strong>
          </div>
          <div className="summary-item bg-blue">
            <span>إجمالي المبيعات:</span>
            <strong className="text-blue">{summary.totalSales} ج.م</strong>
          </div>
          <div className="summary-item bg-red">
            <span>إجمالي المرتجعات:</span>
            <strong className="text-red">{summary.totalReturns} ج.م</strong>
          </div>
          <div className="summary-item bg-green">
            <span>إيداعات (كاش إن):</span>
            <strong className="text-green">{summary.totalCashIn} ج.م</strong>
          </div>
          <div className="summary-item bg-orange">
            <span>مسحوبات (كاش أوت):</span>
            <strong className="text-orange">{summary.totalCashOut} ج.م</strong>
          </div>
          <div className="summary-item border-left expected">
            <strong>النقدية المتوقعة بالنظام:</strong>
            <strong>{summary.expectedCash} ج.م</strong>
          </div>
          <div className="summary-item border-left actual">
            <strong>النقدية الفعلية بالدرج:</strong>
            <strong>{summary.session?.closingCash !== null && summary.session?.closingCash !== undefined ? summary.session.closingCash : 'لم تغلق بعد'} ج.م</strong>
          </div>
          
          {(summary.session?.closingCash !== null && summary.session?.closingCash !== undefined) && (
            <div className={`summary-item variance ${summary.variance < 0 ? 'variance-negative' : summary.variance > 0 ? 'variance-positive' : 'variance-neutral'}`}>
              <span>{summary.variance < 0 ? 'عجز' : summary.variance > 0 ? 'زيادة' : 'مطابق'}</span>
              <strong dir="ltr">{summary.variance > 0 ? '+' : ''}{summary.variance} ج.م</strong>
            </div>
          )}
        </div>

        <button onClick={onClose} className="session-btn session-btn-neutral">
          إغلاق
        </button>
      </div>
      <style>{styles}</style>
    </div>
  );
};

const styles = `
  .session-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    direction: rtl;
    font-family: 'Cairo', 'Inter', sans-serif;
  }
  .session-modal-content {
    background: var(--bg-elevated, #1e1e1e);
    border: 1px solid var(--border-subtle, #333);
    border-radius: 16px;
    width: 100%;
    max-width: 420px;
    padding: 30px;
    box-shadow: 0 15px 40px rgba(0,0,0,0.6);
    color: var(--text-white, #fff);
    animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative;
  }
  .summary-content {
    max-width: 500px;
  }
  .session-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    border-bottom: 1px solid var(--border-subtle, #333);
    padding-bottom: 15px;
  }
  .session-modal-close-btn {
    background: none;
    border: none;
    color: var(--text-muted, #888);
    font-size: 1.4rem;
    cursor: pointer;
    transition: color 0.2s;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .session-modal-close-btn:hover {
    color: #ef4444;
  }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-30px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .session-modal-title {
    font-size: 1.5rem;
    font-weight: 800;
    text-align: right;
    color: var(--text-white, #fff);
  }
  
  .session-btn {
    width: 100%;
    padding: 16px;
    border: none;
    border-radius: 10px;
    font-size: 1.15rem;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .session-btn-neutral {
    background: var(--bg-tile, #333);
    color: var(--text-white, #fff);
    border: 1px solid var(--border-subtle, #444);
  }
  .session-btn-neutral:hover {
    background: #444;
  }
  
  /* Summary Report Styles */
  .session-summary-list {
    margin: 20px 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .summary-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: var(--bg-tile, #2a2a2a);
    border-radius: 8px;
    font-size: 1rem;
  }
  .summary-item.bg-blue { background: rgba(59, 130, 246, 0.1); }
  .text-blue { color: #60a5fa; }
  .summary-item.bg-red { background: rgba(239, 68, 68, 0.1); }
  .text-red { color: #f87171; }
  .summary-item.bg-green { background: rgba(16, 185, 129, 0.1); }
  .text-green { color: #34d399; }
  .summary-item.bg-orange { background: rgba(245, 158, 11, 0.1); }
  .text-orange { color: #fbbf24; }
  
  .summary-item.border-left {
    border-right: 4px solid #888;
    background: rgba(255, 255, 255, 0.05);
    font-size: 1.1rem;
  }
  .summary-item.border-left.expected { border-right-color: #888; }
  .summary-item.border-left.actual { border-right-color: var(--metro-blue, #0078D7); }
  
  .summary-item.variance {
    font-size: 1.2rem;
    font-weight: 800;
    padding: 16px;
  }
  .variance-negative { background: rgba(239, 68, 68, 0.2); color: #f87171; }
  .variance-positive { background: rgba(16, 185, 129, 0.2); color: #34d399; }
  .variance-neutral { background: rgba(255, 255, 255, 0.1); color: #fff; }
`;

export default SessionSummaryModal;
