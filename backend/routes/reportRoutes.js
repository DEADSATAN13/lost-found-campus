import express from 'express';
import { createReport } from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';
import { createLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Report a post
router.post('/', protect, createLimiter, createReport);

export default router;
