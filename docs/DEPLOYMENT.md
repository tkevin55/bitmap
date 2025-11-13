# Deployment Guide

## Overview

This guide covers deploying Bitmap Pixelator to production environments.

## Deployment Architecture

```
┌─────────────────┐         ┌──────────────────┐
│   Vercel/       │────────▶│  Railway/        │
│   Netlify       │         │  Render/AWS      │
│   (Frontend)    │         │  (Backend API)   │
└─────────────────┘         └──────────────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │   PostgreSQL     │
                            │   (Database)     │
                            └──────────────────┘
```

## Prerequisites

- GitHub account
- Vercel/Netlify account (for frontend)
- Railway/Render/AWS account (for backend)
- Stripe account (for payments)
- Domain name (optional)

## 1. Database Setup

### Option A: Railway PostgreSQL

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Add PostgreSQL
railway add postgresql

# Get database URL
railway variables
```

### Option B: Render PostgreSQL

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "PostgreSQL"
3. Choose instance name and region
4. Copy the "Internal Database URL"

### Option C: AWS RDS

1. Go to AWS RDS Console
2. Create PostgreSQL database
3. Configure security groups for access
4. Copy connection string

## 2. Backend Deployment

### Option A: Railway

```bash
cd backend

# Initialize Railway project
railway init

# Link to existing project (if created earlier)
railway link

# Set environment variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=<your-strong-secret>
railway variables set STRIPE_SECRET_KEY=<your-stripe-key>
railway variables set STRIPE_WEBHOOK_SECRET=<your-webhook-secret>
railway variables set FRONTEND_URL=<your-frontend-url>

# Set database URL (if not auto-configured)
railway variables set DATABASE_URL=<your-database-url>

# Deploy
railway up

# Run migrations
railway run npx prisma migrate deploy

# Get your backend URL
railway status
```

### Option B: Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build && npx prisma migrate deploy`
   - **Start Command**: `npm start`
5. Add environment variables:
   ```
   NODE_ENV=production
   DATABASE_URL=<from-render-postgres>
   JWT_SECRET=<generate-strong-secret>
   STRIPE_SECRET_KEY=<your-stripe-key>
   STRIPE_WEBHOOK_SECRET=<your-webhook-secret>
   FRONTEND_URL=<your-frontend-url>
   ```
6. Click "Create Web Service"

### Option C: AWS EC2

```bash
# SSH into EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone repository
git clone <your-repo-url>
cd bitmap/backend

# Install dependencies
npm install

# Create .env file
nano .env
# Add all environment variables

# Build
npm run build

# Run migrations
npx prisma migrate deploy

# Start with PM2
pm2 start dist/server.js --name bitmap-api

# Save PM2 configuration
pm2 save
pm2 startup

# Setup Nginx reverse proxy
sudo apt install nginx
sudo nano /etc/nginx/sites-available/bitmap-api

# Add Nginx configuration (see below)
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 3. Frontend Deployment

### Option A: Vercel (Recommended)

```bash
cd frontend

# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables in Vercel dashboard
# VITE_API_URL=https://your-backend-url/api
# VITE_STRIPE_PUBLIC_KEY=pk_live_...

# Deploy to production
vercel --prod
```

Or use Vercel GitHub integration:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add environment variables
6. Click "Deploy"

### Option B: Netlify

```bash
cd frontend

# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy

# Set environment variables
netlify env:set VITE_API_URL https://your-backend-url/api
netlify env:set VITE_STRIPE_PUBLIC_KEY pk_live_...

# Deploy to production
netlify deploy --prod
```

### Option C: AWS S3 + CloudFront

```bash
cd frontend

# Build
npm run build

# Install AWS CLI
# https://aws.amazon.com/cli/

# Create S3 bucket
aws s3 mb s3://bitmap-pixelator

# Enable static website hosting
aws s3 website s3://bitmap-pixelator --index-document index.html

# Upload files
aws s3 sync dist/ s3://bitmap-pixelator --delete

# Setup CloudFront distribution
# Follow AWS CloudFront documentation
```

## 4. Stripe Configuration

### Setup Webhook Endpoint

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to "Developers" → "Webhooks"
3. Click "Add endpoint"
4. Enter URL: `https://your-backend-url/api/payment/webhook`
5. Select events to listen:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
6. Copy webhook signing secret
7. Add to backend environment variables:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Create Price IDs

1. Go to "Products" in Stripe Dashboard
2. Create product: "Bitmap Pixelator PRO"
3. Add prices:
   - Monthly: $9.99/month
   - Yearly: $59.99/year
4. Copy price IDs
5. Add to backend environment variables:
   ```
   STRIPE_PRICE_ID_MONTHLY=price_...
   STRIPE_PRICE_ID_YEARLY=price_...
   ```

## 5. Domain Configuration

### Backend Domain

1. Get your backend URL from Railway/Render/AWS
2. (Optional) Setup custom domain:
   - Add CNAME record: `api.yourdomain.com` → `your-backend-url`
   - Update SSL certificates
   - Update `FRONTEND_URL` environment variable

### Frontend Domain

1. In Vercel/Netlify:
   - Go to project settings
   - Add custom domain
   - Follow DNS configuration instructions
2. SSL is automatically configured

## 6. Environment Variables Checklist

### Backend Production Variables

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://...
JWT_SECRET=<strong-random-secret>
FRONTEND_URL=https://your-frontend-domain.com
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_YEARLY=price_...
MAX_FILE_SIZE_FREE=10485760
MAX_FILE_SIZE_PRO=52428800
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_FREE=10
RATE_LIMIT_MAX_PRO=100
```

### Frontend Production Variables

```env
VITE_API_URL=https://api.yourdomain.com/api
VITE_STRIPE_PUBLIC_KEY=pk_live_...
```

## 7. Post-Deployment Tasks

### Test the Application

1. Visit frontend URL
2. Register a new account
3. Upload and convert an image
4. Test PRO upgrade flow (use Stripe test mode first)
5. Verify webhook delivery in Stripe Dashboard

### Setup Monitoring

#### Backend Monitoring

```bash
# On Railway/Render: Built-in monitoring available

# On AWS: Setup CloudWatch
# Monitor:
# - API response times
# - Error rates
# - Memory usage
# - Disk space

# Add application monitoring (e.g., Sentry)
npm install @sentry/node
```

#### Frontend Monitoring

```bash
# Add error tracking
npm install @sentry/react

# Configure in frontend/src/main.tsx
```

### Setup Backups

```bash
# Automated PostgreSQL backups
# Railway/Render: Automatic backups included

# AWS RDS: Enable automated backups
# Manual backup:
pg_dump -U username -h hostname database_name > backup.sql
```

### Setup CI/CD

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Railway
        run: |
          npm install -g @railway/cli
          railway link ${{ secrets.RAILWAY_PROJECT_ID }}
          railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Vercel
        run: |
          npm install -g vercel
          vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
```

## 8. Security Checklist

- [ ] Use strong JWT secret (minimum 32 characters)
- [ ] Enable HTTPS for all endpoints
- [ ] Configure CORS to only allow frontend domain
- [ ] Setup rate limiting
- [ ] Enable database connection encryption
- [ ] Regularly update dependencies
- [ ] Setup automated security scans
- [ ] Configure firewall rules
- [ ] Enable database backups
- [ ] Setup monitoring and alerts

## 9. Performance Optimization

- [ ] Enable gzip compression
- [ ] Setup CDN for frontend assets
- [ ] Optimize database queries
- [ ] Add Redis for caching (optional)
- [ ] Setup database connection pooling
- [ ] Optimize image processing settings
- [ ] Monitor and optimize API response times

## 10. Troubleshooting

### Backend not starting

```bash
# Check logs
railway logs

# Verify environment variables
railway variables

# Check database connection
railway run npx prisma db push
```

### Webhooks not working

1. Check Stripe webhook logs
2. Verify webhook URL is correct
3. Test with Stripe CLI:
   ```bash
   stripe listen --forward-to https://your-backend-url/api/payment/webhook
   ```

### CORS errors

1. Verify `FRONTEND_URL` in backend .env
2. Check CORS configuration in `backend/src/app.ts`
3. Ensure frontend is using correct API URL

## Support

For deployment issues:
- Check platform-specific documentation
- Review application logs
- Contact support@bitmappixelator.com
