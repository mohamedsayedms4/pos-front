import React from 'react';
import { useNavigate } from 'react-router-dom';
import Api from '../services/api';
import '../styles/pages/ErrorsPremium.css';

const Error403 = () => {
    const navigate = useNavigate();
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

    return (
        <div className="err-wrapper state-403">
            <div className="err-container">
                <div className="err-glass-board">
                    {/* Glowing Accent Hero Tile */}
                    <div className="err-hero-tile">
                        <span className="err-code-text">403</span>
                        <i className="fas fa-ban err-tile-icon"></i>
                    </div>

                    {/* Status Badge */}
                    <span className="err-badge">
                        <i className="fas fa-lock"></i> غير مصرح / Forbidden
                    </span>

                    {/* Bilingual Error Messages */}
                    <h1 className="err-title-ar">عذراً، لا تمتلك الصلاحية المطلوبة!</h1>
                    <h2 className="err-title-en">Access Denied - Insufficient Permissions</h2>
                    
                    <p className="err-desc-ar">
                        الحساب الحالي الذي سجلت الدخول به لا يملك الأذونات اللازمة لاستعراض هذه الصفحة. 
                        يرجى مراجعة إدارة النظام لتعديل صلاحيات دورك، أو العودة للمسار الآمن.
                    </p>

                    {/* Metro Action Buttons */}
                    <div className="err-actions-row">
                        <button className="err-btn-tile" onClick={handleGoBack}>
                            <i className="fas fa-arrow-left" style={{ marginLeft: '6px' }}></i> الرجوع للخلف / Go Back
                        </button>
                        <button className="err-btn-tile accent-fill-403" onClick={handleHomeRedirect}>
                            <i className="fas fa-house" style={{ marginLeft: '6px' }}></i> {isLoggedIn ? 'الرئيسية / Dashboard' : 'الدخول / Login'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Error403;
