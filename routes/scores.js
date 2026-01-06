import express from 'express';
import { submitScore, getScoreHistory, getBestScores, getStats } from '../controllers/scoreController.js';
import { verifyToken } from '../middleware/auth.js';
import { scoreSubmissionLimiter } from '../middleware/rateLimiter.js';
import { scoreValidation } from '../middleware/validators.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * @route   POST /api/scores
 * @desc    Submit a score for a game
 * @access  Private (rate limited)
 */
router.post('/', scoreSubmissionLimiter, scoreValidation, submitScore);

/**
 * @route   GET /api/scores/history
 * @desc    Get user's score history
 * @access  Private
 */
router.get('/history', getScoreHistory);

/**
 * @route   GET /api/scores/best
 * @desc    Get user's best scores per game
 * @access  Private
 */
router.get('/best', getBestScores);

/**
 * @route   GET /api/scores/stats
 * @desc    Get user's statistics
 * @access  Private
 */
router.get('/stats', getStats);

export default router;

