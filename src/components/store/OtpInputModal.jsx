import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { SERVER_URL } from '../../services/api';

const OtpInputModal = ({ phone, onVerify, onCancel }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastChannel, setLastChannel] = useState('whatsapp');
  const [step, setStep] = useState('choose_channel'); // 'choose_channel' or 'enter_otp'
  const inputRefs = useRef([]);
  // No auto-send on mount
  useEffect(() => {
    // Just cleanup if needed
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const sendOtp = async (channel = 'whatsapp') => {
    try {
      setError('');
      setCanResend(false);
      setTimeLeft(300);
      setOtp(['', '', '', '', '', '']);
      setLastChannel(channel);
      setLoading(true);

      await axios.post(`${SERVER_URL}/api/public/otp/send`, { phone, channel });
      
      setStep('enter_otp');
      // Focus first input
      setTimeout(() => {
        if (inputRefs.current[0]) inputRefs.current[0].focus();
      }, 100);
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ في إرسال الكود');
      setCanResend(true);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return;
    
    // Take only the last character if user types fast
    const val = value.slice(-1);
    
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);
    setError('');

    // Auto-advance to next input
    if (val && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Move back on backspace if current is empty
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
    // Auto submit on enter if filled
    if (e.key === 'Enter' && otp.every(d => d !== '')) {
      handleVerify();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    
    if (pastedData) {
      const newOtp = [...otp];
      for (let i = 0; i < pastedData.length; i++) {
        newOtp[i] = pastedData[i];
      }
      setOtp(newOtp);
      
      // Focus the right input
      const nextFocus = Math.min(pastedData.length, 5);
      inputRefs.current[nextFocus].focus();
      
      // Auto verify if exactly 6 digits pasted
      if (pastedData.length === 6) {
        // Use timeout to let state update first
        setTimeout(() => handleVerify(pastedData), 10);
      }
    }
  };

  const handleVerify = async (otpString = null) => {
    const code = otpString || otp.join('');
    if (code.length !== 6) {
      setError('الرجاء إدخال الكود المكون من 6 أرقام');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${SERVER_URL}/api/public/otp/verify`, {
        phone,
        otp: code
      });
      
      if (response.data?.success && response.data?.data?.verificationToken) {
        onVerify(response.data.data.verificationToken);
      } else {
        setError('كود التحقق غير صحيح');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء التحقق من الكود');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="otp-modal-overlay">
      <div className="otp-modal-content">
        <button className="otp-close-btn" onClick={onCancel}>×</button>
        
        {step === 'choose_channel' ? (
          <div className="channel-selection">
            <div className="otp-header">
              <h3>كيف تود استلام كود التحقق؟</h3>
              <p>اختر الطريقة الأنسب لك لاستلام الكود المكون من 6 أرقام على الرقم <strong dir="ltr">{phone}</strong></p>
            </div>
            {error && <div className="otp-error-banner">{error}</div>}
            
            <div className="channel-buttons">
              <button 
                className="btn-channel whatsapp" 
                onClick={() => sendOtp('whatsapp')}
                disabled={loading}
              >
                <i className="fab fa-whatsapp"></i>
                إرسال عبر واتساب (أسرع)
              </button>
              <button 
                className="btn-channel sms" 
                onClick={() => sendOtp('sms')}
                disabled={loading}
              >
                <i className="fas fa-sms"></i>
                إرسال عبر رسالة نصية (SMS)
              </button>
            </div>
          </div>
        ) : (
          <div className="otp-entry">
            <div className="otp-header">
          <h3>تأكيد رقم الجوال</h3>
          <p>
            قمنا بإرسال رسالة {lastChannel === 'whatsapp' ? 'واتساب' : 'نصية (SMS)'} تحتوي على كود التحقق إلى الرقم:
            <br />
            <strong dir="ltr" style={{ display: 'inline-block', marginTop: '5px' }}>{phone}</strong>
          </p>
        </div>

        {error && <div className="otp-error-banner">{error}</div>}

        <div className="otp-inputs-container" dir="ltr" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={el => inputRefs.current[i] = el}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength="1"
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              disabled={loading}
              className={`otp-digit-input ${digit ? 'filled' : ''} ${error ? 'error' : ''}`}
              autoComplete="one-time-code"
            />
          ))}
        </div>

        <button 
          className="btn-register" 
          onClick={() => handleVerify()} 
          disabled={loading || otp.join('').length !== 6}
          style={{ marginTop: '20px' }}
        >
          {loading ? 'جاري التحقق...' : 'تحقق الآن'}
        </button>

        <div className="otp-footer">
          {canResend ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="otp-resend-btn" onClick={() => sendOtp('whatsapp')} disabled={loading}>
                إعادة إرسال عبر الواتساب
              </button>
              <button className="otp-resend-btn alt-resend-btn" onClick={() => sendOtp('sms')} disabled={loading}>
                إرسال عبر رسالة نصية (SMS)
              </button>
            </div>
          ) : (
            <p className="otp-timer">
              يمكنك إعادة الإرسال بعد <span>{formatTime(timeLeft)}</span>
            </p>
          )}
        </div>
        </div>
        )}
      </div>

      <style>{`
        .otp-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fadeIn 0.3s ease;
        }

        .otp-modal-content {
          background: var(--bg-dark);
          width: 100%;
          max-width: 420px;
          padding: 30px;
          border-radius: 12px;
          border: 1px solid var(--border-subtle);
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          position: relative;
          animation: slideUp 0.3s cubic-bezier(0.1, 0.8, 0.2, 1);
        }

        .otp-close-btn {
          position: absolute;
          top: 15px;
          right: 15px;
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 24px;
          cursor: pointer;
          transition: color 0.2s;
        }
        .otp-close-btn:hover { color: var(--text-white); }

        .otp-header {
          text-align: center;
          margin-bottom: 25px;
        }
        .otp-header h3 {
          font-size: 1.4rem;
          margin-bottom: 10px;
          color: var(--text-white);
        }
        .otp-header p {
          color: var(--text-muted);
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .otp-inputs-container {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-bottom: 15px;
        }

        .otp-digit-input {
          width: 45px;
          height: 55px;
          background: var(--bg-input);
          border: 1px solid var(--border-input);
          border-radius: 8px;
          color: var(--text-white);
          font-size: 1.5rem;
          text-align: center;
          font-weight: 600;
          transition: all 0.2s;
        }
        .otp-digit-input:focus {
          border-color: var(--metro-blue);
          box-shadow: 0 0 0 3px rgba(0, 120, 215, 0.2);
          outline: none;
        }
        .otp-digit-input.filled {
          border-color: rgba(255, 255, 255, 0.2);
        }
        .otp-digit-input.error {
          border-color: #ef4444;
          background: rgba(239, 68, 68, 0.05);
        }

        .otp-error-banner {
          background: rgba(239, 68, 68, 0.15);
          color: #fca5a5;
          padding: 10px;
          border-radius: 6px;
          text-align: center;
          margin-bottom: 20px;
          font-size: 0.85rem;
          animation: fadeIn 0.2s;
        }

        .otp-footer {
          margin-top: 20px;
          text-align: center;
        }
        .otp-timer {
          color: var(--text-muted);
          font-size: 0.9rem;
        }
        .otp-timer span {
          color: var(--text-white);
          font-weight: bold;
          display: inline-block;
          min-width: 40px;
          direction: ltr;
        }

        .otp-resend-btn {
          background: none;
          border: none;
          color: var(--metro-blue);
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          text-decoration: underline;
        }
        
        .channel-selection {
          text-align: center;
          padding: 10px 0;
        }
        
        .channel-buttons {
          display: flex;
          flex-direction: column;
          gap: 15px;
          margin-top: 20px;
        }
        
        .btn-channel {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 14px;
          border-radius: 8px;
          border: none;
          font-size: 1.05rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          color: #fff;
        }
        
        .btn-channel.whatsapp {
          background: #25D366;
        }
        .btn-channel.whatsapp:hover {
          background: #20bd5a;
        }
        
        .btn-channel.sms {
          background: var(--metro-blue);
        }
        .btn-channel.sms:hover {
          background: #006abc;
        }
        
        .btn-channel:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .alt-resend-btn {
          color: var(--text-muted);
          font-size: 0.85rem;
        }
        .alt-resend-btn:hover {
          color: var(--text-white);
        }
        .otp-resend-btn:disabled {
          color: var(--text-muted);
          cursor: not-allowed;
          text-decoration: none;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default OtpInputModal;
