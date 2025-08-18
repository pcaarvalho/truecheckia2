import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import authService from '@/services/auth.service'
import type { LoginRequest, RegisterRequest, User } from '@/types/api'

export function useAuth() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Get current user
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => {
      const user = authService.getCurrentUser()
      if (!user && authService.isAuthenticated()) {
        return authService.getCurrentUser()
      }
      return user
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginRequest) => authService.login(credentials),
    onSuccess: (data) => {
      queryClient.setQueryData(['currentUser'], data.user)
      toast.success('Login realizado com sucesso!')
      navigate('/dashboard')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao fazer login')
    },
  })

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => authService.register(data),
    onSuccess: (data) => {
      queryClient.setQueryData(['currentUser'], data.user)
      toast.success('Conta criada com sucesso!')
      navigate('/dashboard')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar conta')
    },
  })

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      queryClient.clear()
      toast.success('Logout realizado com sucesso')
      navigate('/login')
    },
  })

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  }
}

export default useAuth