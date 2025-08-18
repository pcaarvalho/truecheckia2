import { Router } from 'express'
import { subscriptionController } from '../controllers/subscription.controller'
import { authenticate } from '../middleware/auth.middleware'
import { requireEmailVerified } from '../middleware/requireEmailVerified.middleware'

const router = Router()

/**
 * @swagger
 * /api/subscription/checkout:
 *   post:
 *     summary: Create Stripe checkout session
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - priceId
 *             properties:
 *               priceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Checkout session created
 *       401:
 *         description: Unauthorized
 */
router.post('/checkout', authenticate, requireEmailVerified, subscriptionController.createCheckout)

/**
 * @swagger
 * /api/subscription/portal:
 *   post:
 *     summary: Create Stripe customer portal session
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Portal session created
 *       401:
 *         description: Unauthorized
 */
router.post('/portal', authenticate, requireEmailVerified, subscriptionController.createPortal)

/**
 * @swagger
 * /api/subscription/status:
 *   get:
 *     summary: Get subscription status
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription status retrieved
 *       401:
 *         description: Unauthorized
 */
router.get('/status', authenticate, subscriptionController.getStatus)

/**
 * @swagger
 * /api/subscription/webhook:
 *   post:
 *     summary: Stripe webhook endpoint
 *     tags: [Subscription]
 *     responses:
 *       200:
 *         description: Webhook processed
 */
router.post('/webhook', subscriptionController.handleWebhook)

export const subscriptionRoutes = router