import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import api from '../store/api';
import { toast } from 'react-toastify';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const auth = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // Fetch projects data
  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/projects');

      if (response.data.success && response.data.projects) {
        const allProjects = response.data.projects;
        const { user } = auth;

        // Apply role-based filtering
        if (user?.role === 'admin') {
          // Admin sees all projects
          setProjects(allProjects);
        } else if (user?.role === 'manager') {
          // Manager sees only projects they manage
          const managerProjects = allProjects.filter(project =>
            project.manager?._id === user._id || project.manager === user._id
          );
          setProjects(managerProjects);
        } else if (user?.role === 'staff') {
          // Staff sees only projects they are assigned to
          const staffProjects = allProjects.filter(project =>
            project.teamMembers?.some(member =>
              member?._id === user._id || member === user._id
            )
          );
          setProjects(staffProjects);
        } else {
          // Default: show all projects if role is not recognized
          setProjects(allProjects);
        }
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
  const ProjectCard = ({ project }) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-gray-900">{project.projectName}</h3>
        <StatusBadge status={project.status} />
      </div>

      <p className="text-gray-600 mb-4">{project.description}</p>

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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Projects Management</h1>
        {auth.user?.role === 'admin' && (
          <button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
            + Add Project
          </button>
        )}
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

      {/* Projects grid */}
      {!loading && !error && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project._id} project={project} />
          ))}
        </div>
      )}

      {/* Project details modal */}
      <ProjectDetailsModal />

      {/* Summary section */}
      {!loading && !error && projects.length > 0 && (
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Projects Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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