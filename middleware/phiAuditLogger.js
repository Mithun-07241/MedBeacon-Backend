/**
 * PHI Audit Logger – HIPAA §164.312(b)
 *
 * Middleware factory that logs every successful PHI access/mutation
 * to the clinic's own PhiAuditLog collection.
 *
 * Usage:
 *   router.get('/records', authMiddleware, logPhiAccess('medical_record'), controller)
 */

const phiAuditLogSchema = require('../models/PhiAuditLog');

/**
 * Get or register the PhiAuditLog model on a given connection.
 */
function getPhiAuditModel(conn) {
    try {
        return conn.model('PhiAuditLog');
    } catch (_) {
        return conn.model('PhiAuditLog', phiAuditLogSchema);
    }
}

/**
 * Map HTTP methods to audit action verbs.
 */
function methodToAction(method) {
    const map = {
        GET: 'read',
        POST: 'create',
        PUT: 'update',
        PATCH: 'update',
        DELETE: 'delete'
    };
    return map[method.toUpperCase()] || 'read';
}

/**
 * logPhiAccess(resourceType) → Express middleware
 *
 * @param {string} resourceType - one of the enums in PhiAuditLog.resourceType
 */
const logPhiAccess = (resourceType) => {
    return (req, res, next) => {
        // Intercept res.json so we can inspect the status code after response
        const originalJson = res.json.bind(res);

        res.json = function (data) {
            // Only audit successful responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                // Run asynchronously so we don't delay the response
                setImmediate(async () => {
                    try {
                        // req.db is the clinic's mongoose connection (set by authMiddleware)
                        if (!req.db) return;

                        const PhiAuditLog = getPhiAuditModel(req.db);

                        // Try to extract a patientId from common param/body locations
                        const patientId =
                            req.params?.patientId ||
                            req.params?.userId ||
                            req.body?.patientId ||
                            (req.user?.role === 'patient' ? req.user.id : null) ||
                            null;

                        const resourceId =
                            req.params?.id ||
                            req.params?.recordId ||
                            null;

                        await PhiAuditLog.create({
                            userId: req.user?.id || 'unknown',
                            userEmail: req.user?.email || 'unknown',
                            role: req.user?.role || 'unknown',
                            action: methodToAction(req.method),
                            resourceType,
                            resourceId,
                            patientId,
                            ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
                            userAgent: req.get('user-agent') || 'unknown',
                            httpMethod: req.method,
                            path: req.originalUrl || req.path,
                            statusCode: res.statusCode,
                            timestamp: new Date()
                        });
                    } catch (err) {
                        // Never let audit logging crash the app
                        console.error('[PHI Audit] Failed to write log:', err.message);
                    }
                });
            }

            return originalJson(data);
        };

        next();
    };
};

module.exports = { logPhiAccess };
