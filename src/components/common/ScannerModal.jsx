import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import BarcodeScanner from './BarcodeScanner';

const ScannerModal = ({ isOpen, onClose, onScan }) => {
  const [facingMode, setFacingMode] = useState("environment");

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
                onScan(text);
                onClose();
              }}
              onError={(err) => {
                // Ignore common framing errors
              }}
            />

            {/* Overlay helpers */}
            <div className="scanner-overlay">
              <div className="scan-target"></div>
            </div>
          </div>

          <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(0,0,0,0.5)', color: '#fff' }}>
            <p style={{ margin: 0 }}>قم بتوجيه الكاميرا نحو الباركود</p>
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
                    width: 70%;
                    height: 50%;
                    border: 2px solid var(--metro-blue);
                    box-shadow: 0 0 0 1000px rgba(0,0,0,0.5);
                    border-radius: 8px;
                    position: relative;
                }
                .scan-target::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 5%;
                    width: 90%;
                    height: 2px;
                    background: var(--metro-red);
                    box-shadow: 0 0 8px var(--metro-red);
                    animation: scanning 2s infinite ease-in-out;
                }
                @keyframes scanning {
                    0% { top: 10%; }
                    50% { top: 90%; }
                    100% { top: 10%; }
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
