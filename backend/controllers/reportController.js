import Report from '../models/Report.js';
import Post from '../models/Post.js';
import { serverError } from '../utils/respond.js';

function coerceString(val) {
  return typeof val === 'string' ? val.trim() : '';
}

/**
 * POST /api/reports
 * Submits a report for a post.
 * Rules:
 * - Cannot report own post
 * - Cannot report the same post more than once
 * - Valid reason required
 * - Optional note max 200 characters
 */
export async function createReport(req, res) {
  try {
    const postId = coerceString(req.body.postId);
    const reason = coerceString(req.body.reason);
    const note = coerceString(req.body.note);

    if (!postId) {
      return res.status(400).json({ message: 'Post ID is required.' });
    }

    if (!['spam', 'inappropriate', 'scam', 'other'].includes(reason)) {
      return res.status(400).json({ message: 'Reason must be spam, inappropriate, scam, or other.' });
    }

    if (note.length > 200) {
      return res.status(400).json({ message: 'Note cannot exceed 200 characters.' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    // Prohibit reporting one's own post
    if (post.user.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot report your own post.' });
    }

    // Guard against duplicate reports from same reporter
    const existing = await Report.findOne({ post: post._id, reporter: req.user._id });
    if (existing) {
      return res.status(400).json({ message: 'You have already reported this post.' });
    }

    const report = await Report.create({
      post: post._id,
      reporter: req.user._id,
      reason,
      note,
      status: 'open',
    });

    return res.status(201).json({
      message: 'Report submitted successfully. Campus moderators will review it.',
      report,
    });
  } catch (error) {
    return serverError(res, error, 'Failed to submit report.');
  }
}
