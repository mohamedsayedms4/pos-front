import React, { useState } from 'react';
import Api from '../../services/api';
import { useGlobalUI } from '../common/GlobalUI';

const CloseSessionModal = ({ onCloseSuccess, onCancel }) => {
  const [closingCash, setClosingCash] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const { toast } = useGlobalUI();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await Api.closeSession({ closingCash: closingCash || 0, notes });
      setSummary(res);
      toast('تم إغلاق الدرج بنجاح', 'success');
    } catch (err) {
      toast(err.message || 'حدث خطأ أثناء الإغلاق', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    if (onCloseSuccess) onCloseSuccess();
  };

  if (summary) {
    return (
      <div className="session-modal-overlay">
        <div className="session-modal-content summary-content">
          <h2 className="session-modal-title" style={{ borderBottom: '1px solid var(--border-subtle, #333)', paddingBottom: '15px' }}>تقرير نهاية الوردية</h2>
          
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
              <strong>{summary.session?.closingCash} ج.م</strong>
            </div>
            
            <div className={`summary-item variance ${summary.variance < 0 ? 'variance-negative' : summary.variance > 0 ? 'variance-positive' : 'variance-neutral'}`}>
              <span>{summary.variance < 0 ? 'عجز' : summary.variance > 0 ? 'زيادة' : 'مطابق'}</span>
              <strong dir="ltr">{summary.variance > 0 ? '+' : ''}{summary.variance} ج.م</strong>
            </div>
          </div>

          <button onClick={handleFinish} className="session-btn session-btn-neutral">
            إنهاء
          </button>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="session-modal-overlay">
      <div className="session-modal-content">
        <div className="session-modal-header">
          <h2 className="session-modal-title" style={{ margin: 0 }}>إغلاق الوردية</h2>
          <button onClick={onCancel} className="session-modal-close-btn">✕</button>
        </div>
        
        <p className="session-modal-desc" style={{ marginTop: '10px' }}>
          يرجى جرد الدرج وإدخال النقدية الفعلية الموجودة حالياً لإغلاق الشفت واستخراج التقرير.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="session-form-group">
            <label>النقدية الفعلية بالدرج</label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
                className="session-input focus-danger"
                placeholder="0.00"
                style={{ paddingLeft: '40px' }}
                autoFocus
              />
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted, #888)' }}>ج.م</span>
            </div>
          </div>

          <div className="session-form-group">
            <label>ملاحظات (اختياري)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="session-input focus-danger"
              rows="3"
              placeholder="اكتب أي ملاحظات بخصوص العجز أو الزيادة..."
              style={{ padding: '12px', fontSize: '1rem', fontWeight: 'normal' }}
            ></textarea>
          </div>
          
          <button type="submit" disabled={loading} className="session-btn session-btn-danger">
            {loading ? 'جاري الإغلاق...' : 'إغلاق الدرج'}
          </button>
        </form>
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
    color: var(--text-main);
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
    font-size: 1.6rem;
    font-weight: 800;
    text-align: center;
    color: var(--text-main);
  }
  .session-modal-desc {
    color: var(--text-secondary, #666);
    text-align: center;
    margin-bottom: 24px;
    font-size: 0.95rem;
    line-height: 1.5;
  }
  .session-form-group {
    margin-bottom: 20px;
  }
  .session-form-group label {
    display: block;
    margin-bottom: 8px;
    color: var(--text-main);
    font-size: 0.95rem;
    font-weight: 600;
  }
  .session-input {
    width: 100%;
    border-radius: 10px;
    background: var(--bg-input, #2d2d2d);
    border: 1px solid var(--border-input, #444);
    color: var(--text-main);
    font-size: 1.2rem;
    font-weight: 700;
    transition: all 0.2s;
    box-sizing: border-box;
    padding: 14px 16px;
  }
  .session-input:focus {
    outline: none;
    background: var(--bg-tile, #222);
  }
  .focus-danger:focus {
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
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
  .session-btn-danger {
    background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
    color: #fff;
    box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
  }
  .session-btn-danger:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
  }
  .session-btn-neutral {
    background: var(--bg-tile, #333);
    color: var(--text-main);
    border: 1px solid var(--border-subtle, #444);
  }
  .session-btn-neutral:hover {
    background: #444;
  }
  .session-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
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
  .variance-neutral { background: rgba(255, 255, 255, 0.1); color: var(--text-main); }
`;

export default CloseSessionModal;
