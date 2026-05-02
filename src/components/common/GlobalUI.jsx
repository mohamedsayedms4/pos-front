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
                <div className="cat-modal-overlay" style={{ zIndex: 999999 }} onClick={(e) => { if (e.target.classList.contains('cat-modal-overlay')) closeConfirm(); }}>
                    <div className="cat-modal" style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <div className="cat-modal-body" style={{ padding: '40px 32px' }}>
                            <div style={{ 
                                width: '80px', 
                                height: '80px', 
                                background: 'rgba(239, 68, 68, 0.1)', 
                                borderRadius: '50%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                margin: '0 auto 24px',
                                border: '1px solid rgba(239, 68, 68, 0.2)'
                            }}>
                                <i className="fas fa-exclamation-triangle" style={{ fontSize: '2rem', color: '#ef4444' }}></i>
                            </div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '12px', color: 'var(--cat-text-primary)' }}>هل أنت متأكد؟</h2>
                            <p style={{ color: 'var(--cat-text-secondary)', fontSize: '1rem', lineHeight: '1.6', marginBottom: '32px' }}>
                                {confirm.message}
                            </p>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                <button className="cat-btn-primary" style={{ background: '#ef4444', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)', padding: '12px 24px' }} onClick={() => { confirm.onConfirm(); closeConfirm(); }}>
                                    تأكيد الحذف
                                </button>
                                <button className="cat-btn-ghost" style={{ padding: '12px 24px' }} onClick={() => { if (confirm.onCancel) confirm.onCancel(); closeConfirm(); }}>
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </GlobalUIContext.Provider>
    );
};
