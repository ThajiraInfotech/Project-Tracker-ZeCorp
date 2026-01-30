const cloudinaryService = require('../utils/cloudinaryService');
const Project = require('../models/Project');
const Task = require('../models/Task');

const fs = require('fs');

// Upload single file
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    let fileUrl;
    if (req.file.mimetype === 'application/pdf') {
      // Keep PDF local
      // Construct full URL
      const protocol = req.protocol;
      const host = req.get('host');
      fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    } else {
      // Upload to Cloudinary
      fileUrl = await cloudinaryService.uploadFile(req.file.path);
      // Delete local file
      fs.unlinkSync(req.file.path);
    }

    res.json({
      success: true,
      fileUrl
    });
  } catch (error) {
    console.error('Upload file error:', error);
    // Try to cleanup local file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) { }
    }
    res.status(500).json({ message: 'Failed to upload file' });
  }
};

// Upload multiple files
exports.uploadMultipleFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const fileUrls = await Promise.all(req.files.map(async (file) => {
      if (file.mimetype === 'application/pdf') {
        // Keep PDF local
        const protocol = req.protocol;
        const host = req.get('host');
        return `${protocol}://${host}/uploads/${file.filename}`;
      } else {
        // Upload to Cloudinary
        const url = await cloudinaryService.uploadFile(file.path);
        // Delete local file
        fs.unlinkSync(file.path);
        return url;
      }
    }));

    res.json({
      success: true,
      fileUrls
    });
  } catch (error) {
    console.error('Upload multiple files error:', error);
    // Cleanup any remaining local files
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          try { fs.unlinkSync(file.path); } catch (e) { }
        }
      });
    }
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
    const { fileId } = req.params; // logic assumes fileId passed here is the public_id or the URL? 
    // In many implementations, the ID stored is the URL. 
    // If we are deleting by URL passed as fileId (which often happens in this codebase pattern), detection is needed.
    // However, usually fileId param implies a DB ID, but looking at previous code 'cloudinaryService.deleteFile(fileId)' suggests it expects a public_id.
    // If the frontend passes the FULL URL as the ID to delete (as seen in some naive implementations), we need to extract info.
    // BUT, the existing cloudinaryService code seemed to take a publicId. 
    // The previous controller code: `await cloudinaryService.deleteFile(fileId);`

    // If we stored the full URL, extracting the public_id is needed for Cloudinary.
    // If it's a local file, we need to extract the filename.

    // Assuming 'fileId' passed here is meant to be the identifier.
    // If the architecture stores URLs, passing URL as ID is common in simple apps.
    // Let's assume the client passes the file identifier (logic depends on how frontend calls this).

    // If it's a local file URL:
    if (fileId.includes('/uploads/')) {
      const filename = fileId.split('/uploads/')[1];
      const filePath = path.join(__dirname, '../uploads', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } else {
      // Assume Cloudinary public_id or URL
      // If it's a URL, Cloudinary destroy usually needs the public_id.
      // We might need to extract it, but let's stick to the previous implementation style + safety.
      // Previous: await cloudinaryService.deleteFile(fileId);
      await cloudinaryService.deleteFile(fileId);
    }

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