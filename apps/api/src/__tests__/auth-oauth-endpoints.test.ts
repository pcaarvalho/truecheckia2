// @ts-nocheck
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { prisma } from '@truecheckia/database'
import { app } from './test-app'
import { config } from '@truecheckia/config'

// Mock Passport Google Strategy
const mockPassport = {
  authenticate: jest.fn((strategy, options) => {
    return (req, res, next) => {
      if (strategy === 'google') {
        // Simulate Google OAuth redirect
        if (req.path === '/api/auth/google') {
          return res.redirect('https://accounts.google.com/oauth/authorize?...')
        }
        
        // Simulate callback with user data
        if (req.path.includes('/callback')) {
          req.user = {
            id: 'test-google-user-id',
            email: 'test@gmail.com',
            googleId: 'google-123456',
            name: 'Test Google User',
            avatar: 'https://example.com/avatar.jpg',
            plan: 'FREE',
            role: 'USER',
            emailVerified: true,
            credits: 5
          }
        }
      }
      next()
    }
  })
}

jest.mock('passport', () => mockPassport)

describe('OAuth Authentication Endpoints', () => {
  beforeEach(async () => {
    // Clean database before each test
    await prisma.analysis.deleteMany({})
    await prisma.user.deleteMany({})
    jest.clearAllMocks()
  })

  describe('GET /api/auth/google', () => {
    it('should redirect to Google OAuth URL', async () => {
      const response = await request(app)
        .get('/api/auth/google')
        .expect(302)

      // Should redirect to Google's OAuth endpoint
      expect(response.headers.location).toContain('accounts.google.com')
    })

    it('should initiate OAuth flow with correct parameters', async () => {
      await request(app)
        .get('/api/auth/google')
        .expect(302)

      expect(mockPassport.authenticate).toHaveBeenCalledWith('google', {
        scope: ['profile', 'email']
      })
    })

    it('should handle rate limiting on repeated requests', async () => {
      // Make multiple rapid requests
      const promises = Array(10).fill(null).map(() =>
        request(app).get('/api/auth/google')
      )

      const responses = await Promise.all(promises)
      
      // All should succeed as OAuth initiation shouldn't be heavily rate-limited
      responses.forEach(response => {
        expect([302, 429]).toContain(response.status)
      })
    })
  })

  describe('GET /api/auth/google/callback', () => {
    it('should handle successful OAuth callback with new user', async () => {
      // Mock a new user scenario
      mockPassport.authenticate.mockImplementation((strategy) => {
        return (req, res, next) => {
          if (strategy === 'google') {
            req.user = {
              id: 'new-user-id',
              email: 'newuser@gmail.com',
              googleId: 'google-new-123',
              name: 'New Google User',
              avatar: 'https://example.com/new-avatar.jpg',
              plan: 'FREE',
              role: 'USER',
              emailVerified: true,
              credits: 5
            }
          }
          next()
        }
      })

      const response = await request(app)
        .get('/api/auth/google/callback')
        .expect(302)

      // Should redirect to frontend with tokens
      expect(response.headers.location).toContain('/auth/callback')
      expect(response.headers.location).toContain('accessToken=')
      expect(response.headers.location).toContain('refreshToken=')

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: 'newuser@gmail.com' }
      })
      expect(user).toBeTruthy()
      expect(user.googleId).toBe('google-new-123')
    })

    it('should handle OAuth callback with existing user', async () => {
      // Create existing user
      const existingUser = await prisma.user.create({
        data: {
          email: 'existing@gmail.com',
          googleId: 'google-existing-123',
          name: 'Existing User',
          plan: 'PRO',
          credits: 50,
          creditsResetAt: new Date(),
          emailVerified: true,
          role: 'USER'
        }
      })

      mockPassport.authenticate.mockImplementation((strategy) => {
        return (req, res, next) => {
          if (strategy === 'google') {
            req.user = existingUser
          }
          next()
        }
      })

      const response = await request(app)
        .get('/api/auth/google/callback')
        .expect(302)

      expect(response.headers.location).toContain('/auth/callback')
      expect(response.headers.location).toContain('accessToken=')

      // Extract and verify token
      const locationUrl = new URL(response.headers.location, 'http://localhost')
      const accessToken = locationUrl.searchParams.get('accessToken')
      
      expect(accessToken).toBeTruthy()
      
      const payload = jwt.verify(accessToken, config.auth.secret) as any
      expect(payload.userId).toBe(existingUser.id)
      expect(payload.email).toBe(existingUser.email)
      expect(payload.plan).toBe('PRO')
    })

    it('should handle OAuth callback failure', async () => {
      mockPassport.authenticate.mockImplementation((strategy) => {
        return (req, res, next) => {
          if (strategy === 'google') {
            req.user = null // Authentication failed
          }
          next()
        }
      })

      const response = await request(app)
        .get('/api/auth/google/callback')
        .expect(302)

      expect(response.headers.location).toContain('error=auth_failed')
    })

    it('should handle database errors during user creation', async () => {
      mockPassport.authenticate.mockImplementation((strategy) => {
        return (req, res, next) => {
          if (strategy === 'google') {
            req.user = {
              id: 'error-user-id',
              email: 'error@gmail.com',
              googleId: 'google-error-123',
              name: 'Error User',
              plan: 'FREE',
              role: 'USER',
              emailVerified: true,
              credits: 5
            }
          }
          next()
        }
      })

      // Mock database error
      jest.spyOn(prisma.user, 'findUnique').mockRejectedValueOnce(new Error('Database error'))

      const response = await request(app)
        .get('/api/auth/google/callback')
        .expect(302)

      expect(response.headers.location).toContain('error=internal_error')
    })

    it('should generate valid JWT tokens in callback response', async () => {
      mockPassport.authenticate.mockImplementation((strategy) => {
        return (req, res, next) => {
          if (strategy === 'google') {
            req.user = {
              id: 'jwt-test-user',
              email: 'jwttest@gmail.com',
              googleId: 'google-jwt-123',
              name: 'JWT Test User',
              plan: 'FREE',
              role: 'USER',
              emailVerified: true,
              credits: 5
            }
          }
          next()
        }
      })

      const response = await request(app)
        .get('/api/auth/google/callback')
        .expect(302)

      const locationUrl = new URL(response.headers.location, 'http://localhost')
      const accessToken = locationUrl.searchParams.get('accessToken')
      const refreshToken = locationUrl.searchParams.get('refreshToken')

      expect(accessToken).toBeTruthy()
      expect(refreshToken).toBeTruthy()

      // Verify access token
      const accessPayload = jwt.verify(accessToken, config.auth.secret) as any
      expect(accessPayload.email).toBe('jwttest@gmail.com')
      expect(accessPayload.role).toBe('USER')
      expect(accessPayload.plan).toBe('FREE')

      // Verify refresh token
      const refreshPayload = jwt.verify(refreshToken, config.auth.refreshSecret) as any
      expect(refreshPayload.userId).toBeTruthy()
    })
  })

  describe('OAuth Security Tests', () => {
    it('should not expose sensitive user data in callback URL', async () => {
      mockPassport.authenticate.mockImplementation((strategy) => {
        return (req, res, next) => {
          if (strategy === 'google') {
            req.user = {
              id: 'security-test-user',
              email: 'security@gmail.com',
              googleId: 'google-security-123',
              name: 'Security Test User',
              password: 'should-not-be-exposed',
              sensitiveData: 'should-not-be-exposed',
              plan: 'FREE',
              role: 'USER',
              emailVerified: true,
              credits: 5
            }
          }
          next()
        }
      })

      const response = await request(app)
        .get('/api/auth/google/callback')
        .expect(302)

      const location = response.headers.location
      
      // Should not contain sensitive data
      expect(location).not.toContain('password')
      expect(location).not.toContain('sensitiveData')
      expect(location).not.toContain('googleId')
      
      // Should only contain tokens
      expect(location).toContain('accessToken=')
      expect(location).toContain('refreshToken=')
    })

    it('should validate JWT tokens for proper signing', async () => {
      mockPassport.authenticate.mockImplementation((strategy) => {
        return (req, res, next) => {
          if (strategy === 'google') {
            req.user = {
              id: 'validation-user',
              email: 'validation@gmail.com',
              googleId: 'google-validation-123',
              name: 'Validation User',
              plan: 'FREE',
              role: 'USER',
              emailVerified: true,
              credits: 5
            }
          }
          next()
        }
      })

      const response = await request(app)
        .get('/api/auth/google/callback')
        .expect(302)

      const locationUrl = new URL(response.headers.location, 'http://localhost')
      const accessToken = locationUrl.searchParams.get('accessToken')
      const refreshToken = locationUrl.searchParams.get('refreshToken')

      // Tokens should be properly signed and verifiable
      expect(() => jwt.verify(accessToken, config.auth.secret)).not.toThrow()
      expect(() => jwt.verify(refreshToken, config.auth.refreshSecret)).not.toThrow()

      // Tokens should NOT be verifiable with wrong secrets
      expect(() => jwt.verify(accessToken, 'wrong-secret')).toThrow()
      expect(() => jwt.verify(refreshToken, 'wrong-secret')).toThrow()
    })

    it('should handle malformed OAuth responses', async () => {
      mockPassport.authenticate.mockImplementation((strategy) => {
        return (req, res, next) => {
          if (strategy === 'google') {
            // Simulate malformed response
            req.user = {
              // Missing required fields
              name: 'Incomplete User'
            }
          }
          next()
        }
      })

      const response = await request(app)
        .get('/api/auth/google/callback')
        .expect(302)

      expect(response.headers.location).toContain('error=')
    })
  })

  describe('Integration with Existing Auth System', () => {
    it('should work with existing refresh token endpoint', async () => {
      // Create user via OAuth
      mockPassport.authenticate.mockImplementation((strategy) => {
        return (req, res, next) => {
          if (strategy === 'google') {
            req.user = {
              id: 'integration-user',
              email: 'integration@gmail.com',
              googleId: 'google-integration-123',
              name: 'Integration User',
              plan: 'FREE',
              role: 'USER',
              emailVerified: true,
              credits: 5
            }
          }
          next()
        }
      })

      const oauthResponse = await request(app)
        .get('/api/auth/google/callback')
        .expect(302)

      // Extract refresh token
      const locationUrl = new URL(oauthResponse.headers.location, 'http://localhost')
      const refreshToken = locationUrl.searchParams.get('refreshToken')

      // Use refresh token to get new access token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200)

      expect(refreshResponse.body.success).toBe(true)
      expect(refreshResponse.body.data.accessToken).toBeDefined()
      expect(refreshResponse.body.data.refreshToken).toBeDefined()

      // New tokens should be different
      expect(refreshResponse.body.data.refreshToken).not.toBe(refreshToken)
    })

    it('should maintain session consistency across OAuth and regular login', async () => {
      // Create user with email/password first
      const userData = {
        name: 'Dual Auth User',
        email: 'dualauth@example.com',
        password: 'Password123'
      }

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      const userId = registerResponse.body.data.user.id

      // Now simulate OAuth linking
      await prisma.user.update({
        where: { id: userId },
        data: {
          googleId: 'google-dual-auth-123',
          emailVerified: true
        }
      })

      // Regular login should still work
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200)

      expect(loginResponse.body.success).toBe(true)
      expect(loginResponse.body.data.user.id).toBe(userId)

      // OAuth callback should also work for same user
      mockPassport.authenticate.mockImplementation((strategy) => {
        return (req, res, next) => {
          if (strategy === 'google') {
            req.user = {
              id: userId,
              email: userData.email,
              googleId: 'google-dual-auth-123',
              name: userData.name,
              plan: 'FREE',
              role: 'USER',
              emailVerified: true,
              credits: 5
            }
          }
          next()
        }
      })

      const oauthResponse = await request(app)
        .get('/api/auth/google/callback')
        .expect(302)

      expect(oauthResponse.headers.location).toContain('accessToken=')
      
      // Both methods should produce tokens for the same user
      const locationUrl = new URL(oauthResponse.headers.location, 'http://localhost')
      const oauthAccessToken = locationUrl.searchParams.get('accessToken')
      
      const oauthPayload = jwt.verify(oauthAccessToken, config.auth.secret) as any
      const loginPayload = jwt.verify(loginResponse.body.data.accessToken, config.auth.secret) as any
      
      expect(oauthPayload.userId).toBe(loginPayload.userId)
      expect(oauthPayload.email).toBe(loginPayload.email)
    })
  })

  describe('Error Recovery and Fallbacks', () => {
    it('should handle network failures gracefully', async () => {
      // Simulate network failure in OAuth flow
      mockPassport.authenticate.mockImplementation((strategy) => {
        throw new Error('Network failure')
      })

      const response = await request(app)
        .get('/api/auth/google/callback')
        .expect(302)

      expect(response.headers.location).toContain('error=internal_error')
    })

    it('should handle partial OAuth data', async () => {
      mockPassport.authenticate.mockImplementation((strategy) => {
        return (req, res, next) => {
          if (strategy === 'google') {
            req.user = {
              // Only minimal data available
              email: 'minimal@gmail.com',
              googleId: 'google-minimal-123'
            }
          }
          next()
        }
      })

      const response = await request(app)
        .get('/api/auth/google/callback')
        .expect(302)

      // Should still succeed with default values
      expect(response.headers.location).toContain('accessToken=')

      // Verify user was created with defaults
      const user = await prisma.user.findUnique({
        where: { email: 'minimal@gmail.com' }
      })
      expect(user).toBeTruthy()
      expect(user.name).toBeTruthy() // Should have default name
      expect(user.plan).toBe('FREE') // Should have default plan
    })
  })
})