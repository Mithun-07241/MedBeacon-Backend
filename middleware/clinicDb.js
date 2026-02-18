/**
 * Clinic DB Middleware
 * 
 * Resolves the correct clinic database connection from req.user.dbName
 * and attaches req.db (connection) and req.models (model instances) to the request.
 * 
 * Must run AFTER authMiddleware.
 */

const { getClinicConnection } = require('../config/clinicDb');
const { getModels } = require('../models/factory');

const clinicDbMiddleware = async (req, res, next) => {
    try {
        const dbName = req.user?.dbName;

        if (!dbName) {
            return res.status(400).json({ error: 'No clinic database associated with this account' });
        }

        const conn = await getClinicConnection(dbName);
        req.db = conn;
        req.models = getModels(conn, dbName);

        next();
    } catch (error) {
        console.error('Clinic DB Middleware Error:', error);
        res.status(500).json({ error: 'Failed to connect to clinic database' });
    }
};

module.exports = clinicDbMiddleware;
