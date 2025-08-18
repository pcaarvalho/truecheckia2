import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Crown, 
  Zap, 
  Check, 
  Loader2, 
  X,
  Sparkles,
  Target,
  BarChart3,
  Shield,
  Users,
  HeadphonesIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import subscriptionService from '@/services/subscription.service'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  currentPlan?: 'FREE' | 'PRO' | 'ENTERPRISE'
  triggerReason?: 'no_credits' | 'low_credits' | 'manual'
}

interface PlanFeature {
  text: string
  icon: React.ReactNode
  included: boolean
}

interface Plan {
  id: 'FREE' | 'PRO' | 'ENTERPRISE'
  name: string
  price: string
  priceDetails: string
  description: string
  features: PlanFeature[]
  badge?: string
  badgeColor?: string
  buttonText: string
  buttonVariant: 'default' | 'outline' | 'secondary'
  popular?: boolean
  enterprise?: boolean
}

export function UpgradeModal({ 
  isOpen, 
  onClose, 
  currentPlan = 'FREE',
  triggerReason = 'manual'
}: UpgradeModalProps) {
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const { toast } = useToast()

  const plans: Plan[] = [
    {
      id: 'FREE',
      name: 'Free',
      price: 'R$ 0',
      priceDetails: 'Forever',
      description: 'Perfect for testing and occasional use',
      badge: currentPlan === 'FREE' ? 'Current Plan' : undefined,
      badgeColor: 'secondary',
      buttonText: currentPlan === 'FREE' ? 'Current Plan' : 'Free',
      buttonVariant: 'outline',
      features: [
        { text: '10 analyses per month', icon: <Target className="w-4 h-4" />, included: true },
        { text: 'Basic AI detection', icon: <Zap className="w-4 h-4" />, included: true },
        { text: '30-day history', icon: <BarChart3 className="w-4 h-4" />, included: true },
        { text: 'Email support', icon: <HeadphonesIcon className="w-4 h-4" />, included: true },
        { text: 'API access', icon: <Users className="w-4 h-4" />, included: false },
        { text: 'PDF reports', icon: <Shield className="w-4 h-4" />, included: false },
      ]
    },
    {
      id: 'PRO',
      name: 'Pro',
      price: 'R$ 49',
      priceDetails: 'per month',
      description: 'For professionals and small businesses',
      badge: currentPlan === 'PRO' ? 'Current Plan' : 'Most Popular',
      badgeColor: currentPlan === 'PRO' ? 'secondary' : 'default',
      buttonText: currentPlan === 'PRO' ? 'Current Plan' : 'Choose Pro',
      buttonVariant: currentPlan === 'PRO' ? 'outline' : 'default',
      popular: currentPlan !== 'PRO',
      features: [
        { text: 'Unlimited analyses', icon: <Sparkles className="w-4 h-4" />, included: true },
        { text: 'Advanced AI detection', icon: <Zap className="w-4 h-4" />, included: true },
        { text: 'API para integrações', icon: <Users className="w-4 h-4" />, included: true },
        { text: 'Complete history', icon: <BarChart3 className="w-4 h-4" />, included: true },
        { text: 'Relatórios em PDF', icon: <Shield className="w-4 h-4" />, included: true },
        { text: 'Priority support', icon: <HeadphonesIcon className="w-4 h-4" />, included: true },
      ]
    },
    {
      id: 'ENTERPRISE',
      name: 'Enterprise',
      price: 'R$ 199',
      priceDetails: 'per month',
      description: 'For large teams and organizations',
      badge: currentPlan === 'ENTERPRISE' ? 'Current Plan' : 'Enterprise',
      badgeColor: currentPlan === 'ENTERPRISE' ? 'secondary' : 'secondary',
      buttonText: currentPlan === 'ENTERPRISE' ? 'Current Plan' : 'Contact Sales',
      buttonVariant: currentPlan === 'ENTERPRISE' ? 'outline' : 'secondary',
      enterprise: true,
      features: [
        { text: 'Everything in Pro', icon: <Check className="w-4 h-4" />, included: true },
        { text: 'Guaranteed SLA', icon: <Shield className="w-4 h-4" />, included: true },
        { text: 'Dedicated support', icon: <HeadphonesIcon className="w-4 h-4" />, included: true },
        { text: 'Custom training', icon: <Users className="w-4 h-4" />, included: true },
        { text: 'Higher API rate limits', icon: <Target className="w-4 h-4" />, included: true },
        { text: 'Optional white-label', icon: <Crown className="w-4 h-4" />, included: true },
      ]
    }
  ]

  const getModalTitle = () => {
    switch (triggerReason) {
      case 'no_credits':
        return 'Credits Exhausted'
      case 'low_credits':
        return 'Your Credits Are Running Low'
      default:
        return 'Choose Your Plan'
    }
  }

  const getModalDescription = () => {
    switch (triggerReason) {
      case 'no_credits':
        return 'You have no more credits for analyses. Upgrade to continue using TrueCheckIA.'
      case 'low_credits':
        return 'You have few credits remaining. Consider upgrading for unlimited analyses.'
      default:
        return 'Choose the ideal plan for your needs and get access to advanced features.'
    }
  }

  const handleUpgrade = async (planId: string) => {
    if (planId === currentPlan) return
    if (planId === 'FREE') return

    setIsUpgrading(true)
    setSelectedPlan(planId)

    try {
      if (planId === 'ENTERPRISE') {
        // Para Enterprise, apenas mostra uma mensagem para contatar vendas
        toast({
          title: 'Enterprise Plan',
          description: 'Contact us to set up your personalized Enterprise plan.',
        })
        // Aqui você pode adicionar lógica para abrir um chat ou formulário de contato
        return
      }

      // Para Pro, redireciona para Stripe Checkout
      const priceIds = subscriptionService.getPriceIds()
      const priceId = priceIds.pro.monthly // Ou você pode adicionar seleção mensal/anual

      await subscriptionService.createCheckout(priceId)
      
      // O usuário será redirecionado para o Stripe, então fechamos o modal
      onClose()
      
    } catch (error: unknown) {
      toast({
        title: 'Upgrade error',
        description: (error as Error).message || 'An error occurred while processing the upgrade. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsUpgrading(false)
      setSelectedPlan(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold">{getModalTitle()}</DialogTitle>
          <DialogDescription className="text-base">
            {getModalDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={cn(
                'relative transition-all duration-200',
                plan.popular && 'ring-2 ring-blue-500 ring-offset-2',
                currentPlan === plan.id && 'bg-gray-50'
              )}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge 
                    variant={(plan.badgeColor === 'secondary' || plan.badgeColor === 'default') ? plan.badgeColor : 'secondary'}
                    className={cn(
                      'px-3 py-1 text-xs font-medium',
                      plan.popular && 'bg-blue-500 text-white'
                    )}
                  >
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-lg font-bold">{plan.name}</CardTitle>
                <div className="text-3xl font-bold">
                  {plan.price}
                  <span className="text-sm font-normal text-gray-500 ml-1">
                    {plan.priceDetails}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{plan.description}</p>
              </CardHeader>

              <CardContent className="space-y-4">
                <Separator />
                
                <div className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <div 
                      key={index}
                      className={cn(
                        'flex items-center gap-3 text-sm',
                        feature.included ? 'text-gray-900' : 'text-gray-400'
                      )}
                    >
                      <div className={cn(
                        'flex-shrink-0',
                        feature.included ? 'text-green-500' : 'text-gray-300'
                      )}>
                        {feature.included ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </div>
                      <span className={feature.included ? '' : 'line-through'}>
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator />

                <Button
                  className="w-full"
                  variant={plan.buttonVariant}
                  disabled={currentPlan === plan.id || (isUpgrading && selectedPlan === plan.id)}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {isUpgrading && selectedPlan === plan.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    plan.buttonText
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">30-day guarantee</p>
              <p>Not satisfied? Cancel anytime and get a full refund within the first 30 days.</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default UpgradeModal