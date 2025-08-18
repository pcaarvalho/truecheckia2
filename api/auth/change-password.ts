import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { authenticateMiddleware } from '../_middleware/auth'
import { createAuthRateLimitMiddleware } from '../_middleware/rate-limit'
import { validateRequestMiddleware } from '../_middleware/validation'
import { z } from 'zod'
import authController from '../../apps/api/src/controllers/auth.controller'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

const handler = createVercelHandler(
  authController.changePassword,
  [
    authenticateMiddleware,
    createAuthRateLimitMiddleware(),
    validateRequestMiddleware(changePasswordSchema),
  ]
)

export default handler