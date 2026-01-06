import { Score, Game, User } from '../models/index.js';
import * as leaderboardService from '../services/leaderboardService.js';
import ApiError from '../utils/apiError.js';
import { Op } from 'sequelize';

/**
 * Submit a score
 * POST /api/scores
 */
export const submitScore = async (req, res, next) => {
  try {
    const { gameId, score, metadata } = req.body;
    const userId = req.user.id;
    const username = req.user.username;

    // Verify game exists and is active
    const game = await Game.findByPk(gameId);
    if (!game) {
      throw new ApiError(404, 'Game not found');
    }
    if (!game.isActive) {
      throw new ApiError(400, 'This game is currently inactive');
    }

    // Validate score against max score if defined
    if (game.maxScore && score > game.maxScore) {
      throw new ApiError(400, `Score cannot exceed maximum of ${game.maxScore}`);
    }

    // Save score to database (history)
    const scoreRecord = await Score.create({
      userId,
      gameId,
      score,
      metadata: metadata || {},
      submittedAt: new Date()
    });

    // Update Redis leaderboard
    const ranks = await leaderboardService.addScore(userId, gameId, score, username);

    res.status(201).json({
      success: true,
      message: 'Score submitted successfully',
      data: {
        scoreId: scoreRecord.id,
        score,
        gameId,
        gameName: game.name,
        ranks: {
          gameRank: ranks.gameRank,
          globalRank: ranks.globalRank
        },
        submittedAt: scoreRecord.submittedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's score history
 * GET /api/scores/history
 */
export const getScoreHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { gameId, limit = 20, offset = 0 } = req.query;

    const whereClause = { userId };
    if (gameId) {
      whereClause.gameId = gameId;
    }

    const { count, rows: scores } = await Score.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Game,
          as: 'game',
          attributes: ['id', 'name', 'slug']
        }
      ],
      order: [['submittedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        scores,
        pagination: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + scores.length < count
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's best scores per game
 * GET /api/scores/best
 */
export const getBestScores = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get best score for each game
    const bestScores = await Score.findAll({
      where: { userId },
      attributes: [
        'gameId',
        [Score.sequelize.fn('MAX', Score.sequelize.col('score')), 'bestScore'],
        [Score.sequelize.fn('COUNT', Score.sequelize.col('score')), 'totalSubmissions']
      ],
      include: [
        {
          model: Game,
          as: 'game',
          attributes: ['id', 'name', 'slug']
        }
      ],
      group: ['gameId', 'game.id'],
      raw: false
    });

    res.json({
      success: true,
      data: {
        bestScores
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's statistics
 * GET /api/scores/stats
 */
export const getStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get overall stats
    const stats = await Score.findOne({
      where: { userId },
      attributes: [
        [Score.sequelize.fn('COUNT', Score.sequelize.col('id')), 'totalGamesPlayed'],
        [Score.sequelize.fn('SUM', Score.sequelize.col('score')), 'totalScore'],
        [Score.sequelize.fn('AVG', Score.sequelize.col('score')), 'averageScore'],
        [Score.sequelize.fn('MAX', Score.sequelize.col('score')), 'highestScore']
      ],
      raw: true
    });

    // Get games played count
    const gamesPlayed = await Score.count({
      where: { userId },
      distinct: true,
      col: 'gameId'
    });

    // Get recent activity
    const recentScores = await Score.findAll({
      where: { userId },
      include: [
        {
          model: Game,
          as: 'game',
          attributes: ['id', 'name', 'slug']
        }
      ],
      order: [['submittedAt', 'DESC']],
      limit: 5
    });

    res.json({
      success: true,
      data: {
        stats: {
          totalGamesPlayed: parseInt(stats.totalGamesPlayed) || 0,
          totalScore: parseInt(stats.totalScore) || 0,
          averageScore: parseFloat(stats.averageScore) || 0,
          highestScore: parseInt(stats.highestScore) || 0,
          uniqueGamesPlayed: gamesPlayed
        },
        recentActivity: recentScores
      }
    });
  } catch (error) {
    next(error);
  }
};

export default {
  submitScore,
  getScoreHistory,
  getBestScores,
  getStats
};

