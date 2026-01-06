import express from 'express';
import { register, login, getMe, updateMe } from '../controllers/authController.js';
import { verifyToken } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { registerValidation, loginValidation } from '../middleware/validators.js';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authLimiter, registerValidation, register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authLimiter, loginValidation, login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', verifyToken, getMe);

/**
 * @route   PUT /api/auth/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/me', verifyToken, updateMe);

export default router;

