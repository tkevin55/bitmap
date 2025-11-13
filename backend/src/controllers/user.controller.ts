import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export class UserController {
  /**
   * Get user profile
   */
  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
          id: true,
          email: true,
          name: true,
          isPro: true,
          credits: true,
          subscriptionStatus: true,
          createdAt: true,
          _count: {
            select: { conversions: true },
          },
        },
      });

      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.json({
        user: {
          ...user,
          totalConversions: user._count.conversions,
        },
      });
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      res.status(500).json({ message: 'Error fetching profile' });
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const { name } = req.body;

      if (!name || name.trim().length === 0) {
        res.status(400).json({ message: 'Name cannot be empty' });
        return;
      }

      const user = await prisma.user.update({
        where: { id: req.user.userId },
        data: { name: name.trim() },
        select: {
          id: true,
          email: true,
          name: true,
          isPro: true,
          credits: true,
        },
      });

      res.json({ user });
    } catch (error) {
      logger.error('Error updating profile:', error);
      res.status(500).json({ message: 'Error updating profile' });
    }
  }

  /**
   * Get user statistics
   */
  async getStatistics(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const [totalConversions, recentConversions, formatBreakdown] = await Promise.all([
        prisma.conversion.count({
          where: { userId: req.user.userId },
        }),
        prisma.conversion.count({
          where: {
            userId: req.user.userId,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        }),
        prisma.conversion.groupBy({
          by: ['format'],
          where: { userId: req.user.userId },
          _count: true,
        }),
      ]);

      res.json({
        statistics: {
          totalConversions,
          recentConversions,
          formatBreakdown: formatBreakdown.reduce(
            (acc, item) => {
              acc[item.format] = item._count;
              return acc;
            },
            {} as Record<string, number>
          ),
        },
      });
    } catch (error) {
      logger.error('Error fetching statistics:', error);
      res.status(500).json({ message: 'Error fetching statistics' });
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const { password } = req.body;

      if (!password) {
        res.status(400).json({ message: 'Password confirmation required' });
        return;
      }

      // Verify password before deletion
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
      });

      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      // TODO: Verify password with bcrypt

      // Delete user and all related data (cascade)
      await prisma.user.delete({
        where: { id: req.user.userId },
      });

      logger.info(`User account deleted: ${req.user.userId}`);

      res.json({ message: 'Account deleted successfully' });
    } catch (error) {
      logger.error('Error deleting account:', error);
      res.status(500).json({ message: 'Error deleting account' });
    }
  }
}

export default new UserController();
