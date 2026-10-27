import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { apiLimiter } from './middleware/rateLimiter.js';
import { notFoundHandler, globalErrorHandler } from './middleware/errorHandler.js';
import { getHealth } from './controllers/leaderboardController.js';

import authRoutes from './routes/authRoutes.js';
import postRoutes from './routes/postRoutes.js';
import interestRoutes from './routes/interestRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';

const app = express();

// Security HTTP headers
app.use(helmet());

// Disable revealing Express header
app.disable('x-powered-by');

// Trust reverse proxy (crucial for Render and load-balanced hosting)
app.set('trust proxy', 1);

// Configure CORS: supports comma-separated list of origins, strips trailing slashes,
// and permits requests when FRONTEND_URL is not set (e.g. local dev / curl / testing)
const rawFrontendUrls = process.env.FRONTEND_URL || '';
const allowedOrigins = rawFrontendUrls
  .split(',')
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests or if origin whitelist is unconfigured
      if (!origin || allowedOrigins.length === 0) {
        return callback(null, true);
      }
      const normalizedOrigin = origin.replace(/\/$/, '');
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin blocked by CORS policy.'));
    },
    credentials: true,
  })
);

// Restrict JSON payload size to 10kb to guard against payload flood attacks
app.use(express.json({ limit: '10kb' }));

// Global rate limiting on /api namespace
app.use('/api', apiLimiter);

// Health check endpoint (for pingers like UptimeRobot to prevent cold boots)
app.get('/api/health', getHealth);

// API route groups
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/interests', interestRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Catch-all 404 for unmatched /api routes
app.use('/api', notFoundHandler);

// Central error handler
app.use(globalErrorHandler);

export default app;
