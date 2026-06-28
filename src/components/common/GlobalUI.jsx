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

    const translateMessage = (msg) => {
        if (typeof msg !== 'string') return msg;
        
        const lowerMsg = msg.toLowerCase();
        
        // Dictionary of common backend/network english errors
        const dict = {
            'failed to fetch': 'تعذر الاتصال بالخادم (تأكد من اتصالك بالإنترنت)',
            'network error': 'خطأ في الشبكة',
            'bad credentials': 'بيانات الدخول غير صحيحة',
            'invalid password': 'كلمة المرور غير صحيحة',
            'unauthorized': 'غير مصرح لك (يرجى تسجيل الدخول مجدداً)',
            'access denied': 'ليس لديك صلاحية لهذا الإجراء',
            'forbidden': 'ليس لديك صلاحية',
            'product not found': 'المنتج غير موجود',
            'user not found': 'المستخدم غير موجود',
            'category not found': 'الفئة غير موجودة',
            'not found': 'لم يتم العثور على العنصر',
            'already exists': 'هذا العنصر موجود بالفعل',
            'insufficient stock': 'المخزون غير كافٍ',
            'out of stock': 'نفدت الكمية',
            'expired': 'انتهت الصلاحية',
            'server error': 'حدث خطأ في الخادم',
            'internal server error': 'حدث خطأ داخلي في الخادم',
            'invalid token': 'الجلسة غير صالحة',
            'token': 'الجلسة غير صالحة',
            'invalid': 'بيانات غير صحيحة',
            'required': 'هناك حقول مطلوبة مفقودة',
            'failed to load': 'فشل في تحميل البيانات',
            'timeout': 'انتهى وقت الاتصال',
            'request failed': 'فشل الطلب',
            'duplicate': 'تكرار في البيانات',
            'not allowed': 'غير مسموح',
            'failed': 'حدث خطأ (فشل العملية)',
            'error': 'حدث خطأ'
        };

        if (dict[lowerMsg]) return dict[lowerMsg];

        for (const [eng, ar] of Object.entries(dict)) {
            if (lowerMsg.includes(eng)) {
                return ar; 
            }
        }
        
        // If it contains only english letters and numbers (no Arabic), and we reached here, 
        // we might just return the original or a generic. But returning original is safer for debugging.
        const arabicRegex = /[\u0600-\u06FF]/;
        if (!arabicRegex.test(msg) && lowerMsg.length > 0) {
            // For completely unhandled English strings, just keep it, or fallback.
            // We keep it as is, to not swallow unknown technical errors completely.
        }

        return msg;
    };

    const toast = useCallback((rawMessage, type = 'info', silent = false) => {
        const id = Date.now();
        const message = translateMessage(rawMessage);
        
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
                            <button className="btn btn-danger" style={{ minWidth: '140px', padding: '12px' }} onClick={() => { if (typeof confirm.onConfirm === 'function') confirm.onConfirm(); closeConfirm(); }}>تأكيد الحذف</button>
                            <button className="btn btn-ghost" style={{ minWidth: '80px', padding: '12px' }} onClick={() => { if (typeof confirm.onCancel === 'function') confirm.onCancel(); closeConfirm(); }}>إلغاء</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </GlobalUIContext.Provider>
    );
};
