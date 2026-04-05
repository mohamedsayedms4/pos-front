import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../services/useNotifications';
import Api from '../../services/api';

const AlwaysOnDisplay = () => {
    const [time, setTime] = useState(new Date());
    const { unreadCount } = useNotifications();
    const user = Api._getUser();

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

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

    return (
        <div className="aod-overlay">
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

                {unreadCount > 0 && (
                    <div className="aod-notifications">
                        <span className="aod-notif-icon">🔔</span>
                        <span className="aod-notif-badge">{unreadCount}</span>
                    </div>
                )}
            </div>
            
            {/* Ambient Background Elements */}
            <div className="aod-glow"></div>
            <div className="aod-particles"></div>
        </div>
    );
};

export default AlwaysOnDisplay;
