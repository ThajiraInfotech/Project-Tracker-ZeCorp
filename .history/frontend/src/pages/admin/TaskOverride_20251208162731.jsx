import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import api from '../../store/api';
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

      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.priority) queryParams.append('priority', filters.priority);
      if (filters.projectId) queryParams.append('projectId', filters.projectId);
      if (filters.assignedTo) queryParams.append('assignedTo', filters.assignedTo);

      const response = await api.get(`/tasks/admin/all?${queryParams}`);

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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deadline</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTasks.map((task) => (
                  <tr key={task._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{task.title}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{task.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{task.project?.projectName}</div>
                      <div className="text-sm text-gray-500">{task.project?.projectType}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <img className="h-8 w-8 rounded-full" src={task.assignedTo?.profileImage || 'https://via.placeholder.com/150'} alt={task.assignedTo?.fullName} />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{task.assignedTo?.fullName}</div>
                          <div className="text-sm text-gray-500">{task.assignedTo?.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{new Date(task.deadline).toLocaleDateString()}</div>
                      <div className={`text-xs ${new Date(task.deadline) < new Date() && task.status !== 'completed' ? 'text-red-600' : 'text-gray-500'}`}>
                        {new Date(task.deadline) < new Date() && task.status !== 'completed' ? 'Overdue' : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${task.progress}%` }}></div>
                        </div>
                        <span className="text-sm text-gray-600">{task.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setOverrideData({
                              assignedTo: task.assignedTo?._id || '',
                              priority: task.priority,
                              deadline: new Date(task.deadline).toISOString().split('T')[0],
                              status: task.status
                            });
                            setShowOverrideModal(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Override task"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        {task.status !== 'completed' && (
                          <button
                            onClick={() => forceCompleteTask(task._id)}
                            className="text-green-600 hover:text-green-900"
                            title="Force complete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTasks.length === 0 && (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Tasks Found</h3>
              <p className="text-gray-500">No tasks match your current filters.</p>
            </div>
          )}
        </div>
      )}

      {/* Override Task Modal */}
      {showOverrideModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Override Task: {selectedTask.title}</h2>
              <button
                onClick={() => setShowOverrideModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={overrideTask} className="space-y-4">
              <div>
                <label htmlFor="override-assignedTo" className="block text-sm font-medium text-gray-700 mb-1">
                  Reassign To
                </label>
                <select
                  id="override-assignedTo"
                  value={overrideData.assignedTo}
                  onChange={(e) => setOverrideData({...overrideData, assignedTo: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Keep Current ({selectedTask.assignedTo?.username})</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>{user.username} ({user.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="override-priority" className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  id="override-priority"
                  value={overrideData.priority}
                  onChange={(e) => setOverrideData({...overrideData, priority: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label htmlFor="override-deadline" className="block text-sm font-medium text-gray-700 mb-1">
                  Deadline
                </label>
                <input
                  type="date"
                  id="override-deadline"
                  value={overrideData.deadline}
                  onChange={(e) => setOverrideData({...overrideData, deadline: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="override-status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="override-status"
                  value={overrideData.status}
                  onChange={(e) => setOverrideData({...overrideData, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="delayed">Delayed</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Override Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Reassign Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Bulk Reassign Stuck Tasks</h2>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={bulkReassignStuckTasks} className="space-y-4">
              <div>
                <label htmlFor="bulk-fromUser" className="block text-sm font-medium text-gray-700 mb-1">
                  From User (Stuck Tasks)
                </label>
                <select
                  id="bulk-fromUser"
                  value={bulkData.fromUserId}
                  onChange={(e) => setBulkData({...bulkData, fromUserId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Select user</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>{user.username} ({user.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="bulk-toUser" className="block text-sm font-medium text-gray-700 mb-1">
                  Reassign To
                </label>
                <select
                  id="bulk-toUser"
                  value={bulkData.toUserId}
                  onChange={(e) => setBulkData({...bulkData, toUserId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Select user</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>{user.username} ({user.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="bulk-project" className="block text-sm font-medium text-gray-700 mb-1">
                  Specific Project (Optional)
                </label>
                <select
                  id="bulk-project"
                  value={bulkData.projectId}
                  onChange={(e) => setBulkData({...bulkData, projectId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Projects</option>
                  {projects.map(project => (
                    <option key={project._id} value={project._id}>{project.projectName}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Leave empty to reassign all stuck tasks from the selected user</p>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                >
                  Reassign Tasks
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskOverride;