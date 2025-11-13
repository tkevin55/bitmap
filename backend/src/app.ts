import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config';
import authRoutes from './routes/auth.routes';
import conversionRoutes from './routes/conversion.routes';
import paymentRoutes from './routes/payment.routes';
import userRoutes from './routes/user.routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware';
import { apiRateLimiter } from './middleware/rateLimit.middleware';
import logger from './utils/logger';

const app: Express = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);

// Body parsing middleware
// Note: webhook route uses raw body, so it's handled separately in payment routes
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Apply rate limiting to API routes
app.use('/api', apiRateLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/conversion', conversionRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/user', userRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Bitmap Pixelator API',
    version: '1.0.0',
    status: 'running',
    documentation: '/api/docs',
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
