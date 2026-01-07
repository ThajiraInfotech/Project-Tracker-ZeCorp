const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authMiddleware, staffMiddleware } = require('../middleware/authMiddleware');

// Attendance routes
router.post('/check-in', authMiddleware, staffMiddleware, attendanceController.checkIn);
router.post('/check-out', authMiddleware, staffMiddleware, attendanceController.checkOut);
router.get('/my-attendance', authMiddleware, attendanceController.getMyAttendance);
router.get('/today', authMiddleware, attendanceController.getTodayAttendance);

// Manager routes
router.get('/', authMiddleware, attendanceController.getAllAttendance);
router.get('/:userId', authMiddleware, attendanceController.getUserAttendance);
router.get('/:userId/timesheet', authMiddleware, attendanceController.getUserTimesheet);

// Reports
router.get('/daily-report', authMiddleware, attendanceController.getDailyReport);
router.get('/weekly-report', authMiddleware, attendanceController.getWeeklyReport);
router.get('/monthly-report', authMiddleware, attendanceController.getMonthlyReport);

// Export routes
router.get('/export/daily', authMiddleware, attendanceController.exportDailyReport);
router.get('/export/weekly', authMiddleware, attendanceController.exportWeeklyReport);
router.get('/export/monthly', authMiddleware, attendanceController.exportMonthlyReport);

module.exports = router;