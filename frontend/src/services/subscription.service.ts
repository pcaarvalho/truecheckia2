import api from '@/lib/api'
import type { Subscription, CheckoutSession } from '@/types/api'

class SubscriptionService {
  async createCheckout(priceId: string): Promise<string> {
    const response = await api.post<CheckoutSession>('/subscription/checkout', {
      priceId,
    })
    
    if (response.data?.url) {
      window.location.href = response.data.url
    }
    
    return response.data?.url || ''
  }

  async createPortal(): Promise<string> {
    const response = await api.post<CheckoutSession>('/subscription/portal')
    
    if (response.data?.url) {
      window.location.href = response.data.url
    }
    
    return response.data?.url || ''
  }

  async getStatus(): Promise<{
    plan: 'FREE' | 'PRO' | 'ENTERPRISE'
    subscription: Subscription | null
  }> {
    const response = await api.get<{
      plan: 'FREE' | 'PRO' | 'ENTERPRISE'
      subscription: Subscription | null
    }>('/subscription/status')
    
    return response.data!
  }

  // Stripe price IDs - Based on prod_StALX0bj5Ayx94
  getPriceIds() {
    return {
      pro: {
        monthly: 'price_1QVChiPiTRheML5kyH1Aa6N7', // $19 monthly - Actual Stripe Price ID
        yearly: 'price_1QVChiPiTRheML5kyH1Aa6N8',   // $15/month billed annually ($180/year)
      },
      enterprise: {
        monthly: 'price_enterprise_monthly', // Contact for pricing
        yearly: 'price_enterprise_yearly',
      },
    }
  }

  // Helper method to start checkout flow with authentication check
  async startCheckout(planType: 'monthly' | 'yearly' = 'monthly'): Promise<void> {
    const priceIds = this.getPriceIds();
    const priceId = planType === 'yearly' ? priceIds.pro.yearly : priceIds.pro.monthly;
    
    await this.createCheckout(priceId);
  }

  // Format subscription status for display
  formatStatus(status: string): {
    label: string
    color: string
  } {
    const statusMap: Record<string, { label: string; color: string }> = {
      TRIALING: { label: 'Período de Teste', color: 'text-blue-600' },
      ACTIVE: { label: 'Ativo', color: 'text-green-600' },
      CANCELED: { label: 'Cancelado', color: 'text-red-600' },
      INCOMPLETE: { label: 'Pagamento Pendente', color: 'text-yellow-600' },
      INCOMPLETE_EXPIRED: { label: 'Pagamento Expirado', color: 'text-red-600' },
      PAST_DUE: { label: 'Pagamento Atrasado', color: 'text-orange-600' },
      UNPAID: { label: 'Não Pago', color: 'text-red-600' },
      PAUSED: { label: 'Pausado', color: 'text-gray-600' },
    }
    
    return statusMap[status] || { label: status, color: 'text-gray-600' }
  }

  // Calculate days remaining in subscription
  calculateDaysRemaining(currentPeriodEnd: string | undefined): number | null {
    if (!currentPeriodEnd) return null
    
    const endDate = new Date(currentPeriodEnd)
    const now = new Date()
    const diff = endDate.getTime() - now.getTime()
    
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }
}

export const subscriptionService = new SubscriptionService()
export default subscriptionService