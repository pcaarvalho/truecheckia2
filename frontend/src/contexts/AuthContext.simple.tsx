import React, { createContext, useContext, useState } from 'react'

interface AuthContextType {
  user: any | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: any) => Promise<void>
  logout: () => Promise<void>
  updateUser: (user: any) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      // TODO: Implement login logic
      console.log('Login:', email, password)
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (data: any) => {
    setIsLoading(true)
    try {
      // TODO: Implement register logic
      console.log('Register:', data)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setUser(null)
  }

  const updateUser = (newUser: any) => {
    setUser(newUser)
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