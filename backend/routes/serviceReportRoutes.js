const express = require('express');
const router = express.Router();
const {
    submitServiceReport,
    getAllReports,
    getReportById
} = require('../controllers/serviceReportController');
const { authMiddleware, roleMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// Base path: /api/service-reports

// Submit Report (Technician Only)
router.post('/submit',
    authMiddleware,
    roleMiddleware(['technician']),
    submitServiceReport
);

// Admin Routes
router.get('/',
    authMiddleware,
    adminMiddleware,
    getAllReports
);

router.get('/:id',
    authMiddleware,
    authMiddleware, // Allow both admin and the creator (technician) - Logic handled in controller or by basic auth? 
    // ideally we refine this but for now authMiddleware + valid ID check is okay.
    // Actually, let's limit to admin or the owner. 
    // For now, let's just use authMiddleware and assume logic checks or just admin.
    // Let's stick to admin or manager for details, or technician viewing their own.
    // Simple for now: Admin only for list, maybe tech for detail?
    // User asked for "Admin Reporting", so adminMiddleware is safe.
    adminMiddleware,
    getReportById
);

module.exports = router;
