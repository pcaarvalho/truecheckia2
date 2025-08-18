import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { validateRequestMiddleware } from '../_middleware/validation'
import { z } from 'zod'
import authController from '../../apps/api/src/controllers/auth.controller'

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
})

const handler = createVercelHandler(
  authController.resetPassword,
  [
    validateRequestMiddleware(resetPasswordSchema),
  ]
)

export default handler