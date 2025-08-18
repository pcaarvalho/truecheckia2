import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { validateRequestMiddleware } from '../_middleware/validation'
import { refreshTokenSchema } from '@truecheckia/types'
// Dynamic import moved to handler

// Dynamic import to reduce cold start
const refreshHandler = async (req: any, res: any) => {
  const authController = await import('../../apps/api/src/controllers/auth.controller')
  return authController.default.refresh(req, res)
}

const handler = createVercelHandler(
  refreshHandler,
  [
    validateRequestMiddleware(refreshTokenSchema),
  ]
)

export default handler