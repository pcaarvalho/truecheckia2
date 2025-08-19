import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { createApiRateLimitMiddleware } from '../_middleware/rate-limit'
import { validateRequestMiddleware } from '../_middleware/validation'
import { analyzeTextSchema } from '@truecheckia/types'

// Dynamic import to reduce cold start
const analyze = async (req: any, res: any) => {
  const { apiController } = await import('../../apps/api/src/controllers/api.controller')
  return apiController.analyze(req, res)
}

const handler = createVercelHandler(
  analyze,
  [
    createApiRateLimitMiddleware(),
    validateRequestMiddleware(analyzeTextSchema),
  ]
)

export default handler