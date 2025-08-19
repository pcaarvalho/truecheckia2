import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { authenticateMiddleware } from '../_middleware/auth'
// Dynamic import to reduce cold start
const createPortal = async (req: any, res: any) => {
  const { subscriptionController } = await import('../../apps/api/src/controllers/subscription.controller')
  return subscriptionController.createPortal(req, res)
}

const handler = createVercelHandler(
  createPortal,
  [
    authenticateMiddleware,
  ]
)

export default handler