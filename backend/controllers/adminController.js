import Post from '../models/Post.js';
import User from '../models/User.js';
import Report from '../models/Report.js';
import Interest from '../models/Interest.js';
import { serverError } from '../utils/respond.js';

/**
 * GET /api/admin/posts
 * Returns all posts across the platform with creator details.
 */
export async function getAdminPosts(req, res) {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate('user', 'name email role phone');

    return res.status(200).json({ posts });
  } catch (error) {
    return serverError(res, error, 'Failed to fetch admin posts.');
  }
}

/**
 * DELETE /api/admin/posts/:id
 * Force-removes a post, cascading to delete associated interests and reports.
 */
export async function deleteAdminPost(req, res) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    await Promise.all([
      Interest.deleteMany({ post: post._id }),
      Report.deleteMany({ post: post._id }),
      post.deleteOne(),
    ]);

    return res.status(200).json({ message: 'Post and associated records removed successfully.' });
  } catch (error) {
    return serverError(res, error, 'Failed to delete post.');
  }
}

/**
 * GET /api/admin/users
 * Returns all registered users with sensitive security fields excluded.
 */
export async function getAdminUsers(req, res) {
  try {
    const users = await User.find()
      .sort({ createdAt: -1 })
      .select('-password -verifyCodeHash -verifyCodeExpiry -verifyCodeSentAt -verifyAttempts -resetToken -resetTokenExpiry');

    return res.status(200).json({ users });
  } catch (error) {
    return serverError(res, error, 'Failed to fetch admin users.');
  }
}

/**
 * GET /api/admin/reports
 * Fetches all open violation reports with populated post and reporter details.
 */
export async function getAdminReports(req, res) {
  try {
    const reports = await Report.find({ status: 'open' })
      .sort({ createdAt: -1 })
      .populate({
        path: 'post',
        populate: { path: 'user', select: 'name email' },
      })
      .populate('reporter', 'name email');

    return res.status(200).json({ reports });
  } catch (error) {
    return serverError(res, error, 'Failed to fetch open reports.');
  }
}

/**
 * PATCH /api/admin/reports/:id/dismiss
 * Marks a violation report as dismissed.
 */
export async function dismissAdminReport(req, res) {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    report.status = 'dismissed';
    await report.save();

    return res.status(200).json({ report, message: 'Report dismissed.' });
  } catch (error) {
    return serverError(res, error, 'Failed to dismiss report.');
  }
}
