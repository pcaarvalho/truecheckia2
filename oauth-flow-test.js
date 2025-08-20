#!/usr/bin/env node

/**
 * Google OAuth Flow Deep Test
 * Comprehensive testing of OAuth authentication flow
 */

const https = require('https');
const { URL } = require('url');

const CONFIG = {
  baseUrl: 'https://www.truecheckia.com',
  apiBase: 'https://www.truecheckia.com/api',
  timeout: 15000
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

async function testOAuthInitiation() {
  log('\n🔍 Testing OAuth Initiation', 'cyan');
  
  try {
    const response = await makeRequest({
      ...parseUrl(`${CONFIG.apiBase}/auth/google`),
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TrueCheckIA-Tester/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    log(`Status Code: ${response.statusCode}`, 'blue');
    log(`Response Time: ${response.responseTime}ms`, 'blue');
    
    if (response.statusCode === 302 || response.statusCode === 301) {
      const location = response.headers.location;
      log(`Redirect Location: ${location}`, 'green');
      
      if (location && location.includes('accounts.google.com')) {
        log('✅ OAuth initiation working - redirects to Google', 'green');
        
        // Parse Google OAuth URL
        const oauthUrl = new URL(location);
        const params = oauthUrl.searchParams;
        
        log('\n📋 OAuth Parameters:', 'cyan');
        log(`Client ID: ${params.get('client_id') || 'NOT SET'}`, 'blue');
        log(`Redirect URI: ${params.get('redirect_uri') || 'NOT SET'}`, 'blue');
        log(`Response Type: ${params.get('response_type') || 'NOT SET'}`, 'blue');
        log(`Scope: ${params.get('scope') || 'NOT SET'}`, 'blue');
        log(`State: ${params.get('state') ? 'SET' : 'NOT SET'}`, 'blue');
        
        // Validate OAuth parameters
        const clientId = params.get('client_id');
        const redirectUri = params.get('redirect_uri');
        const responseType = params.get('response_type');
        const scope = params.get('scope');
        
        if (clientId && clientId.includes('.googleusercontent.com')) {
          log('✅ Valid Google Client ID format', 'green');
        } else {
          log('❌ Invalid or missing Client ID', 'red');
        }
        
        if (redirectUri && redirectUri.includes('truecheckia.com')) {
          log('✅ Redirect URI points to correct domain', 'green');
        } else {
          log('❌ Invalid or missing Redirect URI', 'red');
        }
        
        if (responseType === 'code') {
          log('✅ Correct response type (authorization code)', 'green');
        } else {
          log('❌ Invalid response type', 'red');
        }
        
        if (scope && (scope.includes('email') || scope.includes('profile'))) {
          log('✅ Appropriate OAuth scopes requested', 'green');
        } else {
          log('⚠️  OAuth scopes may be insufficient', 'yellow');
        }
        
      } else {
        log('❌ OAuth does not redirect to Google', 'red');
      }
    } else if (response.statusCode === 200) {
      log('⚠️  OAuth returns 200 instead of redirect', 'yellow');
      log('Response body preview:', 'blue');
      log(response.body.substring(0, 200) + '...', 'blue');
    } else {
      log(`❌ Unexpected status code: ${response.statusCode}`, 'red');
    }
    
  } catch (error) {
    log(`❌ OAuth initiation failed: ${error.message}`, 'red');
  }
}

async function testOAuthCallback() {
  log('\n🔄 Testing OAuth Callback', 'cyan');
  
  // Test callback without code (should show error)
  try {
    const response = await makeRequest({
      ...parseUrl(`${CONFIG.apiBase}/auth/google/callback`),
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TrueCheckIA-Tester/1.0)',
        'Accept': 'application/json, text/html',
        'Referer': 'https://accounts.google.com/'
      }
    });

    log(`Status Code: ${response.statusCode}`, 'blue');
    log(`Response Time: ${response.responseTime}ms`, 'blue');
    
    if (response.statusCode === 400) {
      log('✅ Callback properly handles missing authorization code', 'green');
    } else if (response.statusCode === 401) {
      log('✅ Callback requires valid authorization', 'green');
    } else if (response.statusCode === 302) {
      const location = response.headers.location;
      log(`Redirects to: ${location}`, 'blue');
      if (location && location.includes('error')) {
        log('✅ Callback handles errors with redirect', 'green');
      } else {
        log('⚠️  Unexpected redirect without error', 'yellow');
      }
    } else {
      log(`⚠️  Unexpected callback status: ${response.statusCode}`, 'yellow');
    }
    
    // Check if response contains error message
    try {
      const responseData = JSON.parse(response.body);
      if (responseData.error || responseData.message) {
        log(`Error message: ${responseData.error || responseData.message}`, 'blue');
      }
    } catch (e) {
      // Not JSON, might be HTML error page
      if (response.body.includes('error') || response.body.includes('Error')) {
        log('✅ Callback shows error page for invalid requests', 'green');
      }
    }
    
  } catch (error) {
    log(`❌ OAuth callback test failed: ${error.message}`, 'red');
  }
  
  // Test callback with invalid code
  try {
    const response = await makeRequest({
      ...parseUrl(`${CONFIG.apiBase}/auth/google/callback?code=invalid_code_123&state=test`),
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TrueCheckIA-Tester/1.0)',
        'Accept': 'application/json, text/html',
        'Referer': 'https://accounts.google.com/'
      }
    });

    log(`\nInvalid Code Test - Status: ${response.statusCode}`, 'blue');
    
    if ([400, 401, 302].includes(response.statusCode)) {
      log('✅ Callback properly validates authorization codes', 'green');
    } else {
      log(`⚠️  Unexpected response to invalid code: ${response.statusCode}`, 'yellow');
    }
    
  } catch (error) {
    log(`⚠️  Invalid code test failed: ${error.message}`, 'yellow');
  }
}

async function testOAuthSecurity() {
  log('\n🔒 Testing OAuth Security', 'cyan');
  
  // Test CSRF protection with missing state
  try {
    const response = await makeRequest({
      ...parseUrl(`${CONFIG.apiBase}/auth/google/callback?code=test_code`),
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TrueCheckIA-Tester/1.0)'
      }
    });

    if (response.statusCode === 400 || response.statusCode === 403) {
      log('✅ CSRF protection active (rejects requests without state)', 'green');
    } else {
      log('⚠️  CSRF protection may be insufficient', 'yellow');
    }
    
  } catch (error) {
    log(`⚠️  CSRF test error: ${error.message}`, 'yellow');
  }
  
  // Test for potential SSRF in callback
  try {
    const response = await makeRequest({
      ...parseUrl(`${CONFIG.apiBase}/auth/google/callback?code=test&redirect_uri=http://malicious.com`),
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TrueCheckIA-Tester/1.0)'
      }
    });

    if (response.statusCode === 400 || response.statusCode === 403) {
      log('✅ Redirect URI validation working', 'green');
    } else {
      log('⚠️  Redirect URI validation may be weak', 'yellow');
    }
    
  } catch (error) {
    log(`⚠️  Redirect URI test error: ${error.message}`, 'yellow');
  }
}

async function runOAuthTests() {
  log('🔐 Google OAuth Flow Deep Test', 'bold');
  log('='.repeat(50), 'white');
  log(`Testing OAuth at: ${CONFIG.apiBase}/auth/google`, 'cyan');
  log('='.repeat(50), 'white');

  await testOAuthInitiation();
  await testOAuthCallback();
  await testOAuthSecurity();
  
  log('\n📊 OAuth Test Summary', 'bold');
  log('='.repeat(50), 'white');
  log('✅ Check marks indicate passing tests', 'green');
  log('⚠️  Warnings indicate potential issues', 'yellow');
  log('❌ X marks indicate failing tests', 'red');
  log('\n🔧 Next Steps:', 'cyan');
  log('1. Review any failing tests and fix issues', 'blue');
  log('2. Test with real Google OAuth credentials', 'blue');
  log('3. Verify user creation in database after successful OAuth', 'blue');
  log('4. Test token refresh and logout flows', 'blue');
}

if (require.main === module) {
  runOAuthTests().catch(error => {
    log(`Fatal error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runOAuthTests };