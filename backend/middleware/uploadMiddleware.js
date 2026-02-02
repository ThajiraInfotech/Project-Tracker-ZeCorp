const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage engine for Local Files (PDFs)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File Filter Logic
const fileFilter = (req, file, cb) => {
    // Allowed Mime Types
    const allowedImages = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedDocs = ['application/pdf'];

    if (allowedImages.includes(file.mimetype)) {
        // It's an image
        cb(null, true);
    } else if (allowedDocs.includes(file.mimetype)) {
        // It's a PDF
        cb(null, true);
    } else {
        // Reject
        cb(new Error('Invalid file type. Only Images (JPEG/PNG/GIF) and PDFs are allowed.'), false);
    }
};

// Initialize Multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 15 * 1024 * 1024 // Global Max 15MB (Restricted further in controller/middleware check)
    }
});

module.exports = upload;
