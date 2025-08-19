import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { createAuthRateLimitMiddleware } from '../_middleware/rate-limit'
import { validateRequestMiddleware } from '../_middleware/validation'
import { registerSchema } from '../_shared/types'
// Dynamic import moved to handler

// Dynamic import to reduce cold start
const registerHandler = async (req: any, res: any) => {
  const authController = await import('../../apps/api/src/controllers/auth.controller')
  return authController.default.register(req, res)
}

const handler = createVercelHandler(
  registerHandler,
  [
    createAuthRateLimitMiddleware(),
    validateRequestMiddleware(registerSchema),
  ]
)

export default handler