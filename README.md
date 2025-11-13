# 🎨 Bitmap Pixelator

A powerful web application that converts images into pixelated/bitmap style vector graphics with SVG export capabilities.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## ✨ Features

### Free Tier
- ✅ Upload images (PNG, JPG, WebP) up to 10MB
- ✅ Black & white pixelation with threshold control
- ✅ Real-time preview
- ✅ Adjustable pixel size (1-50px)
- ✅ Export to SVG, PNG, JPG
- ✅ 5 free downloads

### PRO Tier ($9.99/month or $5.99/year)
- 🎨 Full color mode with palette extraction
- 🎨 Advanced dithering algorithms
- 🎨 Custom color palette (2-64 colors)
- 🎨 High-resolution export (up to 10,000px)
- 🎨 Unlimited downloads
- 🎨 Batch processing
- 🎨 Priority processing
- 🎨 Grouped SVG layers by color

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- (Optional) Docker and Docker Compose

### Local Development with Docker
```bash
# Clone the repository
git clone <repository-url>
cd bitmap

# Start all services
docker-compose up

# Frontend: http://localhost:5173
# Backend: http://localhost:5000
```

### Manual Setup

#### Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

#### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

## 📁 Project Structure

```
bitmap-pixelator/
├── frontend/          # React + TypeScript frontend
├── backend/           # Node.js + Express backend
├── shared/            # Shared types and constants
├── docs/              # Documentation
└── docker-compose.yml
```

See [PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md) for detailed architecture.

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Image Processing:** Sharp
- **Payment:** Stripe
- **Authentication:** JWT

## 📖 Documentation

- [Architecture](./PROJECT_ARCHITECTURE.md)
- [API Documentation](./docs/API.md)
- [User Guide](./docs/USER_GUIDE.md)
- [Development Guide](./docs/DEVELOPMENT.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

## 🚀 Deployment

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
# Deploy via platform CLI or Git integration
```

## 🔒 Security

- File validation with magic number checking
- Rate limiting
- JWT authentication
- Input sanitization
- Secure file cleanup

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📧 Support

For issues and questions:
- GitHub Issues: [Create an issue](<repository-url>/issues)
- Email: support@bitmappixelator.com

## 🙏 Acknowledgments

- [Sharp](https://sharp.pixelplumbing.com/) for image processing
- [shadcn/ui](https://ui.shadcn.com/) for UI components
- Inspired by bitmap art and pixel art communities
