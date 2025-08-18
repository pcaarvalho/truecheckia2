import React from 'react'
import { motion } from 'framer-motion'
import { Mail, Search, Folder, Clock, AlertTriangle, CheckCircle } from 'lucide-react'

interface EmailVerificationTipsProps {
  variant?: 'default' | 'minimal'
  showTitle?: boolean
  className?: string
}

const EmailVerificationTips: React.FC<EmailVerificationTipsProps> = ({
  variant = 'default',
  showTitle = true,
  className = ''
}) => {
  const tips = [
    {
      icon: <Mail className="w-4 h-4" />,
      text: 'Verifique sua caixa de entrada',
      detail: 'O email deve chegar em alguns segundos'
    },
    {
      icon: <Search className="w-4 h-4" />,
      text: 'Procure por "TrueCheckIA"',
      detail: 'O remetente é noreply@truecheckia.com'
    },
    {
      icon: <Folder className="w-4 h-4" />,
      text: 'Cheque a pasta de spam',
      detail: 'Às vezes emails automáticos vão para lá'
    },
    {
      icon: <Clock className="w-4 h-4" />,
      text: 'Link válido por 24 horas',
      detail: 'Após isso, será necessário solicitar novo link'
    }
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3
      }
    }
  }

  if (variant === 'minimal') {
    return (
      <motion.div
        className={`space-y-2 ${className}`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {tips.map((tip, index) => (
          <motion.div
            key={index}
            variants={itemVariants}
            className="flex items-center space-x-2 text-sm text-purple-200"
          >
            <span className="text-purple-300">{tip.icon}</span>
            <span>{tip.text}</span>
          </motion.div>
        ))}
      </motion.div>
    )
  }

  return (
    <motion.div
      className={`bg-white/5 rounded-lg p-4 ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {showTitle && (
        <motion.h3
          className="text-white font-medium mb-3 flex items-center space-x-2"
          variants={itemVariants}
        >
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span>O que fazer agora:</span>
        </motion.h3>
      )}
      
      <div className="space-y-3">
        {tips.map((tip, index) => (
          <motion.div
            key={index}
            variants={itemVariants}
            className="flex items-start space-x-3 text-sm"
          >
            <div className="mt-0.5 text-purple-300 flex-shrink-0">
              {tip.icon}
            </div>
            <div>
              <div className="text-purple-200 font-medium">{tip.text}</div>
              <div className="text-purple-300 text-xs mt-0.5">{tip.detail}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        variants={itemVariants}
        className="mt-4 pt-3 border-t border-white/10"
      >
        <div className="flex items-start space-x-2 text-xs text-purple-300">
          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Dica:</strong> Se você não receber o email em 5 minutos, 
            verifique as configurações de spam do seu provedor de email.
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default EmailVerificationTips