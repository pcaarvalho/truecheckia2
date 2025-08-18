import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Send, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAnalysis } from '@/hooks/useAnalysis'
import { useUserCredits } from '@/hooks/useUser'
import analysisService from '@/services/analysis.service'
import { CreditGuard, useCredits } from '@/components/credits'

const analysisSchema = z.object({
  text: z.string().min(50, 'Text must have at least 50 characters').max(10000, 'Text too long'),
  language: z.enum(['pt', 'en']).default('pt'),
})

type AnalysisFormData = z.infer<typeof analysisSchema>

interface AnalysisFormProps {
  onAnalysisComplete?: (result: unknown) => void
}

export function AnalysisForm({ onAnalysisComplete }: AnalysisFormProps) {
  const [textMetrics, setTextMetrics] = useState<{
    wordCount: number;
    charCount: number;
  } | null>(null)
  const { analyze, isAnalyzing, analysisResult } = useAnalysis()
  const { data: credits } = useUserCredits()
  const { canPerformAnalysis, consumeCredit } = useCredits()
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AnalysisFormData>({
    resolver: zodResolver(analysisSchema),
    defaultValues: {
      language: 'pt',
    },
  })

  const watchText = watch('text')

  // Calculate text metrics in real-time
  useState(() => {
    if (watchText) {
      const metrics = analysisService.calculateTextMetrics(watchText)
      setTextMetrics(metrics)
    }
  }, [watchText])

  const onSubmit = async (data: AnalysisFormData) => {
    const { canAnalyze } = canPerformAnalysis()
    if (!canAnalyze) {
      return // CreditGuard will handle this
    }
    
    analyze(data, {
      onSuccess: async (result) => {
        // Consume credit after successful analysis
        await consumeCredit()
        
        if (onAnalysisComplete) {
          onAnalysisComplete(result)
        }
      },
    })
  }

  const hasCredits = credits?.unlimited || (credits?.credits ?? 0) > 0

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="text">Text for Analysis</Label>
          {textMetrics && (
            <div className="text-sm text-muted-foreground">
              {textMetrics.wordCount} words • {textMetrics.charCount} characters
            </div>
          )}
        </div>
        
        <Textarea
          id="text"
          {...register('text')}
          placeholder="Paste or type the text you want to analyze..."
          className="min-h-[300px] resize-none font-mono text-sm"
          disabled={isAnalyzing}
        />
        
        {errors.text && (
          <p className="text-sm text-destructive">{errors.text.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="language">Language</Label>
        <Select
          value={watch('language')}
          onValueChange={(value: 'pt' | 'en') => setValue('language', value)}
          disabled={isAnalyzing}
        >
          <SelectTrigger id="language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pt">Portuguese</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!hasCredits && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have available credits. Upgrade to continue analyzing.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {credits?.unlimited ? (
            <span className="text-green-600 font-medium">Unlimited analyses</span>
          ) : (
            <span>
              {credits?.credits || 0} credits remaining
            </span>
          )}
        </div>

        <CreditGuard action="analysis">
          <Button
            type="submit"
            disabled={isAnalyzing || !hasCredits}
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Analyze Text
              </>
            )}
          </Button>
        </CreditGuard>
      </div>
    </form>
  )
}

export default AnalysisForm