const cloudinaryService = require('../utils/cloudinaryService');
const Project = require('../models/Project');
const Task = require('../models/Task');

// Upload single file
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileUrl = req.file.path;
    res.json({
      success: true,
      fileUrl
    });
  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({ message: 'Failed to upload file' });
  }
};

// Upload multiple files
exports.uploadMultipleFiles = async (req, res) => {
  try {
    console.log('Upload multiple files request received');
    console.log('req.files:', req.files);

    if (!req.files || req.files.length === 0) {
      console.log('No files found in request');
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const fileUrls = req.files.map(file => file.path);
    console.log('File URLs:', fileUrls);

    res.json({
      success: true,
      fileUrls
    });
  } catch (error) {
    console.error('Upload multiple files error:', error);
    res.status(500).json({ message: 'Failed to upload files', error: error.message });
  }
};

// Get file by ID
exports.getFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    res.json({
      success: true,
      fileUrl: fileId
    });
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ message: 'Failed to get file' });
  }
};

// Delete file
exports.deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    // Delete from Cloudinary
    await cloudinaryService.deleteFile(fileId);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'Failed to delete file' });
  }
};

// Get project files
exports.getProjectFiles = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({
      success: true,
      files: project.files
    });
  } catch (error) {
    console.error('Get project files error:', error);
    res.status(500).json({ message: 'Failed to get project files' });
  }
};

// Upload project file
exports.uploadProjectFile = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.files.push(req.file.path);
    await project.save();

    res.json({
      success: true,
      message: 'File uploaded to project successfully',
      files: project.files
    });
  } catch (error) {
    console.error('Upload project file error:', error);
    res.status(500).json({ message: 'Failed to upload project file' });
  }
};

// Get task files
exports.getTaskFiles = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({
      success: true,
      files: task.files
    });
  } catch (error) {
    console.error('Get task files error:', error);
    res.status(500).json({ message: 'Failed to get task files' });
  }
};

// Upload task file
exports.uploadTaskFile = async (req, res) => {
  try {
    const { taskId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.files.push(req.file.path);
    await task.save();

    res.json({
      success: true,
      message: 'File uploaded to task successfully',
      files: task.files
    });
  } catch (error) {
    console.error('Upload task file error:', error);
    res.status(500).json({ message: 'Failed to upload task file' });
  }
};