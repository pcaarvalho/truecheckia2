import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import axiosClient from '@/lib/axios'
import api from '@/lib/api'
import { env } from '@/config/env'
import DebugAPI from '@/components/DebugAPI'
import GoogleSignInButton from '@/components/auth/GoogleSignInButton'

export default function TestAPI() {
  const [results, setResults] = useState<any>({})
  const [loading, setLoading] = useState(false)

  const testHealth = async () => {
    try {
      // Usa a configuração centralizada para construir a URL de health
      const healthUrl = env.apiBaseUrl.replace('/api', '/health')
      const response = await fetch(healthUrl)
      const data = await response.json()
      setResults(prev => ({ ...prev, health: data }))
    } catch (error: any) {
      setResults(prev => ({ ...prev, health: { error: error.message } }))
    }
  }

  const testLogin = async () => {
    setLoading(true)
    try {
      const response = await axiosClient.post('/auth/login', {
        email: 'test@example.com',
        password: 'password123'
      })
      setResults(prev => ({ ...prev, login: response }))
    } catch (error: any) {
      setResults(prev => ({ ...prev, login: { 
        error: error.message,
        code: error.code,
        status: error.statusCode,
        details: error.details
      }}))
    } finally {
      setLoading(false)
    }
  }

  const testRegister = async () => {
    setLoading(true)
    const testEmail = `test${Date.now()}@example.com`
    
    try {
      console.log('[TestAPI] Starting register test with:', {
        email: testEmail,
        password: 'TestPass123',
        name: 'Test User Debug'
      })
      
      const response = await axiosClient.post('/auth/register', {
        email: testEmail,
        password: 'TestPass123',
        name: 'Test User Debug'
      })
      
      console.log('[TestAPI] Register response received:', response)
      
      // Extract tokens like the actual Register.tsx does
      let accessToken, refreshToken, user
      
      if (response.data && response.data.data) {
        accessToken = response.data.data.accessToken
        refreshToken = response.data.data.refreshToken
        user = response.data.data.user
      } else if (response.data) {
        accessToken = response.data.accessToken || response.accessToken
        refreshToken = response.data.refreshToken || response.refreshToken
        user = response.data.user || response.user
      } else {
        accessToken = response.accessToken
        refreshToken = response.refreshToken
        user = response.user
      }
      
      setResults(prev => ({ ...prev, register: {
        success: true,
        fullResponse: response,
        extractedData: {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          hasUser: !!user,
          userEmail: user?.email,
          userPlan: user?.plan,
          userCredits: user?.credits
        },
        tokens: {
          accessToken: accessToken ? accessToken.substring(0, 20) + '...' : null,
          refreshToken: refreshToken ? refreshToken.substring(0, 20) + '...' : null
        }
      }}))
    } catch (error: any) {
      console.error('[TestAPI] Register error:', error)
      
      setResults(prev => ({ ...prev, register: { 
        success: false,
        error: error.message,
        code: error.code,
        status: error.statusCode,
        details: error.details,
        fullError: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          response: error.response ? {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
            headers: error.response.headers
          } : null
        }
      }}))
    } finally {
      setLoading(false)
    }
  }

  const testRegisterReal = async () => {
    setLoading(true)
    const testEmail = `real${Date.now()}@example.com`
    
    try {
      console.log('[TestAPI Real] Starting register test with api client:', {
        email: testEmail,
        password: 'TestPass123',
        name: 'Real Flow Test'
      })
      
      // Use the same api client as Register.tsx
      const response = await api.post('/auth/register', {
        email: testEmail,
        password: 'TestPass123',
        name: 'Real Flow Test'
      })
      
      console.log('[TestAPI Real] Register response received:', response)
      
      // Extract tokens exactly like Register.tsx does
      let accessToken, refreshToken, user
      
      if (response.data && response.data.data) {
        console.log('[TestAPI Real] Using nested data format')
        accessToken = response.data.data.accessToken
        refreshToken = response.data.data.refreshToken
        user = response.data.data.user
      } else if (response.data) {
        console.log('[TestAPI Real] Using direct data format')
        accessToken = response.data.accessToken || response.accessToken
        refreshToken = response.data.refreshToken || response.refreshToken
        user = response.data.user || response.user
      } else {
        console.log('[TestAPI Real] Using response direct format')
        accessToken = response.accessToken
        refreshToken = response.refreshToken
        user = response.user
      }
      
      console.log('[TestAPI Real] Extracted tokens:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        hasUser: !!user,
        userEmail: user?.email
      })
      
      setResults(prev => ({ ...prev, registerReal: {
        success: true,
        wouldRedirect: !!(accessToken && refreshToken && user),
        fullResponse: response,
        extractedData: {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          hasUser: !!user,
          userEmail: user?.email,
          userPlan: user?.plan,
          userCredits: user?.credits
        },
        tokens: {
          accessToken: accessToken ? accessToken.substring(0, 20) + '...' : null,
          refreshToken: refreshToken ? refreshToken.substring(0, 20) + '...' : null
        }
      }}))
    } catch (error: any) {
      console.error('[TestAPI Real] Register error:', error)
      
      setResults(prev => ({ ...prev, registerReal: { 
        success: false,
        error: error.message,
        code: error.code,
        status: error.statusCode,
        details: error.details,
        fullError: {
          name: error.name,
          message: error.message,
          response: error.response ? {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data
          } : null
        }
      }}))
    } finally {
      setLoading(false)
    }
  }

  const clearResults = () => {
    setResults({})
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">API Test & Debug Page</h1>
        
        {/* Debug API Component */}
        <div className="mb-8">
          <DebugAPI />
        </div>
        
        {/* Google OAuth Test */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Google OAuth Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Click the button below to test Google OAuth. Check the browser console for debug logs.
              </p>
              <GoogleSignInButton text="Test Google OAuth" />
              <div className="text-xs text-gray-500">
                <p><strong>Expected URL:</strong> {window.location.origin}/api/auth/google</p>
                <p><strong>Environment:</strong> {env.environment}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-x-4">
            <Button onClick={testHealth}>Test Health</Button>
            <Button onClick={testLogin} disabled={loading}>Test Login</Button>
            <Button onClick={testRegister} disabled={loading}>Test Register (Debug)</Button>
            <Button onClick={testRegisterReal} disabled={loading}>Test Register (Real Flow)</Button>
            <Button variant="outline" onClick={clearResults}>Clear Results</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Legacy API Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(results, null, 2)}
            </pre>
            
            <div className="mt-4 text-sm text-gray-600">
              <p>API Base URL: {env.apiBaseUrl}</p>
              <p>Environment: {env.environment}</p>
              <p>Version: {env.version}</p>
              <p>Build Date: {env.buildDate}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}