// @ts-nocheck
import Queue from 'bull'
import { config } from '@truecheckia/config'
import { analyzeWithOpenAI } from '../services/openai.service'
import { prisma } from '@truecheckia/database'
import { cacheSet } from '../lib/redis'
import { createHash } from 'crypto'

export interface AnalysisJobData {
  userId: string
  text: string
  language: string
  webhookUrl?: string
  priority?: number
}

export const analysisQueue = new Queue<AnalysisJobData>('analysis', config.redis.url, {
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
})

// Process analysis jobs
analysisQueue.process(async (job) => {
  const { userId, text, language, webhookUrl } = job.data
  
  console.log(`Processing analysis job ${job.id} for user ${userId}`)
  
  try {
    // Perform analysis
    const result = await analyzeWithOpenAI(text, language)
    
    // Save to database
    const analysis = await prisma.analysis.create({
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
      },
    })
    
    // Cache result
    const textHash = createHash('sha256').update(text).digest('hex')
    const cacheKey = `${config.cache.analysisPrefix}${textHash}`
    await cacheSet(cacheKey, result, config.cache.ttl)
    
    // Send webhook if provided
    if (webhookUrl) {
      await sendWebhook(webhookUrl, {
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
    
    return { analysisId: analysis.id, ...result }
  } catch (error) {
    console.error(`Failed to process analysis job ${job.id}:`, error)
    throw error
  }
})

// Handle completed jobs
analysisQueue.on('completed', (job, result) => {
  console.log(`Analysis job ${job.id} completed:`, result.analysisId)
})

// Handle failed jobs
analysisQueue.on('failed', (job, err) => {
  console.error(`Analysis job ${job?.id} failed:`, err)
})

// Add job to queue
export async function addAnalysisJob(data: AnalysisJobData) {
  const job = await analysisQueue.add(data, {
    priority: data.priority || 0,
    delay: 0,
  })
  return job.id
}

// Get job status
export async function getJobStatus(jobId: string) {
  const job = await analysisQueue.getJob(jobId)
  if (!job) {
    return null
  }
  
  const state = await job.getState()
  const progress = job.progress()
  
  return {
    id: job.id,
    state,
    progress,
    data: job.data,
    createdAt: new Date(job.timestamp),
    processedAt: job.processedOn ? new Date(job.processedOn) : null,
    finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
  }
}

// Send webhook notification
async function sendWebhook(url: string, data: any) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TrueCheckIA-Event': 'analysis.completed',
      },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      console.error(`Webhook failed: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.error('Failed to send webhook:', error)
  }
}