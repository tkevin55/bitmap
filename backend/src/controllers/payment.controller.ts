import { Request, Response } from 'express';
import Stripe from 'stripe';
import stripeService from '../services/stripe.service';
import { AuthRequest } from '../middleware/auth.middleware';
import config from '../config';
import logger from '../utils/logger';

const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2024-11-20.acacia',
});

export class PaymentController {
  /**
   * Create checkout session for PRO upgrade
   */
  async createCheckoutSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const { priceId, successUrl, cancelUrl } = req.body;

      if (!priceId || !successUrl || !cancelUrl) {
        res.status(400).json({ message: 'Missing required fields' });
        return;
      }

      // Validate price ID
      const validPriceIds = [
        config.stripe.priceIdMonthly,
        config.stripe.priceIdYearly,
      ];

      if (!validPriceIds.includes(priceId)) {
        res.status(400).json({ message: 'Invalid price ID' });
        return;
      }

      const session = await stripeService.createCheckoutSession(
        req.user.userId,
        priceId,
        successUrl,
        cancelUrl
      );

      res.json({
        sessionId: session.id,
        url: session.url,
      });
    } catch (error) {
      logger.error('Error creating checkout session:', error);
      res.status(500).json({ message: 'Error creating checkout session' });
    }
  }

  /**
   * Create billing portal session
   */
  async createBillingPortalSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const { returnUrl } = req.body;

      if (!returnUrl) {
        res.status(400).json({ message: 'Return URL is required' });
        return;
      }

      const session = await stripeService.createBillingPortalSession(
        req.user.userId,
        returnUrl
      );

      res.json({
        url: session.url,
      });
    } catch (error: any) {
      logger.error('Error creating billing portal session:', error);
      res.status(500).json({ message: error.message || 'Error creating billing portal session' });
    }
  }

  /**
   * Handle Stripe webhooks
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      res.status(400).json({ message: 'Missing stripe signature' });
      return;
    }

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        config.stripe.webhookSecret
      );

      logger.info(`Received webhook: ${event.type}`);

      await stripeService.handleWebhook(event);

      res.json({ received: true });
    } catch (error: any) {
      logger.error('Webhook error:', error);
      res.status(400).json({ message: `Webhook Error: ${error.message}` });
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      await stripeService.cancelSubscription(req.user.userId);

      res.json({ message: 'Subscription canceled successfully' });
    } catch (error: any) {
      logger.error('Error canceling subscription:', error);
      res.status(500).json({ message: error.message || 'Error canceling subscription' });
    }
  }

  /**
   * Get pricing plans
   */
  async getPricingPlans(req: Request, res: Response): Promise<void> {
    try {
      const plans = [
        {
          id: 'free',
          name: 'Free',
          price: 0,
          interval: 'month',
          features: [
            '5 downloads per month',
            'Black & white mode',
            'Up to 10MB file size',
            'SVG, PNG, JPG export',
          ],
        },
        {
          id: 'pro-monthly',
          name: 'PRO Monthly',
          price: 9.99,
          interval: 'month',
          priceId: config.stripe.priceIdMonthly,
          features: [
            'Unlimited downloads',
            'Full color mode',
            'Advanced dithering',
            'Up to 50MB file size',
            'High-res export (10,000px)',
            'Priority processing',
          ],
        },
        {
          id: 'pro-yearly',
          name: 'PRO Yearly',
          price: 59.99,
          interval: 'year',
          priceId: config.stripe.priceIdYearly,
          features: [
            'All PRO features',
            'Save 50%',
            'Unlimited downloads',
            'Full color mode',
            'Advanced dithering',
            'Up to 50MB file size',
            'High-res export (10,000px)',
            'Priority processing',
          ],
        },
      ];

      res.json({ plans });
    } catch (error) {
      logger.error('Error fetching pricing plans:', error);
      res.status(500).json({ message: 'Error fetching pricing plans' });
    }
  }
}

export default new PaymentController();
