import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../store/api';
import { toast } from 'react-toastify';
import KanbanBoard from '../components/KanbanBoard';
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

const StaffDashboard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTask, setSelectedTask] = useState(null);
  const [viewMode, setViewMode] = useState('kanban');
  const [showTaskModal, setShowTaskModal] = useState(false);

  useEffect(() => {
    const fetchStaffData = async () => {
      try {
        setLoading(true);

        // Fetch tasks assigned to this user
        const tasksResponse = await api.get('/tasks');
        const allTasks = tasksResponse.data.tasks;
        setTasks(allTasks);

        // Fetch projects for context
        const projectsResponse = await api.get('/projects');
        const allProjects = projectsResponse.data.projects;
        // Filter projects that have tasks assigned to this user
        const projectIds = allTasks.map(task => task.project?._id || task.project).filter(Boolean);
        const staffProjects = allProjects.filter(project => projectIds.includes(project._id));
        setProjects(staffProjects);

        // Fetch attendance for this user
        const attendanceResponse = await api.get('/attendance/me');
        const staffAttendance = attendanceResponse.data.attendance;
        setAttendance(staffAttendance);

      } catch (err) {
        console.error('Error fetching staff data:', err);
        setError(err.response?.data?.message || err.message);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchStaffData();
    }
  }, [user?.id]);

  // Update task status and progress
  const updateTaskStatusAndProgress = async (taskId, status, progress) => {
    try {
      const response = await api.patch(`/tasks/${taskId}/status`, { status, progress });

      if (response.data.success) {
        // Update local state
        setTasks(tasks.map(task =>
          task._id === taskId ? response.data.task : task
        ));
        toast.success('Task updated successfully!');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  // Calculate statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
  const overdueTasks = tasks.filter(t => t.isOverdue).length;

  const totalCheckIns = attendance.length;
  const presentDays = attendance.filter(a => a.status === 'Present').length;
  const halfDayCount = attendance.filter(a => a.status === 'Half-day').length;
  const absentCount = attendance.filter(a => a.status === 'Absent').length;

  // Chart data
  const taskStatusData = {
    labels: ['Completed', 'In Progress', 'Overdue', 'To Do'],
    datasets: [
      {
        data: [
          completedTasks,
          inProgressTasks,
          overdueTasks,
          tasks.filter(t => t.status === 'todo').length
        ],
        backgroundColor: [
          '#4CAF50',
          '#2196F3',
          '#F44336',
          '#FFC107'
        ]
      }
    ]
  };

  const attendanceData = {
    labels: ['Present', 'Half-day', 'Absent'],
    datasets: [
      {
        data: [
          presentDays,
          halfDayCount,
          absentCount
        ],
        backgroundColor: [
          '#4CAF50',
          '#FF9800',
          '#F44336'
        ]
      }
    ]
  };

  if (loading) {
    return (
      <div className="space-y-6 bg-gradient-to-br from-slate-50 to-[#700606]/5 min-h-screen p-6">
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
      <div className="space-y-6 bg-gradient-to-br from-slate-50 to-[#700606]/5 min-h-screen p-6">
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
              onClick={() => window.location.reload()}
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
    <div className="space-y-6 bg-gradient-to-br from-slate-50 to-[#700606]/5 min-h-screen p-6">
      {/* Staff Header */}
      <div className="bg-gradient-to-r from-[#700606] to-[#a04040] rounded-xl p-6 mb-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Staff Dashboard</h1>
            <p className="text-white/80 text-sm">Task Management & Productivity Tracking</p>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-sm text-white">Welcome, {user?.fullName}</p>
              <p className="text-xs text-white/80">Staff Member</p>
            </div>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user?.fullName?.charAt(0)?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { id: 'overview', name: 'Overview', icon: '📊' },
              { id: 'tasks', name: 'My Tasks', icon: '📋' },
              { id: 'projects', name: 'My Projects', icon: '🏗️' },
              { id: 'time', name: 'Time Tracking', icon: '⏱️' },
              { id: 'performance', name: 'Performance', icon: '📈' }
            ].filter(tab => tab.id !== 'projects' && tab.id !== 'time' && tab.id !== 'performance').map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-1 py-2 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <div className="bg-blue-100 p-2 rounded-full mr-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  Task Status Distribution
                </h3>
                <p className="text-sm text-gray-600 mb-6">{`${completedTasks} completed, ${inProgressTasks} in progress, ${overdueTasks} overdue.`}</p>
                <div className="h-64 mb-6">
                  <Doughnut data={taskStatusData} options={{
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
                    <li>
                      <Link to="/tasks?filter=completed" className="text-sm text-blue-600 hover:text-blue-800 block p-2 rounded-lg hover:bg-blue-50 transition-colors">
                        <span className="font-medium">Completed Tasks:</span> {completedTasks}
                      </Link>
                    </li>
                    <li>
                      <Link to="/tasks?filter=overdue" className="text-sm text-blue-600 hover:text-blue-800 block p-2 rounded-lg hover:bg-blue-50 transition-colors">
                        <span className="font-medium">Overdue Tasks:</span> {overdueTasks}
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <div className="bg-green-100 p-2 rounded-full mr-3">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  Attendance Overview
                </h3>
                <p className="text-sm text-gray-600 mb-6">{`${presentDays} present, ${halfDayCount} half-days, ${absentCount} absent.`}</p>
                <div className="h-64 mb-6">
                  <Doughnut data={attendanceData} options={{
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
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Top Insights
                  </h4>
                  <ul className="space-y-2">
                    <li>
                      <Link to="/attendance" className="text-sm text-blue-600 hover:text-blue-800 block p-2 rounded-lg hover:bg-blue-50 transition-colors">
                        <span className="font-medium">Present Days:</span> {presentDays}
                      </Link>
                    </li>
                    <li>
                      <Link to="/attendance" className="text-sm text-blue-600 hover:text-blue-800 block p-2 rounded-lg hover:bg-blue-50 transition-colors">
                        <span className="font-medium">Attendance Rate:</span> {totalCheckIns > 0 ? Math.round((presentDays / totalCheckIns) * 100) : 0}%
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">My Tasks</h2>
            </div>

            {/* Task Kanban Board */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {['todo', 'in-progress', 'completed', 'delayed'].map((status) => {
                const statusTasks = tasks.filter(task => task.status === status);
                const statusConfig = {
                  'todo': { title: 'To Do', color: 'bg-slate-100 border-slate-200' },
                  'in-progress': { title: 'In Progress', color: 'bg-amber-100 border-amber-200' },
                  'completed': { title: 'Completed', color: 'bg-emerald-100 border-emerald-200' },
                  'delayed': { title: 'Delayed', color: 'bg-red-100 border-red-200' }
                };

                return (
                  <div key={status} className={`rounded-xl p-4 ${statusConfig[status].color}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">{statusConfig[status].title}</h3>
                      <span className="bg-white px-2 py-1 rounded-full text-xs font-medium text-gray-600">
                        {statusTasks.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {statusTasks.map((task) => (
                        <motion.div
                          key={task._id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white rounded-lg p-3 shadow-sm border-2 border-gray-100 hover:border-gray-300 transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedTask(task);
                            setShowTaskModal(true);
                          }}
                        >
                          <h4 className="font-medium text-gray-900 mb-1">{task.title}</h4>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                            <span>{task.project?.projectName || 'No Project'}</span>
                            <span className={task.isOverdue ? 'text-red-600' : ''}>
                              {new Date(task.deadline).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <PriorityBadge priority={task.priority} />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        )}

        {/* Task Details Modal */}
        {showTaskModal && selectedTask && (() => {
          const project = projects.find(p => p._id === (selectedTask.project?._id || selectedTask.project));
          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white/90 backdrop-blur-sm rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-gray-900">Task Details</h3>
                  <button
                    onClick={() => setShowTaskModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <h4 className="text-2xl font-bold text-gray-900 mb-2">{selectedTask.title}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedTask.priority === 'high' ? 'bg-red-100 text-red-800' :
                        selectedTask.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {selectedTask.priority} priority
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedTask.status === 'completed' ? 'bg-green-100 text-green-800' :
                        selectedTask.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                        selectedTask.status === 'todo' ? 'bg-gray-100 text-gray-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {selectedTask.status}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-lg font-medium text-gray-900 mb-2">Description</h5>
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedTask.description || 'No description provided'}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="text-lg font-medium text-gray-900 mb-3">Task Information</h5>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm font-medium text-gray-500">Project:</span>
                          <p className="text-sm text-gray-900">{project?.projectName || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Assigned To:</span>
                          <p className="text-sm text-gray-900">{selectedTask.assignedTo?.fullName || selectedTask.assignedTo?.name || 'Unassigned'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Deadline:</span>
                          <p className="text-sm text-gray-900">{new Date(selectedTask.deadline).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Created:</span>
                          <p className="text-sm text-gray-900">{selectedTask.createdAt ? new Date(selectedTask.createdAt).toLocaleDateString() : 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-lg font-medium text-gray-900 mb-3">Progress</h5>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-700">Progress</span>
                            <span className="font-medium text-gray-700">{selectedTask.progress || 0}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300"
                              style={{ width: `${selectedTask.progress || 0}%` }}
                            ></div>
                          </div>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Estimated Hours:</span>
                          <p className="text-sm text-gray-900">{selectedTask.estimatedHours || 'Not set'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Actual Hours:</span>
                          <p className="text-sm text-gray-900">{selectedTask.actualHours || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedTask.comments && selectedTask.comments.length > 0 && (
                    <div>
                      <h5 className="text-lg font-medium text-gray-900 mb-3">Comments</h5>
                      <div className="space-y-3">
                        {selectedTask.comments.map((comment, index) => (
                          <div key={index} className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-900">{comment.author?.fullName || 'Unknown'}</span>
                              <span className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-gray-700">{comment.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                    <div>
                      <h5 className="text-lg font-medium text-gray-900 mb-3">Attachments</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedTask.attachments.map((attachment, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                              <p className="text-xs text-gray-500">{attachment.size}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default StaffDashboard;
                        <div>
                          <span className="text-sm font-medium text-gray-500">Estimated Hours:</span>
                          <p className="text-sm text-gray-900">{selectedTask.estimatedHours || 'Not set'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Actual Hours:</span>
                          <p className="text-sm text-gray-900">{selectedTask.actualHours || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedTask.comments && selectedTask.comments.length > 0 && (
                    <div>
                      <h5 className="text-lg font-medium text-gray-900 mb-3">Comments</h5>
                      <div className="space-y-3">
                        {selectedTask.comments.map((comment, index) => (
                          <div key={index} className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-900">{comment.author?.fullName || 'Unknown'}</span>
                              <span className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-gray-700">{comment.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                    <div>
                      <h5 className="text-lg font-medium text-gray-900 mb-3">Attachments</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedTask.attachments.map((attachment, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                              <p className="text-xs text-gray-500">{attachment.size}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default StaffDashboard;