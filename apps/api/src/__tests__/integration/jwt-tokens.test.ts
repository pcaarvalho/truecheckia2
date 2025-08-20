// @ts-nocheck
import jwt from 'jsonwebtoken'
import { prisma } from '@truecheckia/database'
import { config } from '@truecheckia/config'
import { generateTokens } from '../../lib/jwt.utils'

describe('JWT Token Generation and Validation', () => {
  let testUser: any

  beforeEach(async () => {
    // Clean database
    await prisma.analysis.deleteMany({})
    await prisma.user.deleteMany({})

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'jwt.test@example.com',
        googleId: 'google-jwt-123',
        name: 'JWT Test User',
        avatar: 'https://example.com/avatar.jpg',
        plan: 'FREE',
        role: 'USER',
        credits: 5,
        creditsResetAt: new Date(),
        emailVerified: true
      }
    })
  })

  describe('Token Generation for OAuth Users', () => {
    it('should generate valid access and refresh tokens for Google OAuth user', () => {
      const { accessToken, refreshToken } = generateTokens(testUser)

      expect(accessToken).toBeTruthy()
      expect(refreshToken).toBeTruthy()
      expect(typeof accessToken).toBe('string')
      expect(typeof refreshToken).toBe('string')

      // Both tokens should be valid JWTs
      expect(accessToken.split('.')).toHaveLength(3)
      expect(refreshToken.split('.')).toHaveLength(3)
    })

    it('should include correct payload in access token', () => {
      const { accessToken } = generateTokens(testUser)

      const payload = jwt.verify(accessToken, config.auth.secret) as any

      expect(payload.userId).toBe(testUser.id)
      expect(payload.email).toBe(testUser.email)
      expect(payload.role).toBe(testUser.role)
      expect(payload.plan).toBe(testUser.plan)
      expect(payload.iat).toBeDefined()
      expect(payload.exp).toBeDefined()

      // Should not include sensitive data
      expect(payload.password).toBeUndefined()
      expect(payload.googleId).toBeUndefined()
      expect(payload.credits).toBeUndefined()
    })

    it('should include minimal payload in refresh token', () => {
      const { refreshToken } = generateTokens(testUser)

      const payload = jwt.verify(refreshToken, config.auth.refreshSecret) as any

      expect(payload.userId).toBe(testUser.id)
      expect(payload.iat).toBeDefined()
      expect(payload.exp).toBeDefined()

      // Should not include other user data
      expect(payload.email).toBeUndefined()
      expect(payload.role).toBeUndefined()
      expect(payload.plan).toBeUndefined()
    })

    it('should generate tokens with correct expiration times', () => {
      const { accessToken, refreshToken } = generateTokens(testUser)

      const accessPayload = jwt.decode(accessToken, { complete: true }) as any
      const refreshPayload = jwt.decode(refreshToken, { complete: true }) as any

      const now = Math.floor(Date.now() / 1000)
      const accessExp = accessPayload.payload.exp
      const refreshExp = refreshPayload.payload.exp

      // Access token should expire in about 7 days (default)
      const accessTtl = accessExp - now
      expect(accessTtl).toBeGreaterThan(6 * 24 * 60 * 60) // > 6 days
      expect(accessTtl).toBeLessThan(8 * 24 * 60 * 60) // < 8 days

      // Refresh token should expire in about 30 days (default)
      const refreshTtl = refreshExp - now
      expect(refreshTtl).toBeGreaterThan(29 * 24 * 60 * 60) // > 29 days
      expect(refreshTtl).toBeLessThan(31 * 24 * 60 * 60) // < 31 days
    })

    it('should use correct algorithms for token signing', () => {
      const { accessToken, refreshToken } = generateTokens(testUser)

      const accessHeader = jwt.decode(accessToken, { complete: true }) as any
      const refreshHeader = jwt.decode(refreshToken, { complete: true }) as any

      expect(accessHeader.header.alg).toBe('HS256')
      expect(accessHeader.header.typ).toBe('JWT')
      expect(refreshHeader.header.alg).toBe('HS256')
      expect(refreshHeader.header.typ).toBe('JWT')
    })
  })

  describe('Token Verification', () => {
    it('should verify access tokens with correct secret', () => {
      const { accessToken } = generateTokens(testUser)

      expect(() => {
        jwt.verify(accessToken, config.auth.secret)
      }).not.toThrow()

      const payload = jwt.verify(accessToken, config.auth.secret) as any
      expect(payload.userId).toBe(testUser.id)
    })

    it('should verify refresh tokens with correct secret', () => {
      const { refreshToken } = generateTokens(testUser)

      expect(() => {
        jwt.verify(refreshToken, config.auth.refreshSecret)
      }).not.toThrow()

      const payload = jwt.verify(refreshToken, config.auth.refreshSecret) as any
      expect(payload.userId).toBe(testUser.id)
    })

    it('should fail verification with wrong secret', () => {
      const { accessToken, refreshToken } = generateTokens(testUser)

      expect(() => {
        jwt.verify(accessToken, 'wrong-secret')
      }).toThrow()

      expect(() => {
        jwt.verify(refreshToken, 'wrong-secret')
      }).toThrow()

      expect(() => {
        jwt.verify(accessToken, config.auth.refreshSecret)
      }).toThrow()

      expect(() => {
        jwt.verify(refreshToken, config.auth.secret)
      }).toThrow()
    })

    it('should fail verification for malformed tokens', () => {
      expect(() => {
        jwt.verify('invalid.token', config.auth.secret)
      }).toThrow()

      expect(() => {
        jwt.verify('not-a-jwt-at-all', config.auth.secret)
      }).toThrow()

      expect(() => {
        jwt.verify('', config.auth.secret)
      }).toThrow()
    })
  })

  describe('Token Security', () => {
    it('should generate unique tokens for each user', () => {
      const user2 = {
        ...testUser,
        id: 'different-user-id',
        email: 'different@example.com'
      }

      const tokens1 = generateTokens(testUser)
      const tokens2 = generateTokens(user2)

      expect(tokens1.accessToken).not.toBe(tokens2.accessToken)
      expect(tokens1.refreshToken).not.toBe(tokens2.refreshToken)

      const payload1 = jwt.verify(tokens1.accessToken, config.auth.secret) as any
      const payload2 = jwt.verify(tokens2.accessToken, config.auth.secret) as any

      expect(payload1.userId).not.toBe(payload2.userId)
      expect(payload1.email).not.toBe(payload2.email)
    })

    it('should generate unique tokens for same user at different times', async () => {
      const tokens1 = generateTokens(testUser)
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const tokens2 = generateTokens(testUser)

      // Tokens should be different due to different timestamps
      expect(tokens1.accessToken).not.toBe(tokens2.accessToken)
      expect(tokens1.refreshToken).not.toBe(tokens2.refreshToken)

      // But should contain same user data
      const payload1 = jwt.verify(tokens1.accessToken, config.auth.secret) as any
      const payload2 = jwt.verify(tokens2.accessToken, config.auth.secret) as any

      expect(payload1.userId).toBe(payload2.userId)
      expect(payload1.email).toBe(payload2.email)
      expect(payload1.iat).not.toBe(payload2.iat) // Different issue times
    })

    it('should not expose sensitive user data in tokens', () => {
      const sensitiveUser = {
        ...testUser,
        password: 'hashed-password',
        googleId: 'google-123',
        emailVerificationToken: 'verification-token',
        passwordResetToken: 'reset-token'
      }

      const { accessToken, refreshToken } = generateTokens(sensitiveUser)

      const accessPayload = jwt.decode(accessToken) as any
      const refreshPayload = jwt.decode(refreshToken) as any

      // Sensitive fields should not be in tokens
      expect(accessPayload.password).toBeUndefined()
      expect(accessPayload.googleId).toBeUndefined()
      expect(accessPayload.emailVerificationToken).toBeUndefined()
      expect(accessPayload.passwordResetToken).toBeUndefined()

      expect(refreshPayload.password).toBeUndefined()
      expect(refreshPayload.googleId).toBeUndefined()
      expect(refreshPayload.email).toBeUndefined()
      expect(refreshPayload.role).toBeUndefined()
    })
  })

  describe('Different User Types', () => {
    it('should generate tokens for standard registered users', async () => {
      const standardUser = await prisma.user.create({
        data: {
          email: 'standard@example.com',
          name: 'Standard User',
          password: 'hashed-password',
          plan: 'FREE',
          role: 'USER',
          credits: 5,
          creditsResetAt: new Date(),
          emailVerified: false
        }
      })

      const { accessToken, refreshToken } = generateTokens(standardUser)

      expect(accessToken).toBeTruthy()
      expect(refreshToken).toBeTruthy()

      const payload = jwt.verify(accessToken, config.auth.secret) as any
      expect(payload.userId).toBe(standardUser.id)
      expect(payload.email).toBe(standardUser.email)
      expect(payload.plan).toBe('FREE')
      expect(payload.role).toBe('USER')
    })

    it('should generate tokens for premium users', async () => {
      const premiumUser = await prisma.user.create({
        data: {
          email: 'premium@example.com',
          name: 'Premium User',
          googleId: 'google-premium-123',
          plan: 'PRO',
          role: 'USER',
          credits: 100,
          creditsResetAt: new Date(),
          emailVerified: true
        }
      })

      const { accessToken, refreshToken } = generateTokens(premiumUser)

      const payload = jwt.verify(accessToken, config.auth.secret) as any
      expect(payload.plan).toBe('PRO')
      expect(payload.role).toBe('USER')
    })

    it('should generate tokens for admin users', async () => {
      const adminUser = await prisma.user.create({
        data: {
          email: 'admin@truecheckia.com',
          name: 'Admin User',
          plan: 'ENTERPRISE',
          role: 'ADMIN',
          credits: 1000,
          creditsResetAt: new Date(),
          emailVerified: true
        }
      })

      const { accessToken, refreshToken } = generateTokens(adminUser)

      const payload = jwt.verify(accessToken, config.auth.secret) as any
      expect(payload.plan).toBe('ENTERPRISE')
      expect(payload.role).toBe('ADMIN')
    })
  })

  describe('Edge Cases', () => {
    it('should handle users with missing optional fields', () => {
      const minimalUser = {
        id: 'minimal-user',
        email: 'minimal@example.com',
        role: 'USER',
        plan: 'FREE'
      }

      const { accessToken, refreshToken } = generateTokens(minimalUser)

      expect(accessToken).toBeTruthy()
      expect(refreshToken).toBeTruthy()

      const payload = jwt.verify(accessToken, config.auth.secret) as any
      expect(payload.userId).toBe(minimalUser.id)
      expect(payload.email).toBe(minimalUser.email)
    })

    it('should handle users with special characters in data', () => {
      const specialUser = {
        ...testUser,
        email: 'user+test@example-domain.com',
        name: 'User "Special" O\'Malley'
      }

      const { accessToken, refreshToken } = generateTokens(specialUser)

      expect(accessToken).toBeTruthy()
      expect(refreshToken).toBeTruthy()

      const payload = jwt.verify(accessToken, config.auth.secret) as any
      expect(payload.email).toBe(specialUser.email)
    })

    it('should handle very long user data', () => {
      const longDataUser = {
        ...testUser,
        email: 'a'.repeat(100) + '@example.com',
        name: 'Very Long Name '.repeat(10).trim()
      }

      const { accessToken, refreshToken } = generateTokens(longDataUser)

      expect(accessToken).toBeTruthy()
      expect(refreshToken).toBeTruthy()

      // Tokens should still be valid despite long data
      expect(() => {
        jwt.verify(accessToken, config.auth.secret)
      }).not.toThrow()
    })
  })

  describe('Configuration Handling', () => {
    it('should use default expiration times when not configured', () => {
      // Test with minimal config
      const originalConfig = { ...config.auth }
      delete config.auth.jwtExpiresIn
      delete config.auth.refreshExpiresIn

      const { accessToken, refreshToken } = generateTokens(testUser)

      const accessPayload = jwt.decode(accessToken) as any
      const refreshPayload = jwt.decode(refreshToken) as any

      expect(accessPayload.exp).toBeDefined()
      expect(refreshPayload.exp).toBeDefined()

      // Restore config
      Object.assign(config.auth, originalConfig)
    })

    it('should handle custom expiration times', () => {
      // Temporarily modify config
      const originalConfig = { ...config.auth }
      config.auth.jwtExpiresIn = '1h'
      config.auth.refreshExpiresIn = '7d'

      const { accessToken, refreshToken } = generateTokens(testUser)

      const accessPayload = jwt.decode(accessToken) as any
      const refreshPayload = jwt.decode(refreshToken) as any

      const now = Math.floor(Date.now() / 1000)
      const accessTtl = accessPayload.exp - now
      const refreshTtl = refreshPayload.exp - now

      // Should be approximately 1 hour and 7 days
      expect(accessTtl).toBeGreaterThan(55 * 60) // > 55 minutes
      expect(accessTtl).toBeLessThan(65 * 60) // < 65 minutes

      expect(refreshTtl).toBeGreaterThan(6.5 * 24 * 60 * 60) // > 6.5 days
      expect(refreshTtl).toBeLessThan(7.5 * 24 * 60 * 60) // < 7.5 days

      // Restore config
      Object.assign(config.auth, originalConfig)
    })
  })
})