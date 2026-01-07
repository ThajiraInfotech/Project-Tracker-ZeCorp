import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import { toast } from 'react-toastify';
import {
  HomeIcon,
  FolderIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  DocumentChartBarIcon,
  UserIcon,
  Cog6ToothIcon,
  ArrowLeftStartOnRectangleIcon
} from '@heroicons/react/24/outline';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const navigation = [
    { name: 'Dashboard', href: user?.role === 'admin' ? '/admin' : '/', icon: HomeIcon },
    { name: 'Projects', href: '/projects', icon: FolderIcon },
    { name: 'Tasks', href: '/tasks', icon: ClipboardDocumentListIcon },
    { name: 'Attendance', href: '/attendance', icon: CalendarDaysIcon },
    { name: 'Reports', href: '/reports', icon: DocumentChartBarIcon },
  ];

  // Admin-specific navigation
  const adminNavigation = [
    { name: 'User Management', href: '/admin/users', icon: UserIcon },
    { name: 'Project Control', href: '/admin/projects', icon: FolderIcon },
    { name: 'Task Override', href: '/admin/tasks', icon: ClipboardDocumentListIcon },
    { name: 'System Settings', href: '/admin/settings', icon: Cog6ToothIcon },
  ];

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      navigate('/login');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-md transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:relative transition-transform duration-200 ease-in-out`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 border-b border-gray-200">
            <Link to="/" className="flex items-center space-x-2">
              <img className="h-8 w-auto" src="/logo.svg" alt="Thajira WorkFlow" />
              <span className="text-xl font-semibold text-gray-800">Thajira</span>
            </Link>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto">
            <nav className="px-2 py-4 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                >
                  <item.icon className="w-5 h-5 mr-3 text-gray-500" />
                  {item.name}
                </Link>
              ))}
  
              {/* Admin-specific navigation - only show for admin users */}
              {user?.role === 'admin' && (
                <>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Admin Section
                  </div>
                  {adminNavigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                    >
                      <item.icon className="w-5 h-5 mr-3 text-gray-500" />
                      {item.name}
                    </Link>
                  ))}
                </>
              )}
            </nav>
          </div>

          {/* User profile */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <img
                  className="h-10 w-10 rounded-full"
                  src={user?.profileImage || 'https://placehold.co/150'}
                  alt={user?.fullName || 'User'}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.fullName}</p>
                <p className="text-xs text-gray-500 truncate">{user?.role}</p>
              </div>
            </div>

            <div className="mt-4 space-y-1">
              <Link
                to="/profile"
                className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100"
              >
                <UserIcon className="w-5 h-5 mr-3 text-gray-500" />
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 focus:outline-none"
              >
                <ArrowLeftStartOnRectangleIcon className="w-5 h-5 mr-3 text-gray-500" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between h-16 bg-white border-b border-gray-200 px-4">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            >
              <span className="sr-only">Open sidebar</span>
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <button className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900">
                <img
                  className="h-8 w-8 rounded-full"
                  src={user?.profileImage || 'https://placehold.co/150'}
                  alt={user?.fullName || 'User'}
                />
                <span>{user?.fullName}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;