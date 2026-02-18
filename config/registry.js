const mongoose = require('mongoose');

let registryConnection = null;

const connectRegistry = async () => {
    if (registryConnection && registryConnection.readyState === 1) {
        return registryConnection;
    }

    const baseUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/medbeacon_registry';
    // Replace the DB name in the connection string with 'medbeacon_registry'
    const registryUrl = baseUrl.replace(/\/[^/?]+(\?|$)/, '/medbeacon_registry$1');

    registryConnection = await mongoose.createConnection(registryUrl, {
        tls: true,
        tlsAllowInvalidCertificates: false,
    });

    console.log('Registry DB Connected:', registryConnection.host);
    return registryConnection;
};

module.exports = { connectRegistry, getRegistryConnection: () => registryConnection };
