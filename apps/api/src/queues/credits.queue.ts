import Queue from 'bull'
import { config } from '@truecheckia/config'
import { prisma } from '@truecheckia/database'
import { sendTemplateEmail } from './email.queue'

export const creditsQueue = new Queue('credits', config.redis.url, {
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 10,
  },
})

// Reset free user credits monthly
creditsQueue.process('reset-credits', async (job) => {
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
  })
  
  console.log(`Found ${users.length} users to reset credits`)
  
  // Reset credits for each user
  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        credits: config.limits.freeCredits,
        creditsResetAt: new Date(),
      },
    })
    
    // Send notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'INFO',
        title: 'Credits Renewed!',
        message: `Your ${config.limits.freeCredits} monthly credits have been renewed.`,
      },
    })
    
    console.log(`Reset credits for user ${user.email}`)
  }
  
  return { usersReset: users.length }
})

// Check for low credits and send notifications
creditsQueue.process('check-low-credits', async (job) => {
  console.log('Checking for users with low credits...')
  
  // Find free users with low credits (less than 3)
  const users = await prisma.user.findMany({
    where: {
      plan: 'FREE',
      credits: {
        lte: 3,
        gt: 0,
      },
    },
  })
  
  console.log(`Found ${users.length} users with low credits`)
  
  for (const user of users) {
    // Check if we already sent a notification recently
    const recentNotification = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        type: 'CREDIT_LOW',
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
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
      
      // Send email
      if (user.name) {
        await sendTemplateEmail(user.email, 'creditsLow', user.name, user.credits)
      }
      
      console.log(`Notified user ${user.email} about low credits`)
    }
  }
  
  return { usersNotified: users.length }
})

// Schedule jobs
export function scheduleCreditsJobs() {
  // Reset credits daily at 3 AM
  creditsQueue.add(
    'reset-credits',
    {},
    {
      repeat: {
        cron: '0 3 * * *', // Every day at 3 AM
      },
    }
  )
  
  // Check low credits daily at 10 AM
  creditsQueue.add(
    'check-low-credits',
    {},
    {
      repeat: {
        cron: '0 10 * * *', // Every day at 10 AM
      },
    }
  )
  
  console.log('Credits jobs scheduled')
}