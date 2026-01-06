import readline from 'readline';
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const DB_NAME = process.env.DB_NAME || 'leaderboard_db';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';

// Create a connection to postgres (without specifying a database)
const getPostgresConnection = () => {
  return new Sequelize({
    dialect: 'postgres',
    host: DB_HOST,
    port: DB_PORT,
    database: 'postgres',
    username: DB_USER,
    password: DB_PASSWORD,
    logging: false
  });
};

// Check if database exists
const checkDatabaseExists = async () => {
  const postgres = getPostgresConnection();
  try {
    const [results] = await postgres.query(
      `SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'`
    );
    await postgres.close();
    return results.length > 0;
  } catch (error) {
    await postgres.close();
    throw error;
  }
};

// Create database
const createDatabase = async () => {
  const postgres = getPostgresConnection();
  try {
    await postgres.query(`CREATE DATABASE "${DB_NAME}"`);
    console.log(`✅ Database '${DB_NAME}' created successfully`);
    await postgres.close();
    return true;
  } catch (error) {
    await postgres.close();
    throw error;
  }
};

// Drop database
const dropDatabase = async () => {
  const postgres = getPostgresConnection();
  try {
    // Terminate existing connections
    await postgres.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${DB_NAME}'
      AND pid <> pg_backend_pid()
    `);
    await postgres.query(`DROP DATABASE IF EXISTS "${DB_NAME}"`);
    console.log(`🗑️  Database '${DB_NAME}' dropped successfully`);
    await postgres.close();
    return true;
  } catch (error) {
    await postgres.close();
    throw error;
  }
};

// Prompt user for yes/no
const promptUser = (question) => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
};

// Main setup function
export const setupDatabase = async (sequelize, forceSync = false) => {
  try {
    console.log('\n🔍 Checking database status...');
    
    const dbExists = await checkDatabaseExists();
    
    if (dbExists) {
      console.log(`📦 Database '${DB_NAME}' already exists.`);
      
      // Check if running in non-interactive mode
      if (process.env.DB_FORCE_RECREATE === 'true') {
        console.log('🔄 Force recreate is enabled. Dropping and recreating database...');
        await dropDatabase();
        await createDatabase();
        forceSync = true;
      } else if (process.stdout.isTTY) {
        // Interactive mode - ask user
        const answer = await promptUser('Do you want to drop and recreate the database? (yes/no): ');
        
        if (answer === 'yes' || answer === 'y') {
          await dropDatabase();
          await createDatabase();
          forceSync = true;
        } else {
          console.log('📝 Keeping existing database. Tables will be synced...');
        }
      } else {
        // Non-interactive mode - keep existing
        console.log('📝 Running in non-interactive mode. Keeping existing database...');
      }
    } else {
      console.log(`📦 Database '${DB_NAME}' does not exist. Creating...`);
      await createDatabase();
      forceSync = true;
    }

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');

    // Sync models
    await sequelize.sync({ force: forceSync, alter: !forceSync });
    console.log('✅ Database models synchronized');

    return true;
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    throw error;
  }
};

export default { setupDatabase };

