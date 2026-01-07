const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Check-in/check-out (all authenticated users)
router.post('/check-in', authMiddleware, attendanceController.checkIn);
router.post('/check-out', authMiddleware, attendanceController.checkOut);

// Get my attendance (all authenticated users)
router.get('/me', authMiddleware, attendanceController.getMyAttendance);

// Get team attendance (manager only)
router.get('/team', authMiddleware, (req, res, next) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
}, attendanceController.getTeamAttendance);

// Get all attendance (admin only)
router.get('/all', authMiddleware, (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
}, attendanceController.getAllAttendance);

module.exports = router;