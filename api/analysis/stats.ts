import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { authenticateMiddleware } from '../_middleware/auth'
// Dynamic import to reduce cold start
const getStats = async (req: any, res: any) => {
  const { analysisController } = await import('../../apps/api/src/controllers/analysis.controller')
  return analysisController.getStats(req, res)
}

const handler = createVercelHandler(
  getStats,
  [
    authenticateMiddleware,
  ]
)

export default handler