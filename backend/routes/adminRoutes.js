import express from 'express';
import {
  getAdminPosts,
  deleteAdminPost,
  getAdminUsers,
  getAdminReports,
  dismissAdminReport,
} from '../controllers/adminController.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = express.Router();

// Guard all admin routes with authentication and admin role check
router.use(protect, adminOnly);

router.get('/posts', getAdminPosts);
router.delete('/posts/:id', validateObjectId('id'), deleteAdminPost);
router.get('/users', getAdminUsers);
router.get('/reports', getAdminReports);
router.patch('/reports/:id/dismiss', validateObjectId('id'), dismissAdminReport);

export default router;
