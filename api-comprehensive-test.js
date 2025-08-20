#!/usr/bin/env node

/**
 * TrueCheckIA API Comprehensive Test Suite
 * Tests all endpoints, authentication flows, and CORS configuration
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs');

// Test Configuration
const CONFIG = {
  baseUrl: 'https://www.truecheckia.com',
  apiBase: 'https://www.truecheckia.com/api',
  timeout: 15000,
  maxRetries: 3,
  testEmail: 'test@example.com',
  testPassword: 'TestPass123!',
  expectedCorsOrigin: 'https://www.truecheckia.com'
};

// Test Results Storage
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: [],
  summary: {}
};

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Utility functions
function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logResult(testName, status, details = '') {
  const statusColor = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '⚠';
  log(`${icon} ${testName}: ${colors[statusColor]}${status}${colors.reset} ${details}`);
  
  results.tests.push({
    name: testName,
    status,
    details,
    timestamp: new Date().toISOString()
  });
  
  if (status === 'PASS') results.passed++;
  else if (status === 'FAIL') results.failed++;
  else results.warnings++;
}

// HTTP Request helper with retries
function makeRequest(options, postData = null, retries = CONFIG.maxRetries) {
  return new Promise((resolve, reject) => {
    const protocol = options.port === 443 || options.protocol === 'https:' ? https : http;
    
    const req = protocol.request(options, (res) => {
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
    
    req.on('error', (error) => {
      if (retries > 0 && (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT')) {
        log(`Retrying request (${retries} attempts left)...`, 'yellow');
        return makeRequest(options, postData, retries - 1)
          .then(resolve)
          .catch(reject);
      }
      reject(error);
    });

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

// Parse URL helper
function parseUrl(url) {
  const parsed = new URL(url);
  return {
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
    path: parsed.pathname + parsed.search,
    method: 'GET'
  };
}

// Test Suite Functions

/**
 * Test 1: Health Check Endpoint
 */
async function testHealthEndpoint() {
  log('\n🏥 Testing Health Endpoint', 'cyan');
  
  try {
    const response = await makeRequest({
      ...parseUrl(`${CONFIG.apiBase}/health`),
      method: 'GET',
      headers: {
        'User-Agent': 'TrueCheckIA-API-Tester/1.0',
        'Accept': 'application/json'
      }
    });

    if (response.statusCode === 200) {
      let healthData;
      try {
        healthData = JSON.parse(response.body);
      } catch (e) {
        logResult('Health Endpoint JSON Parse', 'FAIL', 'Invalid JSON response');
        return;
      }

      logResult('Health Endpoint Status', 'PASS', `200 OK (${response.responseTime}ms)`);
      
      // Check health response structure
      const expectedFields = ['status', 'timestamp'];
      const hasAllFields = expectedFields.every(field => field in healthData);
      
      if (hasAllFields) {
        logResult('Health Response Structure', 'PASS', 'All required fields present');
      } else {
        logResult('Health Response Structure', 'WARN', 'Missing some expected fields');
      }
      
      // Log health details
      log(`   Status: ${healthData.status || 'unknown'}`, 'blue');
      log(`   Timestamp: ${healthData.timestamp || 'unknown'}`, 'blue');
      
    } else {
      logResult('Health Endpoint Status', 'FAIL', `HTTP ${response.statusCode}`);
    }
  } catch (error) {
    logResult('Health Endpoint', 'FAIL', error.message);
  }
}

/**
 * Test 2: CORS Configuration
 */
async function testCorsConfiguration() {
  log('\n🌐 Testing CORS Configuration', 'cyan');
  
  // Test preflight request
  try {
    const preflightResponse = await makeRequest({
      ...parseUrl(`${CONFIG.apiBase}/health`),
      method: 'OPTIONS',
      headers: {
        'Origin': CONFIG.expectedCorsOrigin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });

    // Check CORS headers
    const corsHeaders = {
      'access-control-allow-origin': preflightResponse.headers['access-control-allow-origin'],
      'access-control-allow-methods': preflightResponse.headers['access-control-allow-methods'],
      'access-control-allow-headers': preflightResponse.headers['access-control-allow-headers'],
      'access-control-allow-credentials': preflightResponse.headers['access-control-allow-credentials']
    };

    log('   CORS Headers found:', 'blue');
    Object.entries(corsHeaders).forEach(([key, value]) => {
      log(`     ${key}: ${value || 'NOT SET'}`, 'blue');
    });

    // Validate CORS configuration
    if (corsHeaders['access-control-allow-origin'] === CONFIG.expectedCorsOrigin) {
      logResult('CORS Origin Header', 'PASS', `Correct origin: ${CONFIG.expectedCorsOrigin}`);
    } else {
      logResult('CORS Origin Header', 'FAIL', `Expected: ${CONFIG.expectedCorsOrigin}, Got: ${corsHeaders['access-control-allow-origin']}`);
    }

    if (corsHeaders['access-control-allow-credentials'] === 'true') {
      logResult('CORS Credentials', 'PASS', 'Credentials allowed');
    } else {
      logResult('CORS Credentials', 'WARN', 'Credentials not explicitly allowed');
    }

    const allowedMethods = corsHeaders['access-control-allow-methods'];
    const requiredMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
    const hasAllMethods = requiredMethods.every(method => 
      allowedMethods && allowedMethods.includes(method)
    );

    if (hasAllMethods) {
      logResult('CORS Methods', 'PASS', 'All required methods allowed');
    } else {
      logResult('CORS Methods', 'WARN', `Methods: ${allowedMethods}`);
    }

  } catch (error) {
    logResult('CORS Preflight Test', 'FAIL', error.message);
  }
}

/**
 * Test 3: Authentication Endpoints
 */
async function testAuthenticationEndpoints() {
  log('\n🔐 Testing Authentication Endpoints', 'cyan');
  
  // Test login endpoint
  try {
    const loginData = JSON.stringify({
      email: CONFIG.testEmail,
      password: CONFIG.testPassword
    });

    const loginResponse = await makeRequest({
      ...parseUrl(`${CONFIG.apiBase}/auth/login`),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData),
        'Origin': CONFIG.expectedCorsOrigin,
        'User-Agent': 'TrueCheckIA-API-Tester/1.0'
      }
    }, loginData);

    // We expect either 200 (success) or 400/401 (invalid credentials)
    if ([200, 400, 401].includes(loginResponse.statusCode)) {
      logResult('Login Endpoint Availability', 'PASS', `HTTP ${loginResponse.statusCode} (${loginResponse.responseTime}ms)`);
      
      // Check response structure
      try {
        const loginResult = JSON.parse(loginResponse.body);
        if (loginResponse.statusCode === 200) {
          log('   Login successful - checking token structure', 'blue');
          if (loginResult.accessToken && loginResult.refreshToken) {
            logResult('Login Token Structure', 'PASS', 'Tokens present');
          } else {
            logResult('Login Token Structure', 'WARN', 'Missing tokens');
          }
        } else {
          log(`   Login failed as expected: ${loginResult.message || 'Unknown error'}`, 'blue');
          logResult('Login Error Handling', 'PASS', 'Proper error response');
        }
      } catch (e) {
        logResult('Login Response Format', 'WARN', 'Invalid JSON response');
      }
    } else {
      logResult('Login Endpoint', 'FAIL', `Unexpected status: HTTP ${loginResponse.statusCode}`);
    }
  } catch (error) {
    logResult('Login Endpoint Test', 'FAIL', error.message);
  }

  // Test register endpoint
  try {
    const registerData = JSON.stringify({
      email: `test-${Date.now()}@example.com`,
      password: CONFIG.testPassword,
      name: 'API Test User'
    });

    const registerResponse = await makeRequest({
      ...parseUrl(`${CONFIG.apiBase}/auth/register`),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(registerData),
        'Origin': CONFIG.expectedCorsOrigin,
        'User-Agent': 'TrueCheckIA-API-Tester/1.0'
      }
    }, registerData);

    // Expect 200/201 (success) or 400 (validation error) or 409 (conflict)
    if ([200, 201, 400, 409].includes(registerResponse.statusCode)) {
      logResult('Register Endpoint Availability', 'PASS', `HTTP ${registerResponse.statusCode} (${registerResponse.responseTime}ms)`);
      
      try {
        const registerResult = JSON.parse(registerResponse.body);
        log(`   Register response: ${registerResult.message || 'Success'}`, 'blue');
      } catch (e) {
        logResult('Register Response Format', 'WARN', 'Invalid JSON response');
      }
    } else {
      logResult('Register Endpoint', 'FAIL', `HTTP ${registerResponse.statusCode}`);
    }
  } catch (error) {
    logResult('Register Endpoint Test', 'FAIL', error.message);
  }
}

/**
 * Test 4: Google OAuth Flow
 */
async function testGoogleOAuthFlow() {
  log('\n🔍 Testing Google OAuth Flow', 'cyan');
  
  try {
    // Test Google OAuth initiation
    const oauthResponse = await makeRequest({
      ...parseUrl(`${CONFIG.apiBase}/auth/google`),
      method: 'GET',
      headers: {
        'User-Agent': 'TrueCheckIA-API-Tester/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    // Should redirect to Google (302/301) or return auth URL
    if ([301, 302, 200].includes(oauthResponse.statusCode)) {
      logResult('Google OAuth Initiation', 'PASS', `HTTP ${oauthResponse.statusCode}`);
      
      if (oauthResponse.statusCode === 302 || oauthResponse.statusCode === 301) {
        const location = oauthResponse.headers.location;
        if (location && location.includes('accounts.google.com')) {
          logResult('Google OAuth Redirect', 'PASS', 'Redirects to Google');
          log(`   Redirect URL: ${location.substring(0, 100)}...`, 'blue');
        } else {
          logResult('Google OAuth Redirect', 'WARN', `Unexpected redirect: ${location}`);
        }
      }
    } else {
      logResult('Google OAuth Initiation', 'FAIL', `HTTP ${oauthResponse.statusCode}`);
    }

    // Test callback endpoint (without actual Google code)
    const callbackResponse = await makeRequest({
      ...parseUrl(`${CONFIG.apiBase}/auth/google/callback`),
      method: 'GET',
      headers: {
        'User-Agent': 'TrueCheckIA-API-Tester/1.0'
      }
    });

    // Should handle missing code gracefully (400) or show error
    if ([400, 401, 302].includes(callbackResponse.statusCode)) {
      logResult('Google OAuth Callback', 'PASS', `Handles missing code: HTTP ${callbackResponse.statusCode}`);
    } else {
      logResult('Google OAuth Callback', 'WARN', `Unexpected status: HTTP ${callbackResponse.statusCode}`);
    }

  } catch (error) {
    logResult('Google OAuth Flow Test', 'FAIL', error.message);
  }
}

/**
 * Test 5: Security Headers
 */
async function testSecurityHeaders() {
  log('\n🛡️ Testing Security Headers', 'cyan');
  
  try {
    const response = await makeRequest({
      ...parseUrl(`${CONFIG.apiBase}/health`),
      method: 'GET',
      headers: {
        'User-Agent': 'TrueCheckIA-API-Tester/1.0'
      }
    });

    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options', 
      'x-xss-protection'
    ];

    securityHeaders.forEach(header => {
      const value = response.headers[header];
      if (value) {
        logResult(`Security Header: ${header}`, 'PASS', value);
      } else {
        logResult(`Security Header: ${header}`, 'WARN', 'Not set');
      }
    });

    // Check for HTTPS-related headers
    const httpsHeaders = ['strict-transport-security'];
    httpsHeaders.forEach(header => {
      const value = response.headers[header];
      if (value) {
        logResult(`HTTPS Header: ${header}`, 'PASS', value);
      } else {
        logResult(`HTTPS Header: ${header}`, 'WARN', 'Not set (recommended for production)');
      }
    });

  } catch (error) {
    logResult('Security Headers Test', 'FAIL', error.message);
  }
}

/**
 * Test 6: Performance and Load Testing
 */
async function testPerformance() {
  log('\n⚡ Testing Performance', 'cyan');
  
  const performanceTests = [];
  const concurrentRequests = 10;
  const startTime = Date.now();

  try {
    // Create multiple concurrent requests
    const promises = Array.from({ length: concurrentRequests }, async () => {
      const requestStart = Date.now();
      const response = await makeRequest({
        ...parseUrl(`${CONFIG.apiBase}/health`),
        method: 'GET',
        headers: {
          'User-Agent': 'TrueCheckIA-API-Tester/1.0'
        }
      });
      return {
        statusCode: response.statusCode,
        responseTime: Date.now() - requestStart
      };
    });

    const responses = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    // Analyze results
    const responseTimes = responses.map(r => r.responseTime);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);
    const successCount = responses.filter(r => r.statusCode === 200).length;

    logResult('Concurrent Requests', 'PASS', `${successCount}/${concurrentRequests} successful`);
    logResult('Average Response Time', avgResponseTime < 2000 ? 'PASS' : 'WARN', `${avgResponseTime.toFixed(2)}ms`);
    logResult('Max Response Time', maxResponseTime < 5000 ? 'PASS' : 'WARN', `${maxResponseTime}ms`);
    logResult('Min Response Time', 'PASS', `${minResponseTime}ms`);
    logResult('Total Test Time', 'PASS', `${totalTime}ms`);

    log(`   Success Rate: ${(successCount/concurrentRequests*100).toFixed(1)}%`, 'blue');
    log(`   Requests/Second: ${(concurrentRequests / (totalTime/1000)).toFixed(2)}`, 'blue');

  } catch (error) {
    logResult('Performance Test', 'FAIL', error.message);
  }
}

/**
 * Test 7: Database Connection (indirect)
 */
async function testDatabaseConnectivity() {
  log('\n🗄️ Testing Database Connectivity (Indirect)', 'cyan');
  
  try {
    // Test an endpoint that likely requires database access
    const response = await makeRequest({
      ...parseUrl(`${CONFIG.apiBase}/auth/login`),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TrueCheckIA-API-Tester/1.0'
      }
    }, JSON.stringify({})); // Invalid request to test error handling

    // We expect a validation error (400) rather than a server error (500)
    if (response.statusCode === 400) {
      logResult('Database Connection (Indirect)', 'PASS', 'API returns validation errors (DB likely connected)');
    } else if (response.statusCode === 500) {
      logResult('Database Connection (Indirect)', 'WARN', 'Server error - possible DB connection issue');
    } else {
      logResult('Database Connection (Indirect)', 'WARN', `Unexpected status: ${response.statusCode}`);
    }

  } catch (error) {
    logResult('Database Connectivity Test', 'FAIL', error.message);
  }
}

/**
 * Generate Test Report
 */
function generateReport() {
  log('\n📊 TEST REPORT', 'bold');
  log('='.repeat(60), 'white');
  
  const totalTests = results.passed + results.failed + results.warnings;
  const successRate = totalTests > 0 ? (results.passed / totalTests * 100).toFixed(1) : 0;
  
  log(`Total Tests: ${totalTests}`, 'white');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'white');
  log(`Warnings: ${results.warnings}`, results.warnings > 0 ? 'yellow' : 'white');
  log(`Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : successRate >= 60 ? 'yellow' : 'red');
  
  // Overall system status
  log('\n🎯 SYSTEM STATUS', 'bold');
  if (results.failed === 0 && results.warnings <= 2) {
    log('✅ SYSTEM HEALTHY - Ready for production', 'green');
  } else if (results.failed <= 2) {
    log('⚠️  SYSTEM FUNCTIONAL - Minor issues detected', 'yellow');
  } else {
    log('❌ SYSTEM ISSUES - Critical problems detected', 'red');
  }
  
  // Recommendations
  log('\n🔧 RECOMMENDATIONS', 'bold');
  if (results.failed > 0) {
    log('• Fix failing endpoints before production deployment', 'red');
  }
  if (results.warnings > 3) {
    log('• Review warning items for production readiness', 'yellow');
  }
  log('• Monitor API response times under real load', 'blue');
  log('• Set up comprehensive monitoring and alerting', 'blue');
  log('• Implement rate limiting for production', 'blue');
  
  // Save detailed report
  const reportData = {
    timestamp: new Date().toISOString(),
    config: CONFIG,
    summary: {
      total: totalTests,
      passed: results.passed,
      failed: results.failed,
      warnings: results.warnings,
      successRate: parseFloat(successRate)
    },
    tests: results.tests
  };

  fs.writeFileSync('api-test-report.json', JSON.stringify(reportData, null, 2));
  log('\n📝 Detailed report saved to: api-test-report.json', 'cyan');
}

/**
 * Main Test Runner
 */
async function runTests() {
  log('🚀 TrueCheckIA API Comprehensive Test Suite', 'bold');
  log('='.repeat(60), 'white');
  log(`Testing API at: ${CONFIG.apiBase}`, 'cyan');
  log(`Expected CORS Origin: ${CONFIG.expectedCorsOrigin}`, 'cyan');
  log(`Timeout: ${CONFIG.timeout}ms`, 'cyan');
  log('='.repeat(60), 'white');

  const testSuite = [
    testHealthEndpoint,
    testCorsConfiguration,
    testAuthenticationEndpoints,
    testGoogleOAuthFlow,
    testSecurityHeaders,
    testPerformance,
    testDatabaseConnectivity
  ];

  for (const test of testSuite) {
    try {
      await test();
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      log(`Test suite error: ${error.message}`, 'red');
    }
  }

  generateReport();
}

// Run the tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    log(`Fatal error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runTests, CONFIG };