import React from 'react';
import { useNavigate } from 'react-router-dom';
import Api from '../services/api';

const SubscriptionExpired = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        Api.logout();
        navigate('/login');
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: 'white',
            fontFamily: 'Tajawal, sans-serif',
            textAlign: 'center',
            padding: '20px'
        }}>
            <div style={{
                maxWidth: '500px',
                padding: '40px',
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                <div style={{
                    fontSize: '64px',
                    marginBottom: '20px',
                    color: '#f87171'
                }}>
                    <i className="fas fa-calendar-times"></i>
                </div>
                <h1 style={{ fontSize: '28px', marginBottom: '16px', fontWeight: 'bold' }}>انتهت صلاحية الاشتراك</h1>
                <p style={{ fontSize: '18px', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '32px' }}>
                    عذراً، يبدو أن فترة اشتراك متجرك قد انتهت. يرجى التواصل مع الإدارة لتجديد الاشتراك والمتابعة.
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button 
                        onClick={() => window.open('https://wa.me/201012345678', '_blank')}
                        style={{
                            padding: '14px',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px'
                        }}
                    >
                        <i className="fab fa-whatsapp"></i> تواصل مع الدعم الفني
                    </button>
                    
                    <button 
                        onClick={handleLogout}
                        style={{
                            padding: '14px',
                            background: 'transparent',
                            color: '#94a3b8',
                            border: '1px solid #475569',
                            borderRadius: '12px',
                            fontSize: '16px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        تسجيل الخروج
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionExpired;
