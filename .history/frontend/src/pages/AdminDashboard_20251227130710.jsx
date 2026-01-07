import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAdminDashboardData } from '../store/reportSlice';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
  Filler
);

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const { adminDashboardData, loading, error } = useSelector((state) => state.reports);
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeContext, setTimeContext] = useState('today');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    await dispatch(getAdminDashboardData(timeContext));
    setLastUpdated(new Date());
    setIsRefreshing(false);
  }, [dispatch, timeContext]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Enhanced dashboard data with admin-specific metrics
  const adminDashboard = adminDashboardData?.dashboard || {
    projects: { totalProjects: 0, totalProjectsInProgress: 0, totalProjectsCompleted: 0, totalProjectsDelayed: 0 },
    tasks: { totalTasksCompleted: 0, totalTasksOverdue: 0, tasksDueToday: 0 },
    attendance: { totalPresent: 0, presentToday: 0, averageHours: 0 },
    staff: { totalStaffCount: 0, activeStaffCount: 0 },
    productivity: { productivityPercentage: 0, totalOvertimeHours: 0 },
    revenue: { totalRevenue: 0, completedProjectsRevenue: 0, pendingRevenue: 0 },
    delayedProjects: []
  };

  // Chart data for admin dashboard
  const projectStatusData = {
    labels: ['Completed', 'In Progress', 'Delayed', 'Planning', 'On Hold'],
    datasets: [
      {
        data: [
          adminDashboard.projects.totalProjectsCompleted,
          adminDashboard.projects.totalProjectsInProgress,
          adminDashboard.projects.totalProjectsDelayed,
          adminDashboard.projects.totalProjects - adminDashboard.projects.totalProjectsCompleted - adminDashboard.projects.totalProjectsInProgress - adminDashboard.projects.totalProjectsDelayed,
          0 // On Hold
        ],
        backgroundColor: [
          '#4CAF50', // Green for completed
          '#2196F3', // Blue for in progress
          '#FF9800', // Orange for delayed
          '#9C27B0', // Purple for planning
          '#607D8B'  // Grey for on hold
        ],
        hoverBackgroundColor: [
          '#66BB6A',
          '#42A5F5',
          '#FFB74D',
          '#AB47BC',
          '#78909C'
        ]
      }
    ]
  };

  const taskStatusData = {
    labels: ['Completed', 'Overdue', 'Due Today', 'In Progress'],
    datasets: [
      {
        label: 'Tasks',
        data: [
          adminDashboard.tasks.totalTasksCompleted,
          adminDashboard.tasks.totalTasksOverdue,
          adminDashboard.tasks.tasksDueToday,
          0 // In progress (would need to calculate)
        ],
        backgroundColor: [
          '#4CAF50',
          '#F44336',
          '#FFC107',
          '#2196F3'
        ]
      }
    ]
  };

  const productivityData = {
    labels: ['Productivity %', 'Overtime Hours', 'Staff Utilization'],
    datasets: [
      {
        label: 'Metrics',
        data: [
          adminDashboard.productivity.productivityPercentage,
          adminDashboard.productivity.totalOvertimeHours,
          adminDashboard.staff.totalStaffCount > 0 ?
            Math.round((adminDashboard.staff.activeStaffCount / adminDashboard.staff.totalStaffCount) * 100) : 0
        ],
        backgroundColor: [
          '#4CAF50',
          '#FF9800',
          '#2196F3'
        ]
      }
    ]
  };

  const revenueData = {
    labels: ['Total Revenue', 'Completed Revenue', 'Pending Revenue'],
    datasets: [
      {
        label: 'Revenue ($)',
        data: [
          adminDashboard.revenue.totalRevenue,
          adminDashboard.revenue.completedProjectsRevenue,
          adminDashboard.revenue.pendingRevenue
        ],
        backgroundColor: [
          '#4CAF50',
          '#2196F3',
          '#FFC107'
        ]
      }
    ]
  };

  // Risk assessment data
  const riskData = {
    labels: adminDashboard.delayedProjects.slice(0, 5).map(p => p.name),
    datasets: [
      {
        label: 'Days Delayed',
        data: adminDashboard.delayedProjects.slice(0, 5).map(p => p.daysDelayed),
        backgroundColor: '#F44336',
        borderColor: '#D32F2F',
        borderWidth: 1
      }
    ]
  };

  // Insight texts
  const projectInsight = `${adminDashboard.projects.totalProjectsDelayed} project${adminDashboard.projects.totalProjectsDelayed !== 1 ? 's' : ''} ${adminDashboard.projects.totalProjectsDelayed === 1 ? 'is' : 'are'} at risk due to delayed tasks.`;
  const taskInsight = `${adminDashboard.tasks.totalTasksOverdue} task${adminDashboard.tasks.totalTasksOverdue !== 1 ? 's' : ''} overdue, ${adminDashboard.tasks.tasksDueToday} due today.`;
  const productivityInsight = `Current productivity at ${adminDashboard.productivity.productivityPercentage}%, with ${adminDashboard.productivity.totalOvertimeHours} overtime hours logged.`;
  const revenueInsight = `Total revenue of $${adminDashboard.revenue.totalRevenue.toLocaleString()}, with $${adminDashboard.revenue.pendingRevenue.toLocaleString()} still pending.`;

  // Top insights data
  const projectInsights = adminDashboard.delayedProjects.slice(0, 3).map(p => ({
    name: p.name,
    value: `${p.daysDelayed} days delayed`,
    link: '/projects'
  }));
  const taskInsights = [
    { name: 'Overdue Tasks', value: adminDashboard.tasks.totalTasksOverdue, link: '/tasks' },
    { name: 'Due Today', value: adminDashboard.tasks.tasksDueToday, link: '/tasks' },
    { name: 'Completed', value: adminDashboard.tasks.totalTasksCompleted, link: '/tasks' }
  ].filter(item => item.value > 0).slice(0, 3);
  const productivityInsights = [
    { name: 'Productivity %', value: `${adminDashboard.productivity.productivityPercentage}%`, link: '/admin/reports/staff-productivity' },
    { name: 'Overtime Hours', value: adminDashboard.productivity.totalOvertimeHours, link: '/admin/reports/staff-productivity' },
    { name: 'Staff Utilization', value: `${adminDashboard.staff.totalStaffCount > 0 ? Math.round((adminDashboard.staff.activeStaffCount / adminDashboard.staff.totalStaffCount) * 100) : 0}%`, link: '/admin/reports/staff-productivity' }
  ].slice(0, 3);
  const revenueInsights = [
    { name: 'Total Revenue', value: `$${adminDashboard.revenue.totalRevenue.toLocaleString()}`, link: '/admin/reports/project-performance' },
    { name: 'Completed Revenue', value: `$${adminDashboard.revenue.completedProjectsRevenue.toLocaleString()}`, link: '/admin/reports/project-performance' },
    { name: 'Pending Revenue', value: `$${adminDashboard.revenue.pendingRevenue.toLocaleString()}`, link: '/admin/reports/project-performance' }
  ].slice(0, 3);

  return (
    <div className="space-y-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen p-6">
      {/* Admin Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Admin Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">Enterprise Management Console</p>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-sm text-gray-600">Welcome, {user?.fullName}</p>
              <p className="text-xs text-gray-500">Administrator</p>
              {lastUpdated && (
                <p className="text-xs text-gray-400">Last updated: {lastUpdated.toLocaleTimeString()}</p>
              )}
            </div>
            <button
              onClick={fetchData}
              disabled={isRefreshing}
              className="p-2 bg-blue-100 hover:bg-blue-200 rounded-full transition-all duration-300 disabled:opacity-50"
              title="Refresh Data"
            >
              <svg className={`w-5 h-5 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <div className="flex space-x-2">
              <button
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                  activeTab === 'overview'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
                }`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                  activeTab === 'analytics'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
                }`}
                onClick={() => setActiveTab('analytics')}
              >
                Analytics
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                  activeTab === 'reports'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
                }`}
                onClick={() => setActiveTab('reports')}
              >
                Reports
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Time Context Toggle */}
      <div className="flex items-center justify-center space-x-2 mt-4">
        <span className="text-sm text-gray-600">Time Context:</span>
        <button
          className={`px-3 py-1 text-sm rounded-full transition-all ${timeContext === 'today' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          onClick={() => setTimeContext('today')}
        >
          Today
        </button>
        <button
          className={`px-3 py-1 text-sm rounded-full transition-all ${timeContext === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          onClick={() => setTimeContext('week')}
        >
          This Week
        </button>
        <button
          className={`px-3 py-1 text-sm rounded-full transition-all ${timeContext === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          onClick={() => setTimeContext('month')}
        >
          This Month
        </button>
      </div>

      {/* Action Required Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-orange-200 bg-orange-50">
        <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center">
          <span className="text-2xl mr-2">🚨</span> Action Required
        </h2>
        <p className="text-sm text-gray-600 mb-4">Items that need immediate attention today</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Delayed Projects */}
          <Link to="/projects" className="bg-red-50 p-4 rounded-lg border border-red-200 hover:bg-red-100 hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-red-700 font-medium">Delayed Projects</p>
                <p className="text-2xl font-bold text-red-800">{adminDashboard.projects.totalProjectsDelayed}</p>
                {adminDashboard.projects.totalProjectsDelayed === 0 && <p className="text-xs text-red-600 mt-1">All projects on track</p>}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-red-600 text-lg">→</span>
                <div className="bg-red-100 p-2 rounded-full">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          {/* At-Risk Projects */}
          <Link to="/projects" className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 hover:bg-yellow-100 hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-yellow-700 font-medium">At-Risk Projects</p>
                <p className="text-2xl font-bold text-yellow-800">{adminDashboard.projects.totalProjectsInProgress}</p>
                {adminDashboard.projects.totalProjectsInProgress === 0 && <p className="text-xs text-yellow-600 mt-1">Stable</p>}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-yellow-600 text-lg">→</span>
                <div className="bg-yellow-100 p-2 rounded-full">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          {/* Overdue Tasks */}
          <Link to="/tasks" className="bg-orange-50 p-4 rounded-lg border border-orange-200 hover:bg-orange-100 hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-orange-700 font-medium">Overdue Tasks</p>
                <p className="text-2xl font-bold text-orange-800">{adminDashboard.tasks.totalTasksOverdue}</p>
                {adminDashboard.tasks.totalTasksOverdue === 0 && <p className="text-xs text-orange-600 mt-1">No blockers</p>}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-orange-600 text-lg">→</span>
                <div className="bg-orange-100 p-2 rounded-full">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/projects?filter=at-risk" className="bg-blue-50 p-4 rounded-lg border border-blue-200 hover:bg-blue-100 hover:shadow-md transition-all cursor-pointer text-center">
            <div className="text-sm text-blue-700 font-medium">View At-Risk Projects</div>
          </Link>
          <Link to="/tasks?filter=overdue" className="bg-red-50 p-4 rounded-lg border border-red-200 hover:bg-red-100 hover:shadow-md transition-all cursor-pointer text-center">
            <div className="text-sm text-red-700 font-medium">Review Overdue Tasks</div>
          </Link>
          <Link to="/admin/attendance" className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 hover:bg-yellow-100 hover:shadow-md transition-all cursor-pointer text-center">
            <div className="text-sm text-yellow-700 font-medium">Attendance Exceptions</div>
          </Link>
          <Link to="/admin/reports/staff-productivity" className="bg-purple-50 p-4 rounded-lg border border-purple-200 hover:bg-purple-100 hover:shadow-md transition-all cursor-pointer text-center">
            <div className="text-sm text-purple-700 font-medium">Productivity Report</div>
          </Link>
        </div>
      </div>

      {/* Summary Cards - Enhanced for Admin */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Project Metrics */}
        <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-all">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Total Projects</p>
              <p className="text-2xl font-bold text-gray-900">{adminDashboard.projects.totalProjects}</p>
              <p className="text-xs text-gray-500 mt-1">
                {adminDashboard.projects.totalProjectsCompleted} Completed • {adminDashboard.projects.totalProjectsDelayed} Delayed
              </p>
            </div>
            <div className="bg-blue-100 p-2 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Staff Metrics */}
        <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-all">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Total Staff</p>
              <p className="text-2xl font-bold text-gray-900">{adminDashboard.staff.totalStaffCount}</p>
              <p className="text-xs text-gray-500 mt-1">
                {adminDashboard.staff.activeStaffCount} Active • {adminDashboard.staff.totalStaffCount - adminDashboard.staff.activeStaffCount} Inactive
              </p>
            </div>
            <div className="bg-green-100 p-2 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Task Metrics */}
        <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-all">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Task Status</p>
              <p className="text-2xl font-bold text-green-600">{adminDashboard.tasks.totalTasksCompleted}</p>
              <p className="text-xs text-gray-500 mt-1">
                <span className="text-red-500">{adminDashboard.tasks.totalTasksOverdue} Overdue</span> •
                <span className="text-yellow-500"> {adminDashboard.tasks.tasksDueToday} Due Today</span>
              </p>
            </div>
            <div className="bg-yellow-100 p-2 rounded-full">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Productivity Metrics */}
        <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-all">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Productivity</p>
              <p className="text-2xl font-bold text-blue-600">{adminDashboard.productivity.productivityPercentage}%</p>
              <p className="text-xs text-gray-500 mt-1">
                {adminDashboard.productivity.totalOvertimeHours} OT Hours
              </p>
            </div>
            <div className="bg-purple-100 p-2 rounded-full">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Metrics */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Revenue Overview</h3>
          <span className="text-sm text-gray-500">Company Financial Health</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-xl font-bold text-green-600">${adminDashboard.revenue.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Completed Revenue</p>
            <p className="text-xl font-bold text-blue-600">${adminDashboard.revenue.completedProjectsRevenue.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Pending Revenue</p>
            <p className="text-xl font-bold text-yellow-600">${adminDashboard.revenue.pendingRevenue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* People Load Snapshot */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">People Load Snapshot</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/admin/user-management" className="bg-green-50 p-4 rounded-lg border border-green-200 hover:bg-green-100 hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Active Staff</p>
                <p className="text-2xl font-bold text-green-800">{adminDashboard.staff.activeStaffCount}</p>
              </div>
              <div className="bg-green-100 p-2 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </Link>
          <Link to="/admin/user-management" className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:bg-gray-100 hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 font-medium">Idle Staff</p>
                <p className="text-2xl font-bold text-gray-800">{adminDashboard.staff.totalStaffCount - adminDashboard.staff.activeStaffCount}</p>
              </div>
              <div className="bg-gray-100 p-2 rounded-full">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 10a6 6 0 00-6-6H3a6 6 0 006 6h6z" />
                </svg>
              </div>
            </div>
          </Link>
          <Link to="/projects" className="bg-orange-50 p-4 rounded-lg border border-orange-200 hover:bg-orange-100 hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-medium">At-Risk Projects</p>
                <p className="text-2xl font-bold text-orange-800">{adminDashboard.delayedProjects.length}</p>
              </div>
              <div className="bg-orange-100 p-2 rounded-full">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Charts Section */}
      {activeTab === 'overview' && (
        <>
          {/* Project Status Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Project Status Distribution</h3>
              <p className="text-sm text-gray-600 mb-4">{projectInsight}</p>
              <div className="h-64">
                <Doughnut data={projectStatusData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    }
                  }
                }} />
              </div>
              <div className="mt-4 bg-gray-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Top Insights</h4>
                <ul className="space-y-1">
                  {projectInsights.map((item, index) => (
                    <li key={index}>
                      <Link to={item.link} className="text-sm text-blue-600 hover:text-blue-800 block">
                        {item.name}: {item.value}
                      </Link>
                    </li>
                  ))}
                </ul>
                {projectInsights.length === 0 && <p className="text-sm text-gray-500 mt-2">No delayed projects at this time.</p>}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Task Status Overview</h3>
              <p className="text-sm text-gray-600 mb-4">{taskInsight}</p>
              <div className="h-64">
                <Bar data={taskStatusData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    }
                  }
                }} />
              </div>
              <div className="mt-4 bg-gray-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Top Insights</h4>
                <ul className="space-y-1">
                  {taskInsights.map((item, index) => (
                    <li key={index}>
                      <Link to={item.link} className="text-sm text-blue-600 hover:text-blue-800 block">
                        {item.name}: {item.value}
                      </Link>
                    </li>
                  ))}
                </ul>
                {taskInsights.length === 0 && <p className="text-sm text-gray-500 mt-2">No task insights available.</p>}
              </div>
            </div>
          </div>

          {/* Productivity and Revenue Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{timeContext === 'today' ? 'Today\'s' : timeContext === 'week' ? 'This Week\'s' : 'This Month\'s'} Productivity Metrics</h3>
              <p className="text-sm text-gray-600 mb-4">{productivityInsight}</p>
              <div className="h-64">
                <Bar data={productivityData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    }
                  }
                }} />
              </div>
              <div className="mt-4 bg-gray-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Top Insights</h4>
                <ul className="space-y-1">
                  {productivityInsights.map((item, index) => (
                    <li key={index}>
                      <Link to={item.link} className="text-sm text-blue-600 hover:text-blue-800 block">
                        {item.name}: {item.value}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{timeContext === 'today' ? 'Today\'s' : timeContext === 'week' ? 'This Week\'s' : 'This Month\'s'} Revenue Distribution</h3>
              <p className="text-sm text-gray-600 mb-4">{revenueInsight}</p>
              <div className="h-64">
                <Doughnut data={revenueData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    }
                  }
                }} />
              </div>
              <div className="mt-4 bg-gray-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Top Insights</h4>
                <ul className="space-y-1">
                  {revenueInsights.map((item, index) => (
                    <li key={index}>
                      <Link to={item.link} className="text-sm text-blue-600 hover:text-blue-800 block">
                        {item.name}: {item.value}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Risk Assessment Section */}
      {activeTab === 'analytics' && (
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Project Risk Assessment</h3>
          <p className="text-sm text-gray-600 mb-4">
            Top {adminDashboard.delayedProjects.length} delayed projects requiring immediate attention
          </p>
          <div className="h-64 mb-6">
            <Bar data={riskData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: true,
                  position: 'top'
                }
              },
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }} />
          </div>

          {/* Delayed Projects Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Delayed</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impact</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue at Risk</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {adminDashboard.delayedProjects.slice(0, 5).map((project, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{project.name}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        {project.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                      {project.daysDelayed} days
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                      {project.impact}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-red-600">
                      ${project.potentialRevenueLoss?.toLocaleString() || 'N/A'}
                    </td>
                  </tr>
                ))}
                {adminDashboard.delayedProjects.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-3 py-4 text-center text-sm text-gray-500">
                      No delayed projects found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reports Section */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link to="/admin/reports/project-performance" className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Project Performance</h3>
                <p className="text-sm text-gray-600">Detailed analysis of all projects with performance scores and metrics</p>
              </div>
              <div className="bg-blue-100 p-2 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </Link>

          <Link to="/admin/reports/manager-performance" className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Manager Performance</h3>
                <p className="text-sm text-gray-600">Evaluate manager effectiveness and project delivery rates</p>
              </div>
              <div className="bg-green-100 p-2 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </Link>

          <Link to="/admin/reports/staff-productivity" className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Staff Productivity</h3>
                <p className="text-sm text-gray-600">Individual performance metrics and productivity analysis</p>
              </div>
              <div className="bg-purple-100 p-2 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 10a6 6 0 00-6-6H3a6 6 0 006 6h6z" />
                </svg>
              </div>
            </div>
          </Link>

          <Link to="/admin/reports/attendance" className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Attendance Analysis</h3>
                <p className="text-sm text-gray-600">Comprehensive attendance tracking and patterns</p>
              </div>
              <div className="bg-yellow-100 p-2 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </Link>

          <Link to="/admin/reports/delay-risk" className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Delay & Risk Analysis</h3>
                <p className="text-sm text-gray-600">Identify at-risk projects and potential revenue loss</p>
              </div>
              <div className="bg-red-100 p-2 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;