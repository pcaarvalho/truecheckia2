import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
// Dynamic import to reduce cold start
const handleWebhook = async (req: any, res: any) => {
  const { subscriptionController } = await import('../../apps/api/src/controllers/subscription.controller')
  return subscriptionController.handleWebhook(req, res)
}

const handler = createVercelHandler(
  handleWebhook
)

export default handler