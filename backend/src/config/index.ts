import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  frontendUrl: string;
  databaseUrl: string;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  stripe: {
    secretKey: string;
    webhookSecret: string;
    priceIdMonthly: string;
    priceIdYearly: string;
  };
  upload: {
    maxFileSizeFree: number;
    maxFileSizePro: number;
    uploadDir: string;
    outputDir: string;
    tempFileTTL: number;
  };
  rateLimit: {
    windowMs: number;
    maxFree: number;
    maxPro: number;
  };
  google?: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  };
}

const config: Config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || '',
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    priceIdMonthly: process.env.STRIPE_PRICE_ID_MONTHLY || '',
    priceIdYearly: process.env.STRIPE_PRICE_ID_YEARLY || '',
  },
  upload: {
    maxFileSizeFree: parseInt(process.env.MAX_FILE_SIZE_FREE || '10485760', 10),
    maxFileSizePro: parseInt(process.env.MAX_FILE_SIZE_PRO || '52428800', 10),
    uploadDir: path.join(__dirname, '../../uploads'),
    outputDir: path.join(__dirname, '../../output'),
    tempFileTTL: parseInt(process.env.TEMP_FILE_TTL || '3600', 10),
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxFree: parseInt(process.env.RATE_LIMIT_MAX_FREE || '10', 10),
    maxPro: parseInt(process.env.RATE_LIMIT_MAX_PRO || '100', 10),
  },
};

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  config.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
  };
}

export default config;
