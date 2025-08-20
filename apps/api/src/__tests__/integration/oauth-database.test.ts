// @ts-nocheck
import { prisma } from '@truecheckia/database'
import { config } from '@truecheckia/config'

describe('OAuth Database Integration Tests', () => {
  beforeEach(async () => {
    // Clean database before each test
    await prisma.analysis.deleteMany({})
    await prisma.user.deleteMany({})
  })

  describe('Google OAuth User Creation', () => {
    it('should create new user from Google OAuth data', async () => {
      const googleUserData = {
        id: 'google-123456',
        email: 'newuser@gmail.com',
        verified_email: true,
        name: 'New Google User',
        given_name: 'New',
        family_name: 'User',
        picture: 'https://lh3.googleusercontent.com/a/avatar.jpg'
      }

      // Simulate OAuth callback user creation
      const createdUser = await prisma.user.create({
        data: {
          email: googleUserData.email,
          googleId: googleUserData.id,
          name: googleUserData.name,
          avatar: googleUserData.picture,
          emailVerified: true, // Google emails are verified
          plan: 'FREE',
          role: 'USER',
          credits: config.limits.freeCredits,
          creditsResetAt: new Date(),
        }
      })

      expect(createdUser).toBeTruthy()
      expect(createdUser.email).toBe(googleUserData.email)
      expect(createdUser.googleId).toBe(googleUserData.id)
      expect(createdUser.name).toBe(googleUserData.name)
      expect(createdUser.avatar).toBe(googleUserData.picture)
      expect(createdUser.emailVerified).toBe(true)
      expect(createdUser.plan).toBe('FREE')
      expect(createdUser.role).toBe('USER')
      expect(createdUser.credits).toBe(config.limits.freeCredits)
      expect(createdUser.password).toBeNull()

      // Verify timestamps are set
      expect(createdUser.createdAt).toBeInstanceOf(Date)
      expect(createdUser.updatedAt).toBeInstanceOf(Date)
      expect(createdUser.creditsResetAt).toBeInstanceOf(Date)
    })

    it('should create user with default values when Google data is minimal', async () => {
      const minimalGoogleData = {
        id: 'google-minimal',
        email: 'minimal@gmail.com',
        verified_email: true
      }

      const createdUser = await prisma.user.create({
        data: {
          email: minimalGoogleData.email,
          googleId: minimalGoogleData.id,
          name: 'Google User', // Default name
          emailVerified: true,
          plan: 'FREE',
          role: 'USER',
          credits: config.limits.freeCredits,
          creditsResetAt: new Date(),
        }
      })

      expect(createdUser.name).toBe('Google User')
      expect(createdUser.avatar).toBeNull()
      expect(createdUser.emailVerified).toBe(true)
    })

    it('should handle long Google names and emails', async () => {
      const longGoogleData = {
        id: 'google-long-data',
        email: 'very.long.email.address.that.might.be.problematic@verylongdomainname.com',
        verified_email: true,
        name: 'Very Long Name That Might Exceed Database Limits If Not Handled Properly',
        picture: 'https://lh3.googleusercontent.com/a/very-long-url-that-contains-lots-of-parameters-and-data'
      }

      const createdUser = await prisma.user.create({
        data: {
          email: longGoogleData.email,
          googleId: longGoogleData.id,
          name: longGoogleData.name,
          avatar: longGoogleData.picture,
          emailVerified: true,
          plan: 'FREE',
          role: 'USER',
          credits: config.limits.freeCredits,
          creditsResetAt: new Date(),
        }
      })

      expect(createdUser.email).toBe(longGoogleData.email)
      expect(createdUser.name).toBe(longGoogleData.name)
      expect(createdUser.avatar).toBe(longGoogleData.picture)
    })
  })

  describe('Account Linking Scenarios', () => {
    it('should link Google account to existing email-based user', async () => {
      // Create existing user with email/password
      const existingUser = await prisma.user.create({
        data: {
          email: 'existing@example.com',
          name: 'Existing User',
          password: 'hashed-password',
          plan: 'PRO', // User might have upgraded
          credits: 50,
          creditsResetAt: new Date(),
          emailVerified: false,
          role: 'USER'
        }
      })

      const googleUserData = {
        id: 'google-link-123',
        email: 'existing@example.com', // Same email
        verified_email: true,
        name: 'Updated Name from Google',
        picture: 'https://example.com/google-avatar.jpg'
      }

      // Simulate account linking
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          googleId: googleUserData.id,
          name: googleUserData.name, // Update with Google name
          avatar: googleUserData.picture,
          emailVerified: true, // Google emails are verified
        }
      })

      expect(updatedUser.googleId).toBe(googleUserData.id)
      expect(updatedUser.name).toBe(googleUserData.name)
      expect(updatedUser.avatar).toBe(googleUserData.picture)
      expect(updatedUser.emailVerified).toBe(true)
      
      // Should preserve existing user data
      expect(updatedUser.email).toBe(existingUser.email)
      expect(updatedUser.plan).toBe('PRO') // Keep existing plan
      expect(updatedUser.credits).toBe(50) // Keep existing credits
      expect(updatedUser.password).toBe('hashed-password') // Keep existing password
    })

    it('should update existing Google user on subsequent logins', async () => {
      // Create existing Google user
      const existingGoogleUser = await prisma.user.create({
        data: {
          email: 'google@example.com',
          googleId: 'google-existing-123',
          name: 'Old Name',
          avatar: 'https://example.com/old-avatar.jpg',
          plan: 'FREE',
          credits: 5,
          creditsResetAt: new Date(),
          emailVerified: true,
          role: 'USER'
        }
      })

      const updatedGoogleData = {
        id: 'google-existing-123', // Same Google ID
        email: 'google@example.com',
        verified_email: true,
        name: 'Updated Name',
        picture: 'https://example.com/new-avatar.jpg'
      }

      // Simulate user info update on login
      const updatedUser = await prisma.user.update({
        where: { googleId: updatedGoogleData.id },
        data: {
          name: updatedGoogleData.name,
          avatar: updatedGoogleData.picture,
          emailVerified: true,
        }
      })

      expect(updatedUser.name).toBe(updatedGoogleData.name)
      expect(updatedUser.avatar).toBe(updatedGoogleData.picture)
      
      // Should preserve existing user settings
      expect(updatedUser.plan).toBe('FREE')
      expect(updatedUser.credits).toBe(5)
      expect(updatedUser.googleId).toBe('google-existing-123')
    })

    it('should not link Google account if email belongs to different Google user', async () => {
      // Create first Google user
      const firstGoogleUser = await prisma.user.create({
        data: {
          email: 'shared@example.com',
          googleId: 'google-first-123',
          name: 'First Google User',
          plan: 'FREE',
          credits: 5,
          creditsResetAt: new Date(),
          emailVerified: true,
          role: 'USER'
        }
      })

      // Attempt to create second user with same email but different Google ID
      const duplicateEmailGoogleData = {
        id: 'google-second-123',
        email: 'shared@example.com', // Same email
        verified_email: true,
        name: 'Second Google User'
      }

      // This should fail due to email uniqueness constraint
      await expect(
        prisma.user.create({
          data: {
            email: duplicateEmailGoogleData.email,
            googleId: duplicateEmailGoogleData.id,
            name: duplicateEmailGoogleData.name,
            plan: 'FREE',
            credits: 5,
            creditsResetAt: new Date(),
            emailVerified: true,
            role: 'USER'
          }
        })
      ).rejects.toThrow()

      // Verify first user is unchanged
      const unchangedUser = await prisma.user.findUnique({
        where: { id: firstGoogleUser.id }
      })
      expect(unchangedUser.googleId).toBe('google-first-123')
    })
  })

  describe('User Data Validation', () => {
    it('should enforce email uniqueness', async () => {
      const email = 'unique@example.com'

      // Create first user
      await prisma.user.create({
        data: {
          email,
          googleId: 'google-1',
          name: 'User 1',
          plan: 'FREE',
          credits: 5,
          creditsResetAt: new Date(),
          emailVerified: true,
          role: 'USER'
        }
      })

      // Attempt to create second user with same email
      await expect(
        prisma.user.create({
          data: {
            email, // Same email
            googleId: 'google-2',
            name: 'User 2',
            plan: 'FREE',
            credits: 5,
            creditsResetAt: new Date(),
            emailVerified: true,
            role: 'USER'
          }
        })
      ).rejects.toThrow()
    })

    it('should enforce Google ID uniqueness', async () => {
      const googleId = 'google-unique-123'

      // Create first user
      await prisma.user.create({
        data: {
          email: 'user1@example.com',
          googleId,
          name: 'User 1',
          plan: 'FREE',
          credits: 5,
          creditsResetAt: new Date(),
          emailVerified: true,
          role: 'USER'
        }
      })

      // Attempt to create second user with same Google ID
      await expect(
        prisma.user.create({
          data: {
            email: 'user2@example.com',
            googleId, // Same Google ID
            name: 'User 2',
            plan: 'FREE',
            credits: 5,
            creditsResetAt: new Date(),
            emailVerified: true,
            role: 'USER'
          }
        })
      ).rejects.toThrow()
    })

    it('should handle null values appropriately', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'nullable@example.com',
          googleId: 'google-nullable',
          name: 'User with Nulls',
          avatar: null, // Explicitly null
          password: null, // Google users don't have passwords
          plan: 'FREE',
          credits: 5,
          creditsResetAt: new Date(),
          emailVerified: true,
          role: 'USER'
        }
      })

      expect(user.avatar).toBeNull()
      expect(user.password).toBeNull()
      expect(user.emailVerificationToken).toBeNull()
      expect(user.passwordResetToken).toBeNull()
    })
  })

  describe('Query Performance and Indexing', () => {
    it('should efficiently find user by Google ID', async () => {
      // Create multiple users
      for (let i = 0; i < 10; i++) {
        await prisma.user.create({
          data: {
            email: `user${i}@example.com`,
            googleId: `google-${i}`,
            name: `User ${i}`,
            plan: 'FREE',
            credits: 5,
            creditsResetAt: new Date(),
            emailVerified: true,
            role: 'USER'
          }
        })
      }

      const startTime = Date.now()
      const user = await prisma.user.findUnique({
        where: { googleId: 'google-5' }
      })
      const queryTime = Date.now() - startTime

      expect(user).toBeTruthy()
      expect(user.googleId).toBe('google-5')
      expect(queryTime).toBeLessThan(100) // Should be fast with proper indexing
    })

    it('should efficiently find user by email', async () => {
      // Create multiple users
      for (let i = 0; i < 10; i++) {
        await prisma.user.create({
          data: {
            email: `user${i}@example.com`,
            googleId: `google-${i}`,
            name: `User ${i}`,
            plan: 'FREE',
            credits: 5,
            creditsResetAt: new Date(),
            emailVerified: true,
            role: 'USER'
          }
        })
      }

      const startTime = Date.now()
      const user = await prisma.user.findUnique({
        where: { email: 'user5@example.com' }
      })
      const queryTime = Date.now() - startTime

      expect(user).toBeTruthy()
      expect(user.email).toBe('user5@example.com')
      expect(queryTime).toBeLessThan(100) // Should be fast with proper indexing
    })
  })

  describe('Data Consistency', () => {
    it('should maintain referential integrity with analyses', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'analyst@example.com',
          googleId: 'google-analyst',
          name: 'Analyst User',
          plan: 'PRO',
          credits: 100,
          creditsResetAt: new Date(),
          emailVerified: true,
          role: 'USER'
        }
      })

      // Create analysis for this user
      const analysis = await prisma.analysis.create({
        data: {
          userId: user.id,
          text: 'Sample text for analysis',
          result: {
            isAiGenerated: false,
            confidence: 0.85,
            reasoning: 'Human-like patterns detected'
          },
          creditsUsed: 1,
          status: 'COMPLETED'
        }
      })

      expect(analysis.userId).toBe(user.id)

      // Verify user has analysis
      const userWithAnalyses = await prisma.user.findUnique({
        where: { id: user.id },
        include: { analyses: true }
      })

      expect(userWithAnalyses.analyses).toHaveLength(1)
      expect(userWithAnalyses.analyses[0].id).toBe(analysis.id)
    })

    it('should handle user updates without affecting analyses', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'updatable@example.com',
          googleId: 'google-updatable',
          name: 'Original Name',
          plan: 'FREE',
          credits: 5,
          creditsResetAt: new Date(),
          emailVerified: true,
          role: 'USER'
        }
      })

      // Create analysis
      await prisma.analysis.create({
        data: {
          userId: user.id,
          text: 'Analysis text',
          result: { isAiGenerated: false, confidence: 0.9 },
          creditsUsed: 1,
          status: 'COMPLETED'
        }
      })

      // Update user (simulate Google profile update)
      await prisma.user.update({
        where: { id: user.id },
        data: {
          name: 'Updated Name',
          avatar: 'https://example.com/new-avatar.jpg'
        }
      })

      // Verify analysis is still linked
      const userWithAnalyses = await prisma.user.findUnique({
        where: { id: user.id },
        include: { analyses: true }
      })

      expect(userWithAnalyses.name).toBe('Updated Name')
      expect(userWithAnalyses.analyses).toHaveLength(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid Google ID format gracefully', async () => {
      // This test ensures our database can handle various Google ID formats
      const validGoogleIds = [
        'google-123456789',
        '123456789012345678901',
        'google.user.id',
        'google_user_id_with_underscores'
      ]

      for (const googleId of validGoogleIds) {
        const user = await prisma.user.create({
          data: {
            email: `user-${googleId}@example.com`,
            googleId,
            name: 'Test User',
            plan: 'FREE',
            credits: 5,
            creditsResetAt: new Date(),
            emailVerified: true,
            role: 'USER'
          }
        })

        expect(user.googleId).toBe(googleId)
      }
    })

    it('should handle transaction rollback on user creation failure', async () => {
      // Create a user that will cause the next creation to fail
      await prisma.user.create({
        data: {
          email: 'conflict@example.com',
          googleId: 'google-conflict',
          name: 'Existing User',
          plan: 'FREE',
          credits: 5,
          creditsResetAt: new Date(),
          emailVerified: true,
          role: 'USER'
        }
      })

      // Attempt to create user with conflicting email in a transaction
      await expect(
        prisma.$transaction(async (tx) => {
          // This should fail
          await tx.user.create({
            data: {
              email: 'conflict@example.com', // Duplicate email
              googleId: 'google-different',
              name: 'New User',
              plan: 'FREE',
              credits: 5,
              creditsResetAt: new Date(),
              emailVerified: true,
              role: 'USER'
            }
          })

          // This analysis creation should be rolled back
          await tx.analysis.create({
            data: {
              userId: 'non-existent-user-id',
              text: 'This should not persist',
              result: { isAiGenerated: false },
              creditsUsed: 1,
              status: 'COMPLETED'
            }
          })
        })
      ).rejects.toThrow()

      // Verify no orphaned data exists
      const analysisCount = await prisma.analysis.count()
      expect(analysisCount).toBe(0)
    })
  })
})