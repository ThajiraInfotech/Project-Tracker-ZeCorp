const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authMiddleware, managerMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// Project routes
router.post('/', authMiddleware, projectController.createProject);
router.get('/', authMiddleware, projectController.getAllProjects);
router.get('/:id', authMiddleware, projectController.getProjectById);
router.put('/:id', authMiddleware, managerMiddleware, projectController.updateProject);
router.delete('/:id', authMiddleware, managerMiddleware, projectController.deleteProject);

// Project team management
router.post('/:id/team', authMiddleware, managerMiddleware, projectController.addTeamMember);
router.delete('/:id/team/:userId', authMiddleware, managerMiddleware, projectController.removeTeamMember);

// Project files
router.post('/:id/files', authMiddleware, projectController.uploadProjectFiles);
router.get('/:id/files', authMiddleware, projectController.getProjectFiles);
router.delete('/:id/files/:fileId', authMiddleware, projectController.deleteProjectFile);

// Project progress
router.get('/:id/progress', authMiddleware, projectController.getProjectProgress);

// Project discussions
const cloudinaryService = require('../utils/cloudinaryService');
router.post('/:id/discussions', authMiddleware, cloudinaryService.getUploadMiddleware().array('attachments'), projectController.addDiscussion);
router.get('/:id/discussions', authMiddleware, projectController.getDiscussions);

// Admin project routes
router.post('/:id/assign-manager', authMiddleware, adminMiddleware, projectController.adminAssignManager);
router.get('/admin/all-with-analytics', authMiddleware, adminMiddleware, projectController.adminGetAllProjectsWithAnalytics);
router.post('/:id/mark-delayed', authMiddleware, adminMiddleware, projectController.adminMarkProjectDelayed);
router.get('/admin/delayed-at-risk', authMiddleware, adminMiddleware, projectController.adminGetDelayedAndAtRiskProjects);

module.exports = router;