import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
// Dynamic import to reduce cold start
const getStatus = async (req: any, res: any) => {
  const { apiController } = await import('../../apps/api/src/controllers/api.controller')
  return apiController.getStatus(req, res)
}

const handler = createVercelHandler(
  getStatus
)

export default handler