# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

TrueCheckIA is an AI content detection SaaS platform built as a monorepo with separate frontend and backend applications. The project uses Docker for local development and has two main apps: a React/Vite frontend and a Node.js/Express API backend.

## Project Structure

- **frontend/** - React + Vite + TypeScript app with Shadcn UI components
- **apps/api/** - Node.js + Express + TypeScript backend API  
- **api/** - Vercel serverless function endpoints (mirrors apps/api functionality)
- **packages/database/** - Shared Prisma database client with generated types
- **packages/types/** - Shared TypeScript type definitions
- **packages/config/** - Shared configuration with environment detection

## Development Commands

### Quick Start
```bash
# One-command setup (recommended)
./start.sh

# Stop everything
./stop.sh
```

### Manual Setup
```bash
# Start Docker services (PostgreSQL, Redis, Mailhog)
docker-compose up -d

# Install dependencies
npm install

# Setup database
npm run db:migrate
npm run db:generate
npm run db:seed  # Creates dev@truecheckia.com user
```

### Development
```bash
# Start all services (Docker + API + Frontend)
npm run dev

# Start individual services
npm run dev:api      # Backend API on port 4000
npm run dev:web      # Frontend on port 5173 (Note: workspace command may not work)

# Frontend development (in frontend/ directory - PREFERRED)
cd frontend && npm run dev  # Vite dev server on port 5173

# Backend in serverless mode
npm run dev:serverless  # Force serverless adapters locally
```

### Build & Production
```bash
# Build all applications
npm run build

# Build individual apps
npm run build:api
npm run build:web

# Frontend build
cd frontend && npm run build
cd frontend && npm run build:analyze  # With bundle analysis
```

### Database Management
```bash
# Run migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate

# Push schema changes
npm run db:push

# Seed development data (creates dev@truecheckia.com user)
npm run db:seed

# Seed for Neon production
npm run db:seed:neon

# Open Prisma Studio
npm run db:studio
```

### Infrastructure Testing & Validation
```bash
# Test Neon PostgreSQL connectivity
npm run test:neon

# Full Neon setup validation
npm run validate:neon

# Test Upstash Redis connectivity
npm run test:upstash

# Validate complete infrastructure
npm run validate:infrastructure

# Test serverless queues
npm run test:queues

# Validate serverless readiness
npm run validate:serverless

# Setup guides
npm run setup:neon        # Display Neon setup instructions
npm run setup:upstash     # Setup Upstash Redis
```

### Code Quality
```bash
# Format code
npm run format

# Lint code
npm run lint

# Frontend specific
cd frontend && npm run lint
cd frontend && npm run lint:fix

# Type checking
npm run type-check  # Backend (in apps/api)
cd frontend && npm run type-check  # Frontend
```

### Testing
```bash
# Backend tests
cd apps/api && npm run test
cd apps/api && npm run test:watch
cd apps/api && npm run test:coverage

# Frontend performance
cd frontend && npm run perf:audit
cd frontend && npm run lighthouse
```

### Docker Commands
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Production deployment
docker-compose -f docker-compose.prod.yml up -d
```

## Architecture

### Backend (apps/api)
- **Express.js** API with TypeScript
- **Prisma ORM** for PostgreSQL database
- **Redis/Upstash** for caching and queues
- **Hybrid Queue System** - Bull (local) + Serverless webhooks (production)
- **Advanced DLQ System** with retry logic and monitoring
- **Comprehensive Job Monitoring** with alerts and metrics
- **JWT** authentication with bcrypt and refresh tokens
- **OpenAI API** integration for AI detection
- **Stripe** for payment processing
- **Passport.js** with Google OAuth support
- Rate limiting, validation with Zod, error handling middleware

### Frontend (frontend/)
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** with Shadcn UI components
- **React Router** for routing
- **TanStack Query** for data fetching
- **React Hook Form** with Zod validation
- **Framer Motion** for animations
- **Axios** for API calls
- **PWA Support** with vite-plugin-pwa
- **Error Boundaries** for graceful error handling
- **Virtual Lists** for performance optimization

### Services
- **PostgreSQL** - Main database on port 5432 (user: postgres, password: postgres123)
- **Redis** - Cache and queue storage on port 6379
- **Mailhog** - Email testing (SMTP: 1025, Web UI: 8025)

### Service URLs
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000
- **API Documentation**: http://localhost:4000/api-docs (development only)
- **Mailhog Web UI**: http://localhost:8025
- **Prisma Studio**: Run `npm run db:studio`

## Environment Variables

### Development (.env)
```
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/truecheckia
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
REDIS_URL=redis://localhost:6379
RESEND_API_KEY=re_... (optional for development)
WEBHOOK_SECRET=... (for serverless processing)
```

### Production (Neon PostgreSQL + Upstash Redis)
```
# Neon PostgreSQL URLs
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.us-east-1.postgres.neon.tech:5432/db?sslmode=require&pgbouncer=true&connect_timeout=10
DIRECT_URL=postgresql://user:pass@ep-xxx.us-east-1.postgres.neon.tech:5432/db?sslmode=require&connect_timeout=10
SHADOW_DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.us-east-1.postgres.neon.tech:5432/shadow?sslmode=require&pgbouncer=true

# Upstash Redis
UPSTASH_REDIS_URL=rediss://...
UPSTASH_REDIS_TOKEN=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Other production variables
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
JWT_SECRET=your-production-secret
JWT_REFRESH_SECRET=your-production-refresh-secret
RESEND_API_KEY=re_...
WEBHOOK_SECRET=...
CRON_SECRET=...
```

## API Endpoints

Base URL: `http://localhost:4000/api`

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout current session
- `POST /auth/logout-all` - Logout all sessions
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with token
- `POST /auth/verify-email` - Verify email address
- `POST /auth/resend-verification` - Resend verification email
- `POST /auth/change-password` - Change current password

### Analysis
- `POST /analysis/check` - Analyze text for AI content
- `GET /analysis/history` - Get user's analysis history
- `GET /analysis/:id` - Get specific analysis details
- `GET /analysis/stats` - Get analysis statistics

### User Management
- `GET /user/profile` - Get user profile
- `PATCH /user/profile` - Update user profile
- `GET /user/credits` - Get credit balance
- `GET /user/api-key` - Get/generate API key

### Subscription
- `POST /subscription/checkout` - Create Stripe checkout session
- `POST /subscription/portal` - Access Stripe customer portal
- `GET /subscription/status` - Get subscription status
- `POST /subscription/webhook` - Stripe webhook handler

### External API (v1)
- `POST /v1/analyze` - Analyze text (API key required)
- `GET /v1/status` - API health check
- `GET /v1/usage` - API usage statistics

### Admin
- `GET /admin/metrics` - System metrics
- `GET /admin/queue-dashboard` - Queue monitoring
- `POST /admin/migration-test` - Test migrations

## Key Features

1. **AI Content Detection** - Multi-layer analysis using GPT-4 and GPT-3.5
2. **Credit System** - Free (10/month), Pro (500/month), Enterprise (unlimited) plans
3. **Real-time Processing** - Bull queues with Redis for async operations
4. **Authentication** - JWT-based auth with refresh tokens and Google OAuth
5. **Rate Limiting** - API protection with express-rate-limit
6. **Email Notifications** - Transactional emails via Nodemailer/Resend
7. **Caching** - Advanced caching with tags, priorities, and automatic cleanup
8. **Performance Monitoring** - Query performance tracking and health metrics

## Database Schema

Key models:
- **User** - Authentication, plans, credits, API keys
- **Analysis** - AI detection results with confidence scores
- **Subscription** - Stripe subscription management
- **ApiUsage** - API endpoint usage tracking
- **Notification** - User notifications system
- **CachedAnalysis** - Analysis result caching
- **QueryPerformance** - Database performance monitoring
- **SystemHealth** - Service health tracking

## Testing Approach

Currently no automated tests are configured. When implementing tests:
- Use Vitest for unit testing (frontend already has Vite setup)
- Backend uses Jest for API testing (configured in apps/api)
- Check package.json files for any test scripts before running tests

**IMPORTANT**: Always verify the testing framework by checking package.json before running test commands

### Manual Testing
- Development user: `dev@truecheckia.com` / `dev12345` (Enterprise plan)
- Test external API with generated API keys
- Use Mailhog for email testing (http://localhost:8025)
- Verify both traditional and serverless queue processing

## Deployment Architecture

### Development
- Frontend: Vite dev server (port 5173)
- Backend: Express server with tsx watch (port 4000)
- Services: Docker Compose (PostgreSQL, Redis, Mailhog)

### Production Options
1. **Vercel** (Serverless)
   - Frontend: Vite build deployed to Vercel
   - Backend: Serverless functions in `api/` directory
   - Database: Neon PostgreSQL (with connection pooling)
   - Redis: Upstash (with REST API)
   - Email: Resend
   - Files: Uses vercel.json for routing configuration

2. **Traditional VPS**
   - Frontend: Static build served by nginx
   - Backend: Express server with PM2
   - Services: Docker Compose for production

## Important Notes

### Project Structure Specifics
- The frontend is in the `frontend/` directory, not `apps/web/` (which appears empty)
- Both monorepo workspace structure and standalone frontend exist
- **ALWAYS use `cd frontend && npm run dev` for frontend development** - workspace commands may fail
- Direct navigation to frontend/ for frontend-specific work
- Docker services must be running for full functionality
- Mailhog provides email testing interface at http://localhost:8025

### Development User
A pre-configured development user is available:
- **Email**: `dev@truecheckia.com`
- **Password**: `dev12345`
- **Plan**: Enterprise (unlimited credits)
- **Usage**: Run `npm run db:seed` to create this user with sample data

### Serverless Architecture
The backend supports both traditional and serverless deployments:
- **Traditional**: Express server with Bull queues and Redis
- **Serverless**: Vercel functions with Upstash Redis and webhook-based processing
- **Queue Adapter**: Automatically detects environment and switches between Bull/webhook queues
- **Redis Adapter**: Switches between local Redis/Upstash based on environment
- **Environment Detection**: Uses EnvironmentUtils to detect deployment type

### Advanced Queue Features
- **Dead Letter Queue (DLQ)**: Sophisticated retry logic with exponential backoff
- **Job Monitoring**: Real-time metrics, latency tracking, and performance analysis
- **Alert System**: Proactive monitoring with configurable thresholds
- **Cache Management**: Advanced caching with tags, priorities, and automatic cleanup
- **Admin Dashboard**: Comprehensive monitoring and management interface

### Cron Jobs (Serverless)
- **Core Processing**: process-analysis-queue (2min), process-dlq (5min), health-check (1min)
- **Monitoring**: monitoring-dashboard (10min), cache-cleanup (6h)
- **Maintenance**: dlq-maintenance (daily 4am), cache-warming (5min)
- **Business**: reset-credits (daily 3am), check-low-credits (daily 10am), process-renewals (daily 9am)

### API Structure
Two deployment patterns exist:
- **Monolithic**: `apps/api/src/` - Traditional Express server
- **Serverless**: `api/` directory - Vercel function endpoints
- Both share the same controllers and services from `apps/api/src/`

### Development Tools & Scripts
```bash
# Test serverless queue system
npm run test:queues

# Test Upstash connectivity
npm run test:upstash

# Migrate Redis data to Upstash
npm run migrate:redis
npm run migrate:redis:live  # Live migration

# Benchmark performance
npm run benchmark:redis
npm run benchmark:upstash

# Diagnose issues
npm run diagnose:redis
npm run validate:redis

# Database reliability testing
npm run test:db:reliability

# Infrastructure fixes
npm run test:infrastructure:fixes

# Serverless fixes
npm run fix:serverless

# Deployment preparation
npm run deploy:prepare

# Bundle optimization
npm run optimize:bundle
```

### Package Structure
- **packages/config** - Shared configuration with environment detection
- **packages/database** - Prisma client with generated types in `src/generated/`
- **packages/types** - Shared TypeScript definitions

### Key Middleware & Services
- **Queue Adapter** (`apps/api/src/lib/queue-adapter.ts`) - Handles both Bull and webhook queues
- **Redis Adapter** (`apps/api/src/lib/redis.ts`, `serverless-redis.ts`) - Adaptive Redis connection
- **Environment Utils** - Detects deployment environment and selects appropriate adapters
- **JWT Utils** (`apps/api/src/lib/jwt.utils.ts`) - Token management with refresh tokens
- **Passport Config** (`apps/api/src/lib/passport.config.ts`) - OAuth authentication setup