import rateLimit from 'express-rate-limit';

/**
 * Standard skip function: bypasses all rate limiting during test executions.
 */
const isTestEnv = () => process.env.NODE_ENV === 'test';

// Global API rate limiter: 600 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: { message: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTestEnv,
});

// Sensitive Auth limiter: 50 attempts per 15 minutes for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { message: 'Too many authentication attempts, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTestEnv,
});

// Creation limiter: 30 creations per hour for posts, responses, and reports
export const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { message: 'Creation limit reached. Please wait an hour before submitting again.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTestEnv,
});
