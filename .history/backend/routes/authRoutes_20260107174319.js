const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// Authentication routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.getCurrentUser);
router.put('/me', authMiddleware, authController.updateProfile);
router.put('/me/password', authMiddleware, authController.changePassword);
router.post('/refresh-token', authController.refreshToken);

// User management routes (admin only)
router.get('/users', authMiddleware, adminMiddleware, authController.getAllUsers);
router.get('/users/by-role', authMiddleware, adminMiddleware, authController.getUsersByRole);
router.get('/users/:id', authMiddleware, adminMiddleware, authController.getUserById);
router.put('/users/:id', authMiddleware, adminMiddleware, authController.updateUser);
router.delete('/users/:id', authMiddleware, adminMiddleware, authController.deleteUser);

// Manager routes
router.get('/staff-for-manager', authMiddleware, authController.getStaffForManager);

// Admin user management routes
router.post('/users/:id/toggle-status', authMiddleware, adminMiddleware, authController.toggleUserStatus);
router.post('/users/:id/reset-password', authMiddleware, adminMiddleware, authController.resetUserPassword);
router.post('/users/:id/assign-project', authMiddleware, adminMiddleware, authController.assignUserToProject);
router.post('/users/:id/remove-project', authMiddleware, adminMiddleware, authController.removeUserFromProject);

module.exports = router;