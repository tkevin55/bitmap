import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import config from '../config';
import { AuthRequest } from './auth.middleware';
import logger from '../utils/logger';

// Ensure upload directory exists
if (!fs.existsSync(config.upload.uploadDir)) {
  fs.mkdirSync(config.upload.uploadDir, { recursive: true });
}

if (!fs.existsSync(config.upload.outputDir)) {
  fs.mkdirSync(config.upload.outputDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `upload-${uniqueSuffix}${ext}`);
  },
});

// File filter - validate file type
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PNG, JPG, and WebP are allowed.'));
  }
};

// Dynamic file size limit based on user tier
const getDynamicLimits = (req: AuthRequest): multer.Options['limits'] => {
  const isPro = req.user?.isPro || false;
  const maxSize = isPro ? config.upload.maxFileSizePro : config.upload.maxFileSizeFree;

  return {
    fileSize: maxSize,
    files: 1,
  };
};

// Create multer instance
const createUpload = (req: AuthRequest) =>
  multer({
    storage,
    fileFilter,
    limits: getDynamicLimits(req),
  });

/**
 * Middleware to handle file upload with dynamic size limits
 */
export const uploadMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const upload = createUpload(req).single('image');

  upload(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        const isPro = req.user?.isPro || false;
        const maxSizeMB = isPro ? 50 : 10;
        res.status(400).json({
          message: `File too large. Maximum size is ${maxSizeMB}MB for your tier.`,
          code: 'FILE_TOO_LARGE',
        });
        return;
      }
      res.status(400).json({ message: err.message });
      return;
    } else if (err) {
      res.status(400).json({ message: err.message });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    logger.info(`File uploaded: ${req.file.filename} (${req.file.size} bytes)`);
    next();
  });
};

/**
 * Validate uploaded file against magic numbers (prevents file extension spoofing)
 */
export const validateFileType = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ message: 'No file uploaded' });
    return;
  }

  try {
    const buffer = fs.readFileSync(req.file.path);
    const magicNumbers: { [key: string]: string[] } = {
      png: ['89504e47'],
      jpg: ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2'],
      webp: ['52494646'], // RIFF header
    };

    const fileHeader = buffer.toString('hex', 0, 4);

    let isValid = false;
    for (const type of Object.values(magicNumbers)) {
      if (type.some((magic) => fileHeader.startsWith(magic))) {
        isValid = true;
        break;
      }
    }

    if (!isValid) {
      // Clean up invalid file
      fs.unlinkSync(req.file.path);
      res.status(400).json({
        message: 'Invalid file format. File does not match declared type.',
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('File validation error:', error);
    res.status(500).json({ message: 'Error validating file' });
  }
};

/**
 * Clean up old temporary files
 */
export const cleanupTempFiles = () => {
  const directories = [config.upload.uploadDir, config.upload.outputDir];

  directories.forEach((dir) => {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);
    const now = Date.now();

    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      const age = (now - stats.mtimeMs) / 1000; // Age in seconds

      if (age > config.upload.tempFileTTL) {
        try {
          fs.unlinkSync(filePath);
          logger.debug(`Cleaned up old file: ${file}`);
        } catch (error) {
          logger.error(`Error deleting file ${file}:`, error);
        }
      }
    });
  });
};

// Schedule cleanup every hour
setInterval(cleanupTempFiles, 60 * 60 * 1000);
