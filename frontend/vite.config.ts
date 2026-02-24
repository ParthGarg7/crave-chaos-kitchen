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
    host: true, // FIX: Allows access from outside the Docker container (0.0.0.0)
    proxy: {
      '/api': {
        target: 'http://backend:8000', // FIX: Resolves to the Docker backend service, not the frontend container
        changeOrigin: true,
      },
    },
  },
})