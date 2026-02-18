const mongoose = require('mongoose');

// Cache of dbName -> mongoose connection
const connectionCache = new Map();

/**
 * Build a MongoDB connection URL for a specific clinic database.
 * Handles all common MONGO_URL formats:
 *   - mongodb://localhost:27017
 *   - mongodb://localhost:27017/
 *   - mongodb://localhost:27017/somedb
 *   - mongodb+srv://user:pass@cluster.mongodb.net/somedb?retryWrites=true
 *   - mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true
 */
const buildClinicUrl = (dbName) => {
    const base = process.env.MONGO_URL;

    if (!base) {
        // No env var — use localhost with the dbName directly
        return `mongodb://localhost:27017/${dbName}`;
    }

    // Split off the query string so we don't mangle it
    const [urlPart, queryPart] = base.split('?');
    const qs = queryPart ? `?${queryPart}` : '';

    // Remove any trailing slash then any existing database path segment
    // e.g. "mongodb+srv://...@cluster.net/test" -> "mongodb+srv://...@cluster.net"
    //      "mongodb://localhost:27017/test"      -> "mongodb://localhost:27017"
    //      "mongodb://localhost:27017"           -> "mongodb://localhost:27017"
    const withoutDb = urlPart.replace(/\/[^/]*$/, (match) => {
        // Only strip the last segment if it looks like a DB name (not the host part)
        // i.e. the URL must already have at least one '/' after the protocol
        const afterProto = urlPart.replace(/^[a-z+]+:\/\//, '');
        if (afterProto.includes('/')) {
            return ''; // strip the last /segment
        }
        return match; // keep as-is (it's the host)
    });

    return `${withoutDb}/${dbName}${qs}`;
};

/**
 * Get (or create) a mongoose connection for a given clinic DB name.
 * @param {string} dbName - e.g. "medbeacon_apollo_clinic_1234567890"
 */
const getClinicConnection = async (dbName) => {
    if (connectionCache.has(dbName)) {
        const cached = connectionCache.get(dbName);
        if (cached.readyState === 1) return cached;
        // Remove stale connection from cache
        connectionCache.delete(dbName);
    }

    const clinicUrl = buildClinicUrl(dbName);
    console.log(`Connecting to clinic DB: ${dbName} → ${clinicUrl.replace(/\/\/[^@]+@/, '//***@')}`); // mask credentials

    const conn = await mongoose.createConnection(clinicUrl, {
        tls: clinicUrl.startsWith('mongodb+srv'),
        tlsAllowInvalidCertificates: false,
    });

    connectionCache.set(dbName, conn);
    console.log(`Clinic DB Connected: ${dbName} @ ${conn.host}`);
    return conn;
};

module.exports = { getClinicConnection };
