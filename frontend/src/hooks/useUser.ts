import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import userService from '@/services/user.service'
import type { User } from '@/types/api'

export function useUserProfile() {
  const queryClient = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => userService.getProfile(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!localStorage.getItem('accessToken'), // Only run if user is authenticated
  })

  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<Pick<User, 'name' | 'avatar'>>) => 
      userService.updateProfile(data),
    onSuccess: (data) => {
      queryClient.setQueryData(['userProfile'], data)
      queryClient.setQueryData(['currentUser'], data)
      toast.success('Profile updated successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error updating profile')
    },
  })

  return {
    profile,
    isLoading,
    updateProfile: updateProfileMutation.mutate,
    isUpdating: updateProfileMutation.isPending,
  }
}

export function useUserCredits() {
  return useQuery({
    queryKey: ['userCredits'],
    queryFn: () => userService.getCredits(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
    enabled: !!localStorage.getItem('accessToken'), // Only run if user is authenticated
  })
}

export function useApiKey() {
  const queryClient = useQueryClient()

  const generateKeyMutation = useMutation({
    mutationFn: () => userService.generateApiKey(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
      toast.success('API key generated successfully!')
      
      // Copy to clipboard
      navigator.clipboard.writeText(data.apiKey)
      toast.info('Key copied to clipboard')
    },
    onError: (error: any) => {
      if (error.code === 'UNAUTHORIZED') {
        toast.error('Feature available only for Pro and Enterprise plans')
      } else {
        toast.error(error.message || 'Error generating API key')
      }
    },
  })

  const revokeKeyMutation = useMutation({
    mutationFn: () => userService.revokeApiKey(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
      toast.success('API key revoked successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error revoking API key')
    },
  })

  return {
    generateKey: generateKeyMutation.mutate,
    revokeKey: revokeKeyMutation.mutate,
    isGenerating: generateKeyMutation.isPending,
    isRevoking: revokeKeyMutation.isPending,
    generatedKey: generateKeyMutation.data?.apiKey,
  }
}

export default useUserProfile