#!/usr/bin/env node

/**
 * Production CORS Validation
 * Validates CORS configuration post-deployment
 */

const https = require('https')

async function testCorsInBrowser() {
  console.log('🌐 Browser CORS Test Code:')
  console.log('Copy and paste this in browser console on https://www.truecheckia.com:\n')
  
  const testCode = `
// Test 1: Simple fetch to health endpoint
fetch('https://www.truecheckia.com/api/health', {
  method: 'GET',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log('✅ Health endpoint:', data))
.catch(err => console.error('❌ Health endpoint error:', err));

// Test 2: Login preflight test
fetch('https://www.truecheckia.com/api/auth/login', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'test123'
  })
})
.then(r => r.json())
.then(data => console.log('✅ Login preflight:', data))
.catch(err => console.error('❌ Login error (expected for invalid creds):', err));

// Test 3: Check CORS headers
fetch('https://www.truecheckia.com/api/health')
.then(response => {
  console.log('🔍 Response headers:');
  for (let [key, value] of response.headers.entries()) {
    if (key.includes('access-control') || key.includes('cors')) {
      console.log(\`   \${key}: \${value}\`);
    }
  }
})
.catch(err => console.error('❌ Headers test error:', err));
`

  console.log(testCode)
  console.log('\n Expected results:')
  console.log('✅ Health endpoint should return status data')
  console.log('✅ Login should fail with validation error (not CORS error)')
  console.log('✅ Headers should show proper Access-Control-* headers')
  console.log('\n❌ If you see CORS errors, the fix needs more work')
}

async function testEndpoints() {
  console.log('🧪 Production Endpoint Tests')
  console.log('============================\n')

  const tests = [
    {
      name: 'Health Check',
      path: '/api/health',
      method: 'GET',
      expectedStatus: 200
    },
    {
      name: 'Auth Login Preflight',
      path: '/api/auth/login',
      method: 'OPTIONS',
      expectedStatus: 204
    },
    {
      name: 'Auth Register Preflight',
      path: '/api/auth/register',
      method: 'OPTIONS',
      expectedStatus: 204
    }
  ]

  for (const test of tests) {
    await testSingleEndpoint(test)
  }
}

function testSingleEndpoint({ name, path, method, expectedStatus }) {
  return new Promise((resolve) => {
    console.log(`🔍 ${name}:`)
    
    const options = {
      hostname: 'www.truecheckia.com',
      port: 443,
      path,
      method,
      headers: {
        'Origin': 'https://www.truecheckia.com',
        'User-Agent': 'TrueCheckIA-Production-Validator/1.0'
      }
    }

    if (method === 'OPTIONS') {
      options.headers['Access-Control-Request-Method'] = 'POST'
      options.headers['Access-Control-Request-Headers'] = 'Content-Type,Authorization'
    }

    const req = https.request(options, (res) => {
      console.log(`   Status: ${res.statusCode} (expected: ${expectedStatus})`)
      console.log(`   CORS Origin: ${res.headers['access-control-allow-origin'] || 'NOT SET'}`)
      console.log(`   CORS Methods: ${res.headers['access-control-allow-methods'] || 'NOT SET'}`)
      console.log(`   CORS Credentials: ${res.headers['access-control-allow-credentials'] || 'NOT SET'}`)
      
      if (res.statusCode === expectedStatus) {
        console.log('   ✅ PASSED')
      } else {
        console.log('   ❌ FAILED - Status code mismatch')
      }
      
      console.log('')
      resolve()
    })

    req.on('error', (err) => {
      console.log(`   ❌ FAILED: ${err.message}`)
      console.log('')
      resolve()
    })

    req.setTimeout(5000, () => {
      console.log('   ⏱️ TIMEOUT')
      console.log('')
      req.destroy()
      resolve()
    })

    req.end()
  })
}

async function main() {
  console.log('🔧 TrueCheckIA Production CORS Validation')
  console.log('=========================================\n')
  
  await testEndpoints()
  await testCorsInBrowser()
  
  console.log('\n🚀 Deployment Checklist:')
  console.log('☐ Run: npm run build (in frontend directory)')
  console.log('☐ Deploy to Vercel: vercel --prod')
  console.log('☐ Wait 2-3 minutes for propagation')
  console.log('☐ Test frontend app at https://www.truecheckia.com')
  console.log('☐ Run browser CORS tests (code above)')
  console.log('☐ Check browser Network tab for CORS errors')
}

main().catch(console.error)