import React, { useState, useEffect, useRef } from 'react';
import { useNotifications } from '../../services/useNotifications';
import Api from '../../services/api';
import ChatService from '../../services/ChatService';
import msgIcon from '../../assets/img/msg.png';

const AlwaysOnDisplay = () => {
    const [time, setTime] = useState(new Date());
    const { unreadCount } = useNotifications();
    const [unreadMessages, setUnreadMessages] = useState(0);
    const user = Api._getUser();

    // Lock screen states
    const [pin, setPin] = useState('');
    const [showKeypad, setShowKeypad] = useState(false);
    const [error, setError] = useState(false);
    const savedPinValue = localStorage.getItem('pos_idle_pin');
    const hasPin = !!savedPinValue;
    const pinLength = savedPinValue ? savedPinValue.length : 4;
    const keypadRef = useRef(null);

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);

        // Initial fetch
        ChatService.getTotalUnreadCount().then(setUnreadMessages).catch(() => {});

        // Listen for real-time updates
        const unsub = ChatService.onCountUpdate(() => {
            ChatService.getTotalUnreadCount().then(setUnreadMessages).catch(() => {});
        });

        return () => {
            clearInterval(timer);
            unsub();
        };
    }, []);

    // Listen to keyboard inputs when keypad is shown
    useEffect(() => {
        if (!showKeypad || !hasPin) return;

        const handleKeyboardInput = (e) => {
            if (e.key >= '0' && e.key <= '9') {
                handleNumberPress(e.key);
            } else if (e.key === 'Backspace') {
                handleDelete();
            } else if (e.key === 'Enter') {
                handleUnlock();
            } else if (e.key === 'Escape') {
                setShowKeypad(false);
                setPin('');
                setError(false);
            }
        };

        window.addEventListener('keydown', handleKeyboardInput);
        return () => window.removeEventListener('keydown', handleKeyboardInput);
    }, [showKeypad, pin]);

    const formatTime = (date) => {
        return date.toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('ar-EG', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const handleNumberPress = (num) => {
        if (pin.length < pinLength) {
            const newPin = pin + num;
            setPin(newPin);
            setError(false);
            // Auto-submit when PIN is complete
            if (newPin.length === pinLength) {
                setTimeout(() => {
                    const savedPin = localStorage.getItem('pos_idle_pin');
                    if (newPin === savedPin) {
                        localStorage.setItem('pos_idle_state', 'false');
                    } else {
                        setError(true);
                        setPin('');
                        if (keypadRef.current) {
                            keypadRef.current.classList.add('shake-error');
                            setTimeout(() => {
                                if (keypadRef.current) keypadRef.current.classList.remove('shake-error');
                            }, 500);
                        }
                    }
                }, 150);
            }
        }
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
        setError(false);
    };

    const handleUnlock = () => {
        const savedPin = localStorage.getItem('pos_idle_pin');
        if (pin === savedPin) {
            // Unlock all tabs by setting localStorage pos_idle_state to false
            localStorage.setItem('pos_idle_state', 'false');
        } else {
            setError(true);
            setPin('');
            // Shake effect trigger
            if (keypadRef.current) {
                keypadRef.current.classList.add('shake-error');
                setTimeout(() => {
                    if (keypadRef.current) keypadRef.current.classList.remove('shake-error');
                }, 500);
            }
        }
    };

    const handleScreenClick = () => {
        if (hasPin && !showKeypad) {
            setShowKeypad(true);
        }
    };

    return (
        <div className="aod-overlay" onClick={handleScreenClick} style={{ cursor: hasPin && !showKeypad ? 'pointer' : 'default' }}>
            {!showKeypad ? (
                <div className="aod-content">
                    <div className="aod-clock">
                        {formatTime(time)}
                    </div>
                    <div className="aod-date">
                        {formatDate(time)}
                    </div>

                    {user && (
                        <div className="aod-user">
                            مرحباً بك، {user.name || user.firstName || 'المستخدم'}
                        </div>
                    )}

                    {(unreadCount > 0 || unreadMessages > 0) && (
                        <div className="aod-notifications">
                            {unreadCount > 0 && (
                                <div className="aod-notif-item">
                                    <span className="aod-notif-icon"><i className="fa-solid fa-bell"></i></span>
                                    <span className="aod-notif-badge">{unreadCount}</span>
                                </div>
                            )}
                            {unreadMessages > 0 && (
                                <div className="aod-notif-item">
                                    <img src={msgIcon} alt="" className="aod-msg-icon" />
                                    <span className="aod-notif-badge">{unreadMessages}</span>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {hasPin && (
                        <div className="aod-lock-hint" style={{ marginTop: '20px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', animation: 'pulse 2s infinite' }}>
                            <i className="fa-solid fa-lock"></i> الشاشة مؤمنة. انقر أو اضغط أي مفتاح لإدخال رمز PIN
                        </div>
                    )}
                </div>
            ) : (
                <div className="aod-keypad-container" onClick={(e) => e.stopPropagation()}>
                    <div className="aod-keypad-card" ref={keypadRef}>
                        <div className="aod-keypad-header">
                            <span className="aod-lock-icon"><i className="fa-solid fa-lock"></i></span>
                            <h3>أدخل رمز PIN لإلغاء القفل</h3>
                            <p>الشاشة مقفلة لتأمين جلستك النشطة</p>
                        </div>
                        
                        {/* PIN Dots Display */}
                        <div className="aod-pin-dots">
                            {[...Array(pinLength)].map((_, i) => (
                                <span 
                                    key={i} 
                                    className={`pin-dot ${i < pin.length ? 'filled' : ''} ${error ? 'error' : ''}`}
                                ></span>
                            ))}
                        </div>

                        {error && (
                            <div className="aod-pin-error">رمز PIN غير صحيح، حاول مجدداً</div>
                        )}

                        {/* Numeric Grid */}
                        <div className="aod-grid">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                <button 
                                    key={num} 
                                    onClick={() => handleNumberPress(num.toString())}
                                    className="aod-key-btn"
                                >
                                    {num}
                                </button>
                            ))}
                            <button 
                                onClick={() => { setShowKeypad(false); setPin(''); setError(false); }}
                                className="aod-key-btn text-btn"
                                style={{ fontSize: '0.85rem', color: '#94a3b8' }}
                            >
                                إلغاء
                            </button>
                            <button 
                                onClick={() => handleNumberPress('0')}
                                className="aod-key-btn"
                            >
                                0
                            </button>
                            <button 
                                onClick={handleDelete}
                                className="aod-key-btn text-btn"
                                style={{ fontSize: '1.1rem', color: '#f43f5e' }}
                            >
                                ⌫
                            </button>
                        </div>

                        <button 
                            className="btn btn-primary" 
                            onClick={handleUnlock}
                            style={{ width: '100%', marginTop: '20px', padding: '12px', fontSize: '1rem' }}
                            disabled={pin.length === 0}
                        >
                            إلغاء القفل
                        </button>
                    </div>
                </div>
            )}
            
            {/* Ambient Background Elements */}
            <div className="aod-glow"></div>
            <div className="aod-particles"></div>

            <style>{`
                .aod-keypad-container {
                    z-index: 10;
                    width: 100%;
                    max-width: 360px;
                    padding: 20px;
                    animation: slideUp 0.3s ease-out;
                }
                .aod-keypad-card {
                    background: rgba(20, 20, 25, 0.85);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 20px;
                    padding: 30px 24px;
                    box-shadow: 0 30px 60px rgba(0,0,0,0.6);
                    text-align: center;
                    color: #fff;
                    font-family: 'Cairo', sans-serif;
                    direction: rtl;
                }
                .aod-keypad-header .aod-lock-icon {
                    font-size: 2rem;
                    display: block;
                    margin-bottom: 12px;
                }
                .aod-keypad-header h3 {
                    margin: 0 0 6px 0;
                    font-size: 1.25rem;
                    font-weight: 700;
                }
                .aod-keypad-header p {
                    margin: 0 0 24px 0;
                    font-size: 0.85rem;
                    color: #94a3b8;
                }
                .aod-pin-dots {
                    display: flex;
                    justify-content: center;
                    gap: 16px;
                    margin-bottom: 16px;
                }
                .pin-dot {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    border: 2px solid rgba(255, 255, 255, 0.2);
                    transition: all 0.15s ease;
                }
                .pin-dot.filled {
                    background: #fff;
                    border-color: #fff;
                    transform: scale(1.15);
                    box-shadow: 0 0 10px rgba(255,255,255,0.5);
                }
                .pin-dot.error {
                    background: #f43f5e !important;
                    border-color: #f43f5e !important;
                }
                .aod-pin-error {
                    color: #f43f5e;
                    font-size: 0.85rem;
                    margin-bottom: 20px;
                    font-weight: 600;
                }
                .aod-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                }
                .aod-key-btn {
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 50%;
                    aspect-ratio: 1;
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: #fff;
                    cursor: pointer;
                    transition: all 0.1s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: inherit;
                }
                .aod-key-btn:hover {
                    background: rgba(255, 255, 255, 0.1);
                    transform: scale(1.05);
                }
                .aod-key-btn:active {
                    background: rgba(255, 255, 255, 0.2);
                    transform: scale(0.95);
                }
                .aod-key-btn.text-btn {
                    border-radius: 12px;
                    aspect-ratio: auto;
                    font-weight: 600;
                }
                .shake-error {
                    animation: shake 0.4s ease-in-out;
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20%, 60% { transform: translateX(-8px); }
                    40%, 80% { transform: translateX(8px); }
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default AlwaysOnDisplay;
