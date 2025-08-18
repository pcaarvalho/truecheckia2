#!/usr/bin/env tsx

/**
 * TrueCheckIA - Redis Data Migration Script
 * TAREFA 2: Configuração do Redis Serverless usando Upstash
 * 
 * This script migrates data from traditional Redis to Upstash Redis
 */

import { Redis as TraditionalRedis } from 'ioredis'
import { Redis as UpstashRedis } from '@upstash/redis'
import { config } from '@truecheckia/config'
import { performance } from 'perf_hooks'

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green')
}

function logError(message: string) {
  log(`❌ ${message}`, 'red')
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, 'yellow')
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, 'blue')
}

interface MigrationStats {
  total: number
  migrated: number
  failed: number
  skipped: number
  startTime: number
  endTime?: number
}

interface MigrationOptions {
  dryRun?: boolean
  batchSize?: number
  pattern?: string
  preserveTTL?: boolean
  skipExisting?: boolean
  maxRetries?: number
}

class RedisMigrator {
  private traditional: TraditionalRedis
  private upstash: UpstashRedis
  private stats: MigrationStats
  private options: Required<MigrationOptions>

  constructor(options: MigrationOptions = {}) {
    // Initialize traditional Redis
    if (!config.redis.url) {
      throw new Error('Traditional Redis URL not configured. Please set REDIS_URL')
    }
    
    this.traditional = new TraditionalRedis(config.redis.url, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    })

    // Initialize Upstash Redis
    if (!config.upstash.url || !config.upstash.token) {
      throw new Error('Upstash Redis credentials not configured. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN')
    }

    this.upstash = new UpstashRedis({
      url: config.upstash.url,
      token: config.upstash.token,
    })

    // Initialize stats
    this.stats = {
      total: 0,
      migrated: 0,
      failed: 0,
      skipped: 0,
      startTime: Date.now(),
    }

    // Set default options
    this.options = {
      dryRun: options.dryRun ?? false,
      batchSize: options.batchSize ?? 100,
      pattern: options.pattern ?? '*',
      preserveTTL: options.preserveTTL ?? true,
      skipExisting: options.skipExisting ?? false,
      maxRetries: options.maxRetries ?? 3,
    }
  }

  async testConnections(): Promise<void> {
    logInfo('Testing connections...')
    
    try {
      // Test traditional Redis
      await this.traditional.ping()
      logSuccess('Traditional Redis connection OK')
      
      // Test Upstash Redis
      await this.upstash.ping()
      logSuccess('Upstash Redis connection OK')
      
    } catch (error) {
      throw new Error(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async scanKeys(pattern: string): Promise<string[]> {
    logInfo(`Scanning keys with pattern: ${pattern}`)
    
    const keys: string[] = []
    let cursor = '0'
    
    do {
      const result = await this.traditional.scan(cursor, 'MATCH', pattern, 'COUNT', 1000)
      cursor = result[0]
      keys.push(...result[1])
    } while (cursor !== '0')
    
    logInfo(`Found ${keys.length} keys to migrate`)
    return keys
  }

  async migrateKey(key: string): Promise<boolean> {
    try {
      // Check if key should be skipped
      if (this.options.skipExisting) {
        const exists = await this.upstash.exists(key)
        if (exists) {
          this.stats.skipped++
          return true
        }
      }

      // Get key type
      const type = await this.traditional.type(key)
      
      // Get TTL if preserveTTL is enabled
      let ttl: number | undefined
      if (this.options.preserveTTL) {
        const keyTTL = await this.traditional.ttl(key)
        if (keyTTL > 0) {
          ttl = keyTTL
        }
      }

      // Migrate based on type
      switch (type) {
        case 'string':
          await this.migrateString(key, ttl)
          break
        case 'hash':
          await this.migrateHash(key, ttl)
          break
        case 'list':
          await this.migrateList(key, ttl)
          break
        case 'set':
          await this.migrateSet(key, ttl)
          break
        case 'zset':
          await this.migrateSortedSet(key, ttl)
          break
        default:
          logWarning(`Unsupported key type '${type}' for key: ${key}`)
          this.stats.skipped++
          return false
      }

      this.stats.migrated++
      return true

    } catch (error) {
      logError(`Failed to migrate key '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`)
      this.stats.failed++
      return false
    }
  }

  async migrateString(key: string, ttl?: number): Promise<void> {
    const value = await this.traditional.get(key)
    
    if (value !== null) {
      if (!this.options.dryRun) {
        if (ttl) {
          await this.upstash.set(key, value, { ex: ttl })
        } else {
          await this.upstash.set(key, value)
        }
      }
    }
  }

  async migrateHash(key: string, ttl?: number): Promise<void> {
    const hash = await this.traditional.hgetall(key)
    
    if (Object.keys(hash).length > 0) {
      if (!this.options.dryRun) {
        await this.upstash.hset(key, hash)
        if (ttl) {
          await this.upstash.expire(key, ttl)
        }
      }
    }
  }

  async migrateList(key: string, ttl?: number): Promise<void> {
    const length = await this.traditional.llen(key)
    
    if (length > 0) {
      const items = await this.traditional.lrange(key, 0, -1)
      
      if (!this.options.dryRun) {
        // Clear target list first (in case it exists)
        await this.upstash.del(key)
        
        // Push items in reverse order to maintain order
        if (items.length > 0) {
          await this.upstash.lpush(key, ...items.reverse())
          if (ttl) {
            await this.upstash.expire(key, ttl)
          }
        }
      }
    }
  }

  async migrateSet(key: string, ttl?: number): Promise<void> {
    const members = await this.traditional.smembers(key)
    
    if (members.length > 0) {
      if (!this.options.dryRun) {
        await this.upstash.sadd(key, ...members)
        if (ttl) {
          await this.upstash.expire(key, ttl)
        }
      }
    }
  }

  async migrateSortedSet(key: string, ttl?: number): Promise<void> {
    const members = await this.traditional.zrange(key, 0, -1, 'WITHSCORES')
    
    if (members.length > 0) {
      if (!this.options.dryRun) {
        // Convert to score-member pairs
        const scoredMembers: Array<{ score: number; member: string }> = []
        for (let i = 0; i < members.length; i += 2) {
          scoredMembers.push({
            member: members[i],
            score: parseFloat(members[i + 1])
          })
        }
        
        if (scoredMembers.length > 0) {
          await this.upstash.zadd(key, ...scoredMembers)
          if (ttl) {
            await this.upstash.expire(key, ttl)
          }
        }
      }
    }
  }

  async migrateInBatches(keys: string[]): Promise<void> {
    const totalBatches = Math.ceil(keys.length / this.options.batchSize)
    
    logInfo(`Processing ${keys.length} keys in ${totalBatches} batches of ${this.options.batchSize}`)
    
    for (let i = 0; i < keys.length; i += this.options.batchSize) {
      const batch = keys.slice(i, i + this.options.batchSize)
      const batchNumber = Math.floor(i / this.options.batchSize) + 1
      
      logInfo(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} keys)`)
      
      // Process batch with retries
      for (const key of batch) {
        let success = false
        let attempts = 0
        
        while (!success && attempts < this.options.maxRetries) {
          attempts++
          success = await this.migrateKey(key)
          
          if (!success && attempts < this.options.maxRetries) {
            logWarning(`Retrying key '${key}' (attempt ${attempts + 1}/${this.options.maxRetries})`)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts)) // Exponential backoff
          }
        }
      }
      
      // Progress update
      const progress = ((i + batch.length) / keys.length * 100).toFixed(1)
      logInfo(`Progress: ${progress}% (${this.stats.migrated} migrated, ${this.stats.failed} failed, ${this.stats.skipped} skipped)`)
    }
  }

  async analyzeData(): Promise<void> {
    logInfo('Analyzing source data...')
    
    try {
      const keys = await this.scanKeys(this.options.pattern)
      const typeStats: Record<string, number> = {}
      let totalSize = 0
      
      // Sample analysis (limit to 1000 keys for performance)
      const sampleKeys = keys.slice(0, Math.min(1000, keys.length))
      
      for (const key of sampleKeys) {
        try {
          const type = await this.traditional.type(key)
          typeStats[type] = (typeStats[type] || 0) + 1
          
          // Estimate size
          const memoryUsage = await this.traditional.memory('USAGE', key).catch(() => 0)
          totalSize += memoryUsage || 0
          
        } catch (error) {
          // Skip keys that cause errors
        }
      }
      
      logInfo('Data Analysis Results:')
      log('========================', 'cyan')
      log(`Total keys: ${keys.length}`, 'blue')
      log(`Sampled keys: ${sampleKeys.length}`, 'blue')
      
      if (totalSize > 0) {
        const avgSize = totalSize / sampleKeys.length
        const estimatedTotal = (avgSize * keys.length / 1024 / 1024).toFixed(2)
        log(`Estimated total size: ${estimatedTotal} MB`, 'blue')
      }
      
      log('\nKey types:', 'yellow')
      Object.entries(typeStats).forEach(([type, count]) => {
        const percentage = (count / sampleKeys.length * 100).toFixed(1)
        log(`  ${type}: ${count} (${percentage}%)`, 'blue')
      })
      
      log('========================', 'cyan')
      
    } catch (error) {
      logError(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async validateMigration(keys: string[]): Promise<void> {
    logInfo('Validating migration...')
    
    let validated = 0
    let validationErrors = 0
    
    // Sample validation (check random subset)
    const sampleSize = Math.min(100, keys.length)
    const sampleKeys = keys
      .sort(() => Math.random() - 0.5)
      .slice(0, sampleSize)
    
    for (const key of sampleKeys) {
      try {
        const [sourceExists, targetExists] = await Promise.all([
          this.traditional.exists(key),
          this.upstash.exists(key)
        ])
        
        if (sourceExists && targetExists) {
          // For string keys, compare values
          const sourceType = await this.traditional.type(key)
          if (sourceType === 'string') {
            const [sourceValue, targetValue] = await Promise.all([
              this.traditional.get(key),
              this.upstash.get(key)
            ])
            
            if (sourceValue === targetValue) {
              validated++
            } else {
              validationErrors++
              logWarning(`Value mismatch for key '${key}'`)
            }
          } else {
            validated++
          }
        } else if (sourceExists && !targetExists) {
          validationErrors++
          logWarning(`Key '${key}' missing in target`)
        } else {
          validated++
        }
        
      } catch (error) {
        validationErrors++
        logWarning(`Validation error for key '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
    const validationRate = (validated / sampleSize * 100).toFixed(1)
    
    if (validationErrors === 0) {
      logSuccess(`Validation successful: ${validated}/${sampleSize} keys validated (${validationRate}%)`)
    } else {
      logWarning(`Validation completed with errors: ${validated}/${sampleSize} validated, ${validationErrors} errors`)
    }
  }

  printSummary(): void {
    this.stats.endTime = Date.now()
    const duration = (this.stats.endTime - this.stats.startTime) / 1000
    
    log('\n' + '='.repeat(60), 'cyan')
    log('REDIS MIGRATION SUMMARY', 'cyan')
    log('='.repeat(60), 'cyan')
    
    log(`\nMode: ${this.options.dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`, 'bright')
    log(`Pattern: ${this.options.pattern}`, 'blue')
    log(`Duration: ${duration.toFixed(2)} seconds`, 'blue')
    
    log('\nResults:', 'yellow')
    log(`  Total keys: ${this.stats.total}`, 'blue')
    log(`  Migrated: ${this.stats.migrated}`, 'green')
    log(`  Failed: ${this.stats.failed}`, this.stats.failed > 0 ? 'red' : 'blue')
    log(`  Skipped: ${this.stats.skipped}`, 'yellow')
    
    const successRate = this.stats.total > 0 ? (this.stats.migrated / this.stats.total * 100).toFixed(1) : '0'
    log(`  Success rate: ${successRate}%`, this.stats.failed === 0 ? 'green' : 'yellow')
    
    if (this.stats.total > 0) {
      const keysPerSecond = (this.stats.total / duration).toFixed(2)
      log(`  Performance: ${keysPerSecond} keys/second`, 'blue')
    }
    
    if (this.options.dryRun) {
      log('\n🔍 This was a dry run - no data was actually migrated', 'yellow')
      log('Run with --live flag to perform actual migration', 'yellow')
    } else if (this.stats.failed === 0) {
      logSuccess('🎉 Migration completed successfully!')
    } else {
      logWarning('⚠️  Migration completed with some errors')
    }
    
    log('\n' + '='.repeat(60), 'cyan')
  }

  async migrate(): Promise<void> {
    try {
      log('🚀 Starting Redis Data Migration', 'cyan')
      log('='.repeat(60), 'cyan')
      
      if (this.options.dryRun) {
        logWarning('Running in DRY RUN mode - no data will be modified')
      }
      
      // Test connections
      await this.testConnections()
      
      // Analyze data
      await this.analyzeData()
      
      // Get keys to migrate
      const keys = await this.scanKeys(this.options.pattern)
      this.stats.total = keys.length
      
      if (keys.length === 0) {
        logWarning('No keys found to migrate')
        return
      }
      
      // Migrate data
      await this.migrateInBatches(keys)
      
      // Validate migration (only if not dry run)
      if (!this.options.dryRun && this.stats.migrated > 0) {
        await this.validateMigration(keys)
      }
      
    } catch (error) {
      logError(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error
    } finally {
      // Close connections
      this.traditional.disconnect()
      this.printSummary()
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  
  const options: MigrationOptions = {
    dryRun: !args.includes('--live'),
    pattern: args.find(arg => arg.startsWith('--pattern='))?.split('=')[1] || '*',
    batchSize: parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '100'),
    preserveTTL: !args.includes('--no-ttl'),
    skipExisting: args.includes('--skip-existing'),
    maxRetries: parseInt(args.find(arg => arg.startsWith('--max-retries='))?.split('=')[1] || '3'),
  }
  
  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
TrueCheckIA Redis Migration Tool

Usage: npm run migrate:redis [options]

Options:
  --live                   Perform actual migration (default: dry run)
  --pattern=PATTERN        Key pattern to migrate (default: *)
  --batch-size=SIZE        Batch size for processing (default: 100)
  --no-ttl                 Don't preserve TTL values
  --skip-existing          Skip keys that already exist in target
  --max-retries=NUM        Max retries per key (default: 3)
  --help, -h               Show this help message

Examples:
  npm run migrate:redis                           # Dry run all keys
  npm run migrate:redis --live                    # Live migration all keys
  npm run migrate:redis --pattern="user:*"       # Migrate only user keys
  npm run migrate:redis --live --skip-existing   # Skip existing keys

Environment Variables:
  REDIS_URL                    # Source Redis URL
  UPSTASH_REDIS_REST_URL      # Target Upstash URL
  UPSTASH_REDIS_REST_TOKEN    # Target Upstash token
    `)
    return
  }
  
  try {
    const migrator = new RedisMigrator(options)
    await migrator.migrate()
  } catch (error) {
    logError(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    logError(`Unhandled error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    process.exit(1)
  })
}

export default RedisMigrator