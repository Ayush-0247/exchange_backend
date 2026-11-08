/**
 * Standard HTTP API error representation.
 */
export class ApiError extends Error {
  constructor(statusCode, message, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = 'ApiError';
  }
}

/**
 * Standard response sender for successful API operations.
 */
export function sendSuccess(res, message, data = null, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}

/**
 * Standard response sender for error API operations.
 */
export function sendError(res, message, statusCode = 500, errors = null) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors: errors || undefined
  });
}
