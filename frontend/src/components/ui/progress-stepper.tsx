import React from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import { motion } from 'framer-motion'

export interface Step {
  id: string
  label: string
  description?: string
  icon?: React.ReactNode
}

export interface ProgressStepperProps {
  steps: Step[]
  currentStep: number
  orientation?: 'horizontal' | 'vertical'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onStepClick?: (stepIndex: number) => void
  clickableSteps?: boolean
}

const ProgressStepper: React.FC<ProgressStepperProps> = ({
  steps,
  currentStep,
  orientation = 'horizontal',
  size = 'md',
  className,
  onStepClick,
  clickableSteps = false,
}) => {
  const sizeConfig = {
    sm: {
      circle: 'w-6 h-6 text-xs',
      text: 'text-xs',
      connector: orientation === 'horizontal' ? 'h-0.5' : 'w-0.5',
    },
    md: {
      circle: 'w-8 h-8 text-sm',
      text: 'text-sm',
      connector: orientation === 'horizontal' ? 'h-1' : 'w-1',
    },
    lg: {
      circle: 'w-10 h-10 text-base',
      text: 'text-base',
      connector: orientation === 'horizontal' ? 'h-1.5' : 'w-1.5',
    },
  }

  const config = sizeConfig[size]

  const getStepStatus = (index: number) => {
    if (index < currentStep) return 'completed'
    if (index === currentStep) return 'current'
    return 'upcoming'
  }

  const getStepClasses = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-primary text-primary-foreground border-primary'
      case 'current':
        return 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/20'
      case 'upcoming':
        return 'bg-muted text-muted-foreground border-border'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getConnectorClasses = (index: number) => {
    const isCompleted = index < currentStep
    return cn(
      'bg-gradient-to-r transition-all duration-500',
      isCompleted
        ? 'from-primary to-primary'
        : 'from-muted to-muted',
      config.connector
    )
  }

  if (orientation === 'vertical') {
    return (
      <div className={cn('flex flex-col space-y-4', className)}>
        {steps.map((step, index) => {
          const status = getStepStatus(index)
          const isClickable = clickableSteps && onStepClick && status !== 'upcoming'

          return (
            <div key={step.id} className="flex items-start space-x-3">
              {/* Step Circle */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  'flex items-center justify-center rounded-full border-2 transition-all duration-300',
                  config.circle,
                  getStepClasses(status),
                  isClickable && 'cursor-pointer hover:scale-110'
                )}
                onClick={isClickable ? () => onStepClick(index) : undefined}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
                aria-label={`Step ${index + 1}: ${step.label}`}
              >
                {status === 'completed' ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Check className="w-4 h-4" />
                  </motion.div>
                ) : step.icon ? (
                  step.icon
                ) : (
                  <span className="font-semibold">{index + 1}</span>
                )}
              </motion.div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 + 0.1 }}
                  className={cn(
                    'font-medium leading-tight',
                    config.text,
                    status === 'current' 
                      ? 'text-foreground' 
                      : status === 'completed'
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </motion.p>
                {step.description && (
                  <motion.p
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 + 0.2 }}
                    className="text-xs text-muted-foreground mt-1"
                  >
                    {step.description}
                  </motion.p>
                )}
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="absolute left-4 mt-8 flex items-center">
                  <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: index * 0.1 + 0.3 }}
                    className={cn('h-8', getConnectorClasses(index))}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Horizontal Layout
  return (
    <div className={cn('flex items-center justify-between w-full', className)}>
      {steps.map((step, index) => {
        const status = getStepStatus(index)
        const isClickable = clickableSteps && onStepClick && status !== 'upcoming'

        return (
          <React.Fragment key={step.id}>
            {/* Step */}
            <div className="flex flex-col items-center space-y-2">
              {/* Step Circle */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  'flex items-center justify-center rounded-full border-2 transition-all duration-300',
                  config.circle,
                  getStepClasses(status),
                  isClickable && 'cursor-pointer hover:scale-110'
                )}
                onClick={isClickable ? () => onStepClick(index) : undefined}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
                aria-label={`Step ${index + 1}: ${step.label}`}
              >
                {status === 'completed' ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Check className="w-4 h-4" />
                  </motion.div>
                ) : step.icon ? (
                  step.icon
                ) : (
                  <span className="font-semibold">{index + 1}</span>
                )}
              </motion.div>

              {/* Step Label */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.1 }}
                className="text-center max-w-20 sm:max-w-24"
              >
                <p
                  className={cn(
                    'font-medium leading-tight',
                    config.text,
                    status === 'current' 
                      ? 'text-foreground' 
                      : status === 'completed'
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                    {step.description}
                  </p>
                )}
              </motion.div>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: index * 0.1 + 0.2 }}
                className={cn(
                  'flex-1 mx-2 sm:mx-4',
                  getConnectorClasses(index)
                )}
                style={{ originX: 0 }}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

export default ProgressStepper