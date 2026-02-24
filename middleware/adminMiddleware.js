/**
 * Admin-only middleware
 * Checks if the authenticated user has admin role
 */
exports.adminOnly = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
    }

    if (!['admin', 'clinic_admin'].includes(req.user.role)) {
        return res.status(403).json({ error: "Admin access required" });
    }

    next();
};
