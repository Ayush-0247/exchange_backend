import { db } from '../config/db.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.js';
import { ApiError } from '../utils/response.js';

function sanitizeUser(user) {
  if (!user) return null;
  const { password: _, ...clean } = user;
  return clean;
}

export class AuthService {
  /**
   * Registers a new user.
   */
  async register({ email, password, name = '' }) {
    const existing = await db.findUserByEmail(email);
    if (existing) {
      throw new ApiError(409, 'User with this email already exists');
    }

    const hashedPassword = await hashPassword(password);
    const user = await db.createUser({
      email,
      password: hashedPassword,
      name,
      role: 'user'
    });

    const tokens = generateTokens(user);

    // Persist refresh token
    const decoded = verifyRefreshToken(tokens.refreshToken);
    const expiresAt = new Date(decoded.exp * 1000);
    await db.saveRefreshToken({
      token: tokens.refreshToken,
      userId: user.id,
      expiresAt
    });

    return {
      user: sanitizeUser(user),
      tokens
    };
  }

  /**
   * Authenticates user with email & password.
   */
  async login({ email, password }) {
    const user = await db.findUserByEmail(email);
    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const tokens = generateTokens(user);

    // Persist refresh token
    const decoded = verifyRefreshToken(tokens.refreshToken);
    const expiresAt = new Date(decoded.exp * 1000);
    await db.saveRefreshToken({
      token: tokens.refreshToken,
      userId: user.id,
      expiresAt
    });

    return {
      user: sanitizeUser(user),
      tokens
    };
  }

  /**
   * Exchanges an active refresh token for a new token pair (refresh token rotation).
   */
  async refresh(refreshToken) {
    if (!refreshToken) {
      throw new ApiError(400, 'Refresh token is required');
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new ApiError(401, 'Refresh token has expired. Please log in again.');
      }
      throw new ApiError(401, 'Invalid refresh token.');
    }

    // Verify token exists in database (detect reuse or revoked tokens)
    const stored = await db.findRefreshToken(refreshToken);
    if (!stored || stored.userId !== decoded.userId) {
      throw new ApiError(401, 'Refresh token is invalid or has been revoked');
    }

    const user = await db.findUserById(decoded.userId);
    if (!user) {
      throw new ApiError(401, 'User no longer exists');
    }

    // Delete old refresh token (rotation)
    await db.deleteRefreshToken(refreshToken);

    // Issue new pair
    const tokens = generateTokens(user);
    const newDecoded = verifyRefreshToken(tokens.refreshToken);
    const expiresAt = new Date(newDecoded.exp * 1000);

    await db.saveRefreshToken({
      token: tokens.refreshToken,
      userId: user.id,
      expiresAt
    });

    return {
      tokens,
      user: sanitizeUser(user)
    };
  }

  /**
   * Logs out user by revoking their refresh token.
   */
  async logout(refreshToken, userId = null) {
    if (refreshToken) {
      await db.deleteRefreshToken(refreshToken);
    }
    if (userId) {
      await db.deleteUserRefreshTokens(userId);
    }
    return { success: true };
  }

  /**
   * Retrieves user profile by ID.
   */
  async getProfile(userId) {
    const user = await db.findUserById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    return sanitizeUser(user);
  }

  /**
   * Changes password for an authenticated user.
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await db.findUserById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) {
      throw new ApiError(400, 'Current password does not match');
    }

    const hashedPassword = await hashPassword(newPassword);
    await db.updateUser(userId, { password: hashedPassword });

    // Revoke all existing sessions to enforce security
    await db.deleteUserRefreshTokens(userId);

    return { success: true };
  }
}

export const authService = new AuthService();
