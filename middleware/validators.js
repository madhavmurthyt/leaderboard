import { body, param, query, validationResult } from 'express-validator';
import ApiError from '../utils/apiError.js';

// Handle validation results
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join(', ');
    return next(new ApiError(400, errorMessages));
  }
  next();
};

// User registration validation
export const registerValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidationErrors
];

// User login validation
export const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),
  body('password')
    .notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

// Score submission validation
export const scoreValidation = [
  body('gameId')
    .notEmpty().withMessage('Game ID is required')
    .isUUID().withMessage('Invalid game ID format'),
  body('score')
    .notEmpty().withMessage('Score is required')
    .isInt({ min: 0 }).withMessage('Score must be a non-negative integer'),
  body('metadata')
    .optional()
    .isObject().withMessage('Metadata must be an object'),
  handleValidationErrors
];

// Game ID parameter validation
export const gameIdValidation = [
  param('gameId')
    .isUUID().withMessage('Invalid game ID format'),
  handleValidationErrors
];

// Leaderboard query validation
export const leaderboardQueryValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 }).withMessage('Offset must be a non-negative integer'),
  handleValidationErrors
];

// Top players report validation
export const topPlayersReportValidation = [
  query('period')
    .optional()
    .isIn(['day', 'week', 'month', 'year', 'all']).withMessage('Period must be one of: day, week, month, year, all'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

// Game creation validation
export const gameValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Game name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Game name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .isString().withMessage('Description must be a string'),
  body('maxScore')
    .optional()
    .isInt({ min: 1 }).withMessage('Max score must be a positive integer'),
  handleValidationErrors
];

export default {
  registerValidation,
  loginValidation,
  scoreValidation,
  gameIdValidation,
  leaderboardQueryValidation,
  topPlayersReportValidation,
  gameValidation,
  handleValidationErrors
};

