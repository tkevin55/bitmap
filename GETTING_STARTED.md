# Getting Started with Bitmap Pixelator

Welcome to Bitmap Pixelator! This guide will help you get the application up and running quickly.

## Quick Start (5 minutes)

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ (or use Docker)
- Git

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd bitmap

# Install dependencies for both frontend and backend
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 2. Setup Database

**Option A: Using Docker (Easiest)**

```bash
# Start PostgreSQL only
docker-compose up postgres -d

# Database will be available at: localhost:5432
# Credentials: postgres/postgres
# Database name: bitmap_pixelator
```

**Option B: Local PostgreSQL**

```bash
# Create database
createdb bitmap_pixelator
```

### 3. Configure Environment

```bash
# Backend configuration
cd backend
cp .env.example .env

# Edit .env and set:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bitmap_pixelator
# (Other defaults are fine for local development)

# Run database migrations
npx prisma migrate dev
npx prisma generate

cd ..
```

```bash
# Frontend configuration
cd frontend
cp .env.example .env
# Defaults are fine for local development
cd ..
```

### 4. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Backend will start on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Frontend will start on http://localhost:5173
```

### 5. Open Application

Visit http://localhost:5173 in your browser!

## What's Included

### Core Features (MVP)

✅ **Image Upload & Processing**
- Drag & drop or file upload
- Support for PNG, JPG, WebP
- Real-time preview with adjustable settings

✅ **Black & White Mode**
- Pixel size control (1-50px)
- Threshold adjustment (0-255)
- Instant preview

✅ **Color PRO Mode**
- Full color palette extraction
- Advanced dithering algorithms (Floyd-Steinberg, Atkinson, Ordered)
- Customizable palette size (2-64 colors)

✅ **Multiple Export Formats**
- SVG (vector, infinitely scalable)
- PNG (high-quality raster)
- JPG (compressed raster)

✅ **User Authentication**
- JWT-based authentication
- Email/password registration
- Secure password hashing

✅ **Payment Integration**
- Stripe checkout for PRO upgrade
- Monthly and yearly subscription options
- Billing portal for subscription management
- Webhook handling for automatic upgrades

✅ **Tier System**
- Free: 5 downloads/month, B&W mode, 10MB limit
- PRO: Unlimited downloads, color mode, 50MB limit

✅ **Rate Limiting & Security**
- Different limits for free/PRO users
- File validation and sanitization
- Secure token management

## Next Steps

### Try It Out!

1. **Create an Account** at http://localhost:5173/login
2. **Upload an Image** in the Editor
3. **Adjust Settings** (pixel size, threshold)
4. **Export to SVG/PNG/JPG**

### Test Stripe (Optional)

To test the PRO upgrade flow:

1. Get Stripe test keys from [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Add to `backend/.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
3. Add to `frontend/.env`:
   ```env
   VITE_STRIPE_PUBLIC_KEY=pk_test_...
   ```
4. Visit http://localhost:5173/pricing
5. Use test card: `4242 4242 4242 4242`

### Explore the Code

- **Backend:** `backend/src/`
  - `services/imageProcessor.service.ts` - Core image processing
  - `services/svgGenerator.service.ts` - SVG generation
  - `controllers/` - API endpoints
  - `routes/` - Route definitions

- **Frontend:** `frontend/src/`
  - `pages/Editor.tsx` - Main editor UI
  - `lib/api.ts` - API client
  - `context/AuthContext.tsx` - Authentication

### Read the Documentation

- [PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md) - System overview
- [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) - Detailed dev guide
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) - Production deployment
- [docs/API.md](./docs/API.md) - API reference
- [docs/USER_GUIDE.md](./docs/USER_GUIDE.md) - End-user documentation

## Common Tasks

### View Database

```bash
cd backend
npx prisma studio
# Opens at http://localhost:5555
```

### Reset Database

```bash
cd backend
npx prisma migrate reset
# ⚠️ This deletes all data!
```

### Add Sample Data

Create `backend/prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create test user
  const password = await bcrypt.hash('password123', 10);

  await prisma.user.create({
    data: {
      email: 'test@example.com',
      password,
      name: 'Test User',
      credits: 100,
    },
  });

  console.log('Seed data created!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Run: `npx prisma db seed`

### Test API Endpoints

```bash
# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get current user (replace TOKEN)
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 5000
lsof -i :5000
kill -9 <PID>

# Or change port in backend/.env
PORT=5001
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
pg_isready

# Check connection string in backend/.env
DATABASE_URL=postgresql://...

# Test connection
cd backend
npx prisma db push
```

### Module Not Found

```bash
# Clear and reinstall
cd backend  # or frontend
rm -rf node_modules package-lock.json
npm install
```

### CORS Errors

Check that:
- Backend is running on port 5000
- Frontend is running on port 5173
- `FRONTEND_URL` in backend/.env is set to `http://localhost:5173`

### Image Processing Errors

- Ensure Sharp is properly installed: `npm install sharp`
- On some systems, may need: `npm rebuild sharp`

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    React Frontend                    │
│  (Upload, Preview, Controls, Auth, Payment)         │
└───────────────────┬─────────────────────────────────┘
                    │ HTTP/REST API
┌───────────────────▼─────────────────────────────────┐
│              Express.js Backend                      │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Image       │  │ Auth         │  │ Payment    │ │
│  │ Processing  │  │ (JWT)        │  │ (Stripe)   │ │
│  └─────────────┘  └──────────────┘  └────────────┘ │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│              PostgreSQL Database                     │
│         (Users, Conversions, Subscriptions)         │
└─────────────────────────────────────────────────────┘
```

## Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- React Router (routing)
- Axios (HTTP client)
- Zustand (state management)
- React Dropzone (file upload)

**Backend:**
- Node.js + Express
- TypeScript
- Prisma (ORM)
- Sharp (image processing)
- JWT (authentication)
- Stripe (payments)
- Winston (logging)

**Database:**
- PostgreSQL 14+

## Development Workflow

1. **Feature Development**
   - Create feature branch
   - Write code
   - Test locally
   - Create pull request

2. **Testing**
   - Run unit tests: `npm test`
   - Test API endpoints
   - Test UI interactions
   - Verify payment flow

3. **Deployment**
   - Merge to main
   - Deploy backend (Railway/Render)
   - Deploy frontend (Vercel/Netlify)
   - Verify production

## Support

- **Documentation:** See `docs/` folder
- **Issues:** GitHub Issues
- **Email:** support@bitmappixelator.com

## License

MIT License - see LICENSE file

---

**Ready to start building?** 🚀

Check out [DEVELOPMENT.md](./docs/DEVELOPMENT.md) for detailed development workflows!
