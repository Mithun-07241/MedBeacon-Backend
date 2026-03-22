const rateLimit = require('express-rate-limit');

/**
 * Strict limiter for authentication endpoints.
 * 10 requests per 15 minutes per IP.
 * Prevents credential stuffing and brute-force discovery.
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many login attempts. Please wait 15 minutes and try again.'
    },
    skipSuccessfulRequests: true // only count failed requests toward the limit
});

/**
 * General API limiter applied globally.
 * 200 requests per 15 minutes per IP.
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many requests. Please slow down.'
    }
});

module.exports = { authLimiter, apiLimiter };
