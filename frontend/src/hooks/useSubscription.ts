import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'
import subscriptionService from '@/services/subscription.service'

export function useSubscription() {
  const { data: status, isLoading } = useQuery({
    queryKey: ['subscriptionStatus'],
    queryFn: () => subscriptionService.getStatus(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!localStorage.getItem('accessToken'), // Only run if user is authenticated
  })

  // Handle intended plan checkout after login
  useEffect(() => {
    const handlePostLoginCheckout = async () => {
      const intendedPlan = localStorage.getItem('intended_plan');
      if (intendedPlan) {
        try {
          const planData = JSON.parse(intendedPlan);
          localStorage.removeItem('intended_plan');
          
          if (planData.plan === 'PRO') {
            toast.info('Continuing with your Pro subscription...');
            const priceIds = subscriptionService.getPriceIds();
            const priceId = planData.billing === 'yearly' ? priceIds.pro.yearly : priceIds.pro.monthly;
            
            // Small delay to ensure user sees the message
            setTimeout(() => {
              checkoutMutation.mutate(priceId);
            }, 1500);
          }
        } catch (error) {
          console.error('Error processing intended plan:', error);
          localStorage.removeItem('intended_plan');
        }
      }
    };

    if (!isLoading && status) {
      handlePostLoginCheckout();
    }
  }, [status, isLoading]);

  const checkoutMutation = useMutation({
    mutationFn: (priceId: string) => subscriptionService.createCheckout(priceId),
    onSuccess: () => {
      toast.info('Redirecionando para o checkout...')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar sessão de checkout')
    },
  })

  const portalMutation = useMutation({
    mutationFn: () => subscriptionService.createPortal(),
    onSuccess: () => {
      toast.info('Redirecionando para o portal de assinatura...')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao acessar portal de assinatura')
    },
  })

  // Helper function to start checkout with plan type
  const startCheckout = (planType: 'monthly' | 'yearly' = 'monthly') => {
    const priceIds = subscriptionService.getPriceIds();
    const priceId = planType === 'yearly' ? priceIds.pro.yearly : priceIds.pro.monthly;
    checkoutMutation.mutate(priceId);
  };

  return {
    plan: status?.plan || 'FREE',
    subscription: status?.subscription || null,
    isLoading,
    createCheckout: checkoutMutation.mutate,
    startCheckout,
    openPortal: portalMutation.mutate,
    isCreatingCheckout: checkoutMutation.isPending,
    isOpeningPortal: portalMutation.isPending,
  }
}

export default useSubscription