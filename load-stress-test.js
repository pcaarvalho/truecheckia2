#!/usr/bin/env node

/**
 * TrueCheckIA Production Load & Stress Test
 * Comprehensive performance and reliability testing
 */

const https = require('https');
const { URL } = require('url');
const fs = require('fs');

// Test Configuration
const CONFIG = {
  baseUrl: 'https://www.truecheckia.com',
  apiBase: 'https://www.truecheckia.com/api',
  timeout: 30000,
  
  // Load Test Scenarios
  scenarios: {
    light: { users: 10, duration: 30000, rampUp: 5000 },
    moderate: { users: 50, duration: 60000, rampUp: 10000 },
    heavy: { users: 100, duration: 120000, rampUp: 20000 },
    stress: { users: 200, duration: 180000, rampUp: 30000 }
  },
  
  // Performance Thresholds
  thresholds: {
    responseTime: {
      p50: 500,  // 500ms
      p95: 2000, // 2s
      p99: 5000  // 5s
    },
    errorRate: 0.05, // 5%
    throughput: 50   // 50 RPS minimum
  }
};

// Test Metrics Storage
const metrics = {
  requests: [],
  errors: [],
  startTime: null,
  endTime: null,
  scenarios: {}
};

// Colors for output
const colors = {
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m',
  white: '\x1b[37m', reset: '\x1b[0m', bold: '\x1b[1m'
};

function log(message, color = 'white') {
  const timestamp = new Date().toISOString().substring(11, 19);
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          responseTime
        });
      });
    });

    req.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      reject({ error, responseTime });
    });

    req.setTimeout(CONFIG.timeout, () => {
      req.destroy();
      reject({ error: new Error('Request timeout'), responseTime: CONFIG.timeout });
    });

    if (postData) req.write(postData);
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

// Test Case Generators
const testCases = {
  healthCheck: () => ({
    name: 'health-check',
    options: {
      ...parseUrl(`${CONFIG.apiBase}/health`),
      method: 'GET',
      headers: {
        'User-Agent': 'TrueCheckIA-LoadTest/1.0',
        'Accept': 'application/json'
      }
    }
  }),

  corsPreflight: () => ({
    name: 'cors-preflight',
    options: {
      ...parseUrl(`${CONFIG.apiBase}/health`),
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://www.truecheckia.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    }
  }),

  authLogin: (userIndex) => ({
    name: 'auth-login',
    options: {
      ...parseUrl(`${CONFIG.apiBase}/auth/login`),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://www.truecheckia.com',
        'User-Agent': 'TrueCheckIA-LoadTest/1.0'
      }
    },
    data: JSON.stringify({
      email: `loadtest-user-${userIndex}@example.com`,
      password: 'LoadTest123!'
    })
  }),

  authRegister: (userIndex) => ({
    name: 'auth-register',
    options: {
      ...parseUrl(`${CONFIG.apiBase}/auth/register`),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://www.truecheckia.com',
        'User-Agent': 'TrueCheckIA-LoadTest/1.0'
      }
    },
    data: JSON.stringify({
      email: `loadtest-reg-${userIndex}-${Date.now()}@example.com`,
      password: 'LoadTest123!',
      name: `Load Test User ${userIndex}`
    })
  }),

  oauthGoogle: () => ({
    name: 'oauth-google',
    options: {
      ...parseUrl(`${CONFIG.apiBase}/auth/google`),
      method: 'GET',
      headers: {
        'User-Agent': 'TrueCheckIA-LoadTest/1.0',
        'Accept': 'text/html,application/xhtml+xml'
      }
    }
  })
};

// Execute single request
async function executeRequest(testCase, requestId) {
  try {
    const response = await makeRequest(
      testCase.options,
      testCase.data || null
    );

    const result = {
      id: requestId,
      name: testCase.name,
      statusCode: response.statusCode,
      responseTime: response.responseTime,
      success: response.statusCode < 400,
      timestamp: Date.now(),
      error: null
    };

    metrics.requests.push(result);
    return result;

  } catch (error) {
    const result = {
      id: requestId,
      name: testCase.name,
      statusCode: 0,
      responseTime: error.responseTime || 0,
      success: false,
      timestamp: Date.now(),
      error: error.error?.message || 'Unknown error'
    };

    metrics.errors.push(result);
    metrics.requests.push(result);
    return result;
  }
}

// Load Test Scenario Runner
async function runLoadScenario(scenarioName, config) {
  log(`Starting ${scenarioName} load test: ${config.users} users, ${config.duration/1000}s duration`, 'cyan');
  
  const scenarioMetrics = {
    name: scenarioName,
    config,
    startTime: Date.now(),
    requests: [],
    errors: []
  };

  let requestCounter = 0;
  let activeUsers = 0;
  const maxUsers = config.users;
  const testDuration = config.duration;
  const rampUpTime = config.rampUp;

  // User spawn rate calculation
  const usersPerSecond = maxUsers / (rampUpTime / 1000);
  let nextUserTime = Date.now();

  // Test cases distribution
  const testCaseDistribution = [
    { generator: () => testCases.healthCheck(), weight: 40 },
    { generator: () => testCases.corsPreflight(), weight: 20 },
    { generator: (i) => testCases.authLogin(i), weight: 20 },
    { generator: (i) => testCases.authRegister(i), weight: 10 },
    { generator: () => testCases.oauthGoogle(), weight: 10 }
  ];

  const getRandomTestCase = (userIndex) => {
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (const { generator, weight } of testCaseDistribution) {
      cumulative += weight;
      if (random <= cumulative) {
        return generator(userIndex);
      }
    }
    
    return testCases.healthCheck(); // fallback
  };

  // User simulation function
  const simulateUser = async (userId) => {
    const userRequests = [];
    activeUsers++;
    
    try {
      while (Date.now() - scenarioMetrics.startTime < testDuration) {
        const testCase = getRandomTestCase(userId);
        const requestId = `${scenarioName}-${userId}-${++requestCounter}`;
        
        const result = await executeRequest(testCase, requestId);
        userRequests.push(result);
        
        // Think time between requests (500ms to 2s)
        const thinkTime = 500 + Math.random() * 1500;
        await new Promise(resolve => setTimeout(resolve, thinkTime));
      }
    } catch (error) {
      log(`User ${userId} error: ${error.message}`, 'red');
    } finally {
      activeUsers--;
    }
    
    return userRequests;
  };

  // Progress monitoring
  const progressInterval = setInterval(() => {
    const elapsed = Date.now() - scenarioMetrics.startTime;
    const elapsedSeconds = Math.floor(elapsed / 1000);
    const totalSeconds = Math.floor(testDuration / 1000);
    const progress = ((elapsed / testDuration) * 100).toFixed(1);
    
    const recentRequests = metrics.requests.filter(r => 
      Date.now() - r.timestamp < 5000
    );
    const currentRPS = recentRequests.length / 5;
    
    log(`Progress: ${progress}% (${elapsedSeconds}/${totalSeconds}s) | Active Users: ${activeUsers} | RPS: ${currentRPS.toFixed(1)}`, 'blue');
  }, 5000);

  // Spawn users gradually
  const userPromises = [];
  const spawnUsers = async () => {
    for (let userId = 1; userId <= maxUsers; userId++) {
      if (Date.now() >= nextUserTime) {
        userPromises.push(simulateUser(userId));
        nextUserTime = Date.now() + (1000 / usersPerSecond);
        
        // Don't spawn users faster than the ramp-up allows
        if (userId < maxUsers) {
          const delay = Math.max(0, nextUserTime - Date.now());
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    }
  };

  // Execute scenario
  await spawnUsers();
  
  // Wait for all users to complete or timeout
  const results = await Promise.allSettled(userPromises);
  
  clearInterval(progressInterval);
  scenarioMetrics.endTime = Date.now();
  scenarioMetrics.duration = scenarioMetrics.endTime - scenarioMetrics.startTime;

  // Collect scenario results
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      scenarioMetrics.requests.push(...result.value);
    } else {
      log(`User ${index + 1} failed: ${result.reason}`, 'red');
    }
  });

  metrics.scenarios[scenarioName] = scenarioMetrics;
  
  log(`Completed ${scenarioName}: ${scenarioMetrics.requests.length} requests`, 'green');
  return scenarioMetrics;
}

// Calculate performance statistics
function calculateStats(requests) {
  if (requests.length === 0) return null;

  const responseTimes = requests.map(r => r.responseTime).sort((a, b) => a - b);
  const successfulRequests = requests.filter(r => r.success);
  const errorCount = requests.length - successfulRequests.length;

  return {
    total: requests.length,
    successful: successfulRequests.length,
    errors: errorCount,
    errorRate: (errorCount / requests.length) * 100,
    
    responseTime: {
      min: Math.min(...responseTimes),
      max: Math.max(...responseTimes),
      avg: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      p50: responseTimes[Math.floor(responseTimes.length * 0.5)],
      p95: responseTimes[Math.floor(responseTimes.length * 0.95)],
      p99: responseTimes[Math.floor(responseTimes.length * 0.99)]
    },
    
    statusCodes: requests.reduce((acc, r) => {
      acc[r.statusCode] = (acc[r.statusCode] || 0) + 1;
      return acc;
    }, {}),
    
    throughput: 0 // Will be calculated per scenario
  };
}

// Generate comprehensive report
function generateReport() {
  log('\n📊 LOAD TEST RESULTS', 'bold');
  log('='.repeat(80), 'white');

  Object.entries(metrics.scenarios).forEach(([name, scenario]) => {
    const stats = calculateStats(scenario.requests);
    const durationSeconds = scenario.duration / 1000;
    const throughput = stats.total / durationSeconds;
    stats.throughput = throughput;

    log(`\n🎯 Scenario: ${name.toUpperCase()}`, 'cyan');
    log(`Duration: ${durationSeconds.toFixed(1)}s | Users: ${scenario.config.users}`, 'blue');
    log(`Total Requests: ${stats.total}`, 'white');
    log(`Successful: ${stats.successful} (${(100 - stats.errorRate).toFixed(1)}%)`, 
        stats.errorRate < CONFIG.thresholds.errorRate * 100 ? 'green' : 'red');
    log(`Errors: ${stats.errors} (${stats.errorRate.toFixed(1)}%)`, 
        stats.errorRate < CONFIG.thresholds.errorRate * 100 ? 'green' : 'red');
    log(`Throughput: ${throughput.toFixed(2)} RPS`, 
        throughput >= CONFIG.thresholds.throughput ? 'green' : 'yellow');

    log(`\n⏱️  Response Times:`, 'cyan');
    log(`  Min: ${stats.responseTime.min}ms`, 'blue');
    log(`  Avg: ${stats.responseTime.avg.toFixed(2)}ms`, 'blue');
    log(`  P50: ${stats.responseTime.p50}ms`, 
        stats.responseTime.p50 <= CONFIG.thresholds.responseTime.p50 ? 'green' : 'yellow');
    log(`  P95: ${stats.responseTime.p95}ms`, 
        stats.responseTime.p95 <= CONFIG.thresholds.responseTime.p95 ? 'green' : 'yellow');
    log(`  P99: ${stats.responseTime.p99}ms`, 
        stats.responseTime.p99 <= CONFIG.thresholds.responseTime.p99 ? 'green' : 'yellow');
    log(`  Max: ${stats.responseTime.max}ms`, 'blue');

    log(`\n📈 Status Code Distribution:`, 'cyan');
    Object.entries(stats.statusCodes).forEach(([code, count]) => {
      const percentage = ((count / stats.total) * 100).toFixed(1);
      const color = code.startsWith('2') ? 'green' : 
                   code.startsWith('3') ? 'blue' :
                   code.startsWith('4') ? 'yellow' : 'red';
      log(`  ${code}: ${count} (${percentage}%)`, color);
    });
  });

  // Overall System Assessment
  log(`\n🏆 OVERALL ASSESSMENT`, 'bold');
  log('='.repeat(80), 'white');

  const allRequests = Object.values(metrics.scenarios)
    .flatMap(s => s.requests);
  const overallStats = calculateStats(allRequests);
  const totalDuration = Math.max(...Object.values(metrics.scenarios)
    .map(s => s.duration));
  const overallThroughput = allRequests.length / (totalDuration / 1000);

  // Performance Score Calculation
  let score = 100;
  
  if (overallStats.errorRate > CONFIG.thresholds.errorRate * 100) {
    score -= 30;
  }
  if (overallStats.responseTime.p95 > CONFIG.thresholds.responseTime.p95) {
    score -= 25;
  }
  if (overallThroughput < CONFIG.thresholds.throughput) {
    score -= 20;
  }
  if (overallStats.responseTime.p50 > CONFIG.thresholds.responseTime.p50) {
    score -= 15;
  }
  if (overallStats.responseTime.p99 > CONFIG.thresholds.responseTime.p99) {
    score -= 10;
  }

  const scoreColor = score >= 90 ? 'green' : 
                    score >= 75 ? 'yellow' : 'red';
  
  log(`Performance Score: ${Math.max(0, score)}/100`, scoreColor);
  
  if (score >= 90) {
    log('✅ EXCELLENT - API is production-ready for high load', 'green');
  } else if (score >= 75) {
    log('⚠️  GOOD - API performs well but has room for improvement', 'yellow');
  } else if (score >= 50) {
    log('⚠️  FAIR - API needs optimization before high-load production', 'yellow');
  } else {
    log('❌ POOR - Critical performance issues require immediate attention', 'red');
  }

  log(`\nTotal Requests: ${allRequests.length}`, 'white');
  log(`Overall Error Rate: ${overallStats.errorRate.toFixed(2)}%`, 'white');
  log(`Overall Throughput: ${overallThroughput.toFixed(2)} RPS`, 'white');
  log(`P95 Response Time: ${overallStats.responseTime.p95}ms`, 'white');

  // Recommendations
  log(`\n🔧 RECOMMENDATIONS`, 'bold');
  if (overallStats.errorRate > 5) {
    log('• Investigate and fix causes of 4xx/5xx errors', 'red');
  }
  if (overallStats.responseTime.p95 > 2000) {
    log('• Optimize response times - consider caching and database indexing', 'yellow');
  }
  if (overallThroughput < 50) {
    log('• Scale API resources or optimize bottlenecks', 'yellow');
  }
  log('• Monitor API performance continuously in production', 'blue');
  log('• Set up alerting for high error rates and slow response times', 'blue');
  log('• Consider implementing circuit breakers for downstream services', 'blue');

  // Save detailed report
  const reportData = {
    timestamp: new Date().toISOString(),
    config: CONFIG,
    scenarios: metrics.scenarios,
    overallStats,
    performanceScore: Math.max(0, score),
    recommendations: []
  };

  fs.writeFileSync('load-test-report.json', JSON.stringify(reportData, null, 2));
  log('\n📝 Detailed report saved to: load-test-report.json', 'cyan');
}

// Main test runner
async function runLoadTests() {
  log('🚀 TrueCheckIA Load & Stress Test Suite', 'bold');
  log('='.repeat(80), 'white');
  log(`Target API: ${CONFIG.apiBase}`, 'cyan');
  log('='.repeat(80), 'white');

  metrics.startTime = Date.now();

  // Run test scenarios progressively
  const scenariosToRun = [
    'light',    // Warm-up
    'moderate', // Normal load
    'heavy'     // Stress test
  ];

  for (const scenarioName of scenariosToRun) {
    const config = CONFIG.scenarios[scenarioName];
    
    try {
      await runLoadScenario(scenarioName, config);
      
      // Cool-down period between scenarios
      log(`Cooling down for 10 seconds...`, 'blue');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
    } catch (error) {
      log(`Scenario ${scenarioName} failed: ${error.message}`, 'red');
    }
  }

  metrics.endTime = Date.now();
  generateReport();
}

// Run tests if executed directly
if (require.main === module) {
  runLoadTests().catch(error => {
    log(`Fatal error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runLoadTests, CONFIG };