import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
// Dynamic import to reduce cold start
const logout = async (req: any, res: any) => {
  const authController = await import('../../apps/api/src/controllers/auth.controller')
  return authController.default.logout(req, res)
}

const handler = createVercelHandler(
  logout
)

export default handler