import React, { useState, useEffect, useRef } from 'react';
import api from '../store/api';
import { toast } from 'react-toastify';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import { getLabelStyle, DEFAULT_TASK_LABELS } from '../utils/labelUtils';

const TaskCreateModal = ({ isOpen, onClose, project, staff, managers, onTaskCreated, projects, task, userRole, defaultProjectId }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    startDate: '', // Added startDate
    deadline: '',
    assignedTo: '',
    cc: '',
    estimatedHours: '',
    project: (project && project._id) ? project._id : ''
  });
  const [loading, setLoading] = useState(false);
  const [availableLabels, setAvailableLabels] = useState(DEFAULT_TASK_LABELS);
  const INDEPENDENT_PROJECT_ID = 'independent';
  const INDEPENDENT_PROJECT = { _id: INDEPENDENT_PROJECT_ID, projectName: 'Independent Task (No Project)', jobOrder: '' };

  const [availableProjects, setAvailableProjects] = useState(projects ? [INDEPENDENT_PROJECT, ...projects] : [INDEPENDENT_PROJECT]);
  const [deadlineInputType, setDeadlineInputType] = useState('text');
  const [startDateInputType, setStartDateInputType] = useState('text'); // Added state for input type toggle

  // Searchable dropdown states
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const wrapperRef = useRef(null);

  const isEdit = !!task;

  // Sync availableProjects with props
  useEffect(() => {
    if (projects && projects.length > 0) {
      setAvailableProjects([INDEPENDENT_PROJECT, ...projects]);
    } else {
      setAvailableProjects([INDEPENDENT_PROJECT]);
    }
  }, [projects]);

  // Initial fetch if needed
  useEffect(() => {
    if (isOpen && !project && (!projects || projects.length === 0)) {
      fetchProjects();
    }
  }, [isOpen, project, projects]);

  // Load admin-managed labels when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const fetchLabels = async () => {
      try {
        const response = await api.get('/task-labels');
        const names = (response.data.labels || []).map((l) => l.name);
        if (names.length > 0) setAvailableLabels(names);
      } catch (error) {
        console.error('Failed to fetch task labels:', error);
      }
    };
    fetchLabels();
  }, [isOpen]);

  // Update filtered projects when availableProjects or searchTerm changes
  useEffect(() => {
    if (searchTerm === '') {
      setFilteredProjects(availableProjects);
    } else {
      setFilteredProjects(
        availableProjects.filter(p =>
          p.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.jobOrder && String(p.jobOrder).toLowerCase().includes(searchTerm.toLowerCase()))
        )
      );
    }
  }, [availableProjects, searchTerm]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsDropdownOpen(false);

        // If the typed term doesn't match the selected project, reset it to the selected project's name
        // OR clear it if no project is selected.
        const currentProject = availableProjects.find(p => p._id === formData.project);
        if (currentProject) {
          setSearchTerm(currentProject.projectName);
        } else if (!formData.project) {
          setSearchTerm(''); // Clear if nothing selected
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef, availableProjects, formData.project]);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '', // Populate startDate
        deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '',
        assignedTo: task.assignedTo?._id || '',
        cc: task.cc?._id || '',
        estimatedHours: task.estimatedHours || '',
        project: task.project?._id || INDEPENDENT_PROJECT_ID,
        label: task.label || ''
      });
      // Set search term for edit mode
      if (task.project?.projectName) {
        setSearchTerm(task.project.projectName);
      } else {
        setSearchTerm(INDEPENDENT_PROJECT.projectName);
      }
    } else {
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        startDate: '', // Reset startDate
        deadline: '',
        assignedTo: '',
        cc: '',
        estimatedHours: '',
        project: project ? project._id : '',
        label: ''
      });
      // Set search term if project is pre-selected
      if (project?.projectName) {
        setSearchTerm(project.projectName);
      } else {
        setSearchTerm('');
      }
    }
  }, [task, project]);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      let fetchedProjects = response.data.projects || [];

      // If editing a task, ensure its project is in the list
      if (task?.project && !fetchedProjects.find(p => p._id === task.project._id)) {
        fetchedProjects = [...fetchedProjects, task.project];
      }

      setAvailableProjects([INDEPENDENT_PROJECT, ...fetchedProjects]);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  // Ensure task project is in availableProjects when task changes or projects prop changes
  useEffect(() => {
    if (task?.project) {
      setAvailableProjects(prev => {
        if (!prev.find(p => p._id === task.project._id)) {
          return [INDEPENDENT_PROJECT, ...prev, task.project];
        }
        return prev;
      });
    }
  }, [task]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const selectedProject = project || availableProjects.find(p => p._id === formData.project);
    if (!selectedProject) {
      toast.error('Please select a project');
      return;
    }

    setLoading(true);
    try {
      const taskData = {
        title: formData.title,
        description: formData.description,
        project: selectedProject._id === INDEPENDENT_PROJECT_ID ? undefined : selectedProject._id,
        assignedTo: formData.assignedTo || undefined,
        cc: formData.cc || undefined,
        startDate: formData.startDate || undefined, // Include startDate
        deadline: formData.deadline,
        priority: formData.priority,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
        label: formData.label || undefined
      };

      let response;
      if (isEdit) {
        // For edit, send allowed fields
        const editData = {
          title: taskData.title,
          description: taskData.description,
          startDate: taskData.startDate, // Include startDate
          deadline: taskData.deadline,
          priority: taskData.priority,
          label: taskData.label
        };
        if (userRole === 'admin' || userRole === 'manager') {
          editData.assignedTo = taskData.assignedTo || undefined;
          editData.cc = taskData.cc || undefined;
        }
        response = await api.put(`/tasks/${task._id}`, editData);
        if (response.data.success) {
          toast.success('Task updated successfully!');
          onTaskCreated && onTaskCreated(response.data.task);
          handleClose();
        }
      } else {
        response = await api.post('/tasks', taskData);
        if (response.data.success) {
          toast.success('Task created successfully!');
          onTaskCreated && onTaskCreated(response.data.task);
          handleClose();
        }
      }
    } catch (error) {
      console.error('Error saving task:', error);
      const errorMessage = error.response?.data?.message || error.message || `Failed to ${isEdit ? 'update' : 'create'} task`;
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (selectedProject) => {
    setFormData({ ...formData, project: selectedProject._id });
    setSearchTerm(selectedProject.projectName);
    setIsDropdownOpen(false);
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      startDate: '',
      deadline: '',
      assignedTo: '',
      cc: '',
      estimatedHours: '',
      project: project ? project._id : (defaultProjectId || ''),
      label: ''
    });
    setSearchTerm('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Task' : `Create Task${project?.projectName ? ` for ${project.projectName}` : ''}`}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!project && !isEdit && (
            <div className="relative" ref={wrapperRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Project * (or select Independent)</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (!isDropdownOpen) setIsDropdownOpen(true);
                    // Clear selection if user clears input or types something new (until they select)
                    if (formData.project && e.target.value !== availableProjects.find(p => p._id === formData.project)?.projectName) {
                      setFormData(prev => ({ ...prev, project: '' }));
                    }
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder="Type to search project..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required // This might need custom validation since it's just a search field
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredProjects.length > 0 ? (
                    filteredProjects.map((proj) => (
                      <button
                        key={proj._id}
                        type="button"
                        onClick={() => handleProjectSelect(proj)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors border-b border-gray-100 last:border-0"
                      >
                        <div className="font-medium text-gray-900">{proj.projectName}</div>
                        {proj.jobOrder && (
                          <div className="text-xs text-gray-500">Job Order: {proj.jobOrder}</div>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-500">No projects found</div>
                  )}
                </div>
              )}
              {/* Hidden input to ensure form validation works for the 'required' attribute naturally if needed, 
                  though we check in handleSubmit anyway. */}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Task Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Optional — add context if needed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Label</label>
            <div className="flex flex-wrap gap-2">
              {availableLabels.map((label) => {
                const style = getLabelStyle(label);
                const isSelected = formData.label === label;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setFormData({ ...formData, label: formData.label === label ? '' : label })}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all border flex items-center gap-1.5 ${style.bg} ${style.text} ${style.border} ${isSelected
                      ? 'ring-2 ring-offset-1 ring-blue-500 shadow-md scale-105'
                      : 'opacity-80 hover:opacity-100 hover:shadow-sm'
                      }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type={startDateInputType}
                value={startDateInputType === 'date' ? formData.startDate : formatDateDDMMYYYY(formData.startDate)}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                onFocus={() => setStartDateInputType('date')}
                onBlur={() => setStartDateInputType('text')}
                placeholder="dd/mm/yyyy"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Deadline *</label>
              <input
                type={deadlineInputType}
                value={deadlineInputType === 'date' ? formData.deadline : formatDateDDMMYYYY(formData.deadline)}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                onFocus={() => setDeadlineInputType('date')}
                onBlur={() => setDeadlineInputType('text')}
                placeholder="dd/mm/yyyy"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            {!isEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Hours</label>
                <input
                  type="number"
                  value={formData.estimatedHours}
                  onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step="0.5"
                />
                <p className="text-xs text-gray-500 mt-1">Optional — total estimated effort in hours</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {(userRole === 'admin' || userRole === 'manager') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign to {userRole === 'admin' ? 'Staff/Manager' : 'Staff'}</label>
                <select
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Unassigned</option>
                  {/* Admin can assign to Managers */}
                  {userRole === 'admin' && managers?.map((manager) => (
                    <option key={manager._id} value={manager._id}>
                      {manager.username} - Manager
                    </option>
                  ))}
                  {/* Both can assign to Staff */}
                  {staff?.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.username}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {(userRole === 'admin' || userRole === 'manager') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign Supervisor (CC)</label>
                <select
                  value={formData.cc}
                  onChange={(e) => setFormData({ ...formData, cc: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No Supervisor</option>
                  {managers && staff ? [...managers, ...staff].map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.username} - {member.role}
                    </option>
                  )) : staff?.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.username}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 text-center mt-4">Task progress will be updated by assigned staff</p>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Task' : 'Create Task')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskCreateModal;