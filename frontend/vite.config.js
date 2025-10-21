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
    sourcemap: true
  }
})