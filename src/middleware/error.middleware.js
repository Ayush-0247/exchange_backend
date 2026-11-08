import { ApiError, sendError } from '../utils/response.js';

/**
 * Global Express error handling middleware.
 */
export function errorHandler(err, req, res, _next) {
  // If headers already sent, delegate to default Express handler
  if (res.headersSent) {
    return _next(err);
  }

  // Handle custom ApiError
  if (err instanceof ApiError) {
    return sendError(res, err.message, err.statusCode, err.errors);
  }

  // Handle JSON parse syntax error in body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, 'Malformed JSON payload in request body', 400);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token provided', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Token has expired', 401);
  }

  // Fallback for unhandled unexpected server errors
  console.error('[Unhandled Error]', err);
  return sendError(res, 'Internal server error', 500);
}

/**
 * 404 Not Found middleware.
 */
export function notFoundHandler(req, res, _next) {
  return sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}
