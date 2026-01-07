import { Game } from '../models/index.js';
import * as leaderboardService from '../services/leaderboardService.js';
import { forceSyncLeaderboards, getSyncStatus } from '../services/leaderboardSync.js';
import ApiError from '../utils/apiError.js';

/**
 * Get global leaderboard
 * GET /api/leaderboard/global
 */
export const getGlobalLeaderboard = async (req, res, next) => {
  try {
    const { limit = 10, offset = 0 } = req.query;

    const leaderboard = await leaderboardService.getGlobalLeaderboard(
      parseInt(limit),
      parseInt(offset)
    );

    const totalPlayers = await leaderboardService.getLeaderboardSize(null);

    res.json({
      success: true,
      data: {
        leaderboard,
        pagination: {
          total: totalPlayers,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + leaderboard.length < totalPlayers
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get game-specific leaderboard
 * GET /api/leaderboard/game/:gameId
 */
export const getGameLeaderboard = async (req, res, next) => {
  try {
    const { gameId } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    // Verify game exists
    const game = await Game.findByPk(gameId);
    if (!game) {
      throw new ApiError(404, 'Game not found');
    }

    const leaderboard = await leaderboardService.getGameLeaderboard(
      gameId,
      parseInt(limit),
      parseInt(offset)
    );

    const totalPlayers = await leaderboardService.getLeaderboardSize(gameId);

    res.json({
      success: true,
      data: {
        game: {
          id: game.id,
          name: game.name,
          slug: game.slug
        },
        leaderboard,
        pagination: {
          total: totalPlayers,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + leaderboard.length < totalPlayers
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's ranking
 * GET /api/leaderboard/rank
 */
export const getUserRanking = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const username = req.user.username;
    const { gameId } = req.query;

    if (gameId) {
      // Get game-specific rank
      const game = await Game.findByPk(gameId);
      if (!game) {
        throw new ApiError(404, 'Game not found');
      }

      const rank = await leaderboardService.getUserGameRank(userId, gameId, username);

      res.json({
        success: true,
        data: {
          type: 'game',
          game: {
            id: game.id,
            name: game.name
          },
          rank: rank.rank,
          score: rank.score
        }
      });
    } else {
      // Get global rank
      const rank = await leaderboardService.getUserGlobalRank(userId, username);

      res.json({
        success: true,
        data: {
          type: 'global',
          rank: rank.rank,
          totalScore: rank.totalScore
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's rankings across all games
 * GET /api/leaderboard/rank/all
 */
export const getUserAllRankings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const username = req.user.username;

    // Get all active games
    const games = await Game.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'slug']
    });

    const gameIds = games.map(g => g.id);
    const rankings = await leaderboardService.getUserAllRanks(userId, username, gameIds);

    // Enrich game ranks with game info
    const gameRanks = games.map(game => ({
      game: {
        id: game.id,
        name: game.name,
        slug: game.slug
      },
      rank: rankings.games[game.id]?.rank || null,
      score: rankings.games[game.id]?.score || null
    })).filter(g => g.rank !== null);

    res.json({
      success: true,
      data: {
        global: rankings.global,
        games: gameRanks
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get players around the current user
 * GET /api/leaderboard/around
 */
export const getPlayersAround = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const username = req.user.username;
    const { gameId, range = 2 } = req.query;

    let game = null;
    if (gameId) {
      game = await Game.findByPk(gameId);
      if (!game) {
        throw new ApiError(404, 'Game not found');
      }
    }

    const result = await leaderboardService.getPlayersAroundUser(
      userId,
      username,
      gameId || null,
      parseInt(range)
    );

    res.json({
      success: true,
      data: {
        type: gameId ? 'game' : 'global',
        ...(game && { game: { id: game.id, name: game.name } }),
        userRank: result.userRank,
        players: result.players
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get top players report for a specific period
 * GET /api/leaderboard/report/top
 */
export const getTopPlayersReport = async (req, res, next) => {
  try {
    const { period = 'all', limit = 10 } = req.query;

    const topPlayers = await leaderboardService.getTopPlayersByPeriod(
      period,
      parseInt(limit)
    );

    const periodLabels = {
      day: 'Today',
      week: 'This Week',
      month: 'This Month',
      year: 'This Year',
      all: 'All Time'
    };

    res.json({
      success: true,
      data: {
        period: period,
        periodLabel: periodLabels[period] || 'All Time',
        generatedAt: new Date().toISOString(),
        topPlayers
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get sync status between Redis and PostgreSQL
 * GET /api/leaderboard/sync/status
 */
export const getLeaderboardSyncStatus = async (req, res, next) => {
  try {
    const status = await getSyncStatus();

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Force sync leaderboards from PostgreSQL to Redis
 * POST /api/leaderboard/sync
 */
export const forceLeaderboardSync = async (req, res, next) => {
  try {
    const result = await forceSyncLeaderboards();

    res.json({
      success: true,
      message: 'Leaderboards synced successfully from PostgreSQL to Redis',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getGlobalLeaderboard,
  getGameLeaderboard,
  getUserRanking,
  getUserAllRankings,
  getPlayersAround,
  getTopPlayersReport,
  getLeaderboardSyncStatus,
  forceLeaderboardSync
};

