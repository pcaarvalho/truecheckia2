// Este arquivo agora usa o cliente Axios centralizado
import axiosClient, { ApiError } from './axios'
import { ApiResponse } from '@/types/api'

// Classe de API simplificada que usa o axiosClient
class Api {
  // Métodos de autenticação
  setToken(accessToken: string, refreshToken?: string) {
    axiosClient.setTokens(accessToken, refreshToken)
  }

  getToken() {
    return localStorage.getItem('accessToken')
  }

  clearToken() {
    axiosClient.clearTokens()
  }

  // GET request
  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    return axiosClient.get<T>(endpoint, { params })
  }

  // POST request
  async post<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return axiosClient.post<T>(endpoint, body)
  }

  // PUT request
  async put<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return axiosClient.put<T>(endpoint, body)
  }

  // PATCH request
  async patch<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return axiosClient.patch<T>(endpoint, body)
  }

  // DELETE request
  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return axiosClient.delete<T>(endpoint)
  }

  // Upload files
  async upload<T = any>(
    endpoint: string,
    formData: FormData,
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<ApiResponse<T>> {
    return axiosClient.upload<T>(endpoint, formData, onUploadProgress)
  }

  // Refresh token (handled automatically by axios interceptor)
  async refreshAccessToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) {
      throw new ApiError('NO_REFRESH_TOKEN', 'No refresh token available', 401)
    }

    const response = await this.post<{ accessToken: string }>('/auth/refresh', {
      refreshToken,
    })

    if (response.data?.accessToken) {
      this.setToken(response.data.accessToken)
      return response.data.accessToken
    }

    throw new ApiError('REFRESH_FAILED', 'Failed to refresh token', 401)
  }
}

// Export both the Api class instance and the ApiError class
export { ApiError }
export const api = new Api()
export default api