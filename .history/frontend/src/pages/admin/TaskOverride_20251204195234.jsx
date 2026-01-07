import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-toastify';

const TaskOverride = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    projectId: '',
    assignedTo: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [overrideData, setOverrideData] = useState({
    assignedTo: '',
    priority: '',
    deadline: '',
    status: ''
  });
  const [bulkData, setBulkData] = useState({
    fromUserId: '',
    toUserId: '',
    projectId: ''
  });
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);

  const auth = useSelector((state) => state.auth);

  // Fetch all tasks with filters
  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.priority) queryParams.append('priority', filters.priority);
      if (filters.projectId) queryParams.append('projectId', filters.projectId);
      if (filters.assignedTo) queryParams.append('assignedTo', filters.assignedTo);

      const response = await axios.get(`/api/tasks/admin/all?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success && response.data.tasks) {
        setTasks(response.data.tasks);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError(error.message || 'Failed to fetch tasks');
      toast.error('Failed to fetch tasks: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users and projects for dropdowns
  const fetchUsersAndProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const [usersResponse, projectsResponse] = await Promise.all([
        axios.get('/api/auth/users', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/projects', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (usersResponse.data.success) {
        setUsers(usersResponse.data.users);
      }
      if (projectsResponse.data.success) {
        setProjects(projectsResponse.data.projects);
      }
    } catch (error) {
      console.error('Error fetching users/projects:', error);
    }
  };

  // Override task
  const overrideTask = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.put(`/api/tasks/${selectedTask._id}/admin-override`, overrideData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        toast.success('Task override successful!');
        setShowOverrideModal(false);
        setSelectedTask(null);
        setOverrideData({
          assignedTo: '',
          priority: '',
          deadline: '',
          status: ''
        });
        fetchTasks(); // Refresh task list
      }
    } catch (error) {
      console.error('Error overriding task:', error);
      toast.error('Failed to override task: ' + (error.response?.data?.message || error.message));
    }
  };

  // Bulk reassign stuck tasks
  const bulkReassignStuckTasks = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post('/api/tasks/admin/reassign-stuck', bulkData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        toast.success(`Reassigned ${response.data.reassignResults.length} stuck tasks!`);
        setShowBulkModal(false);
        setBulkData({
          fromUserId: '',
          toUserId: '',
          projectId: ''
        });
        fetchTasks(); // Refresh task list
      }
    } catch (error) {
      console.error('Error bulk reassigning tasks:', error);
      toast.error('Failed to reassign tasks: ' + (error.response?.data?.message || error.message));
    }
  };

  // Force complete task
  const forceCompleteTask = async (taskId) => {
    const completionNotes = prompt('Enter completion notes (optional):');
    if (completionNotes === null) return; // User cancelled

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post(`/api/tasks/${taskId}/force-complete`, {
        completionNotes: completionNotes || 'Force completed by admin'
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        toast.success('Task force completed successfully!');
        fetchTasks(); // Refresh task list
      }
    } catch (error) {
      console.error('Error force completing task:', error);
      toast.error('Failed to force complete task: ' + (error.response?.data?.message || error.message));
    }
  };

  // Filter tasks based on search term
  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.assignedTo?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.project?.projectName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (auth.isAuthenticated) {
      fetchTasks();
      fetchUsersAndProjects();
    }
  }, [auth.isAuthenticated, filters]);

  // Priority badge component
  const PriorityBadge = ({ priority }) => {
    const priorityColors = {
      'low': 'bg-green-100 text-green-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'high': 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[priority] || 'bg-gray-100 text-gray-800'}`}>
        {priority}
      </span>
    );
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    const statusColors = {
      'todo': 'bg-gray-100 text-gray-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'delayed': 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('-', ' ')}
      </span>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Task Override Center</h1>
          <p className="text-gray-600 text-sm">Enterprise-level task management and override capabilities</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm"
          >
            Bulk Reassign Stuck Tasks
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status-filter"
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            >
              <option value="">All Status</option>
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="delayed">Delayed</option>
            </select>
          </div>

          <div>
            <label htmlFor="priority-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              id="priority-filter"
              value={filters.priority}
              onChange={(e) => setFilters({...filters, priority: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            >
              <option value="">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label htmlFor="project-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Project
            </label>
            <select
              id="project-filter"
              value={filters.projectId}
              onChange={(e) => setFilters({...filters, projectId: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project._id} value={project._id}>{project.projectName}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="assignee-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Assigned To
            </label>
            <select
              id="assignee-filter"
              value={filters.assignedTo}
              onChange={(e) => setFilters({...filters, assignedTo: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            >
              <option value="">All Users</option>
              {users.map(user => (
                <option key={user._id} value={user._id}>{user.username} ({user.role})</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>
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
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
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

      {/* Tasks table */}
      {!loading && !error && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
