import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const RoleGuard = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0F172A', color: '#F8FAFC' }}>
                Loading authorization...
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/auth" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect to main dashboard (which routes to the correct sub-dashboard)
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default RoleGuard;
