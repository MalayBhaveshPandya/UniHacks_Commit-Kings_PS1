const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const auth = require('../middlewares/auth');

// Setup multer for in-memory storage (we stream to Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
    },
    fileFilter: (req, file, cb) => {
        // Accept images and videos only
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image and video files are allowed'), false);
        }
    }
});

// POST /api/upload — Upload a file to Cloudinary
router.post('/', auth, upload.single('file'), async (req, res) => {
    try {
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            console.error('Cloudinary configuration missing in .env');
            return res.status(500).json({ error: 'Server misconfiguration: Cloudinary credentials missing.' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const isVideo = req.file.mimetype.startsWith('video/');
        const resourceType = isVideo ? 'video' : 'image';
        const folder = isVideo ? 'commit-kings/videos' : 'commit-kings/images';

        // Upload to Cloudinary using a stream
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    resource_type: resourceType,
                    folder: folder,
                    transformation: isVideo
                        ? [{ quality: 'auto', fetch_format: 'auto' }]
                        : [{ quality: 'auto', fetch_format: 'auto', width: 1200, crop: 'limit' }],
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(req.file.buffer);
        });

        res.json({
            url: result.secure_url,
            publicId: result.public_id,
            resourceType: result.resource_type,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            duration: result.duration || null,
        });
    } catch (err) {
        console.error('Upload error:', err);
        if (err.message === 'Only image and video files are allowed') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Upload failed. Please try again.' });
    }
});

module.exports = router;
