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
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('@mui') || id.includes('framer-motion') || id.includes('chart.js') || id.includes('recharts')) {
              return 'vendor-ui';
            }
            if (id.includes('axios') || id.includes('socket.io') || id.includes('stompjs')) {
              return 'vendor-net';
            }
            return 'vendor'; // all other node_modules
          }
        }
      }
    }
  }
})

