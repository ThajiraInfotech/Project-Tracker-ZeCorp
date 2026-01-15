import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import api from '../store/api';
import { toast } from 'react-toastify';
import {
  getAdminDashboardData,
  getProjectPerformanceReport,
  getManagerPerformanceReport,
  getStaffProductivityReport,
  getAttendanceReport,
  getDelayRiskAnalysisReport
} from '../store/reportSlice';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import {
  FaChartLine,
  FaProjectDiagram,
  FaTasks,
  FaClock,
  FaExclamationTriangle,
  FaDownload,
  FaFilter,
  FaCalendarAlt,
  FaUsers,
  FaDollarSign,
  FaCheckCircle,
  FaTimesCircle,
  FaHourglassHalf
} from 'react-icons/fa';
import UserAvatar from '../components/UserAvatar';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Reports = () => {
  const [projectReports, setProjectReports] = useState([]);
  const [taskReports, setTaskReports] = useState([]);
  const [attendanceReports, setAttendanceReports] = useState([]);
  const [managerReports, setManagerReports] = useState([]);
  const [staffReports, setStaffReports] = useState([]);
  const [delayRiskReports, setDelayRiskReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportType, setReportType] = useState('dashboard');
  const [timeContext, setTimeContext] = useState('today');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [showFilters, setShowFilters] = useState(false);

  const auth = useSelector((state) => state.auth);
  const reportData = useSelector((state) => state.reports);
  const dispatch = useDispatch();

  // Fetch reports data
  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard data
      if (reportType === 'dashboard') {
        await dispatch(getAdminDashboardData(timeContext));
      }
      // Fetch project reports
      else if (reportType === 'projects') {
        const response = await dispatch(getProjectPerformanceReport());
        if (response.payload?.success) {
          setProjectReports(response.payload.report);
        }
      }
      // Fetch manager reports
      else if (reportType === 'managers') {
        const response = await dispatch(getManagerPerformanceReport());
        if (response.payload?.success) {
          setManagerReports(response.payload.report);
        }
      }
      // Fetch staff reports
      else if (reportType === 'staff') {
        const response = await dispatch(getStaffProductivityReport());
        if (response.payload?.success) {
          setStaffReports(response.payload.report);
        }
      }
      // Fetch attendance reports
      else if (reportType === 'attendance') {
        const response = await dispatch(getAttendanceReport({
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear()
        }));
        if (response.payload?.success) {
          setAttendanceReports(response.payload.report);
        }
      }
      // Fetch delay risk reports
      else if (reportType === 'risks') {
        const response = await dispatch(getDelayRiskAnalysisReport());
        if (response.payload?.success) {
          setDelayRiskReports(response.payload.report);
        }
      }

    } catch (error) {
      console.error('Error fetching reports:', error);
      setError(error.message || 'Failed to fetch reports');
      toast.error('Failed to fetch reports: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.isAuthenticated) {
      fetchReports();
    }
  }, [auth.isAuthenticated, reportType, timeContext]);

  // Export report function
  const exportReport = async (format = 'pdf') => {
    try {
      // For now, just show a toast as backend export is not fully implemented
      toast.info('Export functionality will be available soon');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  // Chart data generators
  const getProjectStatusChartData = () => {
    const dashboard = reportData.adminDashboardData?.dashboard;
    if (!dashboard) return null;

    return {
      labels: ['In Progress', 'Completed', 'Planning', 'On Hold'],
      datasets: [{
        data: [
          dashboard.projects.totalProjectsInProgress,
          dashboard.projects.totalProjectsCompleted,
          dashboard.projects.totalProjects - dashboard.projects.totalProjectsInProgress - dashboard.projects.totalProjectsCompleted - dashboard.projects.totalProjectsDelayed,
          dashboard.projects.totalProjectsDelayed
        ],
        backgroundColor: [
          'rgba(234, 122, 122, 0.8)', // theme-400
          'rgba(112, 6, 6, 0.8)', // theme-500
          'rgba(101, 5, 5, 0.8)', // theme-600
          'rgba(82, 4, 4, 0.8)' // theme-700
        ],
        borderColor: [
          'rgb(234, 122, 122)',
          'rgb(112, 6, 6)',
          'rgb(101, 5, 5)',
          'rgb(82, 4, 4)'
        ],
        borderWidth: 1
      }]
    };
  };

  const getTaskCompletionChartData = () => {
    const dashboard = reportData.adminDashboardData?.dashboard;
    if (!dashboard) return null;

    return {
      labels: ['Completed Tasks', 'Overdue Tasks', 'Pending Tasks'],
      datasets: [{
        label: 'Tasks',
        data: [
          dashboard.tasks.totalTasksCompleted,
          dashboard.tasks.totalTasksOverdue,
          0 // Would need to calculate pending
        ],
        backgroundColor: [
          'rgba(112, 6, 6, 0.8)',
          'rgba(234, 122, 122, 0.8)',
          'rgba(242, 169, 169, 0.8)'
        ]
      }]
    };
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    const statusConfig = {
      'planning': { bg: 'bg-blue-100', text: 'text-blue-800', icon: FaHourglassHalf },
      'in-progress': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: FaTasks },
      'on-hold': { bg: 'bg-orange-100', text: 'text-orange-800', icon: FaExclamationTriangle },
      'completed': { bg: 'bg-green-100', text: 'text-green-800', icon: FaCheckCircle },
      'cancelled': { bg: 'bg-red-100', text: 'text-red-800', icon: FaTimesCircle },
      'todo': { bg: 'bg-gray-100', text: 'text-gray-800', icon: FaHourglassHalf },
      'delayed': { bg: 'bg-red-100', text: 'text-red-800', icon: FaExclamationTriangle },
      'Present': { bg: 'bg-green-100', text: 'text-green-800', icon: FaCheckCircle },
      'Absent': { bg: 'bg-red-100', text: 'text-red-800', icon: FaTimesCircle },
      'Half-day': { bg: 'bg-blue-100', text: 'text-blue-800', icon: FaClock }
    };

    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: FaHourglassHalf };
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="text-xs" />
        {status}
      </span>
    );
  };

  // Project report card
  const ProjectReportCard = ({ project }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-100"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{project.projectName}</h3>
          <p className="text-sm text-gray-600">{project.clientName}</p>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Budget</p>
          <p className="font-semibold text-green-600">₹{project.budget?.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Team Size</p>
          <p className="font-semibold">{project.teamSize || 0} members</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Start Date</p>
          <p className="font-semibold">{new Date(project.startDate).toLocaleDateString()}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-500 text-xs uppercase tracking-wide">End Date</p>
          <p className="font-semibold">{new Date(project.endDate).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-gray-700 text-sm font-medium">Progress</p>
          <p className="text-sm font-semibold text-theme-600">{project.progress || 0}%</p>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${project.progress || 0}%` }}
            transition={{ duration: 1, delay: 0.5 }}
            className="h-3 bg-gradient-to-r from-theme-500 to-theme-600 rounded-full"
          ></motion.div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <FaTasks className="text-gray-400" />
          <span className="text-sm text-gray-600">{project.tasksCompleted || 0} tasks completed</span>
        </div>
        <div className="flex items-center gap-2">
          <FaCheckCircle className="text-green-500" />
          <span className="text-sm font-medium text-green-600">{project.onTimeCompletion || 0}% on time</span>
        </div>
      </div>
    </motion.div>
  );

  // Task report card
  const TaskReportCard = ({ task }) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
        <div className="flex gap-2">
          <StatusBadge status={task.status} />
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${task.priority === 'high' ? 'bg-red-100 text-red-800' : task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
            {task.priority} priority
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <p className="text-gray-500">Project</p>
          <p className="font-medium">{task.project?.projectName || 'N/A'}</p>
        </div>
        <div>
          <p className="text-gray-500">Assigned To</p>
          <p className="font-medium">{task.assignedTo?.fullName || 'Unassigned'}</p>
        </div>
        <div>
          <p className="text-gray-500">Due Date</p>
          <p className="font-medium">{new Date(task.deadline).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-gray-500">Progress</p>
          <p className="font-medium">{task.progress || 0}%</p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-gray-500 text-sm mb-1">Progress</p>
        <div className="w-full h-2 bg-gray-200 rounded-full">
          <div
            className="h-2 bg-theme-600 rounded-full"
            style={{ width: `${task.progress || 0}%` }}
          ></div>
        </div>
      </div>
    </div>
  );

  // Attendance report card
  const AttendanceReportCard = ({ record }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-100"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{record.userName}</h3>
          <p className="text-sm text-gray-600">{record.department || 'Department'}</p>
        </div>
        <div className="text-right">
          <StatusBadge status={record.attendanceRate >= 90 ? 'Present' : 'Half-day'} />
          <p className="text-sm text-gray-500 mt-1">{record.attendanceRate}% attendance</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div className="bg-theme-50 rounded-lg p-3">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Days Present</p>
          <p className="font-semibold text-theme-600">{record.daysPresent}</p>
        </div>
        <div className="bg-theme-50 rounded-lg p-3">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Total Hours</p>
          <p className="font-semibold text-theme-600">{record.totalHours?.toFixed(1) || 0}h</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Overtime</p>
          <p className="font-semibold text-yellow-600">{record.overtimeHours?.toFixed(1) || 0}h</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Days Late</p>
          <p className="font-semibold text-red-600">{record.daysLate}</p>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaClock className="text-gray-400" />
            <span className="text-sm text-gray-600">Average daily hours: {(record.totalHours / (record.daysPresent || 1)).toFixed(1)}h</span>
          </div>
          {record.attendanceRate >= 95 && (
            <div className="flex items-center gap-1 text-green-600">
              <FaCheckCircle />
              <span className="text-sm font-medium">Perfect Attendance</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-theme-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Enterprise Reports & Analytics</h1>
            <p className="text-gray-600">Real-time insights and comprehensive performance analytics</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <FaFilter className="text-gray-600" />
              Filters
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => exportReport('pdf')}
              className="flex items-center gap-2 px-4 py-2 bg-theme-600 text-white rounded-lg hover:bg-theme-700 transition-colors"
            >
              <FaDownload />
              Export
            </motion.button>
          </div>
        </motion.div>

        {/* Filters Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-xl p-6 mb-6 shadow-lg border"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Context</label>
                <select
                  value={timeContext}
                  onChange={(e) => setTimeContext(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-theme-500 focus:border-transparent"
                >
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-theme-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-theme-500 focus:border-transparent"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Report Type Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 mb-8 shadow-lg border"
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { key: 'dashboard', label: 'Dashboard', icon: FaChartLine },
              { key: 'projects', label: 'Projects', icon: FaProjectDiagram },
              { key: 'managers', label: 'Managers', icon: FaUsers },
              { key: 'staff', label: 'Staff', icon: FaUsers },
              { key: 'attendance', label: 'Attendance', icon: FaClock },
              { key: 'risks', label: 'Risk Analysis', icon: FaExclamationTriangle }
            ].map(({ key, label, icon: Icon }) => (
              <motion.button
                key={key}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setReportType(key)}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-all ${reportType === key
                  ? 'bg-theme-600 text-white shadow-lg'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <Icon className="text-xl" />
                <span className="text-sm font-medium">{label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Loading state */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col justify-center items-center h-64 bg-white rounded-xl shadow-lg"
          >
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-theme-600 mb-4"></div>
            <p className="text-gray-600">Loading enterprise analytics...</p>
          </motion.div>
        )}

        {/* Error state */}
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 border-l-4 border-red-500 p-6 rounded-xl"
          >
            <div className="flex items-center">
              <FaTimesCircle className="h-6 w-6 text-red-500 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error Loading Reports</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Dashboard view */}
        {reportType === 'dashboard' && !loading && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                {
                  title: 'Total Projects',
                  value: reportData.adminDashboardData?.dashboard?.projects?.totalProjects || 0,
                  icon: FaProjectDiagram,
                  color: 'blue',
                  change: '+12%'
                },
                {
                  title: 'Active Tasks',
                  value: reportData.adminDashboardData?.dashboard?.tasks?.totalTasksCompleted || 0,
                  icon: FaTasks,
                  color: 'green',
                  change: '+8%'
                },
                {
                  title: 'Team Members',
                  value: reportData.adminDashboardData?.dashboard?.staff?.totalStaffCount || 0,
                  icon: FaUsers,
                  color: 'purple',
                  change: '+5%'
                },
                {
                  title: 'Revenue',
                  value: `₹${(reportData.adminDashboardData?.dashboard?.revenue?.totalRevenue || 0).toLocaleString()}`,
                  icon: FaDollarSign,
                  color: 'emerald',
                  change: '+15%'
                }
              ].map((kpi, index) => (
                <motion.div
                  key={kpi.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ scale: 1.02 }}
                  className={`bg-white rounded-xl p-6 shadow-lg border-l-4 ${index === 0 ? 'border-theme-500' : `border-${kpi.color}-500`}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                      <p className={`text-sm mt-1 ${index === 0 ? 'text-theme-600' : `text-${kpi.color}-600`}`}>{kpi.change} from last month</p>
                    </div>
                    <div className={`p-3 rounded-full ${index === 0 ? 'bg-theme-100' : `bg-${kpi.color}-100`}`}>
                      <kpi.icon className={`text-xl ${index === 0 ? 'text-theme-600' : `text-${kpi.color}-600`}`} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Project Status Chart */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-xl p-6 shadow-lg"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FaChartLine className="text-theme-600" />
                  Project Status Distribution
                </h3>
                {getProjectStatusChartData() && (
                  <div className="h-64">
                    <Doughnut data={getProjectStatusChartData()} options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                        }
                      }
                    }} />
                  </div>
                )}
              </motion.div>

              {/* Task Completion Chart */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-xl p-6 shadow-lg"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FaTasks className="text-theme-600" />
                  Task Performance
                </h3>
                {getTaskCompletionChartData() && (
                  <div className="h-64">
                    <Bar data={getTaskCompletionChartData()} options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true
                        }
                      }
                    }} />
                  </div>
                )}
              </motion.div>
            </div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-xl p-6 shadow-lg"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {[
                  { action: 'Project "E-commerce Platform" completed', time: '2 hours ago', type: 'success' },
                  { action: 'New team member joined', time: '4 hours ago', type: 'info' },
                  { action: 'Task deadline approaching', time: '6 hours ago', type: 'warning' }
                ].map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full ${activity.type === 'success' ? 'bg-green-500' :
                      activity.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Projects view */}
        {reportType === 'projects' && !loading && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {projectReports.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-lg">
                <FaProjectDiagram className="mx-auto w-16 h-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Reports</h3>
                <p className="text-gray-500">There are no project reports available.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {projectReports.map((project, index) => (
                  <motion.div
                    key={project._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <ProjectReportCard project={project} />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Managers view */}
        {reportType === 'managers' && !loading && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {managerReports.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-lg">
                <FaUsers className="mx-auto w-16 h-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Manager Reports</h3>
                <p className="text-gray-500">There are no manager performance reports available.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {managerReports.map((manager, index) => (
                  <motion.div
                    key={manager.managerId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <UserAvatar
                        user={{ fullName: manager.managerName, _id: manager.managerId }}
                        size="custom"
                        className="w-12 h-12 bg-theme-100 text-theme-600"
                      />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{manager.managerName}</h3>
                        <p className="text-sm text-gray-600">Performance Score: {manager.performanceScore}%</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Projects Managed</p>
                        <p className="font-semibold">{manager.projectsManaged}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Completion Rate</p>
                        <p className="font-semibold text-green-600">{manager.projectCompletionRate}%</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Staff view */}
        {reportType === 'staff' && !loading && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {staffReports.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-lg">
                <FaUsers className="mx-auto w-16 h-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Staff Reports</h3>
                <p className="text-gray-500">There are no staff productivity reports available.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {staffReports.map((staff, index) => (
                  <motion.div
                    key={staff.staffId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <UserAvatar
                        user={{ fullName: staff.staffName, _id: staff.staffId }}
                        size="custom"
                        className="w-12 h-12 bg-theme-100 text-theme-600"
                      />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{staff.staffName}</h3>
                        <p className="text-sm text-gray-600">Productivity: {staff.productivityScore}%</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Tasks Completed</p>
                        <p className="font-semibold">{staff.tasksCompleted}/{staff.tasksAssigned}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Total Hours</p>
                        <p className="font-semibold text-theme-600">{staff.totalHours}h</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Attendance view */}
        {reportType === 'attendance' && !loading && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {attendanceReports.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-lg">
                <FaClock className="mx-auto w-16 h-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Reports</h3>
                <p className="text-gray-500">There are no attendance reports available.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {attendanceReports.map((record, index) => (
                  <motion.div
                    key={record.userId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <AttendanceReportCard record={record} />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Risk Analysis view */}
        {reportType === 'risks' && !loading && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Delayed Projects */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FaExclamationTriangle className="text-red-600" />
                  Delayed Projects
                </h3>
                {delayRiskReports.delayedProjects?.length === 0 ? (
                  <p className="text-gray-500">No delayed projects</p>
                ) : (
                  <div className="space-y-3">
                    {delayRiskReports.delayedProjects?.map((project, index) => (
                      <div key={index} className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                        <h4 className="font-medium text-gray-900">{project.projectName}</h4>
                        <p className="text-sm text-gray-600">Delayed by {project.daysDelayed} days</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* At Risk Projects */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FaHourglassHalf className="text-yellow-600" />
                  At Risk Projects
                </h3>
                {delayRiskReports.atRiskProjects?.length === 0 ? (
                  <p className="text-gray-500">No projects at risk</p>
                ) : (
                  <div className="space-y-3">
                    {delayRiskReports.atRiskProjects?.map((project, index) => (
                      <div key={index} className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                        <h4 className="font-medium text-gray-900">{project.projectName}</h4>
                        <p className="text-sm text-gray-600">{project.daysUntilDeadline} days left</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Reports;