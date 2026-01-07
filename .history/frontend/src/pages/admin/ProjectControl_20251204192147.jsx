import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
  Filler
);

const ProjectControl = () => {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    manager: '',
    department: '',
    priority: '',
    search: '',
    dateRange: 'all'
  });

  const auth = useSelector((state) => state.auth);

  // New project form state
  const [newProject, setNewProject] = useState({
    projectName: '',
    description: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    projectType: 'construction',
    location: '',
    budget: '',
    startDate: '',
    endDate: '',
    priority: 'medium',
    department: 'construction',
    manager: '',
    teamMembers: []
  });

  // Fetch all projects (admin sees all)
  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get('/api/projects', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success && response.data.projects) {
        setProjects(response.data.projects);
        setFilteredProjects(response.data.projects);
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
    let filtered = [...projects];

    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }
    if (filters.manager) {
      filtered = filtered.filter(p => p.manager?._id === filters.manager);
    }
    if (filters.department) {
      filtered = filtered.filter(p => p.department === filters.department);
    }
    if (filters.priority) {
      filtered = filtered.filter(p => p.priority === filters.priority);
    }
    if (filters.search) {
      filtered = filtered.filter(p =>
        p.projectName.toLowerCase().includes(filters.search.toLowerCase()) ||
        p.clientName.toLowerCase().includes(filters.search.toLowerCase()) ||
        p.description.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Date range filtering
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (filters.dateRange) {
        case 'this-week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'this-month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'this-quarter':
          filterDate.setMonth(now.getMonth() - 3);
          break;
        case 'this-year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filtered = filtered.filter(p => new Date(p.createdAt) >= filterDate);
    }

    setFilteredProjects(filtered);
  }, [projects, filters]);

  // Create project
  const createProject = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post('/api/projects', newProject, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        toast.success('Project created successfully!');
        setShowCreateModal(false);
        setNewProject({
          projectName: '',
          description: '',
          clientName: '',
          clientEmail: '',
          clientPhone: '',
          projectType: 'construction',
          location: '',
          budget: '',
          startDate: '',
          endDate: '',
          priority: 'medium',
          department: 'construction',
          manager: '',
          teamMembers: []
        });
        fetchProjects();
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project: ' + (error.response?.data?.message || error.message));
    }
  };

  // Update project
  const updateProject = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.put(`/api/projects/${selectedProject._id}`, selectedProject, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        toast.success('Project updated successfully!');
        setShowEditModal(false);
        fetchProjects();
      }
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project: ' + (error.response?.data?.message || error.message));
    }
  };

  // Delete project
  const deleteProject = async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await axios.delete(`/api/projects/${projectId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.data.success) {
          toast.success('Project deleted successfully!');
          fetchProjects();
        }
      } catch (error) {
        console.error('Error deleting project:', error);
        toast.error('Failed to delete project: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  // Bulk operations
  const bulkUpdateStatus = async (status) => {
    if (selectedProjects.length === 0) {
      toast.warning('Please select projects to update');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const promises = selectedProjects.map(projectId =>
        axios.put(`/api/projects/${projectId}`, { status }, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );

      await Promise.all(promises);
      toast.success(`Updated ${selectedProjects.length} projects`);
      setSelectedProjects([]);
      fetchProjects();
    } catch (error) {
      toast.error('Failed to update projects');
    }
  };

  useEffect(() => {
    if (auth.isAuthenticated) {
      fetchProjects();
    }
  }, [auth.isAuthenticated]);

  // Status badge component
  const StatusBadge = ({ status }) => {
    const statusConfig = {
      'planning': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Planning' },
      'in-progress': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'In Progress' },
      'on-hold': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'On Hold' },
      'completed': { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      'cancelled': { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' },
      'delayed': { bg: 'bg-red-100', text: 'text-red-800', label: 'Delayed' }
    };

    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  // Priority badge component
  const PriorityBadge = ({ priority }) => {
    const priorityConfig = {
      'low': { bg: 'bg-green-100', text: 'text-green-800', label: 'Low' },
      'medium': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Medium' },
      'high': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'High' },
      'critical': { bg: 'bg-red-100', text: 'text-red-800', label: 'Critical' }
    };

    const config = priorityConfig[priority] || { bg: 'bg-gray-100', text: 'text-gray-800', label: priority };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  // Analytics data
  const analyticsData = {
    statusDistribution: {
      labels: ['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled'],
      datasets: [{
        data: [
          filteredProjects.filter(p => p.status === 'planning').length,
          filteredProjects.filter(p => p.status === 'in-progress').length,
          filteredProjects.filter(p => p.status === 'on-hold').length,
          filteredProjects.filter(p => p.status === 'completed').length,
          filteredProjects.filter(p => p.status === 'cancelled').length
        ],
        backgroundColor: ['#3B82F6', '#F59E0B', '#F97316', '#10B981', '#EF4444']
      }]
    },
    budgetAnalysis: {
      labels: filteredProjects.slice(0, 10).map(p => p.projectName.substring(0, 15)),
      datasets: [{
        label: 'Budget (₹)',
        data: filteredProjects.slice(0, 10).map(p => p.budget || 0),
        backgroundColor: '#3B82F6'
      }]
    },
    timelineData: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'Projects Started',
        data: [12, 19, 15, 25, 22, 30],
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true
      }]
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Project Control Center</h1>
          <p className="text-gray-600 mt-1">Enterprise-level project management and oversight</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowAnalyticsModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Analytics
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
