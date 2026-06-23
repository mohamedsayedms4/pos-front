import React, { useState, useEffect } from 'react';
import Api from '../../services/api';
import { useGlobalUI } from '../common/GlobalUI';
import '../../styles/components/TelegramIntegrationModal.css';

const TelegramIntegrationModal = ({ onClose }) => {
    const { toast } = useGlobalUI();
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState({ isLinked: false, chatId: null });
    const [linkData, setLinkData] = useState(null);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const data = await Api._request('/telegram/status');
            setStatus(data);
        } catch (e) {
            console.error('Failed to fetch telegram status', e);
        } finally {
            setLoading(false);
        }
    };


    const handleGenerateLink = async () => {
        setLoading(true);
        try {
            const data = await Api._request('/telegram/link-token', { method: 'POST' });
            setLinkData(data);
            window.open(data.link, '_blank');
        } catch (e) {
            toast('حدث خطأ أثناء إنشاء كود الربط', 'error');
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="modal-overlay active" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%', padding: '24px', borderRadius: '12px', background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)', position: 'relative' }}>
                <button 
                    onClick={onClose} 
                    style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                    ✕
                </button>
                
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0, marginBottom: '20px' }}>
                    <span style={{ color: '#0088cc', fontSize: '1.5rem' }}>
                        <i className="fa-brands fa-telegram"></i>
                    </span>
                    ربط حساب تليجرام
                </h2>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>جاري التحميل...</div>
                ) : status.isLinked ? (
                    <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                        <div style={{ fontSize: '3rem', color: '#22c55e', marginBottom: '10px' }}>
                            <i className="fa-solid fa-circle-check"></i>
                        </div>
                        <h3 style={{ margin: '0 0 10px 0', color: '#16a34a' }}>تم ربط حسابك بنجاح!</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 0 }}>
                            يمكنك الآن استخدام البوت لتنفيذ المهام ومتابعة العمليات من خلال تليجرام.
                        </p>
                    </div>
                ) : (
                    <div>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.6' }}>
                            اربط حسابك الآن بتطبيق تليجرام لتتمكن من الوصول لتقارير المبيعات، تسجيل المصروفات، وتلقي الإشعارات الفورية بطريقة سهلة وآمنة.
                        </p>
                        
                        {!linkData ? (
                            <button 
                                onClick={handleGenerateLink}
                                style={{ width: '100%', padding: '12px', background: '#0088cc', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                <i className="fa-solid fa-link"></i>
                                إنشاء كود الربط
                            </button>
                        ) : (
                            <div style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: '8px', border: '1px dashed #0088cc', textAlign: 'center' }}>
                                <p style={{ fontSize: '0.9rem', margin: '0 0 10px 0' }}>كود الربط الخاص بك هو:</p>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', letterSpacing: '4px', color: '#0088cc', marginBottom: '15px', userSelect: 'all' }}>
                                    {linkData.token}
                                </div>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                                    قم بإرسال هذا الكود إلى البوت الخاص بنا <strong>@{linkData.botUsername}</strong>
                                </p>
                                <a 
                                    href={linkData.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#0088cc', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold' }}
                                >
                                    <i className="fa-brands fa-telegram"></i>
                                    فتح البوت الآن
                                </a>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TelegramIntegrationModal;
