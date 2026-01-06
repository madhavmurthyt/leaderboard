import { Game, Score } from '../models/index.js';
import ApiError from '../utils/apiError.js';

/**
 * Create a new game
 * POST /api/games
 */
export const createGame = async (req, res, next) => {
  try {
    const { name, description, maxScore } = req.body;

    // Check if game with same name exists
    const existingGame = await Game.findOne({
      where: { name }
    });

    if (existingGame) {
      throw new ApiError(400, 'A game with this name already exists');
    }

    const game = await Game.create({
      name,
      description,
      maxScore
    });

    res.status(201).json({
      success: true,
      message: 'Game created successfully',
      data: { game }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all games
 * GET /api/games
 */
export const getAllGames = async (req, res, next) => {
  try {
    const { active } = req.query;

    const whereClause = {};
    if (active !== undefined) {
      whereClause.isActive = active === 'true';
    }

    const games = await Game.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: { games }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single game by ID
 * GET /api/games/:gameId
 */
export const getGameById = async (req, res, next) => {
  try {
    const { gameId } = req.params;

    const game = await Game.findByPk(gameId);

    if (!game) {
      throw new ApiError(404, 'Game not found');
    }

    // Get score statistics for this game
    const stats = await Score.findOne({
      where: { gameId },
      attributes: [
        [Score.sequelize.fn('COUNT', Score.sequelize.col('id')), 'totalScores'],
        [Score.sequelize.fn('COUNT', Score.sequelize.fn('DISTINCT', Score.sequelize.col('userId'))), 'totalPlayers'],
        [Score.sequelize.fn('MAX', Score.sequelize.col('score')), 'highestScore'],
        [Score.sequelize.fn('AVG', Score.sequelize.col('score')), 'averageScore']
      ],
      raw: true
    });

    res.json({
      success: true,
      data: {
        game,
        statistics: {
          totalScores: parseInt(stats?.totalScores) || 0,
          totalPlayers: parseInt(stats?.totalPlayers) || 0,
          highestScore: parseInt(stats?.highestScore) || 0,
          averageScore: parseFloat(stats?.averageScore) || 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a game
 * PUT /api/games/:gameId
 */
export const updateGame = async (req, res, next) => {
  try {
    const { gameId } = req.params;
    const { name, description, maxScore, isActive } = req.body;

    const game = await Game.findByPk(gameId);

    if (!game) {
      throw new ApiError(404, 'Game not found');
    }

    // Check if new name conflicts with existing game
    if (name && name !== game.name) {
      const existingGame = await Game.findOne({
        where: { name }
      });

      if (existingGame) {
        throw new ApiError(400, 'A game with this name already exists');
      }
      game.name = name;
    }

    if (description !== undefined) game.description = description;
    if (maxScore !== undefined) game.maxScore = maxScore;
    if (isActive !== undefined) game.isActive = isActive;

    await game.save();

    res.json({
      success: true,
      message: 'Game updated successfully',
      data: { game }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a game (soft delete by deactivating)
 * DELETE /api/games/:gameId
 */
export const deleteGame = async (req, res, next) => {
  try {
    const { gameId } = req.params;

    const game = await Game.findByPk(gameId);

    if (!game) {
      throw new ApiError(404, 'Game not found');
    }

    // Soft delete by deactivating
    game.isActive = false;
    await game.save();

    res.json({
      success: true,
      message: 'Game deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createGame,
  getAllGames,
  getGameById,
  updateGame,
  deleteGame
};

