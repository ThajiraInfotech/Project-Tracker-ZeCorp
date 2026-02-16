import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import api from '../store/api';
import { toast } from 'react-toastify';
import TaskCreateModal from '../components/TaskCreateModal';
import ChatSidebar from '../components/ChatSidebar';
import UserAvatar from '../components/UserAvatar';
import ExpenseModal from '../components/ExpenseModal';
import Tasks from './Tasks';
import expenseService from '../services/expenseService';
import { PlusIcon, BanknotesIcon, CurrencyDollarIcon, ReceiptPercentIcon } from '@heroicons/react/24/outline';

const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [managers, setManagers] = useState([]);
  const [showChatSidebar, setShowChatSidebar] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [outlets, setOutlets] = useState([]);
  const [financials, setFinancials] = useState({ totalExpenses: 0, profit: 0, utilization: 0 });
  const editStartDateRef = useRef(null);
  const editEndDateRef = useRef(null);

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

  // Fetch staff and managers for task assignment
  const fetchStaffAndManagers = async () => {
    try {
      // accessable to both admin and manager
      const response = await api.get('/auth/staff-for-manager');
      if (response.data.success && response.data.users) {
        const allUsers = response.data.users;
        setStaff(allUsers.filter(u => u.role === 'staff' || u.role === 'technician' || u.role === 'finance'));
        setManagers(allUsers.filter(u => u.role === 'manager'));
      }
    } catch (error) {
      console.error('Error fetching staff and managers:', error);
      setStaff([]);
      setManagers([]);
    }
  };

  // Fetch project expenses
  const fetchExpenses = async () => {
    try {
      // Helper to safely get string ID
      const getUserId = (userOrId) => {
        if (!userOrId) return null;
        return typeof userOrId === 'string' ? userOrId : userOrId._id?.toString();
      };

      const currentUserId = (auth.user?._id || auth.user?.id)?.toString();
      const managerId = getUserId(project?.manager);

      const isManager = managerId === currentUserId;
      const isTeamMember = project?.teamMembers?.some(m => getUserId(m) === currentUserId);
      const isAdmin = auth.user?.role === 'admin';

      console.log('FetchExpenses Debug:', {
        currentUser: auth.user,
        currentUserId,
        managerId,
        isManager,
        isAdmin,
        isTeamMember,
        projectManagerRaw: project?.manager
      });

      // Fetch if Admin, Manager, or Team Member
      if (isAdmin || isManager || isTeamMember) {
        const data = await expenseService.getProjectExpenses(id);
        if (data.success) {
          setExpenses(data.expenses);
        }
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  // Calculate financials whenever project or expenses change
  useEffect(() => {
    if (project && expenses) {
      const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      const budget = project.budget || 0;
      const profit = budget - totalExpenses;
      const utilization = budget > 0 ? (totalExpenses / budget) * 100 : 0;

      setFinancials({
        totalExpenses,
        profit,
        utilization
      });
    }
  }, [project, expenses]);

  // Fetch outlets
  useEffect(() => {
    const fetchOutlets = async () => {
      try {
        const response = await api.get('/projects/outlets');
        if (response.data.success) {
          setOutlets(response.data.outlets);
        }
      } catch (error) {
        console.error('Failed to fetch outlets:', error);
      }
    };

    if (showEditModal) {
      fetchOutlets();
    }
  }, [showEditModal]);


  useEffect(() => {
    if (auth.isAuthenticated && id) {
      fetchProject();
      fetchProjectTasks();
      fetchStaffAndManagers();
    }
  }, [auth.isAuthenticated, id]);

  // Handle deep link for chat and edit
  useEffect(() => {
    if (project) {
      if (searchParams.get('openChat') === 'true') {
        setShowChatSidebar(true);
      }
      if (searchParams.get('action') === 'edit') {
        setShowEditModal(true);
      }
    }
  }, [project, searchParams]);

  useEffect(() => {
    if (auth.isAuthenticated && id && project) {
      fetchExpenses();
    }
  }, [auth.isAuthenticated, id, project?.manager]); // Fetch after project loaded

  // Helper functions
  const formatDateForInput = (isoDate) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return isoDate;
    return date.toLocaleDateString('en-GB'); // dd/mm/yyyy
  };

  const getProgress = (status) => {
    switch (status) {
      case 'in-progress': return 60;
      case 'completed': return 100;
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
      'in-progress': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800'
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

    // Calculate real progress based on tasks
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    let progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Override if project is marked completed manually
    if (project.status === 'completed') progress = 100;

    const risk = getRiskBadge(project);
    const manager = project.manager?.username || 'Unassigned';

    return (
      <div className="space-y-6 md:space-y-8">
        {/* Description */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 md:p-8 shadow-sm border border-blue-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-3 text-lg md:text-xl">
            <svg className="w-6 h-6 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Project Description
          </h3>
          <p className="text-gray-700 leading-relaxed text-base md:text-lg">{project.description}</p>
        </div>

        {/* Client Information and Project Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 md:p-8 shadow-sm border border-green-100">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-3 text-lg md:text-xl">
              <svg className="w-6 h-6 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Client Information
            </h3>
            <div className="space-y-3 break-words">
              <p className="text-gray-700"><span className="font-semibold">Name:</span> {project.clientName}</p>
              <p className="text-gray-700"><span className="font-semibold">Email:</span> {project.clientEmail}</p>
              <p className="text-gray-700"><span className="font-semibold">Phone:</span> {project.clientPhone}</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 md:p-8 shadow-sm border border-purple-100">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-3 text-lg md:text-xl">
              <svg className="w-6 h-6 text-purple-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Project Details
            </h3>
            <div className="space-y-3 break-words">
              <p className="text-gray-700"><span className="font-semibold">Scope of Work:</span> {project.projectType}</p>
              <p className="text-gray-700"><span className="font-semibold">Category:</span> {project.category || 'N/A'}</p>
              {project.jobOrder && (
                <p className="text-gray-700"><span className="font-semibold">Job Order:</span> {project.jobOrder}</p>
              )}
              {project.outlet && (
                <p className="text-gray-700"><span className="font-semibold">Outlet:</span> {project.outlet}</p>
              )}
              <p className="text-gray-700 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-semibold min-w-fit">Location:</span> <span className="truncate">{project.location}</span>
              </p>
              <p className="text-gray-700"><span className="font-semibold">Manager:</span> {manager}</p>
            </div>
          </div>
        </div>

        {/* Timeline and Financials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 md:p-8 shadow-sm border border-yellow-100">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-3 text-lg md:text-xl">
              <svg className="w-6 h-6 text-yellow-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Project Timeline
            </h3>
            <div className="space-y-3 mb-6">
              <p className="text-gray-700"><span className="font-semibold">Start:</span> {new Date(project.startDate).toLocaleDateString('en-GB')}</p>
              <p className="text-gray-700"><span className="font-semibold">End:</span> {new Date(project.endDate).toLocaleDateString('en-GB')}</p>
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
                <span className="font-medium">Tasks completed:</span> {completedTasks} / {totalTasks}
              </p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-6 md:p-8 shadow-sm border border-teal-100">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-3 text-lg md:text-xl">
              <svg className="w-6 h-6 text-teal-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              Financial Overview
            </h3>
            <div className="space-y-3">
              <p className="text-gray-700 text-lg break-all"><span className="font-semibold">Budget:</span> AED {project.budget?.toLocaleString()}</p>
              <p className="text-gray-700 break-all"><span className="font-semibold">Spent:</span> AED {financials?.totalExpenses?.toLocaleString() || '0'}</p>
              <p className="text-gray-700"><span className="font-semibold">Status:</span> <span className={`font-bold ${risk.color} px-2 py-1 rounded-full text-sm`}>{risk.text}</span></p>
            </div>
          </div>
        </div>

        {/* Team Members */}
        {project.teamMembers && project.teamMembers.length > 0 && (
          <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-6 md:p-8 shadow-sm border border-pink-100">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-3 text-lg md:text-xl">
              <svg className="w-6 h-6 text-pink-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Team Members
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {project.teamMembers.map((member, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 min-w-0">
                  <UserAvatar user={member} size="md" className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate" title={member.username}>{member.username || `Member ${index + 1}`}</p>
                    <p className="text-sm text-gray-500 truncate">Team Member</p>
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px]">
      <Tasks projectId={id} isEmbedded={true} />
    </div>
  );

  const TeamTab = () => {
    // Merge project team members with task assignees
    const getAllTeamMembers = () => {
      const explicitMembers = project.teamMembers || [];
      const taskAssignees = tasks
        .map(t => t.assignedTo)
        .filter(u => u && u._id); // Filter out nulls or undefined assignments

      // Create a Map to ensure uniqueness by ID
      const uniqueMembersMap = new Map();

      // Add explicit members first
      explicitMembers.forEach(member => {
        if (member && member._id) {
          uniqueMembersMap.set(member._id, { ...member, isExplicitMember: true });
        }
      });

      // Add task assignees if not already present
      taskAssignees.forEach(assignee => {
        if (assignee && assignee._id && !uniqueMembersMap.has(assignee._id)) {
          uniqueMembersMap.set(assignee._id, { ...assignee, isExplicitMember: false });
        }
      });

      return Array.from(uniqueMembersMap.values());
    };

    const allTeamMembers = getAllTeamMembers();

    return (
      <div className="space-y-8">
        {/* Project Manager Section */}
        {/* Project Manager Section */}
        {project?.manager ? (
          <div className="bg-gradient-to-br from-theme-50 to-red-50 rounded-xl p-8 shadow-sm border border-theme-100">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <svg className="w-6 h-6 text-theme-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Project Manager
            </h3>
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 bg-white rounded-xl p-6 border border-theme-100 shadow-sm">
              <UserAvatar
                user={project.manager}
                size="custom"
                className="w-24 h-24 text-3xl bg-gradient-to-br from-theme-500 to-theme-700 text-white shadow-lg"
              />
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                  <h4 className="text-2xl font-bold text-gray-900">{project.manager.username}</h4>
                  <span className="px-3 py-1 bg-theme-100 text-theme-700 rounded-full text-xs font-bold uppercase tracking-wider w-fit mx-auto md:mx-0">
                    Lead
                  </span>
                </div>
                <p className="text-gray-500 mb-4">{project.manager.username}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 text-gray-700 justify-center md:justify-start">
                    <div className="w-8 h-8 rounded-full bg-theme-50 flex items-center justify-center text-theme-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span>{project.manager.email}</span>
                  </div>
                  {project.manager.phone && (
                    <div className="flex items-center gap-3 text-gray-700 justify-center md:justify-start">
                      <div className="w-8 h-8 rounded-full bg-theme-50 flex items-center justify-center text-theme-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <span>{project.manager.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-orange-50 rounded-xl p-8 shadow-sm border border-orange-100 text-center">
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Project Manager Assigned</h3>
            <p className="text-gray-600 mb-6">Assign a manager to lead this project and manage tasks.</p>
            <button
              onClick={() => setShowEditModal(true)}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors"
            >
              Assign Manager
            </button>
          </div>
        )}

        {/* Team Members Section */}
        <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <svg className="w-6 h-6 text-theme-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            Team Members
            <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-sm font-normal">
              {allTeamMembers.length}
            </span>
          </h3>

          {allTeamMembers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allTeamMembers.map((member, index) => (
                <div key={member._id || index} className="group bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 hover:border-theme-100 relartive overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-theme-500 to-theme-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                  <div className="flex items-start gap-4 mb-4">
                    <UserAvatar
                      user={member}
                      size="custom"
                      className="w-14 h-14 text-xl shadow-md"
                    />
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg leading-tight mb-1">{member.username || `Member ${index + 1}`}</h4>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                        {member.isExplicitMember ? 'Staff Member' : 'Task Assignee'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm border-t border-gray-50 pt-4 mt-2">
                    <div className="flex items-center gap-2 text-gray-600 min-w-0">
                      <svg className="w-4 h-4 text-theme-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="truncate block flex-1" title={member.email}>{member.email || 'No email'}</span>
                    </div>
                    {member.phone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <svg className="w-4 h-4 text-theme-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>{member.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No Team Assigned</h3>
              <p className="text-gray-500">Add staff members to this project to see them here.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const BudgetTab = () => (
    <div className="space-y-8">
      {/* Financial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Total Budget */}
        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-4">
          <div>
            <p className="text-gray-500 text-sm font-medium mb-1">Total Budget</p>
            <h3 className="text-2xl font-bold text-gray-900 break-all">AED {project?.budget?.toLocaleString() || '0'}</h3>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 shrink-0">
            <CurrencyDollarIcon className="w-6 h-6" />
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-4">
          <div>
            <p className="text-gray-500 text-sm font-medium mb-1">Total Expenses</p>
            <h3 className="text-2xl font-bold text-red-600 break-all">AED {financials.totalExpenses.toLocaleString()}</h3>
          </div>
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 shrink-0">
            <ReceiptPercentIcon className="w-6 h-6" />
          </div>
        </div>

        {/* Remaining Budget (Profit) */}
        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-4">
          <div>
            <p className="text-gray-500 text-sm font-medium mb-1">Remaining Budget</p>
            <h3 className={`text-2xl font-bold break-all ${financials.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              AED {financials.profit.toLocaleString()}
            </h3>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${financials.profit >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
            <BanknotesIcon className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Utilization Bar */}
      <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold text-gray-700">Budget Utilization</h4>
          <span className={`font-bold ${financials.utilization > 100 ? 'text-red-600' : 'text-gray-700'}`}>
            {financials.utilization.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className={`h-4 rounded-full transition-all duration-1000 ${financials.utilization > 100 ? 'bg-red-500' : 'bg-green-500'}`}
            style={{ width: `${Math.min(financials.utilization, 100)}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-right">
          {financials.utilization > 100 ? 'Over Budget' : 'Within Budget'}
        </p>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ReceiptPercentIcon className="w-6 h-6 text-primary-600" />
            Expense History
          </h3>
          {(auth.user.role === 'manager' || auth.user.role === 'admin') && (
            <button
              onClick={() => setShowExpenseModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Add Expense
            </button>
          )}
        </div>

        {expenses.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p>No expenses recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 font-semibold text-sm">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Title</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Vendor</th>
                  <th className="p-4">Recorded By</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenses.map((expense) => (
                  <tr key={expense._id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-gray-700">{new Date(expense.date).toLocaleDateString('en-GB')}</td>
                    <td className="p-4 font-medium text-gray-900">
                      {expense.title}
                      {expense.task && <span className="block text-xs text-gray-500">Task: {expense.task.title}</span>}
                    </td>
                    <td className="p-4 text-gray-600">
                      <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                        {expense.category}
                      </span>
                    </td>
                    <td className="p-4 text-gray-700">{expense.vendor}</td>
                    <td className="p-4 text-gray-600 text-sm">
                      <div className="flex items-center gap-2">
                        <UserAvatar user={expense.recordedBy} size="xs" />
                        {expense.recordedBy?.username || 'Unknown'}
                      </div>
                    </td>
                    <td className="p-4 text-right font-bold text-gray-900">AED {expense.amount.toLocaleString()}</td>
                    <td className="p-4 text-center">
                      {expense.receipt ? (
                        <a href={expense.receipt} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm underline">
                          View
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );


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
                  <span>Priority: <span className={`font-medium ${selectedTaskForActions.priority === 'high' ? 'text-red-600' :
                    selectedTaskForActions.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
                    }`}>{selectedTaskForActions.priority}</span></span>
                  <span>Status: <span className={`font-medium ${selectedTaskForActions.status === 'completed' ? 'text-green-600' :
                    selectedTaskForActions.status === 'in-progress' ? 'text-blue-600' : 'text-gray-600'
                    }`}>{selectedTaskForActions.status}</span></span>
                  <span>Progress: {selectedTaskForActions.progress || 0}%</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>Assigned to: {selectedTaskForActions.assignedTo?.username || 'Unassigned'}</span>
                  <span>Due: {new Date(selectedTaskForActions.deadline).toLocaleDateString('en-GB')}</span>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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
      location: project?.location || '',
      manager: project?.manager?._id || project?.manager || '',
      projectType: project?.projectType || 'Retail',
      category: project?.category || '',
      jobOrder: project?.jobOrder || '',
      outlet: project?.outlet || ''
    });
    const [updating, setUpdating] = useState(false);

    const handleEditSubmit = async (e) => {
      e.preventDefault();
      setUpdating(true);
      try {
        const updateData = {
          ...editForm,
          budget: editForm.budget ? parseFloat(editForm.budget) : undefined,
          manager: editForm.manager || undefined,
          projectType: editForm.projectType || undefined,
          category: editForm.category || undefined,
          jobOrder: editForm.jobOrder || undefined,
          outlet: editForm.outlet || undefined
        };
        const response = await api.put(`/projects/${id}`, updateData);
        if (response.data.success) {
          toast.success('Project updated successfully!');
          setShowEditModal(false);
          // Remove the action param so it doesn't reopen on refetch
          setSearchParams(params => {
            const newParams = new URLSearchParams(params);
            newParams.delete('action');
            return newParams;
          });
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
                  onChange={(e) => setEditForm({ ...editForm, projectName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Scope of Work</label>
                <select
                  value={editForm.projectType}
                  onChange={(e) => setEditForm({ ...editForm, projectType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Retail">Retail</option>
                  <option value="Spare Parts">Spare Parts</option>
                  <option value="Service">Service</option>
                  <option value="Project">Project</option>
                  <option value="Design">Design</option>
                  <option value="Project Management">Project Management</option>
                  <option value="Administration">Administration</option>
                  <option value="Operation">Operation</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Category</option>
                  <option value="Zecorp Kitchen">Zecorp Kitchen</option>
                  <option value="Zecorp Solutions">Zecorp Solutions</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Job Order</label>
                <input
                  type="text"
                  value={editForm.jobOrder}
                  onChange={(e) => setEditForm({ ...editForm, jobOrder: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="JO-XXXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Outlet</label>
                <input
                  type="text"
                  value={editForm.outlet}
                  onChange={(e) => setEditForm({ ...editForm, outlet: e.target.value })}
                  list="edit-outlets"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Select or enter outlet"
                />
                <datalist id="edit-outlets">
                  {outlets.map((outlet, index) => (
                    <option key={index} value={outlet} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Project Manager</label>
                <select
                  value={editForm.manager}
                  onChange={(e) => setEditForm({ ...editForm, manager: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Manager</option>

                  {managers.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.fullName || user.username}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Budget (₹)</label>
                <input
                  type="number"
                  value={editForm.budget}
                  onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
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
                    onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client Email</label>
                  <input
                    type="email"
                    value={editForm.clientEmail}
                    onChange={(e) => setEditForm({ ...editForm, clientEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client Phone</label>
                  <input
                    type="tel"
                    value={editForm.clientPhone}
                    onChange={(e) => setEditForm({ ...editForm, clientPhone: e.target.value })}
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
                  <div className="relative">
                    <input
                      type="text"
                      value={formatDateForInput(editForm.startDate)}
                      readOnly
                      onClick={() => editStartDateRef.current?.showPicker()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                    />
                    <input
                      type="date"
                      ref={editStartDateRef}
                      value={editForm.startDate ? new Date(editForm.startDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                      className="absolute opacity-0 bottom-0 left-0 w-full h-full -z-10"
                      tabIndex={-1}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formatDateForInput(editForm.endDate)}
                      readOnly
                      onClick={() => editEndDateRef.current?.showPicker()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                    />
                    <input
                      type="date"
                      ref={editEndDateRef}
                      value={editForm.endDate ? new Date(editForm.endDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                      className="absolute opacity-0 bottom-0 left-0 w-full h-full -z-10"
                      tabIndex={-1}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input
                type="text"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
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
    <div className="w-full px-2 py-4 md:px-6 md:py-8 max-w-[1920px] mx-auto">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-white to-gray-50 rounded-xl shadow-lg border border-gray-200 p-4 md:p-8 mb-6 md:mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6">
            <button
              onClick={() => navigate('/projects')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors self-start sm:self-center"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-1 break-words">{project.projectName}</h1>
              <p className="text-gray-600 text-sm md:text-lg">Enterprise Project Management Hub</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            <StatusBadge status={project.status} />
            <div className="text-left lg:text-right">
              <p className="text-sm text-gray-500 font-medium">Project Manager</p>
              <p className="font-semibold text-gray-900">{project.manager?.fullName || 'Unassigned'}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <button
            onClick={() => setShowChatSidebar(true)}
            className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm md:text-base"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Chat
          </button>
          <button
            onClick={() => setShowTaskModal(true)}
            className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm md:text-base"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Task
          </button>

          <button
            onClick={() => setShowEditModal(true)}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm md:text-base"
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
        <div className="border-b border-gray-200 bg-gray-50 overflow-x-auto">
          <nav className="flex min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 md:px-8 py-4 md:py-5 text-sm font-semibold border-b-3 transition-all duration-200 ${activeTab === tab.id
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
        <div className="p-4 md:p-8">
          <ActiveTabComponent />
        </div>
      </div>

      {/* Task Creation Modal */}
      <TaskCreateModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        project={project}
        staff={staff}
        managers={managers}
        userRole={auth.user?.role}
        onTaskCreated={() => {
          fetchProjectTasks();
        }}
      />



      {/* Edit Project Modal */}
      <EditProjectModal />

      {/* Task Actions Modal */}
      <TaskActionsModal />

      {/* Chat Sidebar */}
      <ChatSidebar
        isOpen={showChatSidebar}
        onClose={() => setShowChatSidebar(false)}
        entityType="project"
        entityId={project?._id}
        entityTitle={project?.projectName || 'Project'}
        entityData={project}
      />

      <ExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        projectId={id}
        onExpenseAdded={fetchExpenses}
      />
    </div>
  );
};

export default ProjectDetailPage;