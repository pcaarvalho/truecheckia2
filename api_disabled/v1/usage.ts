import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
// Dynamic import to reduce cold start
const getUsage = async (req: any, res: any) => {
  const { apiController } = await import('../../apps/api/src/controllers/api.controller')
  return apiController.getUsage(req, res)
}

const handler = createVercelHandler(
  getUsage
)

export default handler