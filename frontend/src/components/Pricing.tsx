import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Zap, ArrowRight, User, AlertCircle, CheckCircle2 } from "lucide-react";
import { subscriptionService } from "@/services/subscription.service";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

const Pricing = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  const { startCheckout, isCreatingCheckout } = useSubscription();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Handle checkout success/cancellation feedback
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    
    if (success === 'true') {
      toast.success('Payment successful! Welcome to TrueCheckIA Pro!', {
        description: 'Your subscription is now active. Enjoy unlimited AI detection!',
        duration: 5000,
      });
    } else if (canceled === 'true') {
      toast.error('Checkout canceled', {
        description: 'Your payment was not processed. No charges were made to your account.',
        duration: 4000,
      });
    }
  }, [searchParams]);

  const handleCheckout = async (planName: string) => {
    // Handle Free Plan
    if (planName === 'FREE') {
      if (!isAuthenticated) {
        navigate('/register?plan=free&message=Create your free account to start analyzing AI content');
        return;
      }
      toast.success('You are already enjoying our free plan!', {
        description: 'Upgrade to Pro for unlimited analyses and advanced features.',
      });
      return;
    }

    // Handle Enterprise Plan
    if (planName === 'ENTERPRISE') {
      window.open('mailto:sales@truecheckia.com?subject=Enterprise Plan Inquiry&body=Hi, I\'m interested in learning more about your Enterprise plan. Please contact me to discuss custom pricing and features.', '_blank');
      toast.info('Enterprise inquiry email opened', {
        description: 'Our sales team will contact you within 24 hours.',
      });
      return;
    }

    // Handle Pro Plan - Require Authentication
    if (!isAuthenticated) {
      navigate(`/register?plan=pro&billing=${isAnnual ? 'annual' : 'monthly'}&message=Create your account to start your Pro trial`);
      return;
    }

    try {
      setIsLoading(planName);
      const priceIds = subscriptionService.getPriceIds();
      const priceId = isAnnual ? priceIds.pro.yearly : priceIds.pro.monthly;
      
      // Add loading toast for better UX
      toast.loading('Redirecting to secure checkout...', {
        description: 'Please wait while we prepare your Pro subscription.',
        id: 'checkout-loading'
      });
      
      await subscriptionService.createCheckout(priceId);
    } catch (error) {
      console.error('Checkout error:', error);
      toast.dismiss('checkout-loading');
      toast.error('Unable to start checkout', {
        description: 'Please check your connection and try again. If the problem persists, contact support.',
        duration: 6000,
      });
    } finally {
      setIsLoading(null);
    }
  };

  const plans = [
    {
      name: "FREE",
      description: "Perfect for trying out our service",
      price: { monthly: 0, annual: 0 },
      features: [
        "10 analyses per month",
        "Basic detection",
        "24h support",
        "Web interface",
        "Basic reports",
      ],
      buttonText: isAuthenticated ? "Current Plan" : "Start Free - No Card Required",
      buttonVariant: "outline" as const,
      popular: false,
      highlight: "Most popular for beginners",
    },
    {
      name: "PRO",
      description: "Best for professionals and teams",
      price: { monthly: 19, annual: 15 },
      features: [
        "Unlimited analyses",
        "Advanced detection",
        "API access (1000 calls)",
        "Priority support",
        "Export reports",
        "Multi-language support",
        "Detailed analytics",
      ],
      buttonText: isAuthenticated ? "Upgrade to Pro" : "Start Pro Trial - 7 Days Free",
      buttonVariant: "hero" as const,
      popular: true,
      highlight: "Best value for professionals",
    },
    {
      name: "ENTERPRISE",
      description: "For large organizations",
      price: { monthly: "Custom", annual: "Custom" },
      features: [
        "Custom volume",
        "Dedicated support",
        "SLA guarantee",
        "Team accounts",
        "Custom integration",
        "White-label option",
        "Advanced security",
      ],
      buttonText: "Contact Sales Team",
      buttonVariant: "glass" as const,
      popular: false,
      highlight: "Custom solutions available",
    },
  ];

  const getPrice = (plan: typeof plans[0]) => {
    if (typeof plan.price.monthly === "string") return plan.price.monthly;
    return isAnnual ? plan.price.annual : plan.price.monthly;
  };

  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-5" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
            Simple, <span className="gradient-text">Transparent Pricing</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect plan for your AI detection needs
          </p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-4 mt-8">
            <span className={`text-sm ${!isAnnual ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              Monthly
            </span>
            <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
            <span className={`text-sm ${isAnnual ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              Annual
            </span>
            {isAnnual && (
              <span className="text-xs bg-success/20 text-success px-2 py-1 rounded-full">
                Save 20%
              </span>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative glass rounded-2xl p-8 hover:scale-105 transition-all duration-300 ${
                plan.popular ? 'elevated border-primary/50 shadow-primary/10' : ''
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-primary to-secondary text-white px-4 py-1 rounded-full text-sm font-medium flex items-center space-x-1 animate-pulse">
                    <Star className="w-4 h-4" />
                    <span>Most Popular</span>
                  </div>
                </div>
              )}
              
              {plan.name === 'PRO' && !isAuthenticated && (
                <div className="absolute -top-2 -right-2">
                  <Badge variant="secondary" className="bg-success/20 text-success border-success/30 text-xs px-2 py-1">
                    7-Day Free Trial
                  </Badge>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mb-2">{plan.description}</p>
                {(plan as any).highlight && (
                  <p className="text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded-full inline-block">
                    {(plan as any).highlight}
                  </p>
                )}
                
                <div className="space-y-2">
                  <div className="text-4xl font-bold">
                    {typeof getPrice(plan) === "string" ? (
                      getPrice(plan)
                    ) : (
                      <>
                        ${getPrice(plan)}
                        <span className="text-lg text-muted-foreground font-normal">
                          /{isAnnual ? "year" : "month"}
                        </span>
                      </>
                    )}
                  </div>
                  {isAnnual && typeof getPrice(plan) === "number" && plan.price.monthly !== 0 && (
                    <div className="text-sm text-muted-foreground line-through">
                      ${plan.price.monthly}/month
                    </div>
                  )}
                </div>
              </div>

              <Button 
                variant={plan.buttonVariant} 
                className={`w-full mb-8 relative overflow-hidden group ${
                  plan.name === 'PRO' ? 'animate-pulse-slow' : ''
                }`}
                onClick={() => handleCheckout(plan.name)}
                disabled={isLoading === plan.name || (plan.name === 'FREE' && user?.plan === 'FREE')}
              >
                <div className="flex items-center justify-center w-full">
                  {isLoading === plan.name ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      {plan.name === 'FREE' && user?.plan === 'FREE' && (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                      )}
                      <span>{plan.buttonText}</span>
                      {plan.name === 'PRO' && (
                        <Zap className="w-4 h-4 ml-2 group-hover:rotate-12 transition-transform" />
                      )}
                    </>
                  )}
                </div>
              </Button>

              <ul className="space-y-4">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start space-x-3">
                    <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="text-center mt-12 space-y-6">
          {!isAuthenticated && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 max-w-md mx-auto">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <AlertCircle className="w-5 h-5 text-primary" />
                <span className="font-semibold text-primary">New to TrueCheckIA?</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Click any plan above to create your free account and get started immediately
              </p>
            </div>
          )}
          
          <p className="text-muted-foreground">
            All plans include access to our web interface and basic analytics
          </p>
          <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
            <span className="flex items-center space-x-1">
              <Zap className="w-4 h-4" />
              <span>No setup fees</span>
            </span>
            <span className="flex items-center space-x-1">
              <Check className="w-4 h-4" />
              <span>Cancel anytime</span>
            </span>
            <span className="flex items-center space-x-1">
              <Star className="w-4 h-4" />
              <span>24/7 support</span>
            </span>
          </div>
          
          {isAuthenticated && (
            <div className="bg-success/10 border border-success/20 rounded-lg p-4 max-w-md mx-auto">
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span className="font-semibold text-success">Ready to upgrade?</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Your account is active and ready for Pro features
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Pricing;