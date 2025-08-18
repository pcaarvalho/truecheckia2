import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

// Enhanced Neon PostgreSQL Configuration with Reliability
const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    
    // Connection reliability settings
    errorFormat: 'pretty',
    
    // Transaction settings for better reliability
    transactionOptions: {
      maxWait: 5000, // 5 seconds
      timeout: 10000, // 10 seconds
      isolationLevel: 'ReadCommitted'
    }
  })
}

// Connection retry logic
const createReliablePrismaClient = () => {
  const client = createPrismaClient()
  
  // Override the $connect method with retry logic
  const originalConnect = client.$connect.bind(client)
  client.$connect = async () => {
    let lastError: Error | null = null
    const maxRetries = 3
    const baseDelay = 1000 // 1 second
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await originalConnect()
        if (attempt > 0) {
          console.log(`🔄 Database reconnected after ${attempt + 1} attempts`)
        }
        return
      } catch (error) {
        lastError = error as Error
        const isLastAttempt = attempt === maxRetries - 1
        
        if (isLastAttempt) {
          console.error(`❌ Database connection failed after ${maxRetries} attempts:`, lastError.message)
          throw lastError
        }
        
        const delay = baseDelay * Math.pow(2, attempt) // Exponential backoff
        console.warn(`⚠️  Database connection attempt ${attempt + 1} failed, retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  // Override query methods with automatic retry
  const wrapWithRetry = (originalMethod: any) => {
    return async (...args: any[]) => {
      const maxRetries = 2
      let lastError: Error | null = null
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          return await originalMethod(...args)
        } catch (error: any) {
          lastError = error
          
          // Check if it's a connection error that should be retried
          const isConnectionError = error.message?.includes("Can't reach database server") ||
                                  error.message?.includes("Connection terminated") ||
                                  error.message?.includes("Connection reset") ||
                                  error.code === 'P1001' || // Can't reach database server
                                  error.code === 'P1017'    // Server has closed the connection
          
          if (!isConnectionError || attempt === maxRetries - 1) {
            throw error
          }
          
          console.warn(`⚠️  Query failed with connection error, retrying... (attempt ${attempt + 1}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
          
          // Try to reconnect
          try {
            await client.$connect()
          } catch (reconnectError) {
            console.warn(`⚠️  Reconnection attempt failed:`, (reconnectError as Error).message)
          }
        }
      }
      
      throw lastError
    }
  }
  
  // Wrap critical query methods
  client.$queryRaw = wrapWithRetry(client.$queryRaw.bind(client))
  client.$executeRaw = wrapWithRetry(client.$executeRaw.bind(client))
  
  // Add connection health check
  client.$healthCheck = async () => {
    try {
      await client.$queryRaw`SELECT 1 as health`
      return { status: 'healthy', latency: Date.now() }
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: (error as Error).message,
        latency: null
      }
    }
  }
  
  return client
}

// Create singleton with enhanced reliability
export const prisma = global.prisma || createReliablePrismaClient()

// Global assignment for development
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

// Connection monitoring
if (process.env.NODE_ENV === 'development') {
  // Test connection on startup
  prisma.$connect()
    .then(() => {
      console.log('✅ Database connected successfully')
    })
    .catch((error) => {
      console.error('❌ Initial database connection failed:', error.message)
    })
}

// Enhanced error types
export interface DatabaseHealthCheck {
  status: 'healthy' | 'unhealthy'
  latency: number | null
  error?: string
}

// Extend PrismaClient type with health check
declare module '@prisma/client' {
  interface PrismaClient {
    $healthCheck(): Promise<DatabaseHealthCheck>
  }
}

export * from '@prisma/client'