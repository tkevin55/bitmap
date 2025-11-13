import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import config from '../config';
import { AuthRequest } from './auth.middleware';

/**
 * Rate limiter with different limits for free and PRO users
 */
export const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: (req: Request) => {
    const authReq = req as AuthRequest;
    return authReq.user?.isPro ? config.rateLimit.maxPro : config.rateLimit.maxFree;
  },
  message: (req: Request) => {
    const authReq = req as AuthRequest;
    const isPro = authReq.user?.isPro || false;
    return {
      message: `Too many requests. ${
        isPro ? 'PRO limit' : 'Free tier limit'
      } exceeded. Please try again later.`,
      code: 'RATE_LIMIT_EXCEEDED',
    };
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for certain endpoints
    return req.path.includes('/health') || req.path.includes('/webhook');
  },
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    // Use user ID if authenticated, otherwise use IP
    return authReq.user?.userId || req.ip || 'unknown';
  },
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: {
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.ip || 'unknown';
  },
});

/**
 * Rate limiter for conversion endpoint (more strict)
 */
export const conversionRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: (req: Request) => {
    const authReq = req as AuthRequest;
    return authReq.user?.isPro ? 50 : 5; // 50 for PRO, 5 for free
  },
  message: (req: Request) => {
    const authReq = req as AuthRequest;
    const isPro = authReq.user?.isPro || false;
    const limit = isPro ? 50 : 5;
    return {
      message: `Conversion limit exceeded. You can process ${limit} images per hour on your tier.`,
      code: 'CONVERSION_RATE_LIMIT_EXCEEDED',
    };
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    return authReq.user?.userId || req.ip || 'unknown';
  },
});
