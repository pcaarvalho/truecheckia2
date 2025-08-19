// @ts-nocheck
import { Router } from 'express'
import { Request, Response } from 'express'
import { config } from '@truecheckia/config'
import ServerlessQueueManager from '../queues/serverless-index'
import ServerlessAnalysisQueue from '../queues/serverless-analysis.queue'
import ServerlessEmailQueue from '../queues/serverless-email.queue'
import ServerlessCreditsQueue from '../queues/serverless-credits.queue'

const router = Router()

/**
 * Webhook authentication middleware
 */
function authenticateWebhook(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization
  const expectedSecret = config.vercel.webhookSecret
  
  if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid webhook secret' 
    })
  }
  
  next()
}

/**
 * Cron job authentication middleware
 */
function authenticateCron(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization
  const expectedSecret = config.vercel.cronSecret
  
  if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid cron secret' 
    })
  }
  
  next()
}

/**
 * Process analysis queue webhook
 * POST /webhooks/process-analysis
 */
router.post('/process-analysis', authenticateWebhook, async (req: Request, res: Response) => {
  try {
    const result = await ServerlessAnalysisQueue.processPendingJobs()
    
    res.json({
      success: true,
      message: 'Analysis jobs processed',
      data: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error processing analysis jobs:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to process analysis jobs',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * Process email queue webhook
 * POST /webhooks/process-emails
 */
router.post('/process-emails', authenticateWebhook, async (req: Request, res: Response) => {
  try {
    const result = await ServerlessEmailQueue.processPendingJobs()
    
    res.json({
      success: true,
      message: 'Email jobs processed',
      data: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error processing email jobs:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to process email jobs',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * Process all pending jobs (combined webhook)
 * POST /webhooks/process-all
 */
router.post('/process-all', authenticateWebhook, async (req: Request, res: Response) => {
  try {
    const result = await ServerlessQueueManager.processAllPendingJobs()
    
    res.json({
      success: true,
      message: 'All jobs processed',
      data: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error processing all jobs:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to process all jobs',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * Health check webhook
 * GET /webhooks/health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await ServerlessQueueManager.healthCheck()
    
    res.status(health.status === 'healthy' ? 200 : 503).json({
      success: health.status === 'healthy',
      data: health,
    })
  } catch (error) {
    console.error('Health check failed:', error)
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// =============================================================================
// CRON JOB ENDPOINTS
// =============================================================================

/**
 * Daily credits reset cron job
 * POST /webhooks/cron/reset-credits
 * Runs daily at 3 AM
 */
router.post('/cron/reset-credits', authenticateCron, async (req: Request, res: Response) => {
  try {
    const result = await ServerlessCreditsQueue.resetMonthlyCredits()
    
    res.json({
      success: true,
      message: 'Monthly credits reset completed',
      data: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error resetting credits:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to reset credits',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * Check low credits cron job
 * POST /webhooks/cron/check-low-credits
 * Runs daily at 10 AM
 */
router.post('/cron/check-low-credits', authenticateCron, async (req: Request, res: Response) => {
  try {
    const result = await ServerlessCreditsQueue.checkLowCredits()
    
    res.json({
      success: true,
      message: 'Low credits check completed',
      data: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error checking low credits:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to check low credits',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * Clean old notifications cron job
 * POST /webhooks/cron/clean-notifications
 * Runs daily at 2 AM
 */
router.post('/cron/clean-notifications', authenticateCron, async (req: Request, res: Response) => {
  try {
    const result = await ServerlessCreditsQueue.cleanOldNotifications()
    
    res.json({
      success: true,
      message: 'Old notifications cleanup completed',
      data: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error cleaning notifications:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to clean notifications',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * Process subscription renewals cron job
 * POST /webhooks/cron/process-renewals
 * Runs daily at 9 AM
 */
router.post('/cron/process-renewals', authenticateCron, async (req: Request, res: Response) => {
  try {
    const result = await ServerlessCreditsQueue.processSubscriptionRenewals()
    
    res.json({
      success: true,
      message: 'Subscription renewals processed',
      data: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error processing renewals:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to process renewals',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * Aggregate usage statistics cron job
 * POST /webhooks/cron/aggregate-stats
 * Runs daily at 1 AM
 */
router.post('/cron/aggregate-stats', authenticateCron, async (req: Request, res: Response) => {
  try {
    const result = await ServerlessCreditsQueue.aggregateUsageStats()
    
    res.json({
      success: true,
      message: 'Usage statistics aggregated',
      data: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error aggregating stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to aggregate stats',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * General queue maintenance cron job
 * POST /webhooks/cron/maintenance
 * Runs every hour
 */
router.post('/cron/maintenance', authenticateCron, async (req: Request, res: Response) => {
  try {
    // Process pending jobs
    const queueResult = await ServerlessQueueManager.processAllPendingJobs()
    
    // Clean old job data
    const cleanResult = await ServerlessQueueManager.cleanOldJobs()
    
    res.json({
      success: true,
      message: 'Maintenance completed',
      data: {
        queues: queueResult,
        cleanup: cleanResult,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error during maintenance:', error)
    res.status(500).json({
      success: false,
      error: 'Maintenance failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * Get queue statistics
 * GET /webhooks/stats
 */
router.get('/stats', authenticateWebhook, async (req: Request, res: Response) => {
  try {
    const stats = await ServerlessQueueManager.getQueueStats()
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error getting queue stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get queue stats',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * Manual job trigger (for testing)
 * POST /webhooks/trigger/:jobType
 */
router.post('/trigger/:jobType', authenticateWebhook, async (req: Request, res: Response) => {
  const { jobType } = req.params
  const { data } = req.body
  
  try {
    let result
    
    switch (jobType) {
      case 'analysis':
        result = await ServerlessAnalysisQueue.addJob(data)
        break
      case 'email':
        result = await ServerlessEmailQueue.addJob(data)
        break
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid job type',
          validTypes: ['analysis', 'email'],
        })
    }
    
    res.json({
      success: true,
      message: `${jobType} job triggered`,
      data: { jobId: result },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error(`Error triggering ${jobType} job:`, error)
    res.status(500).json({
      success: false,
      error: `Failed to trigger ${jobType} job`,
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export default router