// Image uploads.
// - With Cloudinary credentials set, images go to Cloudinary (recommended for production -
//   most hosts wipe the local disk on every deploy).
// - Without them, images are saved to ./uploads so the app still works locally.
//
// Flow: multer reads the file -> the route validates the form -> storeImage() saves it.
// So a rejected form never leaves an orphaned image behind on Cloudinary.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const config = require('../config');

const TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

let cloudinary = null;
if (config.cloudinary.enabled) {
    cloudinary = require('cloudinary').v2;
    cloudinary.config({
        cloud_name: config.cloudinary.cloudName,
        api_key: config.cloudinary.apiKey,
        api_secret: config.cloudinary.apiSecret,
        secure: true,
    });
} else if (!config.isTest) {
    console.log('ℹ️  Cloudinary not configured - uploaded images will be saved to', config.uploadDir);
}

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 1, fields: 20 },
    fileFilter: (req, file, cb) => {
        if (TYPES[file.mimetype]) return cb(null, true);
        const err = new Error('Only JPG, PNG or WebP images are allowed');
        err.status = 400;
        cb(err);
    },
});

function uploadToCloudinary(buffer) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: 'traceback',
                resource_type: 'image',
                allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
                // Shrink huge phone photos so pages load fast on mobile data.
                transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto' }],
            },
            (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(buffer);
    });
}

/**
 * Save the uploaded file (if any). Returns { url, id } or null.
 * Remembers it on req so the error handler can clean up if the request fails afterwards.
 */
async function storeImage(req) {
    const file = req.file;
    if (!file) return null;
    let stored;
    if (cloudinary) {
        const result = await uploadToCloudinary(file.buffer);
        stored = { url: result.secure_url, id: result.public_id };
    } else {
        await fs.promises.mkdir(config.uploadDir, { recursive: true });
        const filename = crypto.randomBytes(16).toString('hex') + TYPES[file.mimetype];
        await fs.promises.writeFile(path.join(config.uploadDir, filename), file.buffer);
        stored = { url: `/uploads/${filename}`, id: filename };
    }
    req.storedImage = stored;
    return stored;
}

/** Delete a stored image. Never throws - a leftover image is not worth failing a request over. */
async function removeImage(id) {
    if (!id) return;
    try {
        if (cloudinary && !/^[a-f\d]{32}\.(jpg|png|webp)$/.test(id)) {
            await cloudinary.uploader.destroy(id);
        } else {
            await fs.promises.unlink(path.join(config.uploadDir, path.basename(id)));
        }
    } catch (err) {
        if (err.code !== 'ENOENT') console.error('Could not delete image', id, err.message);
    }
}

module.exports = { upload, storeImage, removeImage };
