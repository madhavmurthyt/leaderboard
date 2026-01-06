import express from 'express';
import {
  createGame,
  getAllGames,
  getGameById,
  updateGame,
  deleteGame
} from '../controllers/gameController.js';
import { verifyToken } from '../middleware/auth.js';
import { gameValidation, gameIdValidation } from '../middleware/validators.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * @route   POST /api/games
 * @desc    Create a new game
 * @access  Private
 */
router.post('/', gameValidation, createGame);

/**
 * @route   GET /api/games
 * @desc    Get all games
 * @access  Private
 */
router.get('/', getAllGames);

/**
 * @route   GET /api/games/:gameId
 * @desc    Get a single game by ID
 * @access  Private
 */
router.get('/:gameId', gameIdValidation, getGameById);

/**
 * @route   PUT /api/games/:gameId
 * @desc    Update a game
 * @access  Private
 */
router.put('/:gameId', gameIdValidation, updateGame);

/**
 * @route   DELETE /api/games/:gameId
 * @desc    Delete (deactivate) a game
 * @access  Private
 */
router.delete('/:gameId', gameIdValidation, deleteGame);

export default router;

