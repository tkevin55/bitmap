import sharp from 'sharp';
import { ConversionSettings, DitheringMethod } from '../../../shared/types';
import logger from '../utils/logger';

export interface ProcessedImageData {
  width: number;
  height: number;
  gridWidth: number;
  gridHeight: number;
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
      let image = sharp(inputPath);
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        throw new Error('Unable to read image dimensions');
      }

      // Apply blur if specified (color mode)
      if (settings.mode === 'color' && settings.blur && settings.blur > 0) {
        image = image.blur(settings.blur);
      }

      // Calculate grid dimensions based on size (blocks per shorter side)
      const shorterSide = Math.min(metadata.width, metadata.height);
      const longerSide = Math.max(metadata.width, metadata.height);
      const aspectRatio = longerSide / shorterSide;

      let gridWidth: number, gridHeight: number;

      if (metadata.width <= metadata.height) {
        // Portrait or square
        gridWidth = settings.size;
        gridHeight = Math.round(settings.size * aspectRatio);
      } else {
        // Landscape
        gridWidth = Math.round(settings.size * aspectRatio);
        gridHeight = settings.size;
      }

      logger.debug(`Grid dimensions: ${gridWidth}x${gridHeight} (size=${settings.size})`);

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
        gridWidth,
        gridHeight,
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
    const dithering = settings.dithering || 'floyd-steinberg';

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
      pixelGrid = this.snapToPalette(pixelGrid, palette);
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
  private snapToPalette(pixelGrid: PixelData[][], palette: string[]): PixelData[][] {
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
   * Apply dithering algorithm
   */
  private applyDithering(
    pixelGrid: PixelData[][],
    palette: string[],
    algorithm: DitheringMethod
  ): PixelData[][] {
    const paletteRGB = palette.map((hex) => this.hexToRgb(hex));
    const height = pixelGrid.length;
    const width = pixelGrid[0].length;

    // Create a working copy
    const workingGrid = pixelGrid.map((row) =>
      row.map((p) => ({ r: p.r, g: p.g, b: p.b }))
    );

    switch (algorithm) {
      case 'floyd-steinberg':
        return this.floydSteinbergDither(workingGrid, paletteRGB);
      case 'atkinson':
        return this.atkinsonDither(workingGrid, paletteRGB);
      case 'jarvis-judice-ninke':
        return this.jarvisJudiceNinkeDither(workingGrid, paletteRGB);
      case 'stucki':
        return this.stuckiDither(workingGrid, paletteRGB);
      case 'bayer-2x2':
        return this.bayerDither(workingGrid, paletteRGB, 2);
      case 'bayer-4x4':
        return this.bayerDither(workingGrid, paletteRGB, 4);
      case 'bayer-8x8':
        return this.bayerDither(workingGrid, paletteRGB, 8);
      case 'clustered-4x4':
        return this.clusteredDither(workingGrid, paletteRGB);
      case 'random':
        return this.randomDither(workingGrid, paletteRGB);
      default:
        return this.snapToPalette(pixelGrid, palette);
    }
  }

  /**
   * Floyd-Steinberg dithering
   */
  private floydSteinbergDither(
    workingGrid: Array<Array<{ r: number; g: number; b: number }>>,
    paletteRGB: Array<{ r: number; g: number; b: number }>
  ): PixelData[][] {
    const height = workingGrid.length;
    const width = workingGrid[0].length;

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

    return this.clampAndConvert(workingGrid);
  }

  /**
   * Atkinson dithering
   */
  private atkinsonDither(
    workingGrid: Array<Array<{ r: number; g: number; b: number }>>,
    paletteRGB: Array<{ r: number; g: number; b: number }>
  ): PixelData[][] {
    const height = workingGrid.length;
    const width = workingGrid[0].length;

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

    return this.clampAndConvert(workingGrid);
  }

  /**
   * Jarvis-Judice-Ninke dithering
   */
  private jarvisJudiceNinkeDither(
    workingGrid: Array<Array<{ r: number; g: number; b: number }>>,
    paletteRGB: Array<{ r: number; g: number; b: number }>
  ): PixelData[][] {
    const height = workingGrid.length;
    const width = workingGrid[0].length;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const oldPixel = workingGrid[y][x];
        const newPixel = this.findNearestColor(oldPixel, paletteRGB);

        workingGrid[y][x] = newPixel;

        const errR = oldPixel.r - newPixel.r;
        const errG = oldPixel.g - newPixel.g;
        const errB = oldPixel.b - newPixel.b;

        // JJN dithering pattern
        const distributeError = (dx: number, dy: number, factor: number) => {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            workingGrid[ny][nx].r += (errR * factor) / 48;
            workingGrid[ny][nx].g += (errG * factor) / 48;
            workingGrid[ny][nx].b += (errB * factor) / 48;
          }
        };

        distributeError(1, 0, 7);
        distributeError(2, 0, 5);
        distributeError(-2, 1, 3);
        distributeError(-1, 1, 5);
        distributeError(0, 1, 7);
        distributeError(1, 1, 5);
        distributeError(2, 1, 3);
        distributeError(-2, 2, 1);
        distributeError(-1, 2, 3);
        distributeError(0, 2, 5);
        distributeError(1, 2, 3);
        distributeError(2, 2, 1);
      }
    }

    return this.clampAndConvert(workingGrid);
  }

  /**
   * Stucki dithering
   */
  private stuckiDither(
    workingGrid: Array<Array<{ r: number; g: number; b: number }>>,
    paletteRGB: Array<{ r: number; g: number; b: number }>
  ): PixelData[][] {
    const height = workingGrid.length;
    const width = workingGrid[0].length;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const oldPixel = workingGrid[y][x];
        const newPixel = this.findNearestColor(oldPixel, paletteRGB);

        workingGrid[y][x] = newPixel;

        const errR = oldPixel.r - newPixel.r;
        const errG = oldPixel.g - newPixel.g;
        const errB = oldPixel.b - newPixel.b;

        // Stucki dithering pattern
        const distributeError = (dx: number, dy: number, factor: number) => {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            workingGrid[ny][nx].r += (errR * factor) / 42;
            workingGrid[ny][nx].g += (errG * factor) / 42;
            workingGrid[ny][nx].b += (errB * factor) / 42;
          }
        };

        distributeError(1, 0, 8);
        distributeError(2, 0, 4);
        distributeError(-2, 1, 2);
        distributeError(-1, 1, 4);
        distributeError(0, 1, 8);
        distributeError(1, 1, 4);
        distributeError(2, 1, 2);
        distributeError(-2, 2, 1);
        distributeError(-1, 2, 2);
        distributeError(0, 2, 4);
        distributeError(1, 2, 2);
        distributeError(2, 2, 1);
      }
    }

    return this.clampAndConvert(workingGrid);
  }

  /**
   * Bayer matrix dithering
   */
  private bayerDither(
    workingGrid: Array<Array<{ r: number; g: number; b: number }>>,
    paletteRGB: Array<{ r: number; g: number; b: number }>,
    matrixSize: number
  ): PixelData[][] {
    const bayerMatrix2 = [
      [0, 2],
      [3, 1],
    ];

    const bayerMatrix4 = [
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5],
    ];

    const bayerMatrix8 = [
      [0, 32, 8, 40, 2, 34, 10, 42],
      [48, 16, 56, 24, 50, 18, 58, 26],
      [12, 44, 4, 36, 14, 46, 6, 38],
      [60, 28, 52, 20, 62, 30, 54, 22],
      [3, 35, 11, 43, 1, 33, 9, 41],
      [51, 19, 59, 27, 49, 17, 57, 25],
      [15, 47, 7, 39, 13, 45, 5, 37],
      [63, 31, 55, 23, 61, 29, 53, 21],
    ];

    let matrix: number[][];
    let divisor: number;

    switch (matrixSize) {
      case 2:
        matrix = bayerMatrix2;
        divisor = 4;
        break;
      case 4:
        matrix = bayerMatrix4;
        divisor = 16;
        break;
      case 8:
        matrix = bayerMatrix8;
        divisor = 64;
        break;
      default:
        matrix = bayerMatrix4;
        divisor = 16;
    }

    const height = workingGrid.length;
    const width = workingGrid[0].length;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const threshold = (matrix[y % matrixSize][x % matrixSize] / divisor - 0.5) * 128;

        const pixel = workingGrid[y][x];
        const adjusted = {
          r: Math.max(0, Math.min(255, pixel.r + threshold)),
          g: Math.max(0, Math.min(255, pixel.g + threshold)),
          b: Math.max(0, Math.min(255, pixel.b + threshold)),
        };

        workingGrid[y][x] = this.findNearestColor(adjusted, paletteRGB);
      }
    }

    return this.clampAndConvert(workingGrid);
  }

  /**
   * Clustered dot dithering
   */
  private clusteredDither(
    workingGrid: Array<Array<{ r: number; g: number; b: number }>>,
    paletteRGB: Array<{ r: number; g: number; b: number }>
  ): PixelData[][] {
    const clusteredMatrix = [
      [12, 5, 6, 13],
      [4, 0, 1, 7],
      [11, 3, 2, 8],
      [15, 10, 9, 14],
    ];

    const height = workingGrid.length;
    const width = workingGrid[0].length;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const threshold = (clusteredMatrix[y % 4][x % 4] / 16 - 0.5) * 128;

        const pixel = workingGrid[y][x];
        const adjusted = {
          r: Math.max(0, Math.min(255, pixel.r + threshold)),
          g: Math.max(0, Math.min(255, pixel.g + threshold)),
          b: Math.max(0, Math.min(255, pixel.b + threshold)),
        };

        workingGrid[y][x] = this.findNearestColor(adjusted, paletteRGB);
      }
    }

    return this.clampAndConvert(workingGrid);
  }

  /**
   * Random dithering
   */
  private randomDither(
    workingGrid: Array<Array<{ r: number; g: number; b: number }>>,
    paletteRGB: Array<{ r: number; g: number; b: number }>
  ): PixelData[][] {
    const height = workingGrid.length;
    const width = workingGrid[0].length;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const noise = (Math.random() - 0.5) * 64;

        const pixel = workingGrid[y][x];
        const adjusted = {
          r: Math.max(0, Math.min(255, pixel.r + noise)),
          g: Math.max(0, Math.min(255, pixel.g + noise)),
          b: Math.max(0, Math.min(255, pixel.b + noise)),
        };

        workingGrid[y][x] = this.findNearestColor(adjusted, paletteRGB);
      }
    }

    return this.clampAndConvert(workingGrid);
  }

  /**
   * Clamp values and convert to PixelData
   */
  private clampAndConvert(
    workingGrid: Array<Array<{ r: number; g: number; b: number }>>
  ): PixelData[][] {
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
    imageData: ProcessedImageData,
    settings: ConversionSettings,
    format: 'png' | 'jpg',
    outputPath: string,
    maxDimension?: number
  ): Promise<void> {
    const { pixelGrid, gridWidth, gridHeight, width: originalWidth, height: originalHeight } = imageData;

    // Calculate output dimensions
    let outputWidth: number, outputHeight: number;

    if (maxDimension) {
      const shorterSide = Math.min(originalWidth, originalHeight);
      const scale = maxDimension / shorterSide;
      outputWidth = Math.round(originalWidth * scale);
      outputHeight = Math.round(originalHeight * scale);
    } else {
      outputWidth = originalWidth;
      outputHeight = originalHeight;
    }

    // Calculate pixel block size
    const blockWidth = Math.ceil(outputWidth / gridWidth);
    const blockHeight = Math.ceil(outputHeight / gridHeight);

    logger.info(`Generating ${format.toUpperCase()} output: ${outputWidth}x${outputHeight}`);

    // Create a buffer for the output image
    const channels = 3;
    const buffer = Buffer.alloc(outputWidth * outputHeight * channels);

    for (let gy = 0; gy < gridHeight; gy++) {
      for (let gx = 0; gx < gridWidth; gx++) {
        const pixel = pixelGrid[gy][gx];

        // Fill the pixel block
        for (let py = 0; py < blockHeight; py++) {
          for (let px = 0; px < blockWidth; px++) {
            const y = gy * blockHeight + py;
            const x = gx * blockWidth + px;

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
