import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { subscriptionController } from '../../apps/api/src/controllers/subscription.controller'

const handler = createVercelHandler(
  subscriptionController.handleWebhook
)

export default handler