import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { authenticateMiddleware } from '../_middleware/auth'
import { validateRequestMiddleware } from '../_middleware/validation'
import { z } from 'zod'
// Dynamic import to reduce cold start
const createCheckout = async (req: any, res: any) => {
  const { subscriptionController } = await import('../../apps/api/src/controllers/subscription.controller')
  return subscriptionController.createCheckout(req, res)
}

const checkoutSchema = z.object({
  priceId: z.string().min(1),
})

const handler = createVercelHandler(
  createCheckout,
  [
    authenticateMiddleware,
    validateRequestMiddleware(checkoutSchema),
  ]
)

export default handler