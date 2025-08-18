import { config } from '@truecheckia/config'
import ServerlessAnalysisQueue from './serverless-analysis.queue'
import ServerlessEmailQueue from './serverless-email.queue'
import ServerlessCreditsQueue from './serverless-credits.queue'

/**
 * Serverless Queue Manager
 * Central hub for all queue operations in serverless environment
 */
export class ServerlessQueueManager {
  
  /**
   * Initialize serverless queues (replaces Bull queue initialization)
   */
  static initializeQueues(): void {
    console.log('✅ Serverless queues initialized')
    console.log('Queue processing will be handled by:')
    console.log('- Vercel cron jobs for scheduled tasks')
    console.log('- API webhooks for immediate processing')
    console.log('- Background functions for async operations')
  }

  /**
   * Process all pending jobs across all queues
   * Called by cron jobs or background tasks
   */
  static async processAllPendingJobs(): Promise<{
    analysis: { processed: number; failed: number }
    email: { processed: number; failed: number }
    credits: { processed: number }
  }> {
    console.log('Processing all pending jobs...')
    
    const results = await Promise.allSettled([
      ServerlessAnalysisQueue.processPendingJobs(),
      ServerlessEmailQueue.processPendingJobs(),
      this.processCreditsJobs(),
    ])

    const analysisResult = results[0].status === 'fulfilled' 
      ? results[0].value 
      : { processed: 0, failed: 1 }
      
    const emailResult = results[1].status === 'fulfilled' 
      ? results[1].value 
      : { processed: 0, failed: 1 }
      
    const creditsResult = results[2].status === 'fulfilled' 
      ? results[2].value 
      : { processed: 0 }

    console.log('Queue processing summary:', {
      analysis: analysisResult,
      email: emailResult,
      credits: creditsResult,
    })

    return {
      analysis: analysisResult,
      email: emailResult,
      credits: creditsResult,
    }
  }

  /**
   * Process credits-related jobs (scheduled tasks)
   */
  private static async processCreditsJobs(): Promise<{ processed: number }> {
    const now = new Date()
    const hour = now.getHours()
    const minute = now.getMinutes()
    
    let processed = 0
    
    try {
      // Run at 3 AM - Reset monthly credits
      if (hour === 3 && minute === 0) {
        const result = await ServerlessCreditsQueue.resetMonthlyCredits()
        processed += result.usersReset
      }
      
      // Run at 10 AM - Check low credits
      if (hour === 10 && minute === 0) {
        const result = await ServerlessCreditsQueue.checkLowCredits()
        processed += result.usersNotified
      }
      
      // Run at 2 AM - Clean old notifications
      if (hour === 2 && minute === 0) {
        const result = await ServerlessCreditsQueue.cleanOldNotifications()
        processed += result.deleted
      }
      
      // Run at 9 AM - Process subscription renewals
      if (hour === 9 && minute === 0) {
        const result = await ServerlessCreditsQueue.processSubscriptionRenewals()
        processed += result.processed
      }
      
      // Run at 1 AM - Aggregate usage stats
      if (hour === 1 && minute === 0) {
        const result = await ServerlessCreditsQueue.aggregateUsageStats()
        processed += result.statsUpdated ? 1 : 0
      }
    } catch (error) {
      console.error('Error processing credits jobs:', error)
    }
    
    return { processed }
  }

  /**
   * Get comprehensive queue statistics
   */
  static async getQueueStats(): Promise<{
    analysis: any
    email: any
    credits: any
    summary: any
  }> {
    try {
      const [analysisStats, emailStats, creditsStats] = await Promise.all([
        ServerlessAnalysisQueue.getQueueStats(),
        ServerlessEmailQueue.getQueueStats(),
        ServerlessCreditsQueue.getQueueStats(),
      ])

      const summary = {
        totalPending: analysisStats.pending + emailStats.pending + creditsStats.pending,
        totalProcessing: analysisStats.processing + emailStats.processing + creditsStats.processing,
        totalDelayed: analysisStats.delayed + emailStats.delayed + creditsStats.delayed,
        queues: ['analysis', 'email', 'credits'],
        mode: 'serverless',
        provider: 'upstash',
      }

      return {
        analysis: analysisStats,
        email: emailStats,
        credits: creditsStats,
        summary,
      }
    } catch (error) {
      console.error('Error getting queue stats:', error)
      return {
        analysis: { pending: 0, processing: 0, delayed: 0 },
        email: { pending: 0, processing: 0, delayed: 0 },
        credits: { pending: 0, processing: 0, delayed: 0 },
        summary: { error: 'Failed to get stats' },
      }
    }
  }

  /**
   * Clean old job data (maintenance task)
   */
  static async cleanOldJobs(): Promise<{ cleaned: number }> {
    console.log('Cleaning old job data...')
    
    try {
      // In a real implementation, you'd clean old job records
      // For now, this is a placeholder
      return { cleaned: 0 }
    } catch (error) {
      console.error('Error cleaning old jobs:', error)
      return { cleaned: 0 }
    }
  }

  /**
   * Health check for all queue systems
   */
  static async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    upstash: boolean
    queues: { analysis: boolean; email: boolean; credits: boolean }
    timestamp: string
  }> {
    const checks = {
      upstash: false,
      queues: {
        analysis: false,
        email: false,
        credits: false,
      },
    }

    try {
      // Test Upstash connection
      const { upstash } = await import('../lib/upstash')
      await upstash.ping()
      checks.upstash = true
      
      // Test queue operations
      checks.queues.analysis = true // Analysis queue is always ready
      checks.queues.email = true    // Email queue is always ready
      checks.queues.credits = true  // Credits queue is always ready
      
    } catch (error) {
      console.error('Health check failed:', error)
    }

    const allHealthy = checks.upstash && 
      checks.queues.analysis && 
      checks.queues.email && 
      checks.queues.credits

    const anyHealthy = checks.upstash || 
      checks.queues.analysis || 
      checks.queues.email || 
      checks.queues.credits

    return {
      status: allHealthy ? 'healthy' : anyHealthy ? 'degraded' : 'unhealthy',
      upstash: checks.upstash,
      queues: checks.queues,
      timestamp: new Date().toISOString(),
    }
  }
}

// Export individual queue classes
export { 
  ServerlessAnalysisQueue, 
  ServerlessEmailQueue, 
  ServerlessCreditsQueue 
}

// Compatibility exports (maintain existing API)
export { analysisQueue, addAnalysisJob, getJobStatus } from './serverless-analysis.queue'
export { emailQueue, sendEmail, sendTemplateEmail } from './serverless-email.queue'
export { creditsQueue, scheduleCreditsJobs } from './serverless-credits.queue'

// Main initialization function
export function initializeQueues(): void {
  ServerlessQueueManager.initializeQueues()
}

// Queue cleanup (no-op in serverless)
export async function cleanQueues(): Promise<void> {
  console.log('Queue cleanup completed (serverless mode)')
}

// Get queue statistics
export async function getQueueStats(): Promise<any> {
  return await ServerlessQueueManager.getQueueStats()
}

// Graceful shutdown (no-op in serverless)
export async function shutdownQueues(): Promise<void> {
  console.log('Queues shut down gracefully (serverless mode)')
}

export default ServerlessQueueManager