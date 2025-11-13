import { Router } from 'express';
import { raw } from 'express';
import paymentController from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';

const router = Router();

// Get pricing plans (public)
router.get(
  '/plans',
  asyncHandler(paymentController.getPricingPlans.bind(paymentController))
);

// Create checkout session (requires auth)
router.post(
  '/create-checkout-session',
  authenticate,
  asyncHandler(paymentController.createCheckoutSession.bind(paymentController))
);

// Create billing portal session (requires auth)
router.post(
  '/create-billing-portal-session',
  authenticate,
  asyncHandler(paymentController.createBillingPortalSession.bind(paymentController))
);

// Cancel subscription (requires auth)
router.post(
  '/cancel-subscription',
  authenticate,
  asyncHandler(paymentController.cancelSubscription.bind(paymentController))
);

// Webhook (raw body needed for signature verification)
router.post(
  '/webhook',
  raw({ type: 'application/json' }),
  asyncHandler(paymentController.handleWebhook.bind(paymentController))
);

export default router;
