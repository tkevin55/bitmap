// Shared types between frontend and backend

export type DitheringMethod =
  | 'none'
  | 'floyd-steinberg'
  | 'atkinson'
  | 'jarvis-judice-ninke'
  | 'stucki'
  | 'bayer-2x2'
  | 'bayer-4x4'
  | 'bayer-8x8'
  | 'clustered-4x4'
  | 'random';

export interface ConversionSettings {
  size: number; // Blocks per shorter side (10-200)
  threshold: number; // 0-255 for B&W mode
  mode: 'bw' | 'color';
  // Color mode settings
  paletteSize?: number; // 2-256
  dithering?: DitheringMethod;
  customPalette?: string[]; // Array of hex colors
  paletteUrl?: string; // URL to import palette from
  blur?: number; // Blur amount (0-10)
}

export interface ConversionRequest {
  settings: ConversionSettings;
  format: 'svg' | 'png' | 'jpg';
  maxWidth?: number;
  maxHeight?: number;
}

export interface ConversionResponse {
  id: string;
  downloadUrl?: string;
  fileData?: string; // base64 for small files
  fileName: string;
  fileSize: number;
  processingTime: number;
  creditsRemaining?: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  isPro: boolean;
  credits: number;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ConversionHistory {
  id: string;
  originalName: string;
  format: string;
  mode: string;
  settings: ConversionSettings;
  fileSize: number;
  createdAt: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId: string;
}

export const PRICING_PLANS: PricingPlan[] = [
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
      'Standard processing speed',
    ],
    stripePriceId: '',
  },
  {
    id: 'pro-monthly',
    name: 'PRO Monthly',
    price: 9.99,
    interval: 'month',
    features: [
      'Unlimited downloads',
      'Full color mode',
      'Advanced dithering',
      'Up to 50MB file size',
      'High-res export (10,000px)',
      'Batch processing',
      'Priority processing',
      'Grouped SVG layers',
    ],
    stripePriceId: 'price_monthly', // Replace with actual Stripe price ID
  },
  {
    id: 'pro-yearly',
    name: 'PRO Yearly',
    price: 59.99,
    interval: 'year',
    features: [
      'All PRO features',
      'Save 50%',
      'Unlimited downloads',
      'Full color mode',
      'Advanced dithering',
      'Up to 50MB file size',
      'High-res export (10,000px)',
      'Batch processing',
      'Priority processing',
    ],
    stripePriceId: 'price_yearly', // Replace with actual Stripe price ID
  },
];

export const FILE_LIMITS = {
  FREE: {
    maxSize: 10 * 1024 * 1024, // 10MB
    maxDimension: 4096,
    allowedFormats: ['image/png', 'image/jpeg', 'image/webp'],
  },
  PRO: {
    maxSize: 50 * 1024 * 1024, // 50MB
    maxDimension: 10000,
    allowedFormats: ['image/png', 'image/jpeg', 'image/webp'],
  },
};

export const DEFAULT_SETTINGS: ConversionSettings = {
  size: 50, // 50 blocks per shorter side
  threshold: 128,
  mode: 'bw',
  paletteSize: 16,
  dithering: 'floyd-steinberg',
  blur: 0,
};

export interface ApiError {
  message: string;
  code?: string;
  status: number;
}
