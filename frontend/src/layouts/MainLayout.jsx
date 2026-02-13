import React, { useState, useEffect } from 'react';
import api from '../store/api';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import { getAdminDashboardData } from '../store/reportSlice';
import { toast } from 'react-toastify';
import NotificationBell from '../components/NotificationBell';
import ChatSidebar from '../components/ChatSidebar';
import UserAvatar from '../components/UserAvatar';
import {
  HomeIcon,
  FolderIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  DocumentChartBarIcon,
  UserIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ArrowLeftStartOnRectangleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  ChartBarIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showChatSidebar, setShowChatSidebar] = useState(false);
  const [chatEntity, setChatEntity] = useState(null);
  const { user } = useSelector((state) => state.auth);
  const { adminDashboardData } = useSelector((state) => state.reports);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarUsers, setSidebarUsers] = useState([]);

  // Fetch admin dashboard data and users for sidebar
  useEffect(() => {
    if (user?.role === 'admin') {
      dispatch(getAdminDashboardData('today'));

      const fetchSidebarUsers = async () => {
        try {
          const response = await api.get('/auth/users');
          if (response.data.success) {
            const users = response.data.users;
            setSidebarUsers(users.filter(u => u.role !== 'admin'));
          }
        } catch (error) {
          console.error('Failed to fetch users for sidebar:', error);
        }
      };

      fetchSidebarUsers();
    }
  }, [dispatch, user?.role]);


  const navigation = [
    { name: 'Dashboard', href: user?.role === 'admin' ? '/admin' : '/', icon: HomeIcon },
    // Show Projects only for non-staff/non-technician users (admin, manager)
    ...(!['staff', 'technician', 'finance'].includes(user?.role) ? [{ name: 'Projects', href: '/projects', icon: FolderIcon }] : []),
    { name: 'Tasks', href: '/tasks', icon: ClipboardDocumentListIcon },
    { name: 'Attendance', href: '/attendance', icon: CalendarDaysIcon },
    ...(['staff', 'technician', 'finance'].includes(user?.role) ? [
      { name: 'Performance', href: '/performance', icon: ChartBarIcon }
    ] : []),
    ...(user?.role === 'manager' ? [{ name: 'Team Performance', href: '/team', icon: UserGroupIcon }] : []),
  ];

  // Admin-specific navigation
  const adminNavigation = [
    { name: 'User Management', href: '/admin/users', icon: UserIcon },
    { name: 'Service Reports', href: '/admin/service-reports', icon: DocumentChartBarIcon },
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
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-gray-900 bg-opacity-50 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-xl border-r border-slate-200 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:relative transition-transform duration-200 ease-in-out`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-20 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-gray-50">
            <Link to="/" className="flex items-center justify-center">
              <img className="h-12 w-auto object-contain" src="/zecorp_logo.png" alt="Zeecorp Workflow" />
            </Link>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto">
            <nav className="px-3 py-6 space-y-2">
              {/* Main Navigation */}
              <div className="space-y-1">
                <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  Main Dashboard
                </div>
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className="group flex items-center px-3 py-3 text-sm font-medium rounded-lg hover:bg-slate-100 hover:shadow-sm focus:outline-none focus:bg-slate-100 transition-all duration-200 border border-transparent hover:border-slate-200"
                  >
                    <item.icon className="w-5 h-5 mr-4 text-slate-600 group-hover:text-slate-900" />
                    <span className="text-slate-700 group-hover:text-slate-900">{item.name}</span>
                  </Link>
                ))}
              </div>

              {user?.role === 'admin' && (
                <div className="space-y-1">
                  <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 mt-6">
                    Administration
                  </div>
                  {adminNavigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className="group flex items-center px-3 py-3 text-sm font-medium rounded-lg hover:bg-blue-50 hover:shadow-sm focus:outline-none focus:bg-blue-50 transition-all duration-200 border border-transparent hover:border-blue-200"
                    >
                      <item.icon className="w-5 h-5 mr-4 text-blue-600 group-hover:text-blue-800" />
                      <span className="text-slate-700 group-hover:text-slate-900">{item.name}</span>
                    </Link>
                  ))}

                  {/* User Workspaces Section */}
                  <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 mt-6">
                    User Workspaces
                  </div>
                  <div className="mt-2 space-y-1">
                    {sidebarUsers.map((u) => (
                      <Link
                        key={u._id}
                        to={u.role === 'manager' ? `/projects?manager=${u._id}` : `/tasks?assignedTo=${u._id}`}
                        onClick={() => setSidebarOpen(false)}
                        className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg hover:bg-slate-100 transition-all duration-200"
                      >
                        <UserAvatar user={u} size="xs" className="mr-3" />
                        <div className="flex flex-col">
                          <span className="text-slate-700 group-hover:text-slate-900 line-clamp-1">{u.fullName}</span>
                          <span className="text-[10px] text-slate-500 capitalize">{u.role}</span>
                        </div>
                      </Link>
                    ))}
                    {sidebarUsers.length === 0 && (
                      <div className="px-3 py-2 text-xs text-slate-400 italic">No users found</div>
                    )}
                  </div>
                </div>
              )}
            </nav>

            {/* Quick Stats for Admin */}
            {user?.role === 'admin' && adminDashboardData?.dashboard && (
              <div className="px-3 py-4 border-t border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 mx-3 rounded-lg mb-4">
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                  Quick Summary
                </div>
                <div className="space-y-2">
                  <Link
                    to="/projects?filter=delayed"
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center justify-between group hover:bg-red-50 p-1 rounded transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <ExclamationCircleIcon className="w-4 h-4 text-red-600" />
                      <span className="text-xs text-slate-700 font-medium group-hover:text-red-700">Delayed Projects</span>
                    </div>
                    <span className="text-sm font-bold text-red-600 bg-white px-2 py-0.5 rounded shadow-sm border border-red-100">
                      {adminDashboardData.dashboard.projects.totalProjectsDelayed}
                    </span>
                  </Link>

                  <Link
                    to="/projects?filter=at-risk"
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center justify-between group hover:bg-yellow-50 p-1 rounded transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600" />
                      <span className="text-xs text-slate-700 font-medium group-hover:text-yellow-700">At-Risk Projects</span>
                    </div>
                    <span className="text-sm font-bold text-yellow-600 bg-white px-2 py-0.5 rounded shadow-sm border border-yellow-100">
                      {adminDashboardData.dashboard.projects.totalProjectsAtRisk || 0}
                    </span>
                  </Link>

                  <Link
                    to="/tasks?filter=overdue"
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center justify-between group hover:bg-orange-50 p-1 rounded transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="w-4 h-4 text-orange-600" />
                      <span className="text-xs text-slate-700 font-medium group-hover:text-orange-700">Overdue Tasks</span>
                    </div>
                    <span className="text-sm font-bold text-orange-600 bg-white px-2 py-0.5 rounded shadow-sm border border-orange-100">
                      {adminDashboardData.dashboard.tasks.totalTasksOverdue}
                    </span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User profile */}
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <div className="relative">
                  <UserAvatar user={user} size="lg" className="ring-2 ring-slate-200" />
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-400 border-2 border-white rounded-full"></div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.fullName}</p>
                <p className="text-xs text-slate-600 capitalize font-medium">{user?.role} Account</p>
              </div>
            </div>

            <div className="space-y-1">
              <Link
                to="/profile"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-white hover:shadow-sm transition-all duration-200 border border-transparent hover:border-slate-200"
              >
                <UserIcon className="w-5 h-5 mr-3 text-slate-600" />
                <span className="text-slate-700">Profile Settings</span>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-red-50 hover:shadow-sm focus:outline-none transition-all duration-200 border border-transparent hover:border-red-200"
              >
                <ArrowLeftStartOnRectangleIcon className="w-5 h-5 mr-3 text-red-600" />
                <span className="text-red-700">Sign Out</span>
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
            {/* Notification Bell */}
            <NotificationBell
              onNotificationClick={(notification) => {
                setChatEntity({
                  entityType: notification.entityType,
                  entityId: notification.entityId,
                  entityTitle: notification.entityTitle
                });
                setShowChatSidebar(true);
              }}
            />

            <button className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900">
              <UserAvatar user={user} size="sm" className="ring-2 ring-white" />
              <span>{user?.fullName}</span>
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className={`flex-1 overflow-y-auto ${['/manager', '/attendance', '/team', '/staff', '/performance'].includes(location.pathname) ? 'p-0' : 'p-4'}`}>
          <Outlet />
        </main>
      </div>

      {/* Chat Sidebar (for notifications) */}
      {chatEntity && (
        <ChatSidebar
          isOpen={showChatSidebar}
          onClose={() => {
            setShowChatSidebar(false);
            setChatEntity(null);
          }}
          entityType={chatEntity.entityType}
          entityId={chatEntity.entityId}
          entityTitle={chatEntity.entityTitle}
        />
      )}
    </div>
  );
};

export default MainLayout;
