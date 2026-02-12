import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  Squares2X2Icon,
  TableCellsIcon,
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
  AdjustmentsHorizontalIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  MapPinIcon
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
import { toast } from 'react-toastify';
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

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();
  const [showMenu, setShowMenu] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [startDateFilter, setStartDateFilter] = useState(searchParams.get('startDate') || '');
  const [endDateFilter, setEndDateFilter] = useState(searchParams.get('endDate') || '');
  const [managerFilter, setManagerFilter] = useState(searchParams.get('manager') || '');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [outletFilter, setOutletFilter] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9); // Default 9 for 3x3 grid

  // View and table states
  const [viewMode, setViewMode] = useState('card');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [sortedProjects, setSortedProjects] = useState([]);

  // New enterprise features
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Add project form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [managers, setManagers] = useState([]);
  const [managersLoading, setManagersLoading] = useState(false);
  const [outlets, setOutlets] = useState([]);
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const filterStartDateRef = useRef(null);
  const filterEndDateRef = useRef(null);
  const [formData, setFormData] = useState({
    projectName: '',
    projectType: '',
    category: '',
    jobOrder: '',
    outlet: '',
    description: '',
    clientCompanyName: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    country: 'India',
    location: '',
    startDate: '',
    endDate: '',
    priority: '',
    budget: '',
    currency: 'AED',
    manager: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const auth = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Project types (Scope of Work)
  const projectTypes = [
    { value: 'Retail', label: 'Retail' },
    { value: 'Spare Parts', label: 'Spare Parts' },
    { value: 'Service', label: 'Service' },
    { value: 'Project', label: 'Project' },
    { value: 'Design', label: 'Design' },
    { value: 'Project Management', label: 'Project Management' },
    { value: 'Administration', label: 'Administration' },
    { value: 'Operation', label: 'Operation' }
  ];

  // Helper functions
  const getRiskBadge = (project) => {
    const now = new Date(); // Use current time for consistency
    const endDate = new Date(project.endDate);

    if (endDate < now && project.status !== 'completed') {
      return { text: 'Delayed', color: 'bg-red-100 text-red-800' };
    }
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);
    if (endDate >= now && endDate <= nextWeek && project.status !== 'completed') {
      return { text: 'At Risk', color: 'bg-yellow-100 text-yellow-800' };
    }
    return { text: 'On Track', color: 'bg-green-100 text-green-800' };
  };

  const formatDateForInput = (isoDate) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return isoDate;
    return date.toLocaleDateString('en-GB'); // dd/mm/yyyy
  };

  // Export functionality
  const handleExport = () => {
    const csvContent = [
      ['Project Name', 'Client Name', 'Manager', 'Status', 'Start Date', 'End Date', 'Budget', 'Location', 'Progress', 'Category', 'Job Order'],
      ...sortedProjects.map(project => [
        project.projectName,
        project.clientName,
        project.manager?.fullName || 'Unassigned',
        project.status,
        new Date(project.startDate).toLocaleDateString('en-GB'),
        new Date(project.endDate).toLocaleDateString('en-GB'),
        project.budget || 'N/A',
        project.location,
        (project.progress || 0) + '%',
        project.category || 'N/A',
        project.jobOrder || 'N/A'
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'projects.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Keyboard shortcuts


  // Fetch projects data
  const fetchProjects = async () => {
    try {
      // Only show full loading spinner if we don't have data yet
      if (projects.length === 0) {
        setLoading(true);
      } else {
        // Optional: Add a refetching state if you want a subtle indicator
      }
      setError(null);

      const response = await api.get('/projects');

      if (response.data.success && response.data.projects) {
        setProjects(response.data.projects);
        setFilteredProjects(response.data.projects);
      } else {
        throw new Error('No projects data received');
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError(error.message || 'Failed to fetch projects');
      toast.error('Failed to fetch projects: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Sync manager filter from URL
  useEffect(() => {
    const managerParam = searchParams.get('manager');
    if (managerParam !== managerFilter) {
      setManagerFilter(managerParam || '');
    }
  }, [searchParams]);

  // Apply filters
  useEffect(() => {
    let filtered = projects;

    // Apply URL filter
    const filter = searchParams.get('filter');
    const statusParam = searchParams.get('status');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filter === 'at-risk') {
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      // Normalize today to start of day (already done)
      // Normalize nextWeek to end of day
      nextWeek.setHours(23, 59, 59, 999);

      const now = new Date();

      filtered = filtered.filter(project => {
        if (!project.endDate || project.status === 'completed') return false;

        const endDate = new Date(project.endDate);

        // At Risk means due closely in the future, but NOT yet delayed.
        // Delayed means strictly < now. 
        // So At Risk must be >= now.
        return endDate >= now && endDate <= nextWeek;
      });
    } else if (filter === 'delayed') {
      filtered = filtered.filter(project =>
        (project.endDate && new Date(project.endDate) < today && project.status !== 'completed')
      );
    } else if (filter === 'active') {
      filtered = filtered.filter(project => project.status !== 'completed');
    } else if (filter === 'pending') {
      filtered = filtered.filter(project => project.status !== 'completed');
    } else if (statusParam) {
      filtered = filtered.filter(project => project.status === statusParam);
    }

    if (searchTerm) {
      filtered = filtered.filter(project =>
        (project.projectName && project.projectName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (project.clientName && project.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (project.jobOrder && project.jobOrder.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (project.outlet && project.outlet.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter) {
      if (statusFilter === 'in-progress') {
        filtered = filtered.filter(project => project.status !== 'completed');
      } else {
        filtered = filtered.filter(project => project.status === statusFilter);
      }
    }

    // Date range filter
    if (startDateFilter) {
      const start = new Date(startDateFilter);
      filtered = filtered.filter(project => new Date(project.startDate) >= start);
    }
    if (endDateFilter) {
      const end = new Date(endDateFilter);
      filtered = filtered.filter(project => new Date(project.endDate) <= end);
    }

    // Manager filter
    if (managerFilter) {
      filtered = filtered.filter(project => project.manager?._id === managerFilter || project.manager === managerFilter);
    }

    // Category filter
    if (categoryFilter) {
      filtered = filtered.filter(project => project.category === categoryFilter);
    }

    // Outlet filter
    if (outletFilter) {
      filtered = filtered.filter(project => project.outlet === outletFilter);
    }

    setFilteredProjects(filtered);
    setCurrentPage(1); // Reset to first page on filter change
  }, [projects, searchTerm, statusFilter, startDateFilter, endDateFilter, managerFilter, categoryFilter, outletFilter, searchParams]);

  // Apply sorting
  useEffect(() => {
    let sorted = [...filteredProjects];

    if (sortColumn) {
      sorted.sort((a, b) => {
        let aVal, bVal;
        switch (sortColumn) {
          case 'projectName': aVal = (a.projectName || '').toLowerCase(); bVal = (b.projectName || '').toLowerCase(); break;
          case 'clientName': aVal = (a.clientName || '').toLowerCase(); bVal = (b.clientName || '').toLowerCase(); break;
          case 'manager': aVal = (a.manager?.fullName || 'John Doe').toLowerCase(); bVal = (b.manager?.fullName || 'John Doe').toLowerCase(); break;
          case 'status': aVal = a.status; bVal = b.status; break;
          case 'progress': aVal = a.progress || 0; bVal = b.progress || 0; break;
          case 'startDate': aVal = new Date(a.startDate); bVal = new Date(b.startDate); break;
          case 'endDate': aVal = new Date(a.endDate); bVal = new Date(b.endDate); break;
          case 'budget': aVal = a.budget || 0; bVal = b.budget || 0; break;
          case 'risk': aVal = getRiskBadge(a).text; bVal = getRiskBadge(b).text; break;
          case 'category': aVal = a.category || ''; bVal = b.category || ''; break;
          case 'jobOrder': aVal = a.jobOrder || ''; bVal = b.jobOrder || ''; break;
          default: return 0;
        }
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setSortedProjects(sorted);
  }, [filteredProjects, sortColumn, sortDirection]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column) => {
    if (sortColumn !== column) {
      return (
        <div className="flex flex-col ml-1">
          <svg className="w-2 h-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          <svg className="w-2 h-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-3 h-3 ml-1 text-[#700606]" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L10 5.414 5.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M3 13a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
      </svg>
    ) : (
      <svg className="w-3 h-3 ml-1 text-[#700606]" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L10 14.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M17 7a1 1 0 01-1 1H4a1 1 0 110-2h12a1 1 0 011 1z" clipRule="evenodd" />
      </svg>
    );
  };

  // Fetch project details


  useEffect(() => {
    if (auth.isAuthenticated) {
      fetchProjects();
    }
  }, [auth.isAuthenticated]);

  useEffect(() => {
    const fetchManagers = async () => {
      setManagersLoading(true);
      try {
        const response = await api.get('/auth/users/by-role?role=manager');

        if (response.data.success) {
          setManagers(response.data.users);
        }
      } catch (error) {
        console.error('Failed to fetch managers:', error);
        toast.error('Failed to load managers');
        setManagers([]);
      } finally {
        setManagersLoading(false);
      }
    };

    if (auth.user?.role === 'admin') {
      fetchManagers();
    }
  }, [auth.user?.role]);

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

    fetchOutlets();
  }, []);

  // Form validation
  const validateForm = () => {
    const errors = {};

    if (!formData.projectName.trim()) errors.projectName = 'Project name is required';
    if (!formData.projectType) errors.projectType = 'Project type is required';
    if (!formData.category) errors.category = 'Category is required';
    if (!formData.description.trim()) errors.description = 'Description is required';
    if (!formData.clientEmail.trim()) {
      // Optional
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.clientEmail)) {
      errors.clientEmail = 'Invalid email format';
    }
    if (!formData.clientPhone.trim()) {
      // Optional
    } else if (!/^[0-9]{10}$/.test(formData.clientPhone.replace(/\D/g, ''))) {
      errors.clientPhone = 'Phone number must be 10 digits';
    }
    if (!formData.startDate) errors.startDate = 'Start date is required';
    if (!formData.endDate) errors.endDate = 'End date is required';
    if (formData.startDate && formData.endDate && new Date(formData.endDate) <= new Date(formData.startDate)) {
      errors.endDate = 'End date must be after start date';
    }
    if (formData.budget && (isNaN(formData.budget) || parseFloat(formData.budget) < 0)) {
      errors.budget = 'Budget must be a positive number';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    setSubmitting(true);
    try {
      // Create clean payload with only fields expected by backend
      const apiPayload = {
        projectName: formData.projectName,
        description: formData.description,
        projectType: formData.projectType,
        category: formData.category,
        jobOrder: formData.jobOrder,
        outlet: formData.outlet,
        clientName: formData.clientName || undefined,
        clientEmail: formData.clientEmail || undefined,
        clientPhone: formData.clientPhone ? formData.clientPhone.replace(/\D/g, '') : undefined,
        startDate: formData.startDate,
        endDate: formData.endDate,
        budget: formData.budget ? parseFloat(formData.budget.toString().replace(/,/g, '')) : undefined,
        location: formData.location || undefined,
        manager: formData.manager || undefined
      };

      console.log("Create Project Payload:", apiPayload);

      const response = await api.post('/projects', apiPayload);

      if (response.data.success) {
        toast.success('Project created successfully!');
        setFormData({
          projectName: '',
          projectType: '',
          category: '',
          jobOrder: '',
          outlet: '',
          description: '',
          clientCompanyName: '',
          clientName: '',
          clientEmail: '',
          clientPhone: '',
          country: 'India',
          location: '',
          startDate: '',
          endDate: '',
          priority: '',
          budget: '',
          currency: 'AED',
          manager: ''
        });
        setShowAddForm(false);
        fetchProjects(); // Refresh projects list
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error(error.response?.data?.message || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };
  // Handle project deletion
  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project? This will also delete all associated tasks !!')) {
      return;
    }

    try {
      const response = await api.delete(`/projects/${projectId}`);
      if (response.data.success) {
        toast.success('Project deleted successfully');
        // Update local state
        setProjects(projects.filter(p => p._id !== projectId));
        setFilteredProjects(filteredProjects.filter(p => p._id !== projectId));
        if (showMenu === projectId) setShowMenu(null);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error(error.response?.data?.message || 'Failed to delete project');
    }
  };

  // Status badge component
  const StatusBadge = ({ status, size = 'sm' }) => {
    const statusConfig = {
      'in-progress': {
        color: 'bg-[#700606]/10 text-[#700606] border-[#700606]/20',
        icon: <ClockSolid className="w-3 h-3" />,
        label: 'In Progress'
      },
      'completed': {
        color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        icon: <CheckCircleSolid className="w-3 h-3" />,
        label: 'Completed'
      }
    };

    const config = statusConfig[status] || statusConfig['in-progress'];

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  // Project card component
  const ProjectCard = ({ project, onDelete }) => {
    const progress = project.progress || 0;
    const risk = getRiskBadge(project);
    const manager = project.manager?.fullName || 'Unassigned';

    return (
      <div
        onClick={() => navigate(`/projects/${project._id}`)}
        className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 group cursor-pointer"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{project.projectName}</h3>
            <p className="text-sm text-gray-500 capitalize">{project.projectType} • {project.category}</p>
            {project.jobOrder && <p className="text-xs text-gray-400 mt-1">Job Order: {project.jobOrder}</p>}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={project.status} />
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowMenu(showMenu === project._id ? null : project._id)} className="text-gray-500 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
              {/* Kebab menu dropdown */}
              <div className={`absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 ${showMenu === project._id ? 'block' : 'hidden'}`}>
                <div className="py-1">
                  <button onClick={() => { navigate(`/projects/${project._id}`); setShowMenu(null); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">View Details</button>
                  <button onClick={() => { navigate(`/projects/${project._id}?action=edit`); setShowMenu(null); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">Edit Project</button>
                  {auth.user?.role === 'admin' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(null);
                        onDelete(project._id);
                      }}
                      className="block px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                    >
                      Delete Project
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-gray-600 mb-4 line-clamp-2">{project.description}</p>

        {/* Project Manager */}
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-gray-500">Manager: <span className="font-medium text-gray-900">{manager}</span></p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-4">
          <div className="flex justify-between items-center text-sm mb-2">
            <span className="text-gray-500 font-medium">Progress</span>
            <span className="font-bold text-primary-600">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#700606] to-[#900808] h-3 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Risk Badge */}
        <div className="mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${risk.color} shadow-sm`}>
            {risk.text}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-gray-500 font-medium">Client</p>
            <p className="font-semibold text-gray-900">{project.clientName}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-gray-500 font-medium">Location</p>
            <p className="font-semibold text-gray-900">{project.location}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-gray-500 font-medium">Start Date</p>
            <p className="font-semibold text-gray-900">{new Date(project.startDate).toLocaleDateString('en-GB')}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-gray-500 font-medium">End Date</p>
            <p className="font-semibold text-gray-900">{new Date(project.endDate).toLocaleDateString('en-GB')}</p>
          </div>
        </div>

        {/* Budget Row */}
        <div className="flex items-center justify-between mb-4 p-3 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-100 rounded-lg text-green-600">
              <CurrencyDollarIcon className="w-5 h-5" />
            </div>
            <span className="text-gray-600 font-medium">Project Budget</span>
          </div>
          <p className="text-lg font-bold text-gray-900">AED {project.budget?.toLocaleString() || 'N/A'}</p>
        </div>

        {/* Action Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/projects/${project._id}`);
          }}
          className="w-full py-3 bg-gradient-to-r from-[#700606] to-[#900808] text-white rounded-xl hover:from-[#900808] hover:to-[#a03030] shadow-md hover:shadow-lg transition-all duration-300 font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 group/btn transform hover:-translate-y-0.5"
        >
          <span>View Project Details</span>
          <svg className="w-4 h-4 transform group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </button>
      </div>
    );
  };


  return (
    <div className="w-full px-0 py-4 md:container md:mx-auto md:px-4 md:py-6 bg-gradient-to-br from-slate-50 to-[#700606]/5 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#700606] to-[#a04040] rounded-xl mx-2 md:mx-0 p-4 md:p-6 mb-6 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Projects Management</h1>
            <p className="text-white/80 text-sm">Manage and track all project initiatives</p>
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
            </div>

            {auth.user?.role === 'admin' && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-[#700606] rounded-lg hover:bg-gray-50 transition-colors font-medium ml-auto lg:ml-0 shadow-sm"
              >
                <PlusIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Add Project</span>
                <span className="sm:hidden">Add</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search and Quick Actions */}
      <div className="bg-white rounded-xl mx-2 md:mx-0 shadow-sm p-4 mb-6 border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 w-full">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#700606] focus:border-transparent text-sm md:text-base"
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
            >
              <FunnelIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Filters</span>
            </button>
            <button
              onClick={handleExport}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#700606] focus:border-transparent"
                    >
                      <option value="">All Categories</option>
                      <option value="Zecorp Kitchen">Zecorp Kitchen</option>
                      <option value="Zecorp Solutions">Zecorp Solutions</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#700606] focus:border-transparent"
                    >
                      <option value="">All Statuses</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  {auth.user?.role === 'admin' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Manager</label>
                      <select
                        value={managerFilter}
                        onChange={(e) => setManagerFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#700606] focus:border-transparent"
                      >
                        <option value="">All Managers</option>
                        {managers.map(manager => (
                          <option key={manager._id} value={manager._id}>
                            {manager.fullName} ({manager.username})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Outlet</label>
                    <input
                      list="filter-outlets"
                      value={outletFilter}
                      onChange={(e) => setOutletFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#700606] focus:border-transparent"
                      placeholder="All Outlets"
                    />
                    <datalist id="filter-outlets">
                      {outlets.map((outlet, index) => (
                        <option key={index} value={outlet} />
                      ))}
                    </datalist>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={formatDateForInput(startDateFilter)}
                          readOnly
                          onClick={() => filterStartDateRef.current?.showPicker()}
                          placeholder="Start (dd/mm/yyyy)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#700606] focus:border-transparent text-sm cursor-pointer"
                        />
                        <input
                          type="date"
                          ref={filterStartDateRef}
                          value={startDateFilter}
                          onChange={(e) => setStartDateFilter(e.target.value)}
                          className="absolute opacity-0 bottom-0 left-0 w-full h-full -z-10"
                          tabIndex={-1}
                        />
                      </div>
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={formatDateForInput(endDateFilter)}
                          readOnly
                          onClick={() => filterEndDateRef.current?.showPicker()}
                          placeholder="End (dd/mm/yyyy)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#700606] focus:border-transparent text-sm cursor-pointer"
                        />
                        <input
                          type="date"
                          ref={filterEndDateRef}
                          value={endDateFilter}
                          onChange={(e) => setEndDateFilter(e.target.value)}
                          className="absolute opacity-0 bottom-0 left-0 w-full h-full -z-10"
                          tabIndex={-1}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Project Form */}
      {showAddForm && auth.user?.role === 'admin' && (
        <div className="bg-white rounded-xl mx-2 md:mx-0 shadow-lg border border-gray-200 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-[#700606] to-[#900808] px-6 py-3">
            <h2 className="text-xl font-semibold text-white">Create New Project</h2>
            <p className="text-[#700606]/80 text-xs">Fill in the project details below</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Project Basic Info */}
            <div className="bg-white rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    name="projectName"
                    value={formData.projectName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#700606] focus:border-transparent transition-colors ${formErrors.projectName ? 'border-red-300' : 'border-gray-300'
                      }`}
                    placeholder="Enter project name"
                  />
                  {formErrors.projectName && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.projectName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scope of Work *
                  </label>
                  <p className="text-xs text-gray-400 mb-2">Select the Scope of Work for this project</p>
                  <select
                    name="projectType"
                    value={formData.projectType}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#700606] focus:border-transparent transition-colors ${formErrors.projectType ? 'border-red-300' : 'border-gray-300'
                      }`}
                  >
                    <option value="">Select Scope of Work</option>
                    {projectTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                  {formErrors.projectType && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.projectType}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Category and Job Order */}
            <div className="bg-white rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#700606] focus:border-transparent transition-colors ${formErrors.category ? 'border-red-300' : 'border-gray-300'
                      }`}
                  >
                    <option value="">Select Category</option>
                    <option value="Zecorp Kitchen">Zecorp Kitchen</option>
                    <option value="Zecorp Solutions">Zecorp Solutions</option>
                  </select>
                  {formErrors.category && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.category}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Order
                  </label>
                  <input
                    type="text"
                    name="jobOrder"
                    value={formData.jobOrder}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#700606] focus:border-transparent transition-colors"
                    placeholder="Enter job order number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Outlet
                  </label>
                  <input
                    type="text"
                    name="outlet"
                    value={formData.outlet}
                    onChange={handleInputChange}
                    list="outlets"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#700606] focus:border-transparent transition-colors"
                    placeholder="Select or enter outlet"
                  />
                  <datalist id="outlets">
                    {outlets.map((outlet, index) => (
                      <option key={index} value={outlet} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${formErrors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                placeholder="Describe the project scope, objectives, and requirements"
              />
              {formErrors.description && (
                <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
              )}
            </div>

            {/* Client Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Client Information</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Company Name
                </label>
                <input
                  type="text"
                  name="clientCompanyName"
                  value={formData.clientCompanyName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                  placeholder="Company name (optional)"
                />
                <p className="mt-1 text-xs text-gray-400">Company name helps in managing enterprise clients with multiple projects</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Name
                  </label>
                  <input
                    type="text"
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${formErrors.clientName ? 'border-red-300' : 'border-gray-300'
                      }`}
                    placeholder="Client full name (optional)"
                  />
                  {formErrors.clientName && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.clientName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Email
                  </label>
                  <input
                    type="email"
                    name="clientEmail"
                    value={formData.clientEmail}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${formErrors.clientEmail ? 'border-red-300' : 'border-gray-300'
                      }`}
                    placeholder="client@example.com (optional)"
                  />
                  {formErrors.clientEmail && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.clientEmail}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Phone
                  </label>
                  <input
                    type="tel"
                    name="clientPhone"
                    value={formData.clientPhone}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${formErrors.clientPhone ? 'border-red-300' : 'border-gray-300'
                      }`}
                    placeholder="10-digit phone number (optional)"
                  />
                  {formErrors.clientPhone && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.clientPhone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Project Timeline */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Project Timeline</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formatDateForInput(formData.startDate)}
                      readOnly
                      onClick={() => startDateRef.current?.showPicker()}
                      placeholder="dd/mm/yyyy"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors cursor-pointer ${formErrors.startDate ? 'border-red-300' : 'border-gray-300'}`}
                    />
                    <input
                      type="date"
                      name="startDate"
                      ref={startDateRef}
                      value={formData.startDate}
                      onChange={handleInputChange}
                      className="absolute opacity-0 bottom-0 left-0 w-full h-full -z-10"
                      tabIndex={-1}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
                      <CalendarDaysIcon className="w-5 h-5" />
                    </div>
                  </div>
                  {formErrors.startDate && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.startDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formatDateForInput(formData.endDate)}
                      readOnly
                      onClick={() => endDateRef.current?.showPicker()}
                      placeholder="dd/mm/yyyy"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors cursor-pointer ${formErrors.endDate ? 'border-red-300' : 'border-gray-300'}`}
                    />
                    <input
                      type="date"
                      name="endDate"
                      ref={endDateRef}
                      value={formData.endDate}
                      onChange={handleInputChange}
                      className="absolute opacity-0 bottom-0 left-0 w-full h-full -z-10"
                      tabIndex={-1}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
                      <CalendarDaysIcon className="w-5 h-5" />
                    </div>
                  </div>
                  {formErrors.endDate && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.endDate}</p>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Priority
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                >
                  <option value="">Select priority (optional)</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {/* Budget and Location */}
            <div className="bg-white rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Budget
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 font-bold text-xs">
                      AED
                    </div>
                    <input
                      type="number"
                      name="budget"
                      value={formData.budget}
                      onChange={handleInputChange}
                      step="0.01"
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#700606] focus:border-transparent transition-colors ${formErrors.budget ? 'border-red-300' : 'border-gray-300'
                        }`}
                      placeholder="Project budget"
                      min="0"
                    />
                  </div>
                  {formErrors.budget && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.budget}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                  >
                    <option value="India">India</option>
                    <option value="UAE">UAE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                  placeholder="Project location/address"
                />
              </div>

            </div>

            {/* Manager Assignment */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Project Manager Assignment (Optional)</h3>
              <p className="text-sm text-gray-600 mb-4">Select a manager who will oversee this project (can be assigned later)</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Manager
                </label>
                <select
                  name="manager"
                  value={formData.manager}
                  onChange={handleInputChange}
                  disabled={managersLoading}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${formErrors.manager ? 'border-red-300' : 'border-gray-300'
                    } ${managersLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                >
                  <option value="">
                    {managersLoading
                      ? 'Loading managers...'
                      : managers.length === 0
                        ? 'No managers available - you can create project without manager and assign later'
                        : 'Select a project manager (optional)'}
                  </option>
                  {managers.map(manager => (
                    <option key={manager._id} value={manager._id}>
                      {manager.fullName} ({manager.username})
                    </option>
                  ))}
                </select>
                {formErrors.manager && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.manager}</p>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-[#700606] text-white rounded-lg font-medium hover:bg-[#900808] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Project...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Create Project
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

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
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && sortedProjects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Projects Found</h3>
          <p className="text-gray-500">Try adjusting your filters or create a new project.</p>
        </div>
      ) : (sortedProjects.length > 0 || (!loading && !error)) && (
        <>
          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={loading ? 'opacity-50 pointer-events-none transition-opacity duration-200' : 'transition-opacity duration-200'}
            >
              {viewMode === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortedProjects
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((project) => (
                      <ProjectCard
                        key={project._id}
                        project={project}
                        currentUser={auth.user}
                        onDelete={handleDeleteProject}
                      />
                    ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[#700606] text-white">
                        <tr>
                          <th onClick={() => handleSort('projectName')} className="p-4 font-semibold text-sm cursor-pointer hover:bg-[#800707] transition-colors">
                            <div className="flex items-center gap-1">Project Name {getSortIcon('projectName')}</div>
                          </th>
                          <th onClick={() => handleSort('clientName')} className="p-4 font-semibold text-sm cursor-pointer hover:bg-[#800707] transition-colors">
                            <div className="flex items-center gap-1">Client {getSortIcon('clientName')}</div>
                          </th>
                          <th onClick={() => handleSort('category')} className="p-4 font-semibold text-sm cursor-pointer hover:bg-[#800707] transition-colors">
                            <div className="flex items-center gap-1">Category {getSortIcon('category')}</div>
                          </th>
                          <th onClick={() => handleSort('jobOrder')} className="p-4 font-semibold text-sm cursor-pointer hover:bg-[#800707] transition-colors">
                            <div className="flex items-center gap-1">Job Order {getSortIcon('jobOrder')}</div>
                          </th>
                          <th className="p-4 font-semibold text-sm">
                            Outlet
                          </th>
                          <th onClick={() => handleSort('manager')} className="p-4 font-semibold text-sm cursor-pointer hover:bg-[#800707] transition-colors">
                            <div className="flex items-center gap-1">Manager {getSortIcon('manager')}</div>
                          </th>
                          <th onClick={() => handleSort('status')} className="p-4 font-semibold text-sm cursor-pointer hover:bg-[#800707] transition-colors">
                            <div className="flex items-center gap-1">Status {getSortIcon('status')}</div>
                          </th>
                          <th onClick={() => handleSort('progress')} className="p-4 font-semibold text-sm cursor-pointer hover:bg-[#800707] transition-colors">
                            <div className="flex items-center gap-1">Progress {getSortIcon('progress')}</div>
                          </th>
                          <th onClick={() => handleSort('endDate')} className="p-4 font-semibold text-sm cursor-pointer hover:bg-[#800707] transition-colors">
                            <div className="flex items-center gap-1">Due Date {getSortIcon('endDate')}</div>
                          </th>
                          <th className="p-4 font-semibold text-sm text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sortedProjects
                          .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                          .map((project) => (
                            <tr key={project._id} className="hover:bg-gray-50 transition-colors group">
                              <td className="p-4">
                                <p className="font-semibold text-gray-900">{project.projectName}</p>
                                <p className="text-xs text-gray-500">{project.projectType}</p>
                              </td>
                              <td className="p-4 text-gray-700">{project.clientName}</td>
                              <td className="p-4 text-gray-700">{project.category}</td>
                              <td className="p-4 text-gray-700">{project.jobOrder || '-'}</td>
                              <td className="p-4 text-gray-700">{project.outlet || '-'}</td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                    {project.manager?.fullName?.charAt(0) || 'U'}
                                  </div>
                                  <span className="text-gray-700 text-sm">{project.manager?.fullName || 'Unassigned'}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <StatusBadge status={project.status} />
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-20 bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-gradient-to-r from-[#700606] to-[#900808] h-2 rounded-full"
                                      style={{ width: `${project.progress || 0}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs font-medium text-gray-600">{project.progress || 0}%</span>
                                </div>
                              </td>
                              <td className="p-4 text-gray-700 text-sm">{new Date(project.endDate).toLocaleDateString('en-GB')}</td>
                              <td className="p-4 text-right">
                                <button
                                  onClick={() => navigate(`/projects/${project._id}`)}
                                  className="text-[#700606] hover:text-[#900808] font-medium text-sm hover:underline"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div >
                </div >
              )}
            </motion.div >
          </AnimatePresence >

          <Pagination
            currentPage={currentPage}
            totalItems={sortedProjects.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newLimit) => {
              setItemsPerPage(newLimit);
              setCurrentPage(1);
            }}
            className="mt-6"
          />
        </>
      )}



      {/* Summary section */}
      {
        !loading && !error && projects.length > 0 && (
          <div className="mt-8 space-y-6">
            {/* Stats Cards - Mobile First */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BuildingOfficeIcon className="w-6 h-6 text-emerald-600" />
                Projects Overview
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Total</p>
                    <p className="text-lg font-bold text-blue-900">{filteredProjects.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <ClockSolid className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">In Progress</p>
                    <p className="text-lg font-bold text-amber-900">
                      {filteredProjects.filter(p => p.status !== 'completed').length}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <CheckCircleSolid className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Completed</p>
                    <p className="text-lg font-bold text-emerald-900">
                      {filteredProjects.filter(p => p.status === 'completed').length}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <ExclamationTriangleSolid className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">At Risk</p>
                    <p className="text-lg font-bold text-red-900">
                      {filteredProjects.filter(p => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const endDate = new Date(p.endDate);
                        return p.status === 'delayed' || p.status === 'on-hold' || (endDate < today && p.status !== 'completed');
                      }).length}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Total Budget</p>
                    <p className="text-lg font-bold text-green-900">
                      AED {filteredProjects.reduce((sum, p) => sum + (p.budget || 0), 0).toLocaleString()}
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
                      labels: ['In Progress', 'Completed'],
                      datasets: [{
                        data: [
                          filteredProjects.filter(p => p.status !== 'completed').length,
                          filteredProjects.filter(p => p.status === 'completed').length,
                        ],
                        backgroundColor: [
                          '#f59e0b',
                          '#10b981',
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

              {/* Project Types Distribution */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Types</h3>
                <div className="h-64 sm:h-80">
                  <Bar
                    data={{
                      labels: ['Retail', 'Spare Parts', 'Service', 'Project', 'Design', 'Project Management', 'Administration', 'Operation'],
                      datasets: [{
                        label: 'Projects',
                        data: [
                          filteredProjects.filter(p => p.projectType === 'Retail').length,
                          filteredProjects.filter(p => p.projectType === 'Spare Parts').length,
                          filteredProjects.filter(p => p.projectType === 'Service').length,
                          filteredProjects.filter(p => p.projectType === 'Project').length,
                          filteredProjects.filter(p => p.projectType === 'Design').length,
                          filteredProjects.filter(p => p.projectType === 'Project Management').length,
                          filteredProjects.filter(p => p.projectType === 'Administration').length,
                          filteredProjects.filter(p => p.projectType === 'Operation').length,
                        ],
                        backgroundColor: [
                          'rgba(112, 6, 6, 0.8)',   // Theme Red
                          'rgba(59, 130, 246, 0.8)', // Blue
                          'rgba(16, 185, 129, 0.8)', // Green
                          'rgba(245, 158, 11, 0.8)', // Amber
                          'rgba(139, 92, 246, 0.8)', // Purple
                          'rgba(236, 72, 153, 0.8)', // Pink
                          'rgba(99, 102, 241, 0.8)', // Indigo (Admin)
                          'rgba(20, 184, 166, 0.8)', // Teal (Operation)
                        ],
                        borderColor: [
                          '#700606',
                          '#2563eb',
                          '#059669',
                          '#d97706',
                          '#7c3aed',
                          '#db2777',
                          '#4f46e5',
                          '#0d9488',
                        ],
                        borderWidth: 1,
                        borderRadius: 6,
                        barThickness: 24,
                      }],
                    }}
                    options={{
                      indexAxis: 'y',
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                        tooltip: {
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          titleColor: '#1f2937',
                          bodyColor: '#4b5563',
                          borderColor: '#e5e7eb',
                          borderWidth: 1,
                          padding: 10,
                          cornerRadius: 8,
                          displayColors: true,
                        }
                      },
                      scales: {
                        x: {
                          beginAtZero: true,
                          grid: {
                            display: false,
                          },
                          ticks: {
                            stepSize: 1,
                            font: {
                              size: 11
                            }
                          }
                        },
                        y: {
                          grid: {
                            color: '#f3f4f6',
                          },
                          ticks: {
                            font: {
                              weight: '500',
                              size: 12
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default Projects;