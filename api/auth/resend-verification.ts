import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { createAuthRateLimitMiddleware } from '../_middleware/rate-limit'
import { validateRequestMiddleware } from '../_middleware/validation'
import { z } from 'zod'
import authController from '../../apps/api/src/controllers/auth.controller'

const resendVerificationSchema = z.object({
  email: z.string().email(),
})

const handler = createVercelHandler(
  authController.resendVerification,
  [
    createAuthRateLimitMiddleware(),
    validateRequestMiddleware(resendVerificationSchema),
  ]
)

export default handler