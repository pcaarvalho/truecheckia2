import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'

// Mock environment config
vi.mock('@/config/env', () => ({
  env: {
    apiBaseUrl: 'https://api.truecheckia.com/api',
    isProduction: true,
    isDevelopment: false,
  }
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}))

// Mock window.location
const mockLocation = {
  href: '',
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
}

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
})

describe('GoogleSignInButton', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    mockLocation.href = ''
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<GoogleSignInButton />)

      expect(screen.getByRole('button')).toBeInTheDocument()
      expect(screen.getByText('Continue with Google')).toBeInTheDocument()
      
      // Should have Google icon
      const svg = screen.getByRole('button').querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveClass('w-5', 'h-5')
    })

    it('should render with custom text', () => {
      render(<GoogleSignInButton text="Sign in with Google" />)

      expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
      expect(screen.queryByText('Continue with Google')).not.toBeInTheDocument()
    })
  })

  describe('Click Handling', () => {
    it('should redirect to Google OAuth endpoint on click', async () => {
      render(<GoogleSignInButton />)

      const button = screen.getByRole('button')
      await user.click(button)

      expect(mockLocation.href).toBe('https://api.truecheckia.com/api/auth/google')
    })
  })

  describe('Disabled State', () => {
    it('should render as disabled when disabled prop is true', () => {
      render(<GoogleSignInButton disabled={true} />)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('should not redirect when disabled and clicked', async () => {
      render(<GoogleSignInButton disabled={true} />)

      const button = screen.getByRole('button')
      await user.click(button)

      // Should not have changed location
      expect(mockLocation.href).toBe('')
    })
  })
})