#!/bin/bash

# TrueCheckIA Production Database Setup
# Run this script once to set up production database on Neon

set -e

echo "🚀 TrueCheckIA Production Database Setup"
echo "========================================"

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check if required tools are installed
required_tools=("npm" "node" "npx")
for tool in "${required_tools[@]}"; do
    if ! command -v $tool &> /dev/null; then
        echo "❌ ERROR: $tool is not installed"
        exit 1
    fi
done

# Check for environment variables
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is required"
    echo "Set it to your Neon PostgreSQL connection string"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Navigate to database package
cd packages/database

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run db:generate

# Run initial database migration
echo "🗄️  Setting up database schema..."
npm run db:push

# Seed initial data (admin user, default settings)
echo "🌱 Seeding initial data..."
cat > src/seed-production.ts << 'EOF'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding production database...')

  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@truecheckia.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'TrueCheck@2024!'
  
  const hashedPassword = await bcrypt.hash(adminPassword, 12)
  
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
      plan: 'ENTERPRISE',
      credits: 10000,
      emailVerified: true,
    },
  })

  console.log(`✅ Admin user created: ${adminUser.email}`)
  
  // Create test analysis for verification
  const testAnalysis = await prisma.analysis.create({
    data: {
      userId: adminUser.id,
      text: 'This is a test analysis to verify database setup.',
      wordCount: 10,
      charCount: 48,
      language: 'en',
      aiScore: 15.5,
      confidence: 'HIGH',
      isAiGenerated: false,
      indicators: [],
      explanation: 'This text appears to be human-written.',
      suspiciousParts: [],
      modelUsed: 'gpt-4',
      processingTime: 250,
    },
  })

  console.log(`✅ Test analysis created: ${testAnalysis.id}`)
  
  console.log('🎉 Production database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
EOF

# Run the seed
npx tsx src/seed-production.ts

# Clean up seed file
rm src/seed-production.ts

# Return to root
cd ../..

# Verify setup
echo "🧪 Verifying database setup..."

# Test connection and basic queries
cd packages/database
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verify() {
  try {
    const userCount = await prisma.user.count();
    const analysisCount = await prisma.analysis.count();
    
    console.log('✅ Database verification successful:');
    console.log('   Users:', userCount);
    console.log('   Analyses:', analysisCount);
    
    await prisma.\$disconnect();
  } catch (error) {
    console.error('❌ Database verification failed:', error);
    process.exit(1);
  }
}

verify();
"

cd ../..

echo ""
echo "🎉 Production database setup completed successfully!"
echo ""
echo "📋 Setup Summary:"
echo "   ✅ Database schema created"
echo "   ✅ Prisma client generated"
echo "   ✅ Admin user created"
echo "   ✅ Test data inserted"
echo "   ✅ Connection verified"
echo ""
echo "🔑 Next Steps:"
echo "   1. Set up Vercel environment variables"
echo "   2. Configure Stripe webhooks"
echo "   3. Test application deployment"
echo "   4. Set up monitoring and alerts"
echo ""
echo "📊 Database URL: $(echo $DATABASE_URL | sed 's/:[^@]*@/:***@/')"