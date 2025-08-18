import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { authenticateMiddleware } from '../_middleware/auth'
import { userController } from '../../apps/api/src/controllers/user.controller'

// Handle both POST and DELETE for API key
const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method === 'POST') {
    return createVercelHandler(
      userController.generateApiKey,
      [authenticateMiddleware]
    )(req, res)
  } else if (req.method === 'DELETE') {
    return createVercelHandler(
      userController.revokeApiKey,
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