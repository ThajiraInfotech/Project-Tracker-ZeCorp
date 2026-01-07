const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authMiddleware, managerMiddleware } = require('../middleware/authMiddleware');

// Report routes
router.get('/daily', authMiddleware, reportController.getDailyReport);
router.get('/weekly', authMiddleware, reportController.getWeeklyReport);
router.get('/monthly', authMiddleware, reportController.getMonthlyReport);

// Project-specific reports
router.get('/project/:projectId/daily', authMiddleware, reportController.getProjectDailyReport);
router.get('/project/:projectId/weekly', authMiddleware, reportController.getProjectWeeklyReport);
router.get('/project/:projectId/monthly', authMiddleware, reportController.getProjectMonthlyReport);

// User-specific reports
router.get('/user/:userId/daily', authMiddleware, reportController.getUserDailyReport);
router.get('/user/:userId/weekly', authMiddleware, reportController.getUserWeeklyReport);
router.get('/user/:userId/monthly', authMiddleware, reportController.getUserMonthlyReport);

// Export reports
router.get('/export/daily', authMiddleware, managerMiddleware, reportController.exportDailyReport);
router.get('/export/weekly', authMiddleware, managerMiddleware, reportController.exportWeeklyReport);
router.get('/export/monthly', authMiddleware, managerMiddleware, reportController.exportMonthlyReport);

// Dashboard data
router.get('/dashboard', authMiddleware, reportController.getDashboardData);
router.get('/dashboard/manager', authMiddleware, managerMiddleware, reportController.getManagerDashboardData);

module.exports = router;