const Expense = require('../models/Expense');
const Project = require('../models/Project');
const Task = require('../models/Task');
const cloudinaryService = require('../utils/cloudinaryService');

// Create a new expense
exports.createExpense = async (req, res) => {
    try {
        const { title, amount, category, vendor, date, projectId, taskId, notes } = req.body;

        // Validate Project
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Authorization:
        // Admin: Can add to any project/task
        // Manager: Can add to Projects they manage (and tasks within them)
        // Staff: Can add ONLY to Tasks they are assigned to

        let isAuthorized = false;

        if (req.user.role === 'admin') {
            isAuthorized = true;
        } else if (req.user.role === 'manager') {
            // Managers can add to any project now
            isAuthorized = true;
        } else if (req.user.role === 'staff') {
            if (taskId) {
                const task = await Task.findById(taskId);
                // Staff must be assigned to the task OR any of its subtasks
                const isTaskAssigned = task && task.assignedTo.toString() === req.user._id.toString();
                const isSubtaskAssigned = task && task.subtasks && task.subtasks.some(sub => sub.assignedTo && sub.assignedTo.toString() === req.user._id.toString());

                if (isTaskAssigned || isSubtaskAssigned) {
                    isAuthorized = true;
                }
            } else {
                // Staff cannot add project-level expenses (no task)
                isAuthorized = false;
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({ message: 'Not authorized to add expense. Managers can add to their projects, Staff only to their assigned tasks.' });
        }

        // Handle Receipt Upload
        let receiptUrl = null;
        if (req.file) {
            const result = await cloudinaryService.uploadFile(req.file);
            receiptUrl = result.url; // Adjust based on your cloudinaryService return structure
        } else if (req.body.receipt) {
            // If passed as string URL (rare for file upload)
            receiptUrl = req.body.receipt;
        }

        const expense = new Expense({
            title,
            amount,
            category,
            vendor,
            date: date || Date.now(),
            project: projectId,
            task: taskId || null,
            recordedBy: req.user._id,
            receipt: receiptUrl,
            notes
        });

        await expense.save();

        res.status(201).json({
            success: true,
            message: 'Expense added successfully',
            expense
        });

    } catch (error) {
        console.error('Create expense error:', error);
        res.status(500).json({ message: 'Failed to add expense', error: error.message });
    }
};

// Get expenses for a project
exports.getProjectExpenses = async (req, res) => {
    try {
        const { projectId } = req.params;

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Auth check: Admin, Manager of project, or Team Member
        const isManager = project.manager?.toString() === req.user._id.toString();
        const isTeamMember = project.teamMembers.some(m => m.toString() === req.user._id.toString());

        console.log('GetProjectExpenses Debug:', {
            userId: req.user._id,
            userRole: req.user.role,
            projectManager: project.manager,
            isManager,
            isTeamMember
        });

        if (req.user.role !== 'admin' && req.user.role !== 'manager' && !isTeamMember) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const expenses = await Expense.find({ project: projectId })
            .populate('recordedBy', 'username fullName')
            .populate('task', 'title')
            .sort({ date: -1 });

        res.json({
            success: true,
            expenses
        });
    } catch (error) {
        console.error('Get project expenses error:', error);
        res.status(500).json({ message: 'Failed to get expenses' });
    }
};

// Get expenses for a specific task
exports.getTaskExpenses = async (req, res) => {
    try {
        const { taskId } = req.params;

        // Find task to verify project access? or just return expenses
        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        // Simplified auth: if you can see the task, you can see expenses?
        // Assuming standard task access control (checked in route/middleware usually, or we duplicate here)

        const expenses = await Expense.find({ task: taskId })
            .populate('recordedBy', 'username fullName')
            .sort({ date: -1 });

        res.json({
            success: true,
            expenses
        });
    } catch (error) {
        console.error('Get task expenses error:', error);
        res.status(500).json({ message: 'Failed to get task expenses' });
    }
};

// Delete expense
exports.deleteExpense = async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);
        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        // Only Admin or Manager of the project can delete?
        // Or the creator?
        // Let's say Admin, Manager, or Creator.

        // Auth check for deletion:
        // Admin: Always
        // Manager: If they manage the project
        // Staff: If the expense is linked to a task, and they are assigned to that task.

        // Fetch project to check manager
        const project = await Project.findById(expense.project);

        let canDelete = false;

        if (req.user.role === 'admin') {
            canDelete = true;
        } else if (req.user.role === 'manager') {
            // Managers can delete any expense
            canDelete = true;
        } else if (req.user.role === 'staff') {
            // Staff can remove if it's in their allocated task OR subtask context
            if (expense.task) {
                const task = await Task.findById(expense.task);
                const isTaskAssigned = task && task.assignedTo.toString() === req.user._id.toString();
                const isSubtaskAssigned = task && task.subtasks && task.subtasks.some(sub => sub.assignedTo && sub.assignedTo.toString() === req.user._id.toString());

                if (isTaskAssigned || isSubtaskAssigned) {
                    canDelete = true;
                }
            }
        }

        if (!canDelete) {
            return res.status(403).json({ message: 'Not authorized to delete this expense. Staff can only delete from their assigned tasks.' });
        }

        await expense.deleteOne();

        // If receipt exists on cloud, delete it? 
        // Implementing basic deletion for now.

        res.json({
            success: true,
            message: 'Expense deleted successfully'
        });
    } catch (error) {
        console.error('Delete expense error:', error);
        res.status(500).json({ message: 'Failed to delete expense' });
    }
};
