# Bitmap Pixelator - Project Architecture

## 📋 Overview
A web application that converts uploaded images (PNG, JPG, WebP) into pixelated/bitmap style outputs with SVG vector export capabilities.

## 🏗️ Architecture

### System Architecture
```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────┐
│   React Client  │────────▶│  Express API     │────────▶│  PostgreSQL │
│   (Frontend)    │◀────────│  (Backend)       │◀────────│  Database   │
└─────────────────┘         └──────────────────┘         └─────────────┘
        │                            │
        │                            ▼
        │                    ┌──────────────────┐
        │                    │  Sharp Library   │
        │                    │  (Image Process) │
        │                    └──────────────────┘
        │                            │
        ▼                            ▼
┌─────────────────┐         ┌──────────────────┐
│  Stripe API     │         │  Temp File Store │
│  (Payments)     │         │  (Uploads/Output)│
└─────────────────┘         └──────────────────┘
```

### Tech Stack Details

#### Frontend (`/frontend`)
- **Framework:** React 18 + TypeScript + Vite
- **UI Library:** Tailwind CSS + shadcn/ui
- **State Management:** React Context API + Zustand (for complex state)
- **HTTP Client:** Axios
- **File Upload:** react-dropzone
- **Canvas:** HTML5 Canvas for client-side preview
- **Routing:** React Router v6

#### Backend (`/backend`)
- **Runtime:** Node.js 18+ with TypeScript
- **Framework:** Express.js
- **Image Processing:** Sharp
- **SVG Generation:** Custom algorithm
- **Auth:** JWT + bcrypt
- **Database ORM:** Prisma
- **Validation:** Zod
- **File Upload:** Multer
- **Payment:** Stripe SDK

#### Database Schema
```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  password      String?  // null for OAuth users
  name          String?
  isPro         Boolean  @default(false)
  credits       Int      @default(5)
  stripeId      String?
  createdAt     DateTime @default(now())
  conversions   Conversion[]
}

model Conversion {
  id            String   @id @default(uuid())
  userId        String?
  user          User?    @relation(fields: [userId], references: [id])
  originalName  String
  format        String   // svg, png, jpg
  mode          String   // bw, color
  settings      Json     // pixel size, threshold, palette
  createdAt     DateTime @default(now())
}
```

## 📁 Folder Structure

```
bitmap-pixelator/
├── frontend/                    # React frontend application
│   ├── public/
│   │   ├── favicon.ico
│   │   └── samples/            # Sample images for demo
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── ui/             # shadcn/ui components
│   │   │   ├── ImageUploader.tsx
│   │   │   ├── PreviewCanvas.tsx
│   │   │   ├── ControlPanel.tsx
│   │   │   ├── ExportModal.tsx
│   │   │   └── ...
│   │   ├── lib/                # Utility functions
│   │   │   ├── api.ts          # API client
│   │   │   ├── imageProcessor.ts  # Client-side processing
│   │   │   └── utils.ts
│   │   ├── hooks/              # Custom React hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useImageConversion.ts
│   │   │   └── useUpload.ts
│   │   ├── pages/              # Page components
│   │   │   ├── Home.tsx
│   │   │   ├── Editor.tsx
│   │   │   ├── Pricing.tsx
│   │   │   ├── HowItWorks.tsx
│   │   │   ├── FAQ.tsx
│   │   │   └── Dashboard.tsx
│   │   ├── context/            # React Context
│   │   │   ├── AuthContext.tsx
│   │   │   └── AppContext.tsx
│   │   ├── types/              # TypeScript types
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── backend/                     # Express backend API
│   ├── src/
│   │   ├── controllers/        # Route controllers
│   │   │   ├── auth.controller.ts
│   │   │   ├── conversion.controller.ts
│   │   │   ├── payment.controller.ts
│   │   │   └── user.controller.ts
│   │   ├── services/           # Business logic
│   │   │   ├── imageProcessor.service.ts
│   │   │   ├── svgGenerator.service.ts
│   │   │   ├── auth.service.ts
│   │   │   └── stripe.service.ts
│   │   ├── middleware/         # Express middleware
│   │   │   ├── auth.middleware.ts
│   │   │   ├── upload.middleware.ts
│   │   │   ├── rateLimit.middleware.ts
│   │   │   └── errorHandler.middleware.ts
│   │   ├── routes/             # API routes
│   │   │   ├── auth.routes.ts
│   │   │   ├── conversion.routes.ts
│   │   │   ├── payment.routes.ts
│   │   │   └── user.routes.ts
│   │   ├── utils/              # Helper functions
│   │   │   ├── logger.ts
│   │   │   ├── validation.ts
│   │   │   └── helpers.ts
│   │   ├── types/              # TypeScript types
│   │   │   └── index.ts
│   │   ├── config/             # Configuration
│   │   │   └── index.ts
│   │   ├── prisma/             # Prisma schema
│   │   │   └── schema.prisma
│   │   ├── app.ts              # Express app setup
│   │   └── server.ts           # Server entry point
│   ├── uploads/                # Temporary upload directory
│   ├── output/                 # Temporary output directory
│   ├── tests/                  # Test files
│   │   ├── unit/
│   │   └── integration/
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── shared/                      # Shared types/constants
│   └── types.ts
│
├── docs/                        # Documentation
│   ├── API.md
│   ├── DEPLOYMENT.md
│   ├── USER_GUIDE.md
│   └── DEVELOPMENT.md
│
├── .github/
│   └── workflows/
│       ├── frontend-ci.yml
│       └── backend-ci.yml
│
├── docker-compose.yml          # Local development setup
├── README.md
└── LICENSE
```

## 🔄 Data Flow

### Image Conversion Flow
1. User uploads image via drag-drop or file selector
2. Frontend validates file (type, size)
3. For small images (<2MB): Client-side preview using Canvas API
4. User adjusts controls (pixel size, threshold, etc.)
5. User clicks "Export"
6. Frontend sends image + settings to backend API
7. Backend:
   - Validates user tier and credits
   - Processes image using Sharp
   - Generates pixelated version
   - Creates SVG/PNG/JPG output
   - Returns download URL or file
8. Frontend triggers download
9. Backend logs conversion and updates credits

### Authentication Flow
1. User registers/logs in
2. Backend validates credentials
3. JWT token issued (7-day expiry)
4. Token stored in localStorage
5. Token sent with each API request in Authorization header
6. Backend middleware validates token

### Payment Flow (PRO Upgrade)
1. User clicks "Upgrade to PRO"
2. Frontend redirects to Stripe Checkout
3. Stripe processes payment
4. Webhook notifies backend
5. Backend updates user.isPro = true
6. User gains access to color mode, higher limits

## 🎯 Key Features

### Phase 1: B&W Mode (MVP)
- [x] Image upload (PNG, JPG, WebP)
- [x] Pixel size control (1-50px)
- [x] Threshold control (0-255)
- [x] Real-time preview
- [x] SVG export
- [x] PNG export
- [x] Free tier (5 downloads)

### Phase 2: Color PRO Mode
- [ ] Color palette extraction
- [ ] Dithering algorithms (Floyd-Steinberg, Ordered)
- [ ] Palette size control (2-64 colors)
- [ ] Grouped SVG by color
- [ ] High-res export (up to 10,000px)

### Phase 3: Premium Features
- [ ] User authentication
- [ ] Stripe payment integration
- [ ] Credit system
- [ ] Dashboard with conversion history
- [ ] Batch processing

## 🔒 Security Considerations
- File type validation (magic number checking)
- File size limits (10MB free, 50MB PRO)
- Rate limiting (10 req/min free, 100 req/min PRO)
- JWT token expiration
- Input sanitization
- CORS configuration
- Secure file cleanup (auto-delete after 1 hour)

## 🚀 Deployment Strategy

### Frontend (Vercel)
```bash
cd frontend
npm run build
vercel --prod
```

### Backend (Railway/Render)
```bash
cd backend
npm run build
# Deploy via Railway CLI or Git integration
```

### Environment Variables
```env
# Backend
DATABASE_URL=
JWT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
FRONTEND_URL=
PORT=5000

# Frontend
VITE_API_URL=
VITE_STRIPE_PUBLIC_KEY=
```

## 📊 Performance Targets
- Image processing: <5s for images up to 5MB
- SVG generation: <3s for 100x100 pixel grid
- API response time: <200ms (excluding processing)
- Frontend load time: <2s
- Mobile responsive: Support down to 375px width

## 🧪 Testing Strategy
- Unit tests: Jest + Vitest
- Integration tests: Supertest (backend)
- E2E tests: Playwright (critical user flows)
- Image processing tests: Compare output against fixtures
- Coverage target: >80%
