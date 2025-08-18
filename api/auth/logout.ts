import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import authController from '../../apps/api/src/controllers/auth.controller'

const handler = createVercelHandler(
  authController.logout
)

export default handler