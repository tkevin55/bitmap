# Development Guide

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Git
- (Optional) Docker and Docker Compose

## Local Development Setup

### Option 1: Docker Compose (Recommended)

The easiest way to get started is using Docker Compose:

```bash
# Clone the repository
git clone <repository-url>
cd bitmap

# Start all services (PostgreSQL, Backend, Frontend)
docker-compose up

# The application will be available at:
# Frontend: http://localhost:5173
# Backend API: http://localhost:5000
# PostgreSQL: localhost:5432
```

### Option 2: Manual Setup

#### 1. Database Setup

```bash
# Create PostgreSQL database
createdb bitmap_pixelator

# Or using psql
psql -U postgres
CREATE DATABASE bitmap_pixelator;
\q
```

#### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# Make sure to set DATABASE_URL to your PostgreSQL connection string

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev

# Backend will run on http://localhost:5000
```

#### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env if needed (default should work with local backend)

# Start development server
npm run dev

# Frontend will run on http://localhost:5173
```

## Project Structure

```
bitmap-pixelator/
├── backend/               # Express.js API
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Express middleware
│   │   ├── routes/       # API routes
│   │   └── prisma/       # Database schema
│   └── uploads/          # Temporary file storage
│
├── frontend/             # React application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom hooks
│   │   ├── context/     # React Context
│   │   └── lib/         # Utilities & API client
│   └── public/
│
└── shared/              # Shared TypeScript types
```

## Common Development Tasks

### Database Management

```bash
# View database in Prisma Studio
cd backend
npx prisma studio

# Create a new migration
npx prisma migrate dev --name your_migration_name

# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Seed database (if seed script exists)
npx prisma db seed
```

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Linting and Formatting

```bash
# Backend
cd backend
npm run lint
npm run format

# Frontend
cd frontend
npm run lint
npm run format
```

### Building for Production

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
npm run preview
```

## Environment Variables

### Backend (.env)

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/bitmap_pixelator
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:5173
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
MAX_FILE_SIZE_FREE=10485760
MAX_FILE_SIZE_PRO=52428800
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:5000/api
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

## Debugging

### Backend

Use the built-in logger:

```typescript
import logger from '../utils/logger';

logger.debug('Debug message');
logger.info('Info message');
logger.error('Error message', error);
```

Logs are written to `backend/logs/` directory.

### Frontend

Use browser DevTools and React DevTools:

```typescript
// Add console logs for debugging
console.log('Debug:', data);

// Use React DevTools to inspect component state
```

## Testing Stripe Integration

1. Get test API keys from [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
3. Use Stripe CLI for webhook testing:

```bash
stripe listen --forward-to localhost:5000/api/payment/webhook
```

## Common Issues

### Port already in use

```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>
```

### Database connection errors

- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Verify database exists: `psql -U postgres -l`

### Module not found errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Frontend proxy errors

If API calls fail, check:
- Backend is running on port 5000
- `vite.config.ts` proxy is configured
- CORS settings in backend

## Code Style Guidelines

- Use TypeScript for type safety
- Follow ESLint and Prettier configurations
- Write descriptive commit messages
- Add comments for complex logic
- Keep functions small and focused
- Use async/await over promises

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add your feature"

# Push to remote
git push origin feature/your-feature-name

# Create pull request on GitHub
```

## Performance Tips

- Use React.memo() for expensive components
- Debounce slider inputs for settings
- Optimize images before processing
- Use production builds for testing performance
- Monitor backend logs for slow queries

## Security Considerations

- Never commit .env files
- Use strong JWT secrets in production
- Validate all user inputs
- Sanitize file uploads
- Rate limit API endpoints
- Use HTTPS in production

## Getting Help

- Check existing issues on GitHub
- Read API documentation in `docs/API.md`
- Review code comments and JSDoc
- Ask questions in discussions
