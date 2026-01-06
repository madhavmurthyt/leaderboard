# Real-Time Leaderboard System

A high-performance, real-time leaderboard system built with Node.js, PostgreSQL, and Redis. This system allows users to compete in various games or activities, track their scores, and view their rankings on a leaderboard with real-time updates.

## Features

- **User Authentication**: Secure JWT-based authentication with registration and login
- **Score Submission**: Submit scores for different games with rate limiting
- **Real-Time Leaderboards**: Global and game-specific leaderboards using Redis sorted sets
- **User Rankings**: View individual rankings across all games
- **Top Players Reports**: Generate reports for specific time periods (daily, weekly, monthly)
- **Score History**: Complete history tracking in PostgreSQL

## Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Cache/Leaderboard**: Redis (Sorted Sets)
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: express-validator
- **Rate Limiting**: express-rate-limit

## Project Structure

```
leaderboard/
├── app.js                          # Main entry point
├── package.json                    # Dependencies and scripts
├── README.md                       # This file
├── config/
│   ├── database.js                 # PostgreSQL/Sequelize configuration
│   └── redis.js                    # Redis connection configuration
├── models/
│   ├── index.js                    # Sequelize models loader & associations
│   ├── user.js                     # User model
│   ├── game.js                     # Game model
│   └── score.js                    # Score history model
├── controllers/
│   ├── authController.js           # Authentication logic
│   ├── gameController.js           # Game CRUD operations
│   ├── scoreController.js          # Score submission logic
│   └── leaderboardController.js    # Leaderboard queries
├── routes/
│   ├── auth.js                     # Authentication routes
│   ├── games.js                    # Game management routes
│   ├── scores.js                   # Score submission routes
│   └── leaderboard.js              # Leaderboard routes
├── middleware/
│   ├── auth.js                     # JWT verification middleware
│   ├── rateLimiter.js              # Rate limiting configurations
│   ├── validators.js               # Input validation rules
│   └── errorHandler.js             # Global error handler
├── services/
│   ├── dbSetup.js                  # Database setup with user prompt
│   └── leaderboardService.js       # Redis leaderboard operations
└── utils/
    └── apiError.js                 # Custom error class
```

## Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- Redis 6+

## Installation

1. **Clone/Navigate to the project directory:**
   ```bash
   cd /backend_projects/leaderboard
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   
   Create a `.env` file in the project root:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=leaderboard_db
   DB_USER=postgres
   DB_PASSWORD=postgres

   # Redis Configuration
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=
   REDIS_DB=0

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   JWT_EXPIRES_IN=7d

   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Rate Limiting
   SCORE_RATE_LIMIT_WINDOW_MS=60000
   SCORE_RATE_LIMIT_MAX=10
   ```

4. **Start PostgreSQL and Redis servers**

5. **Run the application:**
   ```bash
   npm start
   ```
   
   On first run, the system will create the database if it doesn't exist.
   If the database exists, you'll be prompted to choose whether to recreate it.

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register a new user | No |
| POST | `/api/auth/login` | Login and get JWT token | No |
| GET | `/api/auth/me` | Get current user profile | Yes |
| PUT | `/api/auth/me` | Update user profile | Yes |

### Games

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/games` | Create a new game | Yes |
| GET | `/api/games` | Get all games | Yes |
| GET | `/api/games/:gameId` | Get game by ID with stats | Yes |
| PUT | `/api/games/:gameId` | Update a game | Yes |
| DELETE | `/api/games/:gameId` | Deactivate a game | Yes |

### Scores

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/scores` | Submit a score (rate limited) | Yes |
| GET | `/api/scores/history` | Get user's score history | Yes |
| GET | `/api/scores/best` | Get user's best scores per game | Yes |
| GET | `/api/scores/stats` | Get user's statistics | Yes |

### Leaderboard

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/leaderboard/global` | Get global leaderboard | Yes |
| GET | `/api/leaderboard/game/:gameId` | Get game-specific leaderboard | Yes |
| GET | `/api/leaderboard/rank` | Get user's ranking | Yes |
| GET | `/api/leaderboard/rank/all` | Get user's rankings in all games | Yes |
| GET | `/api/leaderboard/around` | Get players around current user | Yes |
| GET | `/api/leaderboard/report/top` | Get top players report | Yes |

## Usage Examples

### 1. Register a new user

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "player1",
    "email": "player1@example.com",
    "password": "password123"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "player1@example.com",
    "password": "password123"
  }'
```

### 3. Create a game

```bash
curl -X POST http://localhost:3000/api/games \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Space Invaders",
    "description": "Classic arcade shooter",
    "maxScore": 999999
  }'
```

### 4. Submit a score

```bash
curl -X POST http://localhost:3000/api/scores \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "gameId": "GAME_UUID",
    "score": 15000
  }'
```

### 5. Get global leaderboard

```bash
curl -X GET "http://localhost:3000/api/leaderboard/global?limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 6. Get top players report (weekly)

```bash
curl -X GET "http://localhost:3000/api/leaderboard/report/top?period=week&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Redis Sorted Sets Usage

The system uses Redis sorted sets for efficient real-time leaderboard operations:

### Key Patterns

| Key Pattern | Description |
|-------------|-------------|
| `leaderboard:global` | Global leaderboard (cumulative scores) |
| `leaderboard:game:{gameId}` | Game-specific leaderboard (best scores) |
| `leaderboard:daily:{date}` | Daily leaderboard |
| `leaderboard:weekly:{week}` | Weekly leaderboard |
| `leaderboard:monthly:{month}` | Monthly leaderboard |

### Redis Commands Used

- `ZADD` - Add/update scores in sorted sets
- `ZINCRBY` - Increment cumulative scores
- `ZREVRANK` - Get user's rank (highest score first)
- `ZREVRANGE` - Get leaderboard entries
- `ZSCORE` - Get user's score
- `ZCARD` - Get total players count

## Rate Limiting

| Route | Limit | Window |
|-------|-------|--------|
| General API | 100 requests | 15 minutes |
| Score Submission | 10 requests | 1 minute |
| Authentication | 5 requests | 15 minutes |

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common HTTP status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Database Schema

### Users Table
- `id` (UUID, PK)
- `username` (VARCHAR, unique)
- `email` (VARCHAR, unique)
- `password` (VARCHAR, hashed)
- `isActive` (BOOLEAN)
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)

### Games Table
- `id` (UUID, PK)
- `name` (VARCHAR, unique)
- `slug` (VARCHAR, unique)
- `description` (TEXT)
- `maxScore` (INTEGER, optional)
- `isActive` (BOOLEAN)
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)

### Scores Table
- `id` (UUID, PK)
- `userId` (UUID, FK)
- `gameId` (UUID, FK)
- `score` (INTEGER)
- `metadata` (JSONB)
- `submittedAt` (TIMESTAMP)
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_NAME` | Database name | leaderboard_db |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | postgres |
| `REDIS_HOST` | Redis host | localhost |
| `REDIS_PORT` | Redis port | 6379 |
| `REDIS_PASSWORD` | Redis password | (none) |
| `REDIS_DB` | Redis database | 0 |
| `JWT_SECRET` | JWT signing secret | (required) |
| `JWT_EXPIRES_IN` | Token expiration | 7d |
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `DB_FORCE_RECREATE` | Auto-recreate DB | false |

## License

ISC

