import api from '@/lib/api'
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
} from '@/types/api'

class AuthService {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials)
    
    if (response.data) {
      api.setToken(response.data.accessToken)
      localStorage.setItem('refreshToken', response.data.refreshToken)
      localStorage.setItem('user', JSON.stringify(response.data.user))
    }
    
    return response.data!
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data)
    
    if (response.data) {
      api.setToken(response.data.accessToken)
      localStorage.setItem('refreshToken', response.data.refreshToken)
      localStorage.setItem('user', JSON.stringify(response.data.user))
    }
    
    return response.data!
  }

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      api.clearToken()
      localStorage.removeItem('user')
    }
  }

  async refreshToken(): Promise<string> {
    return api.refreshAccessToken()
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user')
    if (!userStr) return null
    
    try {
      return JSON.parse(userStr) as User
    } catch {
      return null
    }
  }

  isAuthenticated(): boolean {
    return !!api.getToken() && !!this.getCurrentUser()
  }
}

export const authService = new AuthService()
export default authService