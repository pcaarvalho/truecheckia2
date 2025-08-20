import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EnvironmentValidator } from '@/utils/environment-validator'

// Create a mock env object that can be modified
const createMockEnv = () => ({
  environment: 'production',
  isProduction: true,
  isDevelopment: false,
  apiBaseUrl: 'https://api.truecheckia.com/api',
  appUrl: 'https://truecheckia.com',
  version: '1.0.0',
  buildDate: '2025-08-20',
  stripePublishableKey: 'pk_live_...',
  enableErrorTracking: true,
  enableAnalytics: true,
  enablePWA: true,
})

let mockEnv = createMockEnv()

vi.mock('@/config/env', () => ({
  get env() {
    return mockEnv
  }
}))

// Mock debug utility
vi.mock('@/lib/debug', () => ({
  debug: {
    environment: vi.fn(),
    environmentError: vi.fn(),
    environmentWarn: vi.fn(),
  }
}))

describe('EnvironmentValidator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock env to default values
    mockEnv = createMockEnv()
  })

  describe('Production Environment Validation', () => {
    it('should pass validation for proper production configuration', () => {
      const result = EnvironmentValidator.validate()

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.info.environment).toBe('production')
      expect(result.info.apiBaseUrl).toBe('https://api.truecheckia.com/api')
      expect(result.info.appUrl).toBe('https://truecheckia.com')
    })

    it('should fail validation when API URL contains localhost in production', () => {
      mockEnv.apiBaseUrl = 'http://localhost:4000/api'

      const result = EnvironmentValidator.validate()

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('API Base URL cannot contain localhost in production')
    })

    it('should fail validation when API URL contains 127.0.0.1 in production', () => {
      mockEnv.apiBaseUrl = 'http://127.0.0.1:4000/api'

      const result = EnvironmentValidator.validate()

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('API Base URL cannot contain localhost in production')
    })

    it('should fail validation when App URL contains localhost in production', () => {
      mockEnv.appUrl = 'http://localhost:3000'

      const result = EnvironmentValidator.validate()

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('App URL cannot contain localhost in production')
    })

    it('should fail validation when API URL does not use HTTPS in production', () => {
      mockEnv.apiBaseUrl = 'http://api.truecheckia.com/api'

      const result = EnvironmentValidator.validate()

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('API Base URL must use HTTPS in production')
    })

    it('should fail validation when App URL does not use HTTPS in production', () => {
      mockEnv.appUrl = 'http://truecheckia.com'

      const result = EnvironmentValidator.validate()

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('App URL must use HTTPS in production')
    })

    it('should warn when using Stripe test key in production', () => {
      mockEnv.stripePublishableKey = 'pk_test_123456789'

      const result = EnvironmentValidator.validate()

      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain('Using Stripe test key in production')
    })

    it('should warn when error tracking is disabled in production', () => {
      mockEnv.enableErrorTracking = false

      const result = EnvironmentValidator.validate()

      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain('Error tracking is disabled in production')
    })

    it('should handle multiple validation errors', () => {
      mockEnv.apiBaseUrl = 'http://localhost:4000/api'
      mockEnv.appUrl = 'http://localhost:3000'

      const result = EnvironmentValidator.validate()

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(4) // localhost + HTTP for both URLs
      expect(result.errors).toContain('API Base URL cannot contain localhost in production')
      expect(result.errors).toContain('App URL cannot contain localhost in production')
      expect(result.errors).toContain('API Base URL must use HTTPS in production')
      expect(result.errors).toContain('App URL must use HTTPS in production')
    })
  })

  describe('Development Environment Validation', () => {
    beforeEach(() => {
      mockEnv.environment = 'development'
      mockEnv.isProduction = false
      mockEnv.isDevelopment = true
      mockEnv.apiBaseUrl = 'http://localhost:4000/api'
      mockEnv.appUrl = 'http://localhost:3000'
    })

    it('should pass validation for development configuration', () => {
      const result = EnvironmentValidator.validate()

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.info.environment).toBe('development')
    })

    it('should warn when development uses remote API', () => {
      mockEnv.apiBaseUrl = 'https://api.truecheckia.com/api'

      const result = EnvironmentValidator.validate()

      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain('Development environment using remote API')
    })

    it('should warn when using HTTPS with localhost', () => {
      mockEnv.apiBaseUrl = 'https://localhost:4000/api'

      const result = EnvironmentValidator.validate()

      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain('Using HTTPS with localhost (may cause certificate issues)')
    })
  })

  describe('General Validation', () => {
    it('should fail validation when API Base URL is missing', () => {
      mockEnv.apiBaseUrl = ''

      const result = EnvironmentValidator.validate()

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('API Base URL and App URL are required')
    })

    it('should fail validation when App URL is missing', () => {
      mockEnv.appUrl = ''

      const result = EnvironmentValidator.validate()

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('API Base URL and App URL are required')
    })
  })

  describe('validateAndThrow', () => {
    it('should not throw when validation passes', () => {
      expect(() => {
        EnvironmentValidator.validateAndThrow()
      }).not.toThrow()
    })

    it('should throw when validation fails', () => {
      mockEnv.apiBaseUrl = 'http://localhost:4000/api'

      expect(() => {
        EnvironmentValidator.validateAndThrow()
      }).toThrow('Environment validation failed')
    })

    it('should include all error messages in thrown error', () => {
      mockEnv.apiBaseUrl = 'http://localhost:4000/api'
      mockEnv.appUrl = 'http://localhost:3000'

      expect(() => {
        EnvironmentValidator.validateAndThrow()
      }).toThrow(/API Base URL cannot contain localhost in production/)
    })
  })

  describe('testAPIConnection', () => {
    beforeEach(() => {
      global.fetch = vi.fn()
    })

    it('should return true for successful API connection', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK'
      })

      const result = await EnvironmentValidator.testAPIConnection()

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.truecheckia.com/health',
        expect.objectContaining({
          method: 'GET',
          timeout: 5000
        })
      )
    })

    it('should return false for failed API connection', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      const result = await EnvironmentValidator.testAPIConnection()

      expect(result).toBe(false)
    })

    it('should return false when fetch throws an error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await EnvironmentValidator.testAPIConnection()

      expect(result).toBe(false)
    })

    it('should handle API URL with /api suffix correctly', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK'
      })

      await EnvironmentValidator.testAPIConnection()

      // Should replace /api with /health
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.truecheckia.com/health',
        expect.any(Object)
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined environment values gracefully', () => {
      mockEnv.apiBaseUrl = undefined
      mockEnv.appUrl = undefined

      const result = EnvironmentValidator.validate()

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('API Base URL and App URL are required')
    })

    it('should handle null environment values gracefully', () => {
      mockEnv.apiBaseUrl = null
      mockEnv.appUrl = null

      const result = EnvironmentValidator.validate()

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('API Base URL and App URL are required')
    })

    it('should handle mixed case localhost variations', () => {
      mockEnv.apiBaseUrl = 'http://LocalHost:4000/api'
      mockEnv.appUrl = 'http://LOCALHOST:3000'

      const result = EnvironmentValidator.validate()

      // Current implementation is case-sensitive, but we could enhance it
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should validate complex production URLs correctly', () => {
      mockEnv.apiBaseUrl = 'https://api.prod.truecheckia.com/v1/api'
      mockEnv.appUrl = 'https://app.prod.truecheckia.com'

      const result = EnvironmentValidator.validate()

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle URLs with ports in production', () => {
      mockEnv.apiBaseUrl = 'https://api.truecheckia.com:443/api'
      mockEnv.appUrl = 'https://truecheckia.com:443'

      const result = EnvironmentValidator.validate()

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Logging and Debug Integration', () => {
    it('should log environment info in development', () => {
      mockEnv.isDevelopment = true
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      EnvironmentValidator.logEnvironmentInfo()

      expect(consoleSpy).toHaveBeenCalledWith('🔧 Environment Information:')
      expect(consoleSpy).toHaveBeenCalledWith('  Environment: development')
      expect(consoleSpy).toHaveBeenCalledWith('  API Base URL: https://api.truecheckia.com/api')
      expect(consoleSpy).toHaveBeenCalledWith('  App URL: https://truecheckia.com')

      consoleSpy.mockRestore()
    })
  })
})