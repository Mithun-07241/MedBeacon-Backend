const ActivityLog = require('../models/ActivityLog');
const { v4: uuidv4 } = require('uuid');

/**
 * Middleware to log admin actions
 */
const logActivity = (action, targetType = null) => {
    return async (req, res, next) => {
        // Store original send
        const originalSend = res.send;

        res.send = function (data) {
            // Only log successful actions (2xx status codes)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                // Log activity asynchronously
                ActivityLog.create({
                    id: uuidv4(),
                    adminId: req.user?.id || 'unknown',
                    adminEmail: req.user?.email || 'unknown',
                    action,
                    targetType,
                    targetId: req.params.userId || req.params.id || null,
                    details: `${action} performed`,
                    metadata: {
                        method: req.method,
                        path: req.path,
                        body: req.body
                    },
                    ipAddress: req.ip || req.connection.remoteAddress
                }).catch(err => console.error('Activity log error:', err));
            }

            // Call original send
            originalSend.call(this, data);
        };

        next();
    };
};

module.exports = { logActivity };
