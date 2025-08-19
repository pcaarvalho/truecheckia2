import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { authenticateMiddleware } from '../_middleware/auth'
// Dynamic import to reduce cold start
const getCredits = async (req: any, res: any) => {
  const { userController } = await import('../../apps/api/src/controllers/user.controller')
  return userController.getCredits(req, res)
}

const handler = createVercelHandler(
  getCredits,
  [
    authenticateMiddleware,
  ]
)

export default handler