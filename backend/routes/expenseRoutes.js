const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const expenseController = require('../controllers/expenseController');
const multer = require('multer');
const path = require('path');

// Multer setup for receipt uploads (temporary, will be uploaded to Cloudinary by controller)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, 'receipt-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        // specific allowed file types
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only images and PDFs are allowed'));
        }
    }
});

// Create expense
router.post('/', authMiddleware, upload.single('receipt'), expenseController.createExpense);

// Get expenses for a project
router.get('/project/:projectId', authMiddleware, expenseController.getProjectExpenses);

// Get expenses for a task
router.get('/task/:taskId', authMiddleware, expenseController.getTaskExpenses);

// Delete expense
router.delete('/:id', authMiddleware, expenseController.deleteExpense);

module.exports = router;
