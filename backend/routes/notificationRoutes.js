const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Notification routes
// ⚠️ IMPORTANT: Static routes (/read-all, /delete-all) MUST come before dynamic routes (/:id)
// Otherwise Express matches 'read-all' / 'delete-all' as an :id param
router.get('/', authMiddleware, notificationController.getNotifications);
router.put('/read-all', authMiddleware, notificationController.markAllAsRead);
router.put('/:id/read', authMiddleware, notificationController.markAsRead);
router.delete('/delete-all', authMiddleware, notificationController.deleteAllNotifications);
router.delete('/:id', authMiddleware, notificationController.deleteNotification);

module.exports = router;
