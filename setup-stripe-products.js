#!/usr/bin/env node

/**
 * Stripe Product Setup Script
 * 
 * This script creates the necessary Stripe products and prices for TrueCheckIA.
 * Run this script once to set up your Stripe products.
 * 
 * Usage: node setup-stripe-products.js
 */

const Stripe = require('stripe')
require('dotenv').config()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

async function setupProducts() {
  console.log('🚀 Setting up Stripe products and prices...')

  try {
    // Create Pro Product
    console.log('\n📦 Creating Pro product...')
    const proProduct = await stripe.products.create({
      name: 'TrueCheckIA Pro',
      description: 'Advanced AI content detection with unlimited analyses, API access, and priority support.',
      metadata: {
        plan: 'PRO',
        features: JSON.stringify([
          'Unlimited analyses',
          'Advanced detection',
          'API access (1000 calls)',
          'Priority support',
          'Export reports',
          'Multi-language support',
          'Detailed analytics'
        ])
      },
    })

    console.log('✅ Pro product created:', proProduct.id)

    // Create Pro Monthly Price ($19)
    console.log('\n💰 Creating Pro monthly price ($19)...')
    const proMonthlyPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 1900, // $19.00 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      nickname: 'Pro Monthly - $19',
      metadata: {
        plan: 'PRO',
        interval: 'monthly'
      }
    })

    console.log('✅ Pro monthly price created:', proMonthlyPrice.id)

    // Create Pro Annual Price ($15/month, $180/year)
    console.log('\n💰 Creating Pro annual price ($180/year)...')
    const proAnnualPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 18000, // $180.00 in cents (20% discount)
      currency: 'usd',
      recurring: {
        interval: 'year',
      },
      nickname: 'Pro Annual - $180/year (Save 20%)',
      metadata: {
        plan: 'PRO',
        interval: 'yearly'
      }
    })

    console.log('✅ Pro annual price created:', proAnnualPrice.id)

    // Create Enterprise Product (for future use)
    console.log('\n📦 Creating Enterprise product...')
    const enterpriseProduct = await stripe.products.create({
      name: 'TrueCheckIA Enterprise',
      description: 'Custom AI content detection solution for large organizations.',
      metadata: {
        plan: 'ENTERPRISE',
        features: JSON.stringify([
          'Custom volume',
          'Dedicated support',
          'SLA guarantee',
          'Team accounts',
          'Custom integration',
          'White-label option',
          'Advanced security'
        ])
      },
    })

    console.log('✅ Enterprise product created:', enterpriseProduct.id)

    // Summary
    console.log('\n🎉 Setup completed successfully!')
    console.log('\n📋 Summary of created resources:')
    console.log('─'.repeat(50))
    console.log(`Pro Product ID:        ${proProduct.id}`)
    console.log(`Pro Monthly Price ID:  ${proMonthlyPrice.id}`)
    console.log(`Pro Annual Price ID:   ${proAnnualPrice.id}`)
    console.log(`Enterprise Product ID: ${enterpriseProduct.id}`)
    console.log('─'.repeat(50))
    
    console.log('\n🔧 Next steps:')
    console.log('1. Add these price IDs to your .env file:')
    console.log(`   STRIPE_PRO_PRICE_MONTHLY=${proMonthlyPrice.id}`)
    console.log(`   STRIPE_PRO_PRICE_ANNUAL=${proAnnualPrice.id}`)
    console.log('2. Update the subscription service with these price IDs')
    console.log('3. Test the checkout flow')
    console.log('\n💡 Don\'t forget to set up webhooks in your Stripe dashboard!')

    return {
      proProduct,
      proMonthlyPrice,
      proAnnualPrice,
      enterpriseProduct
    }

  } catch (error) {
    console.error('❌ Error setting up Stripe products:', error.message)
    if (error.type === 'StripeAuthenticationError') {
      console.error('🔑 Please check your STRIPE_SECRET_KEY in .env file')
    }
    process.exit(1)
  }
}

// Run the setup if called directly
if (require.main === module) {
  setupProducts()
    .then(() => {
      console.log('\n✨ All done! Your Stripe products are ready to use.')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error)
      process.exit(1)
    })
}

module.exports = { setupProducts }