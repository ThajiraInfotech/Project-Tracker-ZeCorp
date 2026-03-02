const express = require('express');
const router = express.Router();
const {
    submitServiceReport,
    getAllReports,
    getReportById
} = require('../controllers/serviceReportController');
const { authMiddleware, roleMiddleware, adminMiddleware, managerMiddleware } = require('../middleware/authMiddleware');
const cloudinaryService = require('../utils/cloudinaryService');

// Base path: /api/service-reports

// Submit Report (Technician Only)
router.post('/submit',
    authMiddleware,
    roleMiddleware(['technician']),
    cloudinaryService.getUploadMiddleware().array('photos', 5),
    submitServiceReport
);

// Admin / Manager Routes
router.get('/',
    authMiddleware,
    managerMiddleware,
    getAllReports
);

router.get('/:id',
    authMiddleware,
    managerMiddleware,
    getReportById
);

module.exports = router;
