// @ts-nocheck
import { Request, Response } from 'express'
import Stripe from 'stripe'
import { prisma } from '@truecheckia/database'
import { config, ERROR_CODES, PLANS } from '@truecheckia/config'
import { AppError } from '../middleware/error.middleware'
import type { ApiResponse } from '@truecheckia/types'

const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2023-10-16',
})

class SubscriptionController {
  async createCheckout(req: Request, res: Response<ApiResponse>) {
    try {
      const userId = req.userId!
      const { priceId } = req.body

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          subscription: true,
        },
      })

      if (!user) {
        throw new AppError('User not found', 404, ERROR_CODES.NOT_FOUND)
      }

      // Development mode: Use a test product instead of invalid prices
      let finalPriceId = priceId
      if (config.isDev && (!priceId || priceId === 'price_1QVChiPiTRheML5kyH1Aa6N7')) {
        // Create a test product and price for development
        const product = await stripe.products.create({
          name: 'TrueCheckIA Pro (Dev)',
          description: 'Development test subscription for TrueCheckIA Pro plan',
          metadata: { environment: 'development' }
        })
        
        const price = await stripe.prices.create({
          currency: 'usd',
          recurring: {
            interval: 'month',
          },
          product: product.id,
          unit_amount: 1900, // $19.00
          metadata: { environment: 'development' }
        })
        
        finalPriceId = price.id
      }

      // Create or get Stripe customer
      let customerId = user.subscription?.stripeCustomerId

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId,
          },
        })
        customerId = customer.id

        // Save customer ID
        await prisma.subscription.create({
          data: {
            userId,
            stripeCustomerId: customerId,
            plan: 'FREE',
            status: 'TRIALING',
          },
        })
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: finalPriceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${config.app.url}/dashboard?success=true`,
        cancel_url: `${config.app.url}/pricing?canceled=true`,
        metadata: {
          userId,
        },
      })

      res.json({
        success: true,
        data: {
          url: session.url,
        },
      })
    } catch (error) {
      throw new AppError(
        `Checkout failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        ERROR_CODES.INTERNAL_ERROR
      )
    }
  }

  async createPortal(req: Request, res: Response<ApiResponse>) {
    const userId = req.userId!

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: { stripeCustomerId: true },
    })

    if (!subscription?.stripeCustomerId) {
      throw new AppError('No subscription found', 404, ERROR_CODES.NOT_FOUND)
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${config.app.url}/dashboard/settings`,
    })

    res.json({
      success: true,
      data: {
        url: session.url,
      },
    })
  }

  async getStatus(req: Request, res: Response<ApiResponse>) {
    const userId = req.userId!

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: {
        plan: true,
        status: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
      },
    })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    })

    res.json({
      success: true,
      data: {
        plan: user?.plan || 'FREE',
        subscription,
      },
    })
  }

  async handleWebhook(req: Request, res: Response) {
    const sig = req.headers['stripe-signature'] as string

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        config.stripe.webhookSecret
      )
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutComplete(session)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }

      default:
        console.log(`Unhandled event type ${event.type}`)
    }

    res.json({ received: true })
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  if (!userId) return

  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  )

  // Determine plan based on price
  let plan: 'PRO' | 'ENTERPRISE' = 'PRO'
  const priceId = subscription.items.data[0]?.price.id
  if (priceId === config.stripe.prices.enterprise) {
    plan = 'ENTERPRISE'
  }
  // PRO plan includes both monthly and annual prices
  if (priceId === config.stripe.prices.pro.monthly || priceId === config.stripe.prices.pro.annual) {
    plan = 'PRO'
  }

  // Update user and subscription
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        plan,
        credits: -1, // Unlimited
      },
    }),
    prisma.subscription.update({
      where: { userId },
      data: {
        stripeSubId: subscription.id,
        stripePriceId: priceId,
        plan,
        status: 'ACTIVE',
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    }),
  ])
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  
  const sub = await prisma.subscription.findUnique({
    where: { stripeCustomerId: customerId },
  })

  if (!sub) return

  let status: any = 'ACTIVE'
  switch (subscription.status) {
    case 'canceled':
      status = 'CANCELED'
      break
    case 'past_due':
      status = 'PAST_DUE'
      break
    case 'unpaid':
      status = 'UNPAID'
      break
    case 'paused':
      status = 'PAUSED'
      break
  }

  await prisma.subscription.update({
    where: { stripeCustomerId: customerId },
    data: {
      status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  
  const sub = await prisma.subscription.findUnique({
    where: { stripeCustomerId: customerId },
  })

  if (!sub) return

  // Downgrade to free plan
  await prisma.$transaction([
    prisma.user.update({
      where: { id: sub.userId },
      data: {
        plan: 'FREE',
        credits: config.limits.freeCredits,
      },
    }),
    prisma.subscription.update({
      where: { stripeCustomerId: customerId },
      data: {
        plan: 'FREE',
        status: 'CANCELED',
        stripeSubId: null,
        stripePriceId: null,
      },
    }),
  ])
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Log successful payment
  console.log('Payment succeeded for invoice:', invoice.id)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Handle failed payment
  console.error('Payment failed for invoice:', invoice.id)
  // You might want to send an email notification here
}

export const subscriptionController = new SubscriptionController()