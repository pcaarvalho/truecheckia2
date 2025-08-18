import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Sparkles, Star, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Particle {
  id: number
  x: number
  y: number
  color: string
  size: number
  velocity: { x: number; y: number }
  rotation: number
  rotationSpeed: number
  icon: React.ReactNode
}

interface SuccessCelebrationProps {
  size?: 'sm' | 'md' | 'lg'
  duration?: number
  particleCount?: number
  autoHide?: boolean
  onComplete?: () => void
  className?: string
  children?: React.ReactNode
}

const SuccessCelebration: React.FC<SuccessCelebrationProps> = ({
  size = 'md',
  duration = 3000,
  particleCount = 20,
  autoHide = true,
  onComplete,
  className,
  children,
}) => {
  const [particles, setParticles] = useState<Particle[]>([])
  const [isVisible, setIsVisible] = useState(true)

  const sizeConfig = {
    sm: {
      container: 'w-16 h-16',
      checkIcon: 'w-6 h-6',
      particles: 'w-3 h-3',
    },
    md: {
      container: 'w-20 h-20',
      checkIcon: 'w-8 h-8',
      particles: 'w-4 h-4',
    },
    lg: {
      container: 'w-24 h-24',
      checkIcon: 'w-10 h-10',
      particles: 'w-5 h-5',
    },
  }

  const config = sizeConfig[size]

  const colors = [
    'text-purple-500',
    'text-indigo-500',
    'text-pink-500',
    'text-blue-500',
    'text-green-500',
    'text-yellow-500',
    'text-red-500',
    'text-cyan-500',
  ]

  const icons = [
    <Sparkles key="sparkles" />,
    <Star key="star" />,
    <Heart key="heart" />,
    <Check key="check" />,
  ]

  // Generate particles
  useEffect(() => {
    const newParticles: Particle[] = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 400 - 200, // -200 to 200
      y: Math.random() * 400 - 200,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 20 + 10,
      velocity: {
        x: (Math.random() - 0.5) * 6,
        y: (Math.random() - 0.5) * 6,
      },
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      icon: icons[Math.floor(Math.random() * icons.length)],
    }))

    setParticles(newParticles)
  }, [particleCount])

  // Auto-hide after duration
  useEffect(() => {
    if (autoHide && duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        onComplete?.()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [autoHide, duration, onComplete])

  const containerVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 15,
        staggerChildren: 0.1,
      },
    },
    exit: {
      scale: 0,
      opacity: 0,
      transition: {
        duration: 0.3,
      },
    },
  }

  const checkVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 12,
        delay: 0.2,
      },
    },
  }

  const particleVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: (custom: Particle) => ({
      scale: [0, 1.2, 1],
      opacity: [0, 1, 0],
      x: [0, custom.x],
      y: [0, custom.y],
      rotate: [custom.rotation, custom.rotation + custom.rotationSpeed * 10],
      transition: {
        duration: 2,
        ease: 'easeOut',
        delay: Math.random() * 0.5,
      },
    }),
  }

  const pulseVariants = {
    pulse: {
      scale: [1, 1.1, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={cn('relative flex items-center justify-center', className)}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Background Glow */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-indigo-500/20 to-pink-500/20 rounded-full blur-xl"
            variants={pulseVariants}
            animate="pulse"
          />

          {/* Main Success Icon */}
          <motion.div
            className={cn(
              'relative z-10 flex items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-lg',
              config.container
            )}
            variants={checkVariants}
          >
            <motion.div
              className="text-white"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Check className={config.checkIcon} strokeWidth={3} />
            </motion.div>
          </motion.div>

          {/* Particles */}
          <div className="absolute inset-0 pointer-events-none">
            {particles.map((particle) => (
              <motion.div
                key={particle.id}
                className={cn(
                  'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
                  particle.color,
                  config.particles
                )}
                variants={particleVariants}
                custom={particle}
                initial="hidden"
                animate="visible"
              >
                {particle.icon}
              </motion.div>
            ))}
          </div>

          {/* Success Rings */}
          {[1, 2, 3].map((ring) => (
            <motion.div
              key={ring}
              className="absolute inset-0 rounded-full border-2 border-green-400/30"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: [0.8, 1.5, 2],
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: 1.5,
                delay: ring * 0.2,
                ease: 'easeOut',
              }}
            />
          ))}

          {/* Optional Children Content */}
          {children && (
            <motion.div
              className="absolute top-full mt-4 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {children}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Preset variations for common use cases
export const EmailVerifiedCelebration: React.FC<Omit<SuccessCelebrationProps, 'children'>> = (props) => (
  <SuccessCelebration {...props}>
    <div className="text-center">
      <h3 className="text-lg font-semibold text-green-600 mb-1">Email Verificado!</h3>
      <p className="text-sm text-muted-foreground">Sua conta está pronta para usar</p>
    </div>
  </SuccessCelebration>
)

export const WelcomeCelebration: React.FC<Omit<SuccessCelebrationProps, 'children'>> = (props) => (
  <SuccessCelebration {...props}>
    <div className="text-center">
      <h3 className="text-lg font-semibold text-primary mb-1">Bem-vindo!</h3>
      <p className="text-sm text-muted-foreground">Vamos começar sua jornada</p>
    </div>
  </SuccessCelebration>
)

export const FirstAnalysisCelebration: React.FC<Omit<SuccessCelebrationProps, 'children'>> = (props) => (
  <SuccessCelebration {...props}>
    <div className="text-center">
      <h3 className="text-lg font-semibold text-purple-600 mb-1">Primeira Análise!</h3>
      <p className="text-sm text-muted-foreground">Você descobriu o poder do TrueCheckIA</p>
    </div>
  </SuccessCelebration>
)

export default SuccessCelebration