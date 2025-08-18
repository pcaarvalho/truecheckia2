import { Router } from 'express'
import { adminController } from '../controllers/admin.controller'
import { config } from '@truecheckia/config'

const router = Router()

// Development-only middleware
const devOnly = (req: any, res: any, next: any) => {
  if (!config.isDev) {
    return res.status(403).json({
      success: false,
      message: 'Admin endpoints are only available in development environment',
      error: 'DEVELOPMENT_ONLY',
    })
  }
  next()
}

// Apply dev-only middleware to all admin routes
router.use(devOnly)

/**
 * @swagger
 * /api/admin/create-dev-user:
 *   post:
 *     tags: [Admin]
 *     summary: Create or update development user (Development only)
 *     description: Creates a development user with premium access for testing
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 default: dev@truecheckia.com
 *               password:
 *                 type: string
 *                 default: dev123
 *               name:
 *                 type: string
 *                 default: Development User
 *               plan:
 *                 type: string
 *                 enum: [FREE, PRO, ENTERPRISE]
 *                 default: ENTERPRISE
 *               role:
 *                 type: string
 *                 enum: [USER, ADMIN]
 *                 default: ADMIN
 *               credits:
 *                 type: number
 *                 default: 999999
 *     responses:
 *       201:
 *         description: Development user created successfully
 *       200:
 *         description: Development user updated successfully
 *       403:
 *         description: Not available in production
 */
router.post('/create-dev-user', adminController.createDevUser)

/**
 * @swagger
 * /api/admin/database-stats:
 *   get:
 *     tags: [Admin]
 *     summary: Get database statistics (Development only)
 *     description: Returns statistics about users, analyses, and subscriptions
 *     responses:
 *       200:
 *         description: Database statistics
 *       403:
 *         description: Not available in production
 */
router.get('/database-stats', adminController.getDatabaseStats)

/**
 * @swagger
 * /api/admin/seed-sample-data:
 *   post:
 *     tags: [Admin]
 *     summary: Seed sample data for development user (Development only)
 *     description: Creates sample analyses for the development user
 *     responses:
 *       200:
 *         description: Sample data created successfully
 *       404:
 *         description: Development user not found
 *       403:
 *         description: Not available in production
 */
router.post('/seed-sample-data', adminController.seedSampleData)

export { router as adminRoutes }