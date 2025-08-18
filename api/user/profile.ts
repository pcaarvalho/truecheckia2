import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { authenticateMiddleware } from '../_middleware/auth'
import { validateRequestMiddleware } from '../_middleware/validation'
import { updateProfileSchema } from '@truecheckia/types'
import { userController } from '../../apps/api/src/controllers/user.controller'

// Handle both GET and PATCH for profile
const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method === 'GET') {
    return createVercelHandler(
      userController.getProfile,
      [authenticateMiddleware]
    )(req, res)
  } else if (req.method === 'PATCH') {
    return createVercelHandler(
      userController.updateProfile,
      [
        authenticateMiddleware,
        validateRequestMiddleware(updateProfileSchema),
      ]
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