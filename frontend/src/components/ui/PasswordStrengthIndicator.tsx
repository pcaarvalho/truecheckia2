import { Check, X } from 'lucide-react'
import { motion } from 'framer-motion'

interface PasswordStrengthIndicatorProps {
  password: string
  className?: string
}

export function PasswordStrengthIndicator({ password, className = '' }: PasswordStrengthIndicatorProps) {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
  }
  
  const score = Object.values(checks).filter(Boolean).length
  
  if (!password) return null
  
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={`space-y-2 p-3 bg-white/5 rounded-lg ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-purple-200 text-sm">Password strength:</span>
        <span className={`text-xs px-2 py-1 rounded-full ${
          score === 4 ? 'bg-green-500/20 text-green-300' :
          score === 3 ? 'bg-yellow-500/20 text-yellow-300' :
          score >= 2 ? 'bg-orange-500/20 text-orange-300' :
          'bg-red-500/20 text-red-300'
        }`}>
          {score === 4 ? 'Strong' :
           score === 3 ? 'Good' :
           score >= 2 ? 'Fair' : 'Weak'}
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-white/10 rounded-full h-1.5">
        <motion.div
          className={`h-1.5 rounded-full transition-all duration-300 ${
            score === 4 ? 'bg-green-500' :
            score === 3 ? 'bg-yellow-500' :
            score >= 2 ? 'bg-orange-500' :
            'bg-red-500'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${(score / 4) * 100}%` }}
        />
      </div>
      
      <div className="space-y-1 text-xs">
        {[
          { check: checks.length, text: 'At least 8 characters' },
          { check: checks.uppercase, text: 'One uppercase letter' },
          { check: checks.lowercase, text: 'One lowercase letter' },
          { check: checks.number, text: 'One number' },
        ].map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center space-x-2 ${
              item.check ? 'text-green-300' : 'text-purple-300'
            }`}
          >
            {item.check ? (
              <Check className="w-3 h-3" />
            ) : (
              <X className="w-3 h-3" />
            )}
            <span>{item.text}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}