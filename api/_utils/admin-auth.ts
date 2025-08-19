import type { VercelRequest } from '@vercel/node'
import { verify } from 'jsonwebtoken'
import { config } from '../_shared/config'

/**
 * Admin Authentication Utility
 * Verifies admin access for sensitive operations
 */

export interface AdminAuthResult {
  isValid: boolean
  userId?: string
  isAdmin?: boolean
  error?: string
}

/**
 * Verify admin authentication from request
 */
export async function verifyAdminAuth(req: VercelRequest): Promise<AdminAuthResult> {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader) {
      return {
        isValid: false,
        error: 'No authorization header provided'
      }
    }

    // Check for Bearer token
    if (!authHeader.startsWith('Bearer ')) {
      return {
        isValid: false,
        error: 'Invalid authorization format. Use Bearer token.'
      }
    }

    const token = authHeader.substring(7)

    // Verify JWT token
    const decoded = verify(token, config.jwt.secret) as any
    
    if (!decoded || !decoded.userId) {
      return {
        isValid: false,
        error: 'Invalid token payload'
      }
    }

    // Check if user is admin (you might want to check database here)
    const isAdmin = await checkAdminStatus(decoded.userId)
    
    if (!isAdmin) {
      return {
        isValid: false,
        error: 'Insufficient permissions. Admin access required.'
      }
    }

    return {
      isValid: true,
      userId: decoded.userId,
      isAdmin: true
    }

  } catch (error) {
    console.error('Admin auth verification failed:', error)
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Authentication failed'
    }
  }
}

/**
 * Check if user has admin status
 * This is a simplified version - in production you'd check the database
 */
async function checkAdminStatus(userId: string): Promise<boolean> {
  try {
    // For now, check if user ID matches admin user from environment
    // In production, you'd query the database for user role
    const adminUserId = process.env.ADMIN_USER_ID
    
    if (adminUserId && userId === adminUserId) {
      return true
    }

    // Alternative: check for admin email domains
    const adminDomains = process.env.ADMIN_DOMAINS?.split(',') || []
    if (adminDomains.length > 0) {
      // You'd need to get user email from database here
      // For now, return false
    }

    // Fallback: check for development environment
    if (process.env.NODE_ENV === 'development') {
      return true // Allow all users in development
    }

    return false
  } catch (error) {
    console.error('Failed to check admin status:', error)
    return false
  }
}

/**
 * Verify cron job authentication
 */
export function verifyCronAuth(req: VercelRequest): boolean {
  const authHeader = req.headers.authorization
  const expectedSecret = process.env.CRON_SECRET
  
  if (!authHeader || !expectedSecret) {
    return false
  }
  
  return authHeader === `Bearer ${expectedSecret}`
}

/**
 * Verify webhook authentication
 */
export function verifyWebhookAuth(req: VercelRequest): boolean {
  const authHeader = req.headers.authorization
  const expectedSecret = process.env.WEBHOOK_SECRET
  
  if (!authHeader || !expectedSecret) {
    return false
  }
  
  return authHeader === `Bearer ${expectedSecret}`
}

/**
 * Create admin JWT token (for testing/development)
 */
export function createAdminToken(userId: string): string {
  return verify({
    userId,
    isAdmin: true,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  }, config.jwt.secret) as string
}