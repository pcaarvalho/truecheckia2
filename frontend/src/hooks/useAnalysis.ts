import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import analysisService from '@/services/analysis.service'
import type { AnalysisRequest } from '@/types/api'

export function useAnalysis() {
  const queryClient = useQueryClient()

  // Analyze text mutation
  const analyzeMutation = useMutation({
    mutationFn: (data: AnalysisRequest) => analysisService.analyzeText(data),
    onSuccess: (data) => {
      // Invalidate history to include new analysis
      queryClient.invalidateQueries({ queryKey: ['analysisHistory'] })
      queryClient.invalidateQueries({ queryKey: ['analysisStats'] })
      queryClient.invalidateQueries({ queryKey: ['userCredits'] })
      
      // Show success message based on result
      if (data.isAiGenerated) {
        toast.warning(`Texto detectado como IA (${data.aiScore}% de probabilidade)`)
      } else {
        toast.success(`Texto parece ser humano (${data.aiScore}% de probabilidade de IA)`)
      }
    },
    onError: (error: any) => {
      if (error.code === 'INSUFFICIENT_CREDITS') {
        toast.error('Créditos insuficientes. Faça upgrade para continuar.')
      } else {
        toast.error(error.message || 'Erro ao analisar texto')
      }
    },
  })

  return {
    analyze: analyzeMutation.mutate,
    isAnalyzing: analyzeMutation.isPending,
    analysisResult: analyzeMutation.data,
    analysisError: analyzeMutation.error,
  }
}

export function useAnalysisHistory(page = 1, limit = 10) {
  return useQuery({
    queryKey: ['analysisHistory', page, limit],
    queryFn: () => analysisService.getHistory(page, limit),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

export function useAnalysisDetails(id: string) {
  return useQuery({
    queryKey: ['analysis', id],
    queryFn: () => analysisService.getAnalysis(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

export function useAnalysisStats() {
  return useQuery({
    queryKey: ['analysisStats'],
    queryFn: () => analysisService.getStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export default useAnalysis