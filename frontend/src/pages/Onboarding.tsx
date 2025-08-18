import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowRight, 
  ArrowLeft, 
  FileText, 
  Brain, 
  BarChart3, 
  Play,
  CheckCircle,
  Sparkles,
  Target,
  Zap,
  Copy,
  Send
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/use-toast'
import { useOnboardingMetrics } from '@/components/onboarding/SuccessMetrics'

export default function Onboarding() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const { trackOnboardingStep, trackOnboardingComplete, trackOnboardingSkipped } = useOnboardingMetrics()
  const [currentStep, setCurrentStep] = useState(1)
  const [isCompleted, setIsCompleted] = useState(false)

  const totalSteps = 3
  const progress = (currentStep / totalSteps) * 100

  const sampleTexts = [
    {
      type: "AI Generated",
      text: "Artificial intelligence has revolutionized numerous industries by providing unprecedented capabilities in data processing and analysis. This technology enables organizations to automate complex tasks, derive meaningful insights from vast datasets, and enhance decision-making processes across various domains.",
      confidence: 85
    },
    {
      type: "Human Written",
      text: "I was walking my dog yesterday when something funny happened. Max, my golden retriever, suddenly stopped in front of Mrs. Johnson's house and started barking at absolutely nothing. Turns out, he was just excited to see his reflection in her car's mirror!",
      confidence: 15
    }
  ]

  const steps = [
    {
      id: 1,
      title: "Como funciona a detecção",
      subtitle: "Entenda a tecnologia por trás da análise",
      icon: <Brain className="w-8 h-8 text-purple-600" />,
      content: {
        description: "O TrueCheckIA usa múltiplos modelos de IA para analisar padrões de escrita, estrutura linguística e características específicas que diferenciam textos humanos de textos gerados por IA.",
        features: [
          { icon: "🧠", title: "Análise Multi-modelo", desc: "GPT-4 + outros modelos para precisão máxima" },
          { icon: "⚡", title: "Processamento Rápido", desc: "Resultados em 5-10 segundos" },
          { icon: "🎯", title: "Alta Precisão", desc: "Mais de 90% de precisão em testes" }
        ],
        visual: (
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-6">
            <div className="text-center">
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center"
                >
                  <Brain className="w-8 h-8 text-white" />
                </motion.div>
                <div className="text-sm font-medium text-gray-700">Analyzing patterns...</div>
              </div>
            </div>
          </div>
        )
      }
    },
    {
      id: 2,
      title: "Experimentar análise",
      subtitle: "Veja a detecção em ação com exemplos reais",
      icon: <FileText className="w-8 h-8 text-indigo-600" />,
      content: {
        description: "Experimente a análise com textos de exemplo. Veja como identificamos diferentes tipos de conteúdo e interpretamos os resultados.",
        interactive: true
      }
    },
    {
      id: 3,
      title: "Interpretar resultados",
      subtitle: "Aprenda a ler e usar os insights fornecidos",
      icon: <BarChart3 className="w-8 h-8 text-green-600" />,
      content: {
        description: "Entenda como interpretar a pontuação de probabilidade, indicadores encontrados e recomendações para tomar decisões informadas.",
        features: [
          { icon: "📊", title: "Pontuação de Probabilidade", desc: "0-100% chance de ser IA" },
          { icon: "🔍", title: "Indicadores Específicos", desc: "Razões detalhadas da classificação" },
          { icon: "💡", title: "Recomendações", desc: "Próximos passos sugeridos" }
        ],
        visual: (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Probabilidade de IA:</span>
                <span className="text-2xl font-bold text-red-600">85%</span>
              </div>
              <Progress value={85} className="mb-2" />
              <p className="text-sm text-red-700">Alta probabilidade de ser IA</p>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Probabilidade de IA:</span>
                <span className="text-2xl font-bold text-green-600">15%</span>
              </div>
              <Progress value={15} className="mb-2" />
              <p className="text-sm text-green-700">Provavelmente humano</p>
            </div>
          </div>
        )
      }
    }
  ]

  const nextStep = () => {
    if (currentStep < totalSteps) {
      // Track step completion
      trackOnboardingStep(currentStep, steps[currentStep - 1].title)
      setCurrentStep(currentStep + 1)
    } else {
      // Track final step and completion
      trackOnboardingStep(currentStep, steps[currentStep - 1].title)
      trackOnboardingComplete()
      setIsCompleted(true)
      
      // Mark onboarding as completed
      localStorage.setItem('onboarding_completed', 'true')
      setTimeout(() => {
        navigate('/analysis?guided=true&first=true')
      }, 2000)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const skipOnboarding = () => {
    trackOnboardingSkipped(currentStep)
    localStorage.setItem('onboarding_skipped', 'true')
    navigate('/analysis?guided=true')
  }

  const tryExample = (example: typeof sampleTexts[0]) => {
    toast({
      title: `Exemplo: ${example.type}`,
      description: `Este texto tem ${example.confidence}% de probabilidade de ser ${example.type === 'AI Generated' ? 'gerado por IA' : 'escrito por humano'}.`,
    })
  }

  const currentStepData = steps.find(step => step.id === currentStep)

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md mx-auto px-4"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-10 h-10 text-white" />
          </motion.div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Parabéns! 🎉
          </h1>
          
          <p className="text-gray-600 mb-6">
            Você concluiu o tutorial. Agora está pronto para fazer sua primeira análise real!
          </p>
          
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Button
              onClick={() => navigate('/analysis?guided=true&first=true')}
              size="lg"
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Fazer primeira análise
            </Button>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-cyan-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg">
                <span className="text-xl font-bold text-white">TC</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Tutorial Inicial</h1>
                <p className="text-sm text-gray-500">
                  Passo {currentStep} de {totalSteps}
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              onClick={skipOnboarding}
              className="text-gray-500"
            >
              Pular tutorial
            </Button>
          </div>
          
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="shadow-xl">
              <CardContent className="p-8">
                {/* Step Header */}
                <div className="text-center mb-8">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center">
                      {currentStepData?.icon}
                    </div>
                  </div>
                  
                  <Badge variant="outline" className="mb-3">
                    Passo {currentStep} de {totalSteps}
                  </Badge>
                  
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    {currentStepData?.title}
                  </h2>
                  
                  <p className="text-lg text-gray-600">
                    {currentStepData?.subtitle}
                  </p>
                </div>

                {/* Step Content */}
                <div className="space-y-6">
                  <p className="text-gray-700 text-center">
                    {currentStepData?.content.description}
                  </p>

                  {/* Step 1: How it works */}
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      {currentStepData?.content.visual}
                      
                      <div className="grid md:grid-cols-3 gap-4">
                        {currentStepData?.content.features?.map((feature, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="text-center p-4 bg-white rounded-lg border border-gray-100"
                          >
                            <div className="text-2xl mb-2">{feature.icon}</div>
                            <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                            <p className="text-sm text-gray-600">{feature.desc}</p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 2: Try analysis */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div className="text-center mb-6">
                        <Play className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
                        <h3 className="text-xl font-semibold mb-2">Experimente com exemplos</h3>
                        <p className="text-gray-600">Clique nos textos abaixo para ver como funciona a análise</p>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        {sampleTexts.map((example, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => tryExample(example)}
                            className="cursor-pointer border rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <Badge variant={example.type === 'AI Generated' ? 'destructive' : 'secondary'}>
                                {example.type}
                              </Badge>
                              <span className="text-lg font-bold text-gray-700">
                                {example.confidence}%
                              </span>
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                              {example.text}
                            </p>
                            
                            <div className="flex items-center text-indigo-600 text-sm">
                              <Target className="w-4 h-4 mr-1" />
                              Clique para testar
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 3: Interpret results */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      {currentStepData?.content.visual}
                      
                      <div className="grid gap-4">
                        {currentStepData?.content.features?.map((feature, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-start space-x-4 p-4 bg-white rounded-lg border border-gray-100"
                          >
                            <div className="text-2xl">{feature.icon}</div>
                            <div>
                              <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                              <p className="text-sm text-gray-600">{feature.desc}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className="flex items-center"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Anterior
                  </Button>
                  
                  <Button
                    onClick={nextStep}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 flex items-center"
                  >
                    {currentStep === totalSteps ? 'Finalizar' : 'Próximo'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}