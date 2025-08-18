import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { authenticateMiddleware } from '../_middleware/auth'
import { userController } from '../../apps/api/src/controllers/user.controller'

const handler = createVercelHandler(
  userController.getCredits,
  [
    authenticateMiddleware,
  ]
)

export default handler