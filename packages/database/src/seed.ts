import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function seed() {
  console.log('🌱 Starting database seed...')

  try {
    // Development user credentials
    const devUser = {
      email: 'dev@truecheckia.com',
      password: 'dev12345',
      name: 'Development User',
      plan: 'ENTERPRISE' as const,
      role: 'ADMIN' as const,
      credits: 999999, // High number instead of -1 for clarity
      emailVerified: true,
    }

    // Check if dev user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: devUser.email },
    })

    if (existingUser) {
      console.log('⚠️  Development user already exists. Updating...')
      
      // Update existing user with dev privileges
      const updatedUser = await prisma.user.update({
        where: { email: devUser.email },
        data: {
          name: devUser.name,
          plan: devUser.plan,
          role: devUser.role,
          credits: devUser.credits,
          emailVerified: devUser.emailVerified,
          creditsResetAt: new Date(),
          // Reset verification tokens
          emailVerificationToken: null,
          emailVerificationExpires: null,
          passwordResetToken: null,
          passwordResetExpires: null,
        },
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          role: true,
          credits: true,
          emailVerified: true,
          apiKey: true,
        },
      })

      console.log('✅ Development user updated:', {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        plan: updatedUser.plan,
        role: updatedUser.role,
        credits: updatedUser.credits,
        emailVerified: updatedUser.emailVerified,
        hasApiKey: !!updatedUser.apiKey,
      })
    } else {
      console.log('🔨 Creating development user...')
      
      // Hash password
      const hashedPassword = await bcrypt.hash(devUser.password, 10)

      // Create new dev user
      const newUser = await prisma.user.create({
        data: {
          email: devUser.email,
          password: hashedPassword,
          name: devUser.name,
          plan: devUser.plan,
          role: devUser.role,
          credits: devUser.credits,
          emailVerified: devUser.emailVerified,
          creditsResetAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          role: true,
          credits: true,
          emailVerified: true,
          apiKey: true,
        },
      })

      console.log('✅ Development user created:', {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        plan: newUser.plan,
        role: newUser.role,
        credits: newUser.credits,
        emailVerified: newUser.emailVerified,
        hasApiKey: !!newUser.apiKey,
      })
    }

    // Create some sample analyses for the dev user if none exist
    const user = await prisma.user.findUnique({
      where: { email: devUser.email },
      include: { _count: { select: { analyses: true } } },
    })

    if (user && user._count.analyses === 0) {
      console.log('📊 Creating sample analyses...')
      
      const sampleAnalyses = [
        {
          text: 'Este é um texto escrito por humano com características naturais de escrita. Possui variações no estilo, alguns erros gramaticais ocasionais e um fluxo de pensamento orgânico que reflete a forma como as pessoas realmente escrevem.',
          wordCount: 36,
          charCount: 237,
          language: 'pt',
          aiScore: 15.5,
          confidence: 'HIGH' as const,
          isAiGenerated: false,
          indicators: [
            'Variação natural no estilo',
            'Estrutura orgânica',
            'Imperfeições típicas humanas'
          ],
          explanation: 'O texto apresenta características claras de escrita humana, incluindo variações estilísticas naturais e uma estrutura de pensamento orgânica.',
          suspiciousParts: [],
          modelUsed: 'gpt-4',
          processingTime: 1250,
        },
        {
          text: 'A inteligência artificial representa uma revolução tecnológica sem precedentes na história da humanidade. Seus algoritmos avançados processam dados com eficiência extraordinária, transformando radicalmente diversos setores econômicos e sociais contemporâneos.',
          wordCount: 32,
          charCount: 285,
          language: 'pt',
          aiScore: 92.3,
          confidence: 'HIGH' as const,
          isAiGenerated: true,
          indicators: [
            'Vocabulário técnico excessivo',
            'Estrutura muito uniforme',
            'Linguagem formal artificial'
          ],
          explanation: 'O texto demonstra padrões típicos de geração artificial, com vocabulário técnico excessivo e estrutura muito uniforme para ser escrita humana natural.',
          suspiciousParts: [
            { text: 'revolução tecnológica sem precedentes', score: 85 },
            { text: 'algoritmos avançados processam dados', score: 90 },
            { text: 'eficiência extraordinária', score: 80 }
          ],
          modelUsed: 'gpt-4',
          processingTime: 1850,
        },
        {
          text: 'Ontem fui ao mercado e comprei algumas frutas. A maçã estava cara, mas as bananas estavam em promoção. Acabei levando um pouco de cada coisa porque não consegui decidir.',
          wordCount: 31,
          charCount: 181,
          language: 'pt',
          aiScore: 25.8,
          confidence: 'MEDIUM' as const,
          isAiGenerated: false,
          indicators: [
            'Narrativa pessoal',
            'Linguagem informal',
            'Detalhes cotidianos'
          ],
          explanation: 'Texto com características de narrativa pessoal e linguagem informal, típico de escrita humana cotidiana.',
          suspiciousParts: [],
          modelUsed: 'gpt-3.5-turbo',
          processingTime: 980,
        }
      ]

      for (const analysis of sampleAnalyses) {
        await prisma.analysis.create({
          data: {
            userId: user.id,
            ...analysis,
          },
        })
      }

      console.log(`✅ Created ${sampleAnalyses.length} sample analyses`)
    }

    console.log('\n🎉 Database seed completed successfully!')
    console.log('\n📋 Development User Credentials:')
    console.log('   Email: dev@truecheckia.com')
    console.log('   Password: dev12345')
    console.log('   Plan: ENTERPRISE')
    console.log('   Role: ADMIN')
    console.log('   Credits: 999999 (practically unlimited)')
    console.log('   Email Verified: true')
    console.log('\n🔑 Features Available:')
    console.log('   ✓ Unlimited AI content analysis')
    console.log('   ✓ API access and key generation')
    console.log('   ✓ All premium features')
    console.log('   ✓ Admin privileges')
    console.log('   ✓ No rate limiting restrictions')
    console.log('   ✓ Full access to all endpoints')

  } catch (error) {
    console.error('❌ Error during seed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run seed if called directly
if (require.main === module) {
  seed()
    .catch((error) => {
      console.error('❌ Seed failed:', error)
      process.exit(1)
    })
}

export default seed