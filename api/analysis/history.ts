import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { authenticateMiddleware } from '../_middleware/auth'
import { analysisController } from '../../apps/api/src/controllers/analysis.controller'

const handler = createVercelHandler(
  analysisController.getHistory,
  [
    authenticateMiddleware,
  ]
)

export default handler