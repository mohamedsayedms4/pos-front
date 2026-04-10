import React, { createContext, useContext, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import notifyAudio from '../../assets/sound/notifiy.wav';
import beepAudio from '../../assets/sound/freesound_community-store-scanner-beep-90395.mp3';

const GlobalUIContext = createContext(null);

export const useGlobalUI = () => {
    const context = useContext(GlobalUIContext);
    if (!context) throw new Error('useGlobalUI must be used within GlobalUIProvider');
    return context;
};

export const GlobalUIProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const [confirm, setConfirm] = useState(null);

    const playSound = useCallback((type = 'beep') => {
        try {
            const audioSrc = type === 'beep' ? beepAudio : notifyAudio;
            const audio = new Audio(audioSrc);
            audio.volume = 1.0; // Max volume for better feedback
            audio.play().catch(e => console.warn("Auto-play blocked or audio failed:", e));
        } catch (e) {
            console.warn("Audio playback failed", e);
        }
    }, []);

    const toast = useCallback((message, type = 'info', silent = false) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        if (!silent) {
            playSound('notification');
        }
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, [playSound]);

    const showConfirm = useCallback((message, onConfirm, onCancel) => {
        setConfirm({ message, onConfirm, onCancel });
    }, []);

    const closeConfirm = () => setConfirm(null);

    return (
        <GlobalUIContext.Provider value={{ toast, confirm: showConfirm, playSound }}>
            {children}

            {/* Global Toasts */}
            {ReactDOM.createPortal(
                <div className="toast-container">
                    {toasts.map(t => (
                        <div key={t.id} className={`toast ${t.type}`}>
                            <span className="toast-icon">
                                {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : t.type === 'warning' ? '⚠' : 'ℹ'}
                            </span>
                            <span className="toast-msg">{t.message}</span>
                            <button className="toast-close" onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}>✕</button>
                        </div>
                    ))}
                </div>,
                document.body
            )}

            {/* Global Confirm Modal */}
            {confirm && ReactDOM.createPortal(
                <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeConfirm(); }}>
                    <div className="modal confirm-dialog" style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h3>تأكيد</h3>
                            <button className="modal-close" onClick={closeConfirm}>✕</button>
                        </div>
                        <div className="modal-body" style={{ padding: '30px 24px' }}>
                            <div className="confirm-icon" style={{ borderRadius: '0', clipPath: 'none' }}>
                                <span style={{ color: '#ffeb3b', fontSize: '1.5rem' }}>⚠</span>
                            </div>
                            <h2 style={{ textAlign: 'center', marginBottom: '12px', fontSize: '1.75rem', fontWeight: '300' }}>هل أنت متأكد؟</h2>
                            <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.95rem' }}>{confirm.message}</p>
                        </div>
                        <div className="modal-footer" style={{ justifyContent: 'center', gap: '15px', borderTop: 'none', paddingBottom: '30px' }}>
                            <button className="btn btn-danger" style={{ minWidth: '140px', padding: '12px' }} onClick={() => { confirm.onConfirm(); closeConfirm(); }}>تأكيد الحذف</button>
                            <button className="btn btn-ghost" style={{ minWidth: '80px', padding: '12px' }} onClick={() => { if (confirm.onCancel) confirm.onCancel(); closeConfirm(); }}>إلغاء</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </GlobalUIContext.Provider>
    );
};
