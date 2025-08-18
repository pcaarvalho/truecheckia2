import { motion } from 'framer-motion'
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Download,
  Share2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { AnalysisResult as AnalysisResultType } from '@/types/api'
import analysisService from '@/services/analysis.service'

interface AnalysisResultProps {
  result: AnalysisResultType
}

export function AnalysisResult({ result }: AnalysisResultProps) {
  const scoreInfo = analysisService.formatAiScore(result.aiScore)
  const confidenceInfo = analysisService.formatConfidence(result.confidence)

  const handleDownloadReport = () => {
    // TODO: Implement PDF download
    console.log('Download report')
  }

  const handleShare = () => {
    // TODO: Implement sharing
    console.log('Share result')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Main Score Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Resultado da Análise</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Compartilhar
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadReport}>
                <Download className="h-4 w-4 mr-2" />
                Baixar PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score Circle */}
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative">
              <svg className="h-48 w-48 transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-muted"
                />
                <motion.circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 88}`}
                  strokeDashoffset={`${2 * Math.PI * 88 * (1 - result.aiScore / 100)}`}
                  className={result.aiScore > 70 ? 'text-red-500' : result.aiScore > 40 ? 'text-yellow-500' : 'text-green-500'}
                  initial={{ strokeDashoffset: 2 * Math.PI * 88 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 88 * (1 - result.aiScore / 100) }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold">{result.aiScore}%</span>
                <span className="text-sm text-muted-foreground">Probabilidade IA</span>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <h3 className={`text-2xl font-semibold ${scoreInfo.color}`}>
                {scoreInfo.label}
              </h3>
              <p className="text-muted-foreground mt-2">{scoreInfo.description}</p>
            </div>
          </div>

          <Separator />

          {/* Confidence Badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Nível de Confiança</span>
            <Badge className={`${confidenceInfo.bgColor} ${confidenceInfo.color}`}>
              {confidenceInfo.label}
            </Badge>
          </div>

          {/* Text Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Palavras</span>
              <p className="text-2xl font-semibold">{result.wordCount}</p>
            </div>
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Caracteres</span>
              <p className="text-2xl font-semibold">{result.charCount}</p>
            </div>
          </div>

          {/* Processing Info */}
          {result.cached && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Este resultado foi obtido do cache para economizar recursos.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Detailed Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>Explicação Detalhada</CardTitle>
          <CardDescription>Por que este texto foi classificado assim</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{result.explanation}</p>
        </CardContent>
      </Card>

      {/* Indicators */}
      {result.indicators.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Indicadores Detectados</CardTitle>
            <CardDescription>Padrões que sugerem conteúdo gerado por IA</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {result.indicators.map((indicator, index) => (
                <div key={index} className="flex items-start gap-3">
                  {indicator.severity === 'high' ? (
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  ) : indicator.severity === 'medium' ? (
                    <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  ) : (
                    <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{indicator.description}</p>
                    <Badge variant="outline" className="mt-1">
                      {indicator.severity === 'high' ? 'Alta' : indicator.severity === 'medium' ? 'Média' : 'Baixa'} Severidade
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suspicious Parts */}
      {result.suspiciousParts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Trechos Suspeitos</CardTitle>
            <CardDescription>Partes do texto que parecem ser geradas por IA</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {result.suspiciousParts.map((part, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Trecho {index + 1}</span>
                    <Badge variant="destructive">{part.score}% IA</Badge>
                  </div>
                  <blockquote className="border-l-4 border-destructive pl-4 italic text-sm">
                    "{part.text}"
                  </blockquote>
                  <p className="text-sm text-muted-foreground">{part.reason}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}

export default AnalysisResult