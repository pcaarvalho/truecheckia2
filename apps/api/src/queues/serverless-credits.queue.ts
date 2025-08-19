// @ts-nocheck
import { serverlessQueue } from '../lib/upstash'
import { config } from '@truecheckia/config'
import { prisma } from '@truecheckia/database'
import { sendTemplateEmail } from './serverless-email.queue'

/**
 * Serverless Credits Queue
 * Handles credit management via cron jobs instead of Bull queue
 */
export class ServerlessCreditsQueue {
  private static readonly QUEUE_NAME = 'credits'

  /**
   * Reset monthly credits for free users
   */
  static async resetMonthlyCredits(): Promise<{ usersReset: number }> {
    console.log('Starting monthly credits reset...')
    
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    // Find free users who need credit reset
    const users = await prisma.user.findMany({
      where: {
        plan: 'FREE',
        creditsResetAt: {
          lte: thirtyDaysAgo,
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        credits: true,
      },
    })
    
    console.log(`Found ${users.length} users to reset credits`)
    
    // Reset credits for each user in batches
    const batchSize = 50
    let totalReset = 0
    
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize)
      
      try {
        // Update credits in batch
        await prisma.$transaction(
          batch.map(user => 
            prisma.user.update({
              where: { id: user.id },
              data: {
                credits: config.limits.freeCredits,
                creditsResetAt: new Date(),
              },
            })
          )
        )
        
        // Create notifications
        await prisma.$transaction(
          batch.map(user =>
            prisma.notification.create({
              data: {
                userId: user.id,
                type: 'INFO',
                title: 'Credits Renewed!',
                message: `Your ${config.limits.freeCredits} monthly credits have been renewed.`,
              },
            })
          )
        )
        
        totalReset += batch.length
        console.log(`Reset credits for batch of ${batch.length} users`)
        
        // Add small delay between batches to prevent overwhelming the database
        if (i + batchSize < users.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } catch (error) {
        console.error(`Failed to reset credits for batch starting at index ${i}:`, error)
      }
    }
    
    console.log(`Successfully reset credits for ${totalReset} users`)
    return { usersReset: totalReset }
  }

  /**
   * Check for users with low credits and send notifications
   */
  static async checkLowCredits(): Promise<{ usersNotified: number }> {
    console.log('Checking for users with low credits...')
    
    // Find free users with low credits (less than 3)
    const users = await prisma.user.findMany({
      where: {
        plan: 'FREE',
        credits: {
          lte: 3,
          gt: 0, // Don't notify users with 0 credits (they already know)
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        credits: true,
      },
    })
    
    console.log(`Found ${users.length} users with low credits`)
    
    let notified = 0
    
    for (const user of users) {
      try {
        // Check if we already sent a notification recently (last 7 days)
        const recentNotification = await prisma.notification.findFirst({
          where: {
            userId: user.id,
            type: 'CREDIT_LOW',
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        })
        
        if (!recentNotification) {
          // Create notification
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: 'CREDIT_LOW',
              title: 'Credits Running Low!',
              message: `You have only ${user.credits} credits remaining. Consider upgrading to the PRO plan.`,
            },
          })
          
          // Send email if user has a name
          if (user.name) {
            await sendTemplateEmail(user.email, 'creditsLow', user.name, user.credits)
          }
          
          notified++
          console.log(`Notified user ${user.email} about low credits`)
        }
      } catch (error) {
        console.error(`Failed to notify user ${user.email} about low credits:`, error)
      }
    }
    
    console.log(`Notified ${notified} users about low credits`)
    return { usersNotified: notified }
  }

  /**
   * Clean up old notifications (keep only last 30 days)
   */
  static async cleanOldNotifications(): Promise<{ deleted: number }> {
    console.log('Cleaning up old notifications...')
    
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    try {
      const result = await prisma.notification.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
          read: true, // Only delete read notifications
        },
      })
      
      console.log(`Deleted ${result.count} old notifications`)
      return { deleted: result.count }
    } catch (error) {
      console.error('Failed to clean old notifications:', error)
      return { deleted: 0 }
    }
  }

  /**
   * Process subscription renewals (check for upcoming renewals)
   */
  static async processSubscriptionRenewals(): Promise<{ processed: number }> {
    console.log('Processing subscription renewals...')
    
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    
    // Find subscriptions expiring in 7 days
    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        currentPeriodEnd: {
          lte: sevenDaysFromNow,
          gte: new Date(), // Not already expired
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    })
    
    console.log(`Found ${subscriptions.length} subscriptions expiring soon`)
    
    let processed = 0
    
    for (const subscription of subscriptions) {
      try {
        // Check if we already sent a renewal reminder
        const recentNotification = await prisma.notification.findFirst({
          where: {
            userId: subscription.userId,
            type: 'SUBSCRIPTION_RENEWAL',
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        })
        
        if (!recentNotification && subscription.user.name) {
          // Create notification
          await prisma.notification.create({
            data: {
              userId: subscription.userId,
              type: 'SUBSCRIPTION_RENEWAL',
              title: 'Subscription Renewal Reminder',
              message: `Your ${subscription.plan} subscription will renew soon.`,
              metadata: {
                subscriptionId: subscription.id,
                renewalDate: subscription.currentPeriodEnd.toISOString(),
              },
            },
          })
          
          processed++
          console.log(`Created renewal reminder for user ${subscription.user.email}`)
        }
      } catch (error) {
        console.error(`Failed to process renewal for subscription ${subscription.id}:`, error)
      }
    }
    
    console.log(`Processed ${processed} subscription renewals`)
    return { processed }
  }

  /**
   * Aggregate usage statistics
   */
  static async aggregateUsageStats(): Promise<{ statsUpdated: boolean }> {
    console.log('Aggregating usage statistics...')
    
    try {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(0, 0, 0, 0)
      
      const endOfYesterday = new Date(yesterday)
      endOfYesterday.setHours(23, 59, 59, 999)
      
      // Get statistics for yesterday
      const [totalAnalyses, totalUsers, activeUsers] = await Promise.all([
        prisma.analysis.count({
          where: {
            createdAt: {
              gte: yesterday,
              lte: endOfYesterday,
            },
          },
        }),
        prisma.user.count(),
        prisma.user.count({
          where: {
            lastLoginAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        }),
      ])
      
      // Store daily stats (you might want to create a separate table for this)
      console.log(`Daily stats - Analyses: ${totalAnalyses}, Total Users: ${totalUsers}, Active Users: ${activeUsers}`)
      
      return { statsUpdated: true }
    } catch (error) {
      console.error('Failed to aggregate usage stats:', error)
      return { statsUpdated: false }
    }
  }

  /**
   * Get queue statistics (for compatibility)
   */
  static async getQueueStats(): Promise<any> {
    return {
      pending: 0,     // Credits processing is immediate
      active: 0,      // No active jobs in credits queue
      completed: 0,   // Not tracked
      failed: 0,      // Not tracked
      delayed: 0,     // No delayed jobs
      total: 0,
    }
  }
}

// Maintain compatibility with existing code
export const creditsQueue = {
  add: (jobType: string, data: any, options?: any) => {
    console.log(`Credits job ${jobType} scheduled (serverless mode)`)
    return Promise.resolve()
  },
  
  process: (jobType: string, processor: Function) => {
    console.log(`Credits processor for ${jobType} registered (serverless mode)`)
  },
  
  on: (event: string, handler: Function) => {
    console.log(`Credits queue event ${event} registered (serverless mode)`)
  },
  
  getWaitingCount: async () => 0,
  getActiveCount: async () => 0,
  getCompletedCount: async () => 0,
  getFailedCount: async () => 0,
  getDelayedCount: async () => 0,
  
  clean: () => Promise.resolve(),
  close: () => Promise.resolve(),
}

// No-op function for compatibility
export function scheduleCreditsJobs(): void {
  console.log('Credits jobs will be scheduled via Vercel cron (serverless mode)')
}

export default ServerlessCreditsQueue