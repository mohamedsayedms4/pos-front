import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Api from '../services/api';
import '../styles/pages/ErrorsPremium.css';

const Error500 = () => {
    const navigate = useNavigate();
    const [showConsole, setShowConsole] = useState(false);
    const user = Api._getUser();
    const token = Api._getToken();
    const isLoggedIn = !!(user && token);

    const handleGoBack = () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            navigate(isLoggedIn ? '/dashboard' : '/login');
        }
    };

    const handleHomeRedirect = () => {
        navigate(isLoggedIn ? '/dashboard' : '/login');
    };

    // Gather dynamic technical details
    const diagnosticInfo = {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: window.navigator.userAgent,
        platform: window.navigator.platform,
        userId: user ? `${user.id} (${user.role})` : 'Guest / Not Authenticated',
        apiEndpoint: 'https://posapi.digitalrace.net/api/v1',
    };

    return (
        <div className="err-wrapper state-500">
            <div className="err-container">
                <div className="err-glass-board">
                    {/* Glowing Accent Hero Tile */}
                    <div className="err-hero-tile">
                        <span className="err-code-text">500</span>
                        <i className="fas fa-server err-tile-icon"></i>
                    </div>

                    {/* Status Badge */}
                    <span className="err-badge">
                        <i className="fas fa-bug"></i> خطأ داخلي / Server Error
                    </span>

                    {/* Bilingual Error Messages */}
                    <h1 className="err-title-ar">حدث خطأ غير متوقع في النظام!</h1>
                    <h2 className="err-title-en">Internal Server Error - Unexpected Exception</h2>

                    <p className="err-desc-ar">
                        لقد واجه خادمنا صعوبة غير متوقعة أثناء معالجة هذا الطلب.
                        تم تسجيل تقرير الخطأ تلقائياً للتحليل. يرجى المحاولة مرة أخرى لاحقاً أو العودة للرئيسية.
                    </p>

                    {/* Metro Action Buttons */}
                    <div className="err-actions-row">
                        <button className="err-btn-tile" onClick={handleGoBack}>
                            <i className="fas fa-arrow-left" style={{ marginLeft: '6px' }}></i> الرجوع للخلف / Go Back
                        </button>
                        <button className="err-btn-tile accent-fill-500" onClick={handleHomeRedirect}>
                            <i className="fas fa-house" style={{ marginLeft: '6px' }}></i> {isLoggedIn ? 'الرئيسية / Dashboard' : 'الدخول / Login'}
                        </button>
                    </div>

                    {/* Collapsible Tech Console */}
                    <div className="err-console-wrapper">
                        <button
                            className={`err-console-trigger ${showConsole ? 'open' : ''}`}
                            onClick={() => setShowConsole(!showConsole)}
                        >
                            <i className="fas fa-chevron-left" style={{ transform: showConsole ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s', marginLeft: '6px' }}></i>
                            {showConsole ? 'إخفاء المعطيات التقنية / Hide Console' : 'عرض التفاصيل التقنية للخطأ / Developer Console'}
                        </button>

                        {showConsole && (
                            <div className="err-console-box">
                                <div className="err-console-header">
                                    <span>SYSTEM_ERROR_DIAGNOSTICS</span>
                                    <span>v1.0.0</span>
                                </div>
                                <div className="err-console-line">
                                    <span className="key">TIMESTAMP:</span> {diagnosticInfo.timestamp}
                                </div>
                                <div className="err-console-line">
                                    <span className="key">REQUEST_URL:</span> {diagnosticInfo.url}
                                </div>
                                <div className="err-console-line">
                                    <span className="key">CLIENT_PLATFORM:</span> {diagnosticInfo.platform}
                                </div>
                                <div className="err-console-line">
                                    <span className="key">USER_AGENT:</span> {diagnosticInfo.userAgent}
                                </div>
                                <div className="err-console-line">
                                    <span className="key">ACTIVE_USER_ID:</span> {diagnosticInfo.userId}
                                </div>
                                <div className="err-console-line">
                                    <span className="key">API_GATEWAY:</span> {diagnosticInfo.apiEndpoint}
                                </div>
                                <div className="err-console-line" style={{ color: '#ef4444', marginTop: '8px', fontWeight: 'bold' }}>
                                    STATUS: [500_INTERNAL_SERVER_ERROR] - Request aborted due to unexpected pipeline exception.
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Error500;
