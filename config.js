// Central place for every setting the backend reads from the environment.
// Copy .env.example to .env and fill in the values for local development.
require('dotenv').config({ quiet: true });

const env = process.env;
const isProduction = env.NODE_ENV === 'production';
const isTest = env.NODE_ENV === 'test';

// The deployed Netlify frontend and the local Vite dev server are allowed by default,
// so nothing breaks if CORS_ORIGINS is not set yet.
const DEFAULT_ORIGINS = [
    'https://bejewelled-licorice-d543ef.netlify.app',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
];

function list(value) {
    return (value || '')
        .split(',')
        .map((s) => s.trim().replace(/\/$/, ''))
        .filter(Boolean);
}

function parseTrustProxy(value, fallback) {
    if (value === undefined || value === '') return fallback;
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (/^\d+$/.test(value)) return Number(value);
    return value; // e.g. "loopback" or a list of IPs
}

let jwtSecret = env.JWT_SECRET;
if (!jwtSecret) {
    if (isProduction) {
        throw new Error('JWT_SECRET must be set in production. Add a long random string to your environment.');
    }
    jwtSecret = 'traceback-dev-only-secret-change-me';
    if (!isTest) console.warn('⚠️  JWT_SECRET is not set - using an insecure development secret.');
}

const cloudinary = {
    cloudName: env.CLOUDINARY_CLOUD_NAME || env.CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY || env.API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET || env.API_SECRET,
};
cloudinary.enabled = Boolean(cloudinary.cloudName && cloudinary.apiKey && cloudinary.apiSecret);

const config = {
    isProduction,
    isTest,
    port: Number(env.PORT) || 3000,
    mongoUri: env.MONGO_URI,
    corsOrigins: list(env.CORS_ORIGINS).length ? list(env.CORS_ORIGINS) : DEFAULT_ORIGINS,
    // Used to build links in emails, e.g. https://your-site.netlify.app
    clientUrl: (env.CLIENT_URL || list(env.CORS_ORIGINS)[0] || DEFAULT_ORIGINS[0]).replace(/\/$/, ''),
    // Set to 1 when running behind a proxy/load balancer (Render, Railway, Heroku...)
    trustProxy: parseTrustProxy(env.TRUST_PROXY, isProduction ? 1 : 0),
    jwt: {
        secret: jwtSecret,
        expiresIn: env.JWT_EXPIRES_IN || '7d',
    },
    cloudinary,
    mail: {
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT) || 587,
        secure: env.SMTP_SECURE === 'true',
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
        from: env.MAIL_FROM || 'TraceBack <no-reply@traceback.app>',
    },
    uploadDir: env.UPLOAD_DIR || require('path').join(__dirname, 'uploads'),
    maxUploadMb: Number(env.MAX_UPLOAD_MB) || 5,
};
config.mail.enabled = Boolean(config.mail.host);

module.exports = config;
