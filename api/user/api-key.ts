import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { authenticateMiddleware } from '../_middleware/auth'
// Dynamic import to reduce cold start
const generateApiKey = async (req: any, res: any) => {
  const { userController } = await import('../../apps/api/src/controllers/user.controller')
  return userController.generateApiKey(req, res)
}

const revokeApiKey = async (req: any, res: any) => {
  const { userController } = await import('../../apps/api/src/controllers/user.controller')
  return userController.revokeApiKey(req, res)
}

// Handle both POST and DELETE for API key
const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method === 'POST') {
    return createVercelHandler(
      generateApiKey,
      [authenticateMiddleware]
    )(req, res)
  } else if (req.method === 'DELETE') {
    return createVercelHandler(
      revokeApiKey,
      [authenticateMiddleware]
    )(req, res)
  } else {
    res.status(405).json({ 
      success: false, 
      error: { 
        code: 'METHOD_NOT_ALLOWED', 
        message: 'Method not allowed' 
      } 
    })
  }
}

export default handler