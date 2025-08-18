import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check, Loader2, Shield, Zap } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface VerificationProgressProps {
  isActive: boolean
  onComplete?: () => void
}

const VerificationProgress: React.FC<VerificationProgressProps> = ({
  isActive,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)

  const steps = [
    {
      id: 'validating',
      label: 'Validando token',
      description: 'Verificando autenticidade do link',
      icon: <Shield className="w-5 h-5" />,
      duration: 800
    },
    {
      id: 'processing',
      label: 'Processando dados',
      description: 'Ativando sua conta',
      icon: <Zap className="w-5 h-5" />,
      duration: 600
    },
    {
      id: 'completing',
      label: 'Finalizando',
      description: 'Preparando acesso',
      icon: <Check className="w-5 h-5" />,
      duration: 400
    }
  ]

  useEffect(() => {
    if (!isActive) {
      setCurrentStep(0)
      setProgress(0)
      return
    }

    let stepTimeout: NodeJS.Timeout
    let progressInterval: NodeJS.Timeout

    const runStep = (stepIndex: number) => {
      if (stepIndex >= steps.length) {
        onComplete?.()
        return
      }

      setCurrentStep(stepIndex)
      setProgress(0)

      const step = steps[stepIndex]
      const progressIncrement = 100 / (step.duration / 50) // Update every 50ms

      progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + progressIncrement
          if (newProgress >= 100) {
            clearInterval(progressInterval)
            return 100
          }
          return newProgress
        })
      }, 50)

      stepTimeout = setTimeout(() => {
        clearInterval(progressInterval)
        runStep(stepIndex + 1)
      }, step.duration)
    }

    runStep(0)

    return () => {
      clearTimeout(stepTimeout)
      clearInterval(progressInterval)
    }
  }, [isActive, onComplete])

  if (!isActive) return null

  const currentStepData = steps[currentStep]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="w-full max-w-xs mx-auto space-y-4"
    >
      {/* Current Step */}
      <div className="text-center">
        <motion.div
          key={currentStep}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-600/20 border border-purple-400/30 mb-2"
        >
          <motion.div
            animate={{ rotate: currentStepData?.id === 'processing' ? 360 : 0 }}
            transition={{ 
              duration: 2, 
              repeat: currentStepData?.id === 'processing' ? Infinity : 0,
              ease: 'linear'
            }}
            className="text-purple-300"
          >
            {currentStepData?.icon}
          </motion.div>
        </motion.div>

        <motion.div
          key={`label-${currentStep}`}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-1"
        >
          <div className="font-medium text-white text-sm">
            {currentStepData?.label}
          </div>
          <div className="text-xs text-purple-300">
            {currentStepData?.description}
          </div>
        </motion.div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Progress 
          value={progress} 
          className="h-2 bg-white/10"
        />
        <div className="flex justify-between text-xs text-purple-400">
          <span>Passo {currentStep + 1} de {steps.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Steps Indicator */}
      <div className="flex justify-center space-x-2">
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index < currentStep
                ? 'bg-green-400'
                : index === currentStep
                ? 'bg-purple-400 scale-125'
                : 'bg-white/20'
            }`}
            initial={{ scale: 0 }}
            animate={{ scale: index <= currentStep ? 1 : 0.8 }}
            transition={{ delay: index * 0.1 }}
          />
        ))}
      </div>
    </motion.div>
  )
}

export default VerificationProgress