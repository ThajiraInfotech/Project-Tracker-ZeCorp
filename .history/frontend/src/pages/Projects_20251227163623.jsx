import React, { useEffect, useState } from 'react';
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
  CurrencyRupeeIcon,
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
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchParams] = useSearchParams();
  const [showMenu, setShowMenu] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // View and table states
  const [viewMode, setViewMode] = useState('card');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [sortedProjects, setSortedProjects] = useState([]);

  // New enterprise features
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Add project form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [managers, setManagers] = useState([]);
  const [managersLoading, setManagersLoading] = useState(false);
  const [formData, setFormData] = useState({
    projectName: '',
    projectType: '',
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
    currency: 'INR',
    manager: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const auth = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Project types
  const projectTypes = [
    { value: 'turnkey-project', label: 'Turnkey Project' },
    { value: 'commercial-kitchen', label: 'Commercial Kitchen' },
    { value: 'mep-hvac', label: 'MEP / HVAC' },
    { value: 'civil-interior', label: 'Civil / Interior' },
    { value: 'maintenance-amc', label: 'Maintenance / AMC' },
    { value: 'equipment-supply', label: 'Equipment Supply' }
  ];

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

  // Fetch projects data
  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/projects');

      if (response.data.success && response.data.projects) {
        const allProjects = response.data.projects;
        const { user } = auth;

        let filteredProjects = allProjects;

        // Apply role-based filtering
        if (user?.role === 'admin') {
          // Admin sees all projects
          filteredProjects = allProjects;
        } else if (user?.role === 'manager') {
          // Manager sees only projects they manage
          filteredProjects = allProjects.filter(project =>
            project.manager?._id === user._id || project.manager === user._id
          );
        } else if (user?.role === 'staff') {
          // Staff sees only projects they are assigned to
          filteredProjects = allProjects.filter(project =>
            project.teamMembers?.some(member =>
              member?._id === user._id || member === user._id
            )
          );
        }

        // Apply URL filter
        const filter = searchParams.get('filter');
        if (filter === 'at-risk') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          filteredProjects = filteredProjects.filter(project =>
            project.status === 'on-hold' ||
            (project.endDate < today && project.status !== 'completed') ||
            project.status === 'delayed'
          );
        }

        setProjects(filteredProjects);
        setFilteredProjects(filteredProjects);
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

  // Apply filters
  useEffect(() => {
    let filtered = projects;

    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.clientName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(project => project.status === statusFilter);
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

    setFilteredProjects(filtered);
  }, [projects, searchTerm, statusFilter, startDateFilter, endDateFilter]);

  // Apply sorting
  useEffect(() => {
    let sorted = [...filteredProjects];

    if (sortColumn) {
      sorted.sort((a, b) => {
        let aVal, bVal;
        switch (sortColumn) {
          case 'projectName': aVal = a.projectName.toLowerCase(); bVal = b.projectName.toLowerCase(); break;
          case 'clientName': aVal = a.clientName.toLowerCase(); bVal = b.clientName.toLowerCase(); break;
          case 'manager': aVal = (a.manager?.fullName || 'John Doe').toLowerCase(); bVal = (b.manager?.fullName || 'John Doe').toLowerCase(); break;
          case 'status': aVal = a.status; bVal = b.status; break;
          case 'progress': aVal = getProgress(a.status); bVal = getProgress(b.status); break;
          case 'startDate': aVal = new Date(a.startDate); bVal = new Date(b.startDate); break;
          case 'endDate': aVal = new Date(a.endDate); bVal = new Date(b.endDate); break;
          case 'budget': aVal = a.budget || 0; bVal = b.budget || 0; break;
          case 'risk': aVal = getRiskBadge(a).text; bVal = getRiskBadge(b).text; break;
          default: return 0;
        }
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setSortedProjects(sorted);
  }, [filteredProjects, sortColumn, sortDirection]);

  // Fetch project details
  const fetchProjectDetails = async (projectId) => {
    try {
      const response = await api.get(`/projects/${projectId}`);

      if (response.data.success && response.data.project) {
        setSelectedProject(response.data.project);
        setShowModal(true);
        // Fetch tasks for this project
        fetchProjectTasks(projectId);
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
      toast.error('Failed to fetch project details: ' + error.message);
    }
  };

  // Fetch tasks for a project
  const fetchProjectTasks = async (projectId) => {
    try {
      setTasksLoading(true);
      const response = await api.get(`/tasks/project/${projectId}`);

      if (response.data.success && response.data.tasks) {
        setProjectTasks(response.data.tasks);
      }
    } catch (error) {
      console.error('Error fetching project tasks:', error);
      setProjectTasks([]);
    } finally {
      setTasksLoading(false);
    }
  };

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

  // Form validation
  const validateForm = () => {
    const errors = {};

    if (!formData.projectName.trim()) errors.projectName = 'Project name is required';
    if (!formData.projectType) errors.projectType = 'Project type is required';
    if (!formData.description.trim()) errors.description = 'Description is required';
    if (!formData.clientName.trim()) errors.clientName = 'Client name is required';
    if (!formData.clientEmail.trim()) {
      errors.clientEmail = 'Client email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.clientEmail)) {
      errors.clientEmail = 'Invalid email format';
    }
    if (!formData.clientPhone.trim()) {
      errors.clientPhone = 'Client phone is required';
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
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        clientPhone: formData.clientPhone.replace(/\D/g, ''),
        startDate: formData.startDate,
        endDate: formData.endDate,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        location: formData.location,
        manager: formData.manager
      };

      console.log("Create Project Payload:", apiPayload);

      const response = await api.post('/projects', apiPayload);

      if (response.data.success) {
        toast.success('Project created successfully!');
        setFormData({
          projectName: '',
          projectType: '',
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
          currency: 'INR',
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

  // Project card component
  const ProjectCard = ({ project }) => {
    const progress = getProgress(project.status);
    const risk = getRiskBadge(project);
    const manager = project.manager?.fullName || 'John Doe';

    return (
      <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 group">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{project.projectName}</h3>
            <p className="text-sm text-gray-500 capitalize">{project.projectType?.replace('-', ' ')}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={project.status} />
            <div className="relative">
              <button onClick={() => setShowMenu(showMenu === project._id ? null : project._id)} className="text-gray-500 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
              {/* Kebab menu dropdown */}
              <div className={`absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 ${showMenu === project._id ? 'block' : 'hidden'}`}>
                <div className="py-1">
                  <button onClick={() => { fetchProjectDetails(project._id); setShowMenu(null); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">View Details</button>
                  <button onClick={() => { toast.info('Edit Project feature coming soon'); setShowMenu(null); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">Edit Project</button>
                  <button onClick={() => { toast.info('Archive feature coming soon'); setShowMenu(null); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">Archive</button>
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
              className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-1000 ease-out"
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
            <p className="font-semibold text-gray-900">{new Date(project.startDate).toLocaleDateString()}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-gray-500 font-medium">End Date</p>
            <p className="font-semibold text-gray-900">{new Date(project.endDate).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-gray-500 text-sm font-medium">Budget</p>
            <p className="font-bold text-green-600">₹{project.budget?.toLocaleString() || 'N/A'}</p>
          </div>
          <button
            onClick={() => fetchProjectDetails(project._id)}
            className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            View Details
          </button>
        </div>
      </div>
    );
  };

  // Project details modal
  const ProjectDetailsModal = () => {
    if (!selectedProject || !showModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">{selectedProject.projectName}</h2>
                <p className="text-gray-500 capitalize">{selectedProject.projectType?.replace('-', ' ')}</p>
              </div>
              <StatusBadge status={selectedProject.status} />
            </div>
            <button
              onClick={() => {
                setShowModal(false);
                setProjectTasks([]);
              }}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Description */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 shadow-sm border border-blue-100">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Description
              </h3>
              <p className="text-gray-700 leading-relaxed">{selectedProject.description}</p>
            </div>

            {/* Client Information and Project Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 shadow-sm border border-green-100">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Client Information
                </h3>
                <div className="space-y-2">
                  <p className="text-gray-700"><span className="font-medium">Name:</span> {selectedProject.clientName}</p>
                  <p className="text-gray-700"><span className="font-medium">Email:</span> {selectedProject.clientEmail}</p>
                  <p className="text-gray-700"><span className="font-medium">Phone:</span> {selectedProject.clientPhone}</p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 shadow-sm border border-purple-100">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Project Details
                </h3>
                <div className="space-y-2">
                  <p className="text-gray-700"><span className="font-medium">Type:</span> {selectedProject.projectType}</p>
                  <p className="text-gray-700 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-medium">Location:</span> {selectedProject.location}
                  </p>
                </div>
              </div>
            </div>

            {/* Timeline and Financials */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 shadow-sm border border-yellow-100">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Timeline
                </h3>
                <div className="space-y-2">
                  <p className="text-gray-700"><span className="font-medium">Start:</span> {new Date(selectedProject.startDate).toLocaleDateString()}</p>
                  <p className="text-gray-700"><span className="font-medium">End:</span> {new Date(selectedProject.endDate).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-6 shadow-sm border border-teal-100">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                  <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  Financials
                </h3>
                <p className="text-gray-700 text-lg"><span className="font-medium">Budget:</span> ₹{selectedProject.budget?.toLocaleString()}</p>
              </div>
            </div>

            {/* Team Members */}
            {selectedProject.teamMembers && selectedProject.teamMembers.length > 0 && (
              <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-6 shadow-sm border border-pink-100">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                  <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Team Members
                </h3>
                <div className="flex flex-wrap gap-3">
                  {selectedProject.teamMembers.map((member, index) => (
                    <span key={index} className="bg-white text-gray-800 px-4 py-2 rounded-full text-sm font-medium shadow-sm border border-gray-200">
                      {member.fullName || `Member ${index + 1}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Tasks */}
            <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Recent Tasks
                </h3>
                <button className="text-primary-600 hover:text-primary-700 text-sm font-semibold px-3 py-1 rounded-lg hover:bg-primary-50 transition-colors" onClick={() => {
                navigate(`/projects/${selectedProject._id}`);
                setShowModal(false);
                setProjectTasks([]);
              }}>
                  View All Tasks →
                </button>
              </div>
              {tasksLoading ? (
                <div className="flex justify-center items-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
                </div>
              ) : projectTasks.length === 0 ? (
                <p className="text-gray-500 text-sm">No tasks found for this project.</p>
              ) : (
                <div className="space-y-3">
                  {projectTasks.slice(0, 5).map((task) => (
                    <div key={task._id} className="bg-white rounded-lg p-3 border">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            task.priority === 'high' ? 'bg-red-100 text-red-800' :
                            task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {task.priority}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            task.status === 'completed' ? 'bg-green-100 text-green-800' :
                            task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                            task.status === 'todo' ? 'bg-gray-100 text-gray-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {task.status}
                          </span>
                        </div>
                      </div>
                      {task.description && (
                        <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                      )}
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>Assigned to: {task.assignedTo?.fullName || task.assignedTo?.username}</span>
                        <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                      </div>
                      {task.progress !== undefined && (
                        <div className="mt-2">
                          <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                            <span>Progress</span>
                            <span>{task.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-primary-600 h-1.5 rounded-full"
                              style={{ width: `${task.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex justify-between items-center pt-6 border-t border-gray-200">
            <button
              onClick={() => {
                navigate(`/projects/${selectedProject._id}`);
                setShowModal(false);
                setProjectTasks([]);
              }}
              className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 font-medium shadow-md hover:shadow-lg transition-all duration-200"
            >
              Open Full Page
            </button>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowModal(false);
                  setProjectTasks([]);
                }}
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-colors"
              >
                Close
              </button>
              <button
              onClick={() => {
                navigate(`/projects/${selectedProject._id}`);
                setShowModal(false);
                setProjectTasks([]);
              }}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium shadow-md hover:shadow-lg transition-all duration-200"
              >
                Edit Project
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Top Control Bar */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        {/* Row 1: Heading and Controls */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Projects Management</h1>
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 rounded-md p-1">
              <button
                onClick={() => setViewMode('card')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'card' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Card View
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Table View
              </button>
            </div>
            {auth.user?.role === 'admin' && (
              <button onClick={() => setShowAddForm(!showAddForm)} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
                {showAddForm ? 'Cancel' : '+ Add Project'}
              </button>
            )}
          </div>
        </div>
        {/* Row 2: Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {/* Status Filter */}
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Statuses</option>
              <option value="planning">Planning</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On Hold</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          {/* Date Range */}
          <div className="flex gap-1">
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Start Date"
            />
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="End Date"
            />
          </div>
        </div>
      </div>

      {/* Add Project Form */}
      {showAddForm && auth.user?.role === 'admin' && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-3">
            <h2 className="text-xl font-semibold text-white">Create New Project</h2>
            <p className="text-primary-200 text-xs">Fill in the project details below</p>
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
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${
                    formErrors.projectName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter project name"
                />
                {formErrors.projectName && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.projectName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Type *
                </label>
                <p className="text-xs text-gray-400 mb-2">Select the primary nature of this project (used for reporting & templates later)</p>
                <select
                  name="projectType"
                  value={formData.projectType}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${
                    formErrors.projectType ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select project type</option>
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
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${
                  formErrors.description ? 'border-red-300' : 'border-gray-300'
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
                    Client Name *
                  </label>
                  <input
                    type="text"
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${
                      formErrors.clientName ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Client full name"
                  />
                  {formErrors.clientName && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.clientName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Email *
                  </label>
                  <input
                    type="email"
                    name="clientEmail"
                    value={formData.clientEmail}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${
                      formErrors.clientEmail ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="client@example.com"
                  />
                  {formErrors.clientEmail && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.clientEmail}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Phone *
                  </label>
                  <input
                    type="tel"
                    name="clientPhone"
                    value={formData.clientPhone}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${
                      formErrors.clientPhone ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="10-digit phone number"
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
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${
                      formErrors.startDate ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.startDate && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.startDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${
                      formErrors.endDate ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
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
                <div className="flex gap-2">
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                  >
                    <option value="INR">INR</option>
                    <option value="AED">AED</option>
                  </select>
                  <input
                    type="number"
                    name="budget"
                    value={formData.budget}
                    onChange={handleInputChange}
                    className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${
                      formErrors.budget ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Project budget"
                    min="0"
                    step="1000"
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
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${
                    formErrors.manager ? 'border-red-300' : 'border-gray-300'
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
                className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
      {!loading && !error && sortedProjects.length === 0 && projects.length > 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Match Filters</h3>
          <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
        </div>
      )}

      {!loading && !error && projects.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Found</h3>
          <p className="text-gray-500">There are no projects available. {auth.user?.role === 'admin' && 'Create your first project to get started!'}</p>
        </div>
      )}

      {/* Projects view */}
      {!loading && !error && sortedProjects.length > 0 && (
        <>
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedProjects.map((project) => (
                <ProjectCard key={project._id} project={project} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        if (sortColumn === 'projectName') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortColumn('projectName');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      Project Name {sortColumn === 'projectName' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        if (sortColumn === 'clientName') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortColumn('clientName');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      Client {sortColumn === 'clientName' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        if (sortColumn === 'manager') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortColumn('manager');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      Manager {sortColumn === 'manager' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        if (sortColumn === 'status') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortColumn('status');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      Status {sortColumn === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        if (sortColumn === 'progress') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortColumn('progress');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      Progress {sortColumn === 'progress' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        if (sortColumn === 'startDate') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortColumn('startDate');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      Start Date {sortColumn === 'startDate' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        if (sortColumn === 'endDate') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortColumn('endDate');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      End Date {sortColumn === 'endDate' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        if (sortColumn === 'budget') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortColumn('budget');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      Budget {sortColumn === 'budget' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        if (sortColumn === 'risk') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortColumn('risk');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      Risk {sortColumn === 'risk' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedProjects.map((project) => (
                    <tr key={project._id} className="hover:bg-gray-50 group">
                      <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {project.projectName}
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                        {project.clientName}
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                        {project.manager?.fullName || 'John Doe'}
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap">
                        <StatusBadge status={project.status} />
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div className="bg-primary-600 h-1.5 rounded-full" style={{ width: `${getProgress(project.status)}%` }}></div>
                          </div>
                          <span className="text-xs">{getProgress(project.status)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                        {new Date(project.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                        {new Date(project.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                        ₹{project.budget?.toLocaleString() || 'N/A'}
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskBadge(project).color}`}>
                          {getRiskBadge(project).text}
                        </span>
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500 relative">
                        <button className="text-gray-500 hover:text-gray-700">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 hidden group-hover:block">
                          <div className="py-1">
                            <button onClick={() => fetchProjectDetails(project._id)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">View Details</button>
                            <button onClick={() => toast.info('Edit Project feature coming soon')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">Edit Project</button>
                            <button onClick={() => toast.info('Archive feature coming soon')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">Archive</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </>
      )}

      {/* Project details modal */}
      <ProjectDetailsModal />

      {/* Summary section */}
      {!loading && !error && projects.length > 0 && (
        <div className="mt-8 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Projects Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">📊</span>
                <p className="text-gray-600 text-sm font-medium">Total Projects</p>
              </div>
              <p className="text-3xl font-bold text-blue-600">{projects.length}</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">⏳</span>
                <p className="text-gray-600 text-sm font-medium">In Progress</p>
              </div>
              <p className="text-3xl font-bold text-yellow-600">
                {projects.filter(p => p.status === 'in-progress').length}
              </p>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">📝</span>
                <p className="text-gray-600 text-sm font-medium">Planning</p>
              </div>
              <p className="text-3xl font-bold text-indigo-600">
                {projects.filter(p => p.status === 'planning').length}
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">✅</span>
                <p className="text-gray-600 text-sm font-medium">Completed</p>
              </div>
              <p className="text-3xl font-bold text-green-600">
                {projects.filter(p => p.status === 'completed').length}
              </p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">⚠️</span>
                <p className="text-gray-600 text-sm font-medium">At Risk</p>
              </div>
              <p className="text-3xl font-bold text-red-600">
                {projects.filter(p => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const endDate = new Date(p.endDate);
                  return p.status === 'delayed' || p.status === 'on-hold' || (endDate < today && p.status !== 'completed');
                }).length}
              </p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">💰</span>
                <p className="text-gray-600 text-sm font-medium">Total Budget</p>
              </div>
              <p className="text-3xl font-bold text-emerald-600">
                ₹{projects.reduce((sum, p) => sum + (p.budget || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;