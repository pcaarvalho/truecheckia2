#!/bin/bash

# TrueCheckIA - Stop Development Environment

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🛑 Stopping TrueCheckIA Development Environment...${NC}"
echo ""

# Kill Node.js processes running on specific ports
echo -e "${YELLOW}Stopping application servers...${NC}"

# Kill process on port 4000 (backend)
lsof -ti:4000 | xargs kill -9 2>/dev/null || true
echo -e "${GREEN}✓ Backend API stopped${NC}"

# Kill process on port 5173 (frontend Vite)
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Kill process on port 8080, 8081, 8082 (alternative frontend ports)
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
lsof -ti:8082 | xargs kill -9 2>/dev/null || true
echo -e "${GREEN}✓ Frontend stopped${NC}"

# Stop Docker services
echo -e "${YELLOW}Stopping Docker services...${NC}"
docker compose down

echo ""
echo -e "${GREEN}✅ All services stopped successfully!${NC}"
echo ""