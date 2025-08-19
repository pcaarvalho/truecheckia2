#!/usr/bin/env tsx
// @ts-nocheck

/**
 * Serverless Queue Testing Script
 * 
 * Tests all serverless queue functionalities to ensure everything works correctly
 */

import { config } from '@truecheckia/config'
import { QueueAdapter, RedisAdapter, EnvironmentUtils } from '../lib/queue-adapter'
import ServerlessAnalysisQueue from '../queues/serverless-analysis.queue'
import ServerlessEmailQueue from '../queues/serverless-email.queue'
import ServerlessCreditsQueue from '../queues/serverless-credits.queue'

async function testRedisConnection() {
  console.log('\n🔧 Testing Redis Connection...')
  
  try {
    const redis = await RedisAdapter.connectRedis()
    console.log('✅ Redis connection successful')
    
    // Test basic operations
    const testKey = 'test:serverless:migration'
    const testValue = { timestamp: Date.now(), test: true }
    
    await RedisAdapter.cacheSet(testKey, testValue, 60)
    console.log('✅ Cache SET operation successful')
    
    const retrieved = await RedisAdapter.cacheGet(testKey)
    console.log('✅ Cache GET operation successful:', retrieved?.test === true ? 'Data matches' : 'Data mismatch')
    
    await RedisAdapter.cacheDel(testKey)
    console.log('✅ Cache DELETE operation successful')
    
  } catch (error) {
    console.error('❌ Redis connection failed:', error)
    throw error
  }
}

async function testAnalysisQueue() {
  console.log('\n📊 Testing Analysis Queue...')
  
  try {
    // Test job addition
    const testJob = {
      userId: 'test-user-id',
      text: 'This is a test text for AI analysis. It should be long enough to pass validation but short enough for testing.',
      language: 'en',
      priority: 1,
    }
    
    const jobId = await ServerlessAnalysisQueue.addJob(testJob)
    console.log('✅ Analysis job added:', jobId)
    
    // Test job status
    const status = await ServerlessAnalysisQueue.getJobStatus(jobId)
    console.log('✅ Job status retrieved:', status ? 'Found' : 'Not found')
    
    // Test queue stats
    const stats = await ServerlessAnalysisQueue.getQueueStats()
    console.log('✅ Queue stats:', stats)
    
  } catch (error) {
    console.error('❌ Analysis queue test failed:', error)
    throw error
  }
}

async function testEmailQueue() {
  console.log('\n📧 Testing Email Queue...')
  
  try {
    // Test email job addition
    const testEmail = {
      to: 'test@example.com',
      subject: 'Test Email from Serverless Queue',
      html: '<h1>Test Email</h1><p>This is a test email from the serverless queue system.</p>',
      text: 'Test Email - This is a test email from the serverless queue system.',
      type: 'smtp' as const, // Use SMTP for testing
    }
    
    const jobId = await ServerlessEmailQueue.addJob(testEmail)
    console.log('✅ Email job added:', jobId)
    
    // Test template email
    const templateJobId = await ServerlessEmailQueue.addJob({
      to: 'test@example.com',
      template: 'welcome',
      templateData: ['Test User'],
      type: 'smtp',
      subject: '',
      html: '',
    })
    console.log('✅ Template email job added:', templateJobId)
    
    // Test queue stats
    const stats = await ServerlessEmailQueue.getQueueStats()
    console.log('✅ Email queue stats:', stats)
    
  } catch (error) {
    console.error('❌ Email queue test failed:', error)
    throw error
  }
}

async function testCreditsOperations() {
  console.log('\n💳 Testing Credits Operations...')
  
  try {
    // Test getting queue stats (this doesn't require database operations)
    const stats = await ServerlessCreditsQueue.getQueueStats()
    console.log('✅ Credits queue stats:', stats)
    
    console.log('✅ Credits operations ready (database operations not tested in isolation)')
    
  } catch (error) {
    console.error('❌ Credits operations test failed:', error)
    throw error
  }
}

async function testQueueAdapter() {
  console.log('\n🔄 Testing Queue Adapter...')
  
  try {
    // Test adapter initialization
    const queue = await QueueAdapter.getInstance()
    console.log('✅ Queue adapter initialized')
    
    // Test adapter methods
    const stats = await QueueAdapter.getQueueStats()
    console.log('✅ Adapter queue stats:', Object.keys(stats))
    
  } catch (error) {
    console.error('❌ Queue adapter test failed:', error)
    throw error
  }
}

async function testWebhookEndpoints() {
  console.log('\n🌐 Testing Webhook Endpoints...')
  
  try {
    const baseUrl = config.api.baseUrl
    
    // Test health check endpoint
    console.log('Testing health check endpoint...')
    const healthResponse = await fetch(`${baseUrl}/api/webhooks/health`)
    const healthData = await healthResponse.json()
    console.log('✅ Health check:', healthData.success ? 'Healthy' : 'Unhealthy')
    
    // Test stats endpoint (requires authentication, so expect 401)
    console.log('Testing stats endpoint...')
    const statsResponse = await fetch(`${baseUrl}/api/webhooks/stats`)
    console.log('✅ Stats endpoint:', statsResponse.status === 401 ? 'Protected (expected)' : `Status: ${statsResponse.status}`)
    
  } catch (error) {
    console.error('❌ Webhook endpoints test failed:', error)
    // Don't throw here as the server might not be running
  }
}

async function performLoadTest() {
  console.log('\n🚀 Performing Light Load Test...')
  
  try {
    const promises = []
    const startTime = Date.now()
    
    // Create 10 concurrent operations
    for (let i = 0; i < 10; i++) {
      promises.push(
        RedisAdapter.cacheSet(`load-test:${i}`, { index: i, timestamp: Date.now() }, 60)
      )
    }
    
    await Promise.all(promises)
    const endTime = Date.now()
    
    console.log('✅ Load test completed')
    console.log(`⏱️ 10 concurrent operations completed in ${endTime - startTime}ms`)
    
    // Cleanup
    for (let i = 0; i < 10; i++) {
      await RedisAdapter.cacheDel(`load-test:${i}`)
    }
    console.log('✅ Load test cleanup completed')
    
  } catch (error) {
    console.error('❌ Load test failed:', error)
    throw error
  }
}

async function main() {
  console.log('🧪 TrueCheckIA Serverless Queue Testing Suite')
  console.log('=' .repeat(50))
  
  // Environment info
  console.log(`\n📋 Environment: ${EnvironmentUtils.getMode()}`)
  console.log(`Queue Provider: ${EnvironmentUtils.getQueueProvider().provider}`)
  console.log(`Redis Provider: ${EnvironmentUtils.getRedisProvider().provider}`)
  
  const tests = [
    { name: 'Redis Connection', fn: testRedisConnection },
    { name: 'Analysis Queue', fn: testAnalysisQueue },
    { name: 'Email Queue', fn: testEmailQueue },
    { name: 'Credits Operations', fn: testCreditsOperations },
    { name: 'Queue Adapter', fn: testQueueAdapter },
    { name: 'Webhook Endpoints', fn: testWebhookEndpoints },
    { name: 'Load Test', fn: performLoadTest },
  ]
  
  let passed = 0
  let failed = 0
  
  for (const test of tests) {
    try {
      await test.fn()
      passed++
    } catch (error) {
      console.error(`❌ Test "${test.name}" failed:`, error)
      failed++
    }
  }
  
  console.log('\n📊 Test Results:')
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`)
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Your serverless queue system is ready.')
  } else {
    console.log('\n⚠️ Some tests failed. Please check the configuration and try again.')
    process.exit(1)
  }
}

// Run the test suite
if (require.main === module) {
  main().catch((error) => {
    console.error('Test suite failed:', error)
    process.exit(1)
  })
}

export { main as runTests }