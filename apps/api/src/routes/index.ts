import { Express } from 'express'
import { authRoutes } from './auth.routes'
import { analysisRoutes } from './analysis.routes'
import { userRoutes } from './user.routes'
import { subscriptionRoutes } from './subscription.routes'
import { apiRoutes } from './api.routes'
import { adminRoutes } from './admin.routes'
import { healthRoutes } from './health.routes'
import webhooksRoutes from './webhooks.routes'
import { generalLimiter } from '../middleware/rateLimit.middleware'

export const setupRoutes = (app: Express) => {
  // Health check routes (no rate limiting for monitoring)
  app.use('/health', healthRoutes)
  app.use('/api/health', healthRoutes)
  
  // Apply general rate limiter to all other API routes
  app.use('/api', generalLimiter)
  
  // Mount routes
  app.use('/api/auth', authRoutes)
  app.use('/api/analysis', analysisRoutes)
  app.use('/api/user', userRoutes)
  app.use('/api/subscription', subscriptionRoutes)
  app.use('/api/v1', apiRoutes) // External API
  app.use('/api/admin', adminRoutes) // Admin endpoints (dev only)
  
  // Webhook routes for serverless queue processing
  app.use('/api/webhooks', webhooksRoutes)
}