const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const path = require("path");

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Storage Configuration
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        // Determine resource type based on file mimetype
        const isImage = file.mimetype.startsWith('image/');
        const isPDF = file.mimetype === 'application/pdf';

        console.log(`[Upload] File: ${file.originalname}, MIME: ${file.mimetype}, isImage: ${isImage}, isPDF: ${isPDF}`);

        // For images, use 'image' resource_type with allowed_formats
        // For PDFs and docs, use 'auto' resource_type (allowed_formats doesn't work with 'auto')
        if (isImage) {
            return {
                folder: "medbeacon_uploads",
                resource_type: "image",
                allowed_formats: ["jpg", "png", "jpeg", "gif", "webp"],
                public_id: `${Date.now()}_${path.basename(file.originalname, path.extname(file.originalname))}`,
            };
        } else {
            // For PDFs and documents
            return {
                folder: "medbeacon_uploads",
                resource_type: "auto", // Auto-detects PDF format
                public_id: `${Date.now()}_${path.basename(file.originalname, path.extname(file.originalname))}`,
            };
        }
    },
});

// Add file filter for multer to restrict file types
const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Allowed: images (jpg, png, gif, webp), PDF, DOC, DOCX. Got: ${file.mimetype}`), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

module.exports = upload;
