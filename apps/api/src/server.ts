import 'express-async-errors'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import { config, validateConfig, validateServerlessConfig } from '@truecheckia/config'
import { errorHandler } from './middleware/error.middleware'
import { notFoundHandler } from './middleware/notFound.middleware'
import { setupRoutes } from './routes'
import { setupSwagger } from './lib/swagger'
import { RedisAdapter, QueueAdapter, EnvironmentUtils } from './lib/queue-adapter'

async function startServer() {
  try {
    // Validate environment variables
    validateConfig()
    
    // Validate serverless configuration if needed
    if (EnvironmentUtils.isProduction()) {
      validateServerlessConfig()
    }
    
    // Create Express app
    const app = express()
    
    // Basic middleware
    app.use(helmet())
    
    // CORS configuration - dynamic based on environment
    const corsOptions = {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin) {
          return callback(null, true)
        }
        
        // Check if origin is in allowed list
        if (config.cors.origins.includes(origin)) {
          callback(null, true)
        } else {
          // In development, log rejected origins for debugging
          if (config.isDev) {
            console.warn(`CORS: Rejected origin: ${origin}`)
            console.log('Allowed origins:', config.cors.origins)
          }
          callback(new Error('Not allowed by CORS'))
        }
      },
      credentials: config.cors.credentials,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
      maxAge: 86400, // 24 hours
    }
    
    app.use(cors(corsOptions))
    app.use(compression())
    app.use(morgan(config.isDev ? 'dev' : 'combined'))
    
    // Stripe webhook needs raw body for signature verification
    app.use('/api/subscription/webhook', express.raw({ type: 'application/json' }))
    
    // Regular JSON parsing for all other routes
    app.use(express.json({ limit: '10mb' }))
    app.use(express.urlencoded({ extended: true, limit: '10mb' }))
    
    // Initialize Passport for OAuth
    const passport = await import('./lib/passport.config')
    app.use(passport.default.initialize())
    
    // Health check
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        environment: config.env,
      })
    })
    
    // API Documentation
    if (config.isDev) {
      setupSwagger(app)
    }
    
    // Connect to Redis (adaptive)
    await RedisAdapter.connectRedis()
    
    // Initialize queues (adaptive)
    await QueueAdapter.initializeQueues()
    
    // Log queue system info
    const queueProvider = EnvironmentUtils.getQueueProvider()
    const redisProvider = EnvironmentUtils.getRedisProvider()
    console.log(`📦 Queue System: ${queueProvider.provider} (${queueProvider.type})`)
    console.log(`🔴 Redis System: ${redisProvider.provider} (${redisProvider.type})`)
    
    // Setup routes
    setupRoutes(app)
    
    // Error handlers
    app.use(notFoundHandler)
    app.use(errorHandler)
    
    // Start server
    const port = config.api.port
    app.listen(port, () => {
      console.log(`🚀 API Server running on http://localhost:${port}`)
      console.log(`📊 Environment: ${config.env}`)
      if (config.isDev) {
        console.log(`📚 API Docs: http://localhost:${port}/api-docs`)
      }
    })
    
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error)
  process.exit(1)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...')
  await QueueAdapter.shutdownQueues()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...')
  await QueueAdapter.shutdownQueues()
  process.exit(0)
})

// Start the server
startServer()