import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { env } from '@/config/env'

// Interface para erros da API
export interface ApiErrorResponse {
  error: {
    code: string
    message: string
    details?: any
  }
}

// Classe personalizada para erros da API
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

class AxiosClient {
  private instance: AxiosInstance
  private refreshTokenPromise: Promise<string> | null = null

  constructor() {
    // Usa a configuração centralizada de ambiente
    const baseURL = env.apiBaseUrl
    
    console.log('[AxiosClient] Initializing with baseURL:', baseURL)

    this.instance = axios.create({
      baseURL,
      timeout: 30000, // 30 segundos
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Importante para cookies/credentials
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor - adiciona token de autenticação
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getAccessToken()
        
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`
        }

        // Log para debug em desenvolvimento
        if (import.meta.env.DEV) {
          console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
            params: config.params,
            data: config.data,
          })
        }

        return config
      },
      (error) => {
        console.error('[API Request Error]', error)
        return Promise.reject(error)
      }
    )

    // Response interceptor - trata erros e refresh token
    this.instance.interceptors.response.use(
      (response) => {
        if (import.meta.env.DEV) {
          console.log(`[API Response Interceptor] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            status: response.status,
            hasSuccess: response.data && 'success' in response.data
          })
        }
        
        return response
      },
      async (error: AxiosError<ApiErrorResponse>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

        // Log de erro detalhado em desenvolvimento
        if (import.meta.env.DEV) {
          console.error(`[API Error] ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`, {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message,
            stack: error.stack,
            headers: error.response?.headers,
          })
        }

        // Se o erro for 401 e não for uma tentativa de refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          // Evita múltiplas tentativas de refresh
          if (originalRequest.url?.includes('/auth/refresh')) {
            this.clearTokens()
            window.location.href = '/login'
            return Promise.reject(error)
          }

          originalRequest._retry = true

          try {
            // Se já existe uma promise de refresh em andamento, aguarda
            if (this.refreshTokenPromise) {
              await this.refreshTokenPromise
            } else {
              // Inicia o refresh
              this.refreshTokenPromise = this.refreshAccessToken()
              await this.refreshTokenPromise
              this.refreshTokenPromise = null
            }

            // Retry da requisição original com o novo token
            return this.instance(originalRequest)
          } catch (refreshError) {
            // Refresh falhou, redireciona para login
            this.clearTokens()
            window.location.href = '/login'
            return Promise.reject(refreshError)
          }
        }

        // Transforma o erro em ApiError padronizado
        if (error.response?.data?.error) {
          const apiError = new ApiError(
            error.response.data.error.code || 'UNKNOWN_ERROR',
            error.response.data.error.message || 'Um erro ocorreu',
            error.response.status,
            error.response.data.error.details
          )
          return Promise.reject(apiError)
        }
        
        // Trata erros HTTP específicos sem estrutura de erro padrão
        if (error.response) {
          const status = error.response.status
          let message = 'Um erro ocorreu'
          let code = 'HTTP_ERROR'
          
          switch (status) {
            case 409:
              message = error.response.data?.message || 'Conflito: recurso já existe'
              code = 'CONFLICT'
              break
            case 429:
              message = 'Muitas requisições. Tente novamente em alguns instantes.'
              code = 'RATE_LIMIT'
              break
            case 400:
              message = error.response.data?.message || 'Dados inválidos'
              code = 'BAD_REQUEST'
              break
            case 401:
              message = 'Não autorizado'
              code = 'UNAUTHORIZED'
              break
            case 403:
              message = 'Acesso negado'
              code = 'FORBIDDEN'
              break
            case 404:
              message = 'Recurso não encontrado'
              code = 'NOT_FOUND'
              break
            case 500:
              message = 'Erro interno do servidor'
              code = 'INTERNAL_ERROR'
              break
            default:
              message = error.response.data?.message || `Erro HTTP ${status}`
              code = `HTTP_${status}`
          }
          
          const apiError = new ApiError(
            code,
            message,
            status,
            error.response.data
          )
          return Promise.reject(apiError)
        }

        // Erro de rede ou timeout
        if (!error.response) {
          const networkError = new ApiError(
            'NETWORK_ERROR',
            'Erro de conexão com o servidor. Verifique sua internet.',
            0
          )
          return Promise.reject(networkError)
        }

        return Promise.reject(error)
      }
    )
  }

  // Métodos de gerenciamento de tokens
  private getAccessToken(): string | null {
    return localStorage.getItem('accessToken')
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken')
  }

  setTokens(accessToken: string, refreshToken?: string) {
    localStorage.setItem('accessToken', accessToken)
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken)
    }
  }

  clearTokens() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }

  private async refreshAccessToken(): Promise<string> {
    const refreshToken = this.getRefreshToken()
    
    if (!refreshToken) {
      throw new ApiError('NO_REFRESH_TOKEN', 'Token de refresh não encontrado', 401)
    }

    try {
      const response = await this.instance.post<{ data: { accessToken: string } }>('/auth/refresh', {
        refreshToken,
      })

      const newAccessToken = response.data.data.accessToken
      this.setTokens(newAccessToken)
      return newAccessToken
    } catch (error) {
      console.error('[Refresh Token Failed]', error)
      throw error
    }
  }

  // Métodos públicos para fazer requisições
  async get<T = any>(url: string, config?: any) {
    const response = await this.instance.get<{ data: T }>(url, config)
    return response.data
  }

  async post<T = any>(url: string, data?: any, config?: any) {
    if (import.meta.env.DEV) {
      console.log(`[AxiosClient] POST ${url} - Starting request`)
    }
    
    const response = await this.instance.post<{ data: T }>(url, data, config)
    
    if (import.meta.env.DEV) {
      console.log(`[AxiosClient] POST ${url} - Success`, {
        status: response.status,
        hasSuccess: 'success' in (response.data || {}),
        hasData: 'data' in (response.data || {})
      })
    }
    
    return response.data
  }

  async put<T = any>(url: string, data?: any, config?: any) {
    const response = await this.instance.put<{ data: T }>(url, data, config)
    return response.data
  }

  async patch<T = any>(url: string, data?: any, config?: any) {
    const response = await this.instance.patch<{ data: T }>(url, data, config)
    return response.data
  }

  async delete<T = any>(url: string, config?: any) {
    const response = await this.instance.delete<{ data: T }>(url, config)
    return response.data
  }

  // Método para upload de arquivos
  async upload<T = any>(url: string, formData: FormData, onUploadProgress?: (progressEvent: any) => void) {
    const response = await this.instance.post<{ data: T }>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    })
    return response.data
  }

  // Expor a instância do axios para casos especiais
  getAxiosInstance() {
    return this.instance
  }
}

// Exporta uma única instância (Singleton)
const axiosClient = new AxiosClient()

export default axiosClient