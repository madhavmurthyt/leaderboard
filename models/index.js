import sequelize from '../config/database.js';
import User from './user.js';
import Game from './game.js';
import Score from './score.js';

// Define associations
User.hasMany(Score, { foreignKey: 'userId', as: 'scores' });
Score.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Game.hasMany(Score, { foreignKey: 'gameId', as: 'scores' });
Score.belongsTo(Game, { foreignKey: 'gameId', as: 'game' });

export {
  sequelize,
  User,
  Game,
  Score
};

