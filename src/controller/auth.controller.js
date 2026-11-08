import { authService } from '../services/auth.service.js';
import { sendSuccess } from '../utils/response.js';
import { config } from '../config/env.js';

export class AuthController {
  /**
   * Register a new user account.
   */
  async register(req, res, next) {
    try {
      const { email, password, name } = req.body;
      const result = await authService.register({ email, password, name });

      // Set refresh token in HTTP-only cookie
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: config.env === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return sendSuccess(res, 'User registered successfully', result, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Log in an existing user.
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login({ email, password });

      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: config.env === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return sendSuccess(res, 'Login successful', result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Refresh access token using refresh token.
   */
  async refresh(req, res, next) {
    try {
      const token = req.body?.refreshToken || req.cookies?.refreshToken;
      const result = await authService.refresh(token);

      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: config.env === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return sendSuccess(res, 'Token refreshed successfully', result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Log out user and invalidate refresh token.
   */
  async logout(req, res, next) {
    try {
      const token = req.body?.refreshToken || req.cookies?.refreshToken;
      const userId = req.user?.id || null;

      await authService.logout(token, userId);

      res.clearCookie('refreshToken');
      return sendSuccess(res, 'Logout successful', { success: true });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get currently authenticated user profile.
   */
  async getMe(req, res, next) {
    try {
      const profile = await authService.getProfile(req.user.id);
      return sendSuccess(res, 'User profile retrieved', { user: profile });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Change current user's password.
   */
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(req.user.id, currentPassword, newPassword);

      res.clearCookie('refreshToken');
      return sendSuccess(res, 'Password changed successfully. Please log in again.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Fast verification endpoint to test if a token is active.
   */
  async verifyToken(req, res, next) {
    try {
      return sendSuccess(res, 'Token is valid', {
        valid: true,
        user: req.user
      });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
