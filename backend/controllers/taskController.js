const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const emailService = require('../utils/emailService');
const cloudinaryService = require('../utils/cloudinaryService');
const { createMentionNotifications } = require('../utils/mentionParser');
const { updateProjectProgressAndStatus } = require('../utils/projectProgressUtils');
const { publishEvent } = require('../infrastructure/queue');

// Helper function to sync progress based on status
// Helper function to sync progress based on status
const syncProgressWithStatus = (task) => {
  // Guard: If subtasks exist, recalculate progress from them
  if (task.subtasks && task.subtasks.length > 0) {
    const totalSubtasks = task.subtasks.length;
    const completedSubtasks = task.subtasks.filter(st => st.status === 'completed').length;

    // Calculate progress ONLY, do not touch status
    task.progress = Math.round((completedSubtasks / totalSubtasks) * 100);
    return;
  }

  // Original logic for tasks without subtasks
  if (task.status === 'completed') {
    task.progress = 100;
  } else if (task.status === 'todo') {
    task.progress = 0;
  }
};

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

    // Check authorization for managers
    if (req.user.role === 'manager' && (!projectExists.manager || projectExists.manager.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied: You can only create tasks for your assigned projects' });
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

    syncProgressWithStatus(task);
    await task.save();

    // Update project progress and status
    await updateProjectProgressAndStatus(task.project);

    // Update project progress and status
    await updateProjectProgressAndStatus(task.project);

    // EMIT EVENT: Task Assigned
    await publishEvent('TASK_ASSIGNED', {
      entityType: 'task',
      entityId: task._id,
      entityTitle: task.title,
      assignedTo: userExists,
      triggeredBy: req.user._id, // Actor
      messageSnippet: `You have been assigned a new task: ${task.title}`,
      relatedLink: `/tasks?taskId=${task._id}`, // Deep link for modal
      project: projectExists
    });

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
      query.$or = [
        { assignedTo: req.user._id.toString() },
        { 'subtasks.assignedTo': req.user._id.toString() }
      ];
    } else if (req.user.role === 'manager') {
      // Get projects managed by this user
      const managedProjects = await Project.find({ manager: req.user._id.toString() });
      const projectIds = managedProjects.map(project => project._id);

      query.project = { $in: projectIds };
    }
    // Admin sees all tasks (no filter)

    // Apply user filters
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.priority) {
      query.priority = req.query.priority;
    }
    if (req.query.projectId) {
      query.project = req.query.projectId;
    }

    const tasks = await Task.find(query)
      .populate('project', 'projectName projectType')
      .populate('assignedTo', 'username fullName email')
      .populate('createdBy', 'username fullName email')
      .populate('subtasks.assignedTo', 'username fullName email')
      .sort({ deadline: 1 });

    const tasksWithReadOnly = tasks.map(task => {
      const t = task.toObject();
      const isParentAssignee = t.assignedTo?._id?.toString() === req.user._id.toString() || t.assignedTo?.toString() === req.user._id.toString();
      const isManager = ['admin', 'manager'].includes(req.user.role);
      t.readOnly = !isManager && !isParentAssignee;
      return t;
    });

    res.json({
      success: true,
      tasks: tasksWithReadOnly
    });
  } catch (error) {
    console.error('Get all tasks error:', error);
    res.status(500).json({ message: 'Failed to get tasks' });
  }
};

// Get my tasks (for current user)
exports.getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({
      $or: [
        { assignedTo: req.user._id.toString() },
        { 'subtasks.assignedTo': req.user._id.toString() }
      ]
    })
      .populate('project', 'projectName projectType')
      .populate('assignedTo', 'username fullName email')
      .populate('createdBy', 'username fullName email')
      .populate('subtasks.assignedTo', 'username fullName email')
      .sort({ deadline: 1 });

    const tasksWithReadOnly = tasks.map(task => {
      const t = task.toObject();
      const isParentAssignee = t.assignedTo?._id?.toString() === req.user._id.toString() || t.assignedTo?.toString() === req.user._id.toString();
      const isManager = ['admin', 'manager'].includes(req.user.role);
      t.readOnly = !isManager && !isParentAssignee;
      return t;
    });

    res.json({
      success: true,
      tasks: tasksWithReadOnly
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
      .populate({
        path: 'project',
        select: 'projectName projectType manager teamMembers',
        populate: [
          { path: 'manager', select: 'username fullName email profileImage' },
          { path: 'teamMembers', select: 'username fullName email profileImage' }
        ]
      })
      .populate('assignedTo', 'username fullName email profileImage')
      .populate('createdBy', 'username fullName email')
      .populate('subtasks.assignedTo', 'username fullName email');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check authorization
    // Check authorization
    if (req.user.role === 'staff') {
      const assignedToId = task.assignedTo?._id ? task.assignedTo._id.toString() : task.assignedTo?.toString();
      const isSubtaskAssignee = task.subtasks && task.subtasks.some(st =>
        (st.assignedTo?._id?.toString() === req.user._id.toString()) ||
        (st.assignedTo?.toString() === req.user._id.toString())
      );

      if (assignedToId !== req.user._id.toString() && !isSubtaskAssignee) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Inject readOnly flag
    const taskObj = task.toObject();
    const isParentAssignee = task.assignedTo?._id?.toString() === req.user._id.toString() || task.assignedTo?.toString() === req.user._id.toString();
    const isManager = ['admin', 'manager'].includes(req.user.role);
    taskObj.readOnly = !isManager && !isParentAssignee;

    res.json({
      success: true,
      task: taskObj
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
    let allowedUpdates = ['title', 'description', 'deadline', 'priority', 'status', 'progress', 'subtasks'];
    if (req.user.role === 'admin') {
      allowedUpdates.push('assignedTo');
    }
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

    // Check if assigned user exists (for admin)
    if (req.body.assignedTo && req.user.role === 'admin') {
      const userExists = await User.findById(req.body.assignedTo);
      if (!userExists) {
        return res.status(404).json({ message: 'Assigned user not found' });
      }
    }

    // Update task
    updates.forEach(update => task[update] = req.body[update]);
    syncProgressWithStatus(task);
    await task.save();

    // Update project progress and status
    await updateProjectProgressAndStatus(task.project);

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

    const projectId = task.project;
    await task.deleteOne();

    // Update project progress and status
    await updateProjectProgressAndStatus(projectId);

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
    // If subtasks exist, only allow manual update if ALL subtasks are completed
    if (task.subtasks && task.subtasks.length > 0) {
      const allCompleted = task.subtasks.every(st => st.status === 'completed');
      if (!allCompleted) {
        // Do nothing to status if subtasks are not all completed
        // The UI should prevent this, but backend safe-guard here
      } else {
        // All subtasks completed, ALLOW manual status update
        task.status = status;
        if (status === 'completed') {
          task.completionDate = new Date();
        }
      }
    } else {
      task.status = status;
      // If task is completed, set completion date
      if (status === 'completed') {
        task.completionDate = new Date();
      }
    }

    syncProgressWithStatus(task);
    await task.save();

    // Update project progress and status
    await updateProjectProgressAndStatus(task.project);

    // Populate task before returning
    const populatedTask = await Task.findById(task._id)
      .populate('project', 'projectName projectType manager teamMembers')
      .populate('assignedTo', 'username fullName email profileImage')
      .populate('createdBy', 'username fullName email')
      .populate('subtasks.assignedTo', 'username fullName email');

    // Inject readOnly flag
    const taskObj = populatedTask.toObject();
    const isParentAssignee = populatedTask.assignedTo?._id?.toString() === req.user._id.toString() || populatedTask.assignedTo?.toString() === req.user._id.toString();
    const isManager = ['admin', 'manager'].includes(req.user.role);
    taskObj.readOnly = !isManager && !isParentAssignee;

    res.json({
      success: true,
      message: 'Task status updated successfully',
      task: taskObj
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

    // If subtasks exist, ignore manual progress update
    if (task.subtasks && task.subtasks.length > 0) {
      // Recalculate to ensure consistency (ignoring req.body.progress)
      syncProgressWithStatus(task);
    } else {
      task.progress = progress;
      syncProgressWithStatus(task);
    }

    await task.save();

    // Update project progress and status
    await updateProjectProgressAndStatus(task.project);

    // Populate task before returning
    const populatedTask = await Task.findById(task._id)
      .populate('project', 'projectName projectType manager teamMembers')
      .populate('assignedTo', 'username fullName email profileImage')
      .populate('createdBy', 'username fullName email')
      .populate('subtasks.assignedTo', 'username fullName email');

    // Inject readOnly flag
    const taskObj = populatedTask.toObject();
    const isParentAssignee = populatedTask.assignedTo?._id?.toString() === req.user._id.toString() || populatedTask.assignedTo?.toString() === req.user._id.toString();
    const isManager = ['admin', 'manager'].includes(req.user.role);
    taskObj.readOnly = !isManager && !isParentAssignee;

    res.json({
      success: true,
      message: 'Task progress updated successfully',
      task: taskObj
    });
  } catch (error) {
    console.error('Update task progress error:', error);
    res.status(500).json({ message: 'Failed to update task progress' });
  }
};

// Update task status and progress
exports.updateTaskStatusAndProgress = async (req, res) => {
  try {
    const { status, progress } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check authorization - only staff assigned to the task can update
    if (req.user.role === 'staff' && task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Validate status
    const validStatuses = ['todo', 'in-progress', 'completed', 'delayed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Validate progress
    if (progress !== undefined && (progress < 0 || progress > 100)) {
      return res.status(400).json({ message: 'Progress must be between 0 and 100' });
    }

    // Update fields if provided
    // Update fields if provided
    if (task.subtasks && task.subtasks.length > 0) {
      // If subtasks exist, check if they are all completed
      const allCompleted = task.subtasks.every(st => st.status === 'completed');

      if (allCompleted && status !== undefined) {
        // If all completed, allow status update
        task.status = status;
        if (status === 'completed') {
          task.completionDate = new Date();
        }
      }

      // Always sync progress from subtasks (ignoring manual progress input for subtask-tasks)
      syncProgressWithStatus(task);
    } else {
      if (status !== undefined) {
        task.status = status;
        // If task is completed, set completion date
        if (status === 'completed') {
          task.completionDate = new Date();
        }
      }
      if (progress !== undefined) {
        task.progress = progress;
      }
      syncProgressWithStatus(task);
    }
    await task.save();

    // Update project progress and status
    await updateProjectProgressAndStatus(task.project);

    // Populate task before returning
    const populatedTask = await Task.findById(task._id)
      .populate('project', 'projectName projectType manager teamMembers')
      .populate('assignedTo', 'username fullName email profileImage')
      .populate('createdBy', 'username fullName email')
      .populate('subtasks.assignedTo', 'username fullName email');

    // Inject readOnly flag
    const taskObj = populatedTask.toObject();
    const isParentAssignee = populatedTask.assignedTo?._id?.toString() === req.user._id.toString() || populatedTask.assignedTo?.toString() === req.user._id.toString();
    const isManager = ['admin', 'manager'].includes(req.user.role);
    taskObj.readOnly = !isManager && !isParentAssignee;

    res.json({
      success: true,
      message: 'Task updated successfully',
      task: taskObj
    });
  } catch (error) {
    console.error('Update task status and progress error:', error);
    res.status(500).json({ message: 'Failed to update task' });
  }
};

// Add comment to task
exports.addComment = async (req, res) => {
  try {
    const { text, attachments } = req.body;

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
      text,
      attachments: attachments || []
    });

    await task.save();

    // Populate the new comment with user info
    const populatedTask = await Task.findById(req.params.id)
      .populate('comments.user', 'username fullName profileImage');

    const newComment = populatedTask.comments[populatedTask.comments.length - 1];

    // Create notifications for @mentions (async, don't wait)
    createMentionNotifications({
      text,
      entityType: 'task',
      entityId: req.params.id,
      entityTitle: task.title,
      mentionedBy: req.user._id,
      excludeUserIds: [req.user._id.toString()]
    }).catch(err => {
      console.error('Failed to create mention notifications:', err);
      // Don't fail comment creation if notification fails
    });

    res.json({
      success: true,
      message: 'Comment added successfully',
      comment: newComment,
      task: populatedTask
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





// Update subtask status
exports.updateSubtaskStatus = async (req, res) => {
  try {
    const { id, subtaskId } = req.params;
    const { status } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const subtask = task.subtasks.id(subtaskId);
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    // Check authorization
    // Staff can only update if assigned to the subtask
    if (req.user.role === 'staff') {
      const assignedToId = subtask.assignedTo ? subtask.assignedTo.toString() : null;
      if (assignedToId !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied: You can only update your assigned subtasks' });
      }
    }

    // Update status
    if (status) {
      if (!['todo', 'in-progress', 'completed'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      subtask.status = status;
      if (status === 'completed') {
        subtask.completedAt = new Date();
      } else {
        subtask.completedAt = undefined;
      }
    }

    // Recalculate parent task progress/status
    syncProgressWithStatus(task);
    await task.save();

    // Update project progress
    await updateProjectProgressAndStatus(task.project);

    // Populate task before returning
    const populatedTask = await Task.findById(task._id)
      .populate('project', 'projectName projectType manager teamMembers')
      .populate('assignedTo', 'username fullName email profileImage')
      .populate('createdBy', 'username fullName email')
      .populate('subtasks.assignedTo', 'username fullName email');

    // Inject readOnly flag
    const taskObj = populatedTask.toObject();
    const isParentAssignee = populatedTask.assignedTo?._id?.toString() === req.user._id.toString() || populatedTask.assignedTo?.toString() === req.user._id.toString();
    const isManager = ['admin', 'manager'].includes(req.user.role);
    taskObj.readOnly = !isManager && !isParentAssignee;

    res.json({
      success: true,
      message: 'Subtask status updated successfully',
      task: taskObj
    });
  } catch (error) {
    console.error('Update subtask status error:', error);
    res.status(500).json({ message: 'Failed to update subtask status' });
  }
};

// Get tasks by project ID (with authorization)
exports.getTasksByProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check authorization based on user role
    if (req.user.role === 'staff') {
      // Staff can only see tasks for projects they are assigned to
      if (!project.teamMembers.some(member => member.toString() === req.user._id.toString())) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (req.user.role === 'manager') {
      // Managers can only see tasks for projects they manage
      if (!project.manager || project.manager.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    // Admin can see all tasks

    const tasks = await Task.find({ project: projectId })
      .populate('assignedTo', 'username fullName email')
      .populate('createdBy', 'username fullName email')
      .populate('subtasks.assignedTo', 'username fullName email')
      .sort({ deadline: 1 });

    res.json({
      success: true,
      tasks
    });
  } catch (error) {
    console.error('Get tasks by project error:', error);
    res.status(500).json({ message: 'Failed to get tasks for project' });
  }
};



