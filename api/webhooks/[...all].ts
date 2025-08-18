import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { config } from '@truecheckia/config'
import ServerlessQueueManager from '../../apps/api/src/queues/serverless-index'
import ServerlessAnalysisQueue from '../../apps/api/src/queues/serverless-analysis.queue'
import ServerlessEmailQueue from '../../apps/api/src/queues/serverless-email.queue'
import ServerlessCreditsQueue from '../../apps/api/src/queues/serverless-credits.queue'

// Webhook authentication middleware
function authenticateWebhook(req: any, res: any, next: () => void) {
  const authHeader = req.headers.authorization
  const expectedSecret = config.vercel.webhookSecret
  
  if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid webhook secret' 
    })
    return
  }
  
  next()
}

// Cron job authentication middleware
function authenticateCron(req: any, res: any, next: () => void) {
  const authHeader = req.headers.authorization
  const expectedSecret = config.vercel.cronSecret
  
  if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid cron secret' 
    })
    return
  }
  
  next()
}

// Main handler that routes to different webhook endpoints
const handler = async (req: VercelRequest, res: VercelResponse) => {
  // Extract the endpoint from the path
  const pathParts = req.url?.split('/') || []
  const endpoint = pathParts[pathParts.length - 1]
  const isCron = pathParts.includes('cron')

  try {
    switch (endpoint) {
      // Queue processing webhooks
      case 'process-analysis':
        if (!authenticateWebhookRequest(req, res)) return
        return await processAnalysisJobs(req, res)

      case 'process-emails':
        if (!authenticateWebhookRequest(req, res)) return
        return await processEmailJobs(req, res)

      case 'process-all':
        if (!authenticateWebhookRequest(req, res)) return
        return await processAllJobs(req, res)

      case 'health':
        return await healthCheck(req, res)

      case 'stats':
        if (!authenticateWebhookRequest(req, res)) return
        return await getQueueStats(req, res)

      // Cron job endpoints
      case 'reset-credits':
        if (!authenticateCronRequest(req, res)) return
        return await resetCredits(req, res)

      case 'check-low-credits':
        if (!authenticateCronRequest(req, res)) return
        return await checkLowCredits(req, res)

      case 'clean-notifications':
        if (!authenticateCronRequest(req, res)) return
        return await cleanNotifications(req, res)

      case 'process-renewals':
        if (!authenticateCronRequest(req, res)) return
        return await processRenewals(req, res)

      case 'aggregate-stats':
        if (!authenticateCronRequest(req, res)) return
        return await aggregateStats(req, res)

      case 'maintenance':
        if (!authenticateCronRequest(req, res)) return
        return await maintenance(req, res)

      default:
        // Handle dynamic trigger endpoints
        if (pathParts.includes('trigger')) {
          const jobType = pathParts[pathParts.indexOf('trigger') + 1]
          if (!authenticateWebhookRequest(req, res)) return
          return await triggerJob(req, res, jobType)
        }

        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Webhook endpoint not found',
          },
        })
    }
  } catch (error) {
    console.error('Webhook error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

// Helper functions
function authenticateWebhookRequest(req: VercelRequest, res: VercelResponse): boolean {
  const authHeader = req.headers.authorization
  const expectedSecret = config.vercel.webhookSecret
  
  if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid webhook secret' 
    })
    return false
  }
  
  return true
}

function authenticateCronRequest(req: VercelRequest, res: VercelResponse): boolean {
  const authHeader = req.headers.authorization
  const expectedSecret = config.vercel.cronSecret
  
  if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid cron secret' 
    })
    return false
  }
  
  return true
}

async function processAnalysisJobs(req: VercelRequest, res: VercelResponse) {
  const result = await ServerlessAnalysisQueue.processPendingJobs()
  res.json({
    success: true,
    message: 'Analysis jobs processed',
    data: result,
    timestamp: new Date().toISOString(),
  })
}

async function processEmailJobs(req: VercelRequest, res: VercelResponse) {
  const result = await ServerlessEmailQueue.processPendingJobs()
  res.json({
    success: true,
    message: 'Email jobs processed',
    data: result,
    timestamp: new Date().toISOString(),
  })
}

async function processAllJobs(req: VercelRequest, res: VercelResponse) {
  const result = await ServerlessQueueManager.processAllPendingJobs()
  res.json({
    success: true,
    message: 'All jobs processed',
    data: result,
    timestamp: new Date().toISOString(),
  })
}

async function healthCheck(req: VercelRequest, res: VercelResponse) {
  const health = await ServerlessQueueManager.healthCheck()
  res.status(health.status === 'healthy' ? 200 : 503).json({
    success: health.status === 'healthy',
    data: health,
  })
}

async function getQueueStats(req: VercelRequest, res: VercelResponse) {
  const stats = await ServerlessQueueManager.getQueueStats()
  res.json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString(),
  })
}

async function resetCredits(req: VercelRequest, res: VercelResponse) {
  const result = await ServerlessCreditsQueue.resetMonthlyCredits()
  res.json({
    success: true,
    message: 'Monthly credits reset completed',
    data: result,
    timestamp: new Date().toISOString(),
  })
}

async function checkLowCredits(req: VercelRequest, res: VercelResponse) {
  const result = await ServerlessCreditsQueue.checkLowCredits()
  res.json({
    success: true,
    message: 'Low credits check completed',
    data: result,
    timestamp: new Date().toISOString(),
  })
}

async function cleanNotifications(req: VercelRequest, res: VercelResponse) {
  const result = await ServerlessCreditsQueue.cleanOldNotifications()
  res.json({
    success: true,
    message: 'Old notifications cleanup completed',
    data: result,
    timestamp: new Date().toISOString(),
  })
}

async function processRenewals(req: VercelRequest, res: VercelResponse) {
  const result = await ServerlessCreditsQueue.processSubscriptionRenewals()
  res.json({
    success: true,
    message: 'Subscription renewals processed',
    data: result,
    timestamp: new Date().toISOString(),
  })
}

async function aggregateStats(req: VercelRequest, res: VercelResponse) {
  const result = await ServerlessCreditsQueue.aggregateUsageStats()
  res.json({
    success: true,
    message: 'Usage statistics aggregated',
    data: result,
    timestamp: new Date().toISOString(),
  })
}

async function maintenance(req: VercelRequest, res: VercelResponse) {
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
}

async function triggerJob(req: VercelRequest, res: VercelResponse, jobType: string) {
  const { data } = req.body || {}
  
  let result
  
  switch (jobType) {
    case 'analysis':
      result = await ServerlessAnalysisQueue.addJob(data)
      break
    case 'email':
      result = await ServerlessEmailQueue.addJob(data)
      break
    default:
      res.status(400).json({
        success: false,
        error: 'Invalid job type',
        validTypes: ['analysis', 'email'],
      })
      return
  }
  
  res.json({
    success: true,
    message: `${jobType} job triggered`,
    data: { jobId: result },
    timestamp: new Date().toISOString(),
  })
}

export default handler