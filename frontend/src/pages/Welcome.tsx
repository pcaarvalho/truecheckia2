import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import ProgressStepper, { Step } from '@/components/ui/progress-stepper'
import { EmailVerifiedCelebration } from '@/components/welcome/SuccessCelebration'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Rocket, 
  Clock, 
  Target, 
  Sparkles, 
  ArrowRight, 
  CheckCircle,
  Zap,
  Shield,
  BarChart3,
  Users,
  Globe,
  Star
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

const Welcome: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const [showCelebration, setShowCelebration] = useState(true)
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0)

  // Onboarding steps
  const steps: Step[] = [
    {
      id: 'register',
      label: 'Register',
      description: 'Account created',
    },
    {
      id: 'verify',
      label: 'Email',
      description: 'Verified',
    },
    {
      id: 'welcome',
      label: 'Welcome',
      description: 'Current',
    },
    {
      id: 'first-analysis',
      label: 'First Analysis',
      description: 'Next',
    },
  ]

  // Features to highlight
  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Analysis in 2 seconds',
      description: 'Instant results with 95% accuracy',
      color: 'text-yellow-500',
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Advanced detection',
      description: 'AI trained with millions of texts',
      color: 'text-blue-500',
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Detailed reports',
      description: 'Complete analysis with explanations',
      color: 'text-green-500',
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: '10,000+ users',
      description: 'Trusted by professionals',
      color: 'text-purple-500',
    },
  ]

  // Benefits for motivation
  const benefits = [
    'Detect AI-generated content with 95% accuracy',
    'Save time by checking texts instantly',
    'Protect your brand and credibility',
    'Access detailed reports and history',
  ]

  // Track onboarding start
  useEffect(() => {
    // Analytics tracking
    try {
      localStorage.setItem('onboarding_welcome_viewed', Date.now().toString())
      
      // Track in analytics
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'onboarding_welcome_viewed', {
          event_category: 'onboarding',
          user_id: user?.id,
        })
      }
    } catch (error) {
      console.warn('Failed to track welcome view:', error)
    }
  }, [user?.id])

  // Rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeatureIndex((prev) => (prev + 1) % features.length)
    }, 3000) // Change every 3 seconds

    return () => clearInterval(interval)
  }, [features.length])

  const handleStartTutorial = () => {
    try {
      localStorage.setItem('onboarding_tutorial_started', Date.now().toString())
      
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'onboarding_tutorial_started', {
          event_category: 'onboarding',
          user_id: user?.id,
        })
      }
    } catch (error) {
      console.warn('Failed to track tutorial start:', error)
    }

    toast({
      title: 'Tutorial started!',
      description: 'Let\'s learn how to use TrueCheckIA together.',
    })

    navigate('/onboarding')
  }

  const handleSkipToAnalysis = () => {
    try {
      localStorage.setItem('onboarding_skipped', Date.now().toString())
      
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'onboarding_skipped', {
          event_category: 'onboarding',
          user_id: user?.id,
        })
      }
    } catch (error) {
      console.warn('Failed to track onboarding skip:', error)
    }

    navigate('/analysis?guided=true&first=true')
  }

  const currentFeature = features[currentFeatureIndex]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50">
      {/* Floating Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-64 h-64 bg-purple-300/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-indigo-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Success Celebration */}
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-center mb-8"
          >
            <EmailVerifiedCelebration
              duration={3000}
              onComplete={() => setShowCelebration(false)}
              size="lg"
            />
          </motion.div>
        )}

        {/* Progress Indicator */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="max-w-2xl mx-auto mb-12"
        >
          <div className="text-center mb-6">
            <Badge variant="secondary" className="mb-2">
              Step 2 of 4
            </Badge>
            <h2 className="text-sm text-muted-foreground">Your TrueCheckIA journey</h2>
          </div>
          <ProgressStepper
            steps={steps}
            currentStep={2}
            size="md"
            className="max-w-md mx-auto"
          />
        </motion.div>

        {/* Welcome Content */}
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Welcome Message */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1, type: 'spring', stiffness: 200 }}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-full"
                >
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <span className="text-purple-700 font-medium">Welcome!</span>
                </motion.div>

                <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
                  Congratulations, <span className="gradient-text">{user?.name || 'User'}</span>! 🎉
                </h1>

                <p className="text-xl text-muted-foreground leading-relaxed">
                  Your account is verified and ready. Now you can detect AI-generated content 
                  with the accuracy and speed that more than 10,000 professionals trust.
                </p>
              </div>

              {/* Value Proposition */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-purple-200/50">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center space-x-2 text-green-600">
                    <Clock className="w-5 h-5" />
                    <span className="font-semibold">3 minutes</span>
                  </div>
                  <div className="flex items-center space-x-2 text-blue-600">
                    <Target className="w-5 h-5" />
                    <span className="font-semibold">3 steps</span>
                  </div>
                  <div className="flex items-center space-x-2 text-purple-600">
                    <Star className="w-5 h-5" />
                    <span className="font-semibold">1st analysis</span>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  In just 3 minutes, you'll master the basics and perform your first analysis successfully.
                </p>
              </div>

              {/* Benefits List */}
              <div className="space-y-3">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.2 + index * 0.1 }}
                    className="flex items-center space-x-3"
                  >
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </motion.div>
                ))}
              </div>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.6 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Button
                  onClick={handleStartTutorial}
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Rocket className="w-5 h-5 mr-2" />
                  Start Tutorial (3 min)
                </Button>
                
                <Button
                  onClick={handleSkipToAnalysis}
                  variant="outline"
                  size="lg"
                  className="border-purple-200 hover:bg-purple-50 transition-all duration-300"
                >
                  Go directly to analysis
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            </motion.div>

            {/* Right Column - Feature Showcase */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 }}
              className="lg:order-last"
            >
              <Card className="bg-white/80 backdrop-blur-sm border-purple-200/50 shadow-xl">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <motion.div
                      key={currentFeatureIndex}
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 90 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                      className={`w-16 h-16 rounded-full bg-gradient-to-br from-white to-gray-50 border-2 border-purple-200 flex items-center justify-center ${currentFeature.color}`}
                    >
                      {currentFeature.icon}
                    </motion.div>
                  </div>
                  
                  <motion.div
                    key={`title-${currentFeatureIndex}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CardTitle className="text-xl mb-2">{currentFeature.title}</CardTitle>
                    <CardDescription className="text-base">
                      {currentFeature.description}
                    </CardDescription>
                  </motion.div>
                </CardHeader>
                
                <CardContent>
                  {/* Feature Indicators */}
                  <div className="flex justify-center space-x-2 mb-6">
                    {features.map((_, index) => (
                      <motion.div
                        key={index}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          index === currentFeatureIndex 
                            ? 'bg-purple-600 w-6' 
                            : 'bg-purple-200'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="font-bold text-2xl text-purple-600">95%</div>
                      <div className="text-sm text-purple-700">Precision</div>
                    </div>
                    <div className="text-center p-3 bg-indigo-50 rounded-lg">
                      <div className="font-bold text-2xl text-indigo-600">2s</div>
                      <div className="text-sm text-indigo-700">Result</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="font-bold text-2xl text-green-600">10</div>
                      <div className="text-sm text-green-700">Free credits</div>
                    </div>
                    <div className="text-center p-3 bg-pink-50 rounded-lg">
                      <div className="font-bold text-2xl text-pink-600">∞</div>
                      <div className="text-sm text-pink-700">Possibilities</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Bottom Help Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="text-center mt-16"
        >
          <p className="text-muted-foreground">
            Need help? Contact us at{' '}
            <a 
              href="mailto:support@truecheckia.com" 
              className="text-purple-600 hover:underline font-medium"
            >
              support@truecheckia.com
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default Welcome