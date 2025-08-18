import jwt from 'jsonwebtoken'
import { config } from '@truecheckia/config'
import type { JWTPayload } from '@truecheckia/types'

/**
 * Generate JWT access and refresh tokens for a user
 */
export function generateTokens(user: any) {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role || 'USER',
    plan: user.plan || 'FREE',
  }

  const accessToken = jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn,
  })

  const refreshToken = jwt.sign(payload, config.auth.refreshSecret, {
    expiresIn: config.auth.refreshExpiresIn,
  })

  return { accessToken, refreshToken }
}