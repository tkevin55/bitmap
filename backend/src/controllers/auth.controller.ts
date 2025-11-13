import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import authService from '../services/auth.service';
import { AuthRequest } from '../middleware/auth.middleware';
import logger from '../utils/logger';

export class AuthController {
  /**
   * Validation rules for registration
   */
  registerValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('name').optional().trim().isLength({ max: 100 }),
  ];

  /**
   * Validation rules for login
   */
  loginValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ];

  /**
   * Register new user
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password, name } = req.body;

      const result = await authService.register(email, password, name);

      res.status(201).json(result);
    } catch (error: any) {
      logger.error('Registration error:', error);

      if (error.message === 'User already exists') {
        res.status(409).json({ message: error.message });
        return;
      }

      res.status(500).json({ message: 'Registration failed' });
    }
  }

  /**
   * Login user
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password } = req.body;

      const result = await authService.login(email, password);

      res.json(result);
    } catch (error: any) {
      logger.error('Login error:', error);

      if (error.message === 'Invalid credentials') {
        res.status(401).json({ message: error.message });
        return;
      }

      res.status(500).json({ message: 'Login failed' });
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Not authenticated' });
        return;
      }

      const user = await authService.getUserById(req.user.userId);
      res.json({ user });
    } catch (error) {
      logger.error('Error getting current user:', error);
      res.status(500).json({ message: 'Error fetching user' });
    }
  }

  /**
   * Verify token (for client-side validation)
   */
  async verifyToken(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ valid: false });
        return;
      }

      res.json({ valid: true, user: req.user });
    } catch (error) {
      res.status(401).json({ valid: false });
    }
  }

  /**
   * Logout (client-side token removal, but we can log it)
   */
  async logout(req: AuthRequest, res: Response): Promise<void> {
    if (req.user) {
      logger.info(`User logged out: ${req.user.email}`);
    }
    res.json({ message: 'Logged out successfully' });
  }
}

export default new AuthController();
