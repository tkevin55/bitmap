import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import config from '../config';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export interface TokenPayload {
  userId: string;
  email: string;
  isPro: boolean;
}

export class AuthService {
  /**
   * Register a new user
   */
  async register(email: string, password: string, name?: string) {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new Error('User already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          credits: 5, // Free tier starts with 5 credits
        },
      });

      // Generate token
      const token = this.generateToken({
        userId: user.id,
        email: user.email,
        isPro: user.isPro,
      });

      logger.info(`User registered: ${email}`);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isPro: user.isPro,
          credits: user.credits,
          createdAt: user.createdAt.toISOString(),
        },
        token,
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(email: string, password: string) {
    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user || !user.password) {
        throw new Error('Invalid credentials');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Generate token
      const token = this.generateToken({
        userId: user.id,
        email: user.email,
        isPro: user.isPro,
      });

      logger.info(`User logged in: ${email}`);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isPro: user.isPro,
          credits: user.credits,
          createdAt: user.createdAt.toISOString(),
        },
        token,
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Generate JWT token
   */
  generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, config.jwt.secret) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isPro: user.isPro,
      credits: user.credits,
      createdAt: user.createdAt.toISOString(),
    };
  }

  /**
   * Deduct credits from user
   */
  async deductCredits(userId: string, amount: number = 1): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // PRO users have unlimited credits
    if (user.isPro) {
      return -1; // -1 indicates unlimited
    }

    if (user.credits < amount) {
      throw new Error('Insufficient credits');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        credits: {
          decrement: amount,
        },
      },
    });

    return updatedUser.credits;
  }

  /**
   * Check if user has sufficient credits
   */
  async hasCredits(userId: string, amount: number = 1): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return false;
    }

    // PRO users have unlimited credits
    if (user.isPro) {
      return true;
    }

    return user.credits >= amount;
  }

  /**
   * Upgrade user to PRO
   */
  async upgradeUserToPro(userId: string, stripeSubscriptionId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isPro: true,
        stripeSubscriptionId,
        subscriptionStatus: 'active',
      },
    });

    logger.info(`User upgraded to PRO: ${userId}`);
  }

  /**
   * Downgrade user from PRO
   */
  async downgradeUserFromPro(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isPro: false,
        subscriptionStatus: 'canceled',
        subscriptionEndsAt: new Date(),
      },
    });

    logger.info(`User downgraded from PRO: ${userId}`);
  }
}

export default new AuthService();
