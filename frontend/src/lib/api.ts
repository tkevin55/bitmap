import axios, { AxiosInstance } from 'axios';
import { ConversionRequest, ConversionResponse, AuthResponse, User } from '../../../shared/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    this.client.interceptors.request.use((config) => {
      const token = this.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle token expiration
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.removeToken();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Token management
  setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  removeToken(): void {
    localStorage.removeItem('auth_token');
  }

  // Auth endpoints
  async register(email: string, password: string, name?: string): Promise<AuthResponse> {
    const { data } = await this.client.post('/auth/register', { email, password, name });
    this.setToken(data.token);
    return data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await this.client.post('/auth/login', { email, password });
    this.setToken(data.token);
    return data;
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout');
    this.removeToken();
  }

  async getCurrentUser(): Promise<User> {
    const { data } = await this.client.get('/auth/me');
    return data.user;
  }

  async verifyToken(): Promise<boolean> {
    try {
      const { data } = await this.client.post('/auth/verify');
      return data.valid;
    } catch {
      return false;
    }
  }

  // Conversion endpoints
  async convertImage(file: File, request: ConversionRequest): Promise<ConversionResponse> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('size', request.settings.size.toString());
    formData.append('threshold', request.settings.threshold.toString());
    formData.append('mode', request.settings.mode);
    formData.append('format', request.format);

    if (request.maxWidth) {
      formData.append('maxDimension', request.maxWidth.toString());
    } else if (request.maxHeight) {
      formData.append('maxDimension', request.maxHeight.toString());
    }

    if (request.settings.mode === 'color') {
      formData.append('paletteSize', (request.settings.paletteSize || 16).toString());
      formData.append('dithering', request.settings.dithering || 'floyd-steinberg');
      if (request.settings.blur !== undefined) {
        formData.append('blur', request.settings.blur.toString());
      }
    }

    const { data } = await this.client.post('/conversion/convert', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return data;
  }

  async getConversionHistory(page: number = 1, limit: number = 20) {
    const { data } = await this.client.get('/conversion/history', {
      params: { page, limit },
    });
    return data;
  }

  // Payment endpoints
  async getPricingPlans() {
    const { data } = await this.client.get('/payment/plans');
    return data.plans;
  }

  async createCheckoutSession(priceId: string, successUrl: string, cancelUrl: string) {
    const { data } = await this.client.post('/payment/create-checkout-session', {
      priceId,
      successUrl,
      cancelUrl,
    });
    return data;
  }

  async createBillingPortalSession(returnUrl: string) {
    const { data } = await this.client.post('/payment/create-billing-portal-session', {
      returnUrl,
    });
    return data;
  }

  async cancelSubscription() {
    const { data } = await this.client.post('/payment/cancel-subscription');
    return data;
  }

  // User endpoints
  async getUserProfile() {
    const { data } = await this.client.get('/user/profile');
    return data.user;
  }

  async updateUserProfile(name: string) {
    const { data } = await this.client.put('/user/profile', { name });
    return data.user;
  }

  async getUserStatistics() {
    const { data } = await this.client.get('/user/statistics');
    return data.statistics;
  }

  async deleteAccount(password: string) {
    const { data } = await this.client.delete('/user/account', { data: { password } });
    return data;
  }
}

export default new ApiClient();
