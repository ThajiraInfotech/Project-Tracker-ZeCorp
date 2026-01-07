const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authMiddleware, staffMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// Task routes
router.post('/', authMiddleware, staffMiddleware, taskController.createTask);
router.get('/', authMiddleware, taskController.getAllTasks);
router.get('/my-tasks', authMiddleware, taskController.getMyTasks);
router.get('/:id', authMiddleware, taskController.getTaskById);
router.put('/:id', authMiddleware, staffMiddleware, taskController.updateTask);
router.delete('/:id', authMiddleware, staffMiddleware, taskController.deleteTask);

// Task status updates
router.put('/:id/status', authMiddleware, taskController.updateTaskStatus);
router.put('/:id/progress', authMiddleware, taskController.updateTaskProgress);

// Task comments
router.post('/:id/comments', authMiddleware, taskController.addComment);
router.get('/:id/comments', authMiddleware, taskController.getComments);

// Task files
router.post('/:id/files', authMiddleware, taskController.uploadTaskFiles);
router.get('/:id/files', authMiddleware, taskController.getTaskFiles);
router.delete('/:id/files/:fileId', authMiddleware, taskController.deleteTaskFile);

// Task notifications
router.post('/:id/notify', authMiddleware, taskController.sendTaskNotification);

module.exports = router;