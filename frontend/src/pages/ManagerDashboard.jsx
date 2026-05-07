import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import api from '../store/api';
import { socket } from '../App';
import { toast } from 'react-toastify';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  LineElement,
  PointElement
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
  LineElement,
  PointElement
);

const ManagerDashboard = () => {
  const dispatch = useDispatch();
  const { user, loading: authLoading } = useSelector((state) => state.auth);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState('loading'); // 'api', 'fallback', 'loading'
  const [userLoadingTimeout, setUserLoadingTimeout] = useState(null);

  const [timeContext, setTimeContext] = useState('today');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refresh data function
  const refreshData = async () => {
    setIsRefreshing(true);
    if (user && user.id) {
      await fetchManagerData();
    }
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  // Export to CSV function
  const exportToCSV = (data, filename) => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + data.map(row => row.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export reports
  const exportReports = () => {
    const reportData = [
      ["Metric", "Value"],
      ["Total Projects", totalProjects],
      ["Active Projects", inProgressProjects],
      ["Total Tasks", totalTasks],
      ["Completed Tasks", completedTasks],
      ["Overdue Tasks", overdueTasks],
      ["Team Members", teamMembers],
      ["Upcoming Deadlines", upcomingDeadlines],
      ["Completion Rate", `${averageCompletionRate}%`],
      ["Avg Project Duration", `${averageProjectDuration} days`]
    ];
    exportToCSV(reportData, `manager_report_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Report exported successfully');
  };

  // Define fetchManagerData function outside useEffect so it can be called manually
  const fetchManagerData = async () => {
    try {
      setLoading(true);

      // Fetch projects - backend already filters by role
      console.log('Fetching projects for manager...');
      const projectsResponse = await api.get('/projects');
      console.log('Projects response:', projectsResponse.data);
      const projectsData = projectsResponse.data.projects || projectsResponse.data;
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      console.log('Projects set:', projectsData);

      // Fetch all tasks - backend will filter appropriately
      const tasksResponse = await api.get('/tasks');
      const tasksData = tasksResponse.data.tasks || tasksResponse.data || [];
      setTasks(Array.isArray(tasksData) ? tasksData : []);

      // Fetch staff for assignment (only staff assigned to manager's projects)
      const staffResponse = await api.get('/auth/staff-for-manager');
      const staffData = staffResponse.data.users || staffResponse.data || [];
      setStaff(Array.isArray(staffData) ? staffData : []);

      setError(null); // Clear any previous errors
      setDataSource('api');
      setLastUpdated(new Date());

    } catch (err) {
      console.error('Error fetching manager data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load data');
      toast.error('Failed to load dashboard data');

      // Error occurred, will show error message
      setDataSource('error');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    // Clear any existing timeout
    if (userLoadingTimeout) {
      clearTimeout(userLoadingTimeout);
    }

    // If auth is still loading, wait for it to complete
    if (authLoading) {
      setLoading(true);
      return;
    }

    // Only fetch data if user is loaded and has an ID
    if (user && user.id) {
      fetchManagerData();
    } else {
      // User is not authenticated or auth check failed
      setLoading(false);
      setError('Please log in to access the dashboard');
    }

    // Cleanup timeout on unmount
    return () => {
      if (userLoadingTimeout) {
        clearTimeout(userLoadingTimeout);
      }
    };
  }, [user, authLoading]);

  // Real-time updates via socket
  useEffect(() => {
    if (!user?.id) return;
    const events = [
      'task_created', 'task_updated', 'task_deleted',
      'project_created', 'project_updated', 'project_deleted'
    ];
    const handleUpdate = () => {
      fetchManagerData();
    };
    events.forEach(event => socket.on(event, handleUpdate));
    return () => {
      events.forEach(event => socket.off(event, handleUpdate));
    };
  }, [user?.id]);

  // Calculate statistics
  const totalProjects = projects.length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const inProgressProjects = projects.filter(p => p.status === 'in-progress').length;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const overdueTasks = tasks.filter(t => t.isOverdue).length;

  // Advanced KPIs
  const teamMembers = staff.length;
  const atRiskTasks = tasks.filter(t => {
    if (t.status === 'completed') return false;
    const endDate = t.deadline ? new Date(t.deadline) : null;
    if (!endDate) return false;
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 2);
    return endDate >= now && endDate <= nextWeek;
  }).length;

  const delayedProjectsCount = projects.filter(p =>
    p.status === 'on-hold' ||
    p.status === 'delayed' ||
    (p.endDate && new Date(p.endDate) < new Date() && p.status !== 'completed')
  ).length;

  const averageCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Average project duration for completed projects
  const completedProjectDurations = projects
    .filter(p => p.status === 'completed' && p.startDate && p.endDate)
    .map(p => {
      const start = new Date(p.startDate);
      const end = new Date(p.endDate);
      return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    });
  const averageProjectDuration = completedProjectDurations.length > 0
    ? Math.round(completedProjectDurations.reduce((a, b) => a + b, 0) / completedProjectDurations.length)
    : 0;

  // Chart data
  const projectStatusData = {
    labels: ['Completed', 'In Progress', 'Planning', 'On Hold'],
    datasets: [
      {
        data: [
          completedProjects,
          inProgressProjects,
          projects.filter(p => p.status === 'planning').length,
          projects.filter(p => p.status === 'on-hold').length
        ],
        backgroundColor: [
          '#4CAF50',
          '#700606',
          '#FFC107',
          '#9C27B0'
        ],
        hoverBackgroundColor: [
          '#66BB6A',
          '#900808',
          '#FFB74D',
          '#AB47BC'
        ]
      }
    ]
  };

  const taskStatusData = {
    labels: ['Completed', 'Overdue', 'In Progress', 'To Do'],
    datasets: [
      {
        label: 'Tasks',
        data: [
          completedTasks,
          overdueTasks,
          tasks.filter(t => t.status === 'in-progress').length,
          tasks.filter(t => t.status === 'todo').length
        ],
        backgroundColor: [
          '#4CAF50',
          '#F44336',
          '#700606',
          '#FFC107'
        ]
      }
    ]
  };

  // Team workload chart
  const teamWorkloadData = {
    labels: staff.map(member => member.fullName.split(' ')[0]), // First name
    datasets: [
      {
        label: 'Assigned Tasks',
        data: staff.map(member => tasks.filter(task => task.assignedTo?._id === member._id).length),
        backgroundColor: '#700606',
        borderColor: '#900808',
        borderWidth: 1
      }
    ]
  };

  // Insights
  const projectInsight = `${delayedProjectsCount} project${delayedProjectsCount !== 1 ? 's' : ''} delayed, ${completedProjects} completed.`;
  const taskInsight = `${overdueTasks} task${overdueTasks !== 1 ? 's' : ''} overdue, ${atRiskTasks} at risk.`;
  const teamInsight = `Managing ${teamMembers} team member${teamMembers !== 1 ? 's' : ''} with ${averageCompletionRate}% average completion rate.`;

  // Top insights data
  const projectInsights = [
    { name: 'Active Projects', value: inProgressProjects, link: '/projects?filter=active' },
    { name: 'Completed Projects', value: completedProjects, link: '/projects?status=completed' },
    { name: 'Planning Phase', value: projects.filter(p => p.status === 'planning').length, link: '/projects?status=planning' }
  ].filter(item => item.value > 0).slice(0, 3);

  const taskInsights = [
    { name: 'Overdue Tasks', value: overdueTasks, link: '/tasks?filter=overdue' },
    { name: 'At Risk Tasks', value: atRiskTasks, link: '/tasks?filter=at-risk' },
    { name: 'In Progress', value: tasks.filter(t => t.status === 'in-progress').length, link: '/tasks?status=in-progress' },
    { name: 'Completed', value: completedTasks, link: '/tasks?status=completed' }
  ].filter(item => item.value > 0).slice(0, 3);

  const teamInsights = [
    { name: 'Team Members', value: teamMembers, link: '/team' },
    { name: 'Completion Rate', value: `${averageCompletionRate}%`, link: '/team' },
    { name: 'Avg Duration', value: `${averageProjectDuration} days`, link: '/projects?status=completed' }
  ].slice(0, 3);

  // Show loading if either auth is loading or dashboard data is loading
  if (authLoading || loading) {
    return (
      <div className="space-y-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen p-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen p-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
          <div className="text-center py-12">
            <div className="bg-red-100 p-4 rounded-full w-fit mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load dashboard data</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={refreshData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-gradient-to-br from-slate-50 to-[#700606]/5 min-h-full p-6">
      {/* Manager Header */}
      <div className="bg-gradient-to-r from-[#700606] to-[#a04040] rounded-xl p-4 md:p-6 mb-6 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div className="w-full md:w-auto">
            <h1 className="text-2xl md:text-4xl font-bold mb-2">Manager Dashboard</h1>
            <p className="text-white/80 text-sm">Enterprise Project Management Console</p>
            {dataSource === 'fallback' && (
              <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Showing sample data - API unavailable
              </div>
            )}
            {dataSource === 'api' && (
              <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Live data from API
              </div>
            )}
          </div>
          <div className="flex items-center justify-between w-full md:w-auto md:space-x-6">
            <div className="text-left md:text-right">
              <p className="text-sm text-white">Welcome, {user?.fullName}</p>
              <p className="text-xs text-white/80">Project Manager</p>
              {lastUpdated && (
                <p className="text-xs text-white/70">Last updated: {lastUpdated.toLocaleTimeString()}</p>
              )}
            </div>
            <button
              onClick={refreshData}
              disabled={isRefreshing}
              className="p-2 bg-[#700606]/20 hover:bg-[#700606]/30 rounded-full transition-all duration-300 disabled:opacity-50 ml-4 md:ml-0"
              title="Refresh Data"
            >
              <svg className={`w-5 h-5 text-[#700606] ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

          </div>
        </div>
      </div>

      {/* Time Context Toggle */}
      <div className="bg-white/60 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-4">
        <div className="flex flex-col md:flex-row items-center justify-center space-y-3 md:space-y-0 md:space-x-4">
          <span className="text-sm font-medium text-gray-700">Time Context:</span>
          <div className="flex bg-gray-100 rounded-lg p-1 w-full md:w-auto overflow-x-auto">
            <button
              className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 whitespace-nowrap ${timeContext === 'today'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
                }`}
              onClick={() => setTimeContext('today')}
            >
              Today
            </button>
            <button
              className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 whitespace-nowrap ${timeContext === 'week'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
                }`}
              onClick={() => setTimeContext('week')}
            >
              This Week
            </button>
            <button
              className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 whitespace-nowrap ${timeContext === 'month'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
                }`}
              onClick={() => setTimeContext('month')}
            >
              This Month
            </button>
          </div>
        </div>
      </div>

      {/* Action Required Section */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-xl shadow-lg border border-orange-200/50 backdrop-blur-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
          <div className="bg-orange-100 p-2 rounded-full mr-3">
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          Action Required
        </h2>
        <p className="text-sm text-gray-600 mb-6">Critical items requiring immediate attention</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Overdue Tasks */}
          <Link to="/tasks?filter=overdue" className="bg-white/80 p-6 rounded-xl border border-red-200/50 hover:bg-red-50 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-red-700 font-semibold uppercase tracking-wide">Overdue Tasks</p>
                <p className="text-3xl font-bold text-red-800 mt-2">{overdueTasks}</p>
                {overdueTasks === 0 && <p className="text-xs text-red-600 mt-2">All tasks on track</p>}
                <div className="mt-2 flex items-center">
                  <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">Critical</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* At-Risk Tasks */}
          <Link to="/tasks?filter=at-risk" className="bg-white/80 p-6 rounded-xl border border-yellow-200/50 hover:bg-yellow-50 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-yellow-700 font-semibold uppercase tracking-wide">At-Risk Tasks</p>
                <p className="text-3xl font-bold text-yellow-800 mt-2">{atRiskTasks}</p>
                {atRiskTasks === 0 && <p className="text-xs text-yellow-600 mt-2">No tasks at risk</p>}
                <div className="mt-2 flex items-center">
                  <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">Due within 7 days</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Delayed Projects */}
          <Link to="/projects?filter=delayed" className="bg-white/80 p-6 rounded-xl border border-red-200/50 hover:bg-red-50 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-red-700 font-semibold uppercase tracking-wide">Delayed Projects</p>
                <p className="text-3xl font-bold text-red-800 mt-2">{delayedProjectsCount}</p>
                {delayedProjectsCount === 0 && <p className="text-xs text-red-600 mt-2">All projects on track</p>}
                <div className="mt-2 flex items-center">
                  <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">Action Required</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>
      </div>


      {/* Summary Cards - Enhanced for Manager */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Project Metrics */}
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20 hover:shadow-xl hover:scale-105 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Projects</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{totalProjects}</p>
              <p className="text-xs text-gray-500 mt-3 flex items-center space-x-4">
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  {completedProjects} Completed
                </span>
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-[#700606] rounded-full mr-1"></div>
                  {inProgressProjects} Active
                </span>
              </p>
            </div>
            <div className="bg-gradient-to-br from-[#700606]/20 to-[#700606]/30 p-3 rounded-xl">
              <svg className="w-7 h-7 text-[#700606]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Staff Metrics */}
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20 hover:shadow-xl hover:scale-105 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Team Members</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{teamMembers}</p>
              <p className="text-xs text-gray-500 mt-3 flex items-center">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-1"></div>
                Active staff under management
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-purple-200 p-3 rounded-xl">
              <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Task Metrics */}
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20 hover:shadow-xl hover:scale-105 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Task Status</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{completedTasks}</p>
              <p className="text-xs text-gray-500 mt-3 flex items-center space-x-4">
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                  {overdueTasks} Overdue
                </span>
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
                  {atRiskTasks} At Risk
                </span>
              </p>
            </div>
            <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 p-3 rounded-xl">
              <svg className="w-7 h-7 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Productivity Metrics */}
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20 hover:shadow-xl hover:scale-105 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Productivity</p>
              <p className="text-3xl font-bold text-[#700606] mt-2">{averageCompletionRate}%</p>
              <p className="text-xs text-gray-500 mt-3 flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                Average completion rate
              </p>
            </div>
            <div className="bg-gradient-to-br from-[#700606]/20 to-[#700606]/30 p-3 rounded-xl">
              <svg className="w-7 h-7 text-[#700606]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="space-y-8 mt-8">

        {/* Project Status Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <div className="bg-blue-100 p-2 rounded-full mr-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              Project Status Distribution
            </h3>
            <p className="text-sm text-gray-600 mb-6">{projectInsight}</p>
            <div className="h-64 mb-6">
              <Doughnut data={projectStatusData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      padding: 20,
                      usePointStyle: true
                    }
                  }
                }
              }} />
            </div>
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200/50">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Top Insights
              </h4>
              <ul className="space-y-2">
                {projectInsights.map((item, index) => (
                  <li key={index}>
                    <Link to={item.link} className="text-sm text-blue-600 hover:text-blue-800 block p-2 rounded-lg hover:bg-blue-50 transition-colors">
                      <span className="font-medium">{item.name}:</span> {item.value}
                    </Link>
                  </li>
                ))}
              </ul>
              {projectInsights.length === 0 && <p className="text-sm text-gray-500 mt-2">No project insights available.</p>}
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <div className="bg-green-100 p-2 rounded-full mr-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              Task Status Overview
            </h3>
            <p className="text-sm text-gray-600 mb-6">{taskInsight}</p>
            <div className="h-64 mb-6">
              <Bar data={taskStatusData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(0,0,0,0.05)'
                    }
                  },
                  x: {
                    grid: {
                      display: false
                    }
                  }
                }
              }} />
            </div>
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200/50">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Top Insights
              </h4>
              <ul className="space-y-2">
                {taskInsights.map((item, index) => (
                  <li key={index}>
                    <Link to={item.link} className="text-sm text-blue-600 hover:text-blue-800 block p-2 rounded-lg hover:bg-blue-50 transition-colors">
                      <span className="font-medium">{item.name}:</span> {item.value}
                    </Link>
                  </li>
                ))}
              </ul>
              {taskInsights.length === 0 && <p className="text-sm text-gray-500 mt-2">No task insights available.</p>}
            </div>
          </div>
        </div>

        {/* Team Workload Chart */}
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <div className="bg-purple-100 p-2 rounded-full mr-3">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            Team Workload Distribution
          </h3>
          <p className="text-sm text-gray-600 mb-6">{teamInsight}</p>
          <div className="h-64 mb-6">
            <Bar data={teamWorkloadData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: {
                    color: 'rgba(0,0,0,0.05)'
                  },
                  ticks: {
                    stepSize: 1
                  }
                },
                x: {
                  grid: {
                    display: false
                  }
                }
              }
            }} />
          </div>
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200/50">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <svg className="w-4 h-4 text-purple-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Top Insights
            </h4>
            <ul className="space-y-2">
              {teamInsights.map((item, index) => (
                <li key={index}>
                  <Link to={item.link} className="text-sm text-blue-600 hover:text-blue-800 block p-2 rounded-lg hover:bg-blue-50 transition-colors">
                    <span className="font-medium">{item.name}:</span> {item.value}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Reports Section */}
      {/* Detailed Reports Section */}
      <div className="pt-8 border-t border-gray-200/50">
        <h3 className="text-xl font-bold text-gray-900 mb-6 px-1">Detailed Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Link to="/projects" className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-white/20 hover:shadow-xl hover:scale-105 transition-all duration-300 group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">Project Reports</h3>
                <p className="text-sm text-gray-600 leading-relaxed">Detailed analysis of all managed projects</p>
              </div>
              <div className="bg-gradient-to-br from-blue-100 to-blue-200 p-3 rounded-xl group-hover:from-blue-200 group-hover:to-blue-300 transition-all">
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center text-blue-600 group-hover:text-blue-700">
              <span className="text-sm font-medium">View Reports</span>
              <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link to="/tasks" className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-white/20 hover:shadow-xl hover:scale-105 transition-all duration-300 group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-green-600 transition-colors">Task Analytics</h3>
                <p className="text-sm text-gray-600 leading-relaxed">Task completion rates and performance metrics</p>
              </div>
              <div className="bg-gradient-to-br from-green-100 to-green-200 p-3 rounded-xl group-hover:from-green-200 group-hover:to-green-300 transition-all">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center text-green-600 group-hover:text-green-700">
              <span className="text-sm font-medium">View Analytics</span>
              <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link to="/team" className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-white/20 hover:shadow-xl hover:scale-105 transition-all duration-300 group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-purple-600 transition-colors">Team Performance</h3>
                <p className="text-sm text-gray-600 leading-relaxed">Individual and team productivity analysis</p>
              </div>
              <div className="bg-gradient-to-br from-purple-100 to-purple-200 p-3 rounded-xl group-hover:from-purple-200 group-hover:to-purple-300 transition-all">
                <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center text-purple-600 group-hover:text-purple-700">
              <span className="text-sm font-medium">View Performance</span>
              <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
