import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,           // bind 0.0.0.0 — required inside Docker
    strictPort: true,
    watch: {
      usePolling: true,   // needed for hot-reload on Windows/Docker
    },
    proxy: {
      // All /api calls are forwarded to the backend.
      // Inside Docker → backend resolves via Docker DNS.
      // Running locally (npm run dev) → falls back to localhost:8000.
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})