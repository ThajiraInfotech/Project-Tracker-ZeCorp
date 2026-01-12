const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authMiddleware, staffMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// Task routes
router.post('/', authMiddleware, taskController.createTask);
router.get('/', authMiddleware, taskController.getAllTasks);
router.get('/my-tasks', authMiddleware, taskController.getMyTasks);
router.get('/project/:projectId', authMiddleware, taskController.getTasksByProject);
router.get('/:id', authMiddleware, taskController.getTaskById);
router.put('/:id', authMiddleware, staffMiddleware, taskController.updateTask);
router.delete('/:id', authMiddleware, staffMiddleware, taskController.deleteTask);

// Task status updates
router.put('/:id/status', authMiddleware, taskController.updateTaskStatus);
router.put('/:id/progress', authMiddleware, taskController.updateTaskProgress);
router.patch('/:id/status', authMiddleware, taskController.updateTaskStatusAndProgress);

// Task comments
router.post('/:id/comments', authMiddleware, taskController.addComment);
router.get('/:id/comments', authMiddleware, taskController.getComments);

// Task discussions
const cloudinaryService = require('../utils/cloudinaryService');
router.post('/:id/discussions', authMiddleware, cloudinaryService.getUploadMiddleware().array('attachments'), taskController.addDiscussion);
router.get('/:id/discussions', authMiddleware, taskController.getDiscussions);
router.get('/discussions', authMiddleware, taskController.getAllTaskDiscussions);

// Task files
router.post('/:id/files', authMiddleware, taskController.uploadTaskFiles);
router.get('/:id/files', authMiddleware, taskController.getTaskFiles);
router.delete('/:id/files/:fileId', authMiddleware, taskController.deleteTaskFile);

// Task notifications
router.post('/:id/notify', authMiddleware, taskController.sendTaskNotification);

// Admin task override routes
router.put('/:id/admin-override', authMiddleware, adminMiddleware, taskController.adminOverrideTaskAssignment);
router.post('/admin/reassign-stuck', authMiddleware, adminMiddleware, taskController.adminReassignStuckTasks);
router.get('/admin/all', authMiddleware, adminMiddleware, taskController.adminGetAllTasks);
router.post('/:id/force-complete', authMiddleware, adminMiddleware, taskController.adminForceCompleteTask);

module.exports = router;