import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Score = sequelize.define('Score', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  gameId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'games',
      key: 'id'
    }
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  submittedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'scores',
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['gameId']
    },
    {
      fields: ['score']
    },
    {
      fields: ['submittedAt']
    },
    {
      fields: ['userId', 'gameId']
    }
  ]
});

export default Score;

