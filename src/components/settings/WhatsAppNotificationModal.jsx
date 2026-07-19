import React, { useState, useEffect } from 'react';
import Api from '../../services/api';
import { useGlobalUI } from '../common/GlobalUI';
import { Link } from 'react-router-dom';
import '../../styles/components/WhatsAppNotificationModal.css';

const WhatsAppNotificationModal = ({ onClose }) => {
    const { toast } = useGlobalUI();
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [status, setStatus] = useState({ isEnabled: false, hasNumber: false, whatsappNumber: null });
    const [newNumber, setNewNumber] = useState('');

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const data = await Api._request('/whatsapp-notifications/status');
            setStatus(data);
        } catch (e) {
            console.error('Failed to fetch whatsapp status', e);
        } finally {
            setLoading(false);
        }
    };

    const handleEnable = async () => {
        setActionLoading(true);
        try {
            const data = await Api._request('/whatsapp-notifications/enable', { method: 'POST' });
            if (data.success) {
                toast(data.message, 'success');
                setStatus(prev => ({ ...prev, isEnabled: true }));
            }
        } catch (e) {
            toast(e.message || 'حدث خطأ أثناء التفعيل', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDisable = async () => {
        setActionLoading(true);
        try {
            const data = await Api._request('/whatsapp-notifications/disable', { method: 'POST' });
            if (data.success) {
                toast(data.message, 'success');
                setStatus(prev => ({ ...prev, isEnabled: false }));
            }
        } catch (e) {
            toast('حدث خطأ أثناء الإلغاء', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleTest = async () => {
        setActionLoading(true);
        try {
            const data = await Api._request('/whatsapp-notifications/test', { method: 'POST' });
            if (data.success) {
                toast(data.message, 'success');
            }
        } catch (e) {
            toast(e.message || 'حدث خطأ أثناء إرسال الإشعار التجريبي', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSaveNumber = async () => {
        if (!newNumber.trim()) {
            toast('الرجاء إدخال رقم واتساب', 'warning');
            return;
        }
        setActionLoading(true);
        try {
            const data = await Api._request('/whatsapp-notifications/set-number', { 
                method: 'POST',
                body: JSON.stringify({ whatsappNumber: newNumber })
            });
            if (data.success) {
                toast(data.message, 'success');
                setStatus({ isEnabled: true, hasNumber: true, whatsappNumber: newNumber });
            }
        } catch (e) {
            toast(e.message || 'حدث خطأ أثناء حفظ الرقم', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="modal-overlay active" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button 
                    onClick={onClose} 
                    style={{ position: 'absolute', top: '15px', left: '15px', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                    <i className="fa-solid fa-times"></i>
                </button>
                
                <h2 className="whatsapp-modal-header">
                    <span className="whatsapp-icon-large">
                        <i className="fa-brands fa-whatsapp"></i>
                    </span>
                    إشعارات واتساب
                </h2>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>جاري التحميل...</div>
                ) : (
                    <div>
                        {!status.hasNumber && (
                            <div className="whatsapp-warning-card" style={{ flexDirection: 'column' }}>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <div className="whatsapp-warning-icon">
                                        <i className="fa-solid fa-triangle-exclamation"></i>
                                    </div>
                                    <div className="whatsapp-warning-text">
                                        <p>لست مسجلاً برقم واتساب في النظام. يرجى إدخال رقم الواتساب الخاص بك لتفعيل الإشعارات.</p>
                                    </div>
                                </div>
                                <div style={{ width: '100%', marginTop: '10px' }}>
                                    <input 
                                        type="text" 
                                        placeholder="مثال: +201012345678" 
                                        value={newNumber}
                                        onChange={(e) => setNewNumber(e.target.value)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '10px', direction: 'ltr', textAlign: 'left' }}
                                    />
                                    <button 
                                        className="whatsapp-btn-primary" 
                                        onClick={handleSaveNumber}
                                        disabled={actionLoading || !newNumber.trim()}
                                    >
                                        {actionLoading ? 'جاري الحفظ...' : 'حفظ الرقم وتفعيل الإشعارات'}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className={`whatsapp-status-card ${status.isEnabled ? 'enabled' : ''}`}>
                            <div className={`whatsapp-status-icon ${status.isEnabled ? 'enabled' : 'disabled'}`}>
                                <i className={`fa-solid ${status.isEnabled ? 'fa-bell' : 'fa-bell-slash'}`}></i>
                            </div>
                            
                            <h3 className={`whatsapp-status-title ${status.isEnabled ? 'enabled' : ''}`}>
                                {status.isEnabled ? 'الإشعارات مفعلة' : 'الإشعارات غير مفعلة'}
                            </h3>
                            
                            <p className="whatsapp-status-desc">
                                {status.isEnabled 
                                    ? 'ستتلقى الإشعارات الهامة والتنبيهات مباشرة على تطبيق واتساب.'
                                    : 'قم بتفعيل الخدمة لتلقي التحديثات المهمة والإشعارات في الوقت الفعلي عبر واتساب.'}
                            </p>

                            {status.hasNumber && (
                                <div style={{ marginTop: '15px' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>سيتم الإرسال إلى الرقم:</span>
                                    <div className="whatsapp-number-badge">
                                        {status.whatsappNumber}
                                    </div>
                                </div>
                            )}
                        </div>

                        {status.hasNumber && (
                            <>
                                {status.isEnabled ? (
                                    <>
                                        <button 
                                            className="whatsapp-btn-danger" 
                                            onClick={handleDisable}
                                            disabled={actionLoading}
                                        >
                                            <i className="fa-solid fa-bell-slash"></i>
                                            {actionLoading ? 'جاري الإيقاف...' : 'إيقاف الإشعارات'}
                                        </button>
                                        <button 
                                            className="whatsapp-btn-test" 
                                            onClick={handleTest}
                                            disabled={actionLoading}
                                        >
                                            <i className="fa-solid fa-paper-plane"></i>
                                            {actionLoading ? 'جاري الإرسال...' : 'إرسال إشعار تجريبي'}
                                        </button>
                                    </>
                                ) : (
                                    <button 
                                        className="whatsapp-btn-primary" 
                                        onClick={handleEnable}
                                        disabled={actionLoading}
                                    >
                                        <i className="fa-solid fa-check"></i>
                                        {actionLoading ? 'جاري التفعيل...' : 'تفعيل إشعارات الواتساب'}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WhatsAppNotificationModal;
