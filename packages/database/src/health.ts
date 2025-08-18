import { db } from './index'

export interface DatabaseHealthCheck {
  status: 'healthy' | 'unhealthy'
  latency: number
  connectionCount?: number
  error?: string
  timestamp: string
}

export async function checkDatabaseHealth(): Promise<DatabaseHealthCheck> {
  const start = Date.now()
  
  try {
    // Simple query to test connectivity
    await db.$queryRaw`SELECT 1 as health_check`
    
    const latency = Date.now() - start
    
    // Get connection info if available
    let connectionCount: number | undefined
    try {
      const result = await db.$queryRaw<[{count: bigint}]>`
        SELECT count(*) as count 
        FROM pg_stat_activity 
        WHERE state = 'active'
      `
      connectionCount = Number(result[0]?.count || 0)
    } catch {
      // Connection count query failed, but main health check passed
    }
    
    return {
      status: 'healthy',
      latency,
      connectionCount,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
}

export async function checkDatabasePerformance() {
  const start = Date.now()
  
  try {
    // Test common queries performance
    const [userCount, analysisCount, recentAnalyses] = await Promise.all([
      db.user.count(),
      db.analysis.count(),
      db.analysis.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true, aiScore: true }
      })
    ])
    
    const queryTime = Date.now() - start
    
    return {
      status: 'healthy' as const,
      metrics: {
        userCount,
        analysisCount,
        recentAnalyses: recentAnalyses.length,
        queryTime
      },
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      status: 'unhealthy' as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
}

export async function getSlowQueries() {
  try {
    // Get slow queries from pg_stat_statements if available
    const slowQueries = await db.$queryRaw<Array<{
      query: string
      calls: bigint
      mean_exec_time: number
      total_exec_time: number
    }>>`
      SELECT 
        query,
        calls,
        mean_exec_time,
        total_exec_time
      FROM pg_stat_statements 
      WHERE mean_exec_time > 100 
      ORDER BY mean_exec_time DESC 
      LIMIT 10
    `
    
    return slowQueries.map(q => ({
      query: q.query,
      calls: Number(q.calls),
      meanTime: q.mean_exec_time,
      totalTime: q.total_exec_time
    }))
  } catch (error) {
    // pg_stat_statements extension may not be available
    return []
  }
}

export async function getDatabaseSize() {
  try {
    const result = await db.$queryRaw<[{size_mb: number}]>`
      SELECT 
        ROUND(pg_database_size(current_database()) / 1024.0 / 1024.0, 2) as size_mb
    `
    
    return result[0]?.size_mb || 0
  } catch (error) {
    return null
  }
}

export async function getTableSizes() {
  try {
    const result = await db.$queryRaw<Array<{
      table_name: string
      size_mb: number
      row_count: bigint
    }>>`
      SELECT 
        schemaname||'.'||tablename as table_name,
        ROUND(pg_total_relation_size(schemaname||'.'||tablename) / 1024.0 / 1024.0, 2) as size_mb,
        n_tup_ins + n_tup_upd + n_tup_del as row_count
      FROM pg_stat_user_tables 
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 10
    `
    
    return result.map(t => ({
      tableName: t.table_name,
      sizeMb: t.size_mb,
      rowCount: Number(t.row_count)
    }))
  } catch (error) {
    return []
  }
}