#!/usr/bin/env tsx

/**
 * Migration Script: Bull Queues → Serverless Queues (Upstash)
 * 
 * This script helps migrate from traditional Bull queues to serverless queues
 * for Vercel deployment compatibility.
 */

import { config, validateServerlessConfig } from '@truecheckia/config'
import { MigrationUtils, EnvironmentUtils } from '../lib/queue-adapter'

async function main() {
  console.log('🚀 TrueCheckIA Serverless Migration Tool')
  console.log('=' .repeat(50))
  
  // Check environment
  console.log('\n📋 Environment Analysis:')
  console.log(`Current mode: ${EnvironmentUtils.getMode()}`)
  console.log(`Is Vercel: ${EnvironmentUtils.isVercel()}`)
  console.log(`Is Production: ${EnvironmentUtils.isProduction()}`)
  
  const queueProvider = EnvironmentUtils.getQueueProvider()
  const redisProvider = EnvironmentUtils.getRedisProvider()
  
  console.log(`Queue Provider: ${queueProvider.provider} (${queueProvider.type})`)
  console.log(`Redis Provider: ${redisProvider.provider} (${redisProvider.type})`)
  
  // Get migration status
  const migrationStatus = MigrationUtils.getMigrationStatus()
  console.log(`\n📊 Migration Status: ${migrationStatus.currentMode}`)
  console.log(`Recommendation: ${migrationStatus.recommendation}`)
  
  // Check required environment variables
  console.log('\n🔍 Environment Variables Check:')
  const requiredVars = migrationStatus.requiredEnvVars
  const optionalVars = migrationStatus.optionalEnvVars
  
  console.log('Required variables:')
  for (const envVar of requiredVars) {
    const isSet = !!process.env[envVar]
    const status = isSet ? '✅' : '❌'
    console.log(`  ${status} ${envVar}: ${isSet ? 'SET' : 'MISSING'}`)
  }
  
  if (optionalVars.length > 0) {
    console.log('Optional variables:')
    for (const envVar of optionalVars) {
      const isSet = !!process.env[envVar]
      const status = isSet ? '✅' : '⚠️'
      console.log(`  ${status} ${envVar}: ${isSet ? 'SET' : 'NOT SET'}`)
    }
  }
  
  // Test queue systems
  console.log('\n🧪 Testing Queue Systems:')
  try {
    const queueTests = await MigrationUtils.testQueueSystems()
    
    console.log(`Traditional queues: ${queueTests.traditional.available ? '✅ Available' : '❌ Not available'}`)
    if (queueTests.traditional.error) {
      console.log(`  Error: ${queueTests.traditional.error}`)
    }
    
    console.log(`Serverless queues: ${queueTests.serverless.available ? '✅ Available' : '❌ Not available'}`)
    if (queueTests.serverless.error) {
      console.log(`  Error: ${queueTests.serverless.error}`)
    }
  } catch (error) {
    console.error('Failed to test queue systems:', error)
  }
  
  // Test Redis systems
  console.log('\n🧪 Testing Redis Systems:')
  try {
    const redisTests = await MigrationUtils.testRedisSystems()
    
    console.log(`Traditional Redis: ${redisTests.traditional.available ? '✅ Available' : '❌ Not available'}`)
    if (redisTests.traditional.error) {
      console.log(`  Error: ${redisTests.traditional.error}`)
    }
    
    console.log(`Serverless Redis: ${redisTests.serverless.available ? '✅ Available' : '❌ Not available'}`)
    if (redisTests.serverless.error) {
      console.log(`  Error: ${redisTests.serverless.error}`)
    }
  } catch (error) {
    console.error('Failed to test Redis systems:', error)
  }
  
  // Validate serverless configuration if in production
  if (EnvironmentUtils.isProduction()) {
    console.log('\n🔒 Validating Serverless Configuration:')
    try {
      validateServerlessConfig()
      console.log('✅ Serverless configuration is valid')
    } catch (error) {
      console.error('❌ Serverless configuration is invalid:', error instanceof Error ? error.message : error)
    }
  }
  
  // Migration recommendations
  console.log('\n📝 Migration Recommendations:')
  
  if (EnvironmentUtils.isServerless()) {
    console.log('✅ You are already using serverless queues!')
    console.log('\nNext steps:')
    console.log('1. Ensure Upstash Redis is configured correctly')
    console.log('2. Set up Vercel cron jobs (vercel.json)')
    console.log('3. Configure webhook endpoints for queue processing')
    console.log('4. Test queue processing with webhooks')
  } else {
    console.log('🔄 You are using traditional queues.')
    console.log('\nMigration steps:')
    console.log('1. Set up Upstash Redis account')
    console.log('2. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to environment')
    console.log('3. Set NODE_ENV=production or FORCE_SERVERLESS=true')
    console.log('4. Deploy to Vercel with cron jobs configured')
    console.log('5. Test the migration with the validation script')
  }
  
  // Environment variable template
  console.log('\n📋 Required Environment Variables Template:')
  console.log('')
  console.log('# Upstash Redis (required for serverless)')
  console.log('UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io')
  console.log('UPSTASH_REDIS_REST_TOKEN=your-token-here')
  console.log('')
  console.log('# Vercel cron/webhook security (optional but recommended)')
  console.log('CRON_SECRET=your-cron-secret-here')
  console.log('WEBHOOK_SECRET=your-webhook-secret-here')
  console.log('')
  console.log('# Force serverless mode in development (optional)')
  console.log('FORCE_SERVERLESS=true')
  
  console.log('\n🎉 Migration analysis complete!')
}

// Run the migration script
if (require.main === module) {
  main().catch((error) => {
    console.error('Migration script failed:', error)
    process.exit(1)
  })
}