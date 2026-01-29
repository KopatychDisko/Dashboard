import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8080,
    host: '127.0.0.1',
    strictPort: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    assetsDir: 'assets',
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: 'esbuild',
    modulePreload: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 2000,
    emptyOutDir: true,
    rollupOptions: {
      treeshake: true,
      output: {
        manualChunks: (id) => {
          // ОПТИМИЗАЦИЯ: Более детальное разделение чанков для лучшего кэширования
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react'
            }
            if (id.includes('react-router')) {
              return 'vendor-router'
            }
            if (id.includes('recharts')) {
              return 'vendor-charts'
            }
            if (id.includes('date-fns') || id.includes('lucide-react')) {
              return 'vendor-utils'
            }
            if (id.includes('axios')) {
              return 'vendor-http'
            }
            // Остальные node_modules
            return 'vendor-other'
          }
        },
        inlineDynamicImports: false,
        compact: true,
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    },
    esbuild: {
      target: 'esnext',
      legalComments: 'none',
      treeShaking: true,
      minifyIdentifiers: true,
      minifySyntax: true,
      minifyWhitespace: true,
      drop: ['console', 'debugger']
    }
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom', 
      'recharts', 
      'date-fns', 
      'axios'
    ],
    exclude: ['fsevents'],
    esbuildOptions: {
      target: 'esnext',
      treeShaking: true,
      minify: true,
      minifyIdentifiers: true,
      minifySyntax: true,
      minifyWhitespace: true
    }
  },
  // Отключаем ненужные проверки
  esbuild: {
    legalComments: 'none'
  }
})