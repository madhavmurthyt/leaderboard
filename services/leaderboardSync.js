import redis from '../config/redis.js';
import { Score, User, Game } from '../models/index.js';
import { Op } from 'sequelize';

// Redis key patterns (same as leaderboardService)
const KEYS = {
  GLOBAL_LEADERBOARD: 'leaderboard:global',
  GAME_LEADERBOARD: (gameId) => `leaderboard:game:${gameId}`,
  DAILY_LEADERBOARD: (date) => `leaderboard:daily:${date}`,
  WEEKLY_LEADERBOARD: (week) => `leaderboard:weekly:${week}`,
  MONTHLY_LEADERBOARD: (month) => `leaderboard:monthly:${month}`
};

// Helper to get date strings
const getDateStrings = (date = new Date()) => {
  const dateStr = date.toISOString().split('T')[0];
  const year = date.getFullYear();
  const week = Math.ceil((date - new Date(year, 0, 1)) / (7 * 24 * 60 * 60 * 1000));
  const month = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  
  return { date: dateStr, week: `${year}-W${week}`, month };
};

/**
 * Sync Redis leaderboards from PostgreSQL database
 * This should be called on application startup to ensure Redis is in sync
 */
export const syncLeaderboardsFromDB = async () => {
  console.log('\n🔄 Syncing Redis leaderboards from PostgreSQL...');
  
  try {
    // Check if Redis has any data
    const globalSize = await redis.zcard(KEYS.GLOBAL_LEADERBOARD);
    
    if (globalSize > 0) {
      console.log(`   Redis already has ${globalSize} entries in global leaderboard`);
      console.log('   Skipping sync (use forceSyncLeaderboards() to force rebuild)');
      return { synced: false, reason: 'Redis already has data' };
    }
    
    return await forceSyncLeaderboards();
  } catch (error) {
    console.error('❌ Failed to sync leaderboards:', error.message);
    throw error;
  }
};

/**
 * Force rebuild all Redis leaderboards from PostgreSQL
 * Clears existing Redis data and rebuilds from scratch
 */
export const forceSyncLeaderboards = async () => {
  console.log('\n🔄 Force rebuilding Redis leaderboards from PostgreSQL...');
  
  try {
    const startTime = Date.now();
    
    // Get all active games
    const games = await Game.findAll({
      where: { isActive: true },
      attributes: ['id', 'name']
    });
    
    console.log(`   Found ${games.length} active games`);
    
    // Clear existing leaderboards
    const pipeline = redis.pipeline();
    pipeline.del(KEYS.GLOBAL_LEADERBOARD);
    
    for (const game of games) {
      pipeline.del(KEYS.GAME_LEADERBOARD(game.id));
    }
    
    await pipeline.exec();
    console.log('   Cleared existing Redis leaderboards');
    
    // Get all users with their scores
    const users = await User.findAll({
      where: { isActive: true },
      attributes: ['id', 'username']
    });
    
    console.log(`   Processing ${users.length} users...`);
    
    let totalScoresProcessed = 0;
    
    for (const user of users) {
      const member = JSON.stringify({ id: user.id, username: user.username });
      
      // Get user's best score per game
      for (const game of games) {
        const bestScore = await Score.max('score', {
          where: {
            userId: user.id,
            gameId: game.id
          }
        });
        
        if (bestScore !== null) {
          // Add to game leaderboard
          await redis.zadd(KEYS.GAME_LEADERBOARD(game.id), bestScore, member);
          totalScoresProcessed++;
        }
      }
      
      // Calculate total score for global leaderboard
      const totalScore = await Score.sum('score', {
        where: { userId: user.id }
      });
      
      if (totalScore > 0) {
        await redis.zadd(KEYS.GLOBAL_LEADERBOARD, totalScore, member);
      }
    }
    
    // Rebuild time-based leaderboards (today, this week, this month)
    await rebuildTimeBasedLeaderboards(users, games);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Leaderboard sync completed in ${duration}ms`);
    console.log(`   Processed ${totalScoresProcessed} game scores`);
    
    return {
      synced: true,
      usersProcessed: users.length,
      gamesProcessed: games.length,
      scoresProcessed: totalScoresProcessed,
      duration
    };
  } catch (error) {
    console.error('❌ Failed to force sync leaderboards:', error.message);
    throw error;
  }
};

/**
 * Rebuild time-based leaderboards (daily, weekly, monthly)
 */
const rebuildTimeBasedLeaderboards = async (users, games) => {
  const { date, week, month } = getDateStrings();
  
  // Get date ranges
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  for (const user of users) {
    const member = JSON.stringify({ id: user.id, username: user.username });
    
    // Daily score
    const dailyScore = await Score.sum('score', {
      where: {
        userId: user.id,
        submittedAt: { [Op.gte]: today }
      }
    });
    
    if (dailyScore > 0) {
      await redis.zadd(KEYS.DAILY_LEADERBOARD(date), dailyScore, member);
      await redis.expire(KEYS.DAILY_LEADERBOARD(date), 2 * 24 * 60 * 60);
    }
    
    // Weekly score
    const weeklyScore = await Score.sum('score', {
      where: {
        userId: user.id,
        submittedAt: { [Op.gte]: startOfWeek }
      }
    });
    
    if (weeklyScore > 0) {
      await redis.zadd(KEYS.WEEKLY_LEADERBOARD(week), weeklyScore, member);
      await redis.expire(KEYS.WEEKLY_LEADERBOARD(week), 8 * 24 * 60 * 60);
    }
    
    // Monthly score
    const monthlyScore = await Score.sum('score', {
      where: {
        userId: user.id,
        submittedAt: { [Op.gte]: startOfMonth }
      }
    });
    
    if (monthlyScore > 0) {
      await redis.zadd(KEYS.MONTHLY_LEADERBOARD(month), monthlyScore, member);
      await redis.expire(KEYS.MONTHLY_LEADERBOARD(month), 32 * 24 * 60 * 60);
    }
  }
};

/**
 * Get sync status - compare Redis and PostgreSQL counts
 */
export const getSyncStatus = async () => {
  const dbUserCount = await User.count({ where: { isActive: true } });
  const dbScoreCount = await Score.count();
  const redisGlobalCount = await redis.zcard(KEYS.GLOBAL_LEADERBOARD);
  
  const games = await Game.findAll({ where: { isActive: true } });
  const gameStats = [];
  
  for (const game of games) {
    const dbCount = await Score.count({
      where: { gameId: game.id },
      distinct: true,
      col: 'userId'
    });
    const redisCount = await redis.zcard(KEYS.GAME_LEADERBOARD(game.id));
    
    gameStats.push({
      gameId: game.id,
      gameName: game.name,
      dbPlayers: dbCount,
      redisPlayers: redisCount,
      inSync: dbCount === redisCount
    });
  }
  
  return {
    database: {
      users: dbUserCount,
      totalScores: dbScoreCount
    },
    redis: {
      globalLeaderboardSize: redisGlobalCount
    },
    games: gameStats,
    overallInSync: redisGlobalCount > 0
  };
};

export default {
  syncLeaderboardsFromDB,
  forceSyncLeaderboards,
  getSyncStatus
};

