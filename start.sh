#!/bin/bash

# TrueCheckIA - Complete Development Environment Startup Script
# This script starts all services needed for development

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    🚀 TrueCheckIA Development Environment     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Check Docker
if ! command_exists docker; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker Desktop.${NC}"
    exit 1
fi

if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"

# Check Node.js
if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check npm
if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm -v)${NC}"

echo ""
echo -e "${YELLOW}🔧 Setting up environment...${NC}"

# Check if .env file exists, if not copy from .env.example
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
        cp .env.example .env
        echo -e "${GREEN}✓ .env file created${NC}"
        echo -e "${YELLOW}⚠️  Please update .env with your API keys (OpenAI, Stripe, Resend)${NC}"
    else
        echo -e "${RED}❌ No .env file found. Please create one from .env.example${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

echo ""
echo -e "${YELLOW}📦 Installing dependencies...${NC}"

# Install root dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing root dependencies..."
    npm install
fi

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

# Install backend dependencies if needed
if [ ! -d "apps/api/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd apps/api
    npm install
    cd ../..
fi

echo -e "${GREEN}✓ Dependencies installed${NC}"

echo ""
echo -e "${YELLOW}🐳 Starting Docker services...${NC}"

# Start Docker services
docker compose up -d

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"

# Wait for PostgreSQL
echo -n "Waiting for PostgreSQL..."
until docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo -e " ${GREEN}Ready!${NC}"

# Wait for Redis
echo -n "Waiting for Redis..."
until docker compose exec -T redis redis-cli ping > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo -e " ${GREEN}Ready!${NC}"

echo ""
echo -e "${YELLOW}🗄️  Setting up database...${NC}"

# Export environment variables for Prisma
export $(cat .env | grep -v '^#' | xargs)

# Generate Prisma client
npm run db:generate

# Run migrations (using db:push for development)
echo "Applying database schema..."
npm run db:push || {
    echo -e "${YELLOW}⚠️  Database push failed. This might be normal if schema is already up to date.${NC}"
}

echo -e "${GREEN}✓ Database ready${NC}"

echo ""
echo -e "${YELLOW}🚀 Starting application servers...${NC}"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping services...${NC}"
    
    # Kill backend and frontend processes
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    # Stop Docker services
    echo "Stopping Docker services..."
    docker compose down
    
    echo -e "${GREEN}✓ All services stopped${NC}"
    exit 0
}

# Set trap for cleanup on Ctrl+C
trap cleanup INT TERM

# Start backend API
echo "Starting backend API..."
cd apps/api
export $(cat ../../.env | grep -v '^#' | xargs)
npm run dev > ../../backend.log 2>&1 &
BACKEND_PID=$!
cd ../..

# Wait for backend to start
echo -n "Waiting for backend API..."
until curl -s http://localhost:4000/health > /dev/null 2>&1 || [ $? -eq 7 ]; do
    echo -n "."
    sleep 1
done
echo -e " ${GREEN}Ready!${NC}"

# Start frontend
echo "Starting frontend..."
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait a bit for frontend to start
sleep 3

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ TrueCheckIA is running!                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📍 Services:${NC}"
echo -e "  ${GREEN}•${NC} Frontend:       ${BLUE}http://localhost:5173${NC}"
echo -e "  ${GREEN}•${NC} Backend API:    ${BLUE}http://localhost:4000${NC}"
echo -e "  ${GREEN}•${NC} API Docs:       ${BLUE}http://localhost:4000/api-docs${NC}"
echo -e "  ${GREEN}•${NC} Mailhog:        ${BLUE}http://localhost:8025${NC}"
echo -e "  ${GREEN}•${NC} PostgreSQL:     ${BLUE}localhost:5432${NC}"
echo -e "  ${GREEN}•${NC} Redis:          ${BLUE}localhost:6379${NC}"
echo ""
echo -e "${YELLOW}📝 Logs:${NC}"
echo -e "  ${GREEN}•${NC} Backend:  tail -f backend.log"
echo -e "  ${GREEN}•${NC} Frontend: tail -f frontend.log"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo -e "  ${GREEN}•${NC} Default login: Create account at /register"
echo -e "  ${GREEN}•${NC} Check emails in Mailhog"
echo -e "  ${GREEN}•${NC} API docs available at /api-docs"
echo ""
echo -e "${RED}Press Ctrl+C to stop all services${NC}"
echo ""

# Keep script running and wait for Ctrl+C
while true; do
    sleep 1
done