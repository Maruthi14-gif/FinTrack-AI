import rateLimit from 'express-rate-limit';

// Rate limiting = "each visitor may only make N requests per time window".
// It protects against password guessing and against someone burning through
// the free AI quota.

const limiter = (windowMinutes: number, limit: number, message: string, extra: object = {}) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: message },
    ...extra
  });

// Everything under /api
export const apiLimiter = limiter(15, 600, 'Too many requests. Please slow down and try again shortly.');

// Login / register: only failed attempts count, so normal use is never blocked.
export const authLimiter = limiter(15, 10, 'Too many attempts. Please try again in 15 minutes.', {
  skipSuccessfulRequests: true
});

// Endpoints that call Gemini
export const aiLimiter = limiter(1, 15, 'AI limit reached. Please wait a minute and try again.');
