import { VercelRequest, VercelResponse } from '@vercel/node'
import jwt from 'jsonwebtoken'

interface GoogleTokenResponse {
  access_token: string
  id_token: string
  expires_in: number
  token_type: string
  scope: string
  refresh_token?: string
}

interface GoogleUserInfo {
  id: string
  email: string
  verified_email: boolean
  name: string
  given_name: string
  family_name: string
  picture: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { code, error, error_description } = req.query

  try {
    // Handle OAuth errors
    if (error) {
      console.error('Google OAuth error:', error, error_description)
      const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://truecheckiagpt.vercel.app'
      return res.redirect(`${frontendUrl}/auth/callback?error=oauth_failed`)
    }

    if (!code) {
      const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://truecheckiagpt.vercel.app'
      return res.redirect(`${frontendUrl}/auth/callback?error=no_code`)
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const callbackUrl = process.env.GOOGLE_CALLBACK_URL

    if (!clientId || !clientSecret || !callbackUrl) {
      console.error('Missing Google OAuth configuration')
      const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://truecheckiagpt.vercel.app'
      return res.redirect(`${frontendUrl}/auth/callback?error=config_missing`)
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: callbackUrl,
      }),
    })

    const tokenData: GoogleTokenResponse = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData)
      const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://truecheckiagpt.vercel.app'
      return res.redirect(`${frontendUrl}/auth/callback?error=token_exchange_failed`)
    }

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    const userData: GoogleUserInfo = await userResponse.json()

    if (!userResponse.ok) {
      console.error('User info fetch failed:', userData)
      const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://truecheckiagpt.vercel.app'
      return res.redirect(`${frontendUrl}/auth/callback?error=user_info_failed`)
    }

    // Here you would typically:
    // 1. Check if user exists in database
    // 2. Create user if new
    // 3. Generate your own JWT tokens
    
    // For now, create a simple JWT token
    const jwtSecret = process.env.JWT_SECRET
    const refreshSecret = process.env.JWT_REFRESH_SECRET

    if (!jwtSecret || !refreshSecret) {
      console.error('JWT secrets not configured')
      const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://truecheckiagpt.vercel.app'
      return res.redirect(`${frontendUrl}/auth/callback?error=jwt_config_missing`)
    }

    // Create user payload
    const userPayload = {
      userId: userData.id,
      email: userData.email,
      name: userData.name,
      picture: userData.picture,
      role: 'user',
      plan: 'free',
      emailVerified: userData.verified_email,
    }

    // Generate tokens
    const accessToken = jwt.sign(userPayload, jwtSecret, { expiresIn: '7d' })
    const refreshToken = jwt.sign({ userId: userData.id }, refreshSecret, { expiresIn: '30d' })

    // Redirect to frontend with tokens
    const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://truecheckiagpt.vercel.app'
    const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`

    console.log('OAuth success, redirecting to:', redirectUrl.replace(accessToken, '[TOKEN]').replace(refreshToken, '[REFRESH]'))
    
    res.redirect(302, redirectUrl)

  } catch (error) {
    console.error('Google OAuth callback error:', error)
    const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://truecheckiagpt.vercel.app'
    res.redirect(`${frontendUrl}/auth/callback?error=internal_error`)
  }
}