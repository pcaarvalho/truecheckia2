import { prisma } from '@truecheckia/database'

// Setup for all tests
beforeAll(async () => {
  // Clear test database before running tests
  await cleanupDatabase()
})

afterAll(async () => {
  // Clean up after all tests
  await cleanupDatabase()
  await prisma.$disconnect()
})

async function cleanupDatabase() {
  // Delete in order of dependencies
  await prisma.analysis.deleteMany({})
  await prisma.user.deleteMany({})
}