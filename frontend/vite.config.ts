import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(async ({ mode, command }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  const isProduction = mode === 'production';
  const isDevelopment = mode === 'development';
  
  // Bundle analyzer plugin (only for local analysis builds)
  let visualizerPlugin = null;
  const isVercelBuild = process.env.VERCEL || process.env.CI;
  
  if (isProduction && command === 'build' && !isVercelBuild) {
    try {
      // Check if visualizer is available before importing
      const { visualizer } = await import('rollup-plugin-visualizer');
      visualizerPlugin = visualizer({
        filename: 'dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap', // More useful visualization
      });
      console.log('✅ Bundle analyzer enabled');
    } catch (error) {
      console.warn('⚠️  rollup-plugin-visualizer not available, skipping bundle analysis');
      // Gracefully continue without the plugin
    }
  }

  return {
    server: {
      host: "localhost",
      port: 5173,
    },
    
    plugins: [
      react({
        // Enable Fast Refresh
        fastRefresh: true,
      }),
      
      // Development only plugins
      // isDevelopment && componentTagger(),
      
      // PWA Plugin (only for production builds, not for Vercel preview)
      isProduction && !isVercelBuild && VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        devOptions: {
          enabled: false // Disable PWA in development
        },
        manifest: {
          name: 'TrueCheckIA - AI Content Detector',
          short_name: 'TrueCheckIA',
          description: 'Detect AI-generated content with 95% accuracy. Advanced AI detection technology trusted by professionals.',
          theme_color: '#8B5CF6',
          background_color: '#0F0F23',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          // Prevent conflicts with Vercel's routing
          navigateFallback: null,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\./,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 50, // Reduced for better performance
                  maxAgeSeconds: 180 // 3 minutes - shorter for API freshness
                },
                cacheableResponse: {
                  statuses: [0, 200]
                },
                networkTimeoutSeconds: 10 // Prevent hanging requests
              }
            }
          ]
        }
      }),
      
      // Bundle analyzer for production builds (if available)
      visualizerPlugin,
    ].filter(Boolean),
    
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    
    // Build optimizations
    build: {
      target: 'es2020',
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: isProduction ? false : 'inline',
      minify: isProduction ? 'esbuild' : false,
      
      // Chunk splitting strategy
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunk for React and core libraries
            vendor: ['react', 'react-dom', 'react-router-dom'],
            
            // UI library chunk
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-toast'],
            
            // Form libraries
            forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
            
            // Chart and visualization
            charts: ['recharts'],
            
            // Animation libraries
            animations: ['framer-motion'],
            
            // Utilities
            utils: ['axios', '@tanstack/react-query', 'date-fns', 'clsx', 'class-variance-authority'],
          },
          
          // Asset naming
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId
              ? chunkInfo.facadeModuleId.split('/').pop()
              : 'chunk';
            return `assets/js/[name]-[hash].js`;
          },
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name!.split('.');
            const ext = info[info.length - 1];
            if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name!)) {
              return `assets/images/[name]-[hash].${ext}`;
            }
            if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name!)) {
              return `assets/fonts/[name]-[hash].${ext}`;
            }
            if (/\.(css)$/i.test(assetInfo.name!)) {
              return `assets/css/[name]-[hash].${ext}`;
            }
            return `assets/[name]-[hash].${ext}`;
          },
        },
      },
      
      // Chunk size warning
      chunkSizeWarningLimit: 1000,
      
      // CSS code splitting
      cssCodeSplit: true,
      
      // Use esbuild for better performance, configure drop options
      drop: isProduction ? ['console', 'debugger'] : [],
    },
    
    // Performance optimizations
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
        'axios',
        'framer-motion',
        'date-fns',
        'zod',
        'react-hook-form',
      ],
      exclude: ['@vite/client', '@vite/env'],
    },
    
    // Environment variables
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    },
    
    // CSS optimization
    css: {
      devSourcemap: isDevelopment,
    },
    
    // Preview server for production builds
    preview: {
      port: 4173,
      host: 'localhost',
    },
    
    // Experimental features
    experimental: {
      buildAdvancedBaseOptions: true,
    },
  };
});
