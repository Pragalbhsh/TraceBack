const mongoose = require('mongoose');
const config = require('./config');
const app = require('./app');

if (!config.mongoUri) {
    console.error('❌ MONGO_URI is not set. Copy .env.example to .env and add your MongoDB connection string.');
    process.exit(1);
}

async function start() {
    try {
        await mongoose.connect(config.mongoUri);
        console.log('✅ Connected to MongoDB');
    } catch (err) {
        console.error('❌ MongoDB connection failed:', err.message);
        process.exit(1);
    }

    const server = app.listen(config.port, () => {
        console.log(`🚀 Server running on port ${config.port}`);
    });

    const shutdown = (signal) => {
        console.log(`${signal} received, shutting down...`);
        server.close(() => mongoose.disconnect().finally(() => process.exit(0)));
        setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

start();
