const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const emailService = require('../utils/emailService');
const cloudinaryService = require('../utils/cloudinaryService');

// Create a new task
exports.createTask = async (req, res) => {
  try {
    const { title, description, project, assignedTo, deadline, priority } = req.body;

    // Check if project exists
    const projectExists = await Project.findById(project);
    if (!projectExists) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if assigned user exists
    const userExists = await User.findById(assignedTo);
    if (!userExists) {
      return res.status(404).json({ message: 'Assigned user not found' });
    }

    // Create task
    const task = new Task({
      title,
      description,
      project,
      assignedTo,
      createdBy: req.user._id,
      deadline,
      priority: priority || 'medium'
    });

    await task.save();

    // Send email notification
    await emailService.sendTaskAssignmentEmail(
      userExists.email,
      {
        title: task.title,
        deadline: task.deadline,
        priority: task.priority,
        description: task.description
      },
      {
        projectName: projectExists.projectName,
        clientName: projectExists.clientName
      }
    );

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Failed to create task', error: error.message });
  }
};

// Get all tasks
exports.getAllTasks = async (req, res) => {
  try {
    let query = {};

    // Filter by user role
    if (req.user.role === 'staff') {
      query.assignedTo = req.user._id;
    } else if (req.user.role === 'manager') {
      // Get projects managed by this user
      const managedProjects = await Project.find({ manager: req.user._id });
      const projectIds = managedProjects.map(project => project._id);

      query = {
        $or: [
          { assignedTo: req.user._id },
          { project: { $in: projectIds } }
        ]
      };
    }

    const tasks = await Task.find(query)
      .populate('project', 'projectName projectType')
      .populate('assignedTo', 'username fullName email')
      .populate('createdBy', 'username fullName email')
      .sort({ deadline: 1 });

    res.json({
      success: true,
      tasks
    });
  } catch (error) {
    console.error('Get all tasks error:', error);
    res.status(500).json({ message: 'Failed to get tasks' });
  }
};

// Get my tasks (for current user)
exports.getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user._id })
      .populate('project', 'projectName projectType')
      .populate('assignedTo', 'username fullName email')
      .populate('createdBy', 'username fullName email')
      .sort({ deadline: 1 });

    res.json({
      success: true,
      tasks
    });
  } catch (error) {
    console.error('Get my tasks error:', error);
    res.status(500).json({ message: 'Failed to get my tasks' });
  }
};

// Get task by ID
exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project', 'projectName projectType')
      .populate('assignedTo', 'username fullName email')
      .populate('createdBy', 'username fullName email');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check authorization
    if (req.user.role === 'staff' && task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Get task by ID error:', error);
    res.status(500).json({ message: 'Failed to get task' });
  }
};

// Update task
exports.updateTask = async (req, res) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['title', 'description', 'deadline', 'priority', 'status', 'progress'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid updates!' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check authorization
    if (req.user.role === 'staff' && task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update task
    updates.forEach(update => task[update] = req.body[update]);
    await task.save();

    res.json({
      success: true,
      message: 'Task updated successfully',
      task
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Failed to update task' });
  }
};

// Delete task
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check authorization
    if (req.user.role === 'staff' && task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await task.deleteOne();

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Failed to delete task' });
  }
};

// Update task status
exports.updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check authorization
    if (req.user.role === 'staff' && task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update status
    task.status = status;

    // If task is completed, set completion date
    if (status === 'completed') {
      task.completionDate = new Date();
    }

    await task.save();

    res.json({
      success: true,
      message: 'Task status updated successfully',
      task
    });
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ message: 'Failed to update task status' });
  }
};

// Update task progress
exports.updateTaskProgress = async (req, res) => {
  try {
    const { progress } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check authorization
    if (req.user.role === 'staff' && task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (progress < 0 || progress > 100) {
      return res.status(400).json({ message: 'Progress must be between 0 and 100' });
    }

    task.progress = progress;
    await task.save();

    res.json({
      success: true,
      message: 'Task progress updated successfully',
      task
    });
  } catch (error) {
    console.error('Update task progress error:', error);
    res.status(500).json({ message: 'Failed to update task progress' });
  }
};

// Add comment to task
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check authorization
    if (req.user.role === 'staff' && task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Add comment
    task.comments.push({
      user: req.user._id,
      text
    });

    await task.save();

    res.json({
      success: true,
      message: 'Comment added successfully',
      task
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Failed to add comment' });
  }
};

// Get task comments
exports.getComments = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('comments.user', 'username fullName profileImage');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check authorization
    if (req.user.role === 'staff' && task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      success: true,
      comments: task.comments
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Failed to get comments' });
  }
};

// Upload task files
exports.uploadTaskFiles = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check authorization
    if (req.user.role === 'staff' && task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Handle file uploads
    if (req.files && req.files.length > 0) {
      const fileUrls = await cloudinaryService.uploadMultipleFiles(req.files);
      task.files = [...task.files, ...fileUrls];
      await task.save();
    }

    res.json({
      success: true,
      message: 'Files uploaded successfully',
      files: task.files
    });
  } catch (error) {
    console.error('Upload task files error:', error);
    res.status(500).json({ message: 'Failed to upload files' });
  }
};

// Get task files
exports.getTaskFiles = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check authorization
    if (req.user.role === 'staff' && task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      success: true,
      files: task.files
    });
  } catch (error) {
    console.error('Get task files error:', error);
    res.status(500).json({ message: 'Failed to get task files' });
  }
};

// Delete task file
exports.deleteTaskFile = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check authorization
    if (req.user.role === 'staff' && task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { fileId } = req.params;
    task.files = task.files.filter(file => file !== fileId);
    await task.save();

    // Delete from Cloudinary
    await cloudinaryService.deleteFile(fileId);

    res.json({
      success: true,
      message: 'File deleted successfully',
      files: task.files
    });
  } catch (error) {
    console.error('Delete task file error:', error);
    res.status(500).json({ message: 'Failed to delete file' });
  }
};

// Send task notification
exports.sendTaskNotification = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'email fullName')
      .populate('project', 'projectName');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check authorization
    if (req.user.role === 'staff' && task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Send email notification
    await emailService.sendTaskAssignmentEmail(
      task.assignedTo.email,
      {
        title: task.title,
        deadline: task.deadline,
        priority: task.priority,
        description: task.description
      },
      {
        projectName: task.project.projectName
      }
    );

    res.json({
      success: true,
      message: 'Task notification sent successfully'
    });
  } catch (error) {
    console.error('Send task notification error:', error);
    res.status(500).json({ message: 'Failed to send task notification' });
  }
};