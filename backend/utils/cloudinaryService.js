const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

class CloudinaryService {
  constructor() {
    this.storage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'thajira_workflow',
        resource_type: 'auto',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'mp4', 'webm', 'ogg', 'avi', 'mov'],
        public_id: (req, file) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          return file.fieldname + '-' + uniqueSuffix;
        }
      }
    });

    this.upload = multer({ storage: this.storage });
  }

  async uploadFile(filePath, folder = 'thajira_workflow') {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: folder,
        resource_type: 'auto'
      });
      return result.secure_url;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  }

  async uploadMultipleFiles(files, folder = 'thajira_workflow') {
    try {
      const uploadPromises = files.map(file =>
        cloudinary.uploader.upload(file.path, {
          folder: folder,
          resource_type: 'auto'
        })
      );

      const results = await Promise.all(uploadPromises);
      return results.map(result => result.secure_url);
    } catch (error) {
      console.error('Cloudinary multiple upload error:', error);
      throw error;
    }
  }

  async deleteFile(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw error;
    }
  }

  getUploadMiddleware() {
    return this.upload;
  }
}

module.exports = new CloudinaryService();