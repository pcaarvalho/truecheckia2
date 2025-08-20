import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { createAuthRateLimitMiddleware } from '../_middleware/rate-limit'
import { validateRequestMiddleware } from '../_middleware/validation'
import { registerSchema } from '../_shared/types'
import { AuthController } from '../_controllers/auth.controller'

// Optimized register handler
const registerHandler = async (req: VercelRequest, res: VercelResponse) => {
  return AuthController.register(req, res)
}

const handler = createVercelHandler(
  registerHandler,
  [
    createAuthRateLimitMiddleware(),
    validateRequestMiddleware(registerSchema),
  ]
)

export default handler