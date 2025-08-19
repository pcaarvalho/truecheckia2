import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { authenticateMiddleware } from '../_middleware/auth'
import { validateRequestMiddleware } from '../_middleware/validation'
import { updateProfileSchema } from '../_shared/types'
// Dynamic import to reduce cold start
const getProfile = async (req: any, res: any) => {
  const { userController } = await import('../../apps/api/src/controllers/user.controller')
  return userController.getProfile(req, res)
}

const updateProfile = async (req: any, res: any) => {
  const { userController } = await import('../../apps/api/src/controllers/user.controller')
  return userController.updateProfile(req, res)
}

// Handle both GET and PATCH for profile
const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method === 'GET') {
    return createVercelHandler(
      getProfile,
      [authenticateMiddleware]
    )(req, res)
  } else if (req.method === 'PATCH') {
    return createVercelHandler(
      updateProfile,
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