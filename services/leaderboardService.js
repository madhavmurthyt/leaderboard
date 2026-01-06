import redis from '../config/redis.js';

// Redis key patterns
const KEYS = {
  GLOBAL_LEADERBOARD: 'leaderboard:global',
  GAME_LEADERBOARD: (gameId) => `leaderboard:game:${gameId}`,
  USER_BEST_SCORE: (userId, gameId) => `user:${userId}:game:${gameId}:best`,
  DAILY_LEADERBOARD: (date) => `leaderboard:daily:${date}`,
  WEEKLY_LEADERBOARD: (week) => `leaderboard:weekly:${week}`,
  MONTHLY_LEADERBOARD: (month) => `leaderboard:monthly:${month}`
};

// Helper to get date strings
const getDateStrings = () => {
  const now = new Date();
  const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const year = now.getFullYear();
  const week = Math.ceil((now - new Date(year, 0, 1)) / (7 * 24 * 60 * 60 * 1000));
  const month = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  return { date, week: `${year}-W${week}`, month };
};

/**
 * Add or update a score in the leaderboard
 * @param {string} userId - User ID
 * @param {string} gameId - Game ID
 * @param {number} score - Score to add
 * @param {string} username - Username for display
 * @returns {Promise<Object>} - Updated rank information
 */
export const addScore = async (userId, gameId, score, username) => {
  const { date, week, month } = getDateStrings();
  const member = JSON.stringify({ id: userId, username });
  
  // Use pipeline for atomic operations
  const pipeline = redis.pipeline();
  
  // Update game-specific leaderboard (keeps highest score)
  pipeline.zadd(KEYS.GAME_LEADERBOARD(gameId), 'GT', score, member);
  
  // Update global leaderboard
  // First get current global score to add to it
  pipeline.zincrby(KEYS.GLOBAL_LEADERBOARD, score, member);
  
  // Update time-based leaderboards
  pipeline.zincrby(KEYS.DAILY_LEADERBOARD(date), score, member);
  pipeline.zincrby(KEYS.WEEKLY_LEADERBOARD(week), score, member);
  pipeline.zincrby(KEYS.MONTHLY_LEADERBOARD(month), score, member);
  
  // Set expiration for time-based keys
  pipeline.expire(KEYS.DAILY_LEADERBOARD(date), 2 * 24 * 60 * 60); // 2 days
  pipeline.expire(KEYS.WEEKLY_LEADERBOARD(week), 8 * 24 * 60 * 60); // 8 days
  pipeline.expire(KEYS.MONTHLY_LEADERBOARD(month), 32 * 24 * 60 * 60); // 32 days
  
  await pipeline.exec();
  
  // Get user's ranks
  const [gameRank, globalRank] = await Promise.all([
    redis.zrevrank(KEYS.GAME_LEADERBOARD(gameId), member),
    redis.zrevrank(KEYS.GLOBAL_LEADERBOARD, member)
  ]);
  
  return {
    gameRank: gameRank !== null ? gameRank + 1 : null,
    globalRank: globalRank !== null ? globalRank + 1 : null
  };
};

/**
 * Get game leaderboard
 * @param {string} gameId - Game ID
 * @param {number} limit - Number of entries to return
 * @param {number} offset - Starting position
 * @returns {Promise<Array>} - Leaderboard entries
 */
export const getGameLeaderboard = async (gameId, limit = 10, offset = 0) => {
  const results = await redis.zrevrange(
    KEYS.GAME_LEADERBOARD(gameId),
    offset,
    offset + limit - 1,
    'WITHSCORES'
  );
  
  return parseLeaderboardResults(results, offset);
};

/**
 * Get global leaderboard
 * @param {number} limit - Number of entries to return
 * @param {number} offset - Starting position
 * @returns {Promise<Array>} - Leaderboard entries
 */
export const getGlobalLeaderboard = async (limit = 10, offset = 0) => {
  const results = await redis.zrevrange(
    KEYS.GLOBAL_LEADERBOARD,
    offset,
    offset + limit - 1,
    'WITHSCORES'
  );
  
  return parseLeaderboardResults(results, offset);
};

/**
 * Get user's rank in a specific game
 * @param {string} userId - User ID
 * @param {string} gameId - Game ID
 * @param {string} username - Username
 * @returns {Promise<Object>} - User's rank and score
 */
export const getUserGameRank = async (userId, gameId, username) => {
  const member = JSON.stringify({ id: userId, username });
  
  const [rank, score] = await Promise.all([
    redis.zrevrank(KEYS.GAME_LEADERBOARD(gameId), member),
    redis.zscore(KEYS.GAME_LEADERBOARD(gameId), member)
  ]);
  
  return {
    rank: rank !== null ? rank + 1 : null,
    score: score ? parseInt(score) : null
  };
};

/**
 * Get user's global rank
 * @param {string} userId - User ID
 * @param {string} username - Username
 * @returns {Promise<Object>} - User's global rank and total score
 */
export const getUserGlobalRank = async (userId, username) => {
  const member = JSON.stringify({ id: userId, username });
  
  const [rank, score] = await Promise.all([
    redis.zrevrank(KEYS.GLOBAL_LEADERBOARD, member),
    redis.zscore(KEYS.GLOBAL_LEADERBOARD, member)
  ]);
  
  return {
    rank: rank !== null ? rank + 1 : null,
    totalScore: score ? parseInt(score) : null
  };
};

/**
 * Get user's ranks across all games
 * @param {string} userId - User ID
 * @param {string} username - Username
 * @param {Array} gameIds - Array of game IDs to check
 * @returns {Promise<Object>} - User's rankings
 */
export const getUserAllRanks = async (userId, username, gameIds) => {
  const member = JSON.stringify({ id: userId, username });
  
  // Get global rank
  const globalRankPromise = Promise.all([
    redis.zrevrank(KEYS.GLOBAL_LEADERBOARD, member),
    redis.zscore(KEYS.GLOBAL_LEADERBOARD, member)
  ]);
  
  // Get game-specific ranks
  const gameRankPromises = gameIds.map(gameId => 
    Promise.all([
      redis.zrevrank(KEYS.GAME_LEADERBOARD(gameId), member),
      redis.zscore(KEYS.GAME_LEADERBOARD(gameId), member),
      Promise.resolve(gameId)
    ])
  );
  
  const [globalResult, ...gameResults] = await Promise.all([
    globalRankPromise,
    ...gameRankPromises
  ]);
  
  const gameRanks = {};
  gameResults.forEach(([rank, score, gameId]) => {
    if (rank !== null) {
      gameRanks[gameId] = {
        rank: rank + 1,
        score: parseInt(score)
      };
    }
  });
  
  return {
    global: {
      rank: globalResult[0] !== null ? globalResult[0] + 1 : null,
      totalScore: globalResult[1] ? parseInt(globalResult[1]) : null
    },
    games: gameRanks
  };
};

/**
 * Get top players for a specific period
 * @param {string} period - Period type: 'day', 'week', 'month', 'all'
 * @param {number} limit - Number of entries to return
 * @returns {Promise<Array>} - Top players
 */
export const getTopPlayersByPeriod = async (period = 'all', limit = 10) => {
  const { date, week, month } = getDateStrings();
  
  let key;
  switch (period) {
    case 'day':
      key = KEYS.DAILY_LEADERBOARD(date);
      break;
    case 'week':
      key = KEYS.WEEKLY_LEADERBOARD(week);
      break;
    case 'month':
      key = KEYS.MONTHLY_LEADERBOARD(month);
      break;
    case 'all':
    default:
      key = KEYS.GLOBAL_LEADERBOARD;
  }
  
  const results = await redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');
  return parseLeaderboardResults(results, 0);
};

/**
 * Get players around a specific user (for context)
 * @param {string} userId - User ID
 * @param {string} username - Username
 * @param {string} gameId - Game ID (null for global)
 * @param {number} range - Number of players above and below
 * @returns {Promise<Object>} - Players around user
 */
export const getPlayersAroundUser = async (userId, username, gameId = null, range = 2) => {
  const member = JSON.stringify({ id: userId, username });
  const key = gameId ? KEYS.GAME_LEADERBOARD(gameId) : KEYS.GLOBAL_LEADERBOARD;
  
  const rank = await redis.zrevrank(key, member);
  
  if (rank === null) {
    return { userRank: null, players: [] };
  }
  
  const start = Math.max(0, rank - range);
  const end = rank + range;
  
  const results = await redis.zrevrange(key, start, end, 'WITHSCORES');
  const players = parseLeaderboardResults(results, start);
  
  return {
    userRank: rank + 1,
    players
  };
};

/**
 * Get leaderboard size
 * @param {string} gameId - Game ID (null for global)
 * @returns {Promise<number>} - Number of entries
 */
export const getLeaderboardSize = async (gameId = null) => {
  const key = gameId ? KEYS.GAME_LEADERBOARD(gameId) : KEYS.GLOBAL_LEADERBOARD;
  return await redis.zcard(key);
};

/**
 * Remove user from all leaderboards
 * @param {string} userId - User ID
 * @param {string} username - Username
 * @param {Array} gameIds - Array of game IDs
 */
export const removeUserFromLeaderboards = async (userId, username, gameIds) => {
  const member = JSON.stringify({ id: userId, username });
  const { date, week, month } = getDateStrings();
  
  const pipeline = redis.pipeline();
  
  pipeline.zrem(KEYS.GLOBAL_LEADERBOARD, member);
  pipeline.zrem(KEYS.DAILY_LEADERBOARD(date), member);
  pipeline.zrem(KEYS.WEEKLY_LEADERBOARD(week), member);
  pipeline.zrem(KEYS.MONTHLY_LEADERBOARD(month), member);
  
  gameIds.forEach(gameId => {
    pipeline.zrem(KEYS.GAME_LEADERBOARD(gameId), member);
  });
  
  await pipeline.exec();
};

// Helper function to parse leaderboard results
const parseLeaderboardResults = (results, startOffset) => {
  const entries = [];
  for (let i = 0; i < results.length; i += 2) {
    try {
      const userData = JSON.parse(results[i]);
      entries.push({
        rank: startOffset + (i / 2) + 1,
        userId: userData.id,
        username: userData.username,
        score: parseInt(results[i + 1])
      });
    } catch (e) {
      // Handle legacy data that might not be JSON
      entries.push({
        rank: startOffset + (i / 2) + 1,
        userId: results[i],
        username: results[i],
        score: parseInt(results[i + 1])
      });
    }
  }
  return entries;
};

export default {
  addScore,
  getGameLeaderboard,
  getGlobalLeaderboard,
  getUserGameRank,
  getUserGlobalRank,
  getUserAllRanks,
  getTopPlayersByPeriod,
  getPlayersAroundUser,
  getLeaderboardSize,
  removeUserFromLeaderboards
};

