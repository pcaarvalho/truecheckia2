import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { authenticateMiddleware } from '../_middleware/auth'
import authController from '../../apps/api/src/controllers/auth.controller'

const handler = createVercelHandler(
  authController.logoutAll,
  [
    authenticateMiddleware,
  ]
)

export default handler