import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },

  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom/client': path.resolve(__dirname, './node_modules/react-dom/client.js'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    }
  },
  build: {
    chunkSizeWarningLimit: 800
  }
})

