const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// Authentication routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.getCurrentUser);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

// User management routes (admin only)
router.get('/users', authMiddleware, adminMiddleware, authController.getAllUsers);
router.get('/users/:id', authMiddleware, authController.getUserById);
router.put('/users/:id', authMiddleware, authController.updateUser);
router.delete('/users/:id', authMiddleware, authController.deleteUser);

// Admin user management routes
router.post('/users/:id/toggle-status', authMiddleware, authController.toggleUserStatus);
router.post('/users/:id/reset-password', authMiddleware, authController.resetUserPassword);
router.post('/users/:id/assign-project', authMiddleware, authController.assignUserToProject);
router.post('/users/:id/remove-project', authMiddleware, authController.removeUserFromProject);
router.get('/users/by-role', authMiddleware, authController.getUsersByRole);

module.exports = router;