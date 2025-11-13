import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import logger from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    isPro: boolean;
  };
}

/**
 * Authenticate user via JWT token
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const token = authHeader.substring(7);
    const payload = authService.verifyToken(token);

    req.user = payload;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Optional authentication - sets user if token is valid, but continues if not
 */
export const optionalAuthenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = authService.verifyToken(token);
      req.user = payload;
    }

    next();
  } catch (error) {
    // Token is invalid, but we continue without user
    next();
  }
};

/**
 * Check if user is PRO
 */
export const requirePro = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  if (!req.user.isPro) {
    res.status(403).json({
      message: 'PRO subscription required',
      code: 'PRO_REQUIRED',
    });
    return;
  }

  next();
};

/**
 * Check if user has credits (for free tier users)
 */
export const checkCredits = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  try {
    const hasCredits = await authService.hasCredits(req.user.userId);

    if (!hasCredits) {
      res.status(403).json({
        message: 'Insufficient credits. Please upgrade to PRO or wait for next month.',
        code: 'INSUFFICIENT_CREDITS',
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Error checking credits:', error);
    res.status(500).json({ message: 'Error checking credits' });
  }
};
