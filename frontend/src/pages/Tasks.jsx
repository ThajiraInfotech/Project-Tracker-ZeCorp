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
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
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
import { toast } from 'react-toastify';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import TaskCreateModal from '../components/TaskCreateModal';
import TaskDetailsModal from '../components/TaskDetailsModal';
import KanbanBoard from '../components/KanbanBoard';

import Pagination from '../components/Pagination';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

const Tasks = ({ projectId = null, isEmbedded = false }) => {
  const [searchParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || 'all');
  const [filterPriority, setFilterPriority] = useState(searchParams.get('priority') || 'all');
  const [filterLabel, setFilterLabel] = useState(searchParams.get('label') || 'all');
  const [filterProject, setFilterProject] = useState(projectId || 'all');
  const [filterAssignedTo, setFilterAssignedTo] = useState(searchParams.get('assignedTo') || '');
  const [viewMode, setViewMode] = useState('card'); // 'card', 'table', or 'kanban'
  const [selectedTask, setSelectedTask] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [staff, setStaff] = useState([]);
  const [managers, setManagers] = useState([]);

  const [updateForm, setUpdateForm] = useState({
    status: '',
    progress: 0,
    comment: ''
  });
  const [updating, setUpdating] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // New enterprise features
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const auth = useSelector((state) => state.auth);
  const projects = useSelector((state) => state.projects.projects);
  const dispatch = useDispatch();

  // Fetch tasks data
  const fetchTasks = async () => {
    try {
      // Only show full loading spinner if we don't have data yet
      if (tasks.length === 0) {
        setLoading(true);
      } else {
        // Optional: Add a refetching state if you want a subtle indicator
      }
      setError(null);

      const params = {};

      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }

      if (filterPriority !== 'all') {
        params.priority = filterPriority;
      }

      if (filterLabel !== 'all') {
        params.label = filterLabel;
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
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          allTasks = allTasks.filter(task =>
            task.status !== 'completed' &&
            new Date(task.deadline) < now
          );
        } else if (filter === 'upcoming' || filter === 'at-risk') {
          const today = new Date();
          // today.setHours(0, 0, 0, 0); // Keep time for strict comparison or reset? "Within 7 days" usually implies date range.
          // Matching Projects.jsx standardized logic which uses current time vs 7 days from now. 
          // Projects.jsx used: endDate >= now && endDate <= nextWeek

          const nextWeek = new Date(today);
          nextWeek.setDate(today.getDate() + 7);

          allTasks = allTasks.filter(task => {
            if (task.status === 'completed') return false;
            const deadline = new Date(task.deadline);
            return deadline >= today && deadline <= nextWeek;
          });
        }

        // Apply client-side filters
        if (searchQuery.trim()) {
          const query = searchQuery.trim().toLowerCase();
          allTasks = allTasks.filter(task =>
            task.title.toLowerCase().includes(query) ||
            task.description.toLowerCase().includes(query) ||
            task.assignedTo?.fullName.toLowerCase().includes(query) ||
            task.project?.projectName.toLowerCase().includes(query) ||
            (task.project?.jobOrder && String(task.project.jobOrder).toLowerCase().includes(query))
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

  // Fetch staff and managers for task assignment
  const fetchStaffAndManagers = async () => {
    try {
      // accessible to both admin and manager
      const response = await api.get('/auth/staff-for-manager');

      if (response.data.success && response.data.users) {
        const allUsers = response.data.users;
        setStaff(allUsers.filter(u => ['staff', 'technician', 'finance'].includes(u.role)));
        setManagers(allUsers.filter(u => u.role === 'manager' || u.role === 'admin'));
      }
    } catch (error) {
      console.error('Error fetching staff and managers:', error);
      // Don't show error toast for this background fetch to avoid clutter
    }
  };

  // Fetch task details
  const fetchTaskDetails = async (taskId) => {
    try {
      const response = await api.get(`/tasks/${taskId}`);

      if (response.data.success && response.data.task) {
        setSelectedTask(response.data.task);
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
      setUpdateForm({ ...updateForm, comment: '' });
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

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      const response = await api.delete(`/tasks/${taskId}`);
      if (response.data.success) {
        toast.success('Task deleted successfully');
        // Update local state
        setTasks(tasks.filter(t => t._id !== taskId));
        setFilteredTasks(filteredTasks.filter(t => t._id !== taskId));
        if (selectedTask && selectedTask._id === taskId) {
          setSelectedTask(null);
          setShowModal(false);
        }
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error(error.response?.data?.message || 'Failed to delete task');
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
        formatDateDDMMYYYY(task.deadline),
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
      dispatch(fetchProjects());
      if (auth.user?.role === 'admin' || auth.user?.role === 'manager') {
        fetchStaffAndManagers();
      }

      // Check for deep link to task (e.g. from notification)
      const taskIdParam = searchParams.get('taskId');
      const openChatParam = searchParams.get('openChat');

      if (taskIdParam) {
        fetchTaskDetails(taskIdParam);
      }
    }
  }, [auth.isAuthenticated, filterStatus, filterPriority, filterLabel, filterProject, searchQuery, dateRange, searchParams]); // Added searchParams dependency

  // Sync assignedTo filter from URL
  useEffect(() => {
    const assignedToParam = searchParams.get('assignedTo');
    if (assignedToParam !== filterAssignedTo) {
      setFilterAssignedTo(assignedToParam || '');
    }
  }, [searchParams]);

  // Reset logic inside filter effect
  useEffect(() => {
    const filterTasks = () => {
      let result = [...tasks];

      // Filter by status
      if (filterStatus && filterStatus !== 'all') {
        result = result.filter(task => task.status === filterStatus);
      }

      // Filter by priority
      if (filterPriority && filterPriority !== 'all') {
        result = result.filter(task => task.priority === filterPriority);
      }

      // Filter by project
      if (filterProject && filterProject !== 'all') {
        result = result.filter(task => task.project?._id === filterProject);
      }

      // Filter by label
      if (filterLabel && filterLabel !== 'all') {
        result = result.filter(task => task.label === filterLabel);
      }

      // Filter by Assigned User (including subtasks)
      if (filterAssignedTo) {
        result = result.filter(task => {
          const isDirectlyAssigned = task.assignedTo?._id === filterAssignedTo || task.assignedTo === filterAssignedTo;
          const hasSubtaskAssigned = task.subtasks?.some(st => st.assignedTo?._id === filterAssignedTo || st.assignedTo === filterAssignedTo);
          return isDirectlyAssigned || hasSubtaskAssigned;
        });
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        console.log('Search Query:', query);
        result = result.filter(task => {
          const jobOrder = task.project?.jobOrder ? String(task.project.jobOrder).toLowerCase() : '';
          const match =
            task.title.toLowerCase().includes(query) ||
            task.description.toLowerCase().includes(query) ||
            task.assignedTo?.fullName.toLowerCase().includes(query) ||
            task.project?.projectName.toLowerCase().includes(query) ||
            (task.label && task.label.toLowerCase().includes(query)) ||
            jobOrder.includes(query);

          if (query === '13211' && match) console.log('Found match:', task.title, jobOrder);
          if (query === '13211' && !match && jobOrder) console.log('Missed match:', task.title, jobOrder);

          return match;
        });
      }

      // Filter by date range
      if (dateRange.start && dateRange.end) {
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        result = result.filter(task => {
          const taskDeadline = new Date(task.deadline);
          return taskDeadline >= startDate && taskDeadline <= endDate;
        });
      }
      setFilteredTasks(result);
      setCurrentPage(1); // Reset to first page on filter change
    };
    filterTasks();
  }, [tasks, filterStatus, filterPriority, filterLabel, filterProject, filterAssignedTo, searchQuery, dateRange.start, dateRange.end, selectedTasks, searchParams]);

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
  const TaskCard = ({ task, isSelected, onSelect, onTaskClick, onDelete }) => {
    const [menuOpen, setMenuOpen] = useState(false);

    const isOverdue = task.isOverdue;
    const displayProgress = task.progress || 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onClick={() => onTaskClick && onTaskClick(task)}
        className={`bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 relative group min-h-[280px] flex flex-col border-2 cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-100'
          }`}
      >
        {/* Selection checkbox */}
        <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
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
          <div className="flex items-center gap-1">
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
              >
                <EllipsisVerticalIcon className="w-5 h-5" />
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
                      {auth.user?.role !== 'staff' && (
                        <button
                          onClick={() => { handleEditTask(task); setMenuOpen(false); }}
                          className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <PencilIcon className="w-4 h-4" />
                          Edit Task
                        </button>
                      )}
                      {auth.user?.role === 'admin' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(false);
                            onDelete(task._id);
                          }}
                          className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <ExclamationTriangleIcon className="w-4 h-4" />
                          Delete Task
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Project name - only show if exists */}
        {task.project?.projectName && (
          <div className="px-3 mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
              <UserGroupIcon className="w-3 h-3" />
              {task.project.projectName}
              {task.project.jobOrder && (
                <span className="text-blue-600 opacity-80 ml-1 border-l border-blue-200 pl-1">
                  #{task.project.jobOrder}
                </span>
              )}
            </span>
          </div>
        )}

        {/* Label - only show if exists */}
        {task.label && (
          <div className="px-3 mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
              {task.label}
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
                {formatDateDDMMYYYY(task.deadline)}
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



  // Staff-specific view - same as dashboard My Tasks
  if (auth.user?.role?.toLowerCase() === 'staff') {
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

        {/* Task List with Progress Updates */}
        {error && <div className="text-red-500">{error}</div>}

        {/* Show list if we have tasks (even if loading) OR if not loading and no error */}
        {(tasks.length > 0 || (!loading && !error)) && (
          <div className={loading ? 'opacity-50 pointer-events-none transition-opacity duration-200' : 'transition-opacity duration-200'}>
            {tasks.length > 0 ? (
              <KanbanBoard
                tasks={filteredTasks}
                onUpdateTaskStatus={handleUpdateTask}
                onTaskClick={(task) => fetchTaskDetails(task._id)}
                onChatClick={(task, e) => {
                  e.stopPropagation();
                  // logic to open chat
                }}
                onDelete={handleDeleteTask}
                currentUser={auth.user}
              />
            ) : (
              !loading && (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Tasks Found</h3>
                  <p className="text-gray-500">There are no tasks available.</p>
                </div>
              )
            )}
          </div>
        )}

        {/* Task Details Modal */}
        {showModal && selectedTask && (
          <TaskDetailsModal
            taskId={selectedTask._id}
            onClose={() => setShowModal(false)}
            currentUserRole="staff"
            currentUserId={auth.user?._id || auth.user?.id}
            onTaskUpdated={(updatedTask) => {
              setTasks(tasks.map(t => t._id === updatedTask._id ? updatedTask : t));
              setSelectedTask(updatedTask);
            }}
          />
        )}


      </div >

    );
  }

  return (
    <div className="space-y-6 bg-gradient-to-br from-slate-50 to-[#700606]/5 min-h-screen py-4 md:p-6 w-full md:container md:mx-auto">
      {/* Header */}
      {/* Header - Only show if not embedded */}
      {!isEmbedded && (
        <div className="bg-gradient-to-r from-[#700606] to-[#a04040] rounded-xl mx-2 md:mx-0 p-4 md:p-6 mb-6 text-white shadow-lg">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Tasks Management</h1>
              <p className="text-white/80 text-sm">Manage and track all project tasks with enterprise-level tools</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              {/* View Mode Toggle */}
              <div className="flex bg-white/10 backdrop-blur-sm rounded-lg p-1">
                <button
                  onClick={() => setViewMode('card')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'card' ? 'bg-[#700606] text-white shadow-sm' : 'text-white hover:bg-[#700606]/20'
                    }`}
                >
                  <Squares2X2Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">Cards</span>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-[#700606] text-white shadow-sm' : 'text-white hover:bg-[#700606]/20'
                    }`}
                >
                  <TableCellsIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Table</span>
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'kanban' ? 'bg-[#700606] text-white shadow-sm' : 'text-white hover:bg-[#700606]/20'
                    }`}
                >
                  <ViewColumnsIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Kanban</span>
                </button>
              </div>

              {auth.user?.role === 'admin' && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-[#700606] rounded-lg hover:bg-[#700606]/10 transition-colors font-medium ml-auto lg:ml-0"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span className="hidden sm:inline">Add Task</span>
                  <span className="sm:hidden">Add</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Embedded Actions Header */}
      {isEmbedded && (
        <div className="flex justify-end mb-6">
          <div className="flex flex-wrap items-center gap-3 w-full justify-end">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('card')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'card' ? 'bg-white text-[#700606] shadow-sm' : 'text-gray-600 hover:bg-gray-200'
                  }`}
              >
                <Squares2X2Icon className="w-4 h-4" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-white text-[#700606] shadow-sm' : 'text-gray-600 hover:bg-gray-200'
                  }`}
              >
                <TableCellsIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Table</span>
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'kanban' ? 'bg-white text-[#700606] shadow-sm' : 'text-gray-600 hover:bg-gray-200'
                  }`}
              >
                <ViewColumnsIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Kanban</span>
              </button>
            </div>

            {(auth.user?.role === 'admin' || auth.user?.role === 'manager') && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#700606] text-white rounded-lg hover:bg-[#800808] transition-colors font-medium"
              >
                <PlusIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Add Task</span>
                <span className="sm:hidden">Add</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search and Quick Actions */}
      <div className="bg-white rounded-xl mx-2 md:mx-0 shadow-sm p-4 mb-6 border border-gray-100">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-6">
                  {!isEmbedded && (
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
                  )}
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Label</label>
                    <select
                      value={filterLabel}
                      onChange={(e) => setFilterLabel(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#700606] focus:border-transparent"
                    >
                      <option value="all">All Labels</option>
                      {['QUOTE', 'Design', 'site visit', 'Installation', 'Invoice', 'Procurement', 'meeting', 'service', 'Delivery'].map((label) => (
                        <option key={label} value={label}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Due Date Range</label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#700606] focus:border-transparent text-sm"
                        placeholder="Start"
                      />
                      <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#700606] focus:border-transparent text-sm"
                        placeholder="End"
                      />
                    </div>
                  </div>
                  {(auth.user?.role === 'admin' || auth.user?.role === 'manager') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
                      <select
                        value={filterAssignedTo}
                        onChange={(e) => setFilterAssignedTo(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#700606] focus:border-transparent"
                      >
                        <option value="">All Users</option>
                        {[...managers, ...staff]
                          .filter(user => user.role !== 'admin')
                          .map((user) => (
                            <option key={user._id} value={user._id}>
                              {user.fullName} ({user.role})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bulk Actions */}
      {
        selectedTasks.length > 0 && (
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
                <div className="relative">
                  <button
                    onClick={() => setShowStatusMenu(!showStatusMenu)}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Change Status
                    <svg className={`w-4 h-4 text-gray-500 transition-transform ${showStatusMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  <AnimatePresence>
                    {showStatusMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden"
                      >
                        <div className="py-1">
                          <button
                            onClick={() => { handleBulkStatusUpdate('todo'); setShowStatusMenu(false); }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-slate-50 transition-colors"
                          >
                            <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                            To Do
                          </button>
                          <button
                            onClick={() => { handleBulkStatusUpdate('in-progress'); setShowStatusMenu(false); }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                          >
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            In Progress
                          </button>
                          <button
                            onClick={() => { handleBulkStatusUpdate('completed'); setShowStatusMenu(false); }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 transition-colors"
                          >
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            Completed
                          </button>
                          <button
                            onClick={() => { handleBulkStatusUpdate('delayed'); setShowStatusMenu(false); }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-red-50 transition-colors"
                          >
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            Delayed
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
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
        )
      }




      {/* Loading state */}
      {
        loading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        )
      }

      {/* Error state */}
      {
        error && !loading && (
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
        )
      }

      {/* Empty state */}
      {
        !loading && !error && tasks.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Tasks Found</h3>
            <p className="text-gray-500">There are no tasks available. {auth.user?.role !== 'staff' && 'Create your first task to get started!'}</p>
          </div>
        )
      }

      {/* Tasks display */}
      {
        !loading && !error && tasks.length > 0 && (
          viewMode === 'card' ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  isSelected={selectedTasks.includes(task._id)}
                  onSelect={handleSelectTask}
                  onTaskClick={(t) => {
                    if (viewMode === 'kanban') return; // Kanban handles click differently
                    fetchTaskDetails(t._id);
                  }}
                  onDelete={handleDeleteTask}
                  currentUser={auth.user}
                />
              ))}
            </motion.div>
          ) : viewMode === 'kanban' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {['todo', 'in-progress', 'completed', 'delayed'].map((status) => {
                const statusTasks = filteredTasks.filter(task => task.status === status);
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
                          onClick={() => {
                            setSelectedTask(task);
                            setShowModal(true);
                          }}
                          className={`bg-white rounded-lg p-3 shadow-sm border-2 cursor-pointer ${selectedTasks.includes(task._id) ? 'border-blue-500' : 'border-gray-100'
                            }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <input
                              type="checkbox"
                              checked={selectedTasks.includes(task._id)}
                              onChange={() => handleSelectTask(task._id)}
                              onClick={(e) => e.stopPropagation()}
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
                          {task.label && (
                            <div className="mt-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                {task.label}
                              </span>
                            </div>
                          )}
                          <div className="mt-2">
                            <div className="w-full h-1 bg-gray-200 rounded-full">
                              <div
                                className="h-1 bg-[#700606] rounded-full"
                                style={{ width: `${task.progress || 0}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex justify-between items-center mt-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                fetchTaskDetails(task._id);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 underline focus:outline-none"
                            >
                              View Details
                            </button>

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
                          checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0}
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
                    {filteredTasks.map((task) => (
                      <tr
                        key={task._id}
                        className={`hover:bg-gray-50 cursor-pointer ${selectedTasks.includes(task._id) ? 'bg-blue-50' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTask(task);
                          setShowModal(true);
                        }}
                      >
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedTasks.includes(task._id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleSelectTask(task._id);
                            }}
                            className="w-4 h-4 text-blue-600"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                {task.title}
                                {task.label && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                    {task.label}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 line-clamp-1">{task.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {task.project?.projectName && (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1">
                              {task.project.projectName}
                              {task.project.jobOrder && (
                                <span className="text-blue-600 opacity-80 ml-1 border-l border-blue-300 pl-1">
                                  #{task.project.jobOrder}
                                </span>
                              )}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTask(task);
                              setShowModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 mr-4"
                          >
                            View
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTask(task);
                            }}
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
        )
      }

      <React.Fragment />

      {/* Pagination Component */}
      {
        !loading && !error && filteredTasks.length > 0 && viewMode !== 'kanban' && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredTasks.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newLimit) => {
              setItemsPerPage(newLimit);
              setCurrentPage(1);
            }}
            className="mt-6"
          />
        )
      }

      {/* Summary section */}
      {
        !loading && !error && filteredTasks.length > 0 && (
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
                      {filteredTasks.filter(t => t.status === 'todo').length}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                  <ClockSolid className="w-6 h-6 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-600">In Progress</p>
                    <p className="text-lg font-bold text-amber-900">
                      {filteredTasks.filter(t => t.status === 'in-progress').length}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                  <CheckCircleSolid className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-600">Completed</p>
                    <p className="text-lg font-bold text-emerald-900">
                      {filteredTasks.filter(t => t.status === 'completed').length}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                  <ExclamationTriangleSolid className="w-6 h-6 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-600">Overdue</p>
                    <p className="text-lg font-bold text-red-900">
                      {filteredTasks.filter(t => t.isOverdue).length}
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
                          filteredTasks.filter(t => t.status === 'todo').length,
                          filteredTasks.filter(t => t.status === 'in-progress').length,
                          filteredTasks.filter(t => t.status === 'completed').length,
                          filteredTasks.filter(t => t.status === 'delayed').length,
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
                          filteredTasks.filter(t => t.priority === 'low').length,
                          filteredTasks.filter(t => t.priority === 'medium').length,
                          filteredTasks.filter(t => t.priority === 'high').length,
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
        )
      }

      {/* Task details modal */}
      {/* Task details modal */}
      {
        showModal && selectedTask && (
          <TaskDetailsModal
            taskId={selectedTask._id}
            onClose={() => setShowModal(false)}
            onEditTask={auth.user?.role?.toLowerCase() !== 'staff' ? () => {
              setShowModal(false);
              handleEditTask(selectedTask);
            } : undefined}
            currentUserRole={auth.user?.role?.toLowerCase() === 'staff' ? 'staff' : auth.user?.role}
            currentUserId={auth.user?._id || auth.user?.id}
            onTaskUpdated={(updatedTask) => {
              setTasks(tasks.map(t => t._id === updatedTask._id ? updatedTask : t));
              setSelectedTask(updatedTask);
            }}
          />
        )
      }

      {/* Task create modal */}
      <TaskCreateModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setEditingTask(null); }}
        staff={staff}
        managers={managers}
        projects={projects}
        task={editingTask}
        userRole={auth.user?.role}
        defaultProjectId={filterProject !== 'all' ? filterProject : null}
        onTaskCreated={() => {
          fetchTasks();
          setEditingTask(null);
        }}
      />


    </div >
  );
};

export default Tasks;