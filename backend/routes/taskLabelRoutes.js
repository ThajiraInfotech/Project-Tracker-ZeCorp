const express = require('express');
const router = express.Router();
const taskLabelController = require('../controllers/taskLabelController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// All authenticated users can list labels (needed for create/filter UI)
router.get('/', authMiddleware, taskLabelController.getTaskLabels);

// Admin-only create/delete
router.post('/', authMiddleware, adminMiddleware, taskLabelController.createTaskLabel);
router.delete('/:id', authMiddleware, adminMiddleware, taskLabelController.deleteTaskLabel);

module.exports = router;
