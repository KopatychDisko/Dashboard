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
    chunkSizeWarningLimit: 1000,
    emptyOutDir: true,
    rollupOptions: {
      treeshake: true,
      output: {
        manualChunks: {
          'react-core': ['react', 'react-dom'],
          'react-router': ['react-router-dom'],
          'charts': ['recharts'],
          'utils': ['date-fns', 'axios', 'clsx']
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
      'axios', 
      'clsx'
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
    jsxInject: `import React from 'react'`,
    legalComments: 'none'
  }
})