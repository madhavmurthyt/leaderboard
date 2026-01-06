import rateLimit from 'express-rate-limit';

// General API rate limiter
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Score submission rate limiter (stricter)
export const scoreSubmissionLimiter = rateLimit({
  windowMs: parseInt(process.env.SCORE_RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  max: parseInt(process.env.SCORE_RATE_LIMIT_MAX) || 10, // 10 score submissions per minute
  message: {
    success: false,
    message: 'Too many score submissions. Please wait before submitting again.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by user ID if authenticated, otherwise by IP
    return req.user?.id || req.ip;
  }
});

// Auth rate limiter (login/register)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 auth attempts per window
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

export default {
  generalLimiter,
  scoreSubmissionLimiter,
  authLimiter
};

