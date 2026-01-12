import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import api from '../store/api';
import { toast } from 'react-toastify';
import TaskCreateModal from '../components/TaskCreateModal';
import { formatDiscussionContent } from '../utils/mentionUtils';

const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showAssignTeamModal, setShowAssignTeamModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTaskActionsModal, setShowTaskActionsModal] = useState(false);
  const [selectedTaskForActions, setSelectedTaskForActions] = useState(null);
  const [staff, setStaff] = useState([]);

  // Filter states for tasks tab
  const [taskFilters, setTaskFilters] = useState({
    status: 'all',
    priority: 'all',
    search: ''
  });

  const auth = useSelector((state) => state.auth);

  // Fetch project details
  const fetchProject = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/projects/${id}`);

      if (response.data.success && response.data.project) {
        setProject(response.data.project);
      } else {
        throw new Error('Project not found');
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      setError(error.message || 'Failed to fetch project');
      toast.error('Failed to fetch project: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch project tasks
  const fetchProjectTasks = async () => {
    try {
      const response = await api.get(`/tasks/project/${id}`);
      if (response.data.success && response.data.tasks) {
        setTasks(response.data.tasks);
      }
    } catch (error) {
      console.error('Error fetching project tasks:', error);
      setTasks([]);
    }
  };

  // Fetch staff for task assignment
  const fetchStaff = async () => {
    try {
      const response = await api.get('/auth/staff-for-manager');
      if (response.data.success && response.data.users) {
        setStaff(response.data.users);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      setStaff([]);
    }
  };


  useEffect(() => {
    if (auth.isAuthenticated && id) {
      fetchProject();
      fetchProjectTasks();
      fetchStaff();
    }
  }, [auth.isAuthenticated, id]);

  // Helper functions
  const getProgress = (status) => {
    switch (status) {
      case 'planning': return 25;
      case 'in-progress': return 60;
      case 'completed': return 100;
      case 'on-hold': return 40;
      case 'cancelled': return 0;
      default: return 50;
    }
  };

  const getRiskBadge = (project) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(project.endDate);
    if (project.status === 'delayed' || project.status === 'on-hold' || (endDate < today && project.status !== 'completed')) {
      return { text: 'At Risk', color: 'bg-red-100 text-red-800' };
    }
    return { text: 'On Track', color: 'bg-green-100 text-green-800' };
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    const statusColors = {
      'planning': 'bg-blue-100 text-blue-800',
      'in-progress': 'bg-yellow-100 text-yellow-800',
      'on-hold': 'bg-orange-100 text-orange-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  // Task status badge
  const TaskStatusBadge = ({ status }) => {
    const statusColors = {
      'todo': 'bg-gray-100 text-gray-800',
      'in-progress': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'delayed': 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  // Task priority badge
  const TaskPriorityBadge = ({ priority }) => {
    const priorityColors = {
      'low': 'bg-green-100 text-green-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'high': 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[priority] || 'bg-gray-100 text-gray-800'}`}>
        {priority} priority
      </span>
    );
  };

  // Filtered tasks
  const filteredTasks = tasks.filter(task => {
    const matchesStatus = taskFilters.status === 'all' || task.status === taskFilters.status;
    const matchesPriority = taskFilters.priority === 'all' || task.priority === taskFilters.priority;
    const matchesSearch = taskFilters.search === '' ||
      task.title.toLowerCase().includes(taskFilters.search.toLowerCase()) ||
      task.description.toLowerCase().includes(taskFilters.search.toLowerCase());

    return matchesStatus && matchesPriority && matchesSearch;
  });

  // Tab components
  const OverviewTab = () => {
    if (!project) return null;

    const progress = getProgress(project.status);
    const risk = getRiskBadge(project);
    const manager = project.manager?.fullName || 'John Doe';

    return (
      <div className="space-y-8">
        {/* Description */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 shadow-sm border border-blue-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-3 text-xl">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Project Description
          </h3>
          <p className="text-gray-700 leading-relaxed text-lg">{project.description}</p>
        </div>

        {/* Client Information and Project Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-8 shadow-sm border border-green-100">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-3 text-xl">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Client Information
            </h3>
            <div className="space-y-3">
              <p className="text-gray-700"><span className="font-semibold">Name:</span> {project.clientName}</p>
              <p className="text-gray-700"><span className="font-semibold">Email:</span> {project.clientEmail}</p>
              <p className="text-gray-700"><span className="font-semibold">Phone:</span> {project.clientPhone}</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-8 shadow-sm border border-purple-100">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-3 text-xl">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Project Details
            </h3>
            <div className="space-y-3">
              <p className="text-gray-700"><span className="font-semibold">Type:</span> {project.projectType}</p>
              <p className="text-gray-700 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-semibold">Location:</span> {project.location}
              </p>
              <p className="text-gray-700"><span className="font-semibold">Manager:</span> {manager}</p>
            </div>
          </div>
        </div>

        {/* Timeline and Financials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-8 shadow-sm border border-yellow-100">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-3 text-xl">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Project Timeline
            </h3>
            <div className="space-y-3 mb-6">
              <p className="text-gray-700"><span className="font-semibold">Start:</span> {new Date(project.startDate).toLocaleDateString()}</p>
              <p className="text-gray-700"><span className="font-semibold">End:</span> {new Date(project.endDate).toLocaleDateString()}</p>
            </div>
            <div>
              <div className="flex justify-between items-center text-sm mb-3">
                <span className="text-gray-600 font-medium">Progress</span>
                <span className="font-bold text-primary-600">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-3">
                <div
                  className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Tasks completed:</span> {tasks.filter(t => t.status === 'completed').length} / {tasks.length}
              </p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-8 shadow-sm border border-teal-100">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-3 text-xl">
              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              Financial Overview
            </h3>
            <div className="space-y-3">
              <p className="text-gray-700 text-lg"><span className="font-semibold">Budget:</span> ₹{project.budget?.toLocaleString()}</p>
              <p className="text-gray-700"><span className="font-semibold">Spent:</span> Expense tracking coming soon</p>
              <p className="text-gray-700"><span className="font-semibold">Status:</span> <span className={`font-bold ${risk.color} px-2 py-1 rounded-full text-sm`}>{risk.text}</span></p>
            </div>
          </div>
        </div>

        {/* Team Members */}
        {project.teamMembers && project.teamMembers.length > 0 && (
          <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-8 shadow-sm border border-pink-100">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-3 text-xl">
              <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Team Members
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {project.teamMembers.map((member, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-semibold text-primary-700">
                      {member.fullName?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{member.fullName || `Member ${index + 1}`}</p>
                    <p className="text-sm text-gray-500">Team Member</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const TasksTab = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Tasks</label>
            <input
              type="text"
              placeholder="Search by title or description..."
              value={taskFilters.search}
              onChange={(e) => setTaskFilters({...taskFilters, search: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={taskFilters.status}
              onChange={(e) => setTaskFilters({...taskFilters, status: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="delayed">Delayed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={taskFilters.priority}
              onChange={(e) => setTaskFilters({...taskFilters, priority: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Tasks Found</h3>
          <p className="text-gray-500">No tasks match the current filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredTasks.map((task) => (
            <div key={task._id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">{task.title}</h3>
                  <p className="text-sm text-gray-500 mb-2">Project: {task.project?.projectName || 'N/A'}</p>
                </div>
                <div className="flex gap-2">
                  <TaskStatusBadge status={task.status} />
                  <TaskPriorityBadge priority={task.priority} />
                </div>
              </div>

              <p className="text-gray-600 mb-6 line-clamp-2">{task.description}</p>

              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-500 font-medium">Assigned To</p>
                  <p className="font-semibold text-gray-900">{task.assignedTo?.fullName || 'Unassigned'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-500 font-medium">Due Date</p>
                  <p className="font-semibold text-gray-900">{new Date(task.deadline).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex-1 mr-4">
                  <div className="flex justify-between items-center text-sm mb-2">
                    <p className="text-gray-500 font-medium">Progress</p>
                    <p className="font-bold text-primary-600">{task.progress || 0}%</p>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-3 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${task.progress || 0}%` }}
                    ></div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedTaskForActions(task);
                    setShowTaskActionsModal(true);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tasks Summary */}
      {filteredTasks.length > 0 && (
        <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-8 shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Tasks Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">📋</span>
                <p className="text-gray-600 text-sm font-semibold">Total Tasks</p>
              </div>
              <p className="text-4xl font-bold text-blue-600">{filteredTasks.length}</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">⏳</span>
                <p className="text-gray-600 text-sm font-semibold">To Do</p>
              </div>
              <p className="text-4xl font-bold text-gray-600">
                {filteredTasks.filter(t => t.status === 'todo').length}
              </p>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🔄</span>
                <p className="text-gray-600 text-sm font-semibold">In Progress</p>
              </div>
              <p className="text-4xl font-bold text-yellow-600">
                {filteredTasks.filter(t => t.status === 'in-progress').length}
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">✅</span>
                <p className="text-gray-600 text-sm font-semibold">Completed</p>
              </div>
              <p className="text-4xl font-bold text-green-600">
                {filteredTasks.filter(t => t.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const TeamTab = () => {
    // Combine manager and team members
    const teamList = [];
    if (project?.manager) {
      teamList.push({ ...project.manager, role: 'Project Manager' });
    }
    if (project?.teamMembers && project.teamMembers.length > 0) {
      project.teamMembers.forEach(member => {
        teamList.push({ ...member, role: 'Team Member' });
      });
    }

    return (
      <div className="space-y-8">
        <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Project Team
          </h3>
          {teamList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {teamList.map((member, index) => (
                <div key={member._id || index} className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-xl font-bold text-primary-700">
                        {member.fullName?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg">{member.fullName || `Member ${index + 1}`}</h4>
                      <p className="text-sm text-gray-500 font-medium">{member.role}</p>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm">
                    <p className="text-gray-700 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium">Email:</span> {member.email || 'Not provided'}
                    </p>
                    <p className="text-gray-700 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span className="font-medium">Phone:</span> {member.phone || 'Not provided'}
                    </p>
                    <p className="text-gray-700 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="font-medium">Role:</span> {member.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6 shadow-sm">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">No Team Assigned</h3>
              <p className="text-gray-600 text-lg">No manager or team members have been assigned to this project yet.</p>
            </div>
          )}
        </div>

        {/* Discussion Section */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-8 shadow-sm border border-indigo-100">
          <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-3 text-xl">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Activity & Discussion
          </h3>
          
          {/* Add Discussion Form */}
          <div className="mb-6">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <textarea
                placeholder="Start a discussion... Type @username to mention team members"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                rows={3}
                value={discussionContent}
                onChange={(e) => setDiscussionContent(e.target.value)}
              />
              <div className="flex justify-between items-center mt-3">
                <div className="text-xs text-gray-500">
                  Tip: Type @username to mention team members
                </div>
                <button
                  onClick={handleAddDiscussion}
                  disabled={!discussionContent.trim() || addingDiscussion}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingDiscussion ? 'Posting...' : 'Post Discussion'}
                </button>
              </div>
            </div>
          </div>

          {/* Discussions List */}
          <div className="space-y-4">
            {project.discussions && project.discussions.length > 0 ? (
              project.discussions.map((discussion, index) => {
                // Get all users (manager + team members) for mention highlighting
                const allUsers = [];
                if (project.manager) allUsers.push(project.manager);
                if (project.teamMembers) allUsers.push(...project.teamMembers);
                
                const formattedContent = formatDiscussionContent(discussion, allUsers);

                return (
                  <div key={discussion._id || index} className={`p-4 rounded-lg ${discussion.system ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-gray-200'} ${discussion.parentDiscussionId ? 'ml-8 border-l-4 border-l-gray-300' : ''}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-900">{discussion.author?.fullName || 'Unknown'}</span>
                      {discussion.system && <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">System</span>}
                      {discussion.parentDiscussionId && <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">Reply</span>}
                      <span className="text-xs text-gray-500">{new Date(discussion.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="text-sm text-gray-700">
                      {formattedContent.map((part, partIndex) => {
                        if (part.type === 'mention') {
                          return (
                            <span
                              key={partIndex}
                              className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded font-medium cursor-pointer hover:bg-blue-200"
                              title={`@${part.username}`}
                            >
                              {part.content}
                            </span>
                          );
                        }
                        return <span key={partIndex}>{part.content}</span>;
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500 italic">No discussions yet</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const BudgetTab = () => (
    <div className="space-y-8">
      <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
          <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          Budget Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-8 shadow-md border border-green-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 text-lg">Total Budget</h4>
                <p className="text-green-600 text-sm font-medium">Allocated Amount</p>
              </div>
            </div>
            <p className="text-4xl font-bold text-green-600">₹{project?.budget?.toLocaleString() || 'N/A'}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 shadow-md border border-blue-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 text-lg">Budget Status</h4>
                <p className="text-blue-600 text-sm font-medium">Tracking System</p>
              </div>
            </div>
            <p className="text-lg text-gray-700 font-medium">Budget tracking and expense management features are coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );


  // Assign Team Modal
  const AssignTeamModal = () => {
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [assigning, setAssigning] = useState(false);

    const handleAssignTeam = async () => {
      if (selectedUsers.length === 0) {
        toast.error('Please select at least one team member');
        return;
      }

      setAssigning(true);
      try {
        for (const userId of selectedUsers) {
          await api.post(`/projects/${id}/team`, { userId });
        }
        toast.success('Team members assigned successfully!');
        setShowAssignTeamModal(false);
        setSelectedUsers([]);
        fetchProject(); // Refresh project data
      } catch (error) {
        console.error('Error assigning team:', error);
        toast.error('Failed to assign team members: ' + (error.response?.data?.message || error.message));
      } finally {
        setAssigning(false);
      }
    };

    const availableStaff = staff.filter(s => !project?.teamMembers?.some(tm => tm._id === s._id));

    if (!showAssignTeamModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Assign Team Members</h2>
            <button
              onClick={() => setShowAssignTeamModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-gray-600">Select team members to add to this project:</p>

            {availableStaff.length === 0 ? (
              <p className="text-gray-500 text-center py-4">All available staff are already assigned to this project.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableStaff.map((member) => (
                  <label key={member._id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(member._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers([...selectedUsers, member._id]);
                        } else {
                          setSelectedUsers(selectedUsers.filter(id => id !== member._id));
                        }
                      }}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-700">
                          {member.fullName?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.fullName}</p>
                        <p className="text-sm text-gray-500">{member.username}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowAssignTeamModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              disabled={assigning}
            >
              Cancel
            </button>
            <button
              onClick={handleAssignTeam}
              disabled={assigning || selectedUsers.length === 0}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {assigning ? 'Assigning...' : 'Assign Team'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Task Actions Modal
  const TaskActionsModal = () => {
    if (!showTaskActionsModal || !selectedTaskForActions) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Task Details & Actions</h2>
            <button
              onClick={() => {
                setShowTaskActionsModal(false);
                setSelectedTaskForActions(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Task Details */}
          <div className="space-y-4 mb-6">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Task Information</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-lg font-semibold">{selectedTaskForActions.title}</p>
                <p className="text-gray-600">{selectedTaskForActions.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>Priority: <span className={`font-medium ${
                    selectedTaskForActions.priority === 'high' ? 'text-red-600' :
                    selectedTaskForActions.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
                  }`}>{selectedTaskForActions.priority}</span></span>
                  <span>Status: <span className={`font-medium ${
                    selectedTaskForActions.status === 'completed' ? 'text-green-600' :
                    selectedTaskForActions.status === 'in-progress' ? 'text-blue-600' : 'text-gray-600'
                  }`}>{selectedTaskForActions.status}</span></span>
                  <span>Progress: {selectedTaskForActions.progress || 0}%</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>Assigned to: {selectedTaskForActions.assignedTo?.fullName || 'Unassigned'}</span>
                  <span>Due: {new Date(selectedTaskForActions.deadline).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Project Actions */}
          <div>
            <h3 className="font-medium text-gray-700 mb-4">Project Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => {
                  setShowTaskActionsModal(false);
                  setSelectedTaskForActions(null);
                  navigate('/tasks');
                }}
                className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <div className="text-center">
                  <svg className="w-8 h-8 text-blue-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="font-medium text-blue-900">View All Tasks</p>
                  <p className="text-sm text-blue-700">Go to tasks page</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowTaskActionsModal(false);
                  setSelectedTaskForActions(null);
                  setShowEditModal(true);
                }}
                className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
              >
                <div className="text-center">
                  <svg className="w-8 h-8 text-green-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <p className="font-medium text-green-900">Edit Project</p>
                  <p className="text-sm text-green-700">Modify project details</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowTaskActionsModal(false);
                  setSelectedTaskForActions(null);
                  setShowAssignTeamModal(true);
                }}
                className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <div className="text-center">
                  <svg className="w-8 h-8 text-purple-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <p className="font-medium text-purple-900">Assign Team</p>
                  <p className="text-sm text-purple-700">Manage team members</p>
                </div>
              </button>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={() => {
                setShowTaskActionsModal(false);
                setSelectedTaskForActions(null);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Edit Project Modal
  const EditProjectModal = () => {
    const [editForm, setEditForm] = useState({
      projectName: project?.projectName || '',
      description: project?.description || '',
      clientName: project?.clientName || '',
      clientEmail: project?.clientEmail || '',
      clientPhone: project?.clientPhone || '',
      startDate: project?.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
      endDate: project?.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
      budget: project?.budget || '',
      location: project?.location || ''
    });
    const [updating, setUpdating] = useState(false);

    const handleEditSubmit = async (e) => {
      e.preventDefault();
      setUpdating(true);
      try {
        const updateData = {
          ...editForm,
          budget: editForm.budget ? parseFloat(editForm.budget) : undefined
        };
        const response = await api.put(`/projects/${id}`, updateData);
        if (response.data.success) {
          toast.success('Project updated successfully!');
          setShowEditModal(false);
          fetchProject(); // Refresh project data
        }
      } catch (error) {
        console.error('Error updating project:', error);
        toast.error('Failed to update project: ' + (error.response?.data?.message || error.message));
      } finally {
        setUpdating(false);
      }
    };

    if (!showEditModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Edit Project</h2>
            <button
              onClick={() => setShowEditModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleEditSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
                <input
                  type="text"
                  value={editForm.projectName}
                  onChange={(e) => setEditForm({...editForm, projectName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Budget (₹)</label>
                <input
                  type="number"
                  value={editForm.budget}
                  onChange={(e) => setEditForm({...editForm, budget: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step="1000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Client Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client Name</label>
                  <input
                    type="text"
                    value={editForm.clientName}
                    onChange={(e) => setEditForm({...editForm, clientName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client Email</label>
                  <input
                    type="email"
                    value={editForm.clientEmail}
                    onChange={(e) => setEditForm({...editForm, clientEmail: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client Phone</label>
                  <input
                    type="tel"
                    value={editForm.clientPhone}
                    onChange={(e) => setEditForm({...editForm, clientPhone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Project Timeline</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({...editForm, startDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm({...editForm, endDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input
                type="text"
                value={editForm.location}
                onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                disabled={updating}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                disabled={updating}
              >
                {updating ? 'Updating...' : 'Update Project'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Project Not Found</h3>
        <p className="text-gray-500">The requested project could not be found.</p>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', component: OverviewTab },
    { id: 'tasks', label: 'Tasks', component: TasksTab },
    { id: 'team', label: 'Team', component: TeamTab },
    { id: 'budget', label: 'Budget', component: BudgetTab }
  ];

  const ActiveTabComponent = tabs.find(tab => tab.id === activeTab)?.component || OverviewTab;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-white to-gray-50 rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/projects')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-1">{project.projectName}</h1>
              <p className="text-gray-600 text-lg">Enterprise Project Management Hub</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <StatusBadge status={project.status} />
            <div className="text-right">
              <p className="text-sm text-gray-500 font-medium">Project Manager</p>
              <p className="font-semibold text-gray-900">{project.manager?.fullName || 'John Doe'}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <button
            onClick={() => setShowTaskModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Task
          </button>
          <button
            onClick={() => setShowAssignTeamModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            Assign Team
          </button>
          <button
            onClick={() => setShowEditModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Project
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-8 overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50">
          <nav className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-8 py-5 text-sm font-semibold border-b-3 transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 bg-white shadow-sm'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-8">
          <ActiveTabComponent />
        </div>
      </div>

      {/* Task Creation Modal */}
      <TaskCreateModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        project={project}
        staff={staff}
        onTaskCreated={() => {
          fetchProjectTasks();
        }}
      />

      {/* Assign Team Modal */}
      <AssignTeamModal />

      {/* Edit Project Modal */}
      <EditProjectModal />

      {/* Task Actions Modal */}
      <TaskActionsModal />
    </div>
  );
};

export default ProjectDetailPage;