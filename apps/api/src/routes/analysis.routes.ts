import { Router } from 'express'
import { analysisController } from '../controllers/analysis.controller'
import { authenticate } from '../middleware/auth.middleware'
import { analysisLimiter } from '../middleware/rateLimit.middleware'
import { validateRequest } from '../middleware/validate.middleware'
import { analyzeTextSchema } from '@truecheckia/types'

const router = Router()

/**
 * @swagger
 * /api/analysis/check:
 *   post:
 *     summary: Analyze text for AI detection
 *     tags: [Analysis]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 minLength: 50
 *                 maxLength: 10000
 *               language:
 *                 type: string
 *                 enum: [pt, en]
 *                 default: pt
 *     responses:
 *       200:
 *         description: Analysis completed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient credits
 */
router.post(
  '/check',
  authenticate,
  analysisLimiter,
  validateRequest(analyzeTextSchema),
  analysisController.analyzeText
)

/**
 * @swagger
 * /api/analysis/history:
 *   get:
 *     summary: Get user's analysis history
 *     tags: [Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Analysis history retrieved
 *       401:
 *         description: Unauthorized
 */
router.get('/history', authenticate, analysisController.getHistory)

/**
 * @swagger
 * /api/analysis/{id}:
 *   get:
 *     summary: Get specific analysis by ID
 *     tags: [Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Analysis retrieved
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Analysis not found
 */
router.get('/:id', authenticate, analysisController.getAnalysis)

/**
 * @swagger
 * /api/analysis/stats:
 *   get:
 *     summary: Get user's analysis statistics
 *     tags: [Analysis]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved
 *       401:
 *         description: Unauthorized
 */
router.get('/stats/summary', authenticate, analysisController.getStats)

export const analysisRoutes = router