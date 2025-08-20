import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AuthCallback from '@/pages/AuthCallback'

// Mock dependencies
const mockNavigate = vi.fn()
const mockToast = vi.fn()
const mockUpdateUser = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(window.location.search)]
  }
})

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ updateUser: mockUpdateUser })
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}))

// Helper to render component with router
const renderWithRouter = (searchParams = '') => {
  return render(
    <MemoryRouter initialEntries={[`/auth/callback${searchParams}`]}>
      <AuthCallback />
    </MemoryRouter>
  )
}

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock console.error to avoid noise in tests
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

describe('AuthCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    
    // Mock setTimeout to run immediately in tests
    vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
      if (typeof fn === 'function') {
        fn()
      }
      return 0 as any
    })

    // Mock atob for token decoding
    global.atob = vi.fn().mockImplementation((str) => {
      return JSON.stringify({
        userId: '67314996',
        email: 'test@example.com',
        role: 'USER',
        plan: 'FREE',
        iat: 1734161640,
        exp: 1734766440
      })
    })

    // Setup window.location for search params
    Object.defineProperty(window, 'location', {
      value: {
        search: '',
        href: 'http://localhost:3000/auth/callback',
      },
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    consoleErrorSpy.mockClear()
  })

  describe('Successful OAuth Flow', () => {
    it('should handle successful OAuth callback with tokens', async () => {
      const mockAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzMxNDk5NiIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJVU0VSIiwicGxhbiI6IkZSRUUiLCJpYXQiOjE3MzQxNjE2NDAsImV4cCI6MTczNDc2NjQ0MH0.signature'
      const mockRefreshToken = 'refresh-token-123'

      window.location.search = `?accessToken=${mockAccessToken}&refreshToken=${mockRefreshToken}`

      renderWithRouter(`?accessToken=${mockAccessToken}&refreshToken=${mockRefreshToken}`)

      await waitFor(() => {
        expect(screen.getByText('Success!')).toBeInTheDocument()
      }, { timeout: 1000 })

      expect(screen.getByText('Successfully signed in with Google!')).toBeInTheDocument()

      // Verify tokens are stored
      expect(localStorageMock.setItem).toHaveBeenCalledWith('accessToken', mockAccessToken)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', mockRefreshToken)

      // Verify navigation to dashboard
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  describe('OAuth Error Handling', () => {
    it('should handle auth_failed error', async () => {
      window.location.search = '?error=auth_failed'

      renderWithRouter('?error=auth_failed')

      await waitFor(() => {
        expect(screen.getByText('Authentication Failed')).toBeInTheDocument()
      }, { timeout: 1000 })

      expect(screen.getByText('Google authentication failed. Please try again.')).toBeInTheDocument()

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Authentication Failed',
        description: 'Google authentication failed. Please try again.',
        variant: 'destructive',
      })

      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })

    it('should handle missing tokens', async () => {
      window.location.search = ''

      renderWithRouter('')

      await waitFor(() => {
        expect(screen.getByText('Authentication Failed')).toBeInTheDocument()
      }, { timeout: 1000 })

      expect(screen.getByText('No authentication tokens received')).toBeInTheDocument()
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  describe('User Interface', () => {
    it('should display TrueCheckIA branding', () => {
      renderWithRouter()

      // Should show TC logo
      expect(screen.getByText('TC')).toBeInTheDocument()
    })
  })
})