const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { authMiddleware } = require('../middleware/authMiddleware');
const cloudinaryService = require('../utils/cloudinaryService');

const upload = require('../middleware/uploadMiddleware');

// File upload routes
router.post('/upload', authMiddleware, upload.single('file'), fileController.uploadFile);
router.post('/upload-multiple', authMiddleware, upload.array('files'), fileController.uploadMultipleFiles);

// File management routes
router.get('/:fileId', authMiddleware, fileController.getFile);
router.delete('/:fileId', authMiddleware, fileController.deleteFile);

// Project file routes
router.get('/project/:projectId', authMiddleware, fileController.getProjectFiles);
router.post('/project/:projectId', authMiddleware, fileController.uploadProjectFile);

// Task file routes
router.get('/task/:taskId', authMiddleware, fileController.getTaskFiles);
router.post('/task/:taskId', authMiddleware, fileController.uploadTaskFile);

module.exports = router;