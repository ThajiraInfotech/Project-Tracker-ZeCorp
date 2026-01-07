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
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(156, 163, 175, 0.8)',
          'rgba(245, 101, 101, 0.8)'
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(34, 197, 94)',
          'rgb(156, 163, 175)',
          'rgb(245, 101, 101)'
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
          'rgba(34, 197, 94, 0.8)',
          'rgba(245, 101, 101, 0.8)',
          'rgba(251, 191, 36, 0.8)'
        ]
      }]
    };
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    const statusColors = {
      'planning': 'bg-blue-100 text-blue-800',
      'in-progress': 'bg-yellow-100 text-yellow-800',
      'on-hold': 'bg-orange-100 text-orange-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
      'todo': 'bg-gray-100 text-gray-800',
      'in-progress': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'delayed': 'bg-red-100 text-red-800',
      'Present': 'bg-green-100 text-green-800',
      'Absent': 'bg-red-100 text-red-800',
      'Half-day': 'bg-blue-100 text-blue-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  // Project report card
  const ProjectReportCard = ({ project }) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{project.projectName}</h3>
        <StatusBadge status={project.status} />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <p className="text-gray-500">Client</p>
          <p className="font-medium">{project.clientName}</p>
        </div>
        <div>
          <p className="text-gray-500">Budget</p>
          <p className="font-medium text-green-600">₹{project.budget?.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-gray-500">Start Date</p>
          <p className="font-medium">{new Date(project.startDate).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-gray-500">End Date</p>
          <p className="font-medium">{new Date(project.endDate).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-gray-500 text-sm mb-1">Progress</p>
        <div className="w-full h-2 bg-gray-200 rounded-full">
          <div
            className="h-2 bg-primary-600 rounded-full"
            style={{ width: `${project.progress || 0}%` }}
          ></div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <p className="text-gray-500 text-sm">Team Size</p>
          <p className="font-medium">{project.teamMembers?.length || 0} members</p>
        </div>
        <div>
          <p className="text-gray-500 text-sm">Tasks</p>
          <p className="font-medium">{project.tasksCount || 0} tasks</p>
        </div>
      </div>
    </div>
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
            className="h-2 bg-primary-600 rounded-full"
            style={{ width: `${task.progress || 0}%` }}
          ></div>
        </div>
      </div>
    </div>
  );

  // Attendance report card
  const AttendanceReportCard = ({ record }) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{record.date}</h3>
        <StatusBadge status={record.status} />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <p className="text-gray-500">Check In</p>
          <p className="font-medium">
            {record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Check Out</p>
          <p className="font-medium">
            {record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Total Hours</p>
          <p className="font-medium">{record.totalHours ? `${record.totalHours}h` : 'N/A'}</p>
        </div>
        <div>
          <p className="text-gray-500">Overtime Hours</p>
          <p className="font-medium text-green-600">{record.overtimeHours ? `${record.overtimeHours}h` : '0h'}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 text-sm">Comprehensive project and team performance reports</p>
        </div>
      </div>

      {/* Report type selector */}
      <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setReportType('dashboard')}
            className={`px-4 py-2 rounded-md ${reportType === 'dashboard' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setReportType('projects')}
            className={`px-4 py-2 rounded-md ${reportType === 'projects' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Projects
          </button>
          <button
            onClick={() => setReportType('tasks')}
            className={`px-4 py-2 rounded-md ${reportType === 'tasks' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Tasks
          </button>
          <button
            onClick={() => setReportType('attendance')}
            className={`px-4 py-2 rounded-md ${reportType === 'attendance' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Attendance
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 101.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard view */}
      {reportType === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Overview</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Projects</span>
                <span className="font-medium">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">In Progress</span>
                <span className="font-medium text-yellow-600">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Planning</span>
                <span className="font-medium text-blue-600">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Budget</span>
                <span className="font-medium text-green-600">₹0</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Overview</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Tasks</span>
                <span className="font-medium">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">In Progress</span>
                <span className="font-medium text-yellow-600">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">To Do</span>
                <span className="font-medium text-gray-600">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">High Priority</span>
                <span className="font-medium text-red-600">0</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Overview</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Members</span>
                <span className="font-medium">1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Admins</span>
                <span className="font-medium">1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Managers</span>
                <span className="font-medium">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Staff</span>
                <span className="font-medium">0</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Projects view */}
      {reportType === 'projects' && (
        <div>
          {projectReports.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 101.414-1.414L11.414 10l1.293-1.293a1 1 0 10-1.414-1.414L10 8.586 8.707 7.293z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Reports</h3>
              <p className="text-gray-500">There are no project reports available.</p>
            </div>
          )}

          {projectReports.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projectReports.map((project) => (
                <ProjectReportCard key={project._id} project={project} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tasks view */}
      {reportType === 'tasks' && (
        <div>
          {taskReports.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 101.414-1.414L11.414 10l1.293-1.293a1 1 0 10-1.414-1.414L10 8.586 8.707 7.293z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Task Reports</h3>
              <p className="text-gray-500">There are no task reports available.</p>
            </div>
          )}

          {taskReports.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {taskReports.map((task) => (
                <TaskReportCard key={task._id} task={task} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Attendance view */}
      {reportType === 'attendance' && (
        <div>
          {attendanceReports.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 101.414-1.414L11.414 10l1.293-1.293a1 1 0 10-1.414-1.414L10 8.586 8.707 7.293z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Reports</h3>
              <p className="text-gray-500">There are no attendance reports available.</p>
            </div>
          )}

          {attendanceReports.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {attendanceReports.map((record) => (
                <AttendanceReportCard key={record._id} record={record} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;