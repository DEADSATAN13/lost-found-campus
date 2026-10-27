import express from 'express';
import { createInterest, getInterestsForPost } from '../controllers/interestController.js';
import { protect } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validateObjectId.js';
import { createLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Submit response/interest to a post
router.post('/', protect, createLimiter, createInterest);

// View inquiries for a specific post (owner or admin)
router.get('/post/:postId', protect, validateObjectId('postId'), getInterestsForPost);

export default router;
