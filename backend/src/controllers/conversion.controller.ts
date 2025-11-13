import { Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import imageProcessor from '../services/imageProcessor.service';
import svgGenerator from '../services/svgGenerator.service';
import authService from '../services/auth.service';
import { ConversionSettings, DitheringMethod } from '../../../shared/types';
import logger from '../utils/logger';
import config from '../config';

const prisma = new PrismaClient();

export class ConversionController {
  /**
   * Convert image to pixelated format
   */
  async convertImage(req: AuthRequest, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
      }

      const isPro = req.user?.isPro || false;

      // Parse settings from request body
      const settings: ConversionSettings = {
        size: parseInt(req.body.size) || 50,
        threshold: parseInt(req.body.threshold) || 128,
        mode: req.body.mode || 'bw',
        paletteSize: parseInt(req.body.paletteSize) || 16,
        dithering: (req.body.dithering || 'floyd-steinberg') as DitheringMethod,
        blur: parseInt(req.body.blur) || 0,
      };

      const format = (req.body.format || 'svg') as 'svg' | 'png' | 'jpg';
      const maxDimension = req.body.maxDimension ? parseInt(req.body.maxDimension) : undefined;

      // Validate settings
      if (settings.size < 10 || settings.size > 200) {
        res.status(400).json({ message: 'Size must be between 10 and 200' });
        return;
      }

      if (settings.threshold < 0 || settings.threshold > 255) {
        res.status(400).json({ message: 'Threshold must be between 0 and 255' });
        return;
      }

      // Check if color mode requires PRO
      if (settings.mode === 'color' && !isPro) {
        res.status(403).json({
          message: 'Color mode requires PRO subscription',
          code: 'PRO_REQUIRED',
        });
        return;
      }

      // Check if high-res export requires PRO
      if (maxDimension && maxDimension > 4096 && !isPro) {
        res.status(403).json({
          message: 'High-resolution export requires PRO subscription',
          code: 'PRO_REQUIRED',
        });
        return;
      }

      // Apply PRO limits for maxDimension
      const effectiveMaxDimension = maxDimension
        ? isPro
          ? Math.min(maxDimension, 10000)
          : Math.min(maxDimension, 4096)
        : undefined;

      logger.info('Processing conversion', {
        userId: req.user?.userId,
        settings,
        format,
        maxDimension: effectiveMaxDimension,
        fileSize: req.file.size,
      });

      // Process image
      const imageData = await imageProcessor.processImage(req.file.path, settings);

      // Generate output based on format
      const outputId = uuidv4();
      const outputFileName = `output-${outputId}.${format}`;
      const outputPath = path.join(config.upload.outputDir, outputFileName);

      if (format === 'svg') {
        await svgGenerator.generateSVG(imageData, settings, outputPath, effectiveMaxDimension);
      } else {
        await imageProcessor.generateRasterOutput(
          imageData,
          settings,
          format,
          outputPath,
          effectiveMaxDimension
        );
      }

      // Get output file size
      const outputStats = await fs.stat(outputPath);
      const outputSize = outputStats.size;

      // Deduct credits if user is authenticated and not PRO
      let creditsRemaining: number | undefined;
      if (req.user) {
        creditsRemaining = await authService.deductCredits(req.user.userId);
      }

      // Log conversion
      await prisma.conversion.create({
        data: {
          userId: req.user?.userId,
          originalName: req.file.originalname,
          format,
          mode: settings.mode,
          settings: settings as any,
          fileSize: req.file.size,
          outputSize,
          processingTime: Date.now() - startTime,
          ipAddress: req.ip,
        },
      });

      // Clean up input file
      await fs.unlink(req.file.path);

      const processingTime = Date.now() - startTime;

      logger.info(`Conversion completed in ${processingTime}ms`, {
        outputSize,
        format,
      });

      // For small files, send inline as base64
      if (outputSize < 1024 * 1024) {
        // < 1MB
        const fileData = await fs.readFile(outputPath, 'base64');
        await fs.unlink(outputPath); // Clean up immediately

        res.json({
          id: outputId,
          fileData: `data:${this.getMimeType(format)};base64,${fileData}`,
          fileName: outputFileName,
          fileSize: outputSize,
          processingTime,
          creditsRemaining,
        });
      } else {
        // For larger files, provide download URL
        res.json({
          id: outputId,
          downloadUrl: `/api/conversion/download/${outputId}`,
          fileName: outputFileName,
          fileSize: outputSize,
          processingTime,
          creditsRemaining,
        });
      }
    } catch (error: any) {
      logger.error('Conversion error:', error);

      // Clean up files
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (e) {
          // Ignore cleanup errors
        }
      }

      res.status(500).json({
        message: error.message || 'Error processing image',
        code: 'CONVERSION_ERROR',
      });
    }
  }

  /**
   * Download converted file
   */
  async downloadFile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Find files matching the ID
      const outputDir = config.upload.outputDir;
      const files = await fs.readdir(outputDir);
      const matchingFile = files.find((f) => f.includes(id));

      if (!matchingFile) {
        res.status(404).json({ message: 'File not found or expired' });
        return;
      }

      const filePath = path.join(outputDir, matchingFile);

      // Send file and delete after
      res.download(filePath, matchingFile, async (err) => {
        if (err) {
          logger.error('Download error:', err);
        } else {
          // Clean up file after successful download
          try {
            await fs.unlink(filePath);
            logger.debug(`Cleaned up downloaded file: ${matchingFile}`);
          } catch (e) {
            logger.error('Error cleaning up file:', e);
          }
        }
      });
    } catch (error) {
      logger.error('Download error:', error);
      res.status(500).json({ message: 'Error downloading file' });
    }
  }

  /**
   * Get conversion history for user
   */
  async getHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const [conversions, total] = await Promise.all([
        prisma.conversion.findMany({
          where: { userId: req.user.userId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip,
        }),
        prisma.conversion.count({
          where: { userId: req.user.userId },
        }),
      ]);

      res.json({
        conversions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Error fetching history:', error);
      res.status(500).json({ message: 'Error fetching conversion history' });
    }
  }

  /**
   * Get MIME type for format
   */
  private getMimeType(format: string): string {
    const mimeTypes: { [key: string]: string } = {
      svg: 'image/svg+xml',
      png: 'image/png',
      jpg: 'image/jpeg',
    };
    return mimeTypes[format] || 'application/octet-stream';
  }
}

export default new ConversionController();
