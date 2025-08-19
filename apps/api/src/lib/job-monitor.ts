// @ts-nocheck
import { upstash, serverlessCache } from './upstash'
import { DeadLetterQueue } from './dead-letter-queue'
import { config } from '@truecheckia/config'

/**
 * Job Monitoring System for Serverless Queues
 * Provides comprehensive monitoring, metrics, and alerting
 */

export interface JobMetrics {
  totalJobs: number
  successfulJobs: number
  failedJobs: number
  processingJobs: number
  averageProcessingTime: number
  successRate: number
  queues: Record<string, QueueMetrics>
}

export interface QueueMetrics {
  name: string
  pending: number
  processing: number
  delayed: number
  completed: number
  failed: number
  avgProcessingTime: number
  throughput: number // jobs per hour
  errorRate: number
  lastProcessed?: string
}

export interface PerformanceMetrics {
  latency: {
    p50: number
    p95: number
    p99: number
  }
  throughput: {
    last1h: number
    last24h: number
    last7d: number
  }
  errors: {
    rate: number
    types: Record<string, number>
  }
}

export interface Alert {
  id: string
  type: 'error_rate' | 'latency' | 'throughput' | 'queue_size' | 'dlq_size'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  queue?: string
  value: number
  threshold: number
  timestamp: number
  acknowledged: boolean
}

export class JobMonitor {
  private static readonly METRICS_PREFIX = 'job-metrics'
  private static readonly PERFORMANCE_PREFIX = 'perf-metrics'
  private static readonly ALERTS_PREFIX = 'alerts'
  private static readonly LATENCY_SAMPLES_KEY = 'latency-samples'
  
  // Alert thresholds
  private static readonly THRESHOLDS = {
    ERROR_RATE: 0.05, // 5%
    HIGH_LATENCY_P95: 30000, // 30 seconds
    LOW_THROUGHPUT: 10, // jobs per hour
    LARGE_QUEUE_SIZE: 100,
    LARGE_DLQ_SIZE: 10,
  }

  /**
   * Record job start
   */
  static async recordJobStart(jobId: string, queueName: string, data?: any): Promise<void> {
    const timestamp = Date.now()
    
    try {
      await Promise.all([
        // Store job metadata
        upstash.hset(`job:${jobId}:metadata`, {
          queueName,
          startTime: timestamp.toString(),
          status: 'processing',
          data: data ? JSON.stringify(data) : '',
        }),
        
        // Update queue processing count
        upstash.incr(`${this.METRICS_PREFIX}:${queueName}:processing`),
        
        // Add to processing set for tracking
        upstash.sadd(`processing:${queueName}`, jobId),
      ])

      // Set expiration for processing tracking (cleanup if job hangs)
      await upstash.expire(`job:${jobId}:metadata`, 3600) // 1 hour
    } catch (error) {
      console.error('Failed to record job start:', error)
    }
  }

  /**
   * Record job completion
   */
  static async recordJobCompletion(
    jobId: string, 
    queueName: string, 
    success: boolean, 
    error?: string,
    result?: any
  ): Promise<void> {
    const endTime = Date.now()
    
    try {
      // Get job metadata to calculate processing time
      const metadata = await upstash.hgetall(`job:${jobId}:metadata`)
      const startTime = metadata.startTime ? parseInt(metadata.startTime) : endTime
      const processingTime = endTime - startTime

      await Promise.all([
        // Update job metadata
        upstash.hset(`job:${jobId}:metadata`, {
          endTime: endTime.toString(),
          processingTime: processingTime.toString(),
          status: success ? 'completed' : 'failed',
          error: error || '',
          result: result ? JSON.stringify(result) : '',
        }),
        
        // Update queue metrics
        success 
          ? upstash.incr(`${this.METRICS_PREFIX}:${queueName}:completed`)
          : upstash.incr(`${this.METRICS_PREFIX}:${queueName}:failed`),
        
        // Decrement processing count
        upstash.decr(`${this.METRICS_PREFIX}:${queueName}:processing`),
        
        // Remove from processing set
        upstash.srem(`processing:${queueName}`, jobId),
        
        // Record processing time for latency metrics
        this.recordLatencySample(queueName, processingTime),
      ])

      // Update hourly throughput
      await this.updateThroughputMetrics(queueName)

      // Check for alerts
      await this.checkAlerts(queueName)

    } catch (err) {
      console.error('Failed to record job completion:', err)
    }
  }

  /**
   * Record latency sample for percentile calculations
   */
  private static async recordLatencySample(queueName: string, processingTime: number): Promise<void> {
    try {
      const hour = Math.floor(Date.now() / (1000 * 60 * 60))
      const key = `${this.LATENCY_SAMPLES_KEY}:${queueName}:${hour}`
      
      // Add sample to sorted set (score = processing time)
      await upstash.zadd(key, { score: processingTime, member: `${Date.now()}-${Math.random()}` })
      
      // Keep only last 1000 samples per hour
      await upstash.zremrangebyrank(key, 0, -1001)
      
      // Set expiration (keep for 24 hours)
      await upstash.expire(key, 24 * 60 * 60)
    } catch (error) {
      console.error('Failed to record latency sample:', error)
    }
  }

  /**
   * Update throughput metrics
   */
  private static async updateThroughputMetrics(queueName: string): Promise<void> {
    try {
      const hour = Math.floor(Date.now() / (1000 * 60 * 60))
      const day = Math.floor(Date.now() / (1000 * 60 * 60 * 24))
      
      await Promise.all([
        upstash.incr(`${this.METRICS_PREFIX}:throughput:${queueName}:hour:${hour}`),
        upstash.incr(`${this.METRICS_PREFIX}:throughput:${queueName}:day:${day}`),
        upstash.expire(`${this.METRICS_PREFIX}:throughput:${queueName}:hour:${hour}`, 7 * 24 * 60 * 60),
        upstash.expire(`${this.METRICS_PREFIX}:throughput:${queueName}:day:${day}`, 30 * 24 * 60 * 60),
      ])
    } catch (error) {
      console.error('Failed to update throughput metrics:', error)
    }
  }

  /**
   * Get comprehensive job metrics
   */
  static async getJobMetrics(): Promise<JobMetrics> {
    try {
      const queueNames = ['analysis', 'email', 'credits']
      const metrics: JobMetrics = {
        totalJobs: 0,
        successfulJobs: 0,
        failedJobs: 0,
        processingJobs: 0,
        averageProcessingTime: 0,
        successRate: 0,
        queues: {},
      }

      for (const queueName of queueNames) {
        const queueMetrics = await this.getQueueMetrics(queueName)
        metrics.queues[queueName] = queueMetrics
        
        metrics.totalJobs += queueMetrics.completed + queueMetrics.failed
        metrics.successfulJobs += queueMetrics.completed
        metrics.failedJobs += queueMetrics.failed
        metrics.processingJobs += queueMetrics.processing
      }

      metrics.successRate = metrics.totalJobs > 0 
        ? metrics.successfulJobs / metrics.totalJobs 
        : 0

      // Calculate overall average processing time
      const totalProcessingTime = Object.values(metrics.queues)
        .reduce((sum, queue) => sum + (queue.avgProcessingTime * queue.completed), 0)
      metrics.averageProcessingTime = metrics.successfulJobs > 0 
        ? totalProcessingTime / metrics.successfulJobs 
        : 0

      return metrics
    } catch (error) {
      console.error('Error getting job metrics:', error)
      return {
        totalJobs: 0,
        successfulJobs: 0,
        failedJobs: 0,
        processingJobs: 0,
        averageProcessingTime: 0,
        successRate: 0,
        queues: {},
      }
    }
  }

  /**
   * Get metrics for a specific queue
   */
  static async getQueueMetrics(queueName: string): Promise<QueueMetrics> {
    try {
      const [
        pending,
        processing,
        delayed,
        completed,
        failed,
        throughput1h,
        latencyStats,
      ] = await Promise.all([
        upstash.llen(`queue:${queueName}:pending`),
        upstash.get(`${this.METRICS_PREFIX}:${queueName}:processing`).then(v => parseInt(v as string) || 0),
        upstash.zcard(`queue:${queueName}:delayed`),
        upstash.get(`${this.METRICS_PREFIX}:${queueName}:completed`).then(v => parseInt(v as string) || 0),
        upstash.get(`${this.METRICS_PREFIX}:${queueName}:failed`).then(v => parseInt(v as string) || 0),
        this.getThroughput(queueName, 1),
        this.getLatencyStats(queueName),
      ])

      const errorRate = (completed + failed) > 0 ? failed / (completed + failed) : 0

      return {
        name: queueName,
        pending,
        processing,
        delayed,
        completed,
        failed,
        avgProcessingTime: latencyStats.avg,
        throughput: throughput1h,
        errorRate,
      }
    } catch (error) {
      console.error(`Error getting metrics for queue ${queueName}:`, error)
      return {
        name: queueName,
        pending: 0,
        processing: 0,
        delayed: 0,
        completed: 0,
        failed: 0,
        avgProcessingTime: 0,
        throughput: 0,
        errorRate: 0,
      }
    }
  }

  /**
   * Get performance metrics
   */
  static async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      const queueNames = ['analysis', 'email', 'credits']
      const allLatencies: number[] = []
      
      // Collect latency samples from all queues
      for (const queueName of queueNames) {
        const latencies = await this.getLatencySamples(queueName)
        allLatencies.push(...latencies)
      }

      allLatencies.sort((a, b) => a - b)

      const latency = {
        p50: this.calculatePercentile(allLatencies, 0.5),
        p95: this.calculatePercentile(allLatencies, 0.95),
        p99: this.calculatePercentile(allLatencies, 0.99),
      }

      // Calculate throughput across all queues
      const throughput = {
        last1h: 0,
        last24h: 0,
        last7d: 0,
      }

      for (const queueName of queueNames) {
        throughput.last1h += await this.getThroughput(queueName, 1)
        throughput.last24h += await this.getThroughput(queueName, 24)
        throughput.last7d += await this.getThroughput(queueName, 24 * 7)
      }

      // Get error information
      const dlqStats = await DeadLetterQueue.getStats()
      const totalJobs = throughput.last24h
      const errors = {
        rate: totalJobs > 0 ? dlqStats.totalFailed / totalJobs : 0,
        types: {} as Record<string, number>,
      }

      return { latency, throughput, errors }
    } catch (error) {
      console.error('Error getting performance metrics:', error)
      return {
        latency: { p50: 0, p95: 0, p99: 0 },
        throughput: { last1h: 0, last24h: 0, last7d: 0 },
        errors: { rate: 0, types: {} },
      }
    }
  }

  /**
   * Get latency samples for a queue
   */
  private static async getLatencySamples(queueName: string, hours: number = 1): Promise<number[]> {
    try {
      const currentHour = Math.floor(Date.now() / (1000 * 60 * 60))
      const samples: number[] = []

      for (let i = 0; i < hours; i++) {
        const hour = currentHour - i
        const key = `${this.LATENCY_SAMPLES_KEY}:${queueName}:${hour}`
        const hourSamples = await upstash.zrange(key, 0, -1, { withScores: true })
        
        for (let j = 1; j < hourSamples.length; j += 2) {
          samples.push(hourSamples[j] as number)
        }
      }

      return samples
    } catch (error) {
      console.error('Error getting latency samples:', error)
      return []
    }
  }

  /**
   * Get latency statistics for a queue
   */
  private static async getLatencyStats(queueName: string): Promise<{ avg: number; min: number; max: number }> {
    const samples = await this.getLatencySamples(queueName, 1)
    
    if (samples.length === 0) {
      return { avg: 0, min: 0, max: 0 }
    }

    const sum = samples.reduce((a, b) => a + b, 0)
    return {
      avg: sum / samples.length,
      min: Math.min(...samples),
      max: Math.max(...samples),
    }
  }

  /**
   * Get throughput for a queue
   */
  private static async getThroughput(queueName: string, hours: number): Promise<number> {
    try {
      const currentHour = Math.floor(Date.now() / (1000 * 60 * 60))
      let total = 0

      for (let i = 0; i < hours; i++) {
        const hour = currentHour - i
        const count = await upstash.get(`${this.METRICS_PREFIX}:throughput:${queueName}:hour:${hour}`)
        total += parseInt(count as string) || 0
      }

      return total
    } catch (error) {
      console.error('Error getting throughput:', error)
      return 0
    }
  }

  /**
   * Calculate percentile from sorted array
   */
  private static calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0
    
    const index = percentile * (sortedArray.length - 1)
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    const weight = index % 1

    if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1]
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight
  }

  /**
   * Check for alerts based on current metrics
   */
  private static async checkAlerts(queueName?: string): Promise<void> {
    try {
      const queues = queueName ? [queueName] : ['analysis', 'email', 'credits']
      
      for (const queue of queues) {
        const metrics = await this.getQueueMetrics(queue)
        const dlqStats = await DeadLetterQueue.getStats()
        
        // Check error rate
        if (metrics.errorRate > this.THRESHOLDS.ERROR_RATE) {
          await this.createAlert({
            type: 'error_rate',
            severity: 'high',
            message: `High error rate in ${queue} queue: ${(metrics.errorRate * 100).toFixed(1)}%`,
            queue,
            value: metrics.errorRate,
            threshold: this.THRESHOLDS.ERROR_RATE,
          })
        }

        // Check queue size
        if (metrics.pending > this.THRESHOLDS.LARGE_QUEUE_SIZE) {
          await this.createAlert({
            type: 'queue_size',
            severity: 'medium',
            message: `Large queue size in ${queue}: ${metrics.pending} jobs pending`,
            queue,
            value: metrics.pending,
            threshold: this.THRESHOLDS.LARGE_QUEUE_SIZE,
          })
        }

        // Check DLQ size
        const queueDlqSize = dlqStats.queues[queue]?.failed || 0
        if (queueDlqSize > this.THRESHOLDS.LARGE_DLQ_SIZE) {
          await this.createAlert({
            type: 'dlq_size',
            severity: 'high',
            message: `Large DLQ size in ${queue}: ${queueDlqSize} failed jobs`,
            queue,
            value: queueDlqSize,
            threshold: this.THRESHOLDS.LARGE_DLQ_SIZE,
          })
        }

        // Check throughput (only if queue has been active)
        if (metrics.completed > 0 && metrics.throughput < this.THRESHOLDS.LOW_THROUGHPUT) {
          await this.createAlert({
            type: 'throughput',
            severity: 'medium',
            message: `Low throughput in ${queue} queue: ${metrics.throughput} jobs/hour`,
            queue,
            value: metrics.throughput,
            threshold: this.THRESHOLDS.LOW_THROUGHPUT,
          })
        }
      }

      // Check overall latency
      const perfMetrics = await this.getPerformanceMetrics()
      if (perfMetrics.latency.p95 > this.THRESHOLDS.HIGH_LATENCY_P95) {
        await this.createAlert({
          type: 'latency',
          severity: 'medium',
          message: `High P95 latency: ${(perfMetrics.latency.p95 / 1000).toFixed(1)}s`,
          value: perfMetrics.latency.p95,
          threshold: this.THRESHOLDS.HIGH_LATENCY_P95,
        })
      }

    } catch (error) {
      console.error('Error checking alerts:', error)
    }
  }

  /**
   * Create an alert
   */
  private static async createAlert(alertData: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>): Promise<void> {
    const alert: Alert = {
      ...alertData,
      id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
      timestamp: Date.now(),
      acknowledged: false,
    }

    try {
      // Store alert
      await upstash.hset(`${this.ALERTS_PREFIX}:${alert.id}`, {
        data: JSON.stringify(alert),
        created: alert.timestamp.toString(),
      })

      // Add to recent alerts list
      await upstash.lpush(`${this.ALERTS_PREFIX}:recent`, alert.id)

      // Keep only last 100 alerts
      await upstash.ltrim(`${this.ALERTS_PREFIX}:recent`, 0, 99)

      // Set expiration (keep for 7 days)
      await upstash.expire(`${this.ALERTS_PREFIX}:${alert.id}`, 7 * 24 * 60 * 60)

      console.log(`Alert created: ${alert.message}`)
    } catch (error) {
      console.error('Failed to create alert:', error)
    }
  }

  /**
   * Get recent alerts
   */
  static async getAlerts(limit: number = 20): Promise<Alert[]> {
    try {
      const alertIds = await upstash.lrange(`${this.ALERTS_PREFIX}:recent`, 0, limit - 1)
      const alerts: Alert[] = []

      for (const alertId of alertIds) {
        const alertData = await upstash.hgetall(`${this.ALERTS_PREFIX}:${alertId}`)
        if (alertData.data) {
          alerts.push(JSON.parse(alertData.data))
        }
      }

      return alerts.sort((a, b) => b.timestamp - a.timestamp)
    } catch (error) {
      console.error('Error getting alerts:', error)
      return []
    }
  }

  /**
   * Acknowledge an alert
   */
  static async acknowledgeAlert(alertId: string): Promise<boolean> {
    try {
      const alertData = await upstash.hgetall(`${this.ALERTS_PREFIX}:${alertId}`)
      if (!alertData.data) return false

      const alert: Alert = JSON.parse(alertData.data)
      alert.acknowledged = true

      await upstash.hset(`${this.ALERTS_PREFIX}:${alertId}`, {
        data: JSON.stringify(alert),
      })

      return true
    } catch (error) {
      console.error('Error acknowledging alert:', error)
      return false
    }
  }

  /**
   * Health check for monitoring system
   */
  static async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    checks: Record<string, boolean>
    metrics: any
  }> {
    const checks = {
      redis: false,
      queues: false,
      dlq: false,
      metrics: false,
    }

    try {
      // Test Redis connection
      await upstash.ping()
      checks.redis = true

      // Test queue access
      const metrics = await this.getJobMetrics()
      checks.queues = true
      checks.metrics = true

      // Test DLQ access
      await DeadLetterQueue.getStats()
      checks.dlq = true

      const healthyChecks = Object.values(checks).filter(Boolean).length
      const totalChecks = Object.keys(checks).length

      return {
        status: healthyChecks === totalChecks ? 'healthy' 
               : healthyChecks >= totalChecks / 2 ? 'degraded' 
               : 'unhealthy',
        checks,
        metrics,
      }
    } catch (error) {
      console.error('Health check failed:', error)
      return {
        status: 'unhealthy',
        checks,
        metrics: null,
      }
    }
  }
}

export default JobMonitor