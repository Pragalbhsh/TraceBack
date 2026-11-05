// Builds the Express app. Kept separate from server.js so tests can use it without starting a server.
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const multer = require('multer');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const Item = require('./models/items');
const itemRoutes = require('./routes/items');
const authRoutes = require('./routes/auth');
const { CATEGORIES } = require('./lib/categories');
const { removeImage } = require('./middleware/upload');

const app = express();
app.set('trust proxy', config.trustProxy);

// Images are loaded by the frontend from another origin, so allow cross-origin reads of resources.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
    cors({
        origin(origin, cb) {
            // No Origin header = curl, Postman, server-to-server. Otherwise it must be on the list.
            cb(null, !origin || config.corsOrigins.includes(origin));
        },
        exposedHeaders: ['X-Total-Count', 'X-Total-Pages'],
    })
);
if (!config.isTest) app.use(morgan(config.isProduction ? 'combined' : 'dev'));
app.use(express.json({ limit: '100kb' }));
app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 600,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        skip: () => config.isTest,
        message: { error: 'Too many requests. Please slow down and try again shortly.' },
    })
);

app.get('/', (req, res) => {
    res.send('Traceback backend running 🚀');
});

app.get('/health', (req, res) => {
    const db = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.status(db === 'connected' ? 200 : 503).json({ status: db === 'connected' ? 'ok' : 'degraded', db });
});

// Numbers for the home page.
app.get('/stats', async (req, res) => {
    const [lost, found, reunited] = await Promise.all([
        Item.countDocuments({ type: 'lost', status: { $ne: 'resolved' } }),
        Item.countDocuments({ type: 'found', status: { $ne: 'resolved' } }),
        Item.countDocuments({ status: 'resolved' }),
    ]);
    res.json({ lost, found, reunited, total: lost + found + reunited });
});

app.get('/meta', (req, res) => {
    res.json({ categories: CATEGORIES, maxUploadMb: config.maxUploadMb, emailEnabled: config.mail.enabled });
});

// Locally stored images (only used when Cloudinary isn't configured).
app.use('/uploads', express.static(config.uploadDir, { maxAge: '7d', index: false }));

app.use('/auth', authRoutes);
app.use('/items', itemRoutes);

app.use((req, res) => {
    res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
});

// Turns every error into a JSON response with a helpful message.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    let status = err.status || err.statusCode || 500;
    let message = err.message || 'Something went wrong';

    if (err instanceof multer.MulterError) {
        status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        message = err.code === 'LIMIT_FILE_SIZE' ? `Image is too large (max ${config.maxUploadMb} MB)` : 'Upload one image only, in the "image" field';
    } else if (err.type === 'entity.parse.failed') {
        status = 400;
        message = 'Request body is not valid JSON';
    } else if (err.type === 'entity.too.large') {
        status = 413;
        message = 'Request is too large';
    } else if (err.name === 'ValidationError' && err.errors) {
        status = 400;
        message = Object.values(err.errors)[0]?.message || 'Invalid input';
    } else if (err.name === 'CastError') {
        status = 400;
        message = `Invalid ${err.path}`;
    } else if (err.code === 11000) {
        status = 409;
        message = 'That already exists';
    }

    // Don't leave an orphaned upload behind if the request failed after the image was stored.
    if (req.storedImage) removeImage(req.storedImage.id);

    if (status >= 500) {
        console.error('Error:', err);
        if (config.isProduction) message = 'Something went wrong on our side. Please try again.';
    }
    res.status(status).json({ error: message, ...(err.details ? { details: err.details } : {}) });
});

module.exports = app;
