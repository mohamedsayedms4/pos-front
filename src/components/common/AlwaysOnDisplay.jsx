import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../services/useNotifications';
import Api from '../../services/api';
import ChatService from '../../services/ChatService';
import msgIcon from '../../assets/img/msg.png';

const AlwaysOnDisplay = () => {
    const [time, setTime] = useState(new Date());
    const { unreadCount } = useNotifications();
    const [unreadMessages, setUnreadMessages] = useState(0);
    const user = Api._getUser();

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

                {(unreadCount > 0 || unreadMessages > 0) && (
                    <div className="aod-notifications">
                        {unreadCount > 0 && (
                            <div className="aod-notif-item">
                                <span className="aod-notif-icon">🔔</span>
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
            </div>
            
            {/* Ambient Background Elements */}
            <div className="aod-glow"></div>
            <div className="aod-particles"></div>
        </div>
    );
};

export default AlwaysOnDisplay;
