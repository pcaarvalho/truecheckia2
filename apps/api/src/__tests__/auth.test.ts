import request from 'supertest'
import jwt from 'jsonwebtoken'
import { prisma } from '@truecheckia/database'
import { app } from './test-app'
import { config } from '@truecheckia/config'

describe('Authentication Tests', () => {
  let testUser: any
  let accessToken: string
  let refreshToken: string

  beforeEach(async () => {
    // Clean database before each test
    await prisma.analysis.deleteMany({})
    await prisma.user.deleteMany({})
  })

  describe('POST /api/auth/register', () => {
    it('should register user with simple password (Test123456)', async () => {
      const userData = {
        name: 'Test User',
        email: 'test.simple@example.com',
        password: 'Test123456'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Account created successfully. You can start using TrueCheckIA immediately!',
        data: {
          user: {
            email: userData.email,
            name: userData.name,
            plan: 'FREE',
            emailVerified: false
          }
        }
      })

      // Verify tokens are provided
      expect(response.body.data.accessToken).toBeDefined()
      expect(response.body.data.refreshToken).toBeDefined()

      // Validate JWT tokens
      const accessPayload = jwt.verify(response.body.data.accessToken, config.auth.secret) as any
      expect(accessPayload.email).toBe(userData.email)

      const refreshPayload = jwt.verify(response.body.data.refreshToken, config.auth.refreshSecret) as any
      expect(refreshPayload.email).toBe(userData.email)
    })

    it('should register user with special characters (!@#$)', async () => {
      const userData = {
        name: 'Special User',
        email: 'test.special@example.com',
        password: 'Password!@#$123'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user.email).toBe(userData.email)
      expect(response.body.data.accessToken).toBeDefined()
      expect(response.body.data.refreshToken).toBeDefined()
    })

    it('should fail with duplicate email', async () => {
      const userData = {
        name: 'Test User',
        email: 'duplicate@example.com',
        password: 'Password123'
      }

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409)

      expect(response.body.success).toBe(false)
      expect(response.body.error?.message).toContain('already registered')
    })

    it('should fail with invalid email format', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'Password123'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.success).toBe(false)
    })

    it('should fail with short password', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: '123'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.success).toBe(false)
    })
  })

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      const userData = {
        name: 'Test User',
        email: 'test.login@example.com',
        password: 'Password123'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      testUser = response.body.data.user
    })

    it('should login with correct credentials', async () => {
      const loginData = {
        email: 'test.login@example.com',
        password: 'Password123'
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            email: loginData.email,
            plan: 'FREE'
          }
        }
      })

      expect(response.body.data.accessToken).toBeDefined()
      expect(response.body.data.refreshToken).toBeDefined()

      accessToken = response.body.data.accessToken
      refreshToken = response.body.data.refreshToken
    })

    it('should login with dev@truecheckia.com (if exists)', async () => {
      // First create the dev user
      const devUser = {
        name: 'Dev User',
        email: 'dev@truecheckia.com',
        password: 'dev12345'
      }

      await request(app)
        .post('/api/auth/register')
        .send(devUser)
        .expect(201)

      // Now test login
      const loginData = {
        email: 'dev@truecheckia.com',
        password: 'dev12345'
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user.email).toBe('dev@truecheckia.com')
    })

    it('should fail with incorrect password', async () => {
      const loginData = {
        email: 'test.login@example.com',
        password: 'WrongPassword'
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error?.message).toContain('password')
    })

    it('should fail with non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Password123'
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error?.message).toContain('email')
    })

    it('should handle special characters in password', async () => {
      // Create user with special characters
      const userData = {
        name: 'Special User',
        email: 'special.login@example.com',
        password: 'Pass!@#$%^&*()123'
      }

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      // Login with special characters
      const loginData = {
        email: 'special.login@example.com',
        password: 'Pass!@#$%^&*()123'
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200)

      expect(response.body.success).toBe(true)
    })
  })

  describe('POST /api/auth/refresh', () => {
    beforeEach(async () => {
      // Create and login user to get tokens
      const userData = {
        name: 'Refresh User',
        email: 'test.refresh@example.com',
        password: 'Password123'
      }

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      accessToken = registerResponse.body.data.accessToken
      refreshToken = registerResponse.body.data.refreshToken
    })

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.accessToken).toBeDefined()
      expect(response.body.data.refreshToken).toBeDefined()

      // Verify new tokens are different
      expect(response.body.data.accessToken).not.toBe(accessToken)
      expect(response.body.data.refreshToken).not.toBe(refreshToken)
    })

    it('should fail with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401)

      expect(response.body.success).toBe(false)
    })

    it('should fail with missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400)

      expect(response.body.success).toBe(false)
    })
  })

  describe('End-to-End Authentication Flow', () => {
    it('should complete full flow: register → login → access protected resource', async () => {
      // Step 1: Register
      const userData = {
        name: 'E2E User',
        email: 'test.e2e@example.com',
        password: 'E2EPassword123'
      }

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      expect(registerResponse.body.success).toBe(true)
      const firstAccessToken = registerResponse.body.data.accessToken

      // Step 2: Login (should work independently)
      const loginData = {
        email: userData.email,
        password: userData.password
      }

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200)

      expect(loginResponse.body.success).toBe(true)
      const secondAccessToken = loginResponse.body.data.accessToken

      // Verify both tokens are valid JWT
      const firstPayload = jwt.verify(firstAccessToken, config.auth.secret) as any
      const secondPayload = jwt.verify(secondAccessToken, config.auth.secret) as any

      expect(firstPayload.email).toBe(userData.email)
      expect(secondPayload.email).toBe(userData.email)
    })

    it('should maintain session persistence through token refresh', async () => {
      // Register user
      const userData = {
        name: 'Persistence User',
        email: 'test.persistence@example.com',
        password: 'PersistenceTest123'
      }

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      const originalRefreshToken = registerResponse.body.data.refreshToken

      // Refresh token multiple times
      let currentRefreshToken = originalRefreshToken

      for (let i = 0; i < 3; i++) {
        const refreshResponse = await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken: currentRefreshToken })
          .expect(200)

        expect(refreshResponse.body.success).toBe(true)
        currentRefreshToken = refreshResponse.body.data.refreshToken

        // Verify user data is consistent
        const payload = jwt.verify(refreshResponse.body.data.accessToken, config.auth.secret) as any
        expect(payload.email).toBe(userData.email)
      }
    })
  })

  describe('Edge Cases and Security Tests', () => {
    it('should handle passwords with escape characters', async () => {
      const userData = {
        name: 'Escape User',
        email: 'test.escape@example.com',
        password: 'Password\\"123\\n\\t'
      }

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      expect(registerResponse.body.success).toBe(true)

      // Verify login works with escaped characters
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200)

      expect(loginResponse.body.success).toBe(true)
    })

    it('should handle emails with special characters', async () => {
      const userData = {
        name: 'Special Email User',
        email: 'test+special.email-123@example-domain.com',
        password: 'SpecialEmail123'
      }

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      expect(registerResponse.body.success).toBe(true)
      expect(registerResponse.body.data.user.email).toBe(userData.email)
    })

    it('should reject extremely long inputs', async () => {
      const longString = 'a'.repeat(1000)

      const userData = {
        name: longString,
        email: `${longString}@example.com`,
        password: longString
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.success).toBe(false)
    })

    it('should handle concurrent registration attempts', async () => {
      const userData = {
        name: 'Concurrent User',
        email: 'test.concurrent@example.com',
        password: 'ConcurrentTest123'
      }

      // Try to register the same user multiple times simultaneously
      const promises = Array(5).fill(null).map(() => 
        request(app)
          .post('/api/auth/register')
          .send(userData)
      )

      const responses = await Promise.all(promises)
      
      // Only one should succeed (201), others should fail (409)
      const successCount = responses.filter(r => r.status === 201).length
      const failCount = responses.filter(r => r.status === 409).length

      expect(successCount).toBe(1)
      expect(failCount).toBe(4)
    })

    it('should validate JWT token structure', async () => {
      const userData = {
        name: 'JWT Test User',
        email: 'test.jwt@example.com',
        password: 'JWTTest123'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      const { accessToken, refreshToken } = response.body.data

      // Verify token structure
      const accessPayload = jwt.decode(accessToken, { complete: true }) as any
      const refreshPayload = jwt.decode(refreshToken, { complete: true }) as any

      expect(accessPayload.header.alg).toBe('HS256')
      expect(accessPayload.payload.userId).toBeDefined()
      expect(accessPayload.payload.email).toBe(userData.email)
      expect(accessPayload.payload.exp).toBeDefined()

      expect(refreshPayload.header.alg).toBe('HS256')
      expect(refreshPayload.payload.userId).toBeDefined()
      expect(refreshPayload.payload.email).toBe(userData.email)
    })
  })

  describe('Error Handling and Validation', () => {
    it('should return proper error format for validation errors', async () => {
      const invalidData = {
        // Missing required fields
        email: 'invalid-email',
        password: '123' // too short
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String)
        }
      })
    })

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send('invalid-json')
        .expect(400)

      expect(response.body.success).toBe(false)
    })

    it('should handle missing content-type', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', '')
        .send('name=test&email=test@example.com&password=password123')
        .expect(400)

      // Should still handle the request gracefully
      expect(response.body.success).toBe(false)
    })
  })
})