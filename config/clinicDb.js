const mongoose = require('mongoose');

// Cache of dbName -> mongoose connection
const connectionCache = new Map();

/**
 * Get (or create) a mongoose connection for a given clinic DB name.
 * @param {string} dbName - e.g. "medbeacon_apollo_clinic"
 */
const getClinicConnection = async (dbName) => {
    if (connectionCache.has(dbName)) {
        const cached = connectionCache.get(dbName);
        if (cached.readyState === 1) return cached;
    }

    const baseUrl = process.env.MONGO_URL || `mongodb://localhost:27017/${dbName}`;
    const clinicUrl = baseUrl.replace(/\/[^/?]+(\?|$)/, `/${dbName}$1`);

    const conn = await mongoose.createConnection(clinicUrl, {
        tls: true,
        tlsAllowInvalidCertificates: false,
    });

    connectionCache.set(dbName, conn);
    console.log(`Clinic DB Connected: ${dbName} @ ${conn.host}`);
    return conn;
};

module.exports = { getClinicConnection };
