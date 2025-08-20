import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import App from './App'
import './index.css'
import { env, validateEnvironment } from '@/config/env'
import './utils/environment-validator' // Executa validação automática

// Validate environment configuration
validateEnvironment()

// Ensure dark mode is applied
document.documentElement.classList.add('dark');

// Set theme color for mobile browsers
const themeColorMeta = document.querySelector('meta[name="theme-color"]')
if (themeColorMeta) {
  themeColorMeta.setAttribute('content', '#8B5CF6')
}

// Performance optimization: Preconnect to API domain
if (env.isProduction) {
  const apiDomain = new URL(env.apiBaseUrl).origin
  const preconnectLink = document.createElement('link')
  preconnectLink.rel = 'preconnect'
  preconnectLink.href = apiDomain
  document.head.appendChild(preconnectLink)
  
  const dnsPrefetchLink = document.createElement('link')
  dnsPrefetchLink.rel = 'dns-prefetch'
  dnsPrefetchLink.href = apiDomain
  document.head.appendChild(dnsPrefetchLink)
}

// Disable React DevTools in production
if (env.isProduction && typeof window !== 'undefined') {
  (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    isDisabled: true,
    supportsFiber: true,
    inject: () => {},
    onCommitFiberRoot: () => {},
    onCommitFiberUnmount: () => {},
  }
}

// Initialize root with proper configuration
const container = document.getElementById('root')
if (!container) {
  throw new Error('Root element not found')
}

const root = createRoot(container, {
  // Enable Concurrent Features in production
  identifierPrefix: env.isProduction ? 'tc-' : undefined,
})

// Render app with StrictMode in development
if (env.isDevelopment) {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  )
} else {
  root.render(<App />)
}

// Log app initialization
if (env.isDevelopment) {
  console.log(
    `%cTrueCheckIA %cv${env.version}`,
    'color: #8B5CF6; font-weight: bold; font-size: 16px;',
    'color: #666; font-size: 12px;'
  )
  console.log('Environment:', env.environment)
  console.log('Build Date:', env.buildDate)
}