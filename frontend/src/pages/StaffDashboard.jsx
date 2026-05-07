import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import api from '../store/api';
import { socket } from '../App';
import { toast } from 'react-toastify';
import KanbanBoard from '../components/KanbanBoard';
import ChatSidebar from '../components/ChatSidebar';
import TaskDetailsModal from '../components/TaskDetailsModal';
import UserAvatar from '../components/UserAvatar';
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
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showChatSidebar, setShowChatSidebar] = useState(false);
  const [timeEntry, setTimeEntry] = useState({
    taskId: '',
    hours: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  /* viewMode removed */
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showModal, setShowModal] = useState(false); // Add this for consistency with Tasks.jsx props if needed, or just use showTaskModal

  const fetchStaffData = async (showLoading = true) => {
    if (!user?.id) return;

    try {
      if (showLoading) setLoading(true);

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
      if (showLoading) {
        setError(err.response?.data?.message || err.message);
        toast.error('Failed to load dashboard data');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      // Initial fetch
      fetchStaffData(true);

      // Set up polling every 10 seconds
      const interval = setInterval(() => {
        fetchStaffData(false);
      }, 10000);

      // Cleanup on unmount
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  // Real-time updates via socket
  useEffect(() => {
    if (!user?.id) return;
    const events = ['task_created', 'task_updated', 'task_deleted'];
    const handleUpdate = () => {
      fetchStaffData(false); // silent refresh — no loading spinner
    };
    events.forEach(event => socket.on(event, handleUpdate));
    return () => {
      events.forEach(event => socket.off(event, handleUpdate));
    };
  }, [user?.id]);

  // Time tracking function
  const handleTimeEntry = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const timeData = {
        ...timeEntry,
        hours: parseFloat(timeEntry.hours),
        user: user.id
      };

      // This would need a backend endpoint for time tracking
      // For now, just show success message
      toast.success('Time entry logged successfully!');
      setShowTimeModal(false);
      setTimeEntry({
        taskId: '',
        hours: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error logging time:', error);
      toast.error('Failed to log time entry');
    }
  };

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

  // Chart data for Overview Tab
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
    <div className="space-y-6 bg-gradient-to-br from-slate-50 to-[#700606]/5 min-h-full p-4 md:p-6">
      {/* Staff Header */}
      <div className="bg-gradient-to-r from-[#700606] to-[#a04040] rounded-xl p-6 mb-6 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1 md:mb-2">Staff Dashboard</h1>
            <p className="text-white/80 text-sm">Task Management & Productivity Tracking</p>
          </div>
          <div className="flex items-center space-x-4 md:space-x-6 self-end md:self-auto">
            <div className="text-right">
              <p className="text-sm text-white font-medium">Welcome, {user?.fullName}</p>
              <p className="text-xs text-white/80 capitalize">{user?.role} Member</p>
            </div>
            <UserAvatar
              user={user}
              size="custom"
              className="w-10 h-10 bg-white/20 text-white ring-2 ring-white/30 shadow-sm"
            />
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
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-1 py-2 border-b-2 font-medium text-sm ${activeTab === tab.id
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
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20 hover:shadow-xl hover:scale-105 transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Tasks</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{totalTasks}</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-100 to-blue-200 p-3 rounded-xl">
                    <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20 hover:shadow-xl hover:scale-105 transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Completed Tasks</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">{completedTasks}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-100 to-green-200 p-3 rounded-xl">
                    <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20 hover:shadow-xl hover:scale-105 transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Overdue Tasks</p>
                    <p className="text-3xl font-bold text-red-600 mt-2">{overdueTasks}</p>
                  </div>
                  <div className="bg-gradient-to-br from-red-100 to-red-200 p-3 rounded-xl">
                    <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20 hover:shadow-xl hover:scale-105 transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Check-ins</p>
                    <p className="text-3xl font-bold text-purple-600 mt-2">{totalCheckIns}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-100 to-purple-200 p-3 rounded-xl">
                    <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
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
                <div className="h-64 md:h-80 mb-6">
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
                <div className="h-64 md:h-80 mb-6">
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
            <h2 className="text-2xl font-bold text-gray-900">My Tasks</h2>

            {/* Task List - Kanban View Only */}
            <KanbanBoard
              tasks={tasks}
              onUpdateTaskStatus={(taskId, status, progress) => updateTaskStatusAndProgress(taskId, status, progress)}
              onTaskClick={(task) => {
                setSelectedTask(task);
                setShowTaskModal(true);
              }}
            />
          </div>
        )}




        {/* Time Tracking Modal */}
        {showTimeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl max-w-md w-full mx-4 shadow-2xl border border-white/20">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Log Time</h3>
              </div>
              <form onSubmit={handleTimeEntry} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Task</label>
                  <select
                    value={timeEntry.taskId}
                    onChange={(e) => setTimeEntry({ ...timeEntry, taskId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                    required
                  >
                    <option value="">Select a task</option>
                    {tasks.map((task) => (
                      <option key={task._id} value={task._id}>
                        {task.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hours</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0.25"
                      max="24"
                      value={timeEntry.hours}
                      onChange={(e) => setTimeEntry({ ...timeEntry, hours: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={timeEntry.date}
                      onChange={(e) => setTimeEntry({ ...timeEntry, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                  <textarea
                    value={timeEntry.description}
                    onChange={(e) => setTimeEntry({ ...timeEntry, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                    placeholder="What did you work on?"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowTimeModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Log Time
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Task Details Modal */}
        {showTaskModal && selectedTask && (
          <TaskDetailsModal
            taskId={selectedTask._id}
            onClose={() => setShowTaskModal(false)}
            currentUserRole={user?.role}
            currentUserId={user?.id}
            onTaskUpdated={(updatedTask) => {
              setTasks(tasks.map(t => t._id === updatedTask._id ? updatedTask : t));
              setSelectedTask(updatedTask);
            }}
          />
        )}

        {/* Chat Sidebar */}
        <ChatSidebar
          isOpen={showChatSidebar}
          onClose={() => setShowChatSidebar(false)}
          entityType="task"
          entityId={selectedTask?._id}
          entityTitle={selectedTask?.title || 'Task'}
          entityData={selectedTask}
        />
      </div>
    </div >
  );
};

export default StaffDashboard;