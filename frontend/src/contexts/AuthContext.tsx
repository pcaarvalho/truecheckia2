import React, { createContext, useContext, useEffect, useState } from 'react'
import axiosClient from '@/lib/axios'

interface User {
  id: string
  email: string
  name?: string
  plan?: string
  credits?: number
  role?: string
  emailVerified?: boolean
}

interface LoginResponse {
  success?: boolean
  data?: {
    accessToken: string
    refreshToken: string
    user: User
  }
  accessToken?: string
  refreshToken?: string
  user?: User
}

interface RegisterResponse {
  success?: boolean
  data?: {
    accessToken?: string
    refreshToken?: string
    user?: User
    message?: string
  }
  accessToken?: string
  refreshToken?: string
  user?: User
  message?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: any) => Promise<RegisterResponse | void>
  logout: () => Promise<void>
  updateUser: (user: User) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('[AuthContext] Initializing auth...')
        
        const token = localStorage.getItem('accessToken')
        const savedUserStr = localStorage.getItem('user')
        
        console.log('[AuthContext] Found stored data:', {
          hasToken: !!token,
          hasUser: !!savedUserStr,
          token: token ? `${token.substring(0, 10)}...` : null
        })
        
        if (token && savedUserStr) {
          try {
            const savedUser = JSON.parse(savedUserStr)
            console.log('[AuthContext] Restoring user session:', savedUser)
            setUser(savedUser)
          } catch (e) {
            console.error('[AuthContext] Error parsing saved user:', e)
            localStorage.removeItem('user')
          }
        }
      } catch (error) {
        console.error('[AuthContext] Error initializing auth:', error)
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
      } finally {
        console.log('[AuthContext] Auth initialization complete')
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      console.log('[AuthContext] Starting login for:', email)
      
      const response = await axiosClient.post<LoginResponse>('/auth/login', { email, password })
      
      console.log('[AuthContext] Login response received:', {
        hasSuccess: 'success' in response,
        hasData: 'data' in response,
        response: response
      })
      
      // The axios client returns the full response from backend
      const loginData = response
      
      console.log('[AuthContext] Processing login data:', loginData)
      
      // Extract tokens from the correct structure
      let accessToken, refreshToken, user
      
      if (loginData.data) {
        // Backend returns: { success: true, data: { accessToken, refreshToken, user } }
        accessToken = loginData.data.accessToken
        refreshToken = loginData.data.refreshToken
        user = loginData.data.user
      } else if (loginData.accessToken) {
        // Fallback: tokens are directly in loginData
        accessToken = loginData.accessToken
        refreshToken = loginData.refreshToken
        user = loginData.user
      }
      
      console.log('[AuthContext] Extracted login data:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        hasUser: !!user,
        userEmail: user?.email
      })
      
      if (accessToken && refreshToken && user) {
        console.log('[AuthContext] Login successful, storing tokens and user')
        
        // Store tokens
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        localStorage.setItem('user', JSON.stringify(user))
        
        // Update axios client with new token
        axiosClient.setTokens(accessToken, refreshToken)
        
        // Update state
        setUser(user)
        
        console.log('[AuthContext] Login completed successfully')
      } else {
        console.error('[AuthContext] Invalid login response - missing required fields:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          hasUser: !!user,
          loginData
        })
        throw new Error('Invalid login response - missing tokens or user data')
      }
    } catch (error) {
      console.error('[AuthContext] Login error details:', {
        error,
        message: error?.message,
        code: error?.code,
        statusCode: error?.statusCode
      })
      throw error
    }
  }

  const register = async (data: any) => {
    try {
      console.log('[AuthContext] Starting registration')
      
      const response = await axiosClient.post<RegisterResponse>('/auth/register', data)
      
      console.log('[AuthContext] Register response received:', {
        hasSuccess: 'success' in response,
        hasData: 'data' in response,
        response: response
      })
      
      // The axios client returns the full response from backend
      const registerData = response
      
      console.log('[AuthContext] Processing register data:', registerData)
      
      if (registerData) {
        // Extract tokens from the correct structure
        let accessToken, refreshToken, user
        
        if (registerData.data) {
          // Backend returns: { success: true, data: { accessToken, refreshToken, user } }
          accessToken = registerData.data.accessToken
          refreshToken = registerData.data.refreshToken
          user = registerData.data.user
        } else if (registerData.accessToken) {
          // Fallback: tokens are directly in registerData
          accessToken = registerData.accessToken
          refreshToken = registerData.refreshToken
          user = registerData.user
        }
        
        console.log('[AuthContext] Extracted register data:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          hasUser: !!user,
          userEmail: user?.email
        })
        
        // Auto-login if tokens are returned (soft verification)
        if (accessToken && refreshToken && user) {
          console.log('[AuthContext] Auto-login after registration')
          
          // Store tokens
          localStorage.setItem('accessToken', accessToken)
          localStorage.setItem('refreshToken', refreshToken)
          localStorage.setItem('user', JSON.stringify(user))
          
          // Update axios client with new token
          axiosClient.setTokens(accessToken, refreshToken)
          
          // Update state
          setUser(user)
        }
        
        console.log('[AuthContext] Registration completed successfully')
        return { success: true, data: registerData }
      }
    } catch (error) {
      console.error('[AuthContext] Register error details:', {
        error,
        message: error?.message,
        code: error?.code,
        statusCode: error?.statusCode
      })
      throw error
    }
  }

  const logout = async () => {
    try {
      await axiosClient.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      setUser(null)
    }
  }

  const updateUser = (newUser: User) => {
    setUser(newUser)
    localStorage.setItem('user', JSON.stringify(newUser))
  }

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}