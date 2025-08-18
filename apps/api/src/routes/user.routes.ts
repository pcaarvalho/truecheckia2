import { Router } from 'express'
import { userController } from '../controllers/user.controller'
import { authenticate } from '../middleware/auth.middleware'
import { requireEmailVerified } from '../middleware/requireEmailVerified.middleware'
import { validateRequest } from '../middleware/validate.middleware'
import { updateProfileSchema } from '@truecheckia/types'

const router = Router()

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', authenticate, userController.getProfile)

/**
 * @swagger
 * /api/user/profile:
 *   patch:
 *     summary: Update user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               avatar:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Unauthorized
 */
router.patch(
  '/profile',
  authenticate,
  validateRequest(updateProfileSchema),
  userController.updateProfile
)

/**
 * @swagger
 * /api/user/credits:
 *   get:
 *     summary: Get user credits
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Credits retrieved
 *       401:
 *         description: Unauthorized
 */
router.get('/credits', authenticate, userController.getCredits)

/**
 * @swagger
 * /api/user/api-key:
 *   post:
 *     summary: Generate new API key
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: API key generated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Feature not available for free plan
 */
router.post('/api-key', authenticate, requireEmailVerified, userController.generateApiKey)

/**
 * @swagger
 * /api/user/api-key:
 *   delete:
 *     summary: Revoke API key
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: API key revoked
 *       401:
 *         description: Unauthorized
 */
router.delete('/api-key', authenticate, requireEmailVerified, userController.revokeApiKey)

/**
 * @swagger
 * /api/user/stats:
 *   get:
 *     summary: Get user statistics
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalAnalyses:
 *                       type: number
 *                     monthlyAnalyses:
 *                       type: number
 *                     creditsUsedThisMonth:
 *                       type: number
 *                     plan:
 *                       type: string
 *                     credits:
 *                       type: number
 *                     unlimited:
 *                       type: boolean
 *                     daysUntilReset:
 *                       type: number
 *                       nullable: true
 *                     emailVerified:
 *                       type: boolean
 *                     memberSince:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', authenticate, userController.getStats)

export const userRoutes = router