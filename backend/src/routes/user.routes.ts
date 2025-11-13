import { Router } from 'express';
import userController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Get user profile
router.get(
  '/profile',
  asyncHandler(userController.getProfile.bind(userController))
);

// Update user profile
router.put(
  '/profile',
  asyncHandler(userController.updateProfile.bind(userController))
);

// Get user statistics
router.get(
  '/statistics',
  asyncHandler(userController.getStatistics.bind(userController))
);

// Delete user account
router.delete(
  '/account',
  asyncHandler(userController.deleteAccount.bind(userController))
);

export default router;
