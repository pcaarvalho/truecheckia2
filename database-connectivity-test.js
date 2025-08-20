#!/usr/bin/env node

/**
 * Database Connectivity Test
 * Tests Neon PostgreSQL connection and basic operations
 */

const https = require('https');
const { URL } = require('url');

const CONFIG = {
  apiBase: 'https://www.truecheckia.com/api',
  timeout: 20000
};

function log(message, color = 'white') {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
  };
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          responseTime: Date.now() - startTime
        });
      });
    });

    const startTime = Date.now();
    
    req.on('error', reject);
    req.setTimeout(CONFIG.timeout, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

function parseUrl(url) {
  const parsed = new URL(url);
  return {
    hostname: parsed.hostname,
    port: 443,
    path: parsed.pathname + parsed.search,
    method: 'GET'
  };
}

async function testHealthWithDB() {
  log('\n💓 Testing Health Endpoint (DB Check)', 'cyan');
  
  try {
    const response = await makeRequest({
      ...parseUrl(`${CONFIG.apiBase}/health`),
      method: 'GET',
      headers: {
        'User-Agent': 'TrueCheckIA-DB-Tester/1.0',
        'Accept': 'application/json'
      }
    });

    log(`Status Code: ${response.statusCode}`, 'blue');
    log(`Response Time: ${response.responseTime}ms`, 'blue');
    
    if (response.statusCode === 200) {
      try {
        const healthData = JSON.parse(response.body);
        log(`Health Status: ${healthData.status}`, 'green');
        
        // Check for database-related information
        if (healthData.database || healthData.db || healthData.connections) {
          log('✅ Health endpoint includes database status', 'green');
          if (healthData.database) {
            log(`Database Status: ${JSON.stringify(healthData.database)}`, 'blue');
          }
        } else {
          log('⚠️  Health endpoint may not check database connectivity', 'yellow');
        }
        
        // Fast response usually indicates good DB connection
        if (response.responseTime < 1000) {
          log('✅ Fast response time suggests healthy DB connection', 'green');
        } else {
          log('⚠️  Slow response time may indicate DB issues', 'yellow');
        }
        
      } catch (e) {
        log('❌ Invalid JSON response from health endpoint', 'red');
      }
    } else {
      log(`❌ Health endpoint failed: HTTP ${response.statusCode}`, 'red');
    }
    
  } catch (error) {
    log(`❌ Health endpoint test failed: ${error.message}`, 'red');
  }
}

async function testDatabaseViaAuth() {
  log('\n🔍 Testing Database via Authentication', 'cyan');
  
  // Test login with minimal valid data
  const testCases = [
    {
      name: 'Empty Login Request',
      data: {},
      expectedStatus: [400, 422], // Validation error
      description: 'Should return validation error, not DB error'
    },
    {
      name: 'Invalid Email Format',
      data: { email: 'invalid-email', password: 'password123' },
      expectedStatus: [400, 422],
      description: 'Should validate email format before DB query'
    },
    {
      name: 'Valid Format Login',
      data: { email: 'test@example.com', password: 'password123' },
      expectedStatus: [400, 401, 404], // User not found or invalid credentials
      description: 'Should reach DB and return authentication error'
    }
  ];

  for (const testCase of testCases) {
    try {
      log(`\n   Testing: ${testCase.name}`, 'blue');
      
      const loginData = JSON.stringify(testCase.data);
      const response = await makeRequest({
        ...parseUrl(`${CONFIG.apiBase}/auth/login`),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(loginData),
          'User-Agent': 'TrueCheckIA-DB-Tester/1.0'
        }
      }, loginData);

      log(`   Status: ${response.statusCode} (${response.responseTime}ms)`, 'blue');
      
      if (testCase.expectedStatus.includes(response.statusCode)) {
        if (response.statusCode === 500) {
          log('   ❌ Server error suggests DB connection issue', 'red');
        } else {
          log('   ✅ Expected response - DB likely connected', 'green');
        }
      } else if (response.statusCode === 500) {
        log('   ❌ Server error - possible database connection issue', 'red');
        try {
          const errorData = JSON.parse(response.body);
          if (errorData.error && errorData.error.includes('connect')) {
            log('   ❌ Connection error detected in response', 'red');
          }
        } catch (e) {
          // Could not parse error response
        }
      } else {
        log(`   ⚠️  Unexpected status: ${response.statusCode}`, 'yellow');
      }
      
      log(`   ${testCase.description}`, 'blue');
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      if (error.message.includes('timeout')) {
        log(`   ❌ Request timeout - possible DB connection hanging`, 'red');
      } else {
        log(`   ❌ Request failed: ${error.message}`, 'red');
      }
    }
  }
}

async function testDatabaseViaRegister() {
  log('\n📝 Testing Database via Registration', 'cyan');
  
  const timestamp = Date.now();
  const testEmail = `dbtest-${timestamp}@example.com`;
  
  try {
    const registerData = JSON.stringify({
      email: testEmail,
      password: 'TestPassword123!',
      name: 'DB Test User'
    });

    const response = await makeRequest({
      ...parseUrl(`${CONFIG.apiBase}/auth/register`),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(registerData),
        'User-Agent': 'TrueCheckIA-DB-Tester/1.0'
      }
    }, registerData);

    log(`Status Code: ${response.statusCode}`, 'blue');
    log(`Response Time: ${response.responseTime}ms`, 'blue');
    
    if (response.statusCode === 201 || response.statusCode === 200) {
      log('✅ User registration successful - database write working', 'green');
      
      try {
        const registerResult = JSON.parse(response.body);
        if (registerResult.user || registerResult.id) {
          log('✅ Registration returns user data - database read working', 'green');
        }
      } catch (e) {
        log('⚠️  Could not parse registration response', 'yellow');
      }
      
    } else if (response.statusCode === 409) {
      log('⚠️  User already exists (expected if running multiple times)', 'yellow');
      log('✅ Database uniqueness constraints working', 'green');
      
    } else if (response.statusCode === 400) {
      log('⚠️  Validation error - check request format', 'yellow');
      
      try {
        const errorData = JSON.parse(response.body);
        log(`   Error: ${errorData.message || errorData.error}`, 'blue');
      } catch (e) {
        // Could not parse error
      }
      
    } else if (response.statusCode === 500) {
      log('❌ Server error - likely database connection issue', 'red');
      
      try {
        const errorData = JSON.parse(response.body);
        if (errorData.error && (
          errorData.error.includes('database') || 
          errorData.error.includes('connection') ||
          errorData.error.includes('timeout')
        )) {
          log('❌ Database-related error confirmed', 'red');
        }
      } catch (e) {
        // Could not parse error
      }
    } else {
      log(`⚠️  Unexpected registration status: ${response.statusCode}`, 'yellow');
    }
    
  } catch (error) {
    if (error.message.includes('timeout')) {
      log('❌ Registration timeout - database may be unresponsive', 'red');
    } else {
      log(`❌ Registration test failed: ${error.message}`, 'red');
    }
  }
}

async function testDatabasePerformance() {
  log('\n⚡ Testing Database Performance', 'cyan');
  
  const requests = [];
  const concurrentRequests = 5;
  
  // Create multiple concurrent authentication requests
  const promises = Array.from({ length: concurrentRequests }, async (_, index) => {
    const startTime = Date.now();
    
    try {
      const response = await makeRequest({
        ...parseUrl(`${CONFIG.apiBase}/auth/login`),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TrueCheckIA-DB-Tester/1.0'
        }
      }, JSON.stringify({
        email: `perftest${index}@example.com`,
        password: 'password123'
      }));

      return {
        requestId: index,
        statusCode: response.statusCode,
        responseTime: Date.now() - startTime,
        success: response.statusCode !== 500
      };
      
    } catch (error) {
      return {
        requestId: index,
        error: error.message,
        responseTime: Date.now() - startTime,
        success: false
      };
    }
  });

  try {
    const results = await Promise.all(promises);
    
    const responseTimes = results
      .filter(r => !r.error)
      .map(r => r.responseTime);
    
    const successCount = results.filter(r => r.success).length;
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;
    
    log(`Concurrent Requests: ${concurrentRequests}`, 'blue');
    log(`Successful Responses: ${successCount}/${concurrentRequests}`, 'blue');
    log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`, 'blue');
    log(`Max Response Time: ${Math.max(...responseTimes, 0)}ms`, 'blue');
    log(`Min Response Time: ${Math.min(...responseTimes, Infinity)}ms`, 'blue');
    
    if (successCount === concurrentRequests) {
      log('✅ Database handles concurrent requests well', 'green');
    } else {
      log(`⚠️  ${concurrentRequests - successCount} requests failed`, 'yellow');
    }
    
    if (avgResponseTime < 2000) {
      log('✅ Good database response times', 'green');
    } else if (avgResponseTime < 5000) {
      log('⚠️  Acceptable but slow database response times', 'yellow');
    } else {
      log('❌ Very slow database response times', 'red');
    }
    
  } catch (error) {
    log(`❌ Performance test failed: ${error.message}`, 'red');
  }
}

async function runDatabaseTests() {
  log('🗄️  Database Connectivity Test Suite', 'bold');
  log('='.repeat(50), 'white');
  log(`Testing database connectivity via API: ${CONFIG.apiBase}`, 'cyan');
  log('='.repeat(50), 'white');

  await testHealthWithDB();
  await testDatabaseViaAuth();
  await testDatabaseViaRegister();
  await testDatabasePerformance();
  
  log('\n📊 Database Test Summary', 'bold');
  log('='.repeat(50), 'white');
  log('✅ Green checks indicate database is working', 'green');
  log('⚠️  Yellow warnings indicate potential issues', 'yellow');
  log('❌ Red X marks indicate database problems', 'red');
  
  log('\n🔧 Database Health Checklist:', 'cyan');
  log('□ Connection pool not exhausted', 'blue');
  log('□ Query response times < 2s', 'blue');
  log('□ No 500 errors on valid requests', 'blue');
  log('□ Concurrent requests handled properly', 'blue');
  log('□ Database constraints enforced', 'blue');
  
  log('\n💡 If issues detected:', 'cyan');
  log('1. Check Neon PostgreSQL dashboard', 'blue');
  log('2. Verify DATABASE_URL and DIRECT_URL', 'blue');
  log('3. Check connection pool settings', 'blue');
  log('4. Monitor database metrics', 'blue');
}

if (require.main === module) {
  runDatabaseTests().catch(error => {
    log(`Fatal error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runDatabaseTests };