import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Generates an access token for an authenticated user.
 * @param {object} payload 
 * @returns {string}
 */
export function generateAccessToken(payload) {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn
  });
}

/**
 * Generates a refresh token for an authenticated user.
 * @param {object} payload 
 * @returns {string}
 */
export function generateRefreshToken(payload) {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn
  });
}

/**
 * Generates both access and refresh tokens.
 * @param {object} payload 
 * @returns {{ accessToken: string, refreshToken: string, expiresIn: string }}
 */
export function generateTokens(payload) {
  const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const tokenPayload = {
    userId: payload.id || payload.userId,
    email: payload.email,
    role: payload.role || 'user',
    jti: nonce
  };

  return {
    accessToken: generateAccessToken(tokenPayload),
    refreshToken: generateRefreshToken(tokenPayload),
    expiresIn: config.jwt.accessExpiresIn
  };
}

/**
 * Verifies and decodes an access token.
 * @param {string} token 
 * @returns {object}
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

/**
 * Verifies and decodes a refresh token.
 * @param {string} token 
 * @returns {object}
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}

/**
 * Decodes a token without signature verification (useful for inspecting claims).
 * @param {string} token 
 * @returns {object|null}
 */
export function decodeToken(token) {
  return jwt.decode(token);
}
