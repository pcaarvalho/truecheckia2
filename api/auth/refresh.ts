import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { validateRequestMiddleware } from '../_middleware/validation'
import { refreshTokenSchema } from '../_shared/types'
import { AuthController } from '../_controllers/auth.controller'

// Optimized refresh handler
const refreshHandler = async (req: VercelRequest, res: VercelResponse) => {
  return AuthController.refresh(req, res)
}

const handler = createVercelHandler(
  refreshHandler,
  [
    validateRequestMiddleware(refreshTokenSchema),
  ]
)

export default handler