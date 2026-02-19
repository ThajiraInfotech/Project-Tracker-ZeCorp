import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { checkAuth } from './store/authSlice';
import { io } from 'socket.io-client';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import MainLayout from './layouts/MainLayout';

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Main pages
import Projects from './pages/Projects';
import ProjectDetailPage from './pages/ProjectDetailPage';
import Tasks from './pages/Tasks';
import Archives from './pages/Archives';

import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import TimeTracking from './pages/TimeTracking';
import Performance from './pages/Performance';

// Attendance pages
import StaffAttendance from './pages/StaffAttendance';
import ManagerAttendance from './pages/ManagerAttendance';
import AdminAttendance from './pages/AdminAttendance';

// Role-based dashboards
import AdminDashboard from './pages/AdminDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import StaffDashboard from './pages/StaffDashboard';

// Manager pages
import TeamPerformance from './pages/TeamPerformance';

// Admin pages
import UserManagement from './pages/admin/UserManagement';

import SystemSettings from './pages/admin/SystemSettings';
import AttendanceExceptions from './pages/admin/AttendanceExceptions';
import AdminServiceReports from './pages/admin/AdminServiceReports';



// Initialize socket connection
const getSocketUrl = () => {
  let url = import.meta.env.VITE_API_URL || '/';

  // If URL is relative (proxy), connect to root for socket.io
  // This prevents connecting to '/api' namespace when VITE_API_URL is '/api'
  if (url.startsWith('/')) {
    return '/';
  }

  // Removed forced HTTPS replacement to allow local dev on HTTP
  return url;
};

export const socket = io(getSocketUrl(), {
  transports: ['websocket', 'polling'] // prioritize websocket
});

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  useEffect(() => {
    // Check authentication status on app load
    dispatch(checkAuth());

    // Socket connection handlers
    socket.on('connect', () => {
      console.log('Connected to socket server');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [dispatch]);

  return (
    <Router>
      <Routes>
        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Main routes */}
        <Route
          element={
            isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />
          }
        >
          <Route path="/" element={
            user?.role === 'admin' ? <Navigate to="/admin" replace /> :
              user?.role === 'manager' ? <Navigate to="/manager" replace /> :
                (user?.role === 'staff' || user?.role === 'technician' || user?.role === 'finance') ? <Navigate to="/staff" replace /> :
                  <Navigate to="/login" replace />
          } />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/archives" element={<Archives />} />
          <Route path="/attendance" element={
            user?.role === 'admin' ? <AdminAttendance /> :
              user?.role === 'manager' ? <ManagerAttendance /> :
                (user?.role === 'staff' || user?.role === 'technician' || user?.role === 'finance') ? <StaffAttendance /> :
                  <Navigate to="/login" replace />
          } />

          <Route path="/team" element={
            <ProtectedRoute allowedRoles={['manager']}>
              <TeamPerformance />
            </ProtectedRoute>
          } />

          <Route path="/performance" element={
            <ProtectedRoute allowedRoles={['staff', 'technician', 'finance']}>
              <Performance />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={<Profile />} />

          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <UserManagement />
            </ProtectedRoute>
          } />



          <Route path="/admin/settings" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <SystemSettings />
            </ProtectedRoute>
          } />

          <Route path="/admin/attendance" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AttendanceExceptions />
            </ProtectedRoute>
          } />







          <Route path="/admin/service-reports" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminServiceReports />
            </ProtectedRoute>
          } />

          <Route path="/manager" element={
            <ProtectedRoute allowedRoles={['manager']}>
              <ManagerDashboard />
            </ProtectedRoute>
          } />

          <Route path="/staff" element={
            <ProtectedRoute allowedRoles={['staff', 'technician', 'finance']}>
              <StaffDashboard />
            </ProtectedRoute>
          } />
        </Route>

        {/* 404 Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;