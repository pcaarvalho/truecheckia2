import { Router } from 'express'
import { apiController } from '../controllers/api.controller'
import { apiLimiter } from '../middleware/rateLimit.middleware'
import { validateRequest } from '../middleware/validate.middleware'
import { analyzeTextSchema } from '@truecheckia/types'

const router = Router()

/**
 * @swagger
 * /api/v1/analyze:
 *   post:
 *     summary: Analyze text via API
 *     tags: [External API]
 *     security:
 *       - apiKey: []
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
 *               webhook_url:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Analysis completed
 *       401:
 *         description: Invalid API key
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/analyze',
  apiLimiter,
  validateRequest(analyzeTextSchema),
  apiController.analyze
)

/**
 * @swagger
 * /api/v1/status:
 *   get:
 *     summary: Check API status
 *     tags: [External API]
 *     responses:
 *       200:
 *         description: API is operational
 */
router.get('/status', apiController.getStatus)

/**
 * @swagger
 * /api/v1/usage:
 *   get:
 *     summary: Get API usage statistics
 *     tags: [External API]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: month
 *     responses:
 *       200:
 *         description: Usage statistics retrieved
 *       401:
 *         description: Invalid API key
 */
router.get('/usage', apiController.getUsage)

export const apiRoutes = router