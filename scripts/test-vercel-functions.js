#!/usr/bin/env node

/**
 * Script para testar as Vercel Functions localmente
 * 
 * Usage:
 *   node scripts/test-vercel-functions.js
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.VERCEL_URL || 'http://localhost:3000';

const tests = [
  {
    name: 'Health Check',
    method: 'GET',
    path: '/api/health',
    expectedStatus: 200
  },
  {
    name: 'V1 Status',
    method: 'GET',
    path: '/api/v1/status',
    expectedStatus: 200
  },
  {
    name: 'Auth Register (should fail without body)',
    method: 'POST',
    path: '/api/auth/register',
    expectedStatus: 400,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  },
  {
    name: 'Analysis Check (should fail without auth)',
    method: 'POST',
    path: '/api/analysis/check',
    expectedStatus: 401,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text: 'Test text for analysis' })
  }
];

async function makeRequest(test) {
  return new Promise((resolve, reject) => {
    const url = new URL(test.path, BASE_URL);
    const options = {
      method: test.method,
      headers: test.headers || {}
    };

    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (test.body) {
      req.write(test.body);
    }

    req.end();
  });
}

async function runTests() {
  console.log(`🧪 Testing Vercel Functions at ${BASE_URL}\n`);

  const results = [];

  for (const test of tests) {
    try {
      console.log(`🔍 Testing: ${test.name}`);
      const result = await makeRequest(test);
      
      const passed = result.status === test.expectedStatus;
      const status = passed ? '✅ PASS' : '❌ FAIL';
      
      console.log(`   ${status} - Expected ${test.expectedStatus}, got ${result.status}`);
      
      if (!passed) {
        console.log(`   Response: ${result.body.substring(0, 200)}...`);
      }
      
      results.push({
        test: test.name,
        passed,
        expected: test.expectedStatus,
        actual: result.status
      });
      
    } catch (error) {
      console.log(`   ❌ ERROR - ${error.message}`);
      results.push({
        test: test.name,
        passed: false,
        error: error.message
      });
    }
    
    console.log('');
  }

  // Summary
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log(`📊 Test Results: ${passed}/${total} passed\n`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Vercel Functions are working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the output above for details.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);