import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { subscriptionService } from '@/services/subscription.service';

/**
 * Hook to handle post-login actions like redirecting to checkout
 * based on stored user intentions
 */
export function usePostLogin() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const handlePostLoginActions = async () => {
      // Handle pre-filled email for registration
      const signupEmail = localStorage.getItem('signup_email');
      if (signupEmail) {
        localStorage.removeItem('signup_email');
        toast.success(`Welcome, ${user.name || user.email}!`, {
          description: 'Your account has been created successfully.',
        });
      }

      // Handle intended subscription plan
      const intendedPlan = localStorage.getItem('intended_plan');
      if (intendedPlan) {
        try {
          const planData = JSON.parse(intendedPlan);
          localStorage.removeItem('intended_plan');
          
          if (planData.plan === 'PRO') {
            toast.success('Welcome back! Continuing with your Pro subscription...', {
              description: 'We\'ll redirect you to checkout in a moment.',
            });

            // Small delay for UX
            setTimeout(async () => {
              try {
                const priceIds = subscriptionService.getPriceIds();
                const priceId = planData.billing === 'yearly' 
                  ? priceIds.pro.yearly 
                  : priceIds.pro.monthly;
                
                await subscriptionService.createCheckout(priceId);
              } catch (error) {
                console.error('Post-login checkout error:', error);
                toast.error('Failed to start checkout. Please try again from the pricing page.');
                navigate('/#pricing');
              }
            }, 2000);
          }
        } catch (error) {
          console.error('Error processing intended plan:', error);
          localStorage.removeItem('intended_plan');
        }
      }

      // Handle redirect after login
      const redirectPath = localStorage.getItem('post_login_redirect');
      if (redirectPath && redirectPath !== '/login' && redirectPath !== '/register') {
        localStorage.removeItem('post_login_redirect');
        navigate(redirectPath);
      }
    };

    // Small delay to ensure auth state is fully settled
    const timeoutId = setTimeout(handlePostLoginActions, 500);
    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, user, navigate]);

  // Utility functions for other components to use
  const storeIntendedPlan = (plan: 'PRO', billing: 'monthly' | 'yearly') => {
    localStorage.setItem('intended_plan', JSON.stringify({ plan, billing }));
  };

  const storeSignupEmail = (email: string) => {
    localStorage.setItem('signup_email', email);
  };

  const storePostLoginRedirect = (path: string) => {
    localStorage.setItem('post_login_redirect', path);
  };

  return {
    storeIntendedPlan,
    storeSignupEmail,
    storePostLoginRedirect,
  };
}

export default usePostLogin;