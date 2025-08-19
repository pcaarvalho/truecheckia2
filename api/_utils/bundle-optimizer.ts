/**
 * Bundle Optimization Utilities for Serverless Functions
 * Reduces cold start times through dynamic imports and tree shaking
 */

// Dynamic import cache to prevent multiple imports of the same module
const importCache = new Map<string, Promise<any>>()

/**
 * Optimized dynamic import with caching
 */
export async function optimizedImport<T = any>(modulePath: string): Promise<T> {
  if (importCache.has(modulePath)) {
    return importCache.get(modulePath)!
  }

  const importPromise = import(modulePath)
  importCache.set(modulePath, importPromise)
  
  return importPromise
}

/**
 * Lazy service loader for heavy dependencies
 */
export class LazyServiceLoader {
  private static services = new Map<string, any>()
  
  static async getOpenAIService() {
    if (!this.services.has('openai')) {
      const service = await optimizedImport('../../apps/api/src/services/openai.service')
      this.services.set('openai', service)
    }
    return this.services.get('openai')
  }
  
  static async getPrismaService() {
    if (!this.services.has('prisma')) {
      const { prisma } = await optimizedImport('../_shared/database')
      this.services.set('prisma', prisma)
    }
    return this.services.get('prisma')
  }
  
  static async getStripeService() {
    if (!this.services.has('stripe')) {
      const service = await optimizedImport('../../apps/api/src/services/stripe.service')
      this.services.set('stripe', service)
    }
    return this.services.get('stripe')
  }
  
  static async getEmailService() {
    if (!this.services.has('email')) {
      const service = await optimizedImport('../../apps/api/src/services/email.service')
      this.services.set('email', service)
    }
    return this.services.get('email')
  }
  
  static async getCreditService() {
    if (!this.services.has('credit')) {
      const service = await optimizedImport('../../apps/api/src/services/credit.service')
      this.services.set('credit', service)
    }
    return this.services.get('credit')
  }
}

/**
 * Conditional imports based on function type
 */
export class ConditionalImports {
  static async getAuthDependencies() {
    return Promise.all([
      optimizedImport('jsonwebtoken'),
      optimizedImport('bcryptjs')
    ])
  }
  
  static async getAnalysisDependencies() {
    return Promise.all([
      LazyServiceLoader.getOpenAIService(),
      optimizedImport('crypto')
    ])
  }
  
  static async getSubscriptionDependencies() {
    return Promise.all([
      LazyServiceLoader.getStripeService(),
      LazyServiceLoader.getEmailService()
    ])
  }
  
  static async getAdminDependencies() {
    return Promise.all([
      LazyServiceLoader.getPrismaService(),
      optimizedImport('../../apps/api/src/services/admin.service')
    ])
  }
}

/**
 * Module preloader for critical paths
 */
export class ModulePreloader {
  private static preloadedModules = new Set<string>()
  
  static async preloadCriticalModules() {
    const criticalModules = [
      '../_shared/config',
      '../_shared/types',
      '../../apps/api/src/lib/upstash'
    ]
    
    const preloadPromises = criticalModules
      .filter(module => !this.preloadedModules.has(module))
      .map(async module => {
        try {
          await optimizedImport(module)
          this.preloadedModules.add(module)
          console.log(`✅ Preloaded: ${module}`)
        } catch (error) {
          console.warn(`⚠️ Failed to preload: ${module}`, error)
        }
      })
    
    await Promise.allSettled(preloadPromises)
  }
  
  static async preloadByFunctionType(type: 'auth' | 'analysis' | 'subscription' | 'admin' | 'general') {
    switch (type) {
      case 'auth':
        await ConditionalImports.getAuthDependencies()
        break
      case 'analysis':
        await ConditionalImports.getAnalysisDependencies()
        break
      case 'subscription':
        await ConditionalImports.getSubscriptionDependencies()
        break
      case 'admin':
        await ConditionalImports.getAdminDependencies()
        break
      case 'general':
        await this.preloadCriticalModules()
        break
    }
  }
}

/**
 * Bundle size analyzer for development
 */
export class BundleAnalyzer {
  static analyzeImports(functionPath: string): void {
    if (process.env.NODE_ENV !== 'development') return
    
    const startTime = Date.now()
    const memoryStart = process.memoryUsage()
    
    console.log(`📦 Bundle analysis for: ${functionPath}`)
    console.log(`🕐 Import start time: ${startTime}`)
    console.log(`💾 Memory at start: ${Math.round(memoryStart.heapUsed / 1024 / 1024)}MB`)
    
    // Return cleanup function
    return () => {
      const endTime = Date.now()
      const memoryEnd = process.memoryUsage()
      const importTime = endTime - startTime
      const memoryIncrease = Math.round((memoryEnd.heapUsed - memoryStart.heapUsed) / 1024 / 1024)
      
      console.log(`⏱️ Import time: ${importTime}ms`)
      console.log(`📈 Memory increase: ${memoryIncrease}MB`)
      console.log(`🏁 Total memory: ${Math.round(memoryEnd.heapUsed / 1024 / 1024)}MB`)
      
      if (importTime > 1000) {
        console.warn(`⚠️ Slow import detected: ${importTime}ms`)
      }
      
      if (memoryIncrease > 50) {
        console.warn(`⚠️ High memory usage: +${memoryIncrease}MB`)
      }
    }
  }
}

/**
 * Tree shaking helper for unused exports
 */
export class TreeShaker {
  static createMinimalExport<T extends Record<string, any>>(
    fullModule: T,
    requiredExports: (keyof T)[]
  ): Partial<T> {
    const minimalModule: Partial<T> = {}
    
    for (const exportName of requiredExports) {
      if (exportName in fullModule) {
        minimalModule[exportName] = fullModule[exportName]
      }
    }
    
    return minimalModule
  }
  
  static async getMinimalPrisma() {
    const { prisma } = await optimizedImport('../_shared/database')
    
    // Return only commonly used methods to reduce bundle size
    return {
      user: prisma.user,
      analysis: prisma.analysis,
      apiKey: prisma.apiKey,
      subscription: prisma.subscription,
      notification: prisma.notification,
      $queryRaw: prisma.$queryRaw.bind(prisma),
      $executeRaw: prisma.$executeRaw.bind(prisma),
      $disconnect: prisma.$disconnect.bind(prisma)
    }
  }
}

/**
 * Code splitting utilities
 */
export class CodeSplitter {
  static async loadHeavyDependencies() {
    // Load heavy dependencies only when needed
    const heavyModules = await Promise.allSettled([
      optimizedImport('openai'),
      optimizedImport('stripe'),
      optimizedImport('nodemailer')
    ])
    
    const loaded = heavyModules
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value)
    
    console.log(`📦 Loaded ${loaded.length}/${heavyModules.length} heavy dependencies`)
    
    return loaded
  }
  
  static async loadLightDependencies() {
    // Load light dependencies early
    const lightModules = await Promise.allSettled([
      optimizedImport('crypto'),
      optimizedImport('zod'),
      optimizedImport('../_shared/config'),
      optimizedImport('../_shared/types')
    ])
    
    const loaded = lightModules
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value)
    
    console.log(`🚀 Loaded ${loaded.length}/${lightModules.length} light dependencies`)
    
    return loaded
  }
}

/**
 * Performance optimization wrapper
 */
export function optimizeFunction<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    preloadModules?: string[]
    functionType?: 'auth' | 'analysis' | 'subscription' | 'admin' | 'general'
    enableAnalysis?: boolean
  } = {}
): T {
  return (async (...args: Parameters<T>) => {
    const analyzer = options.enableAnalysis ? BundleAnalyzer.analyzeImports(fn.name) : null
    
    try {
      // Preload modules if specified
      if (options.preloadModules?.length) {
        await Promise.allSettled(
          options.preloadModules.map(module => optimizedImport(module))
        )
      }
      
      // Function-specific preloading
      if (options.functionType) {
        await ModulePreloader.preloadByFunctionType(options.functionType)
      }
      
      // Execute original function
      const result = await fn(...args)
      
      return result
    } finally {
      analyzer?.()
    }
  }) as T
}

// Export for global use
export const bundleOptimizer = {
  import: optimizedImport,
  lazy: LazyServiceLoader,
  conditional: ConditionalImports,
  preload: ModulePreloader,
  analyze: BundleAnalyzer,
  treeShake: TreeShaker,
  split: CodeSplitter,
  optimize: optimizeFunction
}