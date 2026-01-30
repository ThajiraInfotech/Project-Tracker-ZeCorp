const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { authMiddleware } = require('../middleware/authMiddleware');
const cloudinaryService = require('../utils/cloudinaryService');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure local storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'file-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

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