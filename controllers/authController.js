import { User } from '../models/index.js';
import { generateToken } from '../middleware/auth.js';
import ApiError from '../utils/apiError.js';

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        email
      }
    });

    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists');
    }

    // Check if username is taken
    const existingUsername = await User.findOne({
      where: {
        username
      }
    });

    if (existingUsername) {
      throw new ApiError(400, 'Username is already taken');
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password
    });

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.toJSON(),
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({
      where: {
        email
      }
    });

    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ApiError(401, 'Your account has been deactivated');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Generate token
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
export const getMe = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user.toJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 * PUT /api/auth/me
 */
export const updateMe = async (req, res, next) => {
  try {
    const { username } = req.body;

    if (username) {
      // Check if username is taken by another user
      const existingUsername = await User.findOne({
        where: {
          username
        }
      });

      if (existingUsername && existingUsername.id !== req.user.id) {
        throw new ApiError(400, 'Username is already taken');
      }

      req.user.username = username;
    }

    await req.user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: req.user.toJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};

export default {
  register,
  login,
  getMe,
  updateMe
};

