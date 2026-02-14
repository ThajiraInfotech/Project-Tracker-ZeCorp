const express = require('express');
const router = express.Router();
const { checkIn, checkOut, getMyAttendance, getAllAttendance } = require('../controllers/siteAttendanceController');
const { authMiddleware, roleMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// Base path: /api/site-attendance

// Technician routes
router.post('/check-in', authMiddleware, roleMiddleware(['technician']), checkIn);
router.post('/check-out', authMiddleware, roleMiddleware(['technician']), checkOut);
router.get('/my-history', authMiddleware, roleMiddleware(['technician']), getMyAttendance);

// Admin routes
router.get('/all', authMiddleware, adminMiddleware, getAllAttendance);

module.exports = router;
