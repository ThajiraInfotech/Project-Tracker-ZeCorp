const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const emailService = require('../utils/emailService');
const cloudinaryService = require('../utils/cloudinaryService');

// Create a new project
exports.createProject = async (req, res) => {
  try {
    const { projectName, projectType, description, clientName, clientEmail, clientPhone, startDate, endDate, budget, location, manager, teamMembers } = req.body;

    // Validate dates
    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Create project
    const project = new Project({
      projectName,
      projectType,
      description,
      clientName,
      clientEmail,
      clientPhone,
      startDate,
      endDate,
      budget,
      location,
      manager,
      teamMembers: teamMembers || [],
      createdBy: req.user._id
    });

    await project.save();

    // Send notification to manager
    const managerUser = await User.findById(manager);
    if (managerUser && managerUser.email) {
      await emailService.sendEmail(
        managerUser.email,
        `New Project Assigned: ${projectName}`,
        `<p>You have been assigned as manager for project: ${projectName}</p>
         <p>Project starts on ${new Date(startDate).toLocaleDateString()}</p>`
      );
    }

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Failed to create project', error: error.message });
  }
};

// Get all projects
exports.getAllProjects = async (req, res) => {
  try {
    let query = {};

    // Filter by user role
    if (req.user.role === 'staff') {
      query = {
        $or: [
          { manager: req.user._id },
          { teamMembers: req.user._id }
        ]
      };
    } else if (req.user.role === 'manager') {
      query = {
        $or: [
          { manager: req.user._id },
          { createdBy: req.user._id }
        ]
      };
    }

    const projects = await Project.find(query)
      .populate('manager', 'username fullName email')
      .populate('teamMembers', 'username fullName email')
      .populate('createdBy', 'username fullName email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      projects
    });
  } catch (error) {
    console.error('Get all projects error:', error);
    res.status(500).json({ message: 'Failed to get projects' });
  }
};

// Get project by ID
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('manager', 'username fullName email')
      .populate('teamMembers', 'username fullName email')
      .populate('createdBy', 'username fullName email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check authorization
    if (req.user.role === 'staff' &&
        project.manager.toString() !== req.user._id.toString() &&
        !project.teamMembers.some(member => member._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      success: true,
      project
    });
  } catch (error) {
    console.error('Get project by ID error:', error);
    res.status(500).json({ message: 'Failed to get project' });
  }
};

// Update project
exports.updateProject = async (req, res) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['projectName', 'description', 'clientName', 'clientEmail', 'clientPhone', 'startDate', 'endDate', 'budget', 'location', 'status', 'progress'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid updates!' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check authorization
    if (req.user.role !== 'admin' && project.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update project
    updates.forEach(update => project[update] = req.body[update]);
    await project.save();

    res.json({
      success: true,
      message: 'Project updated successfully',
      project
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Failed to update project' });
  }
};

// Delete project
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check authorization
    if (req.user.role !== 'admin' && project.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete all tasks associated with this project
    await Task.deleteMany({ project: project._id });

    await project.deleteOne();

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Failed to delete project' });
  }
};

// Add team member to project
exports.addTeamMember = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check authorization
    if (req.user.role !== 'admin' && project.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { userId } = req.body;

    // Check if user is already in the team
    if (project.teamMembers.includes(userId)) {
      return res.status(400).json({ message: 'User is already in the team' });
    }

    project.teamMembers.push(userId);
    await project.save();

    // Send notification to user
    const user = await User.findById(userId);
    if (user && user.email) {
      await emailService.sendEmail(
        user.email,
        `Added to Project: ${project.projectName}`,
        `<p>You have been added to the project: ${project.projectName}</p>
         <p>Project manager: ${project.manager.fullName || project.manager.username}</p>`
      );
    }

    res.json({
      success: true,
      message: 'Team member added successfully',
      project
    });
  } catch (error) {
    console.error('Add team member error:', error);
    res.status(500).json({ message: 'Failed to add team member' });
  }
};

// Remove team member from project
exports.removeTeamMember = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check authorization
    if (req.user.role !== 'admin' && project.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { userId } = req.params;

    // Check if user is in the team
    if (!project.teamMembers.includes(userId)) {
      return res.status(400).json({ message: 'User is not in the team' });
    }

    project.teamMembers = project.teamMembers.filter(member => member.toString() !== userId);
    await project.save();

    res.json({
      success: true,
      message: 'Team member removed successfully',
      project
    });
  } catch (error) {
    console.error('Remove team member error:', error);
    res.status(500).json({ message: 'Failed to remove team member' });
  }
};

// Upload project files
exports.uploadProjectFiles = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check authorization
    if (req.user.role === 'staff' &&
        project.manager.toString() !== req.user._id.toString() &&
        !project.teamMembers.some(member => member._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Handle file uploads
    if (req.files && req.files.length > 0) {
      const fileUrls = await cloudinaryService.uploadMultipleFiles(req.files);
      project.files = [...project.files, ...fileUrls];
      await project.save();
    }

    res.json({
      success: true,
      message: 'Files uploaded successfully',
      files: project.files
    });
  } catch (error) {
    console.error('Upload project files error:', error);
    res.status(500).json({ message: 'Failed to upload files' });
  }
};

// Get project files
exports.getProjectFiles = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check authorization
    if (req.user.role === 'staff' &&
        project.manager.toString() !== req.user._id.toString() &&
        !project.teamMembers.some(member => member._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      success: true,
      files: project.files
    });
  } catch (error) {
    console.error('Get project files error:', error);
    res.status(500).json({ message: 'Failed to get project files' });
  }
};

// Delete project file
exports.deleteProjectFile = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check authorization
    if (req.user.role !== 'admin' && project.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { fileId } = req.params;
    project.files = project.files.filter(file => file !== fileId);
    await project.save();

    // Delete from Cloudinary
    await cloudinaryService.deleteFile(fileId);

    res.json({
      success: true,
      message: 'File deleted successfully',
      files: project.files
    });
  } catch (error) {
    console.error('Delete project file error:', error);
    res.status(500).json({ message: 'Failed to delete file' });
  }
};

// Get project progress
exports.getProjectProgress = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Calculate progress based on tasks
    const tasks = await Task.find({ project: project._id });
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;

    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    res.json({
      success: true,
      progress,
      totalTasks,
      completedTasks,
      pendingTasks: totalTasks - completedTasks
    });
  } catch (error) {
    console.error('Get project progress error:', error);
    res.status(500).json({ message: 'Failed to get project progress' });
  }
};

// Update project progress
exports.updateProjectProgress = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check authorization
    if (req.user.role !== 'admin' && project.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { progress } = req.body;

    if (progress < 0 || progress > 100) {
      return res.status(400).json({ message: 'Progress must be between 0 and 100' });
    }

    project.progress = progress;
    await project.save();

    res.json({
      success: true,
      message: 'Project progress updated successfully',
      project
    });
  } catch (error) {
    console.error('Update project progress error:', error);
    res.status(500).json({ message: 'Failed to update project progress' });
  }
};