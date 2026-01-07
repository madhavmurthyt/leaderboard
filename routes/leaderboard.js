import express from 'express';
import {
  getGlobalLeaderboard,
  getGameLeaderboard,
  getUserRanking,
  getUserAllRankings,
  getPlayersAround,
  getTopPlayersReport,
  getLeaderboardSyncStatus,
  forceLeaderboardSync
} from '../controllers/leaderboardController.js';
import { verifyToken } from '../middleware/auth.js';
import {
  gameIdValidation,
  leaderboardQueryValidation,
  topPlayersReportValidation
} from '../middleware/validators.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * @route   GET /api/leaderboard/global
 * @desc    Get global leaderboard (all games combined)
 * @access  Private
 */
router.get('/global', leaderboardQueryValidation, getGlobalLeaderboard);

/**
 * @route   GET /api/leaderboard/game/:gameId
 * @desc    Get leaderboard for a specific game
 * @access  Private
 */
router.get('/game/:gameId', gameIdValidation, leaderboardQueryValidation, getGameLeaderboard);

/**
 * @route   GET /api/leaderboard/rank
 * @desc    Get current user's ranking (global or game-specific)
 * @access  Private
 */
router.get('/rank', getUserRanking);

/**
 * @route   GET /api/leaderboard/rank/all
 * @desc    Get current user's rankings across all games
 * @access  Private
 */
router.get('/rank/all', getUserAllRankings);

/**
 * @route   GET /api/leaderboard/around
 * @desc    Get players around the current user
 * @access  Private
 */
router.get('/around', getPlayersAround);

/**
 * @route   GET /api/leaderboard/report/top
 * @desc    Get top players report for a specific period
 * @access  Private
 */
router.get('/report/top', topPlayersReportValidation, getTopPlayersReport);

/**
 * @route   GET /api/leaderboard/sync/status
 * @desc    Get sync status between Redis and PostgreSQL
 * @access  Private
 */
router.get('/sync/status', getLeaderboardSyncStatus);

/**
 * @route   POST /api/leaderboard/sync
 * @desc    Force sync leaderboards from PostgreSQL to Redis
 * @access  Private
 */
router.post('/sync', forceLeaderboardSync);

export default router;

