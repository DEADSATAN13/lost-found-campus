import express from 'express';
import {
  getPosts,
  getMine,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  renewPost,
  resolvePost,
} from '../controllers/postController.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validateObjectId.js';
import { createLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public browse route
router.get('/', getPosts);

// Authenticated user's personal posts (MUST be declared before /:id)
router.get('/mine', protect, getMine);

// Single post view (with optional auth to detect ownership)
router.get('/:id', validateObjectId('id'), optionalAuth, getPostById);

// Create post with rate limiting
router.post('/', protect, createLimiter, createPost);

// Edit post (owner or admin)
router.patch('/:id', validateObjectId('id'), protect, updatePost);

// Delete post (owner or admin)
router.delete('/:id', validateObjectId('id'), protect, deletePost);

// Renew post
router.patch('/:id/renew', validateObjectId('id'), protect, renewPost);

// Mark resolved and award points for found items
router.patch('/:id/resolve', validateObjectId('id'), protect, resolvePost);

export default router;
