const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getUserNotifications,
  markNotificationsAsRead
} = require('../utils/mentionUtils');

// Get user notifications
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { limit = 20, skip = 0 } = req.query;
    
    const result = await getUserNotifications(
      req.user._id,
      parseInt(limit),
      parseInt(skip)
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Failed to get notifications' });
  }
});

// Mark notifications as read
router.post('/mark-read', authMiddleware, async (req, res) => {
  try {
    const { notificationIds } = req.body;
    
    await markNotificationsAsRead(req.user._id, notificationIds);

    res.json({
      success: true,
      message: 'Notifications marked as read'
    });
  } catch (error) {
    console.error('Mark notifications as read error:', error);
    res.status(500).json({ message: 'Failed to mark notifications as read' });
  }
});

// Mark all notifications as read
router.post('/mark-all-read', authMiddleware, async (req, res) => {
  try {
    await markNotificationsAsRead(req.user._id, []);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ message: 'Failed to mark all notifications as read' });
  }
});

module.exports = router;