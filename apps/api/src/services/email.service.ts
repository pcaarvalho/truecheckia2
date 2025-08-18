import { Resend } from 'resend'
import { config } from '@truecheckia/config'

const resend = new Resend(config.resend.apiKey || 'dummy-key')

export interface EmailOptions {
  to: string
  subject: string
  html: string
  from?: string
}

export class EmailService {
  private readonly from: string

  constructor() {
    this.from = config.resend.fromEmail || 'TrueCheckIA <noreply@truecheckia.com>'
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (!config.resend.apiKey || config.resend.apiKey === 'dummy-key') {
      console.warn('Resend not configured, skipping email send:', options.subject)
      return
    }

    try {
      const { data, error } = await resend.emails.send({
        from: options.from || this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      })

      if (error) {
        console.error('Error sending email:', error)
        throw new Error(`Failed to send email: ${error.message}`)
      }

      console.log('Email sent successfully:', data?.id)
    } catch (error) {
      console.error('Error in email service:', error)
      throw error
    }
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${config.frontendUrl}/verify-email?token=${token}`
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🤖 TrueCheckIA</h1>
              <p>Confirm your email</p>
            </div>
            <div class="content">
              <h2>Welcome to TrueCheckIA!</h2>
              <p>Thank you for signing up for our AI content detection platform.</p>
              <p>To activate your account, click the button below:</p>
              <center>
                <a href="${verificationUrl}" class="button">Confirm Email</a>
              </center>
              <p>Or copy and paste this link in your browser:</p>
              <p style="word-break: break-all; background: #fff; padding: 10px; border-radius: 5px;">
                ${verificationUrl}
              </p>
              <p><small>This link expires in 24 hours.</small></p>
            </div>
            <div class="footer">
              <p>© 2025 TrueCheckIA. All rights reserved.</p>
              <p>This email was sent to ${email}</p>
            </div>
          </div>
        </body>
      </html>
    `

    await this.sendEmail({
      to: email,
      subject: '🔐 Confirm your email - TrueCheckIA',
      html,
    })
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #666; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔑 TrueCheckIA</h1>
              <p>Password Reset</p>
            </div>
            <div class="content">
              <h2>Password Reset Request</h2>
              <p>We received a request to reset your account password.</p>
              <p>To create a new password, click the button below:</p>
              <center>
                <a href="${resetUrl}" class="button">Reset Password</a>
              </center>
              <p>Or copy and paste this link in your browser:</p>
              <p style="word-break: break-all; background: #fff; padding: 10px; border-radius: 5px;">
                ${resetUrl}
              </p>
              <div class="warning">
                <strong>⚠️ Warning:</strong> If you didn't request this change, ignore this email. Your password will remain the same.
              </div>
              <p><small>This link expires in 1 hour for security reasons.</small></p>
            </div>
            <div class="footer">
              <p>© 2025 TrueCheckIA. All rights reserved.</p>
              <p>This email was sent to ${email}</p>
            </div>
          </div>
        </body>
      </html>
    `

    await this.sendEmail({
      to: email,
      subject: '🔑 Password reset - TrueCheckIA',
      html,
    })
  }

  async sendWelcomeEmail(email: string, name?: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .features { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .feature { padding: 10px 0; border-bottom: 1px solid #eee; }
            .feature:last-child { border-bottom: none; }
            .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to TrueCheckIA!</h1>
              <p>Your account has been successfully activated</p>
            </div>
            <div class="content">
              <h2>Hello${name ? `, ${name}` : ''}!</h2>
              <p>Congratulations! Your TrueCheckIA account is ready to use.</p>
              
              <div class="features">
                <h3>🚀 What you can do now:</h3>
                <div class="feature">
                  <strong>✨ 10 free analyses</strong> - Start detecting AI content immediately
                </div>
                <div class="feature">
                  <strong>📊 Complete dashboard</strong> - Track all your analyses
                </div>
                <div class="feature">
                  <strong>🔍 Advanced detection</strong> - GPT-4 technology with 95% accuracy
                </div>
                <div class="feature">
                  <strong>📈 Detailed reports</strong> - Understand what makes text suspicious
                </div>
              </div>
              
              <center>
                <a href="${config.frontendUrl}/dashboard" class="button">Access Dashboard</a>
              </center>
              
              <p><strong>Tip:</strong> Upgrade to Pro plan and get unlimited analyses + API access!</p>
            </div>
            <div class="footer">
              <p>© 2025 TrueCheckIA. Todos os direitos reservados.</p>
              <p>Need help? Reply to this email!</p>
            </div>
          </div>
        </body>
      </html>
    `

    await this.sendEmail({
      to: email,
      subject: '🎉 Welcome to TrueCheckIA!',
      html,
    })
  }

  async sendAnalysisReportEmail(
    email: string,
    analysisData: {
      text: string
      score: number
      confidence: string
      explanation: string
    }
  ): Promise<void> {
    const scoreColor = analysisData.score > 70 ? '#dc3545' : analysisData.score > 40 ? '#ffc107' : '#28a745'
    const scoreText = analysisData.score > 70 ? 'High AI probability' : analysisData.score > 40 ? 'Possible AI content' : 'Likely human'
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .score-box { background: white; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
            .score { font-size: 48px; font-weight: bold; color: ${scoreColor}; }
            .score-label { color: ${scoreColor}; font-weight: bold; margin-top: 10px; }
            .analysis-text { background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
            .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 Analysis Report</h1>
              <p>TrueCheckIA - AI Content Detection</p>
            </div>
            <div class="content">
              <h2>Analysis Complete!</h2>
              
              <div class="score-box">
                <div class="score">${analysisData.score}%</div>
                <div class="score-label">${scoreText}</div>
                <p>Confidence: ${analysisData.confidence}</p>
              </div>
              
              <div class="analysis-text">
                <h3>📝 Analyzed Text:</h3>
                <p>${analysisData.text.substring(0, 200)}${analysisData.text.length > 200 ? '...' : ''}</p>
              </div>
              
              <div class="analysis-text">
                <h3>🔍 Explanation:</h3>
                <p>${analysisData.explanation}</p>
              </div>
              
              <center>
                <a href="${config.frontendUrl}/dashboard" class="button">View Complete Analysis</a>
              </center>
            </div>
            <div class="footer">
              <p>© 2025 TrueCheckIA. Todos os direitos reservados.</p>
              <p>This report was generated automatically.</p>
            </div>
          </div>
        </body>
      </html>
    `

    await this.sendEmail({
      to: email,
      subject: `📊 Analysis Complete - ${scoreText}`,
      html,
    })
  }
}

export const emailService = new EmailService()