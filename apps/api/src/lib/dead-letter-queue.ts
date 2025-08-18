import { upstash, serverlessCache } from './upstash'
import { config } from '@truecheckia/config'

/**
 * Dead Letter Queue (DLQ) System for Serverless Environment
 * Handles failed jobs with retry logic and monitoring
 */

export interface FailedJob {
  id: string
  originalQueue: string
  data: any
  error: string
  failedAt: number
  retryCount: number
  maxRetries: number
  createdAt: number
  lastRetryAt?: number
  nextRetryAt?: number
  metadata?: Record<string, any>
}

export interface RetryConfig {
  maxRetries: number
  baseDelay: number // milliseconds
  maxDelay: number // milliseconds
  exponentialBackoff: boolean
  jitter: boolean
}

export class DeadLetterQueue {
  private static readonly DLQ_PREFIX = 'dlq'
  private static readonly FAILED_JOBS_PREFIX = 'failed-job'
  private static readonly RETRY_JOBS_PREFIX = 'retry-job'
  private static readonly METRICS_PREFIX = 'dlq-metrics'
  
  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 30000, // 30 seconds
    maxDelay: 300000, // 5 minutes
    exponentialBackoff: true,
    jitter: true,
  }

  /**
   * Add a failed job to the DLQ
   */
  static async addFailedJob(
    jobId: string,
    originalQueue: string,
    data: any,
    error: string,
    retryConfig: Partial<RetryConfig> = {}
  ): Promise<string> {
    const config = { ...this.DEFAULT_RETRY_CONFIG, ...retryConfig }
    const now = Date.now()
    
    const failedJob: FailedJob = {
      id: jobId,
      originalQueue,
      data,
      error,
      failedAt: now,
      retryCount: 0,
      maxRetries: config.maxRetries,
      createdAt: now,
      metadata: {
        config,
        environment: process.env.NODE_ENV,
        version: '1.0.0',
      },
    }

    try {
      // Store failed job details
      await upstash.hset(`${this.FAILED_JOBS_PREFIX}:${jobId}`, {
        data: JSON.stringify(failedJob),
        status: 'failed',
        lastUpdated: now.toString(),
      })

      // Add to DLQ list for processing
      await upstash.lpush(`${this.DLQ_PREFIX}:${originalQueue}`, jobId)

      // Update metrics
      await this.updateMetrics(originalQueue, 'failed', 1)

      console.log(`Job ${jobId} added to DLQ for queue ${originalQueue}`)
      return jobId
    } catch (err) {
      console.error('Failed to add job to DLQ:', err)
      throw err
    }
  }

  /**
   * Schedule a job for retry
   */
  static async scheduleRetry(
    jobId: string,
    retryCount: number,
    config: RetryConfig
  ): Promise<void> {
    const delay = this.calculateRetryDelay(retryCount, config)
    const nextRetryAt = Date.now() + delay

    try {
      // Add to retry schedule (sorted set with score = retry time)
      await upstash.zadd(`${this.RETRY_JOBS_PREFIX}:schedule`, {
        score: nextRetryAt,
        member: jobId,
      })

      // Update job status
      await upstash.hset(`${this.FAILED_JOBS_PREFIX}:${jobId}`, {
        status: 'scheduled-retry',
        nextRetryAt: nextRetryAt.toString(),
        retryCount: retryCount.toString(),
        lastUpdated: Date.now().toString(),
      })

      console.log(`Job ${jobId} scheduled for retry in ${delay}ms`)
    } catch (error) {
      console.error('Failed to schedule retry:', error)
      throw error
    }
  }

  /**
   * Process retry queue - move ready jobs back to original queue
   */
  static async processRetryQueue(): Promise<{
    processed: number
    failed: number
    errors: string[]
  }> {
    const results = { processed: 0, failed: 0, errors: [] as string[] }
    
    try {
      const now = Date.now()
      
      // Get jobs ready for retry
      const readyJobs = await upstash.zrangebyscore(
        `${this.RETRY_JOBS_PREFIX}:schedule`,
        0,
        now,
        { withScores: true }
      )

      for (let i = 0; i < readyJobs.length; i += 2) {
        const jobId = readyJobs[i] as string
        
        try {
          await this.retryJob(jobId)
          results.processed++
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          results.errors.push(`Job ${jobId}: ${errorMsg}`)
          results.failed++
        }
      }

      console.log(`Processed ${results.processed} retry jobs, ${results.failed} failed`)
      return results
    } catch (error) {
      console.error('Error processing retry queue:', error)
      results.errors.push(error instanceof Error ? error.message : 'Unknown error')
      return results
    }
  }

  /**
   * Retry a specific job
   */
  private static async retryJob(jobId: string): Promise<void> {
    const jobData = await upstash.hgetall(`${this.FAILED_JOBS_PREFIX}:${jobId}`)
    if (!jobData.data) {
      throw new Error(`Job ${jobId} not found in DLQ`)
    }

    const failedJob: FailedJob = JSON.parse(jobData.data)
    
    if (failedJob.retryCount >= failedJob.maxRetries) {
      // Move to permanent failure
      await this.moveToPermanentFailure(jobId, failedJob)
      return
    }

    try {
      // Increment retry count
      failedJob.retryCount++
      failedJob.lastRetryAt = Date.now()

      // Add back to original queue
      await upstash.lpush(`queue:${failedJob.originalQueue}:pending`, JSON.stringify({
        id: failedJob.id,
        data: failedJob.data,
        queueName: failedJob.originalQueue,
        createdAt: failedJob.createdAt,
        retryCount: failedJob.retryCount,
        isRetry: true,
      }))

      // Update job status
      await upstash.hset(`${this.FAILED_JOBS_PREFIX}:${jobId}`, {
        data: JSON.stringify(failedJob),
        status: 'retrying',
        lastUpdated: Date.now().toString(),
      })

      // Remove from retry schedule
      await upstash.zrem(`${this.RETRY_JOBS_PREFIX}:schedule`, jobId)

      // Update metrics
      await this.updateMetrics(failedJob.originalQueue, 'retried', 1)

      console.log(`Job ${jobId} retried (attempt ${failedJob.retryCount}/${failedJob.maxRetries})`)
    } catch (error) {
      console.error(`Failed to retry job ${jobId}:`, error)
      throw error
    }
  }

  /**
   * Move job to permanent failure when max retries exceeded
   */
  private static async moveToPermanentFailure(jobId: string, failedJob: FailedJob): Promise<void> {
    try {
      // Update status to permanent failure
      await upstash.hset(`${this.FAILED_JOBS_PREFIX}:${jobId}`, {
        status: 'permanent-failure',
        lastUpdated: Date.now().toString(),
      })

      // Remove from retry schedule
      await upstash.zrem(`${this.RETRY_JOBS_PREFIX}:schedule`, jobId)

      // Add to permanent failure list for admin review
      await upstash.lpush(`${this.DLQ_PREFIX}:permanent-failures`, jobId)

      // Update metrics
      await this.updateMetrics(failedJob.originalQueue, 'permanent-failure', 1)

      console.log(`Job ${jobId} moved to permanent failure after ${failedJob.maxRetries} retries`)
    } catch (error) {
      console.error(`Failed to move job ${jobId} to permanent failure:`, error)
      throw error
    }
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private static calculateRetryDelay(retryCount: number, config: RetryConfig): number {
    let delay = config.baseDelay

    if (config.exponentialBackoff) {
      delay = Math.min(config.baseDelay * Math.pow(2, retryCount), config.maxDelay)
    }

    if (config.jitter) {
      // Add ±25% jitter to prevent thundering herd
      const jitterRange = delay * 0.25
      const jitter = (Math.random() - 0.5) * 2 * jitterRange
      delay = Math.max(1000, delay + jitter) // Minimum 1 second
    }

    return Math.round(delay)
  }

  /**
   * Get DLQ statistics
   */
  static async getStats(): Promise<{
    queues: Record<string, { failed: number; retrying: number; permanentFailures: number }>
    totalFailed: number
    totalRetrying: number
    totalPermanentFailures: number
    retryQueue: number
  }> {
    try {
      const stats = {
        queues: {} as Record<string, { failed: number; retrying: number; permanentFailures: number }>,
        totalFailed: 0,
        totalRetrying: 0,
        totalPermanentFailures: 0,
        retryQueue: 0,
      }

      // Get retry queue size
      stats.retryQueue = await upstash.zcard(`${this.RETRY_JOBS_PREFIX}:schedule`)

      // Get permanent failures
      stats.totalPermanentFailures = await upstash.llen(`${this.DLQ_PREFIX}:permanent-failures`)

      // Get per-queue metrics
      const queueKeys = await upstash.keys(`${this.DLQ_PREFIX}:*`)
      for (const key of queueKeys) {
        if (key.endsWith(':permanent-failures')) continue
        
        const queueName = key.replace(`${this.DLQ_PREFIX}:`, '')
        const failed = await upstash.llen(key)
        
        stats.queues[queueName] = {
          failed,
          retrying: 0, // Will be calculated from retry schedule
          permanentFailures: 0,
        }
        
        stats.totalFailed += failed
      }

      return stats
    } catch (error) {
      console.error('Error getting DLQ stats:', error)
      return {
        queues: {},
        totalFailed: 0,
        totalRetrying: 0,
        totalPermanentFailures: 0,
        retryQueue: 0,
      }
    }
  }

  /**
   * Get failed job details
   */
  static async getFailedJob(jobId: string): Promise<FailedJob | null> {
    try {
      const jobData = await upstash.hgetall(`${this.FAILED_JOBS_PREFIX}:${jobId}`)
      if (!jobData.data) return null

      return JSON.parse(jobData.data)
    } catch (error) {
      console.error(`Error getting failed job ${jobId}:`, error)
      return null
    }
  }

  /**
   * Manually retry a specific job (admin function)
   */
  static async manualRetry(jobId: string): Promise<boolean> {
    try {
      const failedJob = await this.getFailedJob(jobId)
      if (!failedJob) {
        console.log(`Job ${jobId} not found in DLQ`)
        return false
      }

      await this.retryJob(jobId)
      return true
    } catch (error) {
      console.error(`Manual retry failed for job ${jobId}:`, error)
      return false
    }
  }

  /**
   * Purge old failed jobs (maintenance)
   */
  static async purgeOldJobs(olderThanDays: number = 7): Promise<{ purged: number }> {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000)
    let purged = 0

    try {
      const failedJobKeys = await upstash.keys(`${this.FAILED_JOBS_PREFIX}:*`)
      
      for (const key of failedJobKeys) {
        const jobData = await upstash.hgetall(key)
        if (jobData.data) {
          const failedJob: FailedJob = JSON.parse(jobData.data)
          if (failedJob.failedAt < cutoffTime) {
            const jobId = key.replace(`${this.FAILED_JOBS_PREFIX}:`, '')
            
            // Remove from all relevant lists and sets
            await Promise.all([
              upstash.del(key),
              upstash.zrem(`${this.RETRY_JOBS_PREFIX}:schedule`, jobId),
            ])
            
            purged++
          }
        }
      }

      console.log(`Purged ${purged} old failed jobs`)
      return { purged }
    } catch (error) {
      console.error('Error purging old jobs:', error)
      return { purged: 0 }
    }
  }

  /**
   * Update metrics for monitoring
   */
  private static async updateMetrics(queue: string, action: string, count: number): Promise<void> {
    try {
      const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      const hour = new Date().getHours()
      
      await Promise.all([
        // Daily metrics
        upstash.hincrby(`${this.METRICS_PREFIX}:daily:${date}`, `${queue}:${action}`, count),
        // Hourly metrics
        upstash.hincrby(`${this.METRICS_PREFIX}:hourly:${date}:${hour}`, `${queue}:${action}`, count),
        // Set expiration for metrics (30 days)
        upstash.expire(`${this.METRICS_PREFIX}:daily:${date}`, 30 * 24 * 60 * 60),
        upstash.expire(`${this.METRICS_PREFIX}:hourly:${date}:${hour}`, 30 * 24 * 60 * 60),
      ])
    } catch (error) {
      console.error('Failed to update DLQ metrics:', error)
    }
  }

  /**
   * Get metrics for monitoring dashboard
   */
  static async getMetrics(days: number = 7): Promise<{
    daily: Record<string, Record<string, number>>
    summary: Record<string, number>
  }> {
    try {
      const metrics = { daily: {} as Record<string, Record<string, number>>, summary: {} as Record<string, number> }
      
      for (let i = 0; i < days; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        
        const dailyMetrics = await upstash.hgetall(`${this.METRICS_PREFIX}:daily:${dateStr}`)
        metrics.daily[dateStr] = {}
        
        Object.entries(dailyMetrics).forEach(([key, value]) => {
          const numValue = parseInt(value as string) || 0
          metrics.daily[dateStr][key] = numValue
          metrics.summary[key] = (metrics.summary[key] || 0) + numValue
        })
      }

      return metrics
    } catch (error) {
      console.error('Error getting DLQ metrics:', error)
      return { daily: {}, summary: {} }
    }
  }
}

export default DeadLetterQueue