import api from '@/lib/api'
import type { User, UserCredits } from '@/types/api'

class UserService {
  async getProfile(): Promise<User> {
    const response = await api.get<User>('/user/profile')
    
    if (response.data) {
      localStorage.setItem('user', JSON.stringify(response.data))
    }
    
    return response.data!
  }

  async updateProfile(data: Partial<Pick<User, 'name' | 'avatar'>>): Promise<User> {
    const response = await api.patch<User>('/user/profile', data)
    
    if (response.data) {
      localStorage.setItem('user', JSON.stringify(response.data))
    }
    
    return response.data!
  }

  async getCredits(): Promise<UserCredits> {
    const response = await api.get<UserCredits>('/user/credits')
    return response.data!
  }

  async generateApiKey(): Promise<{ apiKey: string; message: string }> {
    const response = await api.post<{ apiKey: string; message: string }>('/user/api-key')
    return response.data!
  }

  async revokeApiKey(): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>('/user/api-key')
    return response.data!
  }

  // Helper functions
  getPlanDetails(plan: 'FREE' | 'PRO' | 'ENTERPRISE') {
    const plans = {
      FREE: {
        name: 'Free Plan',
        credits: 10,
        features: [
          '10 analyses per month',
          'Basic AI detection',
          '30-day history',
          'Email support',
        ],
        color: 'bg-gray-100 text-gray-800',
      },
      PRO: {
        name: 'Pro Plan',
        credits: -1, // unlimited
        features: [
          'Unlimited analyses',
          'Advanced AI detection',
          'API access',
          'Complete history',
          'PDF reports',
          'Priority support',
          'Batch analysis',
        ],
        color: 'bg-blue-100 text-blue-800',
      },
      ENTERPRISE: {
        name: 'Enterprise Plan',
        credits: -1,
        features: [
          'Everything in Pro',
          'Guaranteed SLA',
          'Dedicated support',
          'Custom training',
          'Higher API rate limits',
          'Optional white-label',
        ],
        color: 'bg-purple-100 text-purple-800',
      },
    }
    
    return plans[plan]
  }

  formatCredits(credits: number, unlimited: boolean): string {
    if (unlimited || credits === -1) {
      return 'Ilimitado'
    }
    return `${credits} créditos`
  }
}

export const userService = new UserService()
export default userService