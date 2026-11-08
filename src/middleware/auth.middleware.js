import { verifyAccessToken } from '../utils/jwt.js';
import { ApiError } from '../utils/response.js';
import { db } from '../config/db.js';

/**
 * Middleware to authenticate requests using JWT Bearer tokens or cookies.
 */
export async function authenticate(req, res, next) {
  try {
    let token = null;

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new ApiError(401, 'Authentication token missing. Please log in.');
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new ApiError(401, 'Token has expired. Please refresh your session.');
      }
      throw new ApiError(401, 'Invalid authentication token.');
    }

    // Retrieve user
    const user = await db.findUserById(decoded.userId);
    if (!user) {
      throw new ApiError(401, 'User associated with this token no longer exists.');
    }

    // Attach user to request without password
    const { password: _, ...userWithoutPassword } = user;
    req.user = userWithoutPassword;
    req.token = token;

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Optional authentication: attaches user if token is valid, continues as guest otherwise.
 */
export async function optionalAuth(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        const user = await db.findUserById(decoded.userId);
        if (user) {
          const { password: _, ...userWithoutPassword } = user;
          req.user = userWithoutPassword;
        }
      } catch {
        // Ignored for optional auth
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}
