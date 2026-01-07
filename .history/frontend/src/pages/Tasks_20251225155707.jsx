import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import api from '../store/api';
import { fetchProjects } from '../store/projectSlice';
import { toast } from 'react-toastify';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    status: '',
    progress: 0,
    comment: ''
  });
  const [updating, setUpdating] = useState(false);
  const [searchParams] = useSearchParams();

  const auth = useSelector((state) => state.auth);
  const projects = useSelector((state) => state.projects.projects);
  const dispatch = useDispatch();

  // Fetch tasks data
  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};

      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }

      if (filterPriority !== 'all') {
        params.priority = filterPriority;
      }

      if (filterProject !== 'all') {
        params.projectId = filterProject;
      }

      const response = await api.get('/tasks', { params });

      if (response.data.success && response.data.tasks) {
        let allTasks = response.data.tasks;
        // Backend handles role-based filtering

        // Apply URL filter
        const filter = searchParams.get('filter');
        if (filter === 'overdue') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          allTasks = allTasks.filter(task =>
            task.status !== 'completed' && new Date(task.deadline) < today
          );
        }

        setTasks(allTasks);
      } else {
        throw new Error('No tasks data received');
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError(error.message || 'Failed to fetch tasks');
      toast.error('Failed to fetch tasks: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch task details
  const fetchTaskDetails = async (taskId) => {
    try {
      const response = await api.get(`/tasks/${taskId}`);

      if (response.data.success && response.data.task) {
        setSelectedTask(response.data.task);
        setUpdateForm({
          status: response.data.task.status,
          progress: response.data.task.progress || 0,
          comment: ''
        });
        setShowModal(true);
      }
    } catch (error) {
      console.error('Error fetching task details:', error);
      toast.error('Failed to fetch task details: ' + error.message);
    }
  };

  // Update task status and progress
  const handleUpdateTask = async () => {
    if (!selectedTask) return;

    setUpdating(true);
    try {
      const response = await api.patch(`/tasks/${selectedTask._id}/status`, {
        status: updateForm.status,
        progress: updateForm.progress
      });

      if (response.data.success) {
        toast.success('Task updated successfully!');
        // Update local tasks
        setTasks(tasks.map(task =>
          task._id === selectedTask._id ? response.data.task : task
        ));
        setSelectedTask(response.data.task);
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  // Add comment
  const handleAddComment = async () => {
    if (!updateForm.comment.trim()) return;

    try {
      await api.post(`/tasks/${selectedTask._id}/comments`, {
        text: updateForm.comment
      });
      toast.success('Comment added!');
      setUpdateForm({...updateForm, comment: ''});
      // Refresh task details
      fetchTaskDetails(selectedTask._id);
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment: ' + error.message);
    }
  };

  useEffect(() => {
    if (auth.isAuthenticated) {
      fetchTasks();
      dispatch(fetchProjects());
    }
  }, [auth.isAuthenticated, filterStatus, filterPriority, filterProject]);

  // Status badge component
  const StatusBadge = ({ status }) => {
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

  // Priority badge component
  const PriorityBadge = ({ priority }) => {
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

  // Task card component
  const TaskCard = ({ task }) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{task.title}</h3>
          <p className="text-sm text-gray-500 mb-2">Project: {task.project?.projectName || 'N/A'}</p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
        </div>
      </div>

      <p className="text-gray-600 mb-4 line-clamp-2">{task.description}</p>

      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <p className="text-gray-500">Assigned To</p>
          <p className="font-medium">{task.assignedTo?.fullName || 'Unassigned'}</p>
        </div>
        <div>
          <p className="text-gray-500">Due Date</p>
          <p className="font-medium">{new Date(task.deadline).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <p className="text-gray-500 text-sm">Progress</p>
          <div className="w-24 h-2 bg-gray-200 rounded-full mt-1">
            <div
              className="h-2 bg-primary-600 rounded-full"
              style={{ width: `${task.progress || 0}%` }}
            ></div>
          </div>
        </div>
        <button
          onClick={() => fetchTaskDetails(task._id)}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm"
        >
          View Details
        </button>
      </div>
    </div>
  );

  // Task details modal
  const TaskDetailsModal = () => {
    if (!selectedTask || !showModal) return null;

    const canUpdate = auth.user?.role === 'staff' && selectedTask.assignedTo?._id === auth.user._id;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{selectedTask.title}</h2>
            <button
              onClick={() => setShowModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Description</h3>
              <p className="text-gray-600">{selectedTask.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-700 mb-1">Project</h3>
                <p className="text-gray-600">{selectedTask.project?.projectName || 'N/A'}</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-700 mb-1">Priority</h3>
                <PriorityBadge priority={selectedTask.priority} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-700 mb-1">Assigned To</h3>
                <p className="text-gray-600">{selectedTask.assignedTo?.fullName || 'Unassigned'}</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-700 mb-1">Created By</h3>
                <p className="text-gray-600">{selectedTask.createdBy?.fullName || 'Unknown'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-700 mb-1">Timeline</h3>
                <p className="text-gray-600">Start: {new Date(selectedTask.startDate).toLocaleDateString()}</p>
                <p className="text-gray-600">Due: {new Date(selectedTask.deadline).toLocaleDateString()}</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-700 mb-1">Status</h3>
                <StatusBadge status={selectedTask.status} />
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-700 mb-2">Progress</h3>
              <div className="w-full h-2 bg-gray-200 rounded-full mb-2">
                <div
                  className="h-2 bg-primary-600 rounded-full"
                  style={{ width: `${selectedTask.progress || 0}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">{selectedTask.progress || 0}% complete</p>
            </div>

            {/* Update form for staff */}
            {canUpdate && (
              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-700 mb-4">Update Task</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={updateForm.status}
                      onChange={(e) => setUpdateForm({...updateForm, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="delayed">Delayed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Progress (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={updateForm.progress}
                      onChange={(e) => setUpdateForm({...updateForm, progress: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="Add a comment (optional)"
                    value={updateForm.comment}
                    onChange={(e) => setUpdateForm({...updateForm, comment: e.target.value})}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!updateForm.comment.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Add Comment
                  </button>
                </div>
                <button
                  onClick={handleUpdateTask}
                  disabled={updating}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {updating ? 'Updating...' : 'Update Task'}
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks Management</h1>
          <p className="text-gray-600 text-sm">Manage and track all project tasks</p>
        </div>

        {auth.user?.role === 'admin' && (
          <button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
            + Add Task
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
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
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
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

      {/* Empty state */}
      {!loading && !error && tasks.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Tasks Found</h3>
          <p className="text-gray-500">There are no tasks available. {auth.user?.role !== 'staff' && 'Create your first task to get started!'}</p>
        </div>
      )}

      {/* Tasks grid */}
      {!loading && !error && tasks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => (
            <TaskCard key={task._id} task={task} />
          ))}
        </div>
      )}

      {/* Summary section */}
      {!loading && !error && tasks.length > 0 && (
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tasks Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg">
              <p className="text-gray-500 text-sm">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <p className="text-gray-500 text-sm">To Do</p>
              <p className="text-2xl font-bold text-gray-600">
                {tasks.filter(t => t.status === 'todo').length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <p className="text-gray-500 text-sm">In Progress</p>
              <p className="text-2xl font-bold text-yellow-600">
                {tasks.filter(t => t.status === 'in-progress').length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <p className="text-gray-500 text-sm">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {tasks.filter(t => t.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Task details modal */}
      <TaskDetailsModal />
    </div>
  );
};

export default Tasks;