import api from '@/lib/api'
import type {
  AnalysisRequest,
  AnalysisResult,
  AnalysisHistory,
  UserStats,
} from '@/types/api'

class AnalysisService {
  async analyzeText(data: AnalysisRequest): Promise<AnalysisResult> {
    const response = await api.post<AnalysisResult>('/analysis/check', data)
    return response.data!
  }

  async getHistory(page = 1, limit = 10): Promise<{
    analyses: AnalysisHistory[]
    total: number
  }> {
    const response = await api.get<AnalysisHistory[]>('/analysis/history', {
      page,
      limit,
    })
    
    return {
      analyses: response.data || [],
      total: response.meta?.total || 0,
    }
  }

  async getAnalysis(id: string): Promise<AnalysisResult> {
    const response = await api.get<AnalysisResult>(`/analysis/${id}`)
    return response.data!
  }

  async getStats(): Promise<UserStats> {
    const response = await api.get<UserStats>('/analysis/stats/summary')
    return response.data!
  }

  // Helper function to calculate text metrics
  calculateTextMetrics(text: string) {
    const words = text.trim().split(/\s+/).filter(Boolean)
    const sentences = text.split(/[.!?]+/).filter(Boolean)
    const paragraphs = text.split(/\n\n+/).filter(Boolean)
    
    return {
      wordCount: words.length,
      charCount: text.length,
      sentenceCount: sentences.length,
      paragraphCount: paragraphs.length,
      avgWordsPerSentence: sentences.length > 0 
        ? Math.round(words.length / sentences.length) 
        : 0,
    }
  }

  // Format confidence level for display
  formatConfidence(confidence: 'HIGH' | 'MEDIUM' | 'LOW'): {
    label: string
    color: string
    bgColor: string
  } {
    const map = {
      HIGH: {
        label: 'High Confidence',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
      },
      MEDIUM: {
        label: 'Medium Confidence',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
      },
      LOW: {
        label: 'Low Confidence',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
      },
    }
    
    return map[confidence]
  }

  // Format AI score for display
  formatAiScore(score: number): {
    label: string
    description: string
    color: string
  } {
    if (score >= 80) {
      return {
        label: 'Very Likely AI',
        description: 'This text has a high probability of being AI-generated',
        color: 'text-red-600',
      }
    } else if (score >= 60) {
      return {
        label: 'Likely AI',
        description: 'This text shows characteristics of AI-generated content',
        color: 'text-orange-600',
      }
    } else if (score >= 40) {
      return {
        label: 'Uncertain',
        description: 'Unable to determine the origin of the text with certainty',
        color: 'text-yellow-600',
      }
    } else if (score >= 20) {
      return {
        label: 'Likely Human',
        description: 'This text appears to have been written by a human',
        color: 'text-blue-600',
      }
    } else {
      return {
        label: 'Very Likely Human',
        description: 'This text has a high probability of being written by a human',
        color: 'text-green-600',
      }
    }
  }
}

export const analysisService = new AnalysisService()
export default analysisService