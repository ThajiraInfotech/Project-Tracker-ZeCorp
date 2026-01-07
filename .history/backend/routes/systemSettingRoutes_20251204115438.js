const express = require('express');
const router = express.Router();
const systemSettingController = require('../controllers/systemSettingController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// System settings routes (admin only)
router.get('/', authMiddleware, adminMiddleware, systemSettingController.getAllSystemSettings);
router.get('/by-key/:key', authMiddleware, adminMiddleware, systemSettingController.getSystemSettingByKey);
router.get('/by-category', authMiddleware, adminMiddleware, systemSettingController.getSystemSettingsByCategory);
router.post('/', authMiddleware, adminMiddleware, systemSettingController.upsertSystemSetting);
router.delete('/:id', authMiddleware, adminMiddleware, systemSettingController.deleteSystemSetting);

// Initialize default settings
router.post('/initialize', authMiddleware, adminMiddleware, systemSettingController.initializeDefaultSettings);

module.exports = router;