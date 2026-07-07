import React, { useState } from 'react';
import Api from '../../services/api';
import { useGlobalUI } from '../common/GlobalUI';
import { Joyride, STATUS } from 'react-joyride';

const AutoStartBeacon = () => {
    const beaconRef = React.useRef(null);
    React.useEffect(() => {
        if (beaconRef.current && beaconRef.current.parentElement) {
            beaconRef.current.parentElement.click();
        }
    }, []);
    return <span ref={beaconRef} style={{ display: 'none' }} />;
};

const OpenSessionModal = ({ onOpenSuccess }) => {
  const [openingCash, setOpeningCash] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useGlobalUI();

  // Tour State
  const [runTour, setRunTour] = useState(false);

  React.useEffect(() => {
    const onboardingStr = localStorage.getItem('onboardingStatus');
    if (onboardingStr) {
        try {
            const statusObj = JSON.parse(onboardingStr);
            if (statusObj.hasProduct && !statusObj.hasInvoice && !localStorage.getItem('tour_open_session_v3')) {
                setTimeout(() => {
                    setRunTour(true);
                    localStorage.setItem('tour_open_session_v3', 'true');
                }, 500); 
            }
        } catch(e) {}
    }
  }, []);

  const handleJoyrideCallback = (data) => {
      const { status, type } = data;
      const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
      
      if (finishedStatuses.includes(status) || type === 'tour:end') {
          setRunTour(false);
          localStorage.setItem('tour_open_session_v3', 'true');
      }
  };

  const tourSteps = [
      {
          target: '.tour-session-input',
          content: 'قبل البدء في البيع، يجب عليك فتح وردية جديدة. أدخل المبلغ المالي الموجود في الدرج حالياً (العهدة).',
          disableBeacon: true,
          placement: 'bottom',
      },
      {
          target: '.tour-session-btn',
          content: 'بعد إدخال المبلغ، اضغط هنا لفتح الدرج وبدء العمل.',
          placement: 'bottom',
      }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await Api.openSession({ openingCash: openingCash || 0 });
      toast('تم فتح الدرج بنجاح', 'success');
      if (onOpenSuccess) onOpenSuccess();
    } catch (err) {
      toast(err.message || 'حدث خطأ أثناء فتح الدرج', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="session-modal-overlay">
      {runTour && (
        <Joyride
            steps={tourSteps}
            run={runTour}
            beaconComponent={AutoStartBeacon}
            continuous={true}
            showProgress={true}
            showSkipButton={true}
            disableOverlayClose={true}
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    primaryColor: '#6A00FF',
                    backgroundColor: 'var(--bg-card, #ffffff)',
                    textColor: 'var(--text-main, #333333)',
                    arrowColor: 'var(--bg-card, #ffffff)',
                    zIndex: 9999999,
                },
                tooltipContainer: { textAlign: 'right' },
                buttonNext: { outline: 'none', fontFamily: 'Cairo, sans-serif', padding: '6px 16px', borderRadius: '6px' },
                buttonBack: { marginLeft: 15, marginRight: 0, outline: 'none', fontFamily: 'Cairo, sans-serif', color: 'var(--text-muted, #666)' }
            }}
            locale={{ back: 'السابق', close: 'إغلاق', last: 'إنهاء', next: 'التالي', skip: 'تخطي' }}
        />
      )}
      <div className="session-modal-content">
        <h2 className="session-modal-title">فتح الوردية (الدرج)</h2>
        <p className="session-modal-desc">
          يرجى إدخال مبلغ العهدة الافتتاحية الموجودة في الدرج الآن لبدء البيع.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="session-form-group">
            <label>النقدية الافتتاحية (العهدة)</label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                className="session-input tour-session-input"
                placeholder="0.00"
                style={{ paddingLeft: '40px' }}
                autoFocus
              />
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted, #888)' }}>ج.م</span>
            </div>
          </div>
          
          <button type="submit" disabled={loading} className="session-btn session-btn-primary tour-session-btn">
            {loading ? 'جاري الفتح...' : 'فتح الدرج وبدء العمل'}
          </button>
        </form>
      </div>

      <style>{`
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
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .session-modal-title {
          font-size: 1.6rem;
          font-weight: 800;
          margin-top: 0;
          margin-bottom: 10px;
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
          padding: 14px 16px;
          border-radius: 10px;
          background: var(--bg-input, #2d2d2d);
          border: 1px solid var(--border-input, #444);
          color: var(--text-main);
          font-size: 1.2rem;
          font-weight: 700;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        .session-input:focus {
          outline: none;
          background: var(--bg-tile, #222);
          border-color: var(--metro-blue, #0078D7);
          box-shadow: 0 0 0 3px rgba(0, 120, 215, 0.2);
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
          gap: 8px;
        }
        .session-btn-primary {
          background: linear-gradient(135deg, var(--metro-blue, #0078D7) 0%, #005a9e 100%);
          color: #fff;
          box-shadow: 0 4px 15px rgba(0, 120, 215, 0.3);
        }
        .session-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 120, 215, 0.4);
        }
        .session-btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }
        .session-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default OpenSessionModal;
