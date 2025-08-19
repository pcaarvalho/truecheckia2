// @ts-nocheck
import { serverlessQueue } from '../lib/upstash'
import { emailService } from '../services/email.service'
import { config } from '@truecheckia/config'

export interface EmailJobData {
  to: string
  subject: string
  html: string
  text?: string
  type?: 'resend' | 'smtp'
  template?: string
  templateData?: any
}

/**
 * Serverless Email Queue
 * Replaces Bull email queue with webhook-based processing
 */
export class ServerlessEmailQueue {
  private static readonly QUEUE_NAME = 'email'

  /**
   * Add email job to queue
   */
  static async addJob(data: EmailJobData): Promise<string> {
    try {
      const jobId = await serverlessQueue.add(this.QUEUE_NAME, data)
      console.log(`Added email job ${jobId} for ${data.to}`)
      return jobId
    } catch (error) {
      console.error('Failed to add email job:', error)
      throw error
    }
  }

  /**
   * Process email job (called by webhook/cron)
   */
  static async processJob(job: any): Promise<any> {
    const { to, subject, html, text, type = 'resend', template, templateData } = job.data
    
    console.log(`Sending email to ${to}: ${subject} via ${type}`)
    
    try {
      let emailData = { to, subject, html, text }
      
      // If using template, generate content
      if (template && templateData) {
        emailData = this.generateTemplateEmail(template, templateData)
        emailData.to = to
      }
      
      // Use Resend in production, SMTP fallback in development
      if (type === 'resend' && config.resend.apiKey) {
        await emailService.sendEmail(emailData)
        console.log(`Email sent via Resend to ${to}`)
        return { provider: 'resend', to, status: 'sent' }
      } else {
        // Fallback to SMTP (for development or fallback)
        const result = await this.sendViaSmtp(emailData)
        console.log(`Email sent via SMTP: ${result.messageId}`)
        return { provider: 'smtp', messageId: result.messageId, status: 'sent' }
      }
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error)
      throw error
    }
  }

  /**
   * Process all pending email jobs (called by cron)
   */
  static async processPendingJobs(): Promise<{ processed: number; failed: number }> {
    let processed = 0
    let failed = 0
    const maxJobs = 20 // Emails are lighter than analysis

    try {
      for (let i = 0; i < maxJobs; i++) {
        try {
          await serverlessQueue.process(this.QUEUE_NAME, this.processJob)
          processed++
        } catch (error) {
          if (error instanceof Error && error.message.includes('No jobs available')) {
            break
          }
          console.error('Failed to process email job:', error)
          failed++
        }
      }
    } catch (error) {
      console.error('Error in processPendingJobs:', error)
    }

    if (processed > 0 || failed > 0) {
      console.log(`Processed ${processed} email jobs, ${failed} failed`)
    }

    return { processed, failed }
  }

  /**
   * Send via SMTP (fallback)
   */
  private static async sendViaSmtp(emailData: { to: string; subject: string; html: string; text?: string }): Promise<any> {
    const nodemailer = await import('nodemailer')
    
    const transporter = nodemailer.createTransporter({
      host: config.email.host,
      port: config.email.port,
      secure: false,
      auth: config.email.user ? {
        user: config.email.user,
        pass: config.email.pass,
      } : undefined,
    })

    return await transporter.sendMail({
      from: config.email.from,
      ...emailData,
    })
  }

  /**
   * Generate email from template
   */
  private static generateTemplateEmail(template: string, data: any): { subject: string; html: string; text: string } {
    const templates = this.getEmailTemplates()
    
    if (!(template in templates)) {
      throw new Error(`Unknown email template: ${template}`)
    }
    
    return templates[template as keyof typeof templates](...(Array.isArray(data) ? data : [data]))
  }

  /**
   * Email templates
   */
  private static getEmailTemplates() {
    return {
      welcome: (name: string) => ({
        subject: 'Welcome to TrueCheckIA!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Welcome to TrueCheckIA!</h1>
            <p>Hello ${name},</p>
            <p>Thank you for signing up for TrueCheckIA. We're happy to have you with us!</p>
            <p>With your free account, you have:</p>
            <ul>
              <li>10 free analyses per month</li>
              <li>AI detection with 95% accuracy</li>
              <li>Analysis history</li>
            </ul>
            <p>Start detecting AI-generated texts right now!</p>
            <a href="${config.frontend.url}/dashboard" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Access Dashboard</a>
            <p>Best regards,<br>TrueCheckIA Team</p>
          </div>
        `,
        text: `Welcome to TrueCheckIA, ${name}! Access your dashboard at ${config.frontend.url}/dashboard`,
      }),
      
      creditsLow: (name: string, credits: number) => ({
        subject: 'Credits running low - TrueCheckIA',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ff6b6b;">Your credits are running low!</h2>
            <p>Hello ${name},</p>
            <p>You have only <strong>${credits} credits</strong> remaining this month.</p>
            <p>How about upgrading to the PRO plan and getting unlimited analyses?</p>
            <ul>
              <li>✅ Unlimited analyses</li>
              <li>✅ API for integrations</li>
              <li>✅ PDF reports</li>
              <li>✅ Priority support</li>
            </ul>
            <a href="${config.frontend.url}/pricing" style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px;">Upgrade Now</a>
            <p>Best regards,<br>TrueCheckIA Team</p>
          </div>
        `,
        text: `Hello ${name}, you have only ${credits} credits remaining. Upgrade at ${config.frontend.url}/pricing`,
      }),
      
      subscriptionConfirmed: (name: string, plan: string) => ({
        subject: 'Subscription Confirmed - TrueCheckIA',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #28a745;">Subscription Confirmed!</h1>
            <p>Hello ${name},</p>
            <p>Your <strong>${plan}</strong> plan subscription has been successfully confirmed!</p>
            <p>Now you have access to:</p>
            <ul>
              <li>✅ Unlimited text analyses</li>
              <li>✅ API for integrations</li>
              <li>✅ Detailed PDF reports</li>
              <li>✅ Batch analysis</li>
              <li>✅ Priority support</li>
            </ul>
            <a href="${config.frontend.url}/dashboard" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Access Dashboard</a>
            <p>Thank you for trusting TrueCheckIA!</p>
            <p>Best regards,<br>TrueCheckIA Team</p>
          </div>
        `,
        text: `Hello ${name}, your ${plan} plan subscription has been confirmed! Access ${config.frontend.url}/dashboard`,
      }),
      
      paymentFailed: (name: string) => ({
        subject: 'Payment Issue - TrueCheckIA',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ff6b6b;">Issue with your payment</h2>
            <p>Hello ${name},</p>
            <p>We couldn't process your subscription payment.</p>
            <p>Please update your payment information to continue using the PRO plan.</p>
            <a href="${config.frontend.url}/dashboard/billing" style="display: inline-block; padding: 10px 20px; background-color: #ff6b6b; color: white; text-decoration: none; border-radius: 5px;">Update Payment</a>
            <p>If you have any questions, contact our support.</p>
            <p>Best regards,<br>TrueCheckIA Team</p>
          </div>
        `,
        text: `Hello ${name}, there was an issue with your payment. Update at ${config.frontend.url}/dashboard/billing`,
      }),

      analysisComplete: (name: string, analysisId: string, aiScore: number) => ({
        subject: 'Analysis Complete - TrueCheckIA',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #007bff;">Your Analysis is Complete!</h2>
            <p>Hello ${name},</p>
            <p>Your text analysis has been processed successfully.</p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0;">Results Summary</h3>
              <p><strong>AI Detection Score:</strong> ${aiScore}%</p>
              <p><strong>Analysis ID:</strong> ${analysisId}</p>
            </div>
            <a href="${config.frontend.url}/dashboard/analysis/${analysisId}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">View Full Results</a>
            <p>Best regards,<br>TrueCheckIA Team</p>
          </div>
        `,
        text: `Hello ${name}, your analysis (${analysisId}) is complete with an AI score of ${aiScore}%. View results at ${config.frontend.url}/dashboard/analysis/${analysisId}`,
      }),
    }
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats(): Promise<any> {
    return await serverlessQueue.getQueueStats(this.QUEUE_NAME)
  }
}

// Maintain compatibility with existing code
export const emailQueue = {
  add: (data: EmailJobData) => ServerlessEmailQueue.addJob(data),
  
  process: (processor: Function) => {
    console.log('Email queue processor registered (serverless mode)')
  },
  
  on: (event: string, handler: Function) => {
    console.log(`Email queue event ${event} registered (serverless mode)`)
  },
  
  getWaitingCount: async () => {
    const stats = await ServerlessEmailQueue.getQueueStats()
    return stats.pending
  },
  
  getActiveCount: async () => {
    const stats = await ServerlessEmailQueue.getQueueStats()
    return stats.processing
  },
  
  getCompletedCount: async () => 0,
  getFailedCount: async () => 0,
  getDelayedCount: async () => {
    const stats = await ServerlessEmailQueue.getQueueStats()
    return stats.delayed
  },
  
  clean: () => Promise.resolve(),
  close: () => Promise.resolve(),
}

export async function sendEmail(data: EmailJobData): Promise<string> {
  return await ServerlessEmailQueue.addJob(data)
}

export async function sendTemplateEmail(
  to: string,
  template: string,
  ...args: any[]
): Promise<string> {
  return await ServerlessEmailQueue.addJob({
    to,
    template,
    templateData: args,
    type: 'resend',
    subject: '', // Will be generated from template
    html: '',    // Will be generated from template
  })
}

export default ServerlessEmailQueue