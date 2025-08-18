#!/usr/bin/env node

/**
 * Stripe Production Validation Script
 * 
 * This script validates that the Stripe products and prices are correctly configured
 * in production and ready to accept payments.
 * 
 * Usage: node scripts/validate-stripe-production.js
 */

const Stripe = require('stripe')
require('dotenv').config({ path: '.env.production.config' })

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

// Production IDs from setup
const EXPECTED_CONFIG = {
  products: {
    pro: 'prod_StOC77SkCVxFQE',
    enterprise: 'prod_StOCtpnZq4wUPl'
  },
  prices: {
    proMonthly: 'price_1RxbPdPfgG67ZB4msaFshEKk',
    proAnnual: 'price_1RxbPdPfgG67ZB4mPjswzydQ'
  }
}

async function validateStripeSetup() {
  console.log('🔍 Validating Stripe Production Setup...\n')
  
  let errors = []
  let warnings = []
  
  try {
    // 1. Validate API Key
    console.log('1️⃣  Validating API Key...')
    const account = await stripe.accounts.retrieve()
    console.log(`   ✅ Connected to Stripe account: ${account.business_profile?.name || account.email}`)
    console.log(`   📍 Account ID: ${account.id}`)
    console.log(`   💳 Live mode: ${!account.settings?.dashboard?.display_name?.includes('test')}\n`)
    
    // 2. Validate Pro Product
    console.log('2️⃣  Validating Pro Product...')
    try {
      const proProduct = await stripe.products.retrieve(EXPECTED_CONFIG.products.pro)
      console.log(`   ✅ Pro Product found: ${proProduct.name}`)
      console.log(`   📝 Description: ${proProduct.description?.substring(0, 50)}...`)
      
      if (!proProduct.active) {
        warnings.push('Pro product is not active')
      }
    } catch (error) {
      errors.push(`Pro product not found: ${EXPECTED_CONFIG.products.pro}`)
      console.log(`   ❌ Pro product not found`)
    }
    console.log('')
    
    // 3. Validate Pro Monthly Price
    console.log('3️⃣  Validating Pro Monthly Price...')
    try {
      const proMonthly = await stripe.prices.retrieve(EXPECTED_CONFIG.prices.proMonthly)
      console.log(`   ✅ Pro Monthly Price found: $${proMonthly.unit_amount / 100}/${proMonthly.recurring?.interval}`)
      console.log(`   🏷️  Nickname: ${proMonthly.nickname || 'No nickname'}`)
      
      if (!proMonthly.active) {
        warnings.push('Pro monthly price is not active')
      }
      
      if (proMonthly.unit_amount !== 1900) {
        warnings.push(`Pro monthly price is $${proMonthly.unit_amount / 100} instead of $19`)
      }
    } catch (error) {
      errors.push(`Pro monthly price not found: ${EXPECTED_CONFIG.prices.proMonthly}`)
      console.log(`   ❌ Pro monthly price not found`)
    }
    console.log('')
    
    // 4. Validate Pro Annual Price
    console.log('4️⃣  Validating Pro Annual Price...')
    try {
      const proAnnual = await stripe.prices.retrieve(EXPECTED_CONFIG.prices.proAnnual)
      console.log(`   ✅ Pro Annual Price found: $${proAnnual.unit_amount / 100}/${proAnnual.recurring?.interval}`)
      console.log(`   🏷️  Nickname: ${proAnnual.nickname || 'No nickname'}`)
      console.log(`   💰 Savings: ${Math.round((1 - (proAnnual.unit_amount / 12) / 1900) * 100)}% vs monthly`)
      
      if (!proAnnual.active) {
        warnings.push('Pro annual price is not active')
      }
      
      if (proAnnual.unit_amount !== 18000) {
        warnings.push(`Pro annual price is $${proAnnual.unit_amount / 100} instead of $180`)
      }
    } catch (error) {
      errors.push(`Pro annual price not found: ${EXPECTED_CONFIG.prices.proAnnual}`)
      console.log(`   ❌ Pro annual price not found`)
    }
    console.log('')
    
    // 5. Validate Enterprise Product
    console.log('5️⃣  Validating Enterprise Product...')
    try {
      const enterpriseProduct = await stripe.products.retrieve(EXPECTED_CONFIG.products.enterprise)
      console.log(`   ✅ Enterprise Product found: ${enterpriseProduct.name}`)
      console.log(`   📝 Ready for custom pricing\n`)
    } catch (error) {
      warnings.push(`Enterprise product not found: ${EXPECTED_CONFIG.products.enterprise}`)
      console.log(`   ⚠️  Enterprise product not found (optional)\n`)
    }
    
    // 6. Test Checkout Session Creation
    console.log('6️⃣  Testing Checkout Session Creation...')
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{
          price: EXPECTED_CONFIG.prices.proMonthly,
          quantity: 1,
        }],
        success_url: 'https://truecheckia.com/dashboard?success=true',
        cancel_url: 'https://truecheckia.com/pricing?canceled=true',
      })
      console.log(`   ✅ Test checkout session created successfully`)
      console.log(`   🔗 Session ID: ${session.id}\n`)
      
      // Cancel the test session
      await stripe.checkout.sessions.expire(session.id)
      console.log(`   🗑️  Test session expired (cleanup)\n`)
    } catch (error) {
      errors.push(`Cannot create checkout sessions: ${error.message}`)
      console.log(`   ❌ Failed to create checkout session: ${error.message}\n`)
    }
    
    // 7. Check Webhook Endpoints
    console.log('7️⃣  Checking Webhook Endpoints...')
    try {
      const webhooks = await stripe.webhookEndpoints.list({ limit: 10 })
      const productionWebhook = webhooks.data.find(wh => 
        wh.url?.includes('truecheckia.com') && wh.status === 'enabled'
      )
      
      if (productionWebhook) {
        console.log(`   ✅ Production webhook found: ${productionWebhook.url}`)
        console.log(`   📊 Events configured: ${productionWebhook.enabled_events?.length || 0} events`)
        
        const requiredEvents = [
          'checkout.session.completed',
          'customer.subscription.updated',
          'customer.subscription.deleted',
          'invoice.payment_succeeded',
          'invoice.payment_failed'
        ]
        
        const missingEvents = requiredEvents.filter(event => 
          !productionWebhook.enabled_events?.includes(event)
        )
        
        if (missingEvents.length > 0) {
          warnings.push(`Missing webhook events: ${missingEvents.join(', ')}`)
          console.log(`   ⚠️  Missing events: ${missingEvents.join(', ')}`)
        }
      } else {
        warnings.push('No production webhook endpoint found for truecheckia.com')
        console.log(`   ⚠️  No production webhook found`)
        console.log(`   📌 Configure at: https://dashboard.stripe.com/webhooks`)
      }
    } catch (error) {
      console.log(`   ⚠️  Could not check webhooks (requires additional permissions)`)
    }
    console.log('')
    
    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 VALIDATION SUMMARY')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    if (errors.length === 0 && warnings.length === 0) {
      console.log('✅ All validations passed! Your Stripe setup is ready for production.\n')
    } else {
      if (errors.length > 0) {
        console.log('❌ ERRORS (must fix):')
        errors.forEach(error => console.log(`   • ${error}`))
        console.log('')
      }
      
      if (warnings.length > 0) {
        console.log('⚠️  WARNINGS (should review):')
        warnings.forEach(warning => console.log(`   • ${warning}`))
        console.log('')
      }
    }
    
    // Configuration to add to environment
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔧 ENVIRONMENT VARIABLES FOR VERCEL')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('Add these to your Vercel environment variables:\n')
    console.log(`STRIPE_SECRET_KEY=${process.env.STRIPE_SECRET_KEY}`)
    console.log(`STRIPE_PRO_PRODUCT_ID=${EXPECTED_CONFIG.products.pro}`)
    console.log(`STRIPE_PRO_PRICE_MONTHLY=${EXPECTED_CONFIG.prices.proMonthly}`)
    console.log(`STRIPE_PRO_PRICE_ANNUAL=${EXPECTED_CONFIG.prices.proAnnual}`)
    console.log(`STRIPE_ENTERPRISE_PRODUCT_ID=${EXPECTED_CONFIG.products.enterprise}`)
    console.log('\n⚠️  Don\'t forget to also add:')
    console.log('• NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (from Stripe Dashboard)')
    console.log('• STRIPE_WEBHOOK_SECRET (after creating webhook endpoint)')
    console.log('')
    
    process.exit(errors.length > 0 ? 1 : 0)
    
  } catch (error) {
    console.error('\n❌ Validation failed:', error.message)
    if (error.type === 'StripeAuthenticationError') {
      console.error('🔑 Please check your STRIPE_SECRET_KEY')
    }
    process.exit(1)
  }
}

// Run validation
if (require.main === module) {
  validateStripeSetup()
}

module.exports = { validateStripeSetup }