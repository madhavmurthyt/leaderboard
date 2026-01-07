# Real-Time Leaderboard System

A high-performance, real-time leaderboard system built with Node.js, PostgreSQL, and Redis. This system allows users to compete in various games or activities, track their scores, and view their rankings on a leaderboard with real-time updates.

## Features

- **User Authentication**: Secure JWT-based authentication with registration and login
- **Score Submission**: Submit scores for different games with rate limiting
- **Real-Time Leaderboards**: Global and game-specific leaderboards using Redis sorted sets
- **User Rankings**: View individual rankings across all games
- **Top Players Reports**: Generate reports for specific time periods (daily, weekly, monthly)
- **Score History**: Complete history tracking in PostgreSQL
- **Data Persistence**: Auto-sync Redis from PostgreSQL on startup (no data loss on Redis restart)

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Leaderboard System                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐    │
│   │   Express    │────────▶│  PostgreSQL  │◀───────▶│    Redis     │    │
│   │   REST API   │         │  (Permanent) │         │  (Real-time) │    │
│   └──────────────┘         └──────────────┘         └──────────────┘    │
│          │                        │                        │             │
│          │                        │                        │             │
│          ▼                        ▼                        ▼             │
│   • Authentication          • User accounts          • Sorted sets      │
│   • Rate limiting           • Score history          • Fast rankings    │
│   • Input validation        • Game metadata          • Time-based LBs   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

| Action | PostgreSQL | Redis |
|--------|------------|-------|
| Submit Score | ✅ Save (permanent) | ✅ Update rankings |
| Get Leaderboard | ❌ | ✅ Fast query |
| Get Score History | ✅ Query | ❌ |
| App Startup | Source of truth | Sync from PostgreSQL |

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
├── .env                            # Environment variables
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
│   └── leaderboardController.js    # Leaderboard queries & sync
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
│   ├── leaderboardService.js       # Redis leaderboard operations
│   └── leaderboardSync.js          # Redis ↔ PostgreSQL sync service
├── seeders/
│   └── adminSeeder.js              # Create admin user
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
   
   On first run, the system will:
   - Create the database if it doesn't exist
   - Prompt to recreate if the database exists
   - Sync Redis leaderboards from PostgreSQL data

6. **Create an admin user:**
   ```bash
   npm run seed:admin
   ```
   
   This creates an admin user with default credentials:
   - Email: `admin@leaderboard.com`
   - Password: `admin123`
   
   You can customize via environment variables:
   ```env
   ADMIN_EMAIL=your-admin@example.com
   ADMIN_USERNAME=superadmin
   ADMIN_PASSWORD=your-secure-password
   ```

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register a new user | No |
| POST | `/api/auth/login` | Login and get JWT token | No |
| GET | `/api/auth/me` | Get current user profile | Yes |
| PUT | `/api/auth/me` | Update user profile | Yes |

### Games

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/games` | Create a new game | Admin only |
| GET | `/api/games` | Get all games | All users |
| GET | `/api/games/:gameId` | Get game by ID with stats | All users |
| PUT | `/api/games/:gameId` | Update a game | Admin only |
| DELETE | `/api/games/:gameId` | Deactivate a game | Admin only |

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
| GET | `/api/leaderboard/sync/status` | Check Redis ↔ PostgreSQL sync status | Yes |
| POST | `/api/leaderboard/sync` | Force rebuild Redis from PostgreSQL | Yes |

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

### 7. Check sync status

```bash
curl -X GET http://localhost:3000/api/leaderboard/sync/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 8. Force sync Redis from PostgreSQL

```bash
curl -X POST http://localhost:3000/api/leaderboard/sync \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Redis Sorted Sets Usage

The system uses Redis sorted sets for efficient real-time leaderboard operations:

### Key Patterns

| Key Pattern | Description | Expiration |
|-------------|-------------|------------|
| `leaderboard:global` | Global leaderboard (cumulative scores) | Never |
| `leaderboard:game:{gameId}` | Game-specific leaderboard (best scores) | Never |
| `leaderboard:daily:{date}` | Daily leaderboard | 2 days |
| `leaderboard:weekly:{week}` | Weekly leaderboard | 8 days |
| `leaderboard:monthly:{month}` | Monthly leaderboard | 32 days |

### Redis Commands Used

- `ZADD` - Add/update scores in sorted sets
- `ZINCRBY` - Increment cumulative scores
- `ZREVRANK` - Get user's rank (highest score first)
- `ZREVRANGE` - Get leaderboard entries
- `ZSCORE` - Get user's score
- `ZCARD` - Get total players count

## Data Persistence & Sync

### How It Works

PostgreSQL is the **source of truth** for all data. Redis is used as a fast cache for leaderboard queries.

```
On Application Startup:
  1. Connect to PostgreSQL ✅
  2. Connect to Redis ✅
  3. Check if Redis has leaderboard data
     ├── YES: Skip sync (data exists)
     └── NO: Rebuild from PostgreSQL
           ├── Recalculate global scores
           ├── Recalculate per-game best scores
           └── Recalculate daily/weekly/monthly scores
```

### Recovery Scenarios

| Scenario | What Happens |
|----------|--------------|
| Redis restarts | Auto-sync from PostgreSQL on app startup |
| Redis data corrupted | Use `POST /api/leaderboard/sync` to rebuild |
| App restarts | Redis data persists, no action needed |
| Need fresh start | Force sync via API endpoint |

## User Roles

The system supports two user roles:

| Role | Description | Permissions |
|------|-------------|-------------|
| `user` | Regular player | Submit scores, view leaderboards, view games |
| `admin` | Administrator | All user permissions + create/update/delete games |

### Creating an Admin User

**Option 1: Using the seeder script**
```bash
npm run seed:admin
```

**Option 2: Manually update a user's role via SQL**
```sql
UPDATE users SET role = 'admin' WHERE email = 'user@example.com';
```

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
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `username` | VARCHAR(50) | Unique username |
| `email` | VARCHAR(100) | Unique email |
| `password` | VARCHAR(255) | Bcrypt hashed |
| `role` | ENUM | 'user' or 'admin' (default: 'user') |
| `isActive` | BOOLEAN | Account status |
| `createdAt` | TIMESTAMP | Creation date |
| `updatedAt` | TIMESTAMP | Last update |

### Games Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | VARCHAR(100) | Unique game name |
| `slug` | VARCHAR(100) | Auto-generated URL-friendly name |
| `description` | TEXT | Game description |
| `maxScore` | INTEGER | Optional max score |
| `isActive` | BOOLEAN | Game status |
| `createdAt` | TIMESTAMP | Creation date |
| `updatedAt` | TIMESTAMP | Last update |

### Scores Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `userId` | UUID | Foreign key to users |
| `gameId` | UUID | Foreign key to games |
| `score` | INTEGER | Score value |
| `metadata` | JSONB | Additional data |
| `submittedAt` | TIMESTAMP | Submission time |
| `createdAt` | TIMESTAMP | Creation date |
| `updatedAt` | TIMESTAMP | Last update |

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
| `SCORE_RATE_LIMIT_WINDOW_MS` | Rate limit window | 60000 |
| `SCORE_RATE_LIMIT_MAX` | Max score submissions | 10 |
| `ADMIN_EMAIL` | Admin user email | admin@leaderboard.com |
| `ADMIN_USERNAME` | Admin username | admin |
| `ADMIN_PASSWORD` | Admin password | admin123 |

## License

ISC
