// Test database: uses MONGO_URI_TEST if set, otherwise starts a throwaway in-memory MongoDB
// (mongodb-memory-server downloads a MongoDB binary the first time - about 100 MB).
const mongoose = require('mongoose');

let memoryServer = null;

async function connect() {
    let uri = process.env.MONGO_URI_TEST;
    if (uri) {
        // Safety net: never wipe a real database by accident.
        const dbName = new URL(uri.replace(/^mongodb(\+srv)?:/, 'http:')).pathname.slice(1);
        if (!/test/i.test(dbName)) {
            throw new Error(`MONGO_URI_TEST must point to a database with "test" in its name (got "${dbName || '(none)'}")`);
        }
    } else {
        const { MongoMemoryServer } = require('mongodb-memory-server-core');
        memoryServer = await MongoMemoryServer.create();
        uri = memoryServer.getUri('traceback-test');
    }
    await mongoose.connect(uri);
    await mongoose.connection.syncIndexes();
}

async function clear() {
    const collections = await mongoose.connection.db.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
}

async function disconnect() {
    await clear();
    await mongoose.disconnect();
    if (memoryServer) await memoryServer.stop();
}

module.exports = { connect, clear, disconnect };
