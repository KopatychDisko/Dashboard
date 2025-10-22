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
    sourcemap: false, // отключаем sourcemaps для production
    assetsDir: 'assets',
    target: 'esnext', // используем современный JavaScript
    minify: 'esbuild', // более быстрая минификация
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'charts': ['recharts'],
          'utils': ['date-fns', 'axios', 'clsx']
        },
        assetFileNames: 'assets/[name].[ext]'
      }
    },
    // Включаем кэширование для ускорения повторных сборок
    cache: true,
    // Используем многопоточность
    cssCodeSplit: true,
    // Отключаем предварительный рендеринг
    ssrManifest: false
  }
})