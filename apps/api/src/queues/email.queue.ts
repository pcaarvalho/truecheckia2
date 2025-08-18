import Queue from 'bull'
import nodemailer from 'nodemailer'
import { config } from '@truecheckia/config'
import { emailService } from '../services/email.service'

export interface EmailJobData {
  to: string
  subject: string
  html: string
  text?: string
  type?: 'resend' | 'smtp'
}

export const emailQueue = new Queue<EmailJobData>('email', config.redis.url, {
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 20,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
})

// Create transporter
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: false,
  auth: config.email.user ? {
    user: config.email.user,
    pass: config.email.pass,
  } : undefined,
})

// Process email jobs
emailQueue.process(async (job) => {
  const { to, subject, html, text, type = 'resend' } = job.data
  
  console.log(`Sending email to ${to}: ${subject} via ${type}`)
  
  try {
    // Use Resend in production, SMTP (Mailhog) in development
    if (type === 'resend' && config.resend.apiKey) {
      await emailService.sendEmail({ to, subject, html })
      console.log(`Email sent via Resend to ${to}`)
      return { provider: 'resend', to }
    } else {
      // Fallback to SMTP (Mailhog for development)
      const info = await transporter.sendMail({
        from: config.email.from,
        to,
        subject,
        text,
        html,
      })
      
      console.log(`Email sent via SMTP: ${info.messageId}`)
      return { provider: 'smtp', messageId: info.messageId }
    }
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error)
    throw error
  }
})

// Email templates
export const emailTemplates = {
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
        <a href="${config.app.url}/dashboard" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Access Dashboard</a>
        <p>Best regards,<br>TrueCheckIA Team</p>
      </div>
    `,
    text: `Welcome to TrueCheckIA, ${name}! Access your dashboard at ${config.app.url}/dashboard`,
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
        <a href="${config.app.url}/pricing" style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px;">Upgrade Now</a>
        <p>Best regards,<br>TrueCheckIA Team</p>
      </div>
    `,
    text: `Hello ${name}, you have only ${credits} credits remaining. Upgrade at ${config.app.url}/pricing`,
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
        <a href="${config.app.url}/dashboard" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Access Dashboard</a>
        <p>Thank you for trusting TrueCheckIA!</p>
        <p>Best regards,<br>TrueCheckIA Team</p>
      </div>
    `,
    text: `Hello ${name}, your ${plan} plan subscription has been confirmed! Access ${config.app.url}/dashboard`,
  }),
  
  paymentFailed: (name: string) => ({
    subject: 'Payment Issue - TrueCheckIA',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff6b6b;">Issue with your payment</h2>
        <p>Hello ${name},</p>
        <p>We couldn't process your subscription payment.</p>
        <p>Please update your payment information to continue using the PRO plan.</p>
        <a href="${config.app.url}/dashboard/billing" style="display: inline-block; padding: 10px 20px; background-color: #ff6b6b; color: white; text-decoration: none; border-radius: 5px;">Update Payment</a>
        <p>If you have any questions, contact our support.</p>
        <p>Best regards,<br>TrueCheckIA Team</p>
      </div>
    `,
    text: `Hello ${name}, there was an issue with your payment. Update at ${config.app.url}/dashboard/billing`,
  }),
}

// Add email to queue
export async function sendEmail(data: EmailJobData) {
  const job = await emailQueue.add(data)
  return job.id
}

// Send template email
export async function sendTemplateEmail(
  to: string,
  template: keyof typeof emailTemplates,
  ...args: any[]
) {
  const emailData = emailTemplates[template](...args)
  return sendEmail({
    to,
    ...emailData,
  })
}