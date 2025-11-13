import { Router } from 'express';
import conversionController from '../controllers/conversion.controller';
import { authenticate, optionalAuthenticate, checkCredits } from '../middleware/auth.middleware';
import { uploadMiddleware, validateFileType } from '../middleware/upload.middleware';
import { conversionRateLimiter } from '../middleware/rateLimit.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';

const router = Router();

// Convert image - requires authentication and credits check
router.post(
  '/convert',
  conversionRateLimiter,
  optionalAuthenticate,
  uploadMiddleware,
  validateFileType,
  checkCredits,
  asyncHandler(conversionController.convertImage.bind(conversionController))
);

// Download converted file
router.get(
  '/download/:id',
  asyncHandler(conversionController.downloadFile.bind(conversionController))
);

// Get conversion history (requires auth)
router.get(
  '/history',
  authenticate,
  asyncHandler(conversionController.getHistory.bind(conversionController))
);

export default router;
