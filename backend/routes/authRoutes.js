import express from 'express';
import {
  signup,
  verifyEmail,
  resendCode,
  login,
  getMe,
  updateProfile,
  changePassword,
  deleteAccount,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/signup', authLimiter, signup);
router.post('/verify-email', authLimiter, verifyEmail);
router.post('/resend-code', authLimiter, resendCode);
router.post('/login', authLimiter, login);

router.get('/me', protect, getMe);
router.patch('/profile', protect, updateProfile);
router.post('/change-password', protect, authLimiter, changePassword);
router.delete('/me', protect, deleteAccount);

router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password/:token', authLimiter, resetPassword);

export default router;
