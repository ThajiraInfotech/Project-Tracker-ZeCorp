import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  Squares2X2Icon,
  TableCellsIcon,
  ViewColumnsIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  PencilIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon as CheckCircleSolid,
  ClockIcon as ClockSolid,
  ExclamationTriangleIcon as ExclamationTriangleSolid
} from '@heroicons/react/24/solid';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import api from '../store/api';
import { fetchProjects } from '../store/projectSlice';
import { addTaskDiscussion } from '../store/taskSlice';
import { formatDiscussionContent } from '../utils/mentionUtils';
import { toast } from 'react-toastify';
import TaskCreateModal from '../components/TaskCreateModal';
import KanbanBoard from '../components/KanbanBoard';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [viewMode, setViewMode] = useState('card'); // 'card', 'table', or 'kanban'
  const [selectedTask, setSelectedTask] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [staff, setStaff] = useState([]);
  const [updateForm, setUpdateForm] = useState({
    status: '',
    progress: 0,
    comment: ''
  });
  const [updating, setUpdating] = useState(false);
  const [searchParams] = useSearchParams();

  // New enterprise features
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [sortBy, setSortBy] = useState('deadline');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

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
          allTasks = allTasks.filter(task => task.isOverdue);
        }

        // Apply client-side filters
        if (searchQuery.trim()) {
          allTasks = allTasks.filter(task =>
            task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.assignedTo?.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.project?.projectName.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }

        if (dateRange.start && dateRange.end) {
          allTasks = allTasks.filter(task => {
            const taskDate = new Date(task.deadline);
            const startDate = new Date(dateRange.start);
            const endDate = new Date(dateRange.end);
            return taskDate >= startDate && taskDate <= endDate;
          });
        }

        // Apply sorting
        allTasks.sort((a, b) => {
          let aValue, bValue;
          switch (sortBy) {
            case 'title':
              aValue = a.title.toLowerCase();
              bValue = b.title.toLowerCase();
              break;
            case 'deadline':
              aValue = new Date(a.deadline);
              bValue = new Date(b.deadline);
              break;
            case 'priority':
              const priorityOrder = { low: 1, medium: 2, high: 3 };
              aValue = priorityOrder[a.priority] || 0;
              bValue = priorityOrder[b.priority] || 0;
              break;
            case 'progress':
              aValue = a.progress || 0;
              bValue = b.progress || 0;
              break;
            case 'status':
              const statusOrder = { todo: 1, 'in-progress': 2, completed: 3, delayed: 4 };
              aValue = statusOrder[a.status] || 0;
              bValue = statusOrder[b.status] || 0;
              break;
            default:
              aValue = a.title.toLowerCase();
              bValue = b.title.toLowerCase();
          }

          if (sortOrder === 'asc') {
            return aValue > bValue ? 1 : -1;
          } else {
            return aValue < bValue ? 1 : -1;
          }
        });

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

  // Fetch staff for task assignment
  const fetchStaff = async () => {
    try {
      const response = await api.get('/auth/users/by-role?role=staff');
      if (response.data.success) {
        setStaff(response.data.users || []);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Failed to fetch staff list');
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

  // Handle edit task
  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowCreateModal(true);
  };

  // Update task status and progress
  const handleUpdateTask = async (formData, taskId = null) => {
    const targetTaskId = taskId || selectedTask?._id;
    if (!targetTaskId) return;

    setUpdating(true);
    try {
      const payload = { status: formData.status };
      if (formData.status !== 'completed') {
        payload.progress = formData.progress;
      }
      const response = await api.patch(`/tasks/${targetTaskId}/status`, payload);

      if (response.data.success) {
        toast.success('Task updated successfully!');
        // Update local tasks
        setTasks(tasks.map(task =>
          task._id === targetTaskId ? response.data.task : task
        ));
        if (selectedTask && selectedTask._id === targetTaskId) {
          setSelectedTask(response.data.task);
        }
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

  // Bulk actions
  const handleSelectTask = (taskId) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(tasks.map(task => task._id));
    }
  };

  const handleBulkStatusUpdate = async (newStatus) => {
    if (selectedTasks.length === 0) return;

    try {
      await Promise.all(
        selectedTasks.map(taskId =>
          api.patch(`/tasks/${taskId}/status`, { status: newStatus })
        )
      );
      toast.success(`Updated ${selectedTasks.length} tasks to ${newStatus}`);
      setSelectedTasks([]);
      fetchTasks();
    } catch (error) {
      console.error('Error updating tasks:', error);
      toast.error('Failed to update tasks');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.length === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${selectedTasks.length} tasks?`)) {
      return;
    }

    try {
      await Promise.all(
        selectedTasks.map(taskId => api.delete(`/tasks/${taskId}`))
      );
      toast.success(`Deleted ${selectedTasks.length} tasks`);
      setSelectedTasks([]);
      fetchTasks();
    } catch (error) {
      console.error('Error deleting tasks:', error);
      toast.error('Failed to delete tasks');
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Title', 'Description', 'Project', 'Assigned To', 'Status', 'Priority', 'Deadline', 'Progress'],
      ...tasks.map(task => [
        task.title,
        task.description,
        task.project?.projectName || '',
        task.assignedTo?.fullName || '',
        task.status,
        task.priority,
        new Date(task.deadline).toLocaleDateString(),
        task.progress || 0
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasks.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (auth.isAuthenticated) {
      fetchTasks();
      dispatch(fetchProjects());
      if (auth.user?.role === 'admin') {
        fetchStaff();
      }
    }
  }, [auth.isAuthenticated, filterStatus, filterPriority, filterProject, searchQuery, dateRange, sortBy, sortOrder]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + F for search focus
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        document.querySelector('input[placeholder*="Search"]').focus();
      }

      // Ctrl/Cmd + A for select all (when tasks are visible)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && tasks.length > 0) {
        e.preventDefault();
        handleSelectAll();
      }

      // Escape to clear selection
      if (e.key === 'Escape' && selectedTasks.length > 0) {
        setSelectedTasks([]);
      }

      // Number keys for view modes (1=card, 2=table, 3=kanban)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === '1') setViewMode('card');
        if (e.key === '2') setViewMode('table');
        if (e.key === '3') setViewMode('kanban');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [tasks.length, selectedTasks.length]);

  // Status badge component
  const StatusBadge = ({ status, size = 'sm' }) => {
    const statusConfig = {
      'todo': {
        color: 'bg-slate-100 text-slate-700 border-slate-200',
        icon: <ClockIcon className="w-3 h-3" />,
        label: 'To Do'
      },
      'in-progress': {
        color: 'bg-[#700606]/10 text-[#700606] border-[#700606]/20',
        icon: <ClockSolid className="w-3 h-3" />,
        label: 'In Progress'
      },
      'completed': {
        color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        icon: <CheckCircleSolid className="w-3 h-3" />,
        label: 'Completed'
      },
      'delayed': {
        color: 'bg-red-100 text-red-700 border-red-200',
        icon: <ExclamationTriangleSolid className="w-3 h-3" />,
        label: 'Delayed'
      }
    };

    const config = statusConfig[status] || statusConfig['todo'];

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  // Priority badge component
  const PriorityBadge = ({ priority, size = 'sm' }) => {
    const priorityConfig = {
      'low': {
        color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        icon: <ExclamationTriangleIcon className="w-3 h-3" />,
        label: 'Low'
      },
      'medium': {
        color: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: <ExclamationTriangleIcon className="w-3 h-3" />,
        label: 'Medium'
      },
      'high': {
        color: 'bg-red-100 text-red-700 border-red-200',
        icon: <ExclamationTriangleSolid className="w-3 h-3" />,
        label: 'High'
      }
    };

    const config = priorityConfig[priority] || priorityConfig['medium'];

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  // Task card component
  const TaskCard = ({ task, isSelected, onSelect }) => {
    const [menuOpen, setMenuOpen] = useState(false);

    const isOverdue = task.isOverdue;
    const displayProgress = task.progress || 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 relative group min-h-[280px] flex flex-col border-2 ${
          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-100'
        }`}
      >
        {/* Selection checkbox */}
        <div className="absolute top-3 left-3 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(task._id)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
          />
        </div>

        {/* Header with title and kebab menu */}
        <div className="flex justify-between items-start mb-3 pt-3 pr-3 pl-10">
          <h3 className="text-lg font-bold text-gray-900 flex-1 pr-2 leading-tight">{task.title}</h3>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <EllipsisVerticalIcon className="w-5 h-5 text-gray-500" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20"
                >
                  <div className="py-1">
                    <button
                      onClick={() => { fetchTaskDetails(task._id); setMenuOpen(false); }}
                      className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <EyeIcon className="w-4 h-4" />
                      View Details
                    </button>
                    <button
                      onClick={() => { handleEditTask(task); setMenuOpen(false); }}
                      className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <PencilIcon className="w-4 h-4" />
                      Edit Task
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Project name - only show if exists */}
        {task.project?.projectName && (
          <div className="px-3 mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
              <UserGroupIcon className="w-3 h-3" />
              {task.project.projectName}
            </span>
          </div>
        )}

        {/* Description */}
        <p className="text-gray-600 mb-4 line-clamp-2 text-sm flex-1 px-3">{task.description}</p>

        {/* Task details */}
        <div className="grid grid-cols-2 gap-3 text-sm mb-4 px-3">
          <div className="flex items-center gap-2">
            <UserGroupIcon className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-gray-500 text-xs">Assigned To</p>
              <p className="font-medium text-gray-900">{task.assignedTo?.fullName || 'Unassigned'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-gray-500 text-xs">Due Date</p>
              <p className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                {new Date(task.deadline).toLocaleDateString()}
                {isOverdue && <span className="text-red-600 ml-1">• Overdue</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Progress section */}
        <div className="border-t border-gray-100 pt-3 mb-3 px-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-bold text-gray-900">{displayProgress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${displayProgress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-2 bg-gradient-to-r from-[#700606] to-[#900808] rounded-full"
            />
          </div>
        </div>

        {/* Status and Priority badges */}
        <div className="flex justify-between items-center gap-2 px-3 pb-3">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
        </div>
      </motion.div>
    );
  };

  // Task details modal
  const TaskDetailsModal = ({ onEditTask }) => {
    if (!selectedTask || !showModal) return null;

    const canUpdate = auth.user?.role === 'staff' && selectedTask.assignedTo?._id === auth.user._id;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">Tasks › {selectedTask.title}</p>
            <div className="flex justify-between items-center">
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
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Description</h3>
              <p className="text-gray-600">{selectedTask.description}</p>
            </div>

            {/* Execution Section */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Execution</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <h3 className="font-medium text-gray-700 mb-2">Status</h3>
                  <div className="scale-110 transform origin-left">
                    <StatusBadge status={selectedTask.status} />
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 mb-1">Assigned To</h3>
                  <p className="text-gray-600">{selectedTask.assignedTo?.fullName || 'Unassigned'}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 mb-1">
                    {selectedTask.status === 'completed' ? 'Completed on' : 'Due'}
                  </h3>
                  <p className="text-gray-600">
                    {selectedTask.status === 'completed'
                      ? (selectedTask.completionDate ? new Date(selectedTask.completionDate).toLocaleDateString() : 'N/A')
                      : new Date(selectedTask.deadline).toLocaleDateString()
                    }
                    {selectedTask.status !== 'completed' && selectedTask.isOverdue && <span className="text-red-600"> • Overdue</span>}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100"></div>

            {/* Progress Section */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Progress</h4>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-700">Progress</h3>
                  <span className="text-lg font-semibold text-gray-900">{selectedTask.progress || 0}%</span>
                </div>
                <div className="w-full h-4 bg-gray-200 rounded-full mb-2">
                  <div
                    className="h-4 bg-primary-600 rounded-full transition-all duration-300"
                    style={{ width: `${selectedTask.progress || 0}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500">Progress updated by staff</p>
              </div>
            </div>

            <div className="border-t border-gray-100"></div>

            {/* Context Section */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Context</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="font-medium text-gray-700 mb-1">Project</h3>
                  <p className="text-gray-600">{selectedTask.project?.projectName || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 mb-1">Priority</h3>
                  <span className="text-sm text-gray-500">{selectedTask.priority} priority</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 mb-1">Created By</h3>
                  <p className="text-gray-600">{selectedTask.createdBy?.fullName || 'Unknown'}</p>
                </div>
              </div>
            </div>

            {/* Discussion Section */}
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Discussion</h4>
              <div className="space-y-3">
                {selectedTask.discussions && selectedTask.discussions.map((discussion, index) => (
                  <div key={discussion._id || index} className={`p-3 rounded-lg ${discussion.system ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'} ${discussion.parentDiscussionId ? 'ml-6 border-l-4 border-l-gray-300' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">{discussion.author?.fullName || 'Unknown'}</span>
                      {discussion.system && <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">System</span>}
                      {discussion.parentDiscussionId && <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">Reply</span>}
                      <span className="text-xs text-gray-500">{new Date(discussion.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-700">{discussion.content}</p>
                  </div>
                ))}
              </div>
              {canUpdate && (
                <div className="mt-4">
                  <textarea
                    placeholder="Add a discussion..."
                    value={updateForm.discussion || ''}
                    onChange={(e) => setUpdateForm({...updateForm, discussion: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    rows={3}
                  />
                  <button
                    onClick={() => {
                      if (updateForm.discussion.trim()) {
                        dispatch(addTaskDiscussion({ taskId: selectedTask._id, content: updateForm.discussion }));
                        setUpdateForm({...updateForm, discussion: ''});
                        // Refresh task details
                        fetchTaskDetails(selectedTask._id);
                      }
                    }}
                    disabled={!updateForm.discussion?.trim()}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Add Discussion
                  </button>
                </div>
              )}
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

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => onEditTask(selectedTask)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Edit Task
            </button>
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

  // Staff-specific view - same as dashboard My Tasks
  if (auth.user?.role === 'staff') {
    return (
      <div className="space-y-6 bg-gradient-to-br from-slate-50 to-[#700606]/5 min-h-screen p-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">My Tasks</h2>
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

        {/* Task List with Progress Updates */}
        {!loading && !error && tasks.length > 0 && (
          <KanbanBoard
            tasks={tasks}
            onUpdateTaskStatus={(taskId, status, progress) => handleUpdateTask({ status, progress }, taskId)}
            onTaskClick={(task) => {
              setSelectedTask(task);
              setShowModal(true);
            }}
          />
        )}

        {/* Task Details Modal */}
        {showModal && selectedTask && (() => {
          const project = projects.find(p => p._id === (selectedTask.project?._id || selectedTask.project));
          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white/90 backdrop-blur-sm rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-gray-900">Task Details</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-6 space-y-6">
                  {/* Header Section */}
                  <div className="border-b border-gray-200 pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-2xl font-bold text-gray-900 mb-3">{selectedTask.title}</h4>
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            selectedTask.priority === 'high' ? 'bg-red-100 text-red-800' :
                            selectedTask.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {selectedTask.priority} priority
                          </span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            selectedTask.status === 'completed' ? 'bg-green-100 text-green-800' :
                            selectedTask.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                            selectedTask.status === 'todo' ? 'bg-gray-100 text-gray-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {selectedTask.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-gray-600">Assigned to:</span>
                            <span className="font-medium text-gray-900">{selectedTask.assignedTo?.fullName || selectedTask.assignedTo?.name || 'Unassigned'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-gray-600">Due:</span>
                            <span className={`font-medium ${selectedTask.isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                              {new Date(selectedTask.deadline).toLocaleDateString()}
                              {selectedTask.isOverdue && <span className="ml-1 text-red-600">• Overdue</span>}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description Section */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Description
                    </h5>
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedTask.description || 'No description provided'}</p>
                  </div>


                  {/* Project & Assignment Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 rounded-lg p-4">
                      <h5 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        Project Details
                      </h5>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium text-gray-600">Project:</span>
                          <p className="text-sm font-semibold text-gray-900">{project?.projectName || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">Assigned By:</span>
                          <p className="text-sm font-semibold text-gray-900">{selectedTask.createdBy?.fullName || 'System'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-4">
                      <h5 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Timeline
                      </h5>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium text-gray-600">Created:</span>
                          <p className="text-sm text-gray-900">{selectedTask.createdAt ? new Date(selectedTask.createdAt).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">Deadline:</span>
                          <p className={`text-sm ${selectedTask.isOverdue ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                            {new Date(selectedTask.deadline).toLocaleDateString()}
                          </p>
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

                  {/* Discussion Section */}
                  <div>
                    <h5 className="text-lg font-medium text-gray-900 mb-3">Discussion</h5>
                    <div className="space-y-3">
                      {selectedTask.discussions && selectedTask.discussions.length > 0 ? (
                        selectedTask.discussions.map((discussion, index) => (
                          <div key={index} className={`bg-gray-50 p-3 rounded-lg ${discussion.system ? 'border border-blue-200' : ''}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-900">{discussion.author?.fullName || 'Unknown'}</span>
                              {discussion.system && <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">System</span>}
                              <span className="text-xs text-gray-500">{new Date(discussion.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-gray-700">{discussion.content}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 italic">No discussions yet</p>
                      )}
                    </div>
                  </div>

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
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 bg-gradient-to-br from-slate-50 to-[#700606]/5">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#700606] to-[#a04040] rounded-xl p-6 mb-6 text-white">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Tasks Management</h1>
            <p className="text-[#700606]/80 text-sm">Manage and track all project tasks with enterprise-level tools</p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex bg-white/10 backdrop-blur-sm rounded-lg p-1">
              <button
                onClick={() => setViewMode('card')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'card' ? 'bg-[#700606] text-white shadow-sm' : 'text-white hover:bg-[#700606]/20'
                }`}
              >
                <Squares2X2Icon className="w-4 h-4" />
                Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'table' ? 'bg-[#700606] text-white shadow-sm' : 'text-white hover:bg-[#700606]/20'
                }`}
              >
                <TableCellsIcon className="w-4 h-4" />
                Table
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'kanban' ? 'bg-[#700606] text-white shadow-sm' : 'text-white hover:bg-[#700606]/20'
                }`}
              >
                <ViewColumnsIcon className="w-4 h-4" />
                Kanban
              </button>
            </div>

            {auth.user?.role === 'admin' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-[#700606] rounded-lg hover:bg-[#700606]/10 transition-colors font-medium"
              >
                <PlusIcon className="w-5 h-5" />
                Add Task
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search and Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks by title, description, assignee, or project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#700606] focus:border-transparent"
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <FunnelIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Filters</span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => setSortBy(sortBy === 'deadline' ? 'priority' : sortBy === 'priority' ? 'progress' : 'deadline')}
              className="flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <AdjustmentsHorizontalIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Sort</span>
            </button>
            <div className="relative">
              <button
                onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
                className="flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <span className="text-sm font-mono">⌨️</span>
                <span className="hidden sm:inline">Help</span>
              </button>
              <AnimatePresence>
                {showKeyboardHelp && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-4"
                  >
                    <h4 className="font-semibold text-gray-900 mb-3">Keyboard Shortcuts</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Focus search</span>
                        <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl+F</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Select all</span>
                        <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl+A</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Clear selection</span>
                        <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Esc</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Card view</span>
                        <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">1</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Table view</span>
                        <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">2</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Kanban view</span>
                        <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">3</kbd>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
                    <select
                      value={filterProject}
                      onChange={(e) => setFilterProject(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#700606] focus:border-transparent"
                    >
                      <option value="all">All Projects</option>
                      {projects.map((project) => (
                        <option key={project._id} value={project._id}>
                          {project.projectName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#700606] focus:border-transparent"
                    >
                      <option value="all">All Statuses</option>
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="delayed">Delayed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <select
                      value={filterPriority}
                      onChange={(e) => setFilterPriority(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#700606] focus:border-transparent"
                    >
                      <option value="all">All Priorities</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Due Date Range</label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#700606] focus:border-transparent text-sm"
                        placeholder="Start"
                      />
                      <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#700606] focus:border-transparent text-sm"
                        placeholder="End"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bulk Actions */}
      {selectedTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedTasks.length} task{selectedTasks.length > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {selectedTasks.length === tasks.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <select
                onChange={(e) => e.target.value && handleBulkStatusUpdate(e.target.value)}
                className="px-3 py-1 border border-blue-300 rounded-md text-sm bg-white"
                defaultValue=""
              >
                <option value="">Change Status</option>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="delayed">Delayed</option>
              </select>
              {auth.user?.role === 'admin' && (
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                >
                  Delete Selected
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#700606] focus:border-[#700606]"
            >
              <option value="all">All Projects</option>
              {projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.projectName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#700606] focus:border-[#700606]"
            >
              <option value="all">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="delayed">Delayed</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#700606] focus:border-[#700606]"
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

      {/* Tasks display */}
      {!loading && !error && tasks.length > 0 && (
        viewMode === 'card' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {tasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                isSelected={selectedTasks.includes(task._id)}
                onSelect={handleSelectTask}
              />
            ))}
          </motion.div>
        ) : viewMode === 'kanban' ? (
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
                        className={`bg-white rounded-lg p-3 shadow-sm border-2 ${
                          selectedTasks.includes(task._id) ? 'border-blue-500' : 'border-gray-100'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <input
                            type="checkbox"
                            checked={selectedTasks.includes(task._id)}
                            onChange={() => handleSelectTask(task._id)}
                            className="mt-1 mr-2"
                          />
                          <h4 className="font-medium text-gray-900 flex-1">{task.title}</h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{task.assignedTo?.fullName || 'Unassigned'}</span>
                          <span className={task.isOverdue ? 'text-red-600' : ''}>
                            {new Date(task.deadline).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="mt-2">
                          <div className="w-full h-1 bg-gray-200 rounded-full">
                            <div
                              className="h-1 bg-[#700606] rounded-full"
                              style={{ width: `${task.progress || 0}%` }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedTasks.length === tasks.length && tasks.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-blue-600"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tasks.map((task) => (
                    <tr key={task._id} className={`hover:bg-gray-50 ${selectedTasks.includes(task._id) ? 'bg-blue-50' : ''}`}>
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedTasks.includes(task._id)}
                          onChange={() => handleSelectTask(task._id)}
                          className="w-4 h-4 text-blue-600"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{task.title}</div>
                            <div className="text-sm text-gray-500 line-clamp-1">{task.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {task.project?.projectName && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                            {task.project.projectName}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {task.assignedTo?.fullName || 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={task.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <PriorityBadge priority={task.priority} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={task.isOverdue ? 'text-red-600' : ''}>
                          {new Date(task.deadline).toLocaleDateString()}
                          {task.isOverdue && ' • Overdue'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 h-2 bg-gray-200 rounded-full mr-2">
                            <div
                              className="h-2 bg-gradient-to-r from-[#700606] to-[#900808] rounded-full"
                              style={{ width: `${task.progress || 0}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500">{task.progress || 0}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => fetchTaskDetails(task._id)}
                          className="text-blue-600 hover:text-blue-800 mr-4"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEditTask(task)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Summary section */}
      {!loading && !error && tasks.length > 0 && (
        <div className="mt-8 space-y-6">
          {/* Stats Cards - Mobile First */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tasks Overview</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <ClockIcon className="w-6 h-6 text-slate-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600">To Do</p>
                  <p className="text-lg font-bold text-slate-900">
                    {tasks.filter(t => t.status === 'todo').length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                <ClockSolid className="w-6 h-6 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600">In Progress</p>
                  <p className="text-lg font-bold text-amber-900">
                    {tasks.filter(t => t.status === 'in-progress').length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                <CheckCircleSolid className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600">Completed</p>
                  <p className="text-lg font-bold text-emerald-900">
                    {tasks.filter(t => t.status === 'completed').length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                <ExclamationTriangleSolid className="w-6 h-6 text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600">Overdue</p>
                  <p className="text-lg font-bold text-red-900">
                    {tasks.filter(t => t.isOverdue).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
              <div className="h-64 sm:h-80">
                <Doughnut
                  data={{
                    labels: ['To Do', 'In Progress', 'Completed', 'Delayed'],
                    datasets: [{
                      data: [
                        tasks.filter(t => t.status === 'todo').length,
                        tasks.filter(t => t.status === 'in-progress').length,
                        tasks.filter(t => t.status === 'completed').length,
                        tasks.filter(t => t.status === 'delayed').length,
                      ],
                      backgroundColor: [
                        '#700606',
                        '#f59e0b',
                        '#10b981',
                        '#ef4444',
                      ],
                      borderWidth: 0,
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: window.innerWidth < 640 ? 'bottom' : 'right',
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* Priority Distribution */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Priority Breakdown</h3>
              <div className="h-64 sm:h-80">
                <Bar
                  data={{
                    labels: ['Low', 'Medium', 'High'],
                    datasets: [{
                      label: 'Tasks',
                      data: [
                        tasks.filter(t => t.priority === 'low').length,
                        tasks.filter(t => t.priority === 'medium').length,
                        tasks.filter(t => t.priority === 'high').length,
                      ],
                      backgroundColor: [
                        '#700606',
                        '#f59e0b',
                        '#ef4444',
                      ],
                      borderRadius: 4,
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          stepSize: 1,
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task details modal */}
      <TaskDetailsModal onEditTask={handleEditTask} />

      {/* Task create modal */}
      <TaskCreateModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setEditingTask(null); }}
        staff={staff}
        projects={projects}
        task={editingTask}
        userRole={auth.user?.role}
        defaultProjectId={filterProject !== 'all' ? filterProject : null}
        onTaskCreated={() => {
          fetchTasks();
          setEditingTask(null);
        }}
      />
    </div>
  );
};

export default Tasks;