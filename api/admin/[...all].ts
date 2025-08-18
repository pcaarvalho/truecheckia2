import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { config } from '@truecheckia/config'
import { adminController } from '../../apps/api/src/controllers/admin.controller'

// Development-only middleware
const devOnlyMiddleware = (req: any, res: any, next: () => void) => {
  if (!config.isDev) {
    res.status(403).json({
      success: false,
      message: 'Admin endpoints are only available in development environment',
      error: 'DEVELOPMENT_ONLY',
    })
    return
  }
  next()
}

// Main handler that routes to different admin endpoints
const handler = async (req: VercelRequest, res: VercelResponse) => {
  // Extract the endpoint from the path
  const pathParts = req.url?.split('/') || []
  const endpoint = pathParts[pathParts.length - 1]

  // Apply dev-only check first
  if (!config.isDev) {
    res.status(403).json({
      success: false,
      message: 'Admin endpoints are only available in development environment',
      error: 'DEVELOPMENT_ONLY',
    })
    return
  }

  // Route to appropriate controller method
  switch (endpoint) {
    case 'create-dev-user':
      return createVercelHandler(
        adminController.createDevUser,
        [devOnlyMiddleware]
      )(req, res)

    case 'database-stats':
      return createVercelHandler(
        adminController.getDatabaseStats,
        [devOnlyMiddleware]
      )(req, res)

    case 'seed-sample-data':
      return createVercelHandler(
        adminController.seedSampleData,
        [devOnlyMiddleware]
      )(req, res)

    default:
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Admin endpoint not found',
        },
      })
  }
}

export default handler