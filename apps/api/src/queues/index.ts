import { analysisQueue } from './analysis.queue'
import { emailQueue } from './email.queue'
import { creditsQueue, scheduleCreditsJobs } from './credits.queue'
import Queue from 'bull'

// Export all queues
export { analysisQueue, emailQueue, creditsQueue }
export { addAnalysisJob, getJobStatus } from './analysis.queue'
export { sendEmail, sendTemplateEmail } from './email.queue'

// Initialize Bull Board for monitoring (optional)
export function initializeQueues() {
  // Schedule recurring jobs
  scheduleCreditsJobs()
  
  // Log queue status
  const queues = [analysisQueue, emailQueue, creditsQueue]
  
  queues.forEach((queue) => {
    queue.on('error', (error) => {
      console.error(`Queue ${queue.name} error:`, error)
    })
    
    queue.on('stalled', (job) => {
      console.warn(`Job ${job.id} in queue ${queue.name} has stalled`)
    })
  })
  
  console.log('✅ Queues initialized')
}

// Clean old jobs
export async function cleanQueues() {
  const queues = [analysisQueue, emailQueue, creditsQueue]
  
  for (const queue of queues) {
    await queue.clean(24 * 60 * 60 * 1000) // 24 hours
    await queue.clean(24 * 60 * 60 * 1000, 'failed')
  }
  
  console.log('Queues cleaned')
}

// Get queue statistics
export async function getQueueStats() {
  const stats: Record<string, any> = {}
  const queues = [
    { name: 'analysis', queue: analysisQueue },
    { name: 'email', queue: emailQueue },
    { name: 'credits', queue: creditsQueue },
  ]
  
  for (const { name, queue } of queues) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ])
    
    stats[name] = {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    }
  }
  
  return stats
}

// Graceful shutdown
export async function shutdownQueues() {
  console.log('Shutting down queues...')
  
  const queues = [analysisQueue, emailQueue, creditsQueue]
  
  await Promise.all(queues.map(queue => queue.close()))
  
  console.log('Queues shut down gracefully')
}