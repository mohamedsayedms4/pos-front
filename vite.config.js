import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 5173,
  },
  define: {
    global: 'window',
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
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React — الحزم الأساسية
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Charts — Recharts ثقيلة، تُحمَّل فقط عند الحاجة
          'charts': ['recharts'],
          // Calendar — react-big-calendar
          'calendar': ['react-big-calendar', 'moment'],
          // Animations — GSAP
          'gsap': ['gsap'],
          // Maps
          'leaflet': ['leaflet', 'react-leaflet'],
          // Barcode / QR
          'barcode': ['jsbarcode', 'html5-qrcode', 'zxing-wasm'],
          // PDF
          'pdf': ['html2pdf.js'],
        }
      }
    }
  }
}) // Trigger Vite restart

