import { Router } from 'express';
import authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimit.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';

const router = Router();

// Apply rate limiting to auth routes
router.use(authRateLimiter);

// Public routes
router.post(
  '/register',
  authController.registerValidation,
  asyncHandler(authController.register.bind(authController))
);

router.post(
  '/login',
  authController.loginValidation,
  asyncHandler(authController.login.bind(authController))
);

// Protected routes
router.get(
  '/me',
  authenticate,
  asyncHandler(authController.getCurrentUser.bind(authController))
);

router.post(
  '/verify',
  authenticate,
  asyncHandler(authController.verifyToken.bind(authController))
);

router.post(
  '/logout',
  authenticate,
  asyncHandler(authController.logout.bind(authController))
);

export default router;
