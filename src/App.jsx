import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthPages from './pages/AuthPages';
import Dashboard from './pages/Dashboard';
import ChapterView from './pages/ChapterView';

// Context Providers
import { useAuth } from './context/AuthContext';
import { SchoolProvider } from './context/SchoolContext';
import { ProgressProvider } from './context/ProgressContext';

// Components & Guards
import RoleGuard from './components/common/RoleGuard';

// Dashboards
import AdminDashboard from './pages/admin/AdminDashboard';
import SchoolDashboard from './pages/school/SchoolDashboard';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import ParentDashboard from './pages/parent/ParentDashboard';
import BusSupervisorDashboard from './pages/bus/BusSupervisorDashboard';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0F172A', color: '#F8FAFC' }}>Loading...</div>;
  return user ? children : <Navigate to="/auth" />;
};

function App() {
  useEffect(() => {
    // Mouse tracking for background gradient effect
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;

      document.documentElement.style.setProperty('--mouse-x', `${x}%`);
      document.documentElement.style.setProperty('--mouse-y', `${y}%`);
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <Router>
      <SchoolProvider>
        <ProgressProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/auth" element={<AuthPages />} />

            {/* Student Dashboard & Course View */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/chapter/:id"
              element={
                <PrivateRoute>
                  <ChapterView />
                </PrivateRoute>
              }
            />

            {/* Super Admin Dashboard */}
            <Route
              path="/admin/*"
              element={
                <PrivateRoute>
                  <RoleGuard allowedRoles={['super_admin']}>
                    <AdminDashboard />
                  </RoleGuard>
                </PrivateRoute>
              }
            />

            {/* School Admin Dashboard */}
            <Route
              path="/school/*"
              element={
                <PrivateRoute>
                  <RoleGuard allowedRoles={['school_admin']}>
                    <SchoolDashboard />
                  </RoleGuard>
                </PrivateRoute>
              }
            />

            {/* Teacher Dashboard */}
            <Route
              path="/teacher/*"
              element={
                <PrivateRoute>
                  <RoleGuard allowedRoles={['teacher']}>
                    <TeacherDashboard />
                  </RoleGuard>
                </PrivateRoute>
              }
            />

            {/* Parent Dashboard */}
            <Route
              path="/parent/*"
              element={
                <PrivateRoute>
                  <RoleGuard allowedRoles={['parent']}>
                    <ParentDashboard />
                  </RoleGuard>
                </PrivateRoute>
              }
            />

            {/* Bus Supervisor Dashboard */}
            <Route
              path="/bus/*"
              element={
                <PrivateRoute>
                  <RoleGuard allowedRoles={['bus_supervisor']}>
                    <BusSupervisorDashboard />
                  </RoleGuard>
                </PrivateRoute>
              }
            />

            {/* Default Redirection */}
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </ProgressProvider>
      </SchoolProvider>
    </Router>
  );
}

export default App;
