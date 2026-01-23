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
    params: (req, file) => {
        // Determine resource type based on file mimetype
        const isImage = file.mimetype.startsWith('image/');
        const isPDF = file.mimetype === 'application/pdf';

        // Extract file extension from original filename
        let fileExtension = path.extname(file.originalname).substring(1).toLowerCase();

        // For PDFs, explicitly set format
        if (isPDF) {
            fileExtension = 'pdf';
        }

        return {
            folder: "medbeacon_uploads",
            allowed_formats: ["jpg", "png", "jpeg", "pdf", "doc", "docx"],
            resource_type: isImage ? "image" : "raw",
            format: fileExtension, // Explicitly set format
            public_id: `${Date.now()}_${path.basename(file.originalname, path.extname(file.originalname))}`,
        };
    },
});

const upload = multer({ storage: storage });

module.exports = upload;
