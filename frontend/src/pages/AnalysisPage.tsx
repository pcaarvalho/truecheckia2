import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Shield, Zap } from 'lucide-react'
import { AnalysisForm } from '@/components/analysis/AnalysisForm'
import { AnalysisResult } from '@/components/analysis/AnalysisResult'
import type { AnalysisResult as AnalysisResultType } from '@/types/api'

export function AnalysisPage() {
  const [result, setResult] = useState<AnalysisResultType | null>(null)

  const handleAnalysisComplete = (analysisResult: AnalysisResultType) => {
    setResult(analysisResult)
    // Scroll to results
    setTimeout(() => {
      document.getElementById('analysis-result')?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start' 
      })
    }, 100)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Detector de Conteúdo IA
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Descubra se um texto foi escrito por humano ou gerado por Inteligência Artificial com 95% de precisão
          </p>
          
          {/* Features */}
          <div className="flex flex-wrap justify-center gap-6 mt-8">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-5 w-5 text-blue-500" />
              <span>Análise Avançada</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-5 w-5 text-green-500" />
              <span>95% de Precisão</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Zap className="h-5 w-5 text-yellow-500" />
              <span>Resultado Instantâneo</span>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Analysis Form */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 md:p-8"
          >
            <AnalysisForm onAnalysisComplete={handleAnalysisComplete} />
          </motion.div>

          {/* Results */}
          {result && (
            <div id="analysis-result" className="scroll-mt-8">
              <AnalysisResult result={result} />
            </div>
          )}
        </div>

        {/* Tips Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="max-w-4xl mx-auto mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
        >
          <h3 className="font-semibold mb-3">💡 Dicas para melhor análise:</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Use textos com pelo menos 50 palavras para resultados mais precisos</li>
            <li>• Textos mais longos geralmente produzem análises mais confiáveis</li>
            <li>• O sistema detecta padrões comuns em textos gerados por ChatGPT, GPT-4, Claude e outros</li>
            <li>• Resultados podem variar dependendo do tipo e estilo do conteúdo</li>
          </ul>
        </motion.div>
      </div>
    </div>
  )
}

export default AnalysisPage