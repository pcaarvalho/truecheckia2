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

// User types
export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  plan: 'FREE' | 'PRO' | 'ENTERPRISE'
  credits: number
  apiKey?: string
  emailVerified?: boolean
  createdAt: string
  totalAnalyses?: number
  role?: string
}

// Auth types
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
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
  cached?: boolean
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

export interface AnalysisHistory {
  id: string
  text: string
  aiScore: number
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  isAiGenerated: boolean
  wordCount: number
  createdAt: string
}

// Subscription types
export interface Subscription {
  plan: 'FREE' | 'PRO' | 'ENTERPRISE'
  status: string
  currentPeriodEnd?: string
  cancelAtPeriodEnd: boolean
}

export interface CheckoutSession {
  url: string
}

// Stats types
export interface UserStats {
  totalAnalyses: number
  currentMonthAnalyses: number
  averageAiScore: number
  mostDetectedPatterns: string[]
}

// Credits types
export interface UserCredits {
  credits: number
  unlimited: boolean
  daysUntilReset: number | null
}

// Notification types
export interface Notification {
  id: string
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CREDIT_LOW' | 'SUBSCRIPTION' | 'ANALYSIS'
  title: string
  message: string
  read: boolean
  createdAt: string
}