import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { authenticateMiddleware } from '../_middleware/auth'
import { subscriptionController } from '../../apps/api/src/controllers/subscription.controller'

const handler = createVercelHandler(
  subscriptionController.getStatus,
  [
    authenticateMiddleware,
  ]
)

export default handler