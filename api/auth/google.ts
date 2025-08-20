import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const callbackUrl = process.env.GOOGLE_CALLBACK_URL
    
    if (!clientId || !callbackUrl) {
      console.error('Missing Google OAuth configuration:', { clientId: !!clientId, callbackUrl: !!callbackUrl })
      return res.status(500).json({ 
        error: 'OAuth configuration missing',
        code: 'OAUTH_CONFIG_MISSING'
      })
    }

    // Build Google OAuth URL
    const baseUrl = 'https://accounts.google.com/oauth2/auth'
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: 'email profile openid',
      access_type: 'offline',
      prompt: 'consent',
    })

    const authUrl = `${baseUrl}?${params.toString()}`
    
    // Log for debugging
    console.log('Google OAuth redirect to:', callbackUrl)
    
    // Redirect to Google OAuth
    res.redirect(302, authUrl)
  } catch (error) {
    console.error('Google OAuth initiation error:', error)
    res.status(500).json({ 
      error: 'OAuth initiation failed',
      code: 'OAUTH_INIT_FAILED'
    })
  }
}