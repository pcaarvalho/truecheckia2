import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { authenticateMiddleware } from '../_middleware/auth'
import { createAnalysisRateLimitMiddleware } from '../_middleware/rate-limit'
import { validateRequestMiddleware } from '../_middleware/validation'
import { analyzeTextSchema } from '@truecheckia/types'
import { cacheManager, cacheKey } from '../_utils/cache-manager'
import { createHash } from 'crypto'

// Optimized analysis handler with aggressive caching and deduplication
const analyzeText = async (req: any, res: any) => {
  const startTime = Date.now()
  const { text, language = 'en' } = req.body
  const userId = req.userId
  
  try {
    // Generate cache key for this text
    const textHash = createHash('sha256').update(text).digest('hex')
    const analysisKey = cacheKey.analysis(textHash)
    
    // Check cache first (with deduplication)
    const cachedResult = await cacheManager.deduplicate(
      `analyze:${textHash}`,
      async () => {
        const cached = await cacheManager.get(analysisKey)
        if (cached) {
          console.log(`Cache hit for analysis ${textHash.slice(0, 8)}...`)
          return { ...cached, cached: true, fromCache: true }
        }
        
        // Cache miss - perform analysis
        console.log(`Cache miss for analysis ${textHash.slice(0, 8)}... - analyzing`)
        const { analysisController } = await import('../../apps/api/src/controllers/analysis.controller')
        
        // Create a temporary response object to capture the analysis result
        let analysisResult: any = null
        const mockRes = {
          ...res,
          json: (data: any) => {
            analysisResult = data
            return mockRes
          },
          status: () => mockRes
        }
        
        await analysisController.analyzeText(req, mockRes)
        
        if (analysisResult?.success && analysisResult.data) {
          // Cache successful results
          await cacheManager.set(analysisKey, analysisResult.data, {
            ttl: 7200, // 2 hours
            priority: 'high',
            tags: ['analysis', 'ai-detection']
          })
          
          return { ...analysisResult.data, cached: false, fromCache: false }
        }
        
        throw new Error('Analysis failed')
      }
    )
    
    const processingTime = Date.now() - startTime
    
    // Enhanced response with performance metrics
    return res.json({
      success: true,
      data: {
        ...cachedResult,
        processingTime,
        serverless: true,
        optimized: true
      },
      meta: {
        cached: cachedResult.fromCache,
        processingTime,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('Analysis error:', error)
    
    // Fallback to original controller
    const { analysisController } = await import('../../apps/api/src/controllers/analysis.controller')
    return analysisController.analyzeText(req, res)
  }
}

const handler = createVercelHandler(
  analyzeText,
  [
    authenticateMiddleware,
    createAnalysisRateLimitMiddleware(),
    validateRequestMiddleware(analyzeTextSchema),
  ]
)

export default handler