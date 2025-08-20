import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { createAuthRateLimitMiddleware } from '../_middleware/rate-limit'
import { validateRequestMiddleware } from '../_middleware/validation'
import { loginSchema } from '../_shared/types'
import { AuthController } from '../_controllers/auth.controller'

// Optimized login handler
const loginHandler = async (req: VercelRequest, res: VercelResponse) => {
  return AuthController.login(req, res)
}

const handler = createVercelHandler(
  loginHandler,
  [
    createAuthRateLimitMiddleware(),
    validateRequestMiddleware(loginSchema),
  ]
)

export default handler