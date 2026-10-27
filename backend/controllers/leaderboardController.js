import User from '../models/User.js';
import Post from '../models/Post.js';
import { serverError } from '../utils/respond.js';

/**
 * GET /api/leaderboard
 * Public leaderboard: Top 10 students with points > 0.
 * Returns only name and points to uphold campus privacy.
 */
export async function getLeaderboard(req, res) {
  try {
    const leaders = await User.find({ role: 'student', points: { $gt: 0 } })
      .sort({ points: -1 })
      .limit(10)
      .select('name points -_id')
      .lean();

    return res.status(200).json({ leaders });
  } catch (error) {
    return serverError(res, error, 'Failed to fetch leaderboard.');
  }
}

/**
 * GET /api/leaderboard/stats
 * Platform-wide statistics (total reunited/resolved items).
 */
export async function getStats(req, res) {
  try {
    const resolvedCount = await Post.countDocuments({ status: 'resolved' });
    return res.status(200).json({ resolvedCount });
  } catch (error) {
    return serverError(res, error, 'Failed to fetch stats.');
  }
}

/**
 * GET /api/health
 * Public health check endpoint for monitoring uptime (e.g. UptimeRobot on free tiers).
 */
export function getHealth(req, res) {
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Found. Campus Board API',
  });
}
