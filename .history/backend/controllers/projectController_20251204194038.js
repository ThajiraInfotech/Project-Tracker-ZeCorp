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

    // Send notification to manager (optional - don't fail if email fails)
    try {
      const managerUser = await User.findById(manager);
      if (managerUser && managerUser.email) {
        await emailService.sendEmail(
          managerUser.email,
          `New Project Assigned: ${projectName}`,
          `<p>You have been assigned as manager for project: ${projectName}</p>
           <p>Project starts on ${new Date(startDate).toLocaleDateString()}</p>`
        );
      }
    } catch (emailError) {
      console.warn('Failed to send project assignment email:', emailError.message);
      // Don't fail project creation due to email error
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

    // Send notification to user (optional - don't fail if email fails)
    try {
      const user = await User.findById(userId);
      if (user && user.email) {
        await emailService.sendEmail(
          user.email,
          `Added to Project: ${project.projectName}`,
          `<p>You have been added to the project: ${project.projectName}</p>
           <p>Project manager: ${project.manager.fullName || project.manager.username}</p>`
        );
      }
    } catch (emailError) {
      console.warn('Failed to send team member notification email:', emailError.message);
      // Don't fail team member addition due to email error
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

// Admin: Assign manager to project
exports.adminAssignManager = async (req, res) => {
  try {
    const { managerId } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if manager exists
    const manager = await User.findById(managerId);
    if (!manager || manager.role !== 'manager') {
      return res.status(404).json({ message: 'Manager not found or user is not a manager' });
    }

    // Check if this is the same manager
    if (project.manager && project.manager.toString() === managerId) {
      return res.status(400).json({ message: 'This manager is already assigned to the project' });
    }

    // Update manager
    project.manager = managerId;

    // Add admin assignment comment
    project.comments = project.comments || [];
    project.comments.push({
      user: req.user._id,
      text: `ADMIN ACTION: Manager changed from ${project.manager?.username || 'Unassigned'} to ${manager.username} by ${req.user.fullName || req.user.username}`,
      createdAt: new Date()
    });

    await project.save();

    // Send notification to new manager (optional - don't fail if email fails)
    try {
      if (manager.email) {
        await emailService.sendEmail(
          manager.email,
          `You've Been Assigned as Project Manager: ${project.projectName}`,
          `<p>You have been assigned as manager for project: ${project.projectName}</p>
           <p>Project status: ${project.status}</p>
           <p>Project deadline: ${new Date(project.endDate).toLocaleDateString()}</p>
           <p>This assignment was made by admin.</p>`
        );
      }
    } catch (emailError) {
      console.warn('Failed to send manager assignment email:', emailError.message);
      // Don't fail manager assignment due to email error
    }

    res.json({
      success: true,
      message: 'Manager assigned to project successfully',
      project
    });
  } catch (error) {
    console.error('Admin assign manager error:', error);
    res.status(500).json({ message: 'Failed to assign manager to project' });
  }
};

// Admin: Get all projects with detailed analytics
exports.adminGetAllProjectsWithAnalytics = async (req, res) => {
  try {
    const { status, riskLevel, managerId } = req.query;

    let query = {};

    if (status) query.status = status;
    if (managerId) query.manager = managerId;

    const projects = await Project.find(query)
      .populate('manager', 'username fullName email')
      .populate('teamMembers', 'username fullName role')
      .populate('createdBy', 'username fullName');

    // Calculate analytics for each project
    const projectsWithAnalytics = await Promise.all(projects.map(async (project) => {
      const tasks = await Task.find({ project: project._id });

      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const overdueTasks = tasks.filter(t => t.status !== 'completed' && new Date(t.deadline) < new Date()).length;
      const highPriorityTasks = tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length;

      const today = new Date();
      const isAtRisk = project.endDate < today && project.status !== 'completed';
      const isDelayed = project.status === 'on-hold' || (project.endDate < today && project.status !== 'completed');

      const riskLevel = isDelayed ? 'high' :
                      isAtRisk ? 'medium' :
                      highPriorityTasks > 2 ? 'low' : 'none';

      const revenueStatus = project.status === 'completed' ? 'realized' :
                          project.status === 'cancelled' ? 'lost' : 'pending';

      return {
        ...project._doc,
        analytics: {
          taskCompletionRate: tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0,
          overdueTasks,
          highPriorityTasks,
          teamSize: project.teamMembers.length,
          daysRemaining: project.endDate ? Math.max(0, Math.floor((new Date(project.endDate) - today) / (1000 * 60 * 60 * 24))) : 0,
          riskLevel,
          revenueStatus,
          budgetUtilization: project.budget ? `${Math.round((completedTasks / tasks.length) * 100)}%` : 'N/A'
        }
      };
    }));

    res.json({
      success: true,
      projects: projectsWithAnalytics,
      summary: {
        totalProjects: projectsWithAnalytics.length,
        totalBudget: projectsWithAnalytics.reduce((sum, p) => sum + (p.budget || 0), 0),
        highRiskProjects: projectsWithAnalytics.filter(p => p.analytics.riskLevel === 'high').length,
        mediumRiskProjects: projectsWithAnalytics.filter(p => p.analytics.riskLevel === 'medium').length,
        completedProjects: projectsWithAnalytics.filter(p => p.status === 'completed').length,
        averageCompletionRate: projectsWithAnalytics.length > 0 ?
          Math.round(projectsWithAnalytics.reduce((sum, p) => sum + p.progress, 0) / projectsWithAnalytics.length) : 0
      }
    });
  } catch (error) {
    console.error('Admin get all projects with analytics error:', error);
    res.status(500).json({ message: 'Failed to get projects with analytics' });
  }
};

// Admin: Mark project as delayed
exports.adminMarkProjectDelayed = async (req, res) => {
  try {
    const { delayReason, estimatedNewDeadline } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Update project status and add delay information
    project.status = 'on-hold';
    project.delayReason = delayReason;
    if (estimatedNewDeadline) {
      project.estimatedNewDeadline = new Date(estimatedNewDeadline);
    }

    // Add admin delay comment
    project.comments = project.comments || [];
    project.comments.push({
      user: req.user._id,
      text: `ADMIN ACTION: Project marked as delayed. Reason: ${delayReason}. Estimated new deadline: ${estimatedNewDeadline || 'Not specified'}. Action by: ${req.user.fullName || req.user.username}`,
      createdAt: new Date()
    });

    await project.save();

    // Send notifications to team
    const teamEmails = [project.manager.email, ...project.teamMembers.map(m => m.email).filter(Boolean)];
    for (const email of teamEmails) {
      if (email) {
        await emailService.sendEmail(
          email,
          `Project Delayed: ${project.projectName}`,
          `<p>Project ${project.projectName} has been marked as delayed by admin.</p>
           <p>Reason: ${delayReason}</p>
           ${estimatedNewDeadline ? `<p>Estimated new deadline: ${new Date(estimatedNewDeadline).toLocaleDateString()}</p>` : ''}
           <p>Please adjust your tasks accordingly.</p>`
        );
      }
    }

    res.json({
      success: true,
      message: 'Project marked as delayed successfully',
      project
    });
  } catch (error) {
    console.error('Admin mark project delayed error:', error);
    res.status(500).json({ message: 'Failed to mark project as delayed' });
  }
};

// Admin: Get delayed and at-risk projects
exports.adminGetDelayedAndAtRiskProjects = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get delayed projects
    const delayedProjects = await Project.find({
      $or: [
        { status: 'on-hold' },
        { status: 'delayed' },
        {
          status: { $ne: 'completed' },
          endDate: { $lt: today }
        }
      ]
    })
    .populate('manager', 'username fullName email')
    .populate('teamMembers', 'username fullName');

    // Get at-risk projects (in progress but low progress and near deadline)
    const atRiskProjects = await Project.find({
      status: 'in-progress',
      progress: { $lt: 50 },
      endDate: {
        $gt: today,
        $lt: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000) // Within 2 weeks
      }
    })
    .populate('manager', 'username fullName email')
    .populate('teamMembers', 'username fullName');

    // Calculate detailed risk analysis
    const delayedWithDetails = await Promise.all(delayedProjects.map(async (project) => {
      const tasks = await Task.find({ project: project._id });
      const overdueTasks = tasks.filter(t => t.status !== 'completed' && new Date(t.deadline) < new Date());

      return {
        ...project._doc,
        daysDelayed: Math.floor((today - new Date(project.endDate)) / (1000 * 60 * 60 * 24)),
        overdueTasksCount: overdueTasks.length,
        potentialRevenueLoss: project.budget || 0,
        impact: project.budget > 100000 ? 'High' : project.budget > 50000 ? 'Medium' : 'Low'
      };
    }));

    const atRiskWithDetails = await Promise.all(atRiskProjects.map(async (project) => {
      const tasks = await Task.find({ project: project._id });
      const highPriorityTasks = tasks.filter(t => t.priority === 'high' && t.status !== 'completed');

      return {
        ...project._doc,
        daysUntilDeadline: Math.floor((new Date(project.endDate) - today) / (1000 * 60 * 60 * 24)),
        highPriorityTasksCount: highPriorityTasks.length,
        completionRisk: project.progress < 30 ? 'High' : 'Medium',
        potentialRevenueAtRisk: project.budget || 0
      };
    }));

    res.json({
      success: true,
      delayedProjects: delayedWithDetails,
      atRiskProjects: atRiskWithDetails,
      summary: {
        totalDelayed: delayedWithDetails.length,
        totalAtRisk: atRiskWithDetails.length,
        totalPotentialRevenueLoss: delayedWithDetails.reduce((sum, p) => sum + (p.potentialRevenueLoss || 0), 0) +
                                   atRiskWithDetails.reduce((sum, p) => sum + (p.potentialRevenueAtRisk || 0), 0),
        highImpactDelayed: delayedWithDetails.filter(p => p.impact === 'High').length,
        highRiskAtRisk: atRiskWithDetails.filter(p => p.completionRisk === 'High').length
      }
    });
  } catch (error) {
    console.error('Admin get delayed and at-risk projects error:', error);
    res.status(500).json({ message: 'Failed to get delayed and at-risk projects' });
  }
};