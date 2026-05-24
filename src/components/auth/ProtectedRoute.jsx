import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Api from '../../services/api';

const ProtectedRoute = ({ permission }) => {
    // 3 states: 'loading' | 'authenticated' | 'unauthenticated'
    const [authState, setAuthState] = useState('loading');
    const [networkError, setNetworkError] = useState(false);

    const checkAuth = async () => {
        setNetworkError(false);
        const user = Api._getUser();
        const refreshToken = Api._getRefreshToken();

        // No user data or no refresh token at all → definitely unauthenticated
        if (!user || !refreshToken) {
            Api._clearTokens();
            setAuthState('unauthenticated');
            return;
        }

        // Check if the access token is still valid (not expired)
        const accessToken = Api._getToken();
        if (Api._isTokenValid(accessToken)) {
            // Access token is valid → authenticated immediately
            setAuthState('authenticated');
            return;
        }

        // Access token is expired/missing, but we have a refresh token.
        // Wait for boot refresh if it's still in progress, otherwise trigger a new one.
        try {
            let result;
            if (Api._bootRefreshPromise) {
                result = await Api._bootRefreshPromise;
                Api._bootRefreshPromise = null; // Consume it once
            } else {
                result = await Api._tryRefresh();
            }

            if (result === true) {
                // Refresh succeeded → we have a fresh access token
                setAuthState('authenticated');
            } else if (result === 'REFUSED') {
                // Refresh token is invalid/expired on the server → must login again
                Api._clearTokens();
                setAuthState('unauthenticated');
            } else if (result === 'NETWORK_ERROR') {
                // Network issue — don't destroy the session, show retry
                setNetworkError(true);
                setAuthState('authenticated'); // Optimistically keep them in, API calls will handle 401s
            } else {
                // result === false — no refresh token or unexpected
                Api._clearTokens();
                setAuthState('unauthenticated');
            }
        } catch (err) {
            console.error('[ProtectedRoute] Auth check failed:', err);
            setNetworkError(true);
            // Don't destroy session on network errors
            setAuthState('authenticated');
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    // Loading state — show a lightweight spinner
    if (authState === 'loading') {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                background: 'var(--bg-main, #0a0b10)',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid rgba(255,255,255,0.1)',
                    borderTop: '3px solid var(--primary, #4f8cff)',
                    borderRadius: '50%',
                    animation: 'protectedRouteSpin 0.8s linear infinite'
                }} />
                <span style={{ color: 'var(--text-dim, #94a3b8)', fontSize: '0.9rem' }}>
                    جارٍ التحقق من الجلسة...
                </span>
                <style>{`
                    @keyframes protectedRouteSpin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    // Unauthenticated — redirect to login
    if (authState === 'unauthenticated') {
        return <Navigate to="/login" replace />;
    }

    // Authenticated — check permission if required
    if (permission && !Api.can(permission)) {
        return <Navigate to="/403" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
