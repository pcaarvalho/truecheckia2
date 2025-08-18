import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { authenticateMiddleware } from '../_middleware/auth'
import { validateRequestMiddleware } from '../_middleware/validation'
import { z } from 'zod'
import { subscriptionController } from '../../apps/api/src/controllers/subscription.controller'

const checkoutSchema = z.object({
  priceId: z.string().min(1),
})

const handler = createVercelHandler(
  subscriptionController.createCheckout,
  [
    authenticateMiddleware,
    validateRequestMiddleware(checkoutSchema),
  ]
)

export default handler