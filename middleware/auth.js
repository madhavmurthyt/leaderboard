import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import ApiError from '../utils/apiError.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

export const verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Access denied. No token provided.');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Find user
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      throw new ApiError(401, 'User not found. Token is invalid.');
    }

    if (!user.isActive) {
      throw new ApiError(401, 'User account is deactivated.');
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new ApiError(401, 'Invalid token.'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Token has expired.'));
    }
    next(error);
  }
};

export default { generateToken, verifyToken };

