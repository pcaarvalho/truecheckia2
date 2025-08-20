# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

TrueCheckIA is an AI content detection SaaS platform with dual deployment modes:
- **Local**: Docker services + Express server with Bull queues
- **Production**: Vercel serverless functions + Neon PostgreSQL + Upstash Redis

## Critical Development Commands

### Quick Start
```bash
./start.sh               # One-command setup (Docker + dependencies + server)
./stop.sh                # Stop everything

# Manual alternative:
docker-compose up -d     # Start services (PostgreSQL, Redis, Mailhog)
npm install              # Install all dependencies
npm run db:push          # Push schema to database
npm run db:seed          # Seed dev user: dev@truecheckia.com / dev12345
npm run dev              # Start both API and frontend
```

### Frontend Development (IMPORTANT)
```bash
# ALWAYS use direct navigation - workspace commands may fail
cd frontend && npm run dev          # Vite dev server on port 5173
cd frontend && npm run build        # Production build with type checking
cd frontend && npm run build:dev    # Development build
cd frontend && npm run build:staging # Staging build
cd frontend && npm run lint         # ESLint check
cd frontend && npm run lint:fix     # Fix linting issues automatically
cd frontend && npm run type-check   # TypeScript type checking
cd frontend && npm run preview      # Preview production build
cd frontend && npm run analyze      # Bundle analysis
cd frontend && npm run clean        # Clean dist and cache
```

### Backend Development
```bash
npm run dev:api                   # Express server on port 4000
npm run dev:serverless            # Force serverless mode locally
cd apps/api && npm run dev:serverless # Force serverless mode locally (alternative)
cd apps/api && npm run test       # Run backend tests (Jest)
cd apps/api && npm run test:watch # Run tests in watch mode
cd apps/api && npm run test:coverage # Run tests with coverage
cd apps/api && npm run type-check # Type check backend specifically
```

### Database Operations
```bash
npm run db:migrate               # Run migrations
npm run db:generate              # Generate Prisma client
npm run db:push                  # Push schema changes
npm run db:studio                # Open Prisma Studio GUI
npm run db:seed                  # Create dev user with sample data
npm run db:seed:neon            # Seed production Neon database
```

### Code Quality
```bash
npm run lint                     # Lint all code
npm run format                   # Format with Prettier
cd frontend && npm run lint      # Frontend specific linting
cd frontend && npm run lint:fix  # Fix frontend linting issues automatically
cd frontend && npm run type-check # Frontend TypeScript checking
```

## Architecture Key Points

### Dual Deployment Architecture
The codebase supports both traditional and serverless deployments:

1. **Traditional Mode** (Local Development)
   - Express server (`apps/api/src/server.ts`)
   - Bull queues with Redis for background jobs
   - Direct database connections

2. **Serverless Mode** (Production)
   - Vercel functions (`api/` directory)
   - Webhook-based queue processing
   - Upstash Redis with REST API
   - Neon PostgreSQL with connection pooling

### Adaptive Services
Key adapters automatically detect environment and switch implementations:
- **Queue Adapter** (`apps/api/src/lib/queue-adapter.ts`) - Bull vs webhook queues
- **Redis Adapter** (`apps/api/src/lib/redis.ts`, `serverless-redis.ts`) - Local vs Upstash
- **Environment Utils** (`packages/config`) - Detects deployment type

### Project Structure
```
frontend/                 # React + Vite frontend (NOT apps/web)
apps/api/                # Express backend
  src/
    controllers/        # Business logic
    lib/               # Core utilities (JWT, queues, adapters)
    middleware/        # Auth, validation, error handling
    routes/           # API endpoints
    services/         # External integrations (OpenAI, Stripe)
api/                    # Vercel serverless functions (mirrors apps/api)
packages/
  database/            # Prisma client and migrations
  types/              # Shared TypeScript types
  config/             # Environment detection and config
```

### Authentication Flow
- JWT with access/refresh tokens (`apps/api/src/lib/jwt.utils.ts`)
- Google OAuth via Passport.js (`apps/api/src/lib/passport.config.ts`)
- Session management with Redis storage
- Email verification and password reset flows

### Queue System
- **Local**: Bull queues for analysis processing
- **Production**: Webhook-based processing via `/api/webhooks/process`
- Dead Letter Queue (DLQ) with exponential backoff
- Job monitoring and alerting system

## Environment Variables

### Essential Development Variables
```env
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/truecheckia
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
```

### Production (Neon + Upstash)
```env
DATABASE_URL=postgresql://...@ep-xxx-pooler.neon.tech/db?pgbouncer=true
DIRECT_URL=postgresql://...@ep-xxx.neon.tech/db
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

## Testing & Validation

### Infrastructure Testing
```bash
npm run validate:infrastructure   # Test all connections
npm run test:neon                # Test Neon PostgreSQL
npm run test:upstash             # Test Upstash Redis
npm run test:queues              # Test serverless queue system
npm run validate:serverless      # Check serverless readiness
npm run deploy:prepare           # Pre-deployment checks
```

### Testing Approach
- Frontend: No tests configured yet (Vite + Vitest ready to be set up)
- Backend: Jest configured (`cd apps/api && npm run test`)
  - Use `npm run test:watch` for development
  - Use `npm run test:coverage` for coverage reports
- **IMPORTANT**: Always check package.json before running tests
- Test files location: `apps/api/src/__tests__/`

## Service URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000
- **API Docs**: http://localhost:4000/api-docs (dev only)
- **Mailhog**: http://localhost:8025 (email testing)
- **Prisma Studio**: via `npm run db:studio`

## Development User

Pre-configured for testing:
- **Email**: `dev@truecheckia.com`
- **Password**: `dev12345`
- **Plan**: Enterprise (unlimited credits)
- Created via `npm run db:seed`

## Critical Notes

1. **Frontend Location**: Use `frontend/` directory, NOT `apps/web/`
2. **Always use `cd frontend && npm run dev`** for frontend development
3. **Docker Required**: Services must be running for full functionality
4. **Serverless Testing**: Use `FORCE_SERVERLESS=true` to test serverless mode locally
5. **API Structure**: Both `apps/api/` and `api/` directories share controllers/services
6. **Node Version**: Ensure Node.js 20.x is used (specified in package.json engines)
7. **Build Commands**: Frontend build includes TypeScript type checking automatically
8. **Testing**: Backend has Jest configured, frontend testing not yet set up
9. **Package Management**: Project uses npm workspaces, always check individual package.json files
10. **Environment**: Multiple .env templates available for different deployment scenarios