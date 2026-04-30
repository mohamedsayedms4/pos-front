import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Api from '../../services/api';

const ProtectedRoute = ({ permission }) => {
    const user = Api._getUser();
    const token = Api._getToken();

    if (!user || !token) {
        // Clear anything left over and redirect to login
        Api._clearTokens();
        return <Navigate to="/login" replace />;
    }

    if (permission && !Api.can(permission)) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
