import React from 'react';
import { useNavigate } from 'react-router-dom';
import Api from '../services/api';
import '../styles/pages/ErrorsPremium.css';

const Error404 = () => {
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
        <div className="err-wrapper state-404">
            <div className="err-container">
                <div className="err-glass-board">
                    {/* Glowing Accent Hero Tile */}
                    <div className="err-hero-tile">
                        <span className="err-code-text">404</span>
                        <i className="fas fa-compass err-tile-icon"></i>
                    </div>

                    {/* Status Badge */}
                    <span className="err-badge">
                        <i className="fas fa-triangle-exclamation"></i> مفقود / Not Found
                    </span>

                    {/* Bilingual Error Messages */}
                    <h1 className="err-title-ar">عذراً، الصفحة غير موجودة!</h1>
                    <h2 className="err-title-en">Page Not Found - Route Missing</h2>
                    
                    <p className="err-desc-ar">
                        يبدو أن الرابط الذي تحاول الوصول إليه غير موجود، أو ربما تم نقله، 
                        أو أنك قمت بكتابة عنوان URL بشكل غير صحيح. يرجى مراجعة الرابط أو العودة للرئيسية.
                    </p>

                    {/* Metro Action Buttons */}
                    <div className="err-actions-row">
                        <button className="err-btn-tile" onClick={handleGoBack}>
                            <i className="fas fa-arrow-left" style={{ marginLeft: '6px' }}></i> الرجوع للخلف / Go Back
                        </button>
                        <button className="err-btn-tile accent-fill-404" onClick={handleHomeRedirect}>
                            <i className="fas fa-house" style={{ marginLeft: '6px' }}></i> {isLoggedIn ? 'الرئيسية / Dashboard' : 'الدخول / Login'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Error404;
