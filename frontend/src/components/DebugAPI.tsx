import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { env } from '@/config/env'

interface TestResult {
  endpoint: string
  status: 'loading' | 'success' | 'error'
  data?: any
  error?: string
  timestamp: string
}

export function DebugAPI() {
  const [results, setResults] = useState<TestResult[]>([])

  const endpoints = [
    { name: 'Health Check', path: '/health', method: 'GET' },
    { name: 'Auth Status', path: '/auth/status', method: 'GET' },
    { name: 'Google Auth', path: '/auth/google', method: 'GET', expectRedirect: true },
    { name: 'User Profile', path: '/user/profile', method: 'GET', needsAuth: true },
    { name: 'Register Test', path: '/auth/register', method: 'POST', body: { email: 'test@test.com', password: 'test123', name: 'Test' } },
  ]

  const testEndpoint = async (endpointConfig: any) => {
    const { path, method = 'GET', body, expectRedirect = false } = endpointConfig
    const fullUrl = `${env.apiBaseUrl}${path}`
    const timestamp = new Date().toLocaleTimeString()
    
    console.log(`[DebugAPI] Testing ${method} ${fullUrl}`, body ? { body } : '')
    
    setResults(prev => [...prev, {
      endpoint: fullUrl,
      status: 'loading',
      timestamp
    }])

    try {
      const fetchOptions: RequestInit = {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        redirect: expectRedirect ? 'manual' : 'follow'
      }
      
      if (body && method !== 'GET') {
        fetchOptions.body = JSON.stringify(body)
      }

      const response = await fetch(fullUrl, fetchOptions)

      let data: any
      const contentType = response.headers.get('content-type')
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        data = await response.text()
      }

      const isSuccess = expectRedirect 
        ? response.status === 302 || response.status === 301
        : response.ok

      setResults(prev => prev.map(result => 
        result.endpoint === fullUrl && result.timestamp === timestamp
          ? {
              ...result,
              status: isSuccess ? 'success' : 'error',
              data: {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                body: data,
                redirected: response.redirected,
                url: response.url
              },
              error: isSuccess ? undefined : `HTTP ${response.status}: ${response.statusText}`
            }
          : result
      ))
    } catch (error) {
      console.error(`[DebugAPI] Error testing ${fullUrl}:`, error)
      setResults(prev => prev.map(result => 
        result.endpoint === fullUrl && result.timestamp === timestamp
          ? {
              ...result,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          : result
      ))
    }
  }

  const clearResults = () => setResults([])

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>API Debug Tool</CardTitle>
        <div className="space-y-2 text-sm text-gray-600">
          <div><strong>Environment:</strong> {env.environment}</div>
          <div><strong>API Base URL:</strong> {env.apiBaseUrl}</div>
          <div><strong>App URL:</strong> {env.appUrl}</div>
          <div><strong>Is Production:</strong> {env.isProduction ? 'Yes' : 'No'}</div>
          <div><strong>Version:</strong> {env.version}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {endpoints.map((endpoint) => (
              <Button
                key={endpoint.path}
                onClick={() => testEndpoint(endpoint)}
                variant="outline"
                size="sm"
                className={endpoint.expectRedirect ? 'border-blue-300' : endpoint.needsAuth ? 'border-orange-300' : ''}
              >
                Test {endpoint.name}
                {endpoint.expectRedirect && ' (302)'}
                {endpoint.needsAuth && ' (Auth)'}
              </Button>
            ))}
          </div>
          
          <div className="flex gap-2">
            <Button onClick={clearResults} variant="secondary" size="sm">
              Clear Results
            </Button>
            <Button 
              onClick={() => {
                console.log('[DebugAPI] Environment Check:')
                console.log('Current environment:', env.environment)
                console.log('API Base URL:', env.apiBaseUrl)
                console.log('App URL:', env.appUrl)
                console.log('Is Production:', env.isProduction)
                console.log('Window location:', window.location.href)
              }} 
              variant="outline" 
              size="sm"
            >
              Log Environment
            </Button>
          </div>

          {results.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Test Results:</h3>
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded border ${
                    result.status === 'loading'
                      ? 'bg-blue-50 border-blue-200'
                      : result.status === 'success'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        result.status === 'loading'
                          ? 'bg-blue-500 animate-pulse'
                          : result.status === 'success'
                          ? 'bg-green-500'
                          : 'bg-red-500'
                      }`}
                    />
                    <span className="font-mono text-sm">{result.endpoint}</span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {result.timestamp}
                    </span>
                  </div>
                  
                  {result.status === 'loading' && (
                    <div className="text-sm text-blue-600">Testing...</div>
                  )}
                  
                  {result.error && (
                    <div className="text-sm text-red-600 mb-2">
                      <strong>Error:</strong> {result.error}
                    </div>
                  )}
                  
                  {result.data && (
                    <div className="text-sm">
                      <strong>Response:</strong>
                      <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                        {typeof result.data === 'string' 
                          ? result.data 
                          : JSON.stringify(result.data, null, 2)
                        }
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default DebugAPI