import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { AuthController } from '../_controllers/auth.controller'

// Optimized logout handler
const logoutHandler = async (req: VercelRequest, res: VercelResponse) => {
  return AuthController.logout(req, res)
}

const handler = createVercelHandler(
  logoutHandler
)

export default handler