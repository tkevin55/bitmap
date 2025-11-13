import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import config from '../config';

export interface ApiError extends Error {
  status?: number;
  code?: string;
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // Default error status and message
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  const code = err.code || 'INTERNAL_ERROR';

  // Don't leak error details in production
  const response: any = {
    message,
    code,
  };

  if (config.nodeEnv !== 'production') {
    response.stack = err.stack;
  }

  res.status(status).json(response);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    message: 'Resource not found',
    code: 'NOT_FOUND',
    path: req.url,
  });
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
