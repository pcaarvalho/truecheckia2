import { z } from 'zod'

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
})

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
})

// Analysis schemas
export const analyzeTextSchema = z.object({
  text: z.string().min(50, 'Texto deve ter no mínimo 50 caracteres').max(10000, 'Texto muito longo'),
  language: z.enum(['pt', 'en']).optional().default('pt'),
})

export const analysisResultSchema = z.object({
  id: z.string(),
  aiScore: z.number().min(0).max(100),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  isAiGenerated: z.boolean(),
  indicators: z.array(z.object({
    type: z.string(),
    description: z.string(),
    severity: z.enum(['high', 'medium', 'low']),
  })),
  explanation: z.string(),
  suspiciousParts: z.array(z.object({
    text: z.string(),
    score: z.number(),
    reason: z.string(),
  })),
})

// User schemas
export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  avatar: z.string().url().optional(),
})

// Subscription schemas
export const createCheckoutSchema = z.object({
  priceId: z.string(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
})

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    page?: number
    limit?: number
    total?: number
  }
}

// JWT Payload
export interface JWTPayload {
  userId: string
  email: string
  role: 'USER' | 'ADMIN'
  plan: 'FREE' | 'PRO' | 'ENTERPRISE'
}

// Analysis types
export interface AnalysisRequest {
  text: string
  language?: 'pt' | 'en'
}

export interface AnalysisResult {
  id: string
  aiScore: number
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  isAiGenerated: boolean
  indicators: Indicator[]
  explanation: string
  suspiciousParts: SuspiciousPart[]
  processingTime: number
  wordCount: number
  charCount: number
}

export interface Indicator {
  type: string
  description: string
  severity: 'high' | 'medium' | 'low'
}

export interface SuspiciousPart {
  text: string
  score: number
  reason: string
  startIndex?: number
  endIndex?: number
}

// OpenAI Analysis Response
export interface OpenAIAnalysisResponse {
  score: number
  confidence: 'high' | 'medium' | 'low'
  main_indicators: string[]
  explanation: string
  suspicious_parts: Array<{
    text: string
    reason: string
    score: number
  }>
}

// User types
export interface UserProfile {
  id: string
  email: string
  name?: string
  avatar?: string
  plan: 'FREE' | 'PRO' | 'ENTERPRISE'
  credits: number
  apiKey?: string
  createdAt: Date
}

// Subscription types
export interface SubscriptionInfo {
  id: string
  plan: 'FREE' | 'PRO' | 'ENTERPRISE'
  status: string
  currentPeriodEnd?: Date
  cancelAtPeriodEnd: boolean
}

// Stats types
export interface UserStats {
  totalAnalyses: number
  currentMonthAnalyses: number
  averageAiScore: number
  mostDetectedPatterns: string[]
}

// Type guards
export const isApiError = (error: any): error is ApiResponse => {
  return error && typeof error === 'object' && 'success' in error && error.success === false
}

// Export all schemas for validation
export const schemas = {
  auth: {
    login: loginSchema,
    register: registerSchema,
    refreshToken: refreshTokenSchema,
  },
  analysis: {
    analyzeText: analyzeTextSchema,
    result: analysisResultSchema,
  },
  user: {
    updateProfile: updateProfileSchema,
  },
  subscription: {
    createCheckout: createCheckoutSchema,
  },
}

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type AnalyzeTextInput = z.infer<typeof analyzeTextSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>