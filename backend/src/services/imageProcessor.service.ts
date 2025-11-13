import sharp from 'sharp';
import { ConversionSettings } from '../../../shared/types';
import logger from '../utils/logger';

export interface ProcessedImageData {
  width: number;
  height: number;
  pixelGrid: PixelData[][];
  palette?: string[];
}

export interface PixelData {
  r: number;
  g: number;
  b: number;
  hex: string;
}

export class ImageProcessorService {
  /**
   * Process an image into a pixelated grid
   */
  async processImage(
    inputPath: string,
    settings: ConversionSettings
  ): Promise<ProcessedImageData> {
    const startTime = Date.now();
    logger.info(`Processing image: ${inputPath}`, { settings });

    try {
      // Load and get metadata
      const image = sharp(inputPath);
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        throw new Error('Unable to read image dimensions');
      }

      // Calculate grid dimensions
      const gridWidth = Math.ceil(metadata.width / settings.pixelSize);
      const gridHeight = Math.ceil(metadata.height / settings.pixelSize);

      logger.debug(`Grid dimensions: ${gridWidth}x${gridHeight}`);

      // Resize image to grid dimensions (downsampling)
      const resized = await image
        .resize(gridWidth, gridHeight, {
          kernel: sharp.kernel.nearest,
          fit: 'fill',
        })
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Extract pixel data
      const { data, info } = resized;
      const pixelGrid: PixelData[][] = [];

      for (let y = 0; y < info.height; y++) {
        const row: PixelData[] = [];
        for (let x = 0; x < info.width; x++) {
          const idx = (y * info.width + x) * info.channels;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          let pixelData: PixelData;

          if (settings.mode === 'bw') {
            // Black & white mode: apply threshold
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            const value = gray >= settings.threshold ? 255 : 0;
            pixelData = {
              r: value,
              g: value,
              b: value,
              hex: value === 255 ? '#ffffff' : '#000000',
            };
          } else {
            // Color mode: use original colors (palette reduction happens later)
            pixelData = {
              r,
              g,
              b,
              hex: this.rgbToHex(r, g, b),
            };
          }

          row.push(pixelData);
        }
        pixelGrid.push(row);
      }

      let palette: string[] | undefined;

      if (settings.mode === 'color') {
        // Extract palette and apply dithering
        const result = await this.applyColorProcessing(
          pixelGrid,
          settings
        );
        palette = result.palette;
      }

      const processingTime = Date.now() - startTime;
      logger.info(`Image processed in ${processingTime}ms`);

      return {
        width: metadata.width,
        height: metadata.height,
        pixelGrid,
        palette,
      };
    } catch (error) {
      logger.error('Error processing image:', error);
      throw new Error(`Image processing failed: ${error}`);
    }
  }

  /**
   * Apply color palette reduction and dithering
   */
  private async applyColorProcessing(
    pixelGrid: PixelData[][],
    settings: ConversionSettings
  ): Promise<{ pixelGrid: PixelData[][]; palette: string[] }> {
    const paletteSize = settings.paletteSize || 16;
    const dithering = settings.dithering || 'none';

    // Extract palette using median cut algorithm or use custom palette
    let palette: string[];
    if (settings.customPalette && settings.customPalette.length > 0) {
      palette = settings.customPalette;
    } else {
      palette = this.extractPalette(pixelGrid, paletteSize);
    }

    // Apply dithering
    if (dithering !== 'none') {
      pixelGrid = this.applyDithering(pixelGrid, palette, dithering);
    } else {
      // Just snap to nearest color
      pixelGrid = this.snapTopalette(pixelGrid, palette);
    }

    return { pixelGrid, palette };
  }

  /**
   * Extract color palette using median cut algorithm
   */
  private extractPalette(pixelGrid: PixelData[][], size: number): string[] {
    // Collect all unique colors
    const colorMap = new Map<string, { r: number; g: number; b: number; count: number }>();

    for (const row of pixelGrid) {
      for (const pixel of row) {
        const key = pixel.hex;
        const existing = colorMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          colorMap.set(key, { r: pixel.r, g: pixel.g, b: pixel.b, count: 1 });
        }
      }
    }

    // Simple palette extraction: take most common colors
    const sortedColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, size);

    return sortedColors.map(([hex]) => hex);
  }

  /**
   * Snap pixels to nearest palette color
   */
  private snapTopalette(pixelGrid: PixelData[][], palette: string[]): PixelData[][] {
    const paletteRGB = palette.map((hex) => this.hexToRgb(hex));

    return pixelGrid.map((row) =>
      row.map((pixel) => {
        const nearest = this.findNearestColor(pixel, paletteRGB);
        return {
          ...nearest,
          hex: this.rgbToHex(nearest.r, nearest.g, nearest.b),
        };
      })
    );
  }

  /**
   * Apply Floyd-Steinberg dithering
   */
  private applyDithering(
    pixelGrid: PixelData[][],
    palette: string[],
    algorithm: string
  ): PixelData[][] {
    const paletteRGB = palette.map((hex) => this.hexToRgb(hex));
    const height = pixelGrid.length;
    const width = pixelGrid[0].length;

    // Create a working copy
    const workingGrid = pixelGrid.map((row) =>
      row.map((p) => ({ r: p.r, g: p.g, b: p.b }))
    );

    if (algorithm === 'floyd-steinberg') {
      // Floyd-Steinberg dithering
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const oldPixel = workingGrid[y][x];
          const newPixel = this.findNearestColor(oldPixel, paletteRGB);

          workingGrid[y][x] = newPixel;

          const errR = oldPixel.r - newPixel.r;
          const errG = oldPixel.g - newPixel.g;
          const errB = oldPixel.b - newPixel.b;

          // Distribute error to neighboring pixels
          if (x + 1 < width) {
            workingGrid[y][x + 1].r += (errR * 7) / 16;
            workingGrid[y][x + 1].g += (errG * 7) / 16;
            workingGrid[y][x + 1].b += (errB * 7) / 16;
          }
          if (y + 1 < height) {
            if (x > 0) {
              workingGrid[y + 1][x - 1].r += (errR * 3) / 16;
              workingGrid[y + 1][x - 1].g += (errG * 3) / 16;
              workingGrid[y + 1][x - 1].b += (errB * 3) / 16;
            }
            workingGrid[y + 1][x].r += (errR * 5) / 16;
            workingGrid[y + 1][x].g += (errG * 5) / 16;
            workingGrid[y + 1][x].b += (errB * 5) / 16;
            if (x + 1 < width) {
              workingGrid[y + 1][x + 1].r += (errR * 1) / 16;
              workingGrid[y + 1][x + 1].g += (errG * 1) / 16;
              workingGrid[y + 1][x + 1].b += (errB * 1) / 16;
            }
          }
        }
      }
    } else if (algorithm === 'atkinson') {
      // Atkinson dithering
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const oldPixel = workingGrid[y][x];
          const newPixel = this.findNearestColor(oldPixel, paletteRGB);

          workingGrid[y][x] = newPixel;

          const errR = (oldPixel.r - newPixel.r) / 8;
          const errG = (oldPixel.g - newPixel.g) / 8;
          const errB = (oldPixel.b - newPixel.b) / 8;

          // Atkinson dithering pattern
          const distributeError = (dx: number, dy: number) => {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              workingGrid[ny][nx].r += errR;
              workingGrid[ny][nx].g += errG;
              workingGrid[ny][nx].b += errB;
            }
          };

          distributeError(1, 0);
          distributeError(2, 0);
          distributeError(-1, 1);
          distributeError(0, 1);
          distributeError(1, 1);
          distributeError(0, 2);
        }
      }
    }

    // Clamp values and convert back to PixelData
    return workingGrid.map((row) =>
      row.map((p) => {
        const r = Math.max(0, Math.min(255, Math.round(p.r)));
        const g = Math.max(0, Math.min(255, Math.round(p.g)));
        const b = Math.max(0, Math.min(255, Math.round(p.b)));
        return {
          r,
          g,
          b,
          hex: this.rgbToHex(r, g, b),
        };
      })
    );
  }

  /**
   * Find nearest color in palette
   */
  private findNearestColor(
    pixel: { r: number; g: number; b: number },
    palette: Array<{ r: number; g: number; b: number }>
  ): { r: number; g: number; b: number } {
    let minDistance = Infinity;
    let nearest = palette[0];

    for (const color of palette) {
      const distance =
        Math.pow(pixel.r - color.r, 2) +
        Math.pow(pixel.g - color.g, 2) +
        Math.pow(pixel.b - color.b, 2);

      if (distance < minDistance) {
        minDistance = distance;
        nearest = color;
      }
    }

    return nearest;
  }

  /**
   * Convert RGB to hex
   */
  private rgbToHex(r: number, g: number, b: number): string {
    return (
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = Math.round(x).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('')
    );
  }

  /**
   * Convert hex to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  /**
   * Generate a high-resolution PNG/JPG from pixel grid
   */
  async generateRasterOutput(
    pixelGrid: PixelData[][],
    settings: ConversionSettings,
    format: 'png' | 'jpg',
    outputPath: string
  ): Promise<void> {
    const gridHeight = pixelGrid.length;
    const gridWidth = pixelGrid[0].length;
    const outputWidth = gridWidth * settings.pixelSize;
    const outputHeight = gridHeight * settings.pixelSize;

    logger.info(`Generating ${format.toUpperCase()} output: ${outputWidth}x${outputHeight}`);

    // Create a buffer for the output image
    const channels = 3;
    const buffer = Buffer.alloc(outputWidth * outputHeight * channels);

    for (let gy = 0; gy < gridHeight; gy++) {
      for (let gx = 0; gx < gridWidth; gx++) {
        const pixel = pixelGrid[gy][gx];

        // Fill the pixel block
        for (let py = 0; py < settings.pixelSize; py++) {
          for (let px = 0; px < settings.pixelSize; px++) {
            const y = gy * settings.pixelSize + py;
            const x = gx * settings.pixelSize + px;

            if (y < outputHeight && x < outputWidth) {
              const idx = (y * outputWidth + x) * channels;
              buffer[idx] = pixel.r;
              buffer[idx + 1] = pixel.g;
              buffer[idx + 2] = pixel.b;
            }
          }
        }
      }
    }

    // Write using Sharp
    await sharp(buffer, {
      raw: {
        width: outputWidth,
        height: outputHeight,
        channels,
      },
    })
      .toFormat(format, {
        quality: format === 'jpg' ? 90 : undefined,
      })
      .toFile(outputPath);

    logger.info(`Output saved to: ${outputPath}`);
  }
}

export default new ImageProcessorService();
