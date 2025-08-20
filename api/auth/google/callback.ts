import { VercelRequest, VercelResponse } from '@vercel/node'
import * as jwt from 'jsonwebtoken'
import { prisma } from '../_shared/database'
import { config } from '../_shared/config'

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

interface JWTPayload {
  userId: string
  email: string
  role: string
  plan: string
}

// Generate JWT tokens for a user
function generateTokens(user: any) {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    plan: user.plan,
  }

  const accessToken = jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn || '7d',
  })

  const refreshToken = jwt.sign(
    { userId: user.id },
    config.auth.refreshSecret,
    { expiresIn: config.auth.refreshExpiresIn || '30d' }
  )

  return { accessToken, refreshToken }
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
      const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || config.app.url
      return res.redirect(`${frontendUrl}/auth/callback?error=oauth_failed`)
    }

    if (!code) {
      const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || config.app.url
      return res.redirect(`${frontendUrl}/auth/callback?error=no_code`)
    }

    const clientId = config.auth.google.clientId
    const clientSecret = config.auth.google.clientSecret
    const callbackUrl = config.auth.google.callbackUrl

    if (!clientId || !clientSecret || !callbackUrl) {
      console.error('Missing Google OAuth configuration')
      const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || config.app.url
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
      const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || config.app.url
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
      const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || config.app.url
      return res.redirect(`${frontendUrl}/auth/callback?error=user_info_failed`)
    }

    // Check if user exists by googleId first
    let user = await prisma.user.findUnique({
      where: { googleId: userData.id },
    })

    if (!user) {
      // Check if user exists by email
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      })

      if (existingUser) {
        // User exists with this email but no Google ID
        // Link the Google account to existing user
        user = await prisma.user.update({
          where: { id: existingUser.id },
          data: { 
            googleId: userData.id,
            name: userData.name || existingUser.name,
            avatar: userData.picture || existingUser.avatar,
            emailVerified: true, // Google emails are verified
          },
        })
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            email: userData.email,
            googleId: userData.id,
            name: userData.name || 'Google User',
            avatar: userData.picture,
            emailVerified: true, // Google emails are verified
            plan: 'FREE',
            role: 'USER',
            credits: config.limits.freeCredits,
            creditsResetAt: new Date(),
          },
        })
      }
    } else {
      // Update existing user data
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: userData.name || user.name,
          avatar: userData.picture || user.avatar,
          emailVerified: true,
        },
      })
    }

    // Generate JWT tokens using the utility function
    const { accessToken, refreshToken } = generateTokens(user)

    // Redirect to frontend with tokens
    const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || config.app.url
    const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`

    console.log('OAuth success, redirecting to:', redirectUrl.replace(accessToken, '[TOKEN]').replace(refreshToken, '[REFRESH]'))
    
    res.redirect(302, redirectUrl)

  } catch (error) {
    console.error('Google OAuth callback error:', error)
    const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || config.app.url
    res.redirect(`${frontendUrl}/auth/callback?error=internal_error`)
  }
}