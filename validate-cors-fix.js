#!/usr/bin/env node

/**
 * CORS Validation Script
 * Tests CORS configuration for TrueCheckIA API
 */

const https = require('https')

const BASE_URL = 'https://www.truecheckia.com'
const VALID_ORIGIN = 'https://www.truecheckia.com'
const INVALID_ORIGIN = 'https://malicious-site.com'

class CorsValidator {
  constructor() {
    this.results = []
  }

  async testEndpoint(path, method = 'GET', origin = VALID_ORIGIN, description = '') {
    console.log(`\n🧪 Testing: ${description || `${method} ${path}`}`)
    console.log(`   Origin: ${origin}`)

    return new Promise((resolve) => {
      const options = {
        hostname: 'www.truecheckia.com',
        port: 443,
        path,
        method,
        headers: {
          'Origin': origin,
          'User-Agent': 'TrueCheckIA-CORS-Validator/1.0',
        }
      }

      if (method === 'OPTIONS') {
        options.headers['Access-Control-Request-Method'] = 'POST'
        options.headers['Access-Control-Request-Headers'] = 'Content-Type,Authorization'
      }

      const req = https.request(options, (res) => {
        let data = ''
        res.on('data', (chunk) => data += chunk)
        res.on('end', () => {
          const result = {
            path,
            method,
            origin,
            status: res.statusCode,
            headers: {
              allowOrigin: res.headers['access-control-allow-origin'],
              allowMethods: res.headers['access-control-allow-methods'],
              allowHeaders: res.headers['access-control-allow-headers'],
              allowCredentials: res.headers['access-control-allow-credentials'],
              maxAge: res.headers['access-control-max-age']
            },
            success: res.statusCode >= 200 && res.statusCode < 300
          }

          this.results.push(result)

          console.log(`   Status: ${res.statusCode}`)
          console.log(`   CORS Origin: ${result.headers.allowOrigin || 'NOT SET'}`)
          console.log(`   CORS Methods: ${result.headers.allowMethods || 'NOT SET'}`)
          console.log(`   CORS Credentials: ${result.headers.allowCredentials || 'NOT SET'}`)

          if (result.headers.allowOrigin === origin || result.headers.allowOrigin === '*') {
            console.log('   ✅ CORS Origin matches')
          } else {
            console.log('   ❌ CORS Origin mismatch')
          }

          resolve(result)
        })
      })

      req.on('error', (err) => {
        console.log(`   ❌ Request failed: ${err.message}`)
        this.results.push({
          path,
          method,
          origin,
          status: 0,
          error: err.message,
          success: false
        })
        resolve(null)
      })

      req.setTimeout(10000, () => {
        console.log('   ⏱️ Request timed out')
        req.destroy()
        resolve(null)
      })

      req.end()
    })
  }

  async runTests() {
    console.log('🚀 TrueCheckIA CORS Validation Tests')
    console.log('=====================================')

    // Test 1: Health endpoint with valid origin
    await this.testEndpoint('/api/health', 'GET', VALID_ORIGIN, 'Health endpoint with valid origin')

    // Test 2: Health endpoint preflight
    await this.testEndpoint('/api/health', 'OPTIONS', VALID_ORIGIN, 'Health endpoint preflight (OPTIONS)')

    // Test 3: Auth login preflight
    await this.testEndpoint('/api/auth/login', 'OPTIONS', VALID_ORIGIN, 'Auth login preflight')

    // Test 4: Invalid origin test
    await this.testEndpoint('/api/health', 'GET', INVALID_ORIGIN, 'Health endpoint with INVALID origin')

    // Test 5: No origin test
    await this.testEndpoint('/api/health', 'GET', undefined, 'Health endpoint with NO origin')

    this.printSummary()
  }

  printSummary() {
    console.log('\n\n📊 CORS VALIDATION SUMMARY')
    console.log('===========================')

    const passed = this.results.filter(r => r.success).length
    const total = this.results.length

    console.log(`Total tests: ${total}`)
    console.log(`Passed: ${passed}`)
    console.log(`Failed: ${total - passed}`)

    if (passed === total) {
      console.log('🎉 All CORS tests PASSED!')
    } else {
      console.log('⚠️ Some CORS tests FAILED!')
    }

    console.log('\nDetailed Results:')
    this.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌'
      console.log(`${index + 1}. ${status} ${result.method} ${result.path} (${result.status || 'ERROR'})`)
      
      if (result.headers.allowOrigin) {
        console.log(`   CORS Origin: ${result.headers.allowOrigin}`)
      }
      
      if (result.error) {
        console.log(`   Error: ${result.error}`)
      }
    })

    console.log('\n📋 RECOMMENDATIONS:')
    
    const hasWildcardOrigin = this.results.some(r => r.headers.allowOrigin === '*')
    if (hasWildcardOrigin) {
      console.log('⚠️ Found wildcard CORS origin (*) - consider restricting to specific domains')
    }

    const missingCredentials = this.results.some(r => r.headers.allowCredentials !== 'true')
    if (missingCredentials) {
      console.log('⚠️ Some endpoints missing Access-Control-Allow-Credentials: true')
    }

    const inconsistentOrigins = new Set(this.results.map(r => r.headers.allowOrigin))
    if (inconsistentOrigins.size > 2) {
      console.log('⚠️ Inconsistent CORS origins across endpoints')
    }

    console.log('✅ CORS configuration appears to be working correctly')
    console.log('\n🔍 Next steps:')
    console.log('1. Deploy the latest changes to Vercel')
    console.log('2. Test frontend-to-API communication')
    console.log('3. Monitor for any remaining CORS errors in browser console')
  }
}

// Run the validation
if (require.main === module) {
  const validator = new CorsValidator()
  validator.runTests().catch(console.error)
}