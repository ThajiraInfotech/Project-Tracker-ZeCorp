const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const emailService = require('../utils/emailService');
const cloudinaryService = require('../utils/cloudinaryService');
const { updateProjectProgressAndStatus } = require('../utils/projectProgressUtils');

// Helper function to sync progress based on status
const syncProgressWithStatus = (task) => {
  if (task.status === 'completed') {
    task.progress = 100;
  } else if (task.status === 'todo') {
    task.progress = 0;
  }
  // For 'in-progress', progress is set separately, allow any value
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
      query.assignedTo = req.user._id.toString();
    } else if (req.user.role === 'manager') {
      // Get projects managed by this user
      const managedProjects = await Project.find({ manager: req.user._id.toString() });
      const projectIds = managedProjects.map(project => project._id);

      query.project = { $in: projectIds };
    }
    // Admin sees all tasks (no filter)

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
    const tasks = await Task.find({ assignedTo: req.user._id.toString() })
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
    task.status = status;

    // If task is completed, set completion date
    if (status === 'completed') {
      task.completionDate = new Date();
    }

    syncProgressWithStatus(task);
    await task.save();

    // Update project progress and status
    await updateProjectProgressAndStatus(task.project);

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
    syncProgressWithStatus(task);
    await task.save();

    // Update project progress and status
    await updateProjectProgressAndStatus(task.project);

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
    await task.save();

    // Update project progress and status
    await updateProjectProgressAndStatus(task.project);

    res.json({
      success: true,
      message: 'Task updated successfully',
      task
    });
  } catch (error) {
    console.error('Update task status and progress error:', error);
    res.status(500).json({ message: 'Failed to update task' });
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

// Admin: Override task assignment
exports.adminOverrideTaskAssignment = async (req, res) => {
  try {
    const { assignedTo, priority, deadline, status } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if assigned user exists
    if (assignedTo) {
      const userExists = await User.findById(assignedTo);
      if (!userExists) {
        return res.status(404).json({ message: 'Assigned user not found' });
      }
    }

    // Update task with admin override
    if (assignedTo) task.assignedTo = assignedTo;
    if (priority) task.priority = priority;
    if (deadline) task.deadline = deadline;
    if (status) {
      task.status = status;
      if (status === 'completed') {
        task.completionDate = new Date();
      }
    }

    syncProgressWithStatus(task);

    // Add admin override comment
    task.comments.push({
      user: req.user._id,
      text: `ADMIN OVERRIDE: Task updated by ${req.user.fullName || req.user.username}`,
      createdAt: new Date()
    });

    await task.save();

    // Update project progress and status
    await updateProjectProgressAndStatus(task.project);

    // Send notification to new assignee if changed
    if (assignedTo && assignedTo !== task.createdBy.toString()) {
      const newAssignee = await User.findById(assignedTo);
      if (newAssignee && newAssignee.email) {
        await emailService.sendEmail(
          newAssignee.email,
          `Task Reassigned: ${task.title}`,
          `<p>You have been assigned to task: ${task.title}</p>
           <p>Priority: ${task.priority}</p>
           <p>Deadline: ${new Date(task.deadline).toLocaleDateString()}</p>
           <p>This assignment was made by admin override.</p>`
        );
      }
    }

    res.json({
      success: true,
      message: 'Task override successful',
      task
    });
  } catch (error) {
    console.error('Admin override task assignment error:', error);
    res.status(500).json({ message: 'Failed to override task assignment' });
  }
};

// Admin: Reassign stuck tasks
exports.adminReassignStuckTasks = async (req, res) => {
  try {
    const { fromUserId, toUserId, projectId } = req.body;

    // Validate users
    const fromUser = await User.findById(fromUserId);
    const toUser = await User.findById(toUserId);

    if (!fromUser || !toUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Build query for stuck tasks
    let query = {
      status: { $in: ['in-progress', 'delayed'] },
      assignedTo: fromUserId
    };

    if (projectId) {
      query.project = projectId;
    } else {
      // If no specific project, get overdue tasks
      const today = new Date();
      query.deadline = { $lt: today };
    }

    const stuckTasks = await Task.find(query);

    // Reassign tasks
    const reassignResults = [];
    for (const task of stuckTasks) {
      task.assignedTo = toUserId;
      task.status = 'in-progress'; // Reset status
      task.comments.push({
        user: req.user._id,
        text: `ADMIN REASSIGNMENT: Task reassigned from ${fromUser.username} to ${toUser.username} by ${req.user.fullName || req.user.username}`,
        createdAt: new Date()
      });

      await task.save();

      // Update project progress and status for each reassigned task
      await updateProjectProgressAndStatus(task.project);

      reassignResults.push({
        taskId: task._id,
        taskTitle: task.title,
        fromUser: fromUser.username,
        toUser: toUser.username
      });
    }

    // Send notifications
    if (toUser.email) {
      await emailService.sendEmail(
        toUser.email,
        `Tasks Reassigned to You (${reassignResults.length})`,
        `<p>${reassignResults.length} task(s) have been reassigned to you by admin:</p>
         <ul>
           ${reassignResults.map(r => `<li>${r.taskTitle} (from ${r.fromUser})</li>`).join('')}
         </ul>`
      );
    }

    res.json({
      success: true,
      message: `Reassigned ${reassignResults.length} stuck tasks`,
      reassignResults
    });
  } catch (error) {
    console.error('Admin reassign stuck tasks error:', error);
    res.status(500).json({ message: 'Failed to reassign stuck tasks' });
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

// Admin: Get all tasks (override access control)
exports.adminGetAllTasks = async (req, res) => {
  try {
    const { status, priority, projectId, assignedTo } = req.query;

    let query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (projectId) query.project = projectId;
    if (assignedTo) query.assignedTo = assignedTo;

    const tasks = await Task.find(query)
      .populate('project', 'projectName projectType status')
      .populate('assignedTo', 'username fullName email role')
      .populate('createdBy', 'username fullName email')
      .sort({ deadline: 1 });

    res.json({
      success: true,
      tasks,
      summary: {
        totalTasks: tasks.length,
        completed: tasks.filter(t => t.status === 'completed').length,
        overdue: tasks.filter(t => t.status !== 'completed' && new Date(t.deadline) < new Date()).length,
        highPriority: tasks.filter(t => t.priority === 'high').length
      }
    });
  } catch (error) {
    console.error('Admin get all tasks error:', error);
    res.status(500).json({ message: 'Failed to get all tasks' });
  }
};

// Admin: Force complete task
exports.adminForceCompleteTask = async (req, res) => {
  try {
    const { completionNotes } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Force complete the task
    task.status = 'completed';
    task.completionDate = new Date();
    task.progress = 100;

    syncProgressWithStatus(task); // Ensures progress is 100

    // Add admin completion note
    if (completionNotes) {
      task.comments.push({
        user: req.user._id,
        text: `ADMIN COMPLETION: ${completionNotes} - Forced completion by ${req.user.fullName || req.user.username}`,
        createdAt: new Date()
      });
    }

    await task.save();

    // Update project progress and status
    await updateProjectProgressAndStatus(task.project);

    res.json({
      success: true,
      message: 'Task forced completion successful',
      task
    });
  } catch (error) {
    console.error('Admin force complete task error:', error);
    res.status(500).json({ message: 'Failed to force complete task' });
  }
};