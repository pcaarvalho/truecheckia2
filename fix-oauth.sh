#!/bin/bash

echo "🔧 TrueCheckIA OAuth Fix Deployment"
echo "=================================="

echo "📦 Installing API dependencies..."
cd api && npm install && cd ..

echo "🌐 Updating Vercel environment variables..."

# Update domain-related environment variables
vercel env add VITE_API_BASE_URL "https://truecheckiagpt.vercel.app/api" production --yes
vercel env add VITE_APP_URL "https://truecheckiagpt.vercel.app" production --yes
vercel env add NEXT_PUBLIC_APP_URL "https://truecheckiagpt.vercel.app" production --yes
vercel env add NEXT_PUBLIC_API_URL "https://truecheckiagpt.vercel.app/api" production --yes
vercel env add FRONTEND_URL "https://truecheckiagpt.vercel.app" production --yes
vercel env add CORS_ORIGINS "https://truecheckiagpt.vercel.app,http://localhost:5173" production --yes

# Update Google OAuth callback URL
vercel env add GOOGLE_CALLBACK_URL "https://truecheckiagpt.vercel.app/api/auth/google/callback" production --yes

echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo ""
echo "🔍 Next steps:"
echo "1. Update Google OAuth Console:"
echo "   - Authorized JavaScript origins: https://truecheckiagpt.vercel.app"
echo "   - Authorized redirect URIs: https://truecheckiagpt.vercel.app/api/auth/google/callback"
echo ""
echo "2. Test OAuth flow:"
echo "   - Visit: https://truecheckiagpt.vercel.app"
echo "   - Click 'Sign in with Google'"
echo "   - Check API health: https://truecheckiagpt.vercel.app/api/health"
echo ""
echo "3. Debug URLs:"
echo "   - Frontend: https://truecheckiagpt.vercel.app"
echo "   - API Health: https://truecheckiagpt.vercel.app/api/health"
echo "   - OAuth Start: https://truecheckiagpt.vercel.app/api/auth/google"