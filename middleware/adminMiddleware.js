/**
 * Admin-only middleware
 * Checks if the authenticated user has admin role
 */
exports.adminOnly = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
    }

    next();
};
