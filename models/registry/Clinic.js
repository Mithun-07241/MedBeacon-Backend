const mongoose = require('mongoose');

const clinicRegistrySchema = new mongoose.Schema({
    clinicId: { type: String, required: true, unique: true },
    clinicName: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    dbName: { type: String, required: true, unique: true },
    adminEmail: { type: String, required: true },
    clinicCode: { type: String, required: true, unique: true }, // 6-char join code
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Factory: bind to a specific connection
clinicRegistrySchema.statics.bindTo = function (conn) {
    return conn.model('ClinicRegistry', clinicRegistrySchema);
};

module.exports = clinicRegistrySchema;
