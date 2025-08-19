import { PrismaClient } from '@prisma/client'

// Simplified Prisma client for Vercel serverless
declare global {
  var prisma: PrismaClient | undefined
}

const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'minimal',
    
    // Optimized for serverless
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
}

// Singleton for edge runtime
export const prisma = globalThis.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

// Health check utility
export const checkDatabaseHealth = async () => {
  try {
    await prisma.$queryRaw`SELECT 1 as health`
    return { status: 'healthy' }
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: (error as Error).message
    }
  }
}

export * from '@prisma/client'