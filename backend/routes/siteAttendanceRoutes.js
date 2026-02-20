const express = require('express');
const router = express.Router();
const { checkIn, checkOut, getMyAttendance, getAllAttendance, getTaskAttendance } = require('../controllers/siteAttendanceController');
const { authMiddleware, roleMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// Base path: /api/site-attendance

// Technician routes
router.post('/check-in', authMiddleware, roleMiddleware(['technician']), checkIn);
router.post('/check-out', authMiddleware, roleMiddleware(['technician']), checkOut);
router.get('/my-history', authMiddleware, roleMiddleware(['technician']), getMyAttendance);

// General tasks route (Manager/Admin/Staff associated with task)
router.get('/task/:taskId', authMiddleware, getTaskAttendance);

// Admin routes
router.get('/all', authMiddleware, adminMiddleware, getAllAttendance);

module.exports = router;
