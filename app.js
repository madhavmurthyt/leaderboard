import express from 'express';
import dotenv from 'dotenv';
import { sequelize } from './models/index.js';
import redis from './config/redis.js';
import { setupDatabase } from './services/dbSetup.js';
import { syncLeaderboardsFromDB } from './services/leaderboardSync.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import errorHandler from './middleware/errorHandler.js';

// Import routes
import authRoutes from './routes/auth.js';
import scoreRoutes from './routes/scores.js';
import leaderboardRoutes from './routes/leaderboard.js';
import gameRoutes from './routes/games.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply general rate limiter to all routes
app.use(generalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Leaderboard API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/games', gameRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  
  try {
    // Close Redis connection
    await redis.quit();
    console.log('✅ Redis connection closed');
    
    // Close database connection
    await sequelize.close();
    console.log('✅ Database connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startServer = async () => {
  try {
    console.log('\n🚀 Starting Leaderboard API Server...\n');
    
    // Setup database
    await setupDatabase(sequelize);
    
    // Connect to Redis
    await redis.connect();
    
    // Sync leaderboards from PostgreSQL to Redis
    // This rebuilds Redis data if it was lost (e.g., Redis restart)
    await syncLeaderboardsFromDB();
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`\n✅ Server is running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log('\n📌 Available endpoints:');
      console.log('  Auth:');
      console.log('    POST   /api/auth/register    - Register a new user');
      console.log('    POST   /api/auth/login       - Login user');
      console.log('    GET    /api/auth/me          - Get current user profile');
      console.log('    PUT    /api/auth/me          - Update user profile');
      console.log('  Games:');
      console.log('    POST   /api/games            - Create a new game');
      console.log('    GET    /api/games            - Get all games');
      console.log('    GET    /api/games/:id        - Get game by ID');
      console.log('    PUT    /api/games/:id        - Update game');
      console.log('    DELETE /api/games/:id        - Delete (deactivate) game');
      console.log('  Scores:');
      console.log('    POST   /api/scores           - Submit a score (rate limited)');
      console.log('    GET    /api/scores/history   - Get score history');
      console.log('    GET    /api/scores/best      - Get best scores per game');
      console.log('    GET    /api/scores/stats     - Get user statistics');
      console.log('  Leaderboard:');
      console.log('    GET    /api/leaderboard/global        - Get global leaderboard');
      console.log('    GET    /api/leaderboard/game/:gameId  - Get game leaderboard');
      console.log('    GET    /api/leaderboard/rank          - Get user ranking');
      console.log('    GET    /api/leaderboard/rank/all      - Get all rankings');
      console.log('    GET    /api/leaderboard/around        - Get players around user');
      console.log('    GET    /api/leaderboard/report/top    - Get top players report');
      console.log('\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

