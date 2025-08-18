import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { config } from '@truecheckia/config'
import { prisma } from '@truecheckia/database'
import { generateTokens } from './jwt.utils'

// Configure Google OAuth strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: config.auth.google.clientId,
      clientSecret: config.auth.google.clientSecret,
      callbackURL: config.auth.google.callbackUrl,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Extract user info from Google profile
        const { id: googleId, emails, name } = profile
        const email = emails?.[0]?.value

        if (!email) {
          return done(new Error('No email found in Google profile'), false)
        }

        // Check if user already exists by googleId
        let user = await prisma.user.findUnique({
          where: { googleId },
        })

        if (user) {
          // User exists with this Google ID, return user
          return done(null, user)
        }

        // Check if user exists by email
        const existingUser = await prisma.user.findUnique({
          where: { email },
        })

        if (existingUser) {
          // User exists with this email but no Google ID
          // Link the Google account to existing user
          user = await prisma.user.update({
            where: { id: existingUser.id },
            data: { googleId },
          })
          
          return done(null, user)
        }

        // Create new user
        user = await prisma.user.create({
          data: {
            email,
            googleId,
            name: name?.givenName && name?.familyName 
              ? `${name.givenName} ${name.familyName}` 
              : name?.displayName || 'Google User',
            emailVerified: true, // Google emails are verified
            credits: config.limits.freeCredits,
            creditsResetAt: new Date(),
          },
        })

        return done(null, user)
      } catch (error) {
        console.error('Google OAuth error:', error)
        return done(error, false)
      }
    }
  )
)

// Serialize user for session (we won't use sessions, but required by Passport)
passport.serializeUser((user: any, done) => {
  done(null, user.id)
})

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        role: true,
        credits: true,
        emailVerified: true,
      },
    })
    done(null, user)
  } catch (error) {
    done(error, null)
  }
})

export default passport