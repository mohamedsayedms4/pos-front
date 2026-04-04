import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // sockjs-client references Node's 'global' — polyfill it for browser builds
    global: 'globalThis',
  },
})
