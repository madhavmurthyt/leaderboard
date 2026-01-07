import express from 'express';
import {
  createGame,
  getAllGames,
  getGameById,
  updateGame,
  deleteGame
} from '../controllers/gameController.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';
import { gameValidation, gameIdValidation } from '../middleware/validators.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * @route   POST /api/games
 * @desc    Create a new game
 * @access  Admin only
 */
router.post('/', isAdmin, gameValidation, createGame);

/**
 * @route   GET /api/games
 * @desc    Get all games
 * @access  Private (all authenticated users)
 */
router.get('/', getAllGames);

/**
 * @route   GET /api/games/:gameId
 * @desc    Get a single game by ID
 * @access  Private (all authenticated users)
 */
router.get('/:gameId', gameIdValidation, getGameById);

/**
 * @route   PUT /api/games/:gameId
 * @desc    Update a game
 * @access  Admin only
 */
router.put('/:gameId', isAdmin, gameIdValidation, updateGame);

/**
 * @route   DELETE /api/games/:gameId
 * @desc    Delete (deactivate) a game
 * @access  Admin only
 */
router.delete('/:gameId', isAdmin, gameIdValidation, deleteGame);

export default router;

