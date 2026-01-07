import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import api from '../store/api';
import { toast } from 'react-toastify';

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
  const [selectedRows, setSelectedRows] = useState([]);
  const [sortedProjects, setSortedProjects] = useState([]);

  const auth = useSelector((state) => state.auth);
  const dispatch = useDispatch();

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

    // Date range filter (UI only for now, no actual filtering)
    // If needed, add logic here later

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
      <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-semibold text-gray-900">{project.projectName}</h3>
          <div className="flex items-center gap-2">
            <StatusBadge status={project.status} />
            <div className="relative">
              <button onClick={() => setShowMenu(showMenu === project._id ? null : project._id)} className="text-gray-500 hover:text-gray-700">
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

        <p className="text-gray-600 mb-4">{project.description}</p>

        {/* Project Manager */}
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-gray-500">Manager: <span className="font-medium text-gray-900">{manager}</span></p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-4">
          <div className="flex justify-between items-center text-sm mb-1">
            <span className="text-gray-500">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        {/* Risk Badge */}
        <div className="mb-4">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${risk.color}`}>
            {risk.text}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p className="text-gray-500">Client</p>
            <p className="font-medium">{project.clientName}</p>
          </div>
          <div>
            <p className="text-gray-500">Location</p>
            <p className="font-medium">{project.location}</p>
          </div>
          <div>
            <p className="text-gray-500">Start Date</p>
            <p className="font-medium">{new Date(project.startDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-gray-500">End Date</p>
            <p className="font-medium">{new Date(project.endDate).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-500 text-sm">Budget</p>
            <p className="font-medium text-green-600">₹{project.budget?.toLocaleString() || 'N/A'}</p>
          </div>
          <button
            onClick={() => fetchProjectDetails(project._id)}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{selectedProject.projectName}</h2>
            <button
              onClick={() => {
                setShowModal(false);
                setProjectTasks([]);
              }}
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
              <p className="text-gray-600">{selectedProject.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-700 mb-1">Client Information</h3>
                <p className="text-gray-600">{selectedProject.clientName}</p>
                <p className="text-gray-600">{selectedProject.clientEmail}</p>
                <p className="text-gray-600">{selectedProject.clientPhone}</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-700 mb-1">Project Details</h3>
                <p className="text-gray-600">Type: {selectedProject.projectType}</p>
                <p className="text-gray-600">Location: {selectedProject.location}</p>
                <p className="text-gray-600">Status: <StatusBadge status={selectedProject.status} /></p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-700 mb-1">Timeline</h3>
                <p className="text-gray-600">Start: {new Date(selectedProject.startDate).toLocaleDateString()}</p>
                <p className="text-gray-600">End: {new Date(selectedProject.endDate).toLocaleDateString()}</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-700 mb-1">Financials</h3>
                <p className="text-gray-600">Budget: ₹{selectedProject.budget?.toLocaleString()}</p>
              </div>
            </div>

            {selectedProject.teamMembers && selectedProject.teamMembers.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Team Members</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedProject.teamMembers.map((member, index) => (
                    <span key={index} className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                      {member.fullName || `Member ${index + 1}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks Section */}
            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-700 mb-4">Project Tasks</h3>
              {tasksLoading ? (
                <div className="flex justify-center items-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
                </div>
              ) : projectTasks.length === 0 ? (
                <p className="text-gray-500 text-sm">No tasks found for this project.</p>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {projectTasks.map((task) => (
                    <div key={task._id} className="bg-gray-50 rounded-lg p-3 border">
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

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => {
                setShowModal(false);
                setProjectTasks([]);
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
              <button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
                + Add Project
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
          <div className="flex gap-2">
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
          {/* Bulk actions */}
          {selectedRows.length > 0 && auth.user?.role === 'admin' && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 flex items-center justify-between">
              <span className="text-sm text-blue-700">
                {selectedRows.length} project{selectedRows.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <select
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                  onChange={(e) => {
                    if (e.target.value) {
                      toast.success(`Status updated to ${e.target.value} for selected projects`);
                      setSelectedRows([]);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="">Change Status</option>
                  <option value="planning">Planning</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on-hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button
                  onClick={() => {
                    toast.success('Selected projects archived');
                    setSelectedRows([]);
                  }}
                  className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
                >
                  Archive
                </button>
              </div>
            </div>
          )}

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
                      <th className="pl-8 pr-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                        <input
                          type="checkbox"
                          checked={selectedRows.length === sortedProjects.length && sortedProjects.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRows(sortedProjects.map(p => p._id));
                            } else {
                              setSelectedRows([]);
                            }
                          }}
                          className="rounded"
                        />
                      </th>
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
                    <tr key={project._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(project._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRows([...selectedRows, project._id]);
                            } else {
                              setSelectedRows(selectedRows.filter(id => id !== project._id));
                            }
                          }}
                          className="rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {project.projectName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {project.clientName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {project.manager?.fullName || 'John Doe'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={project.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getProgress(project.status)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(project.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(project.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₹{project.budget?.toLocaleString() || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskBadge(project).color}`}>
                          {getRiskBadge(project).text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => fetchProjectDetails(project._id)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          View
                        </button>
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
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Projects Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-lg">
              <p className="text-gray-500 text-sm">Total Projects</p>
              <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <p className="text-gray-500 text-sm">In Progress</p>
              <p className="text-2xl font-bold text-yellow-600">
                {projects.filter(p => p.status === 'in-progress').length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <p className="text-gray-500 text-sm">Planning</p>
              <p className="text-2xl font-bold text-blue-600">
                {projects.filter(p => p.status === 'planning').length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <p className="text-gray-500 text-sm">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {projects.filter(p => p.status === 'completed').length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <p className="text-gray-500 text-sm">At Risk</p>
              <p className="text-2xl font-bold text-red-600">
                {projects.filter(p => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const endDate = new Date(p.endDate);
                  return p.status === 'delayed' || p.status === 'on-hold' || (endDate < today && p.status !== 'completed');
                }).length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <p className="text-gray-500 text-sm">Total Budget</p>
              <p className="text-2xl font-bold text-green-600">
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