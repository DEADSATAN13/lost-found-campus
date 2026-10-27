import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Protect middleware:
 * - Decodes JWT from Authorization Bearer header
 * - Reloads the user fresh from the database on every request
 * - Ensures deleted users or revoked privileges stop working immediately
 */
export async function protect(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Authentication required. No token provided.' });
    }

    // Verify token validity and signature
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }

    // Fresh lookup from DB to guarantee current role and user existence
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User account no longer exists.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Error in protect middleware:', error);
    return res.status(500).json({ message: 'Authentication failure.' });
  }
}

/**
 * Optional authentication middleware:
 * - If token is provided and valid, attaches user to req.user
 * - If no token or invalid token, sets req.user to null and continues
 */
export async function optionalAuth(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      req.user = user || null;
    } catch {
      req.user = null;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
}

/**
 * Admin authorization check:
 * - Must be placed after protect
 * - Rejects non-admin users with 403
 */
export function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  next();
}
