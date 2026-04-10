import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import BarcodeScanner from './BarcodeScanner';

const ScannerModal = ({ isOpen, onClose, onScan }) => {
  const [facingMode, setFacingMode] = useState("environment");
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="modal-overlay active" style={{ zIndex: 999999 }}>
      <div className="modal scanner-modal" style={{ maxWidth: '500px', width: '90%' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.5rem' }}>📷</span>
            <h2 style={{ margin: 0 }}>ماسح الباركود</h2>
          </div>
          <button onClick={onClose} className="btn-close">✕</button>
        </div>

        <div className="modal-body" style={{ padding: '0', position: 'relative' }}>
          <div className="scanner-container">
            <BarcodeScanner
              facingMode={facingMode}
              onResult={(text) => {
                setErrorMsg(null);
                onScan(text);
                onClose();
              }}
              onError={(err) => {
                // Show error message briefly then auto-hide
                const msg = err?.message || 'خطأ في المسح';
                setErrorMsg(msg);
                setTimeout(() => setErrorMsg(null), 3000);
              }}
            />

            {/* Overlay helpers */}
            <div className="scanner-overlay">
              <div className="scan-target"></div>
            </div>
          </div>

          {/* Error toast */}
          {errorMsg && (
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(255, 60, 60, 0.9)',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              zIndex: 20,
              textAlign: 'center',
              maxWidth: '90%',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
              animation: 'fadeInDown 0.3s ease'
            }}>
              {errorMsg}
            </div>
          )}

          <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(0,0,0,0.5)', color: '#fff' }}>
            <p style={{ margin: '0 0 4px 0' }}>قم بتوجيه الكاميرا نحو الباركود</p>
            <p style={{ margin: 0, fontSize: '12px', opacity: 0.7 }}>أو اضغط "التقاط وتحليل" لإرسال الصورة للسيرفر</p>
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setFacingMode(prev => prev === "environment" ? "user" : "environment")}
          >
            <span>🔄 تبديل الكاميرا</span>
          </button>
          <button className="btn btn-danger" onClick={onClose}>إلغاء</button>
        </div>
      </div>

      <style>{`
                .scanner-container {
                    position: relative;
                    width: 100%;
                    overflow: hidden;
                    background: #000;
                    aspect-ratio: 1/1;
                }
                .scanner-overlay {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    pointer-events: none;
                }
                .scan-target {
                    width: 75%;
                    height: 40%;
                    border: 2px solid #00ff00;
                    box-shadow: 0 0 15px rgba(0, 255, 0, 0.3), 0 0 0 1000px rgba(0,0,0,0.6);
                    border-radius: 12px;
                    position: relative;
                }
                .scan-target::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 2%;
                    width: 96%;
                    height: 3px;
                    background: #ff0000;
                    box-shadow: 0 0 10px #ff0000, 0 0 20px #ff0000;
                    animation: scanning 1.5s infinite linear;
                    border-radius: 5px;
                }
                @keyframes scanning {
                    0% { top: 5%; opacity: 0.8; }
                    50% { top: 95%; opacity: 1; }
                    100% { top: 5%; opacity: 0.8; }
                }
                @keyframes fadeInDown {
                    from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
                    to { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
                .scanner-modal {
                    border: 1px solid rgba(255,255,255,0.1);
                    backdrop-filter: blur(10px);
                    background: rgba(20, 20, 20, 0.95);
                    overflow: hidden;
                }
            `}</style>
    </div>,
    document.body
  );
};

export default ScannerModal;
