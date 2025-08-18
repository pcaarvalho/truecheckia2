import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { validateRequestMiddleware } from '../_middleware/validation'
import { z } from 'zod'
import authController from '../../apps/api/src/controllers/auth.controller'

const verifyEmailSchema = z.object({
  token: z.string().min(1),
})

const handler = createVercelHandler(
  authController.verifyEmail,
  [
    validateRequestMiddleware(verifyEmailSchema),
  ]
)

export default handler