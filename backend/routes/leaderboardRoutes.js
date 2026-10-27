import express from 'express';
import { getLeaderboard, getStats, getHealth } from '../controllers/leaderboardController.js';

const router = express.Router();

router.get('/', getLeaderboard);
router.get('/stats', getStats);

export default router;
