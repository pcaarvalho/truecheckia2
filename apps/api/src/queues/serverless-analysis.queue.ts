import { serverlessQueue } from '../lib/upstash'
import { analyzeWithOpenAI } from '../services/openai.service'
import { prisma } from '@truecheckia/database'
import { cacheSet } from '../lib/serverless-redis'
import { createHash } from 'crypto'
import { config } from '@truecheckia/config'
import { DeadLetterQueue } from '../lib/dead-letter-queue'
import { JobMonitor } from '../lib/job-monitor'

export interface AnalysisJobData {
  userId: string
  text: string
  language: string
  webhookUrl?: string
  priority?: number
  analysisId?: string
}

/**
 * Serverless Analysis Queue
 * Replaces Bull queue with webhook-based processing
 */
export class ServerlessAnalysisQueue {
  private static readonly QUEUE_NAME = 'analysis'

  /**
   * Add analysis job to queue
   */
  static async addJob(data: AnalysisJobData): Promise<string> {
    try {
      const jobId = await serverlessQueue.add(this.QUEUE_NAME, data, {
        delay: data.priority ? 0 : 1000, // High priority jobs process immediately
      })
      
      // Record job start for monitoring
      await JobMonitor.recordJobStart(jobId, this.QUEUE_NAME, data)
      
      console.log(`Added analysis job ${jobId} for user ${data.userId}`)
      return jobId
    } catch (error) {
      console.error('Failed to add analysis job:', error)
      throw error
    }
  }

  /**
   * Process analysis job (called by webhook/cron)
   */
  static async processJob(job: any): Promise<any> {
    const { userId, text, language, webhookUrl, analysisId } = job.data
    
    console.log(`Processing analysis job ${job.id} for user ${userId}`)
    
    try {
      // Record job start if not already recorded
      if (!job.isRetry) {
        await JobMonitor.recordJobStart(job.id, this.QUEUE_NAME, job.data)
      }
      // Perform analysis
      const result = await analyzeWithOpenAI(text, language)
      
      // Save to database or update existing
      let analysis
      if (analysisId) {
        // Update existing analysis (for webhook retries)
        analysis = await prisma.analysis.update({
          where: { id: analysisId },
          data: {
            aiScore: result.aiScore,
            confidence: result.confidence,
            isAiGenerated: result.isAiGenerated,
            indicators: result.indicators,
            explanation: result.explanation,
            suspiciousParts: result.suspiciousParts,
            processingTime: result.processingTime,
            cached: false,
            status: 'COMPLETED',
          },
        })
      } else {
        // Create new analysis
        analysis = await prisma.analysis.create({
          data: {
            userId,
            text: text.substring(0, 500),
            wordCount: text.split(/\s+/).length,
            charCount: text.length,
            language,
            aiScore: result.aiScore,
            confidence: result.confidence,
            isAiGenerated: result.isAiGenerated,
            indicators: result.indicators,
            explanation: result.explanation,
            suspiciousParts: result.suspiciousParts,
            processingTime: result.processingTime,
            cached: false,
            status: 'COMPLETED',
          },
        })
      }
      
      // Cache result
      const textHash = createHash('sha256').update(text).digest('hex')
      const cacheKey = `${config.cache.analysisPrefix}${textHash}`
      await cacheSet(cacheKey, result, config.cache.ttl)
      
      // Send webhook if provided
      if (webhookUrl) {
        await this.sendWebhook(webhookUrl, {
          analysisId: analysis.id,
          ...result,
        })
      }
      
      // Create notification for user
      await prisma.notification.create({
        data: {
          userId,
          type: 'ANALYSIS',
          title: 'Analysis Complete',
          message: `Your analysis has been processed. AI Score: ${result.aiScore}%`,
          metadata: {
            analysisId: analysis.id,
          },
        },
      })
      
      // Record successful completion
      await JobMonitor.recordJobCompletion(job.id, this.QUEUE_NAME, true, undefined, { analysisId: analysis.id, ...result })
      
      return { analysisId: analysis.id, ...result }
    } catch (error) {
      console.error(`Failed to process analysis job ${job.id}:`, error)
      
      // Record failed completion
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await JobMonitor.recordJobCompletion(job.id, this.QUEUE_NAME, false, errorMessage)
      
      // Update analysis status to failed if exists
      if (analysisId) {
        await prisma.analysis.update({
          where: { id: analysisId },
          data: { 
            status: 'FAILED',
            metadata: { error: errorMessage }
          },
        }).catch(console.error)
      }
      
      // Add to DLQ for retry (unless already retried max times)
      const retryCount = job.retryCount || 0
      if (retryCount < 3) {
        await DeadLetterQueue.addFailedJob(
          job.id,
          this.QUEUE_NAME,
          job.data,
          errorMessage,
          { maxRetries: 3, baseDelay: 30000 }
        )
      }
      
      throw error
    }
  }

  /**
   * Process all pending jobs (called by cron)
   */
  static async processPendingJobs(): Promise<{ processed: number; failed: number; errors: string[] }> {
    let processed = 0
    let failed = 0
    const errors: string[] = []
    const maxJobs = 10 // Prevent timeout in serverless functions

    try {
      // First, process any retry jobs
      const retryResults = await DeadLetterQueue.processRetryQueue()
      console.log(`Processed ${retryResults.processed} retry jobs, ${retryResults.failed} failed`)
      
      // Then process regular pending jobs
      for (let i = 0; i < maxJobs; i++) {
        try {
          await serverlessQueue.process(this.QUEUE_NAME, this.processJob)
          processed++
        } catch (error) {
          if (error instanceof Error && error.message.includes('No jobs available')) {
            break // No more jobs to process
          }
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          console.error('Failed to process job:', errorMsg)
          errors.push(errorMsg)
          failed++
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error in processPendingJobs:', errorMsg)
      errors.push(errorMsg)
    }

    if (processed > 0 || failed > 0) {
      console.log(`Processed ${processed} analysis jobs, ${failed} failed`)
    }

    return { processed, failed, errors }
  }

  /**
   * Get job status
   */
  static async getJobStatus(jobId: string): Promise<any> {
    return await serverlessQueue.getJobStatus(jobId)
  }

  /**
   * Send webhook notification
   */
  private static async sendWebhook(url: string, data: any): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-TrueCheckIA-Event': 'analysis.completed',
          'User-Agent': 'TrueCheckIA-Webhook/1.0',
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        console.error(`Webhook failed: ${response.status} ${response.statusText}`)
      } else {
        console.log(`Webhook sent successfully to ${url}`)
      }
    } catch (error) {
      console.error('Failed to send webhook:', error)
    }
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats(): Promise<any> {
    const [basicStats, dlqStats, monitorStats] = await Promise.all([
      serverlessQueue.getQueueStats(this.QUEUE_NAME),
      DeadLetterQueue.getStats(),
      JobMonitor.getQueueMetrics(this.QUEUE_NAME),
    ])
    
    return {
      ...basicStats,
      failed: dlqStats.queues[this.QUEUE_NAME]?.failed || 0,
      retrying: dlqStats.queues[this.QUEUE_NAME]?.retrying || 0,
      permanentFailures: dlqStats.queues[this.QUEUE_NAME]?.permanentFailures || 0,
      metrics: {
        throughput: monitorStats.throughput,
        errorRate: monitorStats.errorRate,
        avgProcessingTime: monitorStats.avgProcessingTime,
      },
    }
  }
  
  /**
   * Get comprehensive metrics for monitoring
   */
  static async getMetrics(): Promise<any> {
    return await JobMonitor.getQueueMetrics(this.QUEUE_NAME)
  }
  
  /**
   * Manual retry of failed job (admin function)
   */
  static async retryFailedJob(jobId: string): Promise<boolean> {
    return await DeadLetterQueue.manualRetry(jobId)
  }
  
  /**
   * Get failed job details
   */
  static async getFailedJob(jobId: string): Promise<any> {
    return await DeadLetterQueue.getFailedJob(jobId)
  }
}

// Maintain compatibility with existing code
export const analysisQueue = {
  add: (data: AnalysisJobData, options?: any) => 
    ServerlessAnalysisQueue.addJob({ ...data, priority: options?.priority }),
  
  getJob: (jobId: string) => 
    ServerlessAnalysisQueue.getJobStatus(jobId),
  
  process: (processor: Function) => {
    console.log('Analysis queue processor registered (serverless mode)')
    // In serverless mode, processing happens via cron/webhooks
  },
  
  on: (event: string, handler: Function) => {
    console.log(`Analysis queue event ${event} registered (serverless mode)`)
  },
  
  getWaitingCount: async () => {
    const stats = await ServerlessAnalysisQueue.getQueueStats()
    return stats.pending
  },
  
  getActiveCount: async () => {
    const stats = await ServerlessAnalysisQueue.getQueueStats()
    return stats.processing
  },
  
  getCompletedCount: async () => 0, // Not tracked in serverless mode
  getFailedCount: async () => 0,    // Not tracked in serverless mode
  getDelayedCount: async () => {
    const stats = await ServerlessAnalysisQueue.getQueueStats()
    return stats.delayed
  },
  
  clean: () => Promise.resolve(),
  close: () => Promise.resolve(),
}

export async function addAnalysisJob(data: AnalysisJobData): Promise<string> {
  return await ServerlessAnalysisQueue.addJob(data)
}

export async function getJobStatus(jobId: string): Promise<any> {
  return await ServerlessAnalysisQueue.getJobStatus(jobId)
}

export default ServerlessAnalysisQueue