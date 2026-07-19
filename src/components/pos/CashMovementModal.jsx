import React, { useState } from 'react';
import Api from '../../services/api';
import { useGlobalUI } from '../common/GlobalUI';

const CashMovementModal = ({ onClose }) => {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('OUT'); // OUT = Payout (مسحوبات), IN = Drop (إيداع)
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useGlobalUI();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await Api.addCashMovement({ amount, type, description });
      toast('تم تسجيل الحركة النقدية بنجاح', 'success');
      onClose();
    } catch (err) {
      toast(err.message || 'حدث خطأ أثناء تسجيل الحركة', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="session-modal-overlay">
      <div className="session-modal-content">
        <div className="session-modal-header">
          <h2 className="session-modal-title" style={{ margin: 0 }}>إضافة حركة نقدية</h2>
          <button onClick={onClose} className="session-modal-close-btn"><i className="fa-solid fa-times"></i></button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
          <div className="session-form-group">
            <label>نوع الحركة</label>
            <div className="movement-type-group">
              <label className={`movement-type-btn ${type === 'OUT' ? 'active-out' : ''}`}>
                <input type="radio" name="movementType" checked={type === 'OUT'} onChange={() => setType('OUT')} style={{ display: 'none' }} />
                <span>سحب (كاش أوت)</span>
              </label>
              <label className={`movement-type-btn ${type === 'IN' ? 'active-in' : ''}`}>
                <input type="radio" name="movementType" checked={type === 'IN'} onChange={() => setType('IN')} style={{ display: 'none' }} />
                <span>إيداع (كاش إن)</span>
              </label>
            </div>
          </div>

          <div className="session-form-group">
            <label>المبلغ</label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`session-input ${type === 'OUT' ? 'focus-orange' : 'focus-green'}`}
                placeholder="0.00"
                style={{ paddingLeft: '40px' }}
                autoFocus
              />
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted, #888)' }}>ج.م</span>
            </div>
          </div>

          <div className="session-form-group">
            <label>السبب أو البيان</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`session-input ${type === 'OUT' ? 'focus-orange' : 'focus-green'}`}
              placeholder="مثال: دفع حساب دليفري، مصروفات نثرية..."
              style={{ fontSize: '1rem', fontWeight: 'normal' }}
            />
          </div>
          
          <button type="submit" disabled={loading} className={`session-btn ${type === 'OUT' ? 'btn-orange' : 'btn-green'}`}>
            {loading ? 'جاري الحفظ...' : 'حفظ الحركة'}
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
    color: var(--text-white, #fff);
    animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative;
  }
  .session-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
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
    font-size: 1.4rem;
    font-weight: 800;
    color: var(--text-white, #fff);
  }
  .session-form-group {
    margin-bottom: 20px;
  }
  .session-form-group label {
    display: block;
    margin-bottom: 8px;
    color: var(--text-light, #ddd);
    font-size: 0.95rem;
    font-weight: 600;
  }
  .movement-type-group {
    display: flex;
    gap: 12px;
  }
  .movement-type-btn {
    flex: 1;
    text-align: center;
    padding: 12px;
    border: 1px solid var(--border-input, #444);
    border-radius: 10px;
    cursor: pointer;
    font-weight: 700;
    color: var(--text-muted, #888);
    background: var(--bg-input, #2d2d2d);
    transition: all 0.2s;
  }
  .movement-type-btn.active-out {
    background: rgba(245, 158, 11, 0.15);
    border-color: #f59e0b;
    color: #fbbf24;
  }
  .movement-type-btn.active-in {
    background: rgba(16, 185, 129, 0.15);
    border-color: #10b981;
    color: #34d399;
  }
  .session-input {
    width: 100%;
    border-radius: 10px;
    background: var(--bg-input, #2d2d2d);
    border: 1px solid var(--border-input, #444);
    color: #fff;
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
  .focus-orange:focus {
    border-color: #f59e0b;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
  }
  .focus-green:focus {
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
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
    color: #fff;
  }
  .btn-orange {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
  }
  .btn-orange:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
  }
  .btn-green {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
  }
  .btn-green:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
  }
  .session-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

export default CashMovementModal;
